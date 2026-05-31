import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadRoot = path.resolve(__dirname, "../../uploads");
export const printFileName = "Thong_bao_thay_doi.html";

fs.mkdirSync(uploadRoot, { recursive: true });

export function normalizeUploadName(name: string) {
  const decoded = Buffer.from(name, "latin1").toString("utf8");
  return decoded.includes("�") ? name : decoded;
}

export function safeFileName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export function noticeFolderName(code: string) {
  return safeFileName(code).replace(/\.+$/g, "") || "TBTD";
}

export function ensureNoticeFolder(code: string) {
  const folder = noticeFolderName(code);
  const absolute = path.join(uploadRoot, folder);
  fs.mkdirSync(absolute, { recursive: true });
  return { folder, absolute };
}

export function deleteNoticeFolder(code: string) {
  const folder = noticeFolderName(code);
  const absolute = path.join(uploadRoot, folder);
  fs.rmSync(absolute, { recursive: true, force: true });
}

export function attachmentRelativePath(code: string, originalName: string) {
  const { folder } = ensureNoticeFolder(code);
  return path.posix.join(folder, `${Date.now()}-${crypto.randomUUID()}-${safeFileName(originalName)}`);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("vi-VN");
}

export async function syncPrintableNoticeFile(noticeId: string) {
  const notice = await prisma.changeNotification.findUnique({
    where: { id: noticeId },
    include: {
      attachments: true,
      workflowSteps: { include: { signer: true }, orderBy: { createdAt: "asc" } }
    }
  });
  if (!notice) return null;

  const { folder, absolute } = ensureNoticeFolder(notice.code);
  const attachmentRows = notice.attachments
    .map((attachment) => `<li>${escapeHtml(attachment.fileName)} (${Math.round(attachment.size / 1024)} KB)</li>`)
    .join("");
  const signatureRows = notice.workflowSteps
    .map((step) => `<tr><td>${escapeHtml(step.action)}</td><td>${escapeHtml(step.requiredRole)}</td><td>${escapeHtml(step.signer?.name || "")}</td><td>${escapeHtml(formatDate(step.createdAt))}</td></tr>`)
    .join("");

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(notice.code)} - Thông báo thay đổi</title>
  <style>
    body { font-family: "Times New Roman", serif; margin: 32px; color: #111; }
    h1, h2 { text-align: center; margin: 0; }
    h1 { font-size: 22px; }
    h2 { font-size: 16px; font-style: italic; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #333; padding: 8px; vertical-align: top; }
    .preline { white-space: pre-line; }
  </style>
</head>
<body>
  <h1>PHIẾU THÔNG BÁO THAY ĐỔI</h1>
  <h2>CHANGE NOTICE</h2>
  <p><strong>Mã phiếu:</strong> ${escapeHtml(notice.code)}</p>
  <p><strong>Ngày:</strong> ${escapeHtml(formatDate(notice.issuedDate))}</p>
  <table>
    <tr><th>Kính gửi / To</th><td>${escapeHtml(notice.recipient)}</td></tr>
    <tr><th>Người đề nghị / Proponent</th><td>${escapeHtml(notice.proposerName)} - ${escapeHtml(notice.proposerDepartment)}</td></tr>
    <tr><th>Sản phẩm / Product</th><td>${escapeHtml(notice.productName)}</td></tr>
    <tr><th>Mã quy trình / Process code</th><td>${escapeHtml(notice.manufacturingProcessCode)}</td></tr>
    <tr><th>Lần ban hành / Issue</th><td>${escapeHtml(notice.notificationIssueNumber)}</td></tr>
    <tr><th>Loại xưởng / Workshop</th><td>${escapeHtml(notice.workshopType)}</td></tr>
    <tr><th>Loại thay đổi / Change type</th><td>${escapeHtml(notice.changeType)}</td></tr>
    <tr><th>Mức tác động / Impact</th><td>${escapeHtml(notice.impactLevel)}</td></tr>
  </table>
  <h3>Nội dung thay đổi / Change content</h3>
  <p class="preline">${escapeHtml(notice.changeContent)}</p>
  <h3>Hiệu lực / Effective note</h3>
  <p>${escapeHtml(notice.effectiveNote)}</p>
  <h3>Tài liệu đính kèm</h3>
  <ul>${attachmentRows || "<li>Không có tài liệu đính kèm.</li>"}</ul>
  <h3>Lượt ký</h3>
  <table>
    <tr><th>Hành động</th><th>Vai trò</th><th>Người ký</th><th>Ngày</th></tr>
    ${signatureRows}
  </table>
</body>
</html>`;

  const relativePath = path.posix.join(folder, printFileName);
  fs.writeFileSync(path.join(absolute, printFileName), html, "utf8");
  return relativePath;
}

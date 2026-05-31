import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { prisma } from "../db.js";
import { currentUser, requireAuth } from "./auth.js";
import { writeAudit } from "./audit.js";
import { attachmentRelativePath, normalizeUploadName, syncPrintableNoticeFile, uploadRoot } from "./noticeStorage.js";

fs.mkdirSync(uploadRoot, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".pdf", ".doc", ".docx"].includes(ext)) {
      cb(new Error("Chỉ chấp nhận file PDF, DOC, DOCX."));
      return;
    }
    cb(null, true);
  }
});

export const attachmentRouter = Router();

function canAuthorForWorkshop(roles: string[], workshopType: string) {
  if (roles.includes("ADMIN")) return true;
  if (workshopType === "STERILE") return roles.includes("AUTHOR_STERILE");
  if (workshopType === "NON_STERILE") return roles.includes("AUTHOR_NON_STERILE");
  return false;
}

attachmentRouter.use(requireAuth);

attachmentRouter.get("/notices/:id/attachments", async (req, res) => {
  const attachments = await prisma.attachment.findMany({
    where: { noticeId: req.params.id },
    orderBy: { createdAt: "desc" }
  });
  res.json({ attachments });
});

attachmentRouter.post("/notices/:id/attachments", upload.single("file"), async (req, res) => {
  const user = currentUser(res);
  if (!req.file) {
    res.status(400).json({ message: "Chưa có file đính kèm." });
    return;
  }

  const notice = await prisma.changeNotification.findUnique({ where: { id: req.params.id } });
  if (!notice) {
    res.status(404).json({ message: "Không tìm thấy TBTĐ." });
    return;
  }
  if (!["DRAFT", "RETURNED", "RECALLED"].includes(notice.status)) {
    res.status(409).json({ message: "Chỉ được đính kèm khi TBTĐ còn có thể sửa." });
    return;
  }
  if (notice.authorId !== user.id && !user.roles.includes("ADMIN")) {
    res.status(403).json({ message: "Chỉ người soạn được đính kèm file." });
    return;
  }
  if (!canAuthorForWorkshop(user.roles, notice.workshopType)) {
    res.status(403).json({ message: "Bạn chỉ được đính kèm tài liệu cho TBTĐ thuộc dạng bào chế/xưởng mình phụ trách." });
    return;
  }

  const originalName = normalizeUploadName(req.file.originalname);
  const checksum = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
  const relativePath = attachmentRelativePath(notice.code, originalName);
  const absolutePath = path.join(uploadRoot, relativePath);
  fs.writeFileSync(absolutePath, req.file.buffer);

  const attachment = await prisma.attachment.create({
    data: {
      noticeId: notice.id,
      fileName: originalName,
      mimeType: req.file.mimetype,
      category: String(req.body.category || "Tài liệu hỗ trợ"),
      size: req.file.size,
      checksum,
      path: relativePath
    }
  });

  await writeAudit({ noticeId: notice.id, actorId: user.id, entity: "Attachment", action: "UPLOAD", after: attachment, ip: req.ip });
  await syncPrintableNoticeFile(notice.id);
  res.status(201).json({ attachment });
});

attachmentRouter.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  if (!err) {
    next();
    return;
  }
  res.status(400).json({ message: err.message || "Không đính kèm được tài liệu." });
});

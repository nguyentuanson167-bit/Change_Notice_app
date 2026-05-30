import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import multer from "multer";
import { prisma } from "../db.js";
import { currentUser, requireAuth } from "./auth.js";
import { writeAudit } from "./audit.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadRoot = path.resolve(__dirname, "../../uploads");

fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${Date.now()}-${crypto.randomUUID()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".pdf", ".doc", ".docx"].includes(ext)) {
      cb(new Error("Chi chap nhan file PDF, DOC, DOCX."));
      return;
    }
    cb(null, true);
  }
});

export const attachmentRouter = Router();

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
    res.status(400).json({ message: "Chua co file dinh kem." });
    return;
  }

  const notice = await prisma.changeNotification.findUnique({ where: { id: req.params.id } });
  if (!notice) {
    res.status(404).json({ message: "Khong tim thay TBTD." });
    return;
  }
  if (!["DRAFT", "RETURNED", "RECALLED"].includes(notice.status)) {
    res.status(409).json({ message: "Chi duoc dinh kem khi TBTD con co the sua." });
    return;
  }
  if (notice.authorId !== user.id && !user.roles.includes("ADMIN")) {
    res.status(403).json({ message: "Chi nguoi soan duoc dinh kem file." });
    return;
  }

  const buffer = fs.readFileSync(req.file.path);
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const attachment = await prisma.attachment.create({
    data: {
      noticeId: notice.id,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      category: String(req.body.category || "Tai lieu ho tro"),
      size: req.file.size,
      checksum,
      path: req.file.filename
    }
  });

  await writeAudit({ noticeId: notice.id, actorId: user.id, entity: "Attachment", action: "UPLOAD", after: attachment, ip: req.ip });
  res.status(201).json({ attachment });
});

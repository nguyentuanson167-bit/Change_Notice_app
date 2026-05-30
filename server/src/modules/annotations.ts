import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { currentUser, requireAuth } from "./auth.js";
import { writeAudit } from "./audit.js";

export const annotationRouter = Router();

const annotationSchema = z.object({
  attachmentId: z.string().optional().nullable(),
  type: z.string().default("GENERAL"),
  pageNumber: z.number().optional().nullable(),
  x: z.number().optional().nullable(),
  y: z.number().optional().nullable(),
  referenceText: z.string().optional().nullable(),
  content: z.string().min(1),
  severity: z.string().default("REQUIRED")
});

annotationRouter.use(requireAuth);

annotationRouter.post("/notices/:id/annotations", async (req, res) => {
  const parsed = annotationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Ghi chú không hợp lệ.", issues: parsed.error.issues });
    return;
  }
  const user = currentUser(res);
  const annotation = await prisma.annotation.create({
    data: {
      noticeId: req.params.id,
      attachmentId: parsed.data.attachmentId || null,
      type: parsed.data.type,
      pageNumber: parsed.data.pageNumber,
      x: parsed.data.x,
      y: parsed.data.y,
      referenceText: parsed.data.referenceText,
      content: parsed.data.content,
      severity: parsed.data.severity,
      creatorId: user.id
    },
    include: { creator: true, replies: { include: { author: true } } }
  });
  await writeAudit({ noticeId: req.params.id, actorId: user.id, entity: "Annotation", action: "CREATE", after: annotation, ip: req.ip });
  res.status(201).json({ annotation });
});

annotationRouter.put("/annotations/:id/status", async (req, res) => {
  const user = currentUser(res);
  const status = String(req.body?.status || "").toUpperCase();
  if (!["OPEN", "RESOLVED"].includes(status)) {
    res.status(400).json({ message: "Trạng thái ghi chú không hợp lệ." });
    return;
  }
  const before = await prisma.annotation.findUnique({ where: { id: req.params.id } });
  if (!before) {
    res.status(404).json({ message: "Không tìm thấy ghi chú." });
    return;
  }
  const annotation = await prisma.annotation.update({
    where: { id: req.params.id },
    data: { status },
    include: { creator: true, replies: { include: { author: true } } }
  });
  await writeAudit({ noticeId: annotation.noticeId, actorId: user.id, entity: "Annotation", action: "UPDATE_STATUS", before, after: annotation, ip: req.ip });
  res.json({ annotation });
});

annotationRouter.post("/annotations/:id/replies", async (req, res) => {
  const user = currentUser(res);
  const content = String(req.body?.content || "").trim();
  if (!content) {
    res.status(400).json({ message: "Nội dung phản hồi là bắt buộc." });
    return;
  }
  const annotation = await prisma.annotation.findUnique({ where: { id: req.params.id } });
  if (!annotation) {
    res.status(404).json({ message: "Không tìm thấy ghi chú." });
    return;
  }
  const reply = await prisma.annotationReply.create({
    data: { annotationId: annotation.id, authorId: user.id, content },
    include: { author: true }
  });
  await writeAudit({ noticeId: annotation.noticeId, actorId: user.id, entity: "AnnotationReply", action: "CREATE", after: reply, ip: req.ip });
  res.status(201).json({ reply });
});

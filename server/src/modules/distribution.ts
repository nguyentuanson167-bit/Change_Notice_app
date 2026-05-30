import { Router } from "express";
import { prisma } from "../db.js";
import { currentUser, requireAuth } from "./auth.js";
import { writeAudit } from "./audit.js";

export const distributionRouter = Router();

distributionRouter.use(requireAuth);

distributionRouter.get("/notices/:id/distributions", async (req, res) => {
  const distributions = await prisma.distribution.findMany({
    where: { noticeId: req.params.id },
    include: { acknowledgedBy: true },
    orderBy: { createdAt: "asc" }
  });
  res.json({ distributions });
});

distributionRouter.post("/distributions/:id/acknowledge", async (req, res) => {
  const user = currentUser(res);
  const before = await prisma.distribution.findUnique({ where: { id: req.params.id } });
  if (!before) {
    res.status(404).json({ message: "Không tìm thấy bản phân phối." });
    return;
  }
  if (before.receivingUnit !== user.department && !user.roles.includes("ADMIN")) {
    res.status(403).json({ message: "Chỉ phòng nhận hoặc admin được xác nhận." });
    return;
  }
  const distribution = await prisma.distribution.update({
    where: { id: before.id },
    data: { status: "ACKNOWLEDGED", acknowledgedById: user.id, acknowledgedAt: new Date() },
    include: { acknowledgedBy: true }
  });
  await writeAudit({ noticeId: distribution.noticeId, actorId: user.id, entity: "Distribution", action: "ACKNOWLEDGE", before, after: distribution, ip: req.ip });
  res.json({ distribution });
});

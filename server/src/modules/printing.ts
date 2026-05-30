import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth } from "./auth.js";

export const printingRouter = Router();

printingRouter.use(requireAuth);

printingRouter.get("/notices/:id/print-data", async (req, res) => {
  const notice = await prisma.changeNotification.findUnique({
    where: { id: req.params.id },
    include: {
      author: true,
      attachments: true,
      workflowSteps: { include: { signer: true }, orderBy: { createdAt: "asc" } },
      distributions: { include: { acknowledgedBy: true } }
    }
  });
  if (!notice) {
    res.status(404).json({ message: "Không tìm thấy TBTĐ." });
    return;
  }

  const signatures = {
    editedBy: notice.workflowSteps.find((step) => step.requiredRole === "AUTHOR"),
    reviewedBy: notice.workflowSteps.find((step) => ["NCPT_LEAD", "NCPT_LEAD_STERILE", "NCPT_LEAD_NON_STERILE", "NCPT_HEAD"].includes(step.requiredRole)),
    qaDeputyBy: notice.workflowSteps.find((step) => step.requiredRole === "QA_DEPUTY"),
    appraisedBy: notice.workflowSteps.find((step) => step.requiredRole === "QA_HEAD"),
    approvedBy: notice.workflowSteps.find((step) => step.requiredRole === "PROD_DIRECTOR")
  };

  res.json({
    notice,
    signatures,
    statusMarker: ["DISTRIBUTED", "APPROVED"].includes(notice.status) ? null : `BẢN CHƯA HOÀN TẤT - ${notice.status}`
  });
});

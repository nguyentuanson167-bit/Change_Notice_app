import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { currentUser, requireAuth } from "./auth.js";
import { writeAudit } from "./audit.js";
import {
  activeStatuses,
  canRoleAct,
  getActingRole,
  getDistributionUnits,
  getNcptLeadRole,
  getNextStatus,
  getWorkflowStep,
  normalizeWorkshopType,
  pendingStatusesForRoles
} from "./workflow.js";

export const changeNoticeRouter = Router();

const noticeSchema = z.object({
  title: z.string().min(1),
  recipient: z.string().min(1),
  proposerName: z.string().min(1),
  proposerDepartment: z.string().min(1),
  workshopType: z.enum(["STERILE", "NON_STERILE"]).optional(),
  productName: z.string().min(1),
  manufacturingProcessCode: z.string().min(1),
  issuedDate: z.string().min(1),
  notificationIssueNumber: z.string().min(1),
  changeType: z.string().min(1),
  impactLevel: z.string().min(1),
  changeContent: z.string().min(1),
  effectiveNote: z.string().optional()
});

function includeNotice() {
  return {
    author: true,
    attachments: true,
    workflowSteps: { include: { signer: true }, orderBy: { createdAt: "asc" as const } },
    annotations: { include: { creator: true, replies: { include: { author: true } } } },
    distributions: { include: { acknowledgedBy: true } },
    auditLogs: { include: { actor: true }, orderBy: { createdAt: "desc" as const } },
    revisions: true,
    originalNotice: true
  };
}

async function nextCode() {
  const year = new Date().getFullYear();
  const count = await prisma.changeNotification.count();
  return `TBTD-NCPT-${year}-${String(count + 1).padStart(4, "0")}`;
}

function canCreateForWorkshop(user: ReturnType<typeof currentUser>, workshopType: string) {
  if (user.roles.includes("ADMIN")) return true;
  if (!user.roles.includes("AUTHOR")) return false;
  return user.workshopType === workshopType;
}

function queueWhere(user: ReturnType<typeof currentUser>) {
  const scopedNcpt = [];
  if (user.roles.includes("NCPT_HEAD")) scopedNcpt.push({ status: "PENDING_NCPT_LEAD" });
  if (user.roles.includes("NCPT_LEAD_STERILE")) scopedNcpt.push({ status: "PENDING_NCPT_LEAD", workshopType: "STERILE" });
  if (user.roles.includes("NCPT_LEAD_NON_STERILE")) scopedNcpt.push({ status: "PENDING_NCPT_LEAD", workshopType: "NON_STERILE" });
  if (user.roles.includes("NCPT_LEAD") && user.workshopType !== "ALL") {
    scopedNcpt.push({ status: "PENDING_NCPT_LEAD", workshopType: normalizeWorkshopType(user.workshopType) });
  }

  const nonNcptPending = pendingStatusesForRoles(user.roles).filter((status) => status !== "PENDING_NCPT_LEAD");
  const assigneeRoles = user.roles.filter((role) => !["NCPT_HEAD", "NCPT_LEAD_STERILE", "NCPT_LEAD_NON_STERILE", "NCPT_LEAD"].includes(role));
  const OR = [
    ...scopedNcpt,
    ...(assigneeRoles.length ? [{ currentAssigneeRole: { in: assigneeRoles } }] : []),
    ...(nonNcptPending.length ? [{ status: { in: nonNcptPending } }] : [])
  ];
  return OR.length ? { OR } : {};
}

function accessWhere(user: ReturnType<typeof currentUser>) {
  if (user.roles.includes("ADMIN")) return {};
  const queue = queueWhere(user);
  return {
    OR: [
      { authorId: user.id },
      ...("OR" in queue ? [queue] : []),
      { status: { in: ["APPROVED", "DISTRIBUTED"] } },
      { workflowSteps: { some: { signerId: user.id } } },
      { distributions: { some: { receivingUnit: user.department } } }
    ]
  };
}

function viewWhere(view?: string, user?: ReturnType<typeof currentUser>) {
  if (view === "in-progress") return { status: { in: activeStatuses } };
  if (view === "my-queue" && user) {
    return queueWhere(user);
  }
  if (view === "approved") return { status: { in: ["APPROVED", "DISTRIBUTED"] } };
  if (view === "distributed" && user) return { distributions: { some: { receivingUnit: user.department } } };
  if (view === "superseded") return { status: "SUPERSEDED" };
  if (view === "open-annotations") return { annotations: { some: { status: "OPEN" } } };
  return {};
}

changeNoticeRouter.use(requireAuth);

changeNoticeRouter.get("/", async (req, res) => {
  const user = currentUser(res);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const where = {
    AND: [
      accessWhere(user),
      viewWhere(String(req.query.view || ""), user),
      req.query.status ? { status: String(req.query.status) } : {},
      req.query.product ? { productName: { contains: String(req.query.product) } } : {},
      req.query.changeType ? { changeType: String(req.query.changeType) } : {},
      req.query.impactLevel ? { impactLevel: String(req.query.impactLevel) } : {},
      req.query.department ? { proposerDepartment: { contains: String(req.query.department) } } : {},
      req.query.workshopType ? { workshopType: normalizeWorkshopType(String(req.query.workshopType)) } : {},
      q
        ? {
            OR: [
              { code: { contains: q } },
              { title: { contains: q } },
              { productName: { contains: q } },
              { proposerName: { contains: q } },
              { proposerDepartment: { contains: q } },
              { manufacturingProcessCode: { contains: q } }
            ]
          }
        : {}
    ]
  };

  const notices = await prisma.changeNotification.findMany({
    where,
    include: includeNotice(),
    orderBy: { updatedAt: req.query.sort === "oldest" ? "asc" : "desc" }
  });
  res.json({ notices });
});

changeNoticeRouter.get("/:id", async (req, res) => {
  const notice = await prisma.changeNotification.findUnique({
    where: { id: req.params.id },
    include: includeNotice()
  });
  if (!notice) {
    res.status(404).json({ message: "Không tìm thấy TBTĐ." });
    return;
  }
  res.json({ notice });
});

changeNoticeRouter.post("/", async (req, res) => {
  const parsed = noticeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu TBTĐ không hợp lệ.", issues: parsed.error.issues });
    return;
  }
  const user = currentUser(res);
  if (!user.roles.includes("AUTHOR") && !user.roles.includes("ADMIN")) {
    res.status(403).json({ message: "Chỉ người soạn hoặc admin được tạo TBTĐ." });
    return;
  }
  const workshopType = normalizeWorkshopType(parsed.data.workshopType, user.workshopType === "STERILE" ? "STERILE" : "NON_STERILE");
  if (!canCreateForWorkshop(user, workshopType)) {
    res.status(403).json({ message: "Nhân viên NCPT chỉ được tạo TBTĐ cho xưởng mình phụ trách." });
    return;
  }
  const notice = await prisma.changeNotification.create({
    data: {
      ...parsed.data,
      workshopType,
      code: await nextCode(),
      issuedDate: new Date(parsed.data.issuedDate),
      effectiveNote:
        parsed.data.effectiveNote ||
        "Phiếu thông báo này có hiệu lực kể từ ngày ký và là bản không thể tách rời dự thảo quy trình pha chế gốc.",
      authorId: user.id
    },
    include: includeNotice()
  });
  await writeAudit({ noticeId: notice.id, actorId: user.id, entity: "ChangeNotification", action: "CREATE", after: notice, ip: req.ip });
  res.status(201).json({ notice });
});

changeNoticeRouter.put("/:id", async (req, res) => {
  const parsed = noticeSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu cập nhật không hợp lệ.", issues: parsed.error.issues });
    return;
  }
  const user = currentUser(res);
  const before = await prisma.changeNotification.findUnique({ where: { id: req.params.id } });
  if (!before) {
    res.status(404).json({ message: "Không tìm thấy TBTĐ." });
    return;
  }
  if (!["DRAFT", "RETURNED", "RECALLED"].includes(before.status)) {
    res.status(409).json({ message: "TBTĐ đã khóa, không thể sửa trực tiếp." });
    return;
  }
  if (before.authorId !== user.id && !user.roles.includes("ADMIN")) {
    res.status(403).json({ message: "Bạn chỉ được sửa TBTĐ của mình." });
    return;
  }
  if (parsed.data.workshopType && !canCreateForWorkshop(user, parsed.data.workshopType)) {
    res.status(403).json({ message: "Bạn không được chuyển TBTĐ sang xưởng ngoài phạm vi phụ trách." });
    return;
  }
  const notice = await prisma.changeNotification.update({
    where: { id: req.params.id },
    data: {
      ...parsed.data,
      issuedDate: parsed.data.issuedDate ? new Date(parsed.data.issuedDate) : undefined
    },
    include: includeNotice()
  });
  await writeAudit({ noticeId: notice.id, actorId: user.id, entity: "ChangeNotification", action: "UPDATE", before, after: notice, ip: req.ip });
  res.json({ notice });
});

changeNoticeRouter.post("/:id/submit", async (req, res) => {
  const user = currentUser(res);
  const before = await prisma.changeNotification.findUnique({ where: { id: req.params.id } });
  if (!before) {
    res.status(404).json({ message: "Không tìm thấy TBTĐ." });
    return;
  }
  if (before.authorId !== user.id && !user.roles.includes("ADMIN")) {
    res.status(403).json({ message: "Chỉ người soạn được gửi TBTĐ." });
    return;
  }
  if (!["DRAFT", "RETURNED", "RECALLED"].includes(before.status)) {
    res.status(409).json({ message: "Trạng thái hiện tại không cho phép gửi." });
    return;
  }
  const notice = await prisma.changeNotification.update({
    where: { id: before.id },
    data: { status: "PENDING_NCPT_LEAD", currentAssigneeRole: getNcptLeadRole(before.workshopType) },
    include: includeNotice()
  });
  await prisma.workflowStep.create({
    data: {
      noticeId: notice.id,
      sequence: notice.workflowSteps.length + 1,
      requiredRole: "AUTHOR",
      action: "SUBMITTED",
      signerId: user.id,
      signatureMeaning: "Đã soạn và gửi"
    }
  });
  await writeAudit({ noticeId: notice.id, actorId: user.id, entity: "ChangeNotification", action: "SUBMIT", before, after: notice, ip: req.ip });
  res.json({ notice });
});

changeNoticeRouter.post("/:id/sign", async (req, res) => {
  const user = currentUser(res);
  const before = await prisma.changeNotification.findUnique({ where: { id: req.params.id }, include: includeNotice() });
  if (!before) {
    res.status(404).json({ message: "Không tìm thấy TBTĐ." });
    return;
  }
  if (!canRoleAct(before.status, user.roles, before.workshopType)) {
    res.status(403).json({ message: "TBTĐ này không chờ vai trò của bạn ký." });
    return;
  }
  const step = getWorkflowStep(before.status, before.workshopType)!;
  const actingRole = getActingRole(before.status, user.roles, before.workshopType) ?? step.requiredRole;
  const nextStatus = getNextStatus(before.status)!;
  const finalApproval = nextStatus === "APPROVED";
  const notice = await prisma.$transaction(async (tx) => {
    await tx.workflowStep.create({
      data: {
        noticeId: before.id,
        sequence: before.workflowSteps.length + 1,
        requiredRole: actingRole,
        action: finalApproval ? "APPROVED" : "SIGNED",
        signerId: user.id,
        signatureMeaning: step.signatureMeaning
      }
    });
    await tx.changeNotification.update({
      where: { id: before.id },
      data: {
        status: finalApproval ? "DISTRIBUTED" : nextStatus,
        currentAssigneeRole: finalApproval ? null : getWorkflowStep(nextStatus, before.workshopType)?.requiredRole
      }
    });
    if (finalApproval) {
      for (const unit of getDistributionUnits(before.workshopType)) {
        await tx.distribution.create({
          data: { noticeId: before.id, receivingUnit: unit.receivingUnit, versionLabel: unit.versionLabel }
        });
      }
    }
    return tx.changeNotification.findUniqueOrThrow({
      where: { id: before.id },
      include: includeNotice()
    });
  });
  await writeAudit({ noticeId: notice.id, actorId: user.id, entity: "ChangeNotification", action: finalApproval ? "APPROVE_DISTRIBUTE" : "SIGN", before, after: notice, ip: req.ip });
  res.json({ notice });
});

changeNoticeRouter.post("/:id/return", async (req, res) => {
  const reason = String(req.body?.reason || "").trim();
  if (!reason) {
    res.status(400).json({ message: "Lý do trả về là bắt buộc." });
    return;
  }
  const user = currentUser(res);
  const before = await prisma.changeNotification.findUnique({ where: { id: req.params.id }, include: includeNotice() });
  if (!before) {
    res.status(404).json({ message: "Không tìm thấy TBTĐ." });
    return;
  }
  if (!canRoleAct(before.status, user.roles, before.workshopType)) {
    res.status(403).json({ message: "Bạn không phụ trách bước ký hiện tại." });
    return;
  }
  const step = getWorkflowStep(before.status, before.workshopType)!;
  const actingRole = getActingRole(before.status, user.roles, before.workshopType) ?? step.requiredRole;
  const notice = await prisma.changeNotification.update({
    where: { id: before.id },
    data: { status: "RETURNED", currentAssigneeRole: null },
    include: includeNotice()
  });
  await prisma.workflowStep.create({
    data: {
      noticeId: notice.id,
      sequence: before.workflowSteps.length + 1,
      requiredRole: actingRole,
      action: "RETURNED",
      signerId: user.id,
      signatureMeaning: "Trả về để chỉnh sửa",
      returnReason: reason
    }
  });
  await writeAudit({ noticeId: notice.id, actorId: user.id, entity: "ChangeNotification", action: "RETURN", before, after: { notice, reason }, ip: req.ip });
  res.json({ notice });
});

changeNoticeRouter.post("/:id/recall", async (req, res) => {
  const user = currentUser(res);
  const before = await prisma.changeNotification.findUnique({ where: { id: req.params.id }, include: includeNotice() });
  if (!before) {
    res.status(404).json({ message: "Không tìm thấy TBTĐ." });
    return;
  }
  if (before.authorId !== user.id) {
    res.status(403).json({ message: "Chỉ người soạn được thu hồi." });
    return;
  }
  if (before.workflowSteps.some((step) => step.action === "SIGNED" || step.action === "APPROVED")) {
    res.status(409).json({ message: "Không thể thu hồi sau khi có người ký." });
    return;
  }
  const notice = await prisma.changeNotification.update({
    where: { id: before.id },
    data: { status: "RECALLED", currentAssigneeRole: null },
    include: includeNotice()
  });
  await writeAudit({ noticeId: notice.id, actorId: user.id, entity: "ChangeNotification", action: "RECALL", before, after: notice, ip: req.ip });
  res.json({ notice });
});

changeNoticeRouter.post("/:id/revision", async (req, res) => {
  const user = currentUser(res);
  const reason = String(req.body?.reason || "").trim();
  if (!reason) {
    res.status(400).json({ message: "Lý do sửa đổi là bắt buộc." });
    return;
  }
  const original = await prisma.changeNotification.findUnique({ where: { id: req.params.id }, include: { attachments: true } });
  if (!original) {
    res.status(404).json({ message: "Không tìm thấy TBTĐ gốc." });
    return;
  }
  if (!["APPROVED", "DISTRIBUTED"].includes(original.status)) {
    res.status(409).json({ message: "Chỉ TBTĐ đã duyệt mới tạo bản sửa đổi." });
    return;
  }
  const revision = await prisma.$transaction(async (tx) => {
    await tx.changeNotification.update({ where: { id: original.id }, data: { status: "SUPERSEDED" } });
    const copy = await tx.changeNotification.create({
      data: {
        code: `${original.code}-REV${String(original.revision + 1).padStart(2, "0")}`,
        title: `${original.title} - Revision ${original.revision + 1}`,
        recipient: original.recipient,
        proposerName: user.name,
        proposerDepartment: user.department,
        workshopType: original.workshopType,
        productName: original.productName,
        manufacturingProcessCode: original.manufacturingProcessCode,
        issuedDate: new Date(),
        notificationIssueNumber: original.notificationIssueNumber,
        changeType: original.changeType,
        impactLevel: original.impactLevel,
        changeContent: `${original.changeContent}\n\nLy do revision: ${reason}`,
        effectiveNote: original.effectiveNote,
        authorId: user.id,
        revision: original.revision + 1,
        originalNoticeId: original.id
      }
    });
    for (const attachment of original.attachments) {
      await tx.attachment.create({
        data: {
          noticeId: copy.id,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          category: attachment.category,
          size: attachment.size,
          checksum: attachment.checksum,
          path: attachment.path,
          version: attachment.version + 1
        }
      });
    }
    return copy;
  });
  await writeAudit({ noticeId: revision.id, actorId: user.id, entity: "ChangeNotification", action: "CREATE_REVISION", before: original, after: revision, ip: req.ip });
  res.status(201).json({ notice: revision });
});

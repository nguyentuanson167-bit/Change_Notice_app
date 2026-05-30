import bcrypt from "bcryptjs";
import { prisma } from "../server/src/db";
import { DEMO_PASSWORD } from "../server/src/seedPasswords";

const roles = [
  ["AUTHOR", "Nhân viên NCPT"],
  ["NCPT_LEAD_NON_STERILE", "Tổ trưởng NCPT xưởng không vô trùng"],
  ["NCPT_LEAD_STERILE", "Tổ trưởng NCPT xưởng vô trùng"],
  ["NCPT_HEAD", "Trưởng phòng NCPT"],
  ["QA_DEPUTY", "Phó phòng ĐBCL"],
  ["QA_HEAD", "Trưởng phòng ĐBCL"],
  ["PROD_DIRECTOR", "Giám đốc sản xuất"],
  ["ADMIN", "Quản trị hệ thống"],
  ["VIEWER", "Người xem"]
] as const;

const users = [
  ["author", "Nguyễn Văn Anh", "author@vinphaco.local", "Phòng NCPT / R&D", "NON_STERILE", ["AUTHOR"]],
  ["author2", "Trần Thị Bình", "author2@vinphaco.local", "Phòng NCPT / R&D", "STERILE", ["AUTHOR"]],
  ["lead", "Lê Văn Cường", "lead@vinphaco.local", "Phòng NCPT / R&D", "NON_STERILE", ["NCPT_LEAD_NON_STERILE"]],
  ["lead-sterile", "Mai Thị Hạnh", "lead-sterile@vinphaco.local", "Phòng NCPT / R&D", "STERILE", ["NCPT_LEAD_STERILE"]],
  ["ncpt-head", "Vũ Minh Khoa", "ncpt-head@vinphaco.local", "Phòng NCPT / R&D", "ALL", ["NCPT_HEAD"]],
  ["qa-deputy", "Phạm Thị Dung", "qa-deputy@vinphaco.local", "Phòng ĐBCL / QA", "ALL", ["QA_DEPUTY"]],
  ["qa-head", "Hoàng Văn Em", "qa-head@vinphaco.local", "Phòng ĐBCL / QA", "ALL", ["QA_HEAD"]],
  ["director", "Đỗ Văn Giang", "director@vinphaco.local", "BGĐ sản xuất", "ALL", ["PROD_DIRECTOR"]],
  ["admin", "Quản trị hệ thống", "admin@vinphaco.local", "IT/ĐBCL", "ALL", ["ADMIN"]],
  ["viewer", "Người xem", "viewer@vinphaco.local", "Xưởng sản xuất / Factory", "ALL", ["VIEWER"]]
] as const;

function noticeBase(authorId: string, workshopType: "STERILE" | "NON_STERILE" = "NON_STERILE") {
  return {
    recipient: "Ban Giám đốc sản xuất",
    proposerName: "Nguyễn Văn Anh",
    proposerDepartment: "Phòng Nghiên cứu phát triển / R&D",
    workshopType,
    productName: "Vinmagel",
    manufacturingProcessCode: "NCPT/QT-PC/2025-001",
    issuedDate: new Date("2025-01-24T00:00:00.000Z"),
    notificationIssueNumber: "Lần 2",
    changeType: "Thay đổi quy trình pha chế",
    impactLevel: "Trung bình",
    effectiveNote:
      "Phiếu thông báo này có hiệu lực kể từ ngày ký và là bản không thể tách rời dự thảo quy trình pha chế gốc.",
    authorId
  };
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const roleByCode = new Map<string, string>();

  for (const [code, name] of roles) {
    const role = await prisma.role.upsert({
      where: { code },
      update: { name },
      create: { code, name }
    });
    roleByCode.set(code, role.id);
  }

  const userByUsername = new Map<string, string>();
  for (const [username, name, email, department, workshopType, userRoles] of users) {
    const user = await prisma.user.upsert({
      where: { username },
      update: { name, email, department, workshopType, passwordHash, active: true },
      create: { username, name, email, department, workshopType, passwordHash, active: true }
    });
    userByUsername.set(username, user.id);

    for (const code of userRoles) {
      const roleId = roleByCode.get(code);
      if (!roleId) throw new Error(`Missing role ${code}`);
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId } },
        update: {},
        create: { userId: user.id, roleId }
      });
    }
  }

  const authorId = userByUsername.get("author")!;
  const leadId = userByUsername.get("lead")!;
  const sterileLeadId = userByUsername.get("lead-sterile")!;
  const qaDeputyId = userByUsername.get("qa-deputy")!;
  const qaHeadId = userByUsername.get("qa-head")!;
  const directorId = userByUsername.get("director")!;

  const draft = await prisma.changeNotification.upsert({
    where: { code: "TBTD-NCPT-2026-0001" },
    update: {},
    create: {
      ...noticeBase(authorId, "NON_STERILE"),
      code: "TBTD-NCPT-2026-0001",
      title: "Cập nhật thông số kiểm tra bán thành phẩm",
      changeContent:
        "Điều chỉnh mức AQL và bổ sung cách ghi nhận kết quả kiểm tra trong quy trình pha chế.",
      status: "DRAFT"
    }
  });

  const pending = await prisma.changeNotification.upsert({
    where: { code: "TBTD-NCPT-2026-0002" },
    update: {},
    create: {
      ...noticeBase(authorId, "NON_STERILE"),
      code: "TBTD-NCPT-2026-0002",
      title: "Thay đổi bước trộn sau pha chế",
      changeContent:
        "Bổ sung thời gian cho bước trộn sau pha chế để đảm bảo đồng nhất hơn.",
      status: "PENDING_QA_DEPUTY",
      currentAssigneeRole: "QA_DEPUTY"
    }
  });

  for (const step of [
      {
        noticeId: pending.id,
        sequence: 1,
        requiredRole: "AUTHOR",
        action: "SUBMITTED",
        signerId: authorId,
        signatureMeaning: "Đã soạn và gửi"
      },
      {
        noticeId: pending.id,
        sequence: 2,
        requiredRole: "NCPT_LEAD_NON_STERILE",
        action: "SIGNED",
        signerId: leadId,
        signatureMeaning: "Đã kiểm tra và xác nhận"
      }
    ]) {
    const existing = await prisma.workflowStep.findFirst({
      where: { noticeId: step.noticeId, sequence: step.sequence, action: step.action }
    });
    if (!existing) await prisma.workflowStep.create({ data: step });
  }

  const approved = await prisma.changeNotification.upsert({
    where: { code: "TBTD-NCPT-2026-0003" },
    update: {},
    create: {
      ...noticeBase(authorId, "STERILE"),
      code: "TBTD-NCPT-2026-0003",
      title: "Cập nhật quy trình đóng gói thành phẩm",
      changeContent:
        "Áp dụng nhận diện mới trên bao bì thành phẩm và cập nhật bảng kiểm tra đóng gói.",
      status: "DISTRIBUTED"
    }
  });

  const approvedSteps = [
      ["AUTHOR", "SUBMITTED", authorId, "Đã soạn và gửi"],
      ["NCPT_LEAD_STERILE", "SIGNED", sterileLeadId, "Đã kiểm tra và xác nhận"],
      ["QA_DEPUTY", "SIGNED", qaDeputyId, "Đã thẩm định"],
      ["QA_HEAD", "SIGNED", qaHeadId, "Đã phê duyệt cấp phòng QA"],
      ["PROD_DIRECTOR", "APPROVED", directorId, "Phê duyệt cuối cùng"]
    ].map(([requiredRole, action, signerId, signatureMeaning], index) => ({
      noticeId: approved.id,
      sequence: index + 1,
      requiredRole,
      action,
      signerId,
      signatureMeaning
    }));
  for (const step of approvedSteps) {
    const existing = await prisma.workflowStep.findFirst({
      where: { noticeId: step.noticeId, sequence: step.sequence, action: step.action }
    });
    if (!existing) await prisma.workflowStep.create({ data: step });
  }

  for (const [receivingUnit, versionLabel] of [
    ["Phòng NCPT / R&D", "Bản gốc / Original"],
    ["Phòng ĐBCL / QA", "Bản copy / Copy"],
    ["Xưởng vô trùng / Factory", "Bản copy / Copy"]
  ]) {
    const existing = await prisma.distribution.findFirst({
      where: { noticeId: approved.id, receivingUnit }
    });
    if (!existing) {
      await prisma.distribution.create({
        data: { noticeId: approved.id, receivingUnit, versionLabel, status: "SENT" }
      });
    }
  }

  await prisma.annotation.upsert({
    where: { id: "seed-open-annotation" },
    update: {},
    create: {
      id: "seed-open-annotation",
      noticeId: draft.id,
      type: "GENERAL",
      content: "Cần làm rõ mức thay đổi trong bảng kiểm tra.",
      severity: "REQUIRED",
      creatorId: leadId
    }
  });

  await prisma.backupJob.create({
    data: {
      type: "MANUAL",
      target: "DB + uploads + audit",
      status: "SIMULATED_SUCCESS",
      sizeBytes: 1024 * 1024 * 48,
      createdBy: "admin"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

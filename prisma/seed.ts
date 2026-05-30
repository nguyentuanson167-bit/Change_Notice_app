import bcrypt from "bcryptjs";
import { prisma } from "../server/src/db";
import { DEMO_PASSWORD } from "../server/src/seedPasswords";

const roles = [
  ["AUTHOR", "Nhan vien NCPT"],
  ["NCPT_LEAD", "Phu trach / Truong nhom NCPT"],
  ["QA_DEPUTY", "Pho phong DBCL"],
  ["QA_HEAD", "Truong phong DBCL"],
  ["PROD_DIRECTOR", "Giam doc san xuat"],
  ["ADMIN", "Quan tri he thong"],
  ["VIEWER", "Nguoi xem"]
] as const;

const users = [
  ["author", "Nguyen Van Anh", "author@vinphaco.local", "Phong NCPT / R&D", ["AUTHOR"]],
  ["author2", "Tran Thi Binh", "author2@vinphaco.local", "Phong NCPT / R&D", ["AUTHOR"]],
  ["lead", "Le Van Cuong", "lead@vinphaco.local", "Phong NCPT / R&D", ["NCPT_LEAD"]],
  ["qa-deputy", "Pham Thi Dung", "qa-deputy@vinphaco.local", "Phong DBCL / QA", ["QA_DEPUTY"]],
  ["qa-head", "Hoang Van Em", "qa-head@vinphaco.local", "Phong DBCL / QA", ["QA_HEAD"]],
  ["director", "Do Van Giang", "director@vinphaco.local", "BGD san xuat", ["PROD_DIRECTOR"]],
  ["admin", "Quan tri he thong", "admin@vinphaco.local", "IT/DBCL", ["ADMIN"]],
  ["viewer", "Nguoi xem", "viewer@vinphaco.local", "Xuong san xuat / Factory", ["VIEWER"]]
] as const;

function noticeBase(authorId: string) {
  return {
    recipient: "Ban Giam doc san xuat",
    proposerName: "Nguyen Van Anh",
    proposerDepartment: "Phong Nghien cuu phat trien / R&D",
    productName: "Vinmagel",
    manufacturingProcessCode: "NCPT/QT-PC/2025-001",
    issuedDate: new Date("2025-01-24T00:00:00.000Z"),
    notificationIssueNumber: "Lan 2",
    changeType: "Thay doi quy trinh pha che",
    impactLevel: "Trung binh",
    effectiveNote:
      "Phieu thong bao nay co hieu luc ke tu ngay ky va la ban khong the tach roi du thao quy trinh pha che goc.",
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
  for (const [username, name, email, department, userRoles] of users) {
    const user = await prisma.user.upsert({
      where: { username },
      update: { name, email, department, passwordHash, active: true },
      create: { username, name, email, department, passwordHash, active: true }
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
  const qaDeputyId = userByUsername.get("qa-deputy")!;
  const qaHeadId = userByUsername.get("qa-head")!;
  const directorId = userByUsername.get("director")!;

  const draft = await prisma.changeNotification.upsert({
    where: { code: "TBTD-NCPT-2026-0001" },
    update: {},
    create: {
      ...noticeBase(authorId),
      code: "TBTD-NCPT-2026-0001",
      title: "Cap nhat thong so kiem tra ban thanh pham",
      changeContent:
        "Dieu chinh muc AQL va bo sung cach ghi nhan ket qua kiem tra trong quy trinh pha che.",
      status: "DRAFT"
    }
  });

  const pending = await prisma.changeNotification.upsert({
    where: { code: "TBTD-NCPT-2026-0002" },
    update: {},
    create: {
      ...noticeBase(authorId),
      code: "TBTD-NCPT-2026-0002",
      title: "Thay doi buoc tron sau pha che",
      changeContent:
        "Bo sung thoi gian cho buoc tron sau pha che de dam bao dong nhat hon.",
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
        signatureMeaning: "Da soan va gui"
      },
      {
        noticeId: pending.id,
        sequence: 2,
        requiredRole: "NCPT_LEAD",
        action: "SIGNED",
        signerId: leadId,
        signatureMeaning: "Da kiem tra va xac nhan"
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
      ...noticeBase(authorId),
      code: "TBTD-NCPT-2026-0003",
      title: "Cap nhat quy trinh dong goi thanh pham",
      changeContent:
        "Ap dung nhan dien moi tren bao bi thanh pham va cap nhat bang kiem tra dong goi.",
      status: "DISTRIBUTED"
    }
  });

  const approvedSteps = [
      ["AUTHOR", "SUBMITTED", authorId, "Da soan va gui"],
      ["NCPT_LEAD", "SIGNED", leadId, "Da kiem tra va xac nhan"],
      ["QA_DEPUTY", "SIGNED", qaDeputyId, "Da tham dinh"],
      ["QA_HEAD", "SIGNED", qaHeadId, "Da phe duyet cap phong QA"],
      ["PROD_DIRECTOR", "APPROVED", directorId, "Phe duyet cuoi cung"]
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
    ["Phong NCPT / R&D", "Ban goc / Original"],
    ["Phong DBCL / QA", "Ban copy / Copy"],
    ["Xuong san xuat / Factory", "Ban copy / Copy"]
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
      content: "Can lam ro muc thay doi trong bang kiem tra.",
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

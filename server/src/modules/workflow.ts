export const workflowOrder = [
  {
    pendingStatus: "PENDING_NCPT_LEAD",
    requiredRole: "NCPT_LEAD",
    signatureMeaning: "Đã kiểm tra và xác nhận"
  },
  {
    pendingStatus: "PENDING_QA_DEPUTY",
    requiredRole: "QA_DEPUTY",
    signatureMeaning: "Đã thẩm định"
  },
  {
    pendingStatus: "PENDING_QA_HEAD",
    requiredRole: "QA_HEAD",
    signatureMeaning: "Đã phê duyệt cấp phòng QA"
  },
  {
    pendingStatus: "PENDING_PROD_DIRECTOR",
    requiredRole: "PROD_DIRECTOR",
    signatureMeaning: "Phê duyệt cuối cùng"
  }
] as const;

export const distributionUnits = [
  { receivingUnit: "Phòng NCPT / R&D", versionLabel: "Bản gốc / Original" },
  { receivingUnit: "Phòng ĐBCL / QA", versionLabel: "Bản copy / Copy" },
  { receivingUnit: "Xưởng sản xuất / Factory", versionLabel: "Bản copy / Copy" }
];

export const activeStatuses = [
  "DRAFT",
  "RETURNED",
  "RECALLED",
  "PENDING_NCPT_LEAD",
  "PENDING_QA_DEPUTY",
  "PENDING_QA_HEAD",
  "PENDING_PROD_DIRECTOR"
];

export function getWorkflowStep(status: string) {
  return workflowOrder.find((step) => step.pendingStatus === status);
}

export function getNextStatus(currentStatus: string): string | undefined {
  const index = workflowOrder.findIndex((step) => step.pendingStatus === currentStatus);
  if (index === -1) return undefined;
  return workflowOrder[index + 1]?.pendingStatus ?? "APPROVED";
}

export function canRoleAct(status: string, roles: string[]) {
  const step = getWorkflowStep(status);
  return Boolean(step && roles.includes(step.requiredRole));
}

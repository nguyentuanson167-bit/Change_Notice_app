export const workflowOrder = [
  {
    pendingStatus: "PENDING_NCPT_LEAD",
    requiredRole: "NCPT_LEAD",
    signatureMeaning: "Da kiem tra va xac nhan"
  },
  {
    pendingStatus: "PENDING_QA_DEPUTY",
    requiredRole: "QA_DEPUTY",
    signatureMeaning: "Da tham dinh"
  },
  {
    pendingStatus: "PENDING_QA_HEAD",
    requiredRole: "QA_HEAD",
    signatureMeaning: "Da phe duyet cap phong QA"
  },
  {
    pendingStatus: "PENDING_PROD_DIRECTOR",
    requiredRole: "PROD_DIRECTOR",
    signatureMeaning: "Phe duyet cuoi cung"
  }
] as const;

export const distributionUnits = [
  { receivingUnit: "Phong NCPT / R&D", versionLabel: "Ban goc / Original" },
  { receivingUnit: "Phong DBCL / QA", versionLabel: "Ban copy / Copy" },
  { receivingUnit: "Xuong san xuat / Factory", versionLabel: "Ban copy / Copy" }
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

export const workflowOrder = [
  {
    pendingStatus: "PENDING_NCPT_LEAD",
    requiredRole: "NCPT_LEAD_NON_STERILE",
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

export const workshopLabels: Record<string, string> = {
  STERILE: "Xưởng vô trùng",
  NON_STERILE: "Xưởng không vô trùng",
  ALL: "Tất cả xưởng"
};

export function normalizeWorkshopType(value: unknown, fallback = "NON_STERILE") {
  return value === "STERILE" || value === "NON_STERILE" ? value : fallback;
}

export function getNcptLeadRole(workshopType: string) {
  return normalizeWorkshopType(workshopType) === "STERILE" ? "NCPT_LEAD_STERILE" : "NCPT_LEAD_NON_STERILE";
}

export function getDistributionUnits(workshopType: string) {
  const workshopLabel = workshopLabels[normalizeWorkshopType(workshopType)] ?? workshopLabels.NON_STERILE;
  return [
  { receivingUnit: "Phòng NCPT / R&D", versionLabel: "Bản gốc / Original" },
  { receivingUnit: "Phòng ĐBCL / QA", versionLabel: "Bản copy / Copy" },
    { receivingUnit: `${workshopLabel} / Factory`, versionLabel: "Bản copy / Copy" }
  ];
}

export const activeStatuses = [
  "DRAFT",
  "RETURNED",
  "RECALLED",
  "PENDING_NCPT_LEAD",
  "PENDING_QA_DEPUTY",
  "PENDING_QA_HEAD",
  "PENDING_PROD_DIRECTOR"
];

export function getWorkflowStep(status: string, workshopType = "NON_STERILE") {
  const step = workflowOrder.find((item) => item.pendingStatus === status);
  if (!step) return undefined;
  if (status !== "PENDING_NCPT_LEAD") return step;
  return {
    ...step,
    requiredRole: getNcptLeadRole(workshopType)
  };
}

export function getNextStatus(currentStatus: string): string | undefined {
  const index = workflowOrder.findIndex((step) => step.pendingStatus === currentStatus);
  if (index === -1) return undefined;
  return workflowOrder[index + 1]?.pendingStatus ?? "APPROVED";
}

export function pendingStatusesForRoles(roles: string[]) {
  const statuses = workflowOrder
    .filter((step) => roles.includes(step.requiredRole))
    .map((step) => step.pendingStatus);
  if (roles.includes("NCPT_HEAD") || roles.includes("NCPT_LEAD_STERILE") || roles.includes("NCPT_LEAD_NON_STERILE") || roles.includes("NCPT_LEAD")) {
    statuses.push("PENDING_NCPT_LEAD");
  }
  return [...new Set(statuses)];
}

export function canRoleAct(status: string, roles: string[], workshopType = "NON_STERILE") {
  const step = getWorkflowStep(status, workshopType);
  if (!step) return false;
  if (status === "PENDING_NCPT_LEAD" && roles.includes("NCPT_HEAD")) return true;
  return roles.includes(step.requiredRole) || (status === "PENDING_NCPT_LEAD" && roles.includes("NCPT_LEAD"));
}

export function getActingRole(status: string, roles: string[], workshopType = "NON_STERILE") {
  const step = getWorkflowStep(status, workshopType);
  if (!step) return undefined;
  if (status === "PENDING_NCPT_LEAD" && roles.includes("NCPT_HEAD")) return "NCPT_HEAD";
  if (roles.includes(step.requiredRole)) return step.requiredRole;
  if (status === "PENDING_NCPT_LEAD" && roles.includes("NCPT_LEAD")) return "NCPT_LEAD";
  return undefined;
}

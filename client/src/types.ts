export type RoleCode =
  | "AUTHOR"
  | "NCPT_LEAD"
  | "QA_DEPUTY"
  | "QA_HEAD"
  | "PROD_DIRECTOR"
  | "ADMIN"
  | "VIEWER";

export type NoticeStatus =
  | "DRAFT"
  | "PENDING_NCPT_LEAD"
  | "PENDING_QA_DEPUTY"
  | "PENDING_QA_HEAD"
  | "PENDING_PROD_DIRECTOR"
  | "APPROVED"
  | "DISTRIBUTED"
  | "RETURNED"
  | "RECALLED"
  | "CANCELLED"
  | "SUPERSEDED";

export type User = {
  id: string;
  username: string;
  name: string;
  email: string;
  department: string;
  active: boolean;
  roles: RoleCode[];
};

export type Attachment = {
  id: string;
  noticeId: string;
  fileName: string;
  mimeType: string;
  category: string;
  size: number;
  checksum: string;
  path: string;
  version: number;
};

export type WorkflowStep = {
  id: string;
  requiredRole: RoleCode | string;
  action: string;
  signatureMeaning: string;
  returnReason?: string;
  createdAt: string;
  signer?: User;
};

export type AnnotationReply = {
  id: string;
  content: string;
  createdAt: string;
  author: User;
};

export type Annotation = {
  id: string;
  type: string;
  pageNumber?: number;
  referenceText?: string;
  content: string;
  severity: string;
  status: string;
  createdAt: string;
  creator: User;
  replies: AnnotationReply[];
};

export type Distribution = {
  id: string;
  receivingUnit: string;
  versionLabel: string;
  status: string;
  acknowledgedAt?: string;
  acknowledgedBy?: User;
};

export type AuditLog = {
  id: string;
  entity: string;
  action: string;
  beforeJson?: string;
  afterJson?: string;
  createdAt: string;
  actor?: User;
};

export type ChangeNotice = {
  id: string;
  code: string;
  title: string;
  recipient: string;
  proposerName: string;
  proposerDepartment: string;
  productName: string;
  manufacturingProcessCode: string;
  issuedDate: string;
  notificationIssueNumber: string;
  changeType: string;
  impactLevel: string;
  changeContent: string;
  effectiveNote: string;
  status: NoticeStatus;
  currentAssigneeRole?: RoleCode;
  authorId: string;
  author?: User;
  revision: number;
  originalNoticeId?: string;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
  workflowSteps: WorkflowStep[];
  annotations: Annotation[];
  distributions: Distribution[];
  auditLogs: AuditLog[];
  revisions?: ChangeNotice[];
  originalNotice?: ChangeNotice;
};

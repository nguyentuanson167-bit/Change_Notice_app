import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbPath = resolve("prisma/dev.db");
mkdirSync(dirname(dbPath), { recursive: true });
if (existsSync(dbPath)) unlinkSync(dbPath);

const db = new DatabaseSync(dbPath);
db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE User (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  department TEXT NOT NULL,
  workshopType TEXT NOT NULL DEFAULT 'ALL',
  active BOOLEAN NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Role (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE UserRole (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  roleId TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES User(id),
  FOREIGN KEY (roleId) REFERENCES Role(id),
  UNIQUE(userId, roleId)
);

CREATE TABLE ChangeNotification (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  recipient TEXT NOT NULL,
  proposerName TEXT NOT NULL,
  proposerDepartment TEXT NOT NULL,
  workshopType TEXT NOT NULL,
  productName TEXT NOT NULL,
  manufacturingProcessCode TEXT NOT NULL,
  issuedDate DATETIME NOT NULL,
  notificationIssueNumber TEXT NOT NULL,
  changeType TEXT NOT NULL,
  impactLevel TEXT NOT NULL,
  changeContent TEXT NOT NULL,
  effectiveNote TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  currentAssigneeRole TEXT,
  authorId TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  originalNoticeId TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (authorId) REFERENCES User(id),
  FOREIGN KEY (originalNoticeId) REFERENCES ChangeNotification(id)
);

CREATE TABLE Attachment (
  id TEXT PRIMARY KEY,
  noticeId TEXT NOT NULL,
  fileName TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  category TEXT NOT NULL,
  size INTEGER NOT NULL,
  checksum TEXT NOT NULL,
  path TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (noticeId) REFERENCES ChangeNotification(id)
);

CREATE TABLE WorkflowStep (
  id TEXT PRIMARY KEY,
  noticeId TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  requiredRole TEXT NOT NULL,
  action TEXT NOT NULL,
  signerId TEXT,
  signatureMeaning TEXT NOT NULL,
  returnReason TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (noticeId) REFERENCES ChangeNotification(id),
  FOREIGN KEY (signerId) REFERENCES User(id)
);

CREATE TABLE Annotation (
  id TEXT PRIMARY KEY,
  noticeId TEXT NOT NULL,
  attachmentId TEXT,
  type TEXT NOT NULL,
  pageNumber INTEGER,
  x REAL,
  y REAL,
  referenceText TEXT,
  content TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  creatorId TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (noticeId) REFERENCES ChangeNotification(id),
  FOREIGN KEY (creatorId) REFERENCES User(id)
);

CREATE TABLE AnnotationReply (
  id TEXT PRIMARY KEY,
  annotationId TEXT NOT NULL,
  authorId TEXT NOT NULL,
  content TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (annotationId) REFERENCES Annotation(id),
  FOREIGN KEY (authorId) REFERENCES User(id)
);

CREATE TABLE Distribution (
  id TEXT PRIMARY KEY,
  noticeId TEXT NOT NULL,
  receivingUnit TEXT NOT NULL,
  versionLabel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SENT',
  acknowledgedById TEXT,
  acknowledgedAt DATETIME,
  notes TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (noticeId) REFERENCES ChangeNotification(id),
  FOREIGN KEY (acknowledgedById) REFERENCES User(id)
);

CREATE TABLE AuditLog (
  id TEXT PRIMARY KEY,
  noticeId TEXT,
  actorId TEXT,
  entity TEXT NOT NULL,
  action TEXT NOT NULL,
  beforeJson TEXT,
  afterJson TEXT,
  ip TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (noticeId) REFERENCES ChangeNotification(id),
  FOREIGN KEY (actorId) REFERENCES User(id)
);

CREATE TABLE Notification (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE BackupJob (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  target TEXT NOT NULL,
  status TEXT NOT NULL,
  sizeBytes INTEGER,
  createdBy TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

db.close();
console.log(`Created SQLite database at ${dbPath}`);

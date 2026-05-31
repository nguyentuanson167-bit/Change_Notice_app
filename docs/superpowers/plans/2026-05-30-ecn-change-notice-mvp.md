# eCN Change Notice MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable local full-stack MVP for the eCN Change Notice system in `Project/Change-notice`.

**Architecture:** A single TypeScript monorepo contains a React/Vite client and an Express API. The API owns authentication, authorization, workflow transitions, file metadata, print data, distribution, annotations, and audit logging. Prisma with SQLite stores local data, while uploaded files are stored under `server/uploads`.

**Tech Stack:** React, Vite, TypeScript, Express, Prisma, SQLite, Vitest, Supertest, Multer, Zod.

---

## File Structure

Create or modify these files:

```text
Project/Change-notice/
  README.md
  package.json
  .gitignore
  tsconfig.base.json
  prisma/
    schema.prisma
    seed.ts
  server/
    package.json
    tsconfig.json
    uploads/.gitkeep
    src/
      app.ts
      server.ts
      db.ts
      seedPasswords.ts
      modules/auth.ts
      modules/audit.ts
      modules/changeNotices.ts
      modules/workflow.ts
      modules/attachments.ts
      modules/annotations.ts
      modules/distribution.ts
      modules/printing.ts
      tests/workflow.test.ts
      tests/auth.test.ts
  client/
    package.json
    index.html
    tsconfig.json
    vite.config.ts
    src/
      main.tsx
      App.tsx
      api.ts
      types.ts
      styles.css
      components/Layout.tsx
      pages/LoginPage.tsx
      pages/DashboardPage.tsx
      pages/BrowsePage.tsx
      pages/NoticeFormPage.tsx
      pages/NoticeDetailPage.tsx
      pages/PrintNoticePage.tsx
      pages/AdminUsersPage.tsx
```

No existing app code is present. The directory `Project/Change-notice/docs/superpowers/specs/2026-05-30-ecn-change-notice-design.md` already contains the approved design.

The parent workspace is not a git repository. Do not run git commit steps unless a repository is initialized later by the user.

## Task 1: Monorepo Scaffold

**Files:**
- Create: `Project/Change-notice/package.json`
- Create: `Project/Change-notice/.gitignore`
- Create: `Project/Change-notice/tsconfig.base.json`
- Create: `Project/Change-notice/README.md`
- Create: `Project/Change-notice/server/package.json`
- Create: `Project/Change-notice/server/tsconfig.json`
- Create: `Project/Change-notice/client/package.json`
- Create: `Project/Change-notice/client/tsconfig.json`
- Create: `Project/Change-notice/client/vite.config.ts`
- Create: `Project/Change-notice/client/index.html`
- Create: `Project/Change-notice/server/uploads/.gitkeep`

- [ ] **Step 1: Create package manifests**

Root `package.json`:

```json
{
  "name": "ecn-change-notice",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "install:all": "npm install --workspaces",
    "dev": "concurrently \"npm run dev --workspace server\" \"npm run dev --workspace client\"",
    "build": "npm run build --workspace server && npm run build --workspace client",
    "test": "npm run test --workspace server",
    "db:generate": "npm run db:generate --workspace server",
    "db:migrate": "npm run db:migrate --workspace server",
    "db:seed": "npm run db:seed --workspace server"
  },
  "workspaces": [
    "server",
    "client"
  ],
  "devDependencies": {
    "concurrently": "^9.1.2"
  }
}
```

Server `package.json`:

```json
{
  "name": "server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "test": "vitest run",
    "db:generate": "prisma generate --schema ../prisma/schema.prisma",
    "db:migrate": "prisma migrate dev --schema ../prisma/schema.prisma --name init",
    "db:seed": "tsx ../prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^6.8.2",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "express-session": "^1.18.0",
    "multer": "^1.4.5-lts.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/express-session": "^1.18.0",
    "@types/multer": "^1.4.11",
    "@types/node": "^22.10.2",
    "prisma": "^6.8.2",
    "supertest": "^7.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

Client `package.json`:

```json
{
  "name": "client",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 5173",
    "build": "tsc -p tsconfig.json && vite build",
    "preview": "vite preview --host 127.0.0.1 --port 4173"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.5",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.468.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: Add TypeScript and app shell config**

Root `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
```

Server `tsconfig.json`:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node", "vitest"]
  },
  "include": ["src/**/*.ts"]
}
```

Client `tsconfig.json`:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "types": ["vite/client"],
    "noEmit": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "vite.config.ts"]
}
```

Client `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:4000",
      "/uploads": "http://127.0.0.1:4000"
    }
  }
});
```

Client `index.html`:

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>eCN - Quan ly Thong bao thay doi</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Add ignore and README**

`.gitignore`:

```text
node_modules/
dist/
.env
*.db
*.db-journal
server/uploads/*
!server/uploads/.gitkeep
.superpowers/
```

README:

```md
# eCN Change Notice MVP

Local MVP for managing Thong bao thay doi (TBTD).

## Run locally

```powershell
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://127.0.0.1:5173`.

Seeded users use password `password123`.
```

- [ ] **Step 4: Install dependencies**

Run:

```powershell
npm install
```

Expected: npm installs root, server, and client workspace dependencies without errors.

## Task 2: Prisma Schema And Seed Data

**Files:**
- Create: `Project/Change-notice/prisma/schema.prisma`
- Create: `Project/Change-notice/prisma/seed.ts`
- Create: `Project/Change-notice/server/src/db.ts`
- Create: `Project/Change-notice/server/src/seedPasswords.ts`

- [ ] **Step 1: Define Prisma schema**

Create `prisma/schema.prisma` with enums for roles, statuses, workflow actions, annotation severity/status, and models named in the spec. Required `ChangeNotification` fields include printable paper-form fields:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

enum RoleCode {
  AUTHOR
  NCPT_LEAD
  QA_DEPUTY
  QA_HEAD
  PROD_DIRECTOR
  ADMIN
  VIEWER
}

enum NoticeStatus {
  DRAFT
  PENDING_NCPT_LEAD
  PENDING_QA_DEPUTY
  PENDING_QA_HEAD
  PENDING_PROD_DIRECTOR
  APPROVED
  DISTRIBUTED
  RETURNED
  RECALLED
  CANCELLED
  SUPERSEDED
}

enum WorkflowAction {
  SUBMITTED
  SIGNED
  RETURNED
  RECALLED
  APPROVED
}

enum AnnotationSeverity {
  REQUIRED
  SUGGESTION
  QUESTION
}

enum AnnotationStatus {
  OPEN
  RESOLVED
}

model User {
  id             String    @id @default(cuid())
  username       String    @unique
  name           String
  email          String    @unique
  passwordHash   String
  department     String
  active         Boolean   @default(true)
  roles          UserRole[]
  authored       ChangeNotification[] @relation("AuthorNotices")
  workflowSteps  WorkflowStep[]
  auditLogs      AuditLog[]
  annotations    Annotation[]
  replies        AnnotationReply[]
  acknowledgements Distribution[] @relation("DistributionAckUser")
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

model Role {
  id    String   @id @default(cuid())
  code  RoleCode @unique
  name  String
  users UserRole[]
}

model UserRole {
  id     String @id @default(cuid())
  userId String
  roleId String
  user   User   @relation(fields: [userId], references: [id])
  role   Role   @relation(fields: [roleId], references: [id])
  @@unique([userId, roleId])
}

model ChangeNotification {
  id                         String @id @default(cuid())
  code                       String @unique
  title                      String
  recipient                  String
  proposerName               String
  proposerDepartment         String
  productName                String
  manufacturingProcessCode   String
  issuedDate                 DateTime
  notificationIssueNumber    String
  changeType                 String
  impactLevel                String
  changeContent              String
  effectiveNote              String
  status                     NoticeStatus @default(DRAFT)
  currentAssigneeRole        RoleCode?
  authorId                   String
  author                     User @relation("AuthorNotices", fields: [authorId], references: [id])
  revision                   Int @default(0)
  originalNoticeId           String?
  originalNotice             ChangeNotification? @relation("RevisionChain", fields: [originalNoticeId], references: [id])
  revisions                  ChangeNotification[] @relation("RevisionChain")
  attachments                Attachment[]
  workflowSteps              WorkflowStep[]
  annotations                Annotation[]
  distributions              Distribution[]
  auditLogs                  AuditLog[]
  createdAt                  DateTime @default(now())
  updatedAt                  DateTime @updatedAt
}

model Attachment {
  id        String @id @default(cuid())
  noticeId  String
  notice    ChangeNotification @relation(fields: [noticeId], references: [id])
  fileName  String
  mimeType  String
  category  String
  size      Int
  checksum  String
  path      String
  version   Int @default(1)
  createdAt DateTime @default(now())
}

model WorkflowStep {
  id               String @id @default(cuid())
  noticeId         String
  notice           ChangeNotification @relation(fields: [noticeId], references: [id])
  sequence         Int
  requiredRole     RoleCode
  action           WorkflowAction
  signerId         String?
  signer           User? @relation(fields: [signerId], references: [id])
  signatureMeaning String
  returnReason     String?
  createdAt        DateTime @default(now())
}

model Annotation {
  id            String @id @default(cuid())
  noticeId      String
  notice        ChangeNotification @relation(fields: [noticeId], references: [id])
  attachmentId  String?
  type          String
  pageNumber    Int?
  x             Float?
  y             Float?
  referenceText String?
  content       String
  severity      AnnotationSeverity
  status        AnnotationStatus @default(OPEN)
  creatorId     String
  creator       User @relation(fields: [creatorId], references: [id])
  replies       AnnotationReply[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model AnnotationReply {
  id           String @id @default(cuid())
  annotationId String
  annotation   Annotation @relation(fields: [annotationId], references: [id])
  authorId     String
  author       User @relation(fields: [authorId], references: [id])
  content      String
  createdAt    DateTime @default(now())
}

model Distribution {
  id              String @id @default(cuid())
  noticeId         String
  notice           ChangeNotification @relation(fields: [noticeId], references: [id])
  receivingUnit    String
  versionLabel     String
  status           String @default("SENT")
  acknowledgedById String?
  acknowledgedBy   User? @relation("DistributionAckUser", fields: [acknowledgedById], references: [id])
  acknowledgedAt   DateTime?
  notes            String?
  createdAt        DateTime @default(now())
}

model AuditLog {
  id        String @id @default(cuid())
  noticeId  String?
  notice    ChangeNotification? @relation(fields: [noticeId], references: [id])
  actorId   String?
  actor     User? @relation(fields: [actorId], references: [id])
  entity    String
  action    String
  beforeJson String?
  afterJson  String?
  ip        String?
  createdAt DateTime @default(now())
}

model Notification {
  id        String @id @default(cuid())
  userId    String
  content   String
  read      Boolean @default(false)
  createdAt DateTime @default(now())
}

model BackupJob {
  id        String @id @default(cuid())
  type      String
  target    String
  status    String
  sizeBytes Int?
  createdBy String?
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Create Prisma client helper**

`server/src/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

`server/src/seedPasswords.ts`:

```ts
export const DEMO_PASSWORD = "password123";
```

- [ ] **Step 3: Seed roles, users, notices, workflow data**

Create `prisma/seed.ts` that:

- Hashes `password123`.
- Creates roles for all `RoleCode` values.
- Creates at least seven users: `author`, `lead`, `qa-deputy`, `qa-head`, `director`, `admin`, `viewer`.
- Creates one draft notice, one pending notice, and one approved/distributed notice.
- Creates distribution rows for `Phong NCPT / R&D`, `Phong DBCL / QA`, `Xuong san xuat / Factory`.

The seed must use `upsert` on unique fields so it can run repeatedly.

- [ ] **Step 4: Generate, migrate, seed**

Run:

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
```

Expected: Prisma generates client, creates SQLite database at `prisma/dev.db`, and seed exits without duplicate errors.

## Task 3: Express App, Auth, Authorization, Audit

**Files:**
- Create: `server/src/app.ts`
- Create: `server/src/server.ts`
- Create: `server/src/modules/auth.ts`
- Create: `server/src/modules/audit.ts`
- Create: `server/src/tests/auth.test.ts`

- [ ] **Step 1: Add auth tests first**

`server/src/tests/auth.test.ts` must verify:

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../app";

describe("auth", () => {
  it("logs in seeded users", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "author", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("author");
    expect(res.body.user.roles).toContain("AUTHOR");
  });

  it("rejects invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "author", password: "wrong" });

    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run auth tests to verify failure**

Run:

```powershell
npm run test --workspace server -- auth.test.ts
```

Expected: FAIL because `server/src/app.ts` does not exist yet.

- [ ] **Step 3: Implement app and auth module**

`auth.ts` exports:

- `authRouter`
- `requireAuth`
- `requireRole`
- `serializeUser`

Routes:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Use `express-session`, `bcryptjs`, and Prisma user lookup. Return user id, username, name, email, department, active, and roles.

`app.ts` configures:

- JSON middleware.
- CORS for `http://127.0.0.1:5173`.
- Session cookie.
- Static `/uploads`.
- `/api/auth`.

`server.ts` starts port `4000`.

- [ ] **Step 4: Implement audit helper**

`audit.ts` exports:

```ts
export async function writeAudit(input: {
  noticeId?: string;
  actorId?: string;
  entity: string;
  action: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}) {
  return prisma.auditLog.create({
    data: {
      noticeId: input.noticeId,
      actorId: input.actorId,
      entity: input.entity,
      action: input.action,
      beforeJson: input.before === undefined ? undefined : JSON.stringify(input.before),
      afterJson: input.after === undefined ? undefined : JSON.stringify(input.after),
      ip: input.ip
    }
  });
}
```

- [ ] **Step 5: Run auth tests**

Run:

```powershell
npm run test --workspace server -- auth.test.ts
```

Expected: PASS after database seed exists.

## Task 4: Change Notice Workflow API

**Files:**
- Create: `server/src/modules/workflow.ts`
- Create: `server/src/modules/changeNotices.ts`
- Create: `server/src/tests/workflow.test.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Write workflow tests first**

`workflow.test.ts` covers:

- Author creates and submits draft.
- NCPT lead signs, status advances to QA deputy.
- Wrong role cannot sign.
- Return requires reason.
- Final director signature creates distribution rows.

Use Supertest agents so session cookies persist:

```ts
const author = request.agent(app);
await author.post("/api/auth/login").send({ username: "author", password: "password123" });
```

- [ ] **Step 2: Run workflow tests to verify failure**

Run:

```powershell
npm run test --workspace server -- workflow.test.ts
```

Expected: FAIL because notice routes are not implemented.

- [ ] **Step 3: Implement workflow constants**

`workflow.ts` exports:

- `workflowOrder`: pending status, required role, signature meaning.
- `getNextStatus(currentStatus)`
- `canRoleAct(status, roles)`
- `distributionUnits`

Use this order:

```ts
[
  ["PENDING_NCPT_LEAD", "NCPT_LEAD", "Da kiem tra va xac nhan"],
  ["PENDING_QA_DEPUTY", "QA_DEPUTY", "Da tham dinh"],
  ["PENDING_QA_HEAD", "QA_HEAD", "Da phe duyet cap phong QA"],
  ["PENDING_PROD_DIRECTOR", "PROD_DIRECTOR", "Phe duyet cuoi cung"]
]
```

- [ ] **Step 4: Implement notice routes**

`changeNotices.ts` routes:

- `GET /api/notices`
- `GET /api/notices/:id`
- `POST /api/notices`
- `PUT /api/notices/:id`
- `POST /api/notices/:id/submit`
- `POST /api/notices/:id/sign`
- `POST /api/notices/:id/return`
- `POST /api/notices/:id/recall`
- `POST /api/notices/:id/revision`

Validation:

- Create requires printable fields: recipient, proposerName, proposerDepartment, productName, manufacturingProcessCode, issuedDate, notificationIssueNumber, title, changeType, impactLevel, changeContent.
- Sign requires logged-in user role to match current status.
- Return requires non-empty `reason`.
- Approved notices cannot be edited.

Every mutation writes audit.

- [ ] **Step 5: Mount routes and run tests**

Modify `app.ts`:

```ts
import { changeNoticeRouter } from "./modules/changeNotices";
app.use("/api/notices", changeNoticeRouter);
```

Run:

```powershell
npm run test --workspace server -- workflow.test.ts
```

Expected: PASS.

## Task 5: Attachments, Annotations, Distribution, Printing API

**Files:**
- Create: `server/src/modules/attachments.ts`
- Create: `server/src/modules/annotations.ts`
- Create: `server/src/modules/distribution.ts`
- Create: `server/src/modules/printing.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Implement attachment routes**

Routes:

- `POST /api/notices/:id/attachments`
- `GET /api/notices/:id/attachments`

Use Multer disk storage under `server/uploads`. Accept `.pdf`, `.doc`, `.docx`. Calculate SHA-256 checksum with Node `crypto`. Store path relative to upload root.

- [ ] **Step 2: Implement annotation routes**

Routes:

- `POST /api/notices/:id/annotations`
- `PUT /api/annotations/:id/status`
- `POST /api/annotations/:id/replies`

Fields:

- `attachmentId`
- `type`
- `pageNumber`
- `x`
- `y`
- `referenceText`
- `content`
- `severity`

Only authenticated users can comment; audit every creation/status change.

- [ ] **Step 3: Implement distribution routes**

Routes:

- `GET /api/notices/:id/distributions`
- `POST /api/distributions/:id/acknowledge`

Acknowledgement requires logged-in user department to match receiving unit or user has `ADMIN`.

- [ ] **Step 4: Implement printing route**

Route:

- `GET /api/notices/:id/print-data`

Return:

- notice fields
- workflow signatures grouped by signature block
- attachments
- distributions
- visible status marker for non-final copies

- [ ] **Step 5: Mount modules and run build**

Modify `app.ts` to mount attachment, annotation, distribution, and printing routers.

Run:

```powershell
npm run build --workspace server
```

Expected: TypeScript build succeeds.

## Task 6: Frontend Shell, Auth, API Client

**Files:**
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/api.ts`
- Create: `client/src/types.ts`
- Create: `client/src/styles.css`
- Create: `client/src/components/Layout.tsx`
- Create: `client/src/pages/LoginPage.tsx`

- [ ] **Step 1: Add shared types**

`types.ts` defines:

- `User`
- `RoleCode`
- `NoticeStatus`
- `ChangeNotice`
- `Attachment`
- `Annotation`
- `Distribution`
- `AuditLog`

These names must match API response keys.

- [ ] **Step 2: Add API client**

`api.ts` exports:

```ts
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || "Request failed");
  }
  return res.json() as Promise<T>;
}
```

- [ ] **Step 3: Build app state and routing without router dependency**

`App.tsx` stores current user and active page in React state. Pages:

- `dashboard`
- `browse`
- `create`
- `detail`
- `print`
- `admin-users`

Use a simple `navigate(page, params)` function to avoid adding router complexity.

- [ ] **Step 4: Implement LoginPage**

Show demo accounts and a username/password form. Default password hint: `password123`. Login calls `/api/auth/login`.

- [ ] **Step 5: Implement Layout**

Use a dense operational sidebar with:

- Dashboard
- Tra cuu TBTD
- Tao TBTD
- Cho toi xu ly
- Quan ly tai khoan (Admin only)

Header shows logged-in user, department, roles, and logout.

- [ ] **Step 6: Run client build**

Run:

```powershell
npm run build --workspace client
```

Expected: FAIL until pages from the next task exist, then PASS after Task 7.

## Task 7: Frontend Operational Pages

**Files:**
- Create: `client/src/pages/DashboardPage.tsx`
- Create: `client/src/pages/BrowsePage.tsx`
- Create: `client/src/pages/NoticeFormPage.tsx`
- Create: `client/src/pages/NoticeDetailPage.tsx`
- Create: `client/src/pages/PrintNoticePage.tsx`
- Create: `client/src/pages/AdminUsersPage.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/styles.css`

- [ ] **Step 1: Implement DashboardPage**

Show counts for:

- Total visible notices.
- Dang thuc hien.
- Cho toi xu ly.
- Da phe duyet.
- Co ghi chu mo.
- Phan phoi chua xac nhan.

Use `/api/notices?view=...` calls or a dashboard endpoint if implemented.

- [ ] **Step 2: Implement BrowsePage**

Tabs:

- Tat ca
- Dang thuc hien
- Cho toi xu ly
- Da phe duyet
- Da phan phoi
- Da thay the
- Co ghi chu mo

Filters:

- keyword
- status
- product
- change type
- impact level
- department
- date range

Rows show code, title, product, manufacturing process code, status badge, proposer department, current assignee role, last updated, open annotation count, and distribution summary.

Quick actions:

- Chi tiet
- In phieu
- Tai lieu
- Ky/Tra ve when eligible
- Xac nhan da nhan when eligible

- [ ] **Step 3: Implement NoticeFormPage**

Fields:

- recipient
- proposerName
- proposerDepartment
- productName
- manufacturingProcessCode
- issuedDate
- notificationIssueNumber
- title
- changeType
- impactLevel
- changeContent
- effectiveNote

Create notice first, then upload attachments to created notice id. Provide submit button after save.

- [ ] **Step 4: Implement NoticeDetailPage**

Sections:

- Metadata.
- Attachment list with preview/download/print.
- Workflow timeline.
- Action panel for submit, sign, return, recall, revision.
- Annotation list and add annotation form.
- Distribution acknowledgement table.
- Revision chain.
- Audit trail.

- [ ] **Step 5: Implement PrintNoticePage**

Render an A4-style printable form with:

- `PHIEU THONG BAO THAY DOI / CHANGE NOTICE`
- Date and form code.
- Recipient/proposer/department.
- Product information.
- Change content.
- Effectivity note.
- Four signature columns.
- Distribution table.

Add `window.print()` button and print CSS. Non-final notices show a large status marker.

- [ ] **Step 6: Implement AdminUsersPage**

List users and allow:

- create user
- update name/email/department
- assign roles via checkboxes
- activate/deactivate

Use `/api/admin/users` routes added in Task 8.

- [ ] **Step 7: Run client build**

Run:

```powershell
npm run build --workspace client
```

Expected: PASS.

## Task 8: Admin Users API And Browse Query Completeness

**Files:**
- Modify: `server/src/modules/auth.ts`
- Modify: `server/src/modules/changeNotices.ts`
- Create: `server/src/modules/adminUsers.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Add admin user routes**

Routes:

- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/:id`
- `POST /api/admin/users/:id/roles`
- `POST /api/admin/users/:id/activate`
- `POST /api/admin/users/:id/deactivate`

All require `ADMIN`.

- [ ] **Step 2: Complete browse query logic**

`GET /api/notices` supports:

- `view`
- `q`
- `status`
- `product`
- `changeType`
- `impactLevel`
- `department`
- `from`
- `to`
- `sort`

It returns only records the user can see:

- Admin sees all.
- Author sees own authored notices.
- Signers see notices matching their role or already signed by them.
- Department users see distributed records for their department.
- Viewer sees approved/distributed records.

- [ ] **Step 3: Run server build**

Run:

```powershell
npm run build --workspace server
```

Expected: PASS.

## Task 9: End-To-End Verification And README

**Files:**
- Modify: `Project/Change-notice/README.md`

- [ ] **Step 1: Run full verification**

Run:

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
npm run test
npm run build
```

Expected: all commands complete successfully.

- [ ] **Step 2: Run local app manually**

Run:

```powershell
npm run dev
```

Expected:

- API available at `http://127.0.0.1:4000`.
- Frontend available at `http://127.0.0.1:5173`.
- Login with `author` / `password123`.
- Browse page shows seeded notices.
- Creating, submitting, signing, returning, printing, and distribution acknowledgement can be exercised using seeded accounts.

- [ ] **Step 3: Update README with account list**

Add:

```md
## Demo accounts

All demo accounts use password `password123`.

| Username | Role |
| --- | --- |
| author | Author / NCPT |
| lead | NCPT Lead |
| qa-deputy | QA Deputy |
| qa-head | QA Head |
| director | Production Director |
| admin | Admin |
| viewer | Viewer |
```

- [ ] **Step 4: Document MVP limitations**

Add:

```md
## MVP limitations

- Upload is multipart with progress, not chunked/resumable.
- Electronic signature is password re-confirmation in the application, not a legal digital certificate.
- Email, SSO/AD, immutable off-site backup, and merged attachment PDF export are production upgrade points.
- PDF annotation stores page/reference/coordinates but does not draw directly into the original file.
```

## Self-Review Checklist

- Spec coverage:
  - Multi-account login and admin user management: Task 3, Task 6, Task 8.
  - Printable Change Notice form and attachment printing: Task 5, Task 7.
  - Browse for in-progress and completed notices: Task 7, Task 8.
  - Workflow signing/return/revision/distribution: Task 4, Task 5, Task 7.
  - Audit trail: Task 3, Task 4, Task 5.
  - Attachments and annotations: Task 5, Task 7.
- Placeholder scan:
  - The plan contains no placeholder steps or unspecified future-work instructions.
- Type consistency:
  - Prisma enum names and route names are referenced consistently across backend and frontend tasks.

## Change Request Follow-Up Plan

The following fixes were added after initial MVP implementation:

- Localize visible UI copy into Vietnamese with proper diacritics.
- Localize backend error messages and seeded demo data that can appear in the UI.
- Preserve Vietnamese attachment names in database metadata while saving normalized safe file names on disk.
- Make edit actions explicit:
  - Browse rows for `DRAFT`, `RETURNED`, and `RECALLED` show `Sửa`.
  - Detail page shows `Sửa phiếu đang triển khai` for editable notices.
  - Approved/distributed notices show `Tạo bản sửa đổi` and require a revision reason.
- Improve attachments:
  - Detail page includes an attachment list plus a PDF preview panel.
  - DOCX attachments are rendered to browser HTML preview using Mammoth.
  - PDF and DOCX previews support placing numbered annotation markers by clicking directly on the preview area.
  - Annotation markers are stored with attachment id and relative x/y coordinates.
  - The note list shows matching marker numbers and coordinates so users can identify which note belongs to which position.
  - Legacy DOC attachments show an open/download path plus reference-text annotation guidance.
- Move form action buttons below the attachment block so the edit flow reads: form fields, attachments, then save/submit/detail actions.
- Add the QA Deputy / Phó phòng ĐBCL signature slot to the printed Change Notice template.
- Add workshop scoping:
  - Store `workshopType` on users and TBTĐ records.
  - Split browse entry points into `Tra cứu TBTĐ xưởng vô trùng` and `Tra cứu TBTĐ xưởng không vô trùng`.
  - Split research staff roles into `AUTHOR_STERILE` and `AUTHOR_NON_STERILE`.
  - Restrict research staff to creating, editing, submitting, and attaching documents only for their assigned dosage/workshop scope.
  - Replace generic NCPT lead approval with scoped roles: `NCPT_LEAD_STERILE` / tổ trưởng tổ nghiên cứu vô trùng and `NCPT_LEAD_NON_STERILE` / tổ trưởng tổ nghiên cứu không vô trùng.
  - Restrict team leads to signing/returning only the TBTĐ records in their assigned workshop scope.
  - Allow `NCPT_HEAD` to approve the NCPT step for either workshop in place of the team lead.
  - Add workflow tests for wrong-workshop lead rejection and NCPT head substitution.
- Add Admin account editing:
  - Admin can open an existing account into the account form.
  - Admin can update username, name, email, department, workshop scope, and role assignments.
- Fix `PENDING_NCPT_LEAD` action visibility:
  - Detail page shows sign/return controls for `NCPT_HEAD` when the notice is waiting for a scoped NCPT lead.
  - Backend test confirms `NCPT_HEAD` can sign sterile and non-sterile notices at the NCPT step.
- Add Admin notice deletion:
  - Browse and detail screens expose a delete action only for Admin.
  - Backend deletes dependent annotations, replies, attachments, workflow steps, distributions, and notice audit rows before deleting the notice.
  - Backend writes a final Admin deletion audit event without a deleted notice foreign key.
- Add workflow undo:
  - Detail page shows `Hoàn tác thao tác vừa làm` for the latest workflow actor or Admin.
  - Backend restores the previous workflow status for submitted, signed, returned, and final approved actions.
  - Final approval undo also removes generated distribution rows.
- Add per-notice storage folders:
  - Store attachments under `server/uploads/<TBTĐ code>/` instead of directly under upload root.
  - Generate `Thong_bao_thay_doi.html` in the same folder as the printable notice file.
  - Regenerate the print HTML after notice changes and attachment uploads.
  - Add tests proving attachment path and printable notice file are created inside the TBTĐ folder.
- Verification for this follow-up:
  - Run `npm run test`.
  - Run `npm run build`.
  - Confirm dev server still answers `/api/health` and frontend loads.

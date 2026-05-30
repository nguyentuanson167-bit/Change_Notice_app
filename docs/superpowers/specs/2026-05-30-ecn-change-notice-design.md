# eCN Change Notice MVP Design

## Context

Build a local full-stack MVP for the eCN Electronic Change Notification system described in the PRD at:

`e:\06. Claude\00.Claude Project\78. Quản lý TBTĐ bản mềm\PRD_He_thong_quan_ly_TBTD_ban_mem.md`

The app will live in `Project/Change-notice` and will prioritize a working local product over production infrastructure. The MVP must demonstrate the core TBTD lifecycle: create, attach files, submit, sign through the 5-step workflow, return for correction, comment/annotate, approve, distribute, revise, and audit.

The current paper form example adds an important requirement: the electronic TBTD must preserve the printable "Phieu thong bao thay doi / Change Notice" format and support printing the notice plus its attached documents.

## Goals

- Provide a runnable local web app in Vietnamese for the TBTD workflow.
- Model the "electronic envelope" concept: metadata plus Word/PDF attachments, without re-entering technical document content.
- Provide true multi-account behavior for many authors and many approvers working in the same system.
- Demonstrate role-based behavior for Author, NCPT Lead, QA Deputy, QA Head, Production Director, Admin, and Viewer.
- Preserve traceability by recording workflow actions and audit events.
- Capture enough structured fields to print a controlled Change Notice form similar to the current paper template.
- Support printing the Change Notice form and printing/downloading attached documents.
- Provide a complete and easy browsing experience for both in-progress and already executed Change Notices.
- Keep production-only items represented as explicit MVP simulations or documented upgrade points rather than pretending they are complete.

## Non-Goals For This MVP

- No legal-grade digital signature integration.
- No real SSO/AD/LDAP integration.
- No real email delivery.
- No chunked/resumable upload implementation.
- No true off-site immutable backup implementation.
- No automatic extraction of Word/PDF content.
- No ERP/MES integration.

## Recommended Approach

Use a local full-stack TypeScript app:

- Frontend: React, Vite, TypeScript.
- Backend: Node.js, Express, TypeScript.
- Database: Prisma with SQLite.
- File storage: local `server/uploads` directory.
- Styling: simple responsive CSS, domain-appropriate Vietnamese UI.

This approach gives a working app quickly while preserving upgrade paths to PostgreSQL, MinIO/S3, AD/SSO, background jobs, and real email later.

## High-Level Architecture

```
browser
  |
  | HTTP/JSON + multipart upload
  v
React/Vite frontend
  |
  v
Express API
  |
  +-- Prisma SQLite database
  +-- local upload storage
```

The frontend owns UI state and navigation. The backend owns all workflow transitions, authorization checks, audit writes, and persistence.

## Core Screens

- Login screen with demo users by role.
- Account management screen for Admin to create, edit, activate/deactivate users, assign departments, and assign roles.
- Dashboard with counts for TBTD by status, waiting for current user, open annotations, pending distribution acknowledgements.
- TBTD browser with tabs, search, filters, saved quick views, status badges, and one-click access to detail/print/attachments.
- Create/edit TBTD form with minimal metadata and attachment upload. The edit entry point must be visible from both the browse list and the detail page for draft, returned, and recalled notices.
- Detail page with metadata, attachments, workflow state, actions, annotations, distribution status, revision history, and audit trail.
- Print preview page for the bilingual Change Notice form.
- Attachment print/download panel for printing individual attachments or the full attachment set.
- My Queue page for items awaiting the current user's signature.
- Admin/demo data page for users, roles, departments, workflow template, and simulated backup jobs.

## Browsing And Retrieval

Browsing existing Change Notices is a first-class workflow. The MVP provides one main `Tra cuu TBTD / Browse Change Notices` screen that lets users reach both already executed notices and in-progress notices without knowing the exact code.

Browse views:

- `Tat ca`: all records the current user is allowed to see.
- `Dang thuc hien`: drafts, returned items, recalled items, and pending approval states.
- `Cho toi xu ly`: items awaiting the logged-in user's role.
- `Da phe duyet / Co hieu luc`: approved or distributed notices.
- `Da phan phoi`: notices distributed to the user's department.
- `Da thay the`: superseded notices and their replacement chain.
- `Co ghi chu mo`: notices with unresolved annotations.

Search and filters:

- Keyword search across TBTD code, title, product name, proposer, department, and manufacturing process code.
- Filters for status, product, change type, impact level, author, department, signer role, date range, and distributed unit.
- Sorting by newest, oldest, code, status, product, and last workflow activity.
- Clear filter and quick reset controls.

List row content:

- TBTD code and title.
- Product name and manufacturing process code.
- Current status with Vietnamese label and badge color.
- Author/proposer and department.
- Current pending signer role or final approval status.
- Last activity time and last action.
- Open annotation count.
- Distribution acknowledgement summary.

Quick actions:

- Open detail.
- Print Change Notice.
- Open attachments.
- Continue editing when the logged-in author owns a draft, returned, or recalled item.
- Sign/return when the logged-in user is eligible.
- Acknowledge receipt when the notice is distributed to the user's department.

The detail page is reachable from every row and includes metadata, attachments, workflow timeline, signatures, annotation threads, distribution table, revision chain, print actions, and audit trail. Access rules are still enforced by the backend; the browser view only lists records the logged-in user can access.

## Domain Model

Main entities:

- `User`: username, name, email, password hash for demo auth, department, active status.
- `Role` and `UserRole`: many-to-many role assignment so one user can hold multiple responsibilities.
- `ChangeNotification`: TBTD code, title, recipient/dear-to text, proposer name, proposer department, product name, manufacturing process code, issued date, notification issuance number, change type, impact level, change content/reason, effective note, status, author, revision number, original reference, created/updated timestamps.
- `Attachment`: file name, MIME type, category, size, checksum, local path, version.
- `WorkflowStep`: TBTD, sequence, required role, action, signer, signature meaning, return reason, timestamp.
- `Annotation`: general comment or file-position note, page/coordinate/reference text, severity, status, creator, resolver.
- `AnnotationReply`: threaded replies.
- `Distribution`: receiving department, sent/acknowledged status, acknowledgement user/time, superseded reference.
- `AuditLog`: append-only event log with actor, entity, action, before/after JSON, IP/user agent metadata where available.
- `Notification`: in-app notifications.
- `BackupJob`: simulated backup/restore records for MVP visibility.

## Change Notice Form Fields

The MVP form captures these fields so the printed notice matches the existing controlled paper format:

- Form title: `PHIEU THONG BAO THAY DOI / CHANGE NOTICE`.
- Optional form code or template code shown in the header.
- Date of notice.
- Recipient line: `Kinh gui/To`.
- Proposer name: `Nguoi de nghi thay doi/Proponent`.
- Proposer department: `Bo phan/Dept`.
- Product information section:
  - Product name.
  - Master manufacturing process code.
  - Issued date.
  - Notification issuance number.
- Change content section:
  - Structured summary/title.
  - Detailed change content text for the printable notice.
  - Existing MVP change type and impact level for filtering and reporting.
- Effectivity note: the standard statement that the notice takes effect from signing date and is inseparable from the related manufacturing process documents.
- Signature block:
  - Edited by / R&D.
  - Reviewed by / Head of R&D.
  - Appraised by / Head of QA.
  - Approved by / Production Director.
- Distribution table:
  - Number.
  - Version: Original or Copy.
  - Distributed unit.
  - Signature.
  - Notes.

The app stores English/Vietnamese labels in the print template, while user-entered content remains Vietnamese by default.

## Workflow Design

Statuses:

- `DRAFT`
- `PENDING_NCPT_LEAD`
- `PENDING_QA_DEPUTY`
- `PENDING_QA_HEAD`
- `PENDING_PROD_DIRECTOR`
- `APPROVED`
- `DISTRIBUTED`
- `RETURNED`
- `RECALLED`
- `CANCELLED`
- `SUPERSEDED`

Transitions:

- Author creates a draft and uploads attachments.
- Author submits the TBTD, which becomes `PENDING_NCPT_LEAD`.
- Each signer has exactly two workflow actions in the MVP: sign to advance, or return with a required reason.
- Signing advances to the next role. The final Production Director signature locks the TBTD as `APPROVED` and triggers distribution records.
- Returning requires a reason and sends the item back for author correction.
- Resubmission invalidates earlier workflow steps for the current cycle and restarts the workflow.
- An approved TBTD cannot be edited directly. A revision copies metadata and attachments into a new draft with a required revision reason.
- Once a revision is approved, the previous version becomes `SUPERSEDED`.

## Authorization

The MVP uses session-based authentication with multiple seeded users and admin-managed user accounts. Authorization rules are enforced server-side:

- Authors can create drafts, edit their own drafts and returned items, submit items, recall items before the next signer acts, and create revisions from approved items.
- Signers can act only when the TBTD is currently pending their required role.
- Admin can manage demo master data and view all audit logs.
- Viewer can read shared or distributed records but cannot sign or edit.

## Multi-Account Requirements

The MVP treats multi-account use as a core feature, not a mock-only detail:

- Multiple users can log in with separate accounts.
- Multiple users can share the same role, for example several NCPT authors or several QA reviewers.
- Each TBTD records its author, current assignee role, and the actual signer for each completed workflow step.
- "Cho toi xu ly / My Queue" is filtered by the logged-in user's roles and department.
- Admin can create and update user accounts, assign one or more roles, set department, and deactivate accounts.
- Deactivated users cannot log in or sign, but their historical signatures and audit records remain visible.
- Workflow actions always use the logged-in user identity; users cannot sign as another person unless a later delegation feature explicitly allows it.
- Seed data includes at least seven demo accounts: Author, NCPT Lead, QA Deputy, QA Head, Production Director, Admin, and Viewer.

Delegation for absent signers is a production upgrade point. The MVP stores enough account and role data to add delegation later without changing the core workflow model.

## Attachments

The MVP accepts PDF and Word files and stores them locally. The backend calculates a checksum and records file metadata. PDF preview is shown in the detail screen with a browser-native PDF viewer. Word files are downloadable/openable because browser preview is not reliable without a document conversion service.

Annotation is stored separately from the original file so the uploaded document remains unchanged. For PDF attachments, users can click directly on the preview area to place an annotation marker with relative x/y coordinates, then enter the comment or correction instruction. Existing markers are shown on the preview. For Word attachments, users add notes by page/section/reference text and open the file externally.

Chunked upload and resume are documented as production upgrade points. The MVP will use normal multipart upload with progress on the client.

## Localization

The UI must use Vietnamese with proper diacritics for visible labels, actions, empty states, seeded demo data, and error messages returned by the API. Internal enum values and API constants can remain ASCII/English, but user-facing text should be localized. Attachment file names should preserve Vietnamese diacritics in metadata while the stored disk path uses a safe normalized name.

## Editing And Revision Visibility

The app must make the correction path explicit:

- Draft, returned, and recalled notices show `Sửa` from the browse list and `Sửa phiếu đang triển khai` on the detail page.
- Approved or distributed notices do not allow direct editing. They show `Tạo bản sửa đổi`; the user must provide a revision reason, and the new revision opens in the edit form.
- Superseded notices remain readable through browse/detail and their revision chain.

## Printing

The MVP includes two print functions:

- `In phiếu TBTĐ`: opens a print preview page for the bilingual Change Notice form. The template includes header, product information, change content, electronic signature block, and distribution table. Browser print is the MVP output path.
- `In tài liệu đính kèm`: lets users open or download attachments for printing. PDF attachments open in browser preview with a print button. Word attachments are downloaded for printing in Word or a compatible viewer.

Approved notices display the electronic signer name, role, timestamp, and signature meaning in the signature block. Draft or pending notices print with a visible non-final status marker so they are not mistaken for a controlled approved copy.

The MVP does not merge all attachments into one generated PDF. That is a production upgrade point after the core workflow is working.

## Annotation And Comments

The MVP supports:

- General TBTD comments.
- File-linked annotations with page number, optional x/y coordinates, severity, status, and threaded replies.
- Open/resolved status so returned TBTDs can show unresolved items to the author.

The UI will simulate PDF-position annotation using a page/reference panel rather than a full PDF drawing engine in the first pass.

## Audit Trail

All important actions write `AuditLog` records:

- create/update TBTD
- upload attachment
- submit
- sign
- return
- recall
- create revision
- approve/distribute
- acknowledge distribution
- add/update annotation
- simulate backup/restore

The API will not expose destructive audit deletion. SQLite cannot enforce full WORM immutability, so the MVP describes this as an architectural constraint for production.

## Distribution

When the Production Director approves, the backend creates distribution rows for default receiving departments: Production Workshop, QA, and QC. Users with department access can acknowledge receipt. Distribution status appears on the detail page and dashboard.

## Backup MVP Simulation

The MVP includes a backup jobs screen and data model to reflect the PRD requirement. It can create simulated manual backup records and show status. Real encrypted off-site immutable backup is outside this MVP.

## Error Handling

- API returns structured JSON errors with stable messages.
- Workflow transitions validate current status and role before mutation.
- File upload rejects unsupported extensions and records checksum failures as errors.
- UI shows loading, empty, and error states for dashboard/list/detail pages.

## Testing And Verification

Minimum verification:

- Seed demo users, roles, departments, and sample TBTDs.
- API tests for workflow transitions: submit, sign through all roles, return, revision, distribution acknowledgement.
- API tests confirming one user cannot act outside their role and inactive users cannot log in.
- TypeScript build for frontend and backend.
- Manual local run instructions in README.

## Directory Plan

```
Project/Change-notice/
  README.md
  package.json
  client/
  server/
  prisma/
  docs/superpowers/specs/
```

## Implementation Notes

Start with a monorepo-style single npm workspace for simple local operation. Use conservative dependencies and keep code organized by domain:

- `server/src/modules/auth`
- `server/src/modules/change-notifications`
- `server/src/modules/workflow`
- `server/src/modules/attachments`
- `server/src/modules/annotations`
- `server/src/modules/distribution`
- `server/src/modules/audit`
- `server/src/modules/printing`

The first screen after login should be the operational dashboard, not a marketing landing page.

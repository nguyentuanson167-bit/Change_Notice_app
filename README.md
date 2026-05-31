# eCN Change Notice MVP

Local MVP for managing Thông báo thay đổi (TBTĐ).

## Run locally

```powershell
npm install
npm run db:generate
npm run db:setup
npm run db:seed
npm run dev
```

Open `http://127.0.0.1:5173`.

## Demo accounts

All demo accounts use password `password123`.

| Username | Role |
| --- | --- |
| author | Nhân viên nghiên cứu không vô trùng |
| author2 | Nhân viên nghiên cứu vô trùng |
| lead | Tổ trưởng tổ nghiên cứu không vô trùng |
| lead-sterile | Tổ trưởng tổ nghiên cứu vô trùng |
| ncpt-head | Trưởng phòng NCPT, duyệt được cả hai xưởng |
| qa-deputy | QA Deputy |
| qa-head | QA Head |
| director | Production Director |
| admin | Admin |
| viewer | Viewer |

## Admin functions

- Create and edit accounts, departments, workshop scope, roles, and active status.
- Delete TBTĐ records from the browse list or detail page.

## MVP limitations

- Upload is multipart with progress, not chunked/resumable.
- Electronic signature is password re-confirmation in the application, not a legal digital certificate.
- Email, SSO/AD, immutable off-site backup, and merged attachment PDF export are production upgrade points.
- PDF annotation stores page/reference/coordinates but does not draw directly into the original file.

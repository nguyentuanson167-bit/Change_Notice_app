# eCN Change Notice MVP

Local MVP for managing Thong bao thay doi (TBTD).

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
| author | Author / NCPT |
| author2 | Author / NCPT |
| lead | NCPT Lead |
| qa-deputy | QA Deputy |
| qa-head | QA Head |
| director | Production Director |
| admin | Admin |
| viewer | Viewer |

## MVP limitations

- Upload is multipart with progress, not chunked/resumable.
- Electronic signature is password re-confirmation in the application, not a legal digital certificate.
- Email, SSO/AD, immutable off-site backup, and merged attachment PDF export are production upgrade points.
- PDF annotation stores page/reference/coordinates but does not draw directly into the original file.

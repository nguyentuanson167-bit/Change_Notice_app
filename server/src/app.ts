import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import session from "express-session";
import { authRouter } from "./modules/auth.js";
import { changeNoticeRouter } from "./modules/changeNotices.js";
import { adminUsersRouter } from "./modules/adminUsers.js";
import { annotationRouter } from "./modules/annotations.js";
import { attachmentRouter } from "./modules/attachments.js";
import { distributionRouter } from "./modules/distribution.js";
import { printingRouter } from "./modules/printing.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

app.use(cors({ origin: "http://127.0.0.1:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(
  session({
    secret: "ecn-change-notice-local-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { sameSite: "lax", secure: false }
  })
);

app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/notices", changeNoticeRouter);
app.use("/api", attachmentRouter);
app.use("/api", annotationRouter);
app.use("/api", distributionRouter);
app.use("/api", printingRouter);
app.use("/api", adminUsersRouter);

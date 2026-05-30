import bcrypt from "bcryptjs";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export type AuthedUser = Awaited<ReturnType<typeof getUserById>>;

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export const authRouter = Router();

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } }
  });
}

export function serializeUser(user: NonNullable<AuthedUser>) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    department: user.department,
    active: user.active,
    roles: user.roles.map((item) => item.role.code)
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({ message: "Ban can dang nhap." });
    return;
  }

  const user = await getUserById(req.session.userId);
  if (!user || !user.active) {
    req.session.destroy(() => undefined);
    res.status(401).json({ message: "Tai khoan khong kha dung." });
    return;
  }

  res.locals.user = user;
  res.locals.currentUser = serializeUser(user);
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user as NonNullable<AuthedUser> | undefined;
    const userRoles = user?.roles.map((item) => item.role.code) ?? [];
    if (!roles.some((role) => userRoles.includes(role))) {
      res.status(403).json({ message: "Ban khong co quyen thuc hien thao tac nay." });
      return;
    }
    next();
  };
}

export function currentUser(res: Response) {
  return res.locals.currentUser as ReturnType<typeof serializeUser>;
}

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Thong tin dang nhap khong hop le." });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
    include: { roles: { include: { role: true } } }
  });

  if (!user || !user.active) {
    res.status(401).json({ message: "Sai tai khoan hoac mat khau." });
    return;
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ message: "Sai tai khoan hoac mat khau." });
    return;
  }

  req.session.userId = user.id;
  res.json({ user: serializeUser(user) });
});

authRouter.post("/logout", requireAuth, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

authRouter.get("/me", requireAuth, (_req, res) => {
  res.json({ user: res.locals.currentUser });
});

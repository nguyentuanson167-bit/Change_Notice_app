import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { DEMO_PASSWORD } from "../seedPasswords.js";
import { currentUser, requireAuth, requireRole } from "./auth.js";
import { writeAudit } from "./audit.js";

export const adminUsersRouter = Router();

const userSchema = z.object({
  username: z.string().min(2),
  name: z.string().min(1),
  email: z.string().email(),
  department: z.string().min(1),
  roles: z.array(z.string()).default([])
});

adminUsersRouter.use(requireAuth, requireRole("ADMIN"));

function includeUser() {
  return { roles: { include: { role: true } } };
}

adminUsersRouter.get("/admin/users", async (_req, res) => {
  const users = await prisma.user.findMany({ include: includeUser(), orderBy: { username: "asc" } });
  const roles = await prisma.role.findMany({ orderBy: { code: "asc" } });
  res.json({ users, roles });
});

adminUsersRouter.post("/admin/users", async (req, res) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu tài khoản không hợp lệ.", issues: parsed.error.issues });
    return;
  }
  const actor = currentUser(res);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.create({
    data: {
      username: parsed.data.username,
      name: parsed.data.name,
      email: parsed.data.email,
      department: parsed.data.department,
      passwordHash
    }
  });
  await setRoles(user.id, parsed.data.roles);
  const created = await prisma.user.findUnique({ where: { id: user.id }, include: includeUser() });
  await writeAudit({ actorId: actor.id, entity: "User", action: "CREATE", after: created, ip: req.ip });
  res.status(201).json({ user: created });
});

adminUsersRouter.put("/admin/users/:id", async (req, res) => {
  const parsed = userSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Dữ liệu tài khoản không hợp lệ.", issues: parsed.error.issues });
    return;
  }
  const actor = currentUser(res);
  const before = await prisma.user.findUnique({ where: { id: req.params.id }, include: includeUser() });
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      username: parsed.data.username,
      name: parsed.data.name,
      email: parsed.data.email,
      department: parsed.data.department
    }
  });
  if (parsed.data.roles) await setRoles(user.id, parsed.data.roles);
  const updated = await prisma.user.findUnique({ where: { id: user.id }, include: includeUser() });
  await writeAudit({ actorId: actor.id, entity: "User", action: "UPDATE", before, after: updated, ip: req.ip });
  res.json({ user: updated });
});

adminUsersRouter.post("/admin/users/:id/roles", async (req, res) => {
  const roles = Array.isArray(req.body?.roles) ? req.body.roles.map(String) : [];
  await setRoles(req.params.id, roles);
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, include: includeUser() });
  res.json({ user });
});

adminUsersRouter.post("/admin/users/:id/activate", async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { active: true }, include: includeUser() });
  await writeAudit({ actorId: currentUser(res).id, entity: "User", action: "ACTIVATE", after: user, ip: req.ip });
  res.json({ user });
});

adminUsersRouter.post("/admin/users/:id/deactivate", async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { active: false }, include: includeUser() });
  await writeAudit({ actorId: currentUser(res).id, entity: "User", action: "DEACTIVATE", after: user, ip: req.ip });
  res.json({ user });
});

async function setRoles(userId: string, roleCodes: string[]) {
  await prisma.userRole.deleteMany({ where: { userId } });
  for (const code of roleCodes) {
    const role = await prisma.role.findUnique({ where: { code } });
    if (role) {
      await prisma.userRole.create({ data: { userId, roleId: role.id } });
    }
  }
}

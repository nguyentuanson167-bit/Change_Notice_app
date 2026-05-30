import { prisma } from "../db.js";

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

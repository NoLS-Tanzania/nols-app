import { prisma } from "@nolsaf/prisma";
import { Request } from "express";

export async function audit(req: Request, action: string, resource?: string, beforeJson?: any, afterJson?: any) {
  const actorId = (req as any).user?.id as number | undefined;
  const actorRole = (req as any).user?.role as string | undefined;
  const ip = req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
  const userAgent = req.headers["user-agent"] || "";
  try {
    await prisma.auditLog.create({
      data: { actorId, actorRole, action, resource, ip, userAgent, beforeJson, afterJson },
    });
  } catch {
    // swallow
  }
}

export async function auditLog(params: {
  actorId: number;
  actorRole: string;
  action: string;
  entity: "PROPERTY";
  entityId: number;
  before?: any;
  after?: any;
  ip?: string;
  ua?: string;
}) {
  try {
    // write to the general AuditLog model for structured change history
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: params.action,
        resource: params.entity,
        beforeJson: params.before ?? null,
        afterJson: params.after ?? null,
        ip: params.ip ?? null,
        userAgent: params.ua ?? null,
      } as any,
    });
  } catch (e) {
    console.log("[audit fail]", e);
  }
}
// swallow errors
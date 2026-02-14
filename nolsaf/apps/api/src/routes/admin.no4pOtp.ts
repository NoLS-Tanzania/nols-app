// apps/api/src/routes/admin.no4pOtp.ts
import { Router } from "express";
import type { RequestHandler, Response } from "express";
import { z } from "zod";
import { prisma } from "@nolsaf/prisma";
import { asyncHandler } from "../middleware/errorHandler.js";
import rateLimit from "express-rate-limit";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

const limitAdminNo4pOtpList = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
  keyGenerator: (req) => {
    const adminId = (req as any)?.user?.id;
    if (adminId) return `admin:no4p-otp:${String(adminId)}`;
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});

const listQuerySchema = z.object({
  q: z.string().min(1).max(200).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .default("1")
    .transform((v) => Number(v) || 1),
  pageSize: z
    .string()
    .regex(/^\d+$/)
    .optional()
    .default(String(DEFAULT_PAGE_SIZE))
    .transform((v) => Math.min(Number(v) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)),
  status: z.enum(["valid", "expired", "used", "all"]).optional().default("all"),
}).strict();

function sendError(res: Response, status: number, message: string, details?: any): void {
  res.status(status).json({
    error: message,
    ...(details && { details }),
  });
}

function normalizeStatus(now: Date, expiresAt: string | null | undefined, usedAt: Date | null): "valid" | "expired" | "used" | "unknown" {
  if (usedAt) return "used";
  if (!expiresAt) return "unknown";
  const exp = new Date(expiresAt);
  if (Number.isNaN(exp.getTime())) return "unknown";
  return now > exp ? "expired" : "valid";
}

function sanitizeProvider(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    return s.length > 120 ? s.slice(0, 120) : s;
  }

  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    const candidate =
      (typeof v.provider === "string" ? v.provider : null) ||
      (typeof v.name === "string" ? v.name : null) ||
      (typeof v.type === "string" ? v.type : null) ||
      (typeof v.channel === "string" ? v.channel : null) ||
      null;

    if (!candidate) return null;
    const s = candidate.trim();
    if (!s) return null;
    return s.length > 120 ? s.slice(0, 120) : s;
  }

  return null;
}

export const router = Router();

// AuthN/AuthZ are mounted in index.ts with requireRole('ADMIN')
router.get(
  "/",
  limitAdminNo4pOtpList as unknown as RequestHandler,
  asyncHandler(async (req: any, res) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return sendError(res, 400, "Invalid request parameters", { errors: parsed.error.issues });
    }

    const { q, date, page, pageSize, status } = parsed.data;

    // We encode OTP correlation in AuditLog.entity as:
    // `OTP:${destinationType}:${destination}:${codeHash}`
    // NOTE: AuditLog.entity is non-nullable, so do not filter by `not: null`.
    const baseWhere: any = {
      action: "NO4P_OTP_SENT",
      entity: { startsWith: "OTP:" },
    };

    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        baseWhere.createdAt = { gte: start, lt: end };
      }
    }

    const where: any = q
      ? {
          AND: [
            baseWhere,
            {
              entity: { contains: q },
            },
          ],
        }
      : baseWhere;

    const [total, sent] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const entities = sent.map((s: any) => s.entity).filter(Boolean);
    const usedLogs = entities.length
      ? await prisma.auditLog.findMany({
          where: {
            action: "NO4P_OTP_USED",
            entity: { in: entities },
          },
          orderBy: { createdAt: "asc" },
        })
      : [];

    const usedByEntity = new Map<string, any>();
    for (const u of usedLogs as any[]) {
      if (!u?.entity) continue;
      if (!usedByEntity.has(u.entity)) usedByEntity.set(u.entity, u);
    }

    const now = new Date();

    let items = (sent as any[]).map((row) => {
      const after = (row.afterJson ?? {}) as any;
      const used = row.entity ? usedByEntity.get(row.entity) : null;
      const expiresAt: string | null = after.expiresAt ?? null;
      const usedAt: Date | null = used?.createdAt ?? null;
      const computedStatus = normalizeStatus(now, expiresAt, usedAt);

      return {
        id: row.id,
        role: after.userRole ?? row.actorRole ?? null,
        name: after.userName ?? null,
        codeMasked: after.codeMasked ?? null,
        destinationType: after.destinationType ?? null,
        destination: after.destination ?? null,
        requestedAt: row.createdAt,
        expiresAt,
        status: computedStatus,
        usedAt,
        usedFor: after.usedFor ?? null,
        provider: sanitizeProvider(after.provider),
        policyCompliant: after.policyCompliant ?? null,
      };
    });

    if (status !== "all") {
      items = items.filter((i) => i.status === status);
    }

    res.json({
      ok: true,
      data: items,
      meta: {
        page,
        pageSize,
        total,
      },
    });
  })
);

export default router;

import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";

export const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

let roleTtlColumnsAvailable: boolean | null = null;
async function hasRoleTtlColumns(): Promise<boolean> {
  if (roleTtlColumnsAvailable !== null) return roleTtlColumnsAvailable;
  try {
    await prisma.systemSetting.findUnique({
      where: { id: 1 },
      select: { sessionMaxMinutesAdmin: true } as any,
    });
    roleTtlColumnsAvailable = true;
    return true;
  } catch (err: any) {
    if (err?.code === "P2022" || String(err?.message || "").includes("ColumnNotFound")) {
      roleTtlColumnsAvailable = false;
      return false;
    }
    throw err;
  }
}

/** GET current settings */
router.get("/", async (_req, res) => {
  const roleCols = await hasRoleTtlColumns();
  const s =
    (await prisma.systemSetting.findUnique({
      where: { id: 1 },
      select: {
        commissionPercent: true,
        taxPercent: true,
        currency: true,
        invoicePrefix: true,
        receiptPrefix: true,
        emailEnabled: true,
        smsEnabled: true,
        requireAdmin2FA: true,
        minPasswordLength: true,
        requirePasswordUppercase: true,
        requirePasswordLowercase: true,
        requirePasswordNumber: true,
        requirePasswordSpecial: true,
        sessionIdleMinutes: true,
        maxSessionDurationHours: true,
        forceLogoutOnPasswordChange: true,
        ipAllowlist: true,
        enableIpAllowlist: true,
        apiRateLimitPerMinute: true,
        maxLoginAttempts: true,
        accountLockoutDurationMinutes: true,
        enableSecurityAuditLogging: true,
        logFailedLoginAttempts: true,
        alertOnSuspiciousActivity: true,
        supportEmail: true,
        supportPhone: true,
        ...(roleCols
          ? {
              sessionMaxMinutesAdmin: true,
              sessionMaxMinutesOwner: true,
              sessionMaxMinutesDriver: true,
              sessionMaxMinutesCustomer: true,
            }
          : {}),
      } as any,
    })) ??
    (await prisma.systemSetting.create({ data: { id: 1 } }));

  // If DB is missing role TTL columns, ensure the response still includes them (as null) for UI consistency.
  const out: any = { ...s };
  if (!roleCols) {
    out.sessionMaxMinutesAdmin = null;
    out.sessionMaxMinutesOwner = null;
    out.sessionMaxMinutesDriver = null;
    out.sessionMaxMinutesCustomer = null;
  }
  res.json(mask(out));
});

/** Recent session policy changes (AuditLog) */
router.get("/audit/session-policy", async (_req, res) => {
  const rows = await prisma.auditLog.findMany({
    where: {
      action: "ADMIN_SESSION_POLICY_UPDATE",
      entity: "settings:system",
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      actor: { select: { id: true, email: true, name: true, role: true } },
    },
  });

  res.json(
    rows.map((r) => ({
      id: String(r.id),
      actorId: r.actorId ?? null,
      actorRole: r.actorRole ?? null,
      actor: r.actor ? { id: r.actor.id, email: r.actor.email, name: (r.actor as any).name, role: (r.actor as any).role } : null,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId ?? null,
      ip: r.ip ?? null,
      ua: r.ua ?? null,
      createdAt: r.createdAt,
      changes: (r.afterJson as any)?.changes ?? null,
    }))
  );
});

/** PUT update settings */
router.put("/", async (req, res) => {
  const roleCols = await hasRoleTtlColumns();
  const before = await prisma.systemSetting.findUnique({
    where: { id: 1 },
    select: {
      sessionIdleMinutes: true,
      maxSessionDurationHours: true,
      ...(roleCols
        ? {
            sessionMaxMinutesAdmin: true,
            sessionMaxMinutesOwner: true,
            sessionMaxMinutesDriver: true,
            sessionMaxMinutesCustomer: true,
          }
        : {}),
    } as any,
  });

  // Server-side validation/sanitization for security/session fields.
  const body = (req.body ?? {}) as Record<string, unknown>;
  const MIN_SESSION_MINUTES = 5; // prevent accidental 1-minute TTL
  const MAX_SESSION_MINUTES_HARD = 60 * 24 * 7; // 7 days hard ceiling

  const toIntOrNull = (v: unknown): number | null | undefined => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v === 'string' && v.trim() === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return NaN as any;
    return Math.trunc(n);
  };

  // Determine the max cap in minutes (maxSessionDurationHours * 60).
  const nextMaxHours = toIntOrNull(body.maxSessionDurationHours);
  if (nextMaxHours !== undefined && nextMaxHours !== null && (!Number.isFinite(nextMaxHours) || nextMaxHours < 1 || nextMaxHours > 24 * 30)) {
    return res.status(400).json({
      error: 'INVALID_MAX_SESSION_DURATION_HOURS',
      message: 'maxSessionDurationHours must be an integer between 1 and 720 (30 days).',
    });
  }
  const effectiveMaxHours = (nextMaxHours ?? before?.maxSessionDurationHours ?? 24) as number;
  const capMinutes = Math.min(Math.max(1, effectiveMaxHours * 60), MAX_SESSION_MINUTES_HARD);

  const sessionKeys = ([
    'sessionIdleMinutes',
    ...(roleCols
      ? ([
          'sessionMaxMinutesAdmin',
          'sessionMaxMinutesOwner',
          'sessionMaxMinutesDriver',
          'sessionMaxMinutesCustomer',
        ] as const)
      : ([] as const)),
  ] as const);

  const sanitizedUpdate: Record<string, unknown> = { ...body };
  const errors: Array<{ field: string; message: string }> = [];

  for (const k of sessionKeys) {
    const raw = body[k];
    const parsed = toIntOrNull(raw);
    if (parsed === undefined) continue; // not provided

    if (parsed !== null) {
      if (!Number.isFinite(parsed)) {
        errors.push({ field: k, message: 'Must be an integer number of minutes (or blank to use default).' });
        continue;
      }
      if (parsed < MIN_SESSION_MINUTES) {
        errors.push({ field: k, message: `Must be at least ${MIN_SESSION_MINUTES} minutes.` });
        continue;
      }
      if (parsed > capMinutes) {
        errors.push({ field: k, message: `Must be <= ${capMinutes} minutes (maxSessionDurationHours cap).` });
        continue;
      }
    }

    sanitizedUpdate[k] = parsed;
  }

  // If admin updates maxSessionDurationHours, ensure it doesn't invalidate existing/per-role TTLs.
  if (nextMaxHours !== undefined) {
    const nextCapMinutes = Math.min(Math.max(1, effectiveMaxHours * 60), MAX_SESSION_MINUTES_HARD);
    const wouldExceed = (field: string, value: unknown) => {
      const parsed = toIntOrNull(value);
      return parsed !== undefined && parsed !== null && Number.isFinite(parsed) && parsed > nextCapMinutes;
    };

    for (const k of sessionKeys) {
      if (wouldExceed(k, sanitizedUpdate[k])) {
        errors.push({ field: k, message: `Must be <= ${nextCapMinutes} minutes after maxSessionDurationHours change.` });
      }
    }
  }

  if (errors.length) {
    return res.status(400).json({
      error: 'INVALID_SESSION_TTL',
      message: 'One or more session TTL values are invalid.',
      details: errors,
    });
  }

  // If the DB isn't migrated yet, drop per-role TTL keys so the update doesn't fail.
  if (!roleCols) {
    delete (sanitizedUpdate as any).sessionMaxMinutesAdmin;
    delete (sanitizedUpdate as any).sessionMaxMinutesOwner;
    delete (sanitizedUpdate as any).sessionMaxMinutesDriver;
    delete (sanitizedUpdate as any).sessionMaxMinutesCustomer;
  }

  const s = await prisma.systemSetting.upsert({
    where: { id: 1 },
    update: sanitizedUpdate,
    create: { id: 1, ...sanitizedUpdate },
  });

  // Audit with an explicit diff so the admin can see exactly what changed.
  const auditFields = [...sessionKeys, 'maxSessionDurationHours'] as const;
  const changes: Record<string, { from: any; to: any }> = {};
  for (const f of auditFields) {
    const from = (before as any)?.[f];
    const to = (s as any)?.[f];
    if (from !== to) changes[f] = { from, to };
  }
  const action = Object.keys(changes).length ? 'ADMIN_SESSION_POLICY_UPDATE' : 'ADMIN_SETTINGS_UPDATE';
  await audit(req as any, action, "settings:system", { settings: before, changes: null }, { settings: s, changes });

  res.json(mask(s));
});

/** Numbering preview */
router.post("/numbering/preview", async (req, res) => {
  const { type } = req.body ?? {}; // "invoice"|"receipt"
  const s = await prisma.systemSetting.findUnique({ where: { id: 1 } }) ?? { invoicePrefix: "INV-", invoiceSeq: 1, receiptPrefix: "RCT-", receiptSeq: 1 } as any;
  const y = new Date().getFullYear();
  const m = String(new Date().getMonth() + 1).padStart(2, "0");
  const seq = type === "receipt" ? s.receiptSeq : s.invoiceSeq;
  const prefix = type === "receipt" ? s.receiptPrefix : s.invoicePrefix;
  const sample = `${prefix}${y}${m}-${String(seq).padStart(6, "0")}`;
  res.json({ sample });
});

/** Users & roles (list, change role, enable/disable) */
router.get("/users", async (req, res) => {
  try {
    const q = (req.query.q as string | undefined)?.trim();
    const where: any = q ? { 
      OR: [
        { email: { contains: q, mode: 'insensitive' } }, 
        { name: { contains: q, mode: 'insensitive' } }
      ] 
    } : {};
    const users = await prisma.user.findMany({ 
      where, 
      orderBy: { id: "desc" }, 
      take: 100,
      select: { id: true, email: true, name: true, role: true, twoFactorEnabled: true }
    });
    res.json(users.map((u: any) => ({ 
      id: u.id, 
      email: u.email, 
      fullName: u.name || u.email, // Map name to fullName for frontend compatibility
      role: u.role, 
      twoFactorEnabled: u.twoFactorEnabled 
    })));
  } catch (err: any) {
    console.error('Error in GET /admin/settings/users:', err);
    res.status(500).json({ error: 'Internal server error', message: err?.message || 'Unknown error' });
  }
});

router.post("/users/:id/role", async (req, res) => {
  const id = Number(req.params.id);
  const role = req.body?.role as "OWNER" | "ADMIN";
  const before = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  const u = await prisma.user.update({ where: { id }, data: { role } });
  await audit(req as any, "ADMIN_USER_ROLE_CHANGE", `user:${id}`, before, { role });
  res.json({ ok: true });
});

/** Security toggles (subset handled by main PUT) */

/** Mask secrets/toggles before returning to UI */
function mask(s: any) {
  return s; // no raw credentials stored here yet; when you add provider secrets, remove them here
}

export default router;

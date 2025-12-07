import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";

export const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

/** GET current settings */
router.get("/", async (_req, res) => {
  const s = await prisma.systemSetting.findUnique({ where: { id: 1 } }) ??
            await prisma.systemSetting.create({ data: { id: 1 } });
  res.json(mask(s));
});

/** PUT update settings */
router.put("/", async (req, res) => {
  const before = await prisma.systemSetting.findUnique({ where: { id: 1 } });
  const s = await prisma.systemSetting.upsert({
    where: { id: 1 },
    update: req.body ?? {},
    create: { id: 1, ...(req.body ?? {}) },
  });
  await audit(req as any, "ADMIN_SETTINGS_UPDATE", "settings:system", before, s);
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

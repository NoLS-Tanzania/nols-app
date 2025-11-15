import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/** POST /grant
 * body: { ownerId, from?: string (ISO), to?: string (ISO), bonusPercent?: number (0-100), reason?: string }
 * returns: { ownerId, totalRevenue, commissionPercent, commissionAmount, bonusPercent, bonusAmount }
 */
router.post('/grant', async (req, res) => {
  const { ownerId, from, to, bonusPercent, reason } = req.body ?? {};
  if (!ownerId) return res.status(400).json({ error: 'ownerId required' });
  const owner = await prisma.user.findUnique({ where: { id: Number(ownerId) } });
  if (!owner || owner.role !== 'OWNER') return res.status(404).json({ error: 'owner not found' });

  // date range: default last 30 days
  const toDt = to ? new Date(to) : new Date();
  const fromDt = from ? new Date(from) : new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);

  // sum invoices for owner in range where status is PAID or similar
  const rows: any = await prisma.$queryRaw`
    SELECT SUM(total) as totalRevenue
    FROM Invoice
    WHERE ownerId = ${Number(ownerId)} AND issuedAt BETWEEN ${fromDt.toISOString()} AND ${toDt.toISOString()} AND status = 'PAID'
  `;
  const totalRevenue = Number(rows?.[0]?.totalRevenue || 0);

  // read commissionPercent from SystemSetting
  const s = await prisma.systemSetting.findUnique({ where: { id: 1 } });
  const commissionPercent = Number(s?.commissionPercent ?? 0);
  const commissionAmount = (totalRevenue * commissionPercent) / 100;

  const bp = Number(bonusPercent ?? 0);
  const bonusAmount = (commissionAmount * bp) / 100;

  // record audit log for grant attempt (not a financial transaction) — use AdminAudit table
  const details = { ownerId: Number(ownerId), from: fromDt.toISOString(), to: toDt.toISOString(), totalRevenue, commissionPercent, commissionAmount, bonusPercent: bp, bonusAmount, reason };
  await prisma.adminAudit.create({ data: { adminId: (req as any).user.id, targetUserId: Number(ownerId), action: 'GRANT_BONUS', details: JSON.stringify(details) } });

  res.json({ ownerId: Number(ownerId), totalRevenue, commissionPercent, commissionAmount, bonusPercent: bp, bonusAmount });
});

export default router;

import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { 
  BonusReasonType, 
  generateBonusReasonText, 
  getSuggestedBonusAmount, 
  isValidBonusReasonType,
  BONUS_REASON_TYPES 
} from "../lib/bonus-reasons.js";

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

  // Generate bonus payment reference
  const bonusPaymentRef = `BONUS-${ownerId}-${Date.now()}`;

  // record audit log for grant attempt (not a financial transaction) — use AdminAudit table
  const details = { ownerId: Number(ownerId), from: fromDt.toISOString(), to: toDt.toISOString(), totalRevenue, commissionPercent, commissionAmount, bonusPercent: bp, bonusAmount, reason, bonusPaymentRef };
  await prisma.adminAudit.create({ data: { adminId: (req as any).user.id, targetUserId: Number(ownerId), action: 'GRANT_BONUS', details: JSON.stringify(details) } });

  // If this is a driver bonus, mark their referral earnings as paid as bonus
  if (owner.role === 'DRIVER' && (prisma as any).referralEarning) {
    try {
      // Get pending or available referral earnings for this driver
      const earnings = await (prisma as any).referralEarning.findMany({
        where: {
          driverId: Number(ownerId),
          status: { in: ['PENDING', 'AVAILABLE_FOR_WITHDRAWAL'] },
        },
        select: { id: true },
      });

      if (earnings.length > 0) {
        const earningIds = earnings.map((e: any) => e.id);
        
        // Mark earnings as paid as bonus
        await (prisma as any).referralEarning.updateMany({
          where: {
            id: { in: earningIds },
          },
          data: {
            status: 'PAID_AS_BONUS',
            bonusPaymentRef,
            paidAsBonusAt: new Date(),
            adminNotes: `Included in bonus payment: ${bonusPaymentRef}`,
          },
        });

        // Notify admins via Socket.IO
        try {
          const io = (req as any).app?.get?.('io');
          if (io) {
            io.emit('admin:referral-earnings-paid-as-bonus', {
              earningIds,
              bonusPaymentRef,
              driverId: Number(ownerId),
              bonusAmount,
              count: earnings.length,
              processedBy: (req as any).user.id,
            });
          }
        } catch (e) {
          console.warn('Failed to emit bonus payment notification', e);
        }
      }
    } catch (e) {
      console.warn('Failed to mark referral earnings as bonus', e);
      // Don't fail the bonus grant if referral marking fails
    }
  }

  res.json({ ownerId: Number(ownerId), totalRevenue, commissionPercent, commissionAmount, bonusPercent: bp, bonusAmount, bonusPaymentRef });
});

/** POST /grant-driver
 * Grant bonus to a driver with standardized reason types
 * body: { 
 *   driverId: number, 
 *   amount: number, 
 *   bonusReasonType: 'PERFORMANCE_EXCELLENCE' | 'VOLUME_ACHIEVEMENT' | 'LOYALTY_RETENTION' | 'CUSTOM',
 *   reason?: string (optional custom text),
 *   period?: string (e.g., "Jan 2025"),
 *   metrics?: { rating?, completionRate?, tripsCount?, activeDays?, monthsOfService?, cancellations? }
 * }
 * returns: { driverId, bonusAmount, bonusReasonType, reason, bonusPaymentRef }
 */
router.post('/grant-driver', async (req, res) => {
  try {
    const { driverId, amount, bonusReasonType, reason, period, metrics } = req.body ?? {};
    
    if (!driverId) return res.status(400).json({ error: 'driverId required' });
    if (!amount || amount <= 0) return res.status(400).json({ error: 'amount must be greater than 0' });
    
    // Validate reason type
    const reasonType: BonusReasonType = isValidBonusReasonType(bonusReasonType) 
      ? bonusReasonType 
      : 'CUSTOM';
    
    // Verify driver exists
    const driver = await prisma.user.findUnique({ 
      where: { id: Number(driverId) },
      select: { id: true, name: true, email: true, role: true }
    });
    
    if (!driver) return res.status(404).json({ error: 'driver not found' });
    if (driver.role !== 'DRIVER') return res.status(400).json({ error: 'user is not a driver' });
    
    const bonusAmount = Number(amount);
    const bonusPaymentRef = `BONUS-DRIVER-${driverId}-${Date.now()}`;
    
    // Generate reason text if not provided
    const reasonText = reason || generateBonusReasonText(reasonType, metrics);
    
    // Determine period if not provided
    const bonusPeriod = period || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    // Record in AdminAudit
    const details = {
      driverId: Number(driverId),
      bonusAmount,
      bonusReasonType: reasonType,
      reason: reasonText,
      period: bonusPeriod,
      metrics: metrics || {},
      bonusPaymentRef,
      grantedAt: new Date().toISOString(),
    };
    
    await prisma.adminAudit.create({
      data: {
        adminId: (req as any).user.id,
        targetUserId: Number(driverId),
        action: 'GRANT_BONUS',
        details: JSON.stringify(details),
      },
    });
    
    // If driver has referral earnings, mark them as paid as bonus
    if ((prisma as any).referralEarning) {
      try {
        const earnings = await (prisma as any).referralEarning.findMany({
          where: {
            driverId: Number(driverId),
            status: { in: ['PENDING', 'AVAILABLE_FOR_WITHDRAWAL'] },
          },
          select: { id: true },
        });
        
        if (earnings.length > 0) {
          const earningIds = earnings.map((e: any) => e.id);
          
          await (prisma as any).referralEarning.updateMany({
            where: { id: { in: earningIds } },
            data: {
              status: 'PAID_AS_BONUS',
              bonusPaymentRef,
              paidAsBonusAt: new Date(),
              adminNotes: `Included in bonus payment: ${bonusPaymentRef}`,
            },
          });
          
          // Notify via Socket.IO
          try {
            const io = (req as any).app?.get?.('io');
            if (io) {
              io.emit('admin:referral-earnings-paid-as-bonus', {
                earningIds,
                bonusPaymentRef,
                driverId: Number(driverId),
                bonusAmount,
                count: earnings.length,
                processedBy: (req as any).user.id,
              });
            }
          } catch (e) {
            console.warn('Failed to emit bonus payment notification', e);
          }
        }
      } catch (e) {
        console.warn('Failed to mark referral earnings as bonus', e);
      }
    }
    
    // Notify driver via Socket.IO
    try {
      const io = (req as any).app?.get?.('io') || (global as any).io;
      if (io) {
        io.to(`driver:${driverId}`).emit('bonus-granted', {
          bonusAmount,
          bonusReasonType: reasonType,
          reason: reasonText,
          period: bonusPeriod,
          bonusPaymentRef,
          grantedAt: new Date().toISOString(),
          grantedBy: {
            id: (req as any).user.id,
            name: (req as any).user.name,
          },
        });
      }
    } catch (e) {
      console.warn('Failed to emit bonus notification to driver', e);
    }

    return res.json({
      driverId: Number(driverId),
      bonusAmount,
      bonusReasonType: reasonType,
      reason: reasonText,
      period: bonusPeriod,
      bonusPaymentRef,
    });
  } catch (err: any) {
    console.error('Error granting driver bonus:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

/** GET /reason-types
 * Get available bonus reason types and their configurations
 */
router.get('/reason-types', async (req, res) => {
  try {
    const reasonTypes = Object.values(BONUS_REASON_TYPES).map(config => ({
      type: config.type,
      label: config.label,
      description: config.description,
      defaultAmount: config.defaultAmount,
      icon: config.icon,
    }));
    
    return res.json({ reasonTypes });
  } catch (err: any) {
    console.error('Error fetching reason types:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth as unknown as RequestHandler);
router.use(requireRole("ADMIN") as unknown as RequestHandler);

/**
 * GET /admin/referral-earnings
 * Get all referral earnings with filters
 * Query params: driverId?, status?, page?, pageSize?
 */
const getAllReferralEarnings: RequestHandler = async (req, res) => {
  try {
    const driverId = req.query.driverId ? Number(req.query.driverId) : undefined;
    const status = req.query.status as string | undefined;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 50;

    if (!(prisma as any).referralEarning) {
      return res.json({ earnings: [], total: 0, page, pageSize });
    }

    const where: any = {};
    if (driverId) where.driverId = driverId;
    if (status) where.status = status;

    const [earnings, total] = await Promise.all([
      (prisma as any).referralEarning.findMany({
        where,
        include: {
          referredUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          booking: {
            select: {
              id: true,
              totalAmount: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              total: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      (prisma as any).referralEarning.count({ where }),
    ]);

    return res.json({
      earnings: earnings.map((e: any) => ({
        id: e.id,
        driverId: e.driverId,
        referredUser: e.referredUser,
        booking: e.booking,
        invoice: e.invoice,
        amount: Number(e.amount || 0),
        currency: e.currency || 'TZS',
        status: e.status,
        bonusPaymentRef: e.bonusPaymentRef,
        withdrawalId: e.withdrawalId,
        adminNotes: e.adminNotes,
        paidAsBonusAt: e.paidAsBonusAt,
        availableAt: e.availableAt,
        withdrawnAt: e.withdrawnAt,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
      total,
      page,
      pageSize,
    });
  } catch (err: any) {
    console.error('Failed to fetch referral earnings', err);
    return res.status(500).json({ error: 'Failed to fetch referral earnings' });
  }
};

/**
 * GET /admin/referral-earnings/withdrawals
 * Get all withdrawal applications
 * Query params: status?, driverId?, page?, pageSize?
 */
const getAllWithdrawals: RequestHandler = async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const driverId = req.query.driverId ? Number(req.query.driverId) : undefined;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 50;

    if (!(prisma as any).referralWithdrawal) {
      return res.json({ withdrawals: [], total: 0, page, pageSize });
    }

    const where: any = {};
    if (status) where.status = status;
    if (driverId) where.driverId = driverId;

    const [withdrawals, total] = await Promise.all([
      (prisma as any).referralWithdrawal.findMany({
        where,
        include: {
          driver: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      (prisma as any).referralWithdrawal.count({ where }),
    ]);

    return res.json({
      withdrawals: withdrawals.map((w: any) => ({
        id: w.id,
        driver: w.driver,
        totalAmount: Number(w.totalAmount || 0),
        currency: w.currency || 'TZS',
        status: w.status,
        paymentMethod: w.paymentMethod,
        paymentRef: w.paymentRef,
        rejectionReason: w.rejectionReason,
        adminNotes: w.adminNotes,
        processedBy: w.processedBy,
        approvedAt: w.approvedAt,
        rejectedAt: w.rejectedAt,
        paidAt: w.paidAt,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      })),
      total,
      page,
      pageSize,
    });
  } catch (err: any) {
    console.error('Failed to fetch withdrawals', err);
    return res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
};

/**
 * POST /admin/referral-earnings/withdrawals/:id/approve
 * Approve a withdrawal application
 * Body: { adminNotes? }
 */
const approveWithdrawal: RequestHandler = async (req, res) => {
  try {
    const withdrawalId = Number(req.params.id);
    const adminId = (req as AuthedRequest).user!.id;
    const { adminNotes } = req.body || {};

    if (!(prisma as any).referralWithdrawal || !(prisma as any).referralEarning) {
      return res.status(400).json({ error: 'Referral system not available' });
    }

    const withdrawal = await (prisma as any).referralWithdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'PENDING') {
      return res.status(400).json({ 
        error: `Withdrawal is already ${withdrawal.status}` 
      });
    }

    // Update withdrawal status
    const updated = await (prisma as any).referralWithdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'APPROVED',
        processedBy: adminId,
        approvedAt: new Date(),
        adminNotes: adminNotes || withdrawal.adminNotes,
      },
    });

    // Mark associated earnings as WITHDRAWN
    await (prisma as any).referralEarning.updateMany({
      where: {
        withdrawalId: withdrawalId,
        status: 'AVAILABLE_FOR_WITHDRAWAL',
      },
      data: {
        status: 'WITHDRAWN',
        withdrawnAt: new Date(),
      },
    });

    // Notify driver via Socket.IO if available
    try {
      const io = (req as any).app?.get?.('io') || (global as any).io;
      if (io) {
        io.to(`driver:${withdrawal.driverId}`).emit('referral-withdrawal-approved', {
          withdrawalId: updated.id,
          amount: Number(updated.totalAmount),
          approvedAt: updated.approvedAt,
          processedBy: {
            id: adminId,
            name: (req as AuthedRequest).user?.name,
          },
        });
      }
    } catch (e) {
      console.warn('Failed to emit approval notification', e);
    }

    return res.json({
      success: true,
      withdrawal: {
        id: updated.id,
        status: updated.status,
        approvedAt: updated.approvedAt,
      },
    });
  } catch (err: any) {
    console.error('Failed to approve withdrawal', err);
    return res.status(500).json({ error: 'Failed to approve withdrawal' });
  }
};

/**
 * POST /admin/referral-earnings/withdrawals/:id/reject
 * Reject a withdrawal application
 * Body: { rejectionReason, adminNotes? }
 */
const rejectWithdrawal: RequestHandler = async (req, res) => {
  try {
    const withdrawalId = Number(req.params.id);
    const adminId = (req as AuthedRequest).user!.id;
    const { rejectionReason, adminNotes } = req.body || {};

    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    if (!(prisma as any).referralWithdrawal || !(prisma as any).referralEarning) {
      return res.status(400).json({ error: 'Referral system not available' });
    }

    const withdrawal = await (prisma as any).referralWithdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'PENDING') {
      return res.status(400).json({ 
        error: `Withdrawal is already ${withdrawal.status}` 
      });
    }

    // Update withdrawal status
    const updated = await (prisma as any).referralWithdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'REJECTED',
        processedBy: adminId,
        rejectedAt: new Date(),
        rejectionReason,
        adminNotes: adminNotes || withdrawal.adminNotes,
      },
    });

    // Mark associated earnings back to AVAILABLE_FOR_WITHDRAWAL
    await (prisma as any).referralEarning.updateMany({
      where: {
        withdrawalId: withdrawalId,
        status: 'AVAILABLE_FOR_WITHDRAWAL',
      },
      data: {
        withdrawalId: null,
      },
    });

    // Notify driver via Socket.IO if available
    try {
      const io = (req as any).app?.get?.('io') || (global as any).io;
      if (io) {
        io.to(`driver:${withdrawal.driverId}`).emit('referral-withdrawal-rejected', {
          withdrawalId: updated.id,
          reason: rejectionReason,
          rejectedAt: updated.rejectedAt,
          processedBy: {
            id: adminId,
            name: (req as AuthedRequest).user?.name,
          },
        });
      }
    } catch (e) {
      console.warn('Failed to emit rejection notification', e);
    }

    return res.json({
      success: true,
      withdrawal: {
        id: updated.id,
        status: updated.status,
        rejectedAt: updated.rejectedAt,
      },
    });
  } catch (err: any) {
    console.error('Failed to reject withdrawal', err);
    return res.status(500).json({ error: 'Failed to reject withdrawal' });
  }
};

/**
 * POST /admin/referral-earnings/withdrawals/:id/mark-paid
 * Mark a withdrawal as paid
 * Body: { paymentRef?, adminNotes? }
 */
const markWithdrawalPaid: RequestHandler = async (req, res) => {
  try {
    const withdrawalId = Number(req.params.id);
    const { paymentRef, adminNotes } = req.body || {};

    if (!(prisma as any).referralWithdrawal) {
      return res.status(400).json({ error: 'Referral system not available' });
    }

    const withdrawal = await (prisma as any).referralWithdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'APPROVED') {
      return res.status(400).json({ 
        error: `Withdrawal must be APPROVED before marking as paid. Current status: ${withdrawal.status}` 
      });
    }

    const updated = await (prisma as any).referralWithdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentRef: paymentRef || withdrawal.paymentRef,
        adminNotes: adminNotes || withdrawal.adminNotes,
      },
    });

    // Notify driver via Socket.IO if available
    try {
      const io = (req as any).app?.get?.('io') || (global as any).io;
      if (io) {
        io.to(`driver:${withdrawal.driverId}`).emit('referral-withdrawal-paid', {
          withdrawalId: updated.id,
          amount: Number(updated.totalAmount),
          paymentRef: updated.paymentRef,
          paidAt: updated.paidAt,
          processedBy: {
            id: (req as AuthedRequest).user?.id,
            name: (req as AuthedRequest).user?.name,
          },
        });
      }
    } catch (e) {
      console.warn('Failed to emit paid notification', e);
    }

    return res.json({
      success: true,
      withdrawal: {
        id: updated.id,
        status: updated.status,
        paidAt: updated.paidAt,
      },
    });
  } catch (err: any) {
    console.error('Failed to mark withdrawal as paid', err);
    return res.status(500).json({ error: 'Failed to mark withdrawal as paid' });
  }
};

/**
 * POST /admin/referral-earnings/mark-as-bonus
 * Mark referral earnings as paid as bonus (non-withdrawable)
 * Body: { earningIds: number[], bonusPaymentRef: string, adminNotes? }
 * This prevents duplicate payments and notifies admins
 */
const markEarningsAsBonus: RequestHandler = async (req, res) => {
  try {
    const { earningIds, bonusPaymentRef, adminNotes } = req.body || {};
    const adminId = (req as AuthedRequest).user!.id;

    if (!earningIds || !Array.isArray(earningIds) || earningIds.length === 0) {
      return res.status(400).json({ error: 'earningIds array is required' });
    }

    if (!bonusPaymentRef) {
      return res.status(400).json({ error: 'bonusPaymentRef is required' });
    }

    if (!(prisma as any).referralEarning) {
      return res.status(400).json({ error: 'Referral system not available' });
    }

    // Update earnings
    const updated = await (prisma as any).referralEarning.updateMany({
      where: {
        id: { in: earningIds },
        status: { in: ['PENDING', 'AVAILABLE_FOR_WITHDRAWAL'] },
      },
      data: {
        status: 'PAID_AS_BONUS',
        bonusPaymentRef,
        paidAsBonusAt: new Date(),
        adminNotes: adminNotes || undefined,
      },
    });

    // Get driver IDs from earnings to notify them
    try {
      const earnings = await (prisma as any).referralEarning.findMany({
        where: { id: { in: earningIds } },
        select: { driverId: true },
      });
      
      const driverIds = [...new Set(earnings.map((e: any) => e.driverId))];
      
      // Notify drivers and admins via Socket.IO
      const io = (req as any).app?.get?.('io') || (global as any).io;
      if (io) {
        // Notify each driver
        driverIds.forEach((driverId: number) => {
          io.to(`driver:${driverId}`).emit('referral-earnings-marked-as-bonus', {
            earningIds: earnings.filter((e: any) => e.driverId === driverId).map((e: any) => e.id),
            bonusPaymentRef,
            count: earnings.filter((e: any) => e.driverId === driverId).length,
            processedBy: {
              id: adminId,
              name: (req as AuthedRequest).user?.name,
            },
          });
        });
        
        // Notify admins
        io.emit('admin:referral-earnings-paid-as-bonus', {
          earningIds,
          bonusPaymentRef,
          count: updated.count,
          processedBy: adminId,
        });
      }
    } catch (e) {
      console.warn('Failed to emit bonus payment notification', e);
    }

    return res.json({
      success: true,
      updated: updated.count,
      bonusPaymentRef,
    });
  } catch (err: any) {
    console.error('Failed to mark earnings as bonus', err);
    return res.status(500).json({ error: 'Failed to mark earnings as bonus' });
  }
};

router.get('/', getAllReferralEarnings as unknown as RequestHandler);
router.get('/withdrawals', getAllWithdrawals as unknown as RequestHandler);
router.post('/withdrawals/:id/approve', approveWithdrawal as unknown as RequestHandler);
router.post('/withdrawals/:id/reject', rejectWithdrawal as unknown as RequestHandler);
router.post('/withdrawals/:id/mark-paid', markWithdrawalPaid as unknown as RequestHandler);
router.post('/mark-as-bonus', markEarningsAsBonus as unknown as RequestHandler);

export default router;



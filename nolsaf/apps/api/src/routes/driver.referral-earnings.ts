import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth as unknown as RequestHandler);

/**
 * GET /driver/referral-earnings
 * Returns referral earnings for the authenticated driver
 * Query params: status (optional filter)
 */
const getReferralEarnings: RequestHandler = async (req, res) => {
  try {
    const user = (req as AuthedRequest).user!;
    const driverId = user.id;
    const status = req.query.status as string | undefined;

    // Check if ReferralEarning model exists
    if (!(prisma as any).referralEarning) {
      return res.json({
        earnings: [],
        summary: {
          total: 0,
          pending: 0,
          paidAsBonus: 0,
          availableForWithdrawal: 0,
          withdrawn: 0,
        },
      });
    }

    const where: any = { driverId };
    if (status) {
      where.status = status;
    }

    const earnings = await (prisma as any).referralEarning.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate summary
    const summary = {
      total: 0,
      pending: 0,
      paidAsBonus: 0,
      availableForWithdrawal: 0,
      withdrawn: 0,
    };

    earnings.forEach((earning: any) => {
      const amount = Number(earning.amount || 0);
      summary.total += amount;
      
      switch (earning.status) {
        case 'PENDING':
          summary.pending += amount;
          break;
        case 'PAID_AS_BONUS':
          summary.paidAsBonus += amount;
          break;
        case 'AVAILABLE_FOR_WITHDRAWAL':
          summary.availableForWithdrawal += amount;
          break;
        case 'WITHDRAWN':
          summary.withdrawn += amount;
          break;
      }
    });

    return res.json({
      earnings: earnings.map((e: any) => ({
        id: e.id,
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
      summary,
    });
  } catch (err: any) {
    console.error('Failed to fetch referral earnings', err);
    return res.status(500).json({ error: 'Failed to fetch referral earnings' });
  }
};

/**
 * POST /driver/referral-earnings/apply-withdrawal
 * Driver applies to withdraw available referral earnings
 * Body: { amount?, paymentMethod?, paymentRef? }
 * If amount not specified, withdraws all available earnings
 */
const applyWithdrawal: RequestHandler = async (req, res) => {
  try {
    const user = (req as AuthedRequest).user!;
    const driverId = user.id;
    const { amount, paymentMethod, paymentRef } = req.body || {};

    // Check if models exist
    if (!(prisma as any).referralEarning || !(prisma as any).referralWithdrawal) {
      return res.status(400).json({ error: 'Referral system not available' });
    }

    // Get available earnings
    const availableEarnings = await (prisma as any).referralEarning.findMany({
      where: {
        driverId,
        status: 'AVAILABLE_FOR_WITHDRAWAL',
      },
    });

    if (availableEarnings.length === 0) {
      return res.status(400).json({ error: 'No available earnings to withdraw' });
    }

    const totalAvailable = availableEarnings.reduce(
      (sum: number, e: any) => sum + Number(e.amount || 0),
      0
    );

    const withdrawalAmount = amount ? Number(amount) : totalAvailable;

    if (withdrawalAmount <= 0 || withdrawalAmount > totalAvailable) {
      return res.status(400).json({ 
        error: `Invalid amount. Available: ${totalAvailable}` 
      });
    }

    // Check for existing pending withdrawal
    const existingPending = await (prisma as any).referralWithdrawal.findFirst({
      where: {
        driverId,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      return res.status(400).json({ 
        error: 'You already have a pending withdrawal application' 
      });
    }

    // Create withdrawal application
    const withdrawal = await (prisma as any).referralWithdrawal.create({
      data: {
        driverId,
        totalAmount: withdrawalAmount,
        currency: 'TZS',
        status: 'PENDING',
        paymentMethod: paymentMethod || null,
        paymentRef: paymentRef || null,
      },
    });

    // First, mark any PENDING earnings as AVAILABLE_FOR_WITHDRAWAL
    await (prisma as any).referralEarning.updateMany({
      where: {
        driverId,
        status: 'PENDING',
      },
      data: {
        status: 'AVAILABLE_FOR_WITHDRAWAL',
        availableAt: new Date(),
      },
    });

    // Get available earnings again (now includes newly marked ones)
    const allAvailableEarnings = await (prisma as any).referralEarning.findMany({
      where: {
        driverId,
        status: 'AVAILABLE_FOR_WITHDRAWAL',
      },
      orderBy: { createdAt: 'asc' }, // Process oldest first
    });

    // Mark earnings as part of this withdrawal (up to the requested amount)
    let remainingAmount = withdrawalAmount;
    const markedEarningIds: number[] = [];

    for (const earning of allAvailableEarnings) {
      if (remainingAmount <= 0) break;
      
      const earningAmount = Number(earning.amount || 0);
      if (earningAmount > 0) {
        markedEarningIds.push(earning.id);
        remainingAmount -= earningAmount;
      }
    }

    if (markedEarningIds.length > 0) {
      await (prisma as any).referralEarning.updateMany({
        where: {
          id: { in: markedEarningIds },
        },
        data: {
          withdrawalId: withdrawal.id,
          // Status remains AVAILABLE_FOR_WITHDRAWAL until admin approves
        },
      });
    }

    // Notify admins via Socket.IO if available
    try {
      const io = (req as any).app?.get?.('io');
      if (io) {
        io.emit('admin:referral-withdrawal-requested', {
          withdrawalId: withdrawal.id,
          driverId,
          amount: withdrawalAmount,
          driverName: user.name || user.email,
        });
      }
    } catch (e) {
      console.warn('Failed to emit withdrawal notification', e);
    }

    return res.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        totalAmount: Number(withdrawal.totalAmount),
        currency: withdrawal.currency,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Failed to apply for withdrawal', err);
    return res.status(500).json({ error: 'Failed to apply for withdrawal' });
  }
};

/**
 * GET /driver/referral-earnings/withdrawals
 * Get withdrawal history for the driver
 */
const getWithdrawals: RequestHandler = async (req, res) => {
  try {
    const user = (req as AuthedRequest).user!;
    const driverId = user.id;

    if (!(prisma as any).referralWithdrawal) {
      return res.json({ withdrawals: [] });
    }

    const withdrawals = await (prisma as any).referralWithdrawal.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      withdrawals: withdrawals.map((w: any) => ({
        id: w.id,
        totalAmount: Number(w.totalAmount || 0),
        currency: w.currency || 'TZS',
        status: w.status,
        paymentMethod: w.paymentMethod,
        paymentRef: w.paymentRef,
        rejectionReason: w.rejectionReason,
        adminNotes: w.adminNotes,
        approvedAt: w.approvedAt,
        rejectedAt: w.rejectedAt,
        paidAt: w.paidAt,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      })),
    });
  } catch (err: any) {
    console.error('Failed to fetch withdrawals', err);
    return res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
};

router.get('/', getReferralEarnings as unknown as RequestHandler);
router.post('/apply-withdrawal', applyWithdrawal as unknown as RequestHandler);
router.get('/withdrawals', getWithdrawals as unknown as RequestHandler);

export default router;


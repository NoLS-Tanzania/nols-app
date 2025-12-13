import { prisma } from "@nolsaf/prisma";

/**
 * Create referral earnings when a booking/invoice is paid
 * This is called when a referred user makes a payment
 * @param referredUserId - The user who was referred
 * @param bookingId - The booking ID (optional)
 * @param invoiceId - The invoice ID (optional)
 * @param amount - The amount that generated the earning
 * @param currency - Currency code (default: TZS)
 * @returns The created referral earning or null if not applicable
 */
export async function createReferralEarning(
  referredUserId: number,
  bookingId?: number,
  invoiceId?: number,
  amount?: number,
  currency: string = 'TZS'
): Promise<any | null> {
  try {
    // Check if ReferralEarning model exists
    if (!(prisma as any).referralEarning) {
      return null;
    }

    // Get the referred user to find who referred them
    const referredUser = await prisma.user.findUnique({
      where: { id: referredUserId },
      select: { referredBy: true, role: true },
    });

    if (!referredUser || !referredUser.referredBy) {
      return null; // User was not referred or referrer not found
    }

    const driverId = Number(referredUser.referredBy);

    // Verify the referrer is a driver
    const driver = await prisma.user.findUnique({
      where: { id: driverId },
      select: { role: true },
    });

    if (!driver || driver.role !== 'DRIVER') {
      return null; // Referrer is not a driver
    }

    // Calculate referral earning amount (0.35% of booking amount)
    // If amount not provided, try to get it from booking or invoice
    let earningAmount = amount || 0;

    if (!earningAmount && bookingId) {
      try {
        const booking = await (prisma as any).booking?.findUnique({
          where: { id: bookingId },
          select: { totalAmount: true, price: true, fare: true },
        });
        if (booking) {
          earningAmount = Number(booking.totalAmount || booking.price || booking.fare || 0);
        }
      } catch (e) {
        console.warn('Failed to fetch booking amount', e);
      }
    }

    if (!earningAmount && invoiceId) {
      try {
        const invoice = await (prisma as any).invoice?.findUnique({
          where: { id: invoiceId },
          select: { total: true },
        });
        if (invoice) {
          earningAmount = Number(invoice.total || 0);
        }
      } catch (e) {
        console.warn('Failed to fetch invoice amount', e);
      }
    }

    if (earningAmount <= 0) {
      return null; // No amount to earn from
    }

    // Calculate 0.35% of the amount
    const referralAmount = Math.round(earningAmount * 0.0035);

    if (referralAmount <= 0) {
      return null; // Amount too small
    }

    // Check if earning already exists for this booking/invoice
    const existingWhere: any = { driverId, referredUserId };
    if (bookingId) existingWhere.bookingId = bookingId;
    if (invoiceId) existingWhere.invoiceId = invoiceId;

    const existing = await (prisma as any).referralEarning.findFirst({
      where: existingWhere,
    });

    if (existing) {
      // Earning already exists, don't create duplicate
      return existing;
    }

    // Create the referral earning
    const earning = await (prisma as any).referralEarning.create({
      data: {
        driverId,
        referredUserId,
        bookingId: bookingId || null,
        invoiceId: invoiceId || null,
        amount: referralAmount,
        currency,
        status: 'PENDING', // Will be updated to AVAILABLE_FOR_WITHDRAWAL when driver applies
      },
    });

    return earning;
  } catch (err: any) {
    console.error('Failed to create referral earning', err);
    return null;
  }
}

/**
 * Mark referral earnings as available for withdrawal
 * This is called when a driver applies for withdrawal
 * @param driverId - The driver ID
 * @param earningIds - Optional array of specific earning IDs, or null for all pending
 */
export async function markEarningsAvailableForWithdrawal(
  driverId: number,
  earningIds?: number[]
): Promise<number> {
  try {
    if (!(prisma as any).referralEarning) {
      return 0;
    }

    const where: any = {
      driverId,
      status: 'PENDING',
    };

    if (earningIds && earningIds.length > 0) {
      where.id = { in: earningIds };
    }

    const result = await (prisma as any).referralEarning.updateMany({
      where,
      data: {
        status: 'AVAILABLE_FOR_WITHDRAWAL',
        availableAt: new Date(),
      },
    });

    return result.count || 0;
  } catch (err: any) {
    console.error('Failed to mark earnings as available', err);
    return 0;
  }
}



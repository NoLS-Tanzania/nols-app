import { Router, RequestHandler } from 'express';
import { prisma } from '@nolsaf/prisma';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const router = Router();
router.use(requireAuth as RequestHandler, requireRole('ADMIN') as RequestHandler);

function sendJsonSafe(res: any, payload: unknown, status = 200) {
  try {
    // Ensure Content-Type is set
    res.setHeader('Content-Type', 'application/json');
    res.status(status);
    
    // Handle BigInt (JSON.stringify throws on BigInt)
    // Use a replacer function to convert BigInt to string
    const jsonString = JSON.stringify(payload, (_key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      // Handle other non-serializable values
      if (value === undefined) {
        return null;
      }
      return value;
    });
    
    // Use res.send() with the stringified JSON
    return res.send(jsonString);
  } catch (err: any) {
    // Fallback: try to send error as JSON
    if (!res.headersSent) {
      res.status(500).setHeader('Content-Type', 'application/json').json({ error: 'Failed to serialize response', message: err?.message });
    } else {
      // If headers already sent, we can't send a proper error response
      console.error('Cannot send error response - headers already sent');
    }
    throw err;
  }
}

function buildPhoneVariants(phoneRaw: string | null | undefined): string[] {
  const raw = String(phoneRaw ?? '').trim();
  if (!raw) return [];

  const compact = raw.replace(/\s+/g, '').replace(/-/g, '');
  const noPlus = compact.replace(/^\+/, '');
  const digitsOnly = noPlus.replace(/\D+/g, '');

  const variants = new Set<string>([raw, compact, noPlus]);

  // Tanzania-friendly normalization: 0XXXXXXXXX <-> 255XXXXXXXXX
  if (digitsOnly.length === 9) {
    variants.add('0' + digitsOnly);
    variants.add('255' + digitsOnly);
    variants.add('+255' + digitsOnly);
  }

  if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
    const t = '255' + digitsOnly.slice(1);
    variants.add(t);
    variants.add('+' + t);
  }

  if (digitsOnly.startsWith('255') && digitsOnly.length === 12) {
    variants.add(digitsOnly);
    variants.add('+' + digitsOnly);
    variants.add('0' + digitsOnly.slice(3));
  }

  return Array.from(variants).filter(Boolean);
}

function buildBookingWhereForUser(user: { id: number; phone?: string | null; email?: string | null }) {
  const or: any[] = [{ userId: user.id }];

  const phoneVariants = buildPhoneVariants(user.phone);
  if (phoneVariants.length) {
    or.push({ userId: null, guestPhone: { in: phoneVariants } });
  }

  // Note: guestEmail field doesn't exist in Booking model, only guestPhone and guestName
  // If we need to match by email, we would need to match via userId instead

  return { OR: or };
}

/*
 * GET /admin/users
 * Query: { page?: string, perPage?: string, q?: string, role?: string }
 */
router.get('/', async (req, res) => {
  try {
    // Explicitly set Content-Type to JSON
    res.setHeader('Content-Type', 'application/json');
    
    const { page = '1', perPage = '25', q, role } = req.query as any;
    const p = Math.max(1, Number(page) || 1);
    const pp = Math.max(1, Math.min(200, Number(perPage) || 25));

    const where: any = {};
    if (role) where.role = String(role);
    if (q) {
      const like = `%${String(q).replace(/%/g, '\\%')}%`;
      where.OR = [
        { name: { contains: String(q), mode: 'insensitive' } },
        { email: { contains: String(q), mode: 'insensitive' } },
        { phone: { contains: String(q), mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ 
        where, 
        skip: (p - 1) * pp, 
        take: pp, 
        orderBy: { createdAt: 'desc' }, 
        select: { 
          id: true, 
          name: true, 
          email: true, 
          phone: true, 
          role: true, 
          createdAt: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
          twoFactorEnabled: true,
          _count: {
            select: {
              bookings: true,
            }
          }
        } 
      }),
    ]);

    // For customers, get booking stats
    const usersWithStats = await Promise.all(users.map(async (user: typeof users[0]) => {
      if (user.role !== 'CUSTOMER') {
        return { ...user, bookingCount: 0, totalSpent: 0, lastBookingDate: null };
      }

      const bookingWhere = buildBookingWhereForUser({ id: user.id, phone: user.phone, email: user.email });

      const bookingCount = await prisma.booking.count({
        where: bookingWhere,
      });

      const revenueResult = await prisma.invoice.aggregate({
        where: {
          booking: { userId: user.id },
          status: { in: ['APPROVED', 'PAID'] },
        },
        _sum: { total: true },
      });

      const lastBooking = await prisma.booking.findFirst({
        where: bookingWhere,
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      return {
        ...user,
        bookingCount,
        totalSpent: Number(revenueResult._sum.total || 0),
        lastBookingDate: lastBooking?.createdAt || null,
      };
    }));

    return res.json({ meta: { page: p, perPage: pp, total }, data: usersWithStats });
  } catch (err: any) {
    console.error('Error in GET /admin/users:', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Internal server error', message: err?.message || 'Unknown error' });
  }
});

/**
 * GET /admin/users/summary - Customer-focused statistics
 * IMPORTANT: This route must come before /:id to avoid matching "summary" as an ID
 */
router.get('/summary', async (req, res) => {
  try {
    // Total customers only
    const totalCustomers = await prisma.user.count({ where: { role: "CUSTOMER" } });

    // Customers with verified email
    const verifiedEmailCount = await prisma.user.count({
      where: { role: "CUSTOMER", emailVerifiedAt: { not: null } },
    });

    // Customers with verified phone
    const verifiedPhoneCount = await prisma.user.count({
      where: { role: "CUSTOMER", phoneVerifiedAt: { not: null } },
    });

    // Customers with 2FA enabled
    const twoFactorEnabledCount = await prisma.user.count({
      where: { role: "CUSTOMER", twoFactorEnabled: true },
    });

    // Recent customers (last 10)
    const recentCustomers = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        twoFactorEnabled: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Customers created in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newCustomersLast7Days = await prisma.user.count({
      where: { role: "CUSTOMER", createdAt: { gte: sevenDaysAgo } },
    });

    // Customers created in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newCustomersLast30Days = await prisma.user.count({
      where: { role: "CUSTOMER", createdAt: { gte: thirtyDaysAgo } },
    });

    // Customer bookings statistics
    const totalBookings = await prisma.booking.count({
      where: { userId: { not: null } },
    });

    const confirmedBookings = await prisma.booking.count({
      where: { userId: { not: null }, status: "CONFIRMED" },
    });

    const checkedInBookings = await prisma.booking.count({
      where: { userId: { not: null }, status: "CHECKED_IN" },
    });

    const completedBookings = await prisma.booking.count({
      where: { userId: { not: null }, status: "CHECKED_OUT" },
    });

    // Total revenue from customer bookings (via invoices)
    const revenueResult = await prisma.invoice.aggregate({
      where: {
        booking: { userId: { not: null } },
        status: { in: ["APPROVED", "PAID"] },
      },
      _sum: { total: true },
    });
    const totalRevenue = revenueResult._sum.total || 0;

    // Customers who have made bookings
    const customersWithBookings = await prisma.user.count({
      where: {
        role: "CUSTOMER",
        bookings: { some: {} },
      },
    });

    // Group bookings by customers
    const totalGroupBookings = await (prisma as any).groupBooking.count({
      where: { userId: { not: null } },
    }).catch(() => 0);

    // Transportation requests in group bookings
    const transportationRequests = await (prisma as any).groupBooking.count({
      where: { userId: { not: null }, arrTransport: true },
    }).catch(() => 0);

    // Active customers (made at least one booking)
    const activeCustomers = customersWithBookings;

    // Average bookings per customer
    const avgBookingsPerCustomer = activeCustomers > 0
      ? Math.round((totalBookings + totalGroupBookings) / activeCustomers)
      : 0;

    res.json({
      totalCustomers,
      verifiedEmailCount,
      verifiedPhoneCount,
      twoFactorEnabledCount,
      newCustomersLast7Days,
      newCustomersLast30Days,
      recentCustomers,
      totalBookings,
      confirmedBookings,
      checkedInBookings,
      completedBookings,
      totalRevenue: Number(totalRevenue),
      customersWithBookings,
      activeCustomers,
      totalGroupBookings,
      transportationRequests,
      avgBookingsPerCustomer,
    });
  } catch (err) {
    console.error("admin.users.summary error", err);
    res.status(500).json({ error: "failed" });
  }
});

/**
 * GET /admin/users/:id
 * Returns detailed user information including bookings, stats, etc.
 */
router.get('/:id', asyncHandler(async (req, res) => {
  let stage = 'start';
  const id = Number(req.params.id);

  try {
    stage = 'parse_id';
    if (!id) {
      return sendJsonSafe(res, { error: 'invalid id' }, 400);
    }

    // Fail-soft: some environments may not have all newer columns yet.
    // If Prisma throws due to missing columns, retry with a minimal select.
    let user: any = null;
    try {
      stage = 'user_select_full';
      user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
          twoFactorEnabled: true,
          suspendedAt: true,
          isDisabled: true,
          _count: {
            select: {
              bookings: true,
            },
          },
        },
      });
    } catch (e) {
      console.warn('GET /admin/users/:id user select failed; retrying minimal select', e);
      stage = 'user_select_minimal';
      user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      });
      if (user) {
        user.emailVerifiedAt = null;
        user.phoneVerifiedAt = null;
        user.twoFactorEnabled = false;
        user.suspendedAt = null;
        user.isDisabled = null;
        user._count = { bookings: 0 };
      }
    }

    if (!user) {
      return sendJsonSafe(res, { error: 'user not found' }, 404);
    }

    // NOTE: bookingWhere may reference legacy columns (guestPhone/guestEmail).
    // If an environment is missing those columns, Prisma will throw at runtime.
    stage = 'build_booking_where';
    const bookingWhere = buildBookingWhereForUser({ id, phone: user.phone, email: user.email });

    // Get bookings for this user
    let bookings: any[] = [];
    try {
      stage = 'booking_query_full';
      bookings = await prisma.booking.findMany({
        where: bookingWhere,
        include: {
          property: {
            select: {
              id: true,
              title: true,
              type: true,
              regionName: true,
              city: true,
              district: true,
            },
          },
          code: {
            select: {
              id: true,
              status: true,
              codeVisible: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    } catch (e1) {
      console.warn('GET /admin/users/:id booking query failed; retrying without code include', e1);
      try {
        stage = 'booking_query_no_code';
        bookings = await prisma.booking.findMany({
          where: bookingWhere,
          include: {
            property: {
              select: {
                id: true,
                title: true,
                type: true,
                regionName: true,
                city: true,
                district: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
        bookings = bookings.map((b) => ({ ...b, code: null }));
      } catch (e2) {
        console.warn('GET /admin/users/:id booking where failed; retrying userId-only', e2);
        try {
          stage = 'booking_query_userid_only';
          bookings = await prisma.booking.findMany({
            where: { userId: id },
            include: {
              property: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  regionName: true,
                  city: true,
                  district: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          });
          bookings = bookings.map((b) => ({ ...b, code: null }));
        } catch (e3) {
          console.warn('GET /admin/users/:id booking userId-only fallback failed; returning empty list', e3);
          bookings = [];
        }
      }
    }

    // Get booking stats
    stage = 'compute_stats';
    const bookingStats = {
      total: bookings.length,
      confirmed: bookings.filter((b: typeof bookings[0]) => b.status === 'CONFIRMED').length,
      checkedIn: bookings.filter((b: typeof bookings[0]) => b.status === 'CHECKED_IN').length,
      checkedOut: bookings.filter((b: typeof bookings[0]) => b.status === 'CHECKED_OUT').length,
      canceled: bookings.filter((b: typeof bookings[0]) => b.status === 'CANCELED').length,
    };

    // Get revenue stats from invoices (based on the bookings we associate to this user)
    const bookingIds = bookings.map((b: any) => b.id);
    let revenueResult: any = { _sum: { total: 0 }, _count: { _all: 0 } };
    if (bookingIds.length) {
      try {
        stage = 'invoice_aggregate';
        revenueResult = await prisma.invoice.aggregate({
          where: {
            bookingId: { in: bookingIds },
            status: { in: ['APPROVED', 'PAID'] },
          },
          _sum: { total: true },
          _count: { _all: true },
        });
      } catch (e) {
        console.warn('GET /admin/users/:id invoice aggregate failed; defaulting revenue to 0', e);
        revenueResult = { _sum: { total: 0 }, _count: { _all: 0 } };
      }
    }

    const lastBooking = bookings.length > 0 ? bookings[0] : null;

    stage = 'respond';
    
    // Build response payload
    const responsePayload = {
      user,
      bookings,
      stats: {
        booking: bookingStats,
        revenue: {
          total: Number(revenueResult._sum.total || 0),
          invoiceCount: (revenueResult as any)._count?._all ?? 0,
        },
        lastBooking: lastBooking
          ? {
              id: lastBooking.id,
              createdAt: lastBooking.createdAt,
              status: lastBooking.status,
            }
          : null,
      },
    };
    
    try {
      sendJsonSafe(res, responsePayload);
      return;
    } catch (sendError: any) {
      throw sendError;
    }
  } catch (err) {
    const isProd = process.env.NODE_ENV === 'production';
    console.error('GET /admin/users/:id error:', { stage, err });

    // Fail-open: return a minimal shape so the admin page can still render.
    // This avoids the dev proxy turning upstream failures into non-JSON/HTML.
    let fallbackUser: any = null;
    try {
      stage = stage === 'parse_id' ? 'fallback_user_select' : stage;
      fallbackUser = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      });
    } catch {
      fallbackUser = null;
    }

    return sendJsonSafe(
      res,
      {
        user: fallbackUser,
        bookings: [],
        stats: {
          booking: { total: 0, confirmed: 0, checkedIn: 0, checkedOut: 0, canceled: 0 },
          revenue: { total: 0, invoiceCount: 0 },
          lastBooking: null,
        },
        _error: {
          error: 'failed',
          stage,
          ...(isProd
            ? {}
            : {
                message: (err as any)?.message,
                name: (err as any)?.name,
                code: (err as any)?.code,
              }),
        },
      },
      200,
    );
  }
}));

/**
 * POST /admin/users/:id/suspend
 * Body: { reason?: string }
 */
router.post('/:id/suspend', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    const reason = String(req.body?.reason ?? "");
    const me = (req.user as any)?.id;

    const user = await prisma.user.update({
      where: { id },
      data: { suspendedAt: new Date() },
      select: { id: true, name: true, email: true, suspendedAt: true }
    });

    // Create audit log
    if (me) {
      await prisma.adminAudit.create({
        data: { adminId: me, targetUserId: id, action: "SUSPEND_USER", details: reason },
      });
    }

    res.json({ ok: true, user });
  } catch (err) {
    console.error('POST /admin/users/:id/suspend error:', err);
    res.status(500).json({ error: 'failed' });
  }
});

/**
 * POST /admin/users/:id/unsuspend
 * Body: { notification?: string }
 */
router.post('/:id/unsuspend', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    const notification = String(req.body?.notification ?? "");
    const me = (req.user as any)?.id;

    const user = await prisma.user.update({
      where: { id },
      data: { suspendedAt: null },
      select: { id: true, name: true, email: true, suspendedAt: true }
    });

    // Create audit log with notification
    if (me) {
      await prisma.adminAudit.create({
        data: { adminId: me, targetUserId: id, action: "UNSUSPEND_USER", details: notification },
      });
    }

    res.json({ ok: true, user });
  } catch (err) {
    console.error('POST /admin/users/:id/unsuspend error:', err);
    res.status(500).json({ error: 'failed' });
  }
});

/**
 * PATCH /admin/users/:id
 * Body: { role?: 'ADMIN'|'OWNER'|'CUSTOMER', reset2FA?: boolean, disable?: boolean }
 * Note: 'disable' requires an isDisabled column; if absent, return 400 with migration instructions.
 */
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });

    const { role, reset2FA, disable } = req.body as any;

    const update: any = {};
    if (role) {
      // Allow DRIVER role as part of the system roles
      if (!['ADMIN', 'OWNER', 'CUSTOMER', 'DRIVER'].includes(role)) return res.status(400).json({ error: 'invalid role' });
      update.role = role;
    }

    if (reset2FA) {
      update.twoFactorEnabled = false;
      update.twoFactorSecret = null;
    }

    if (typeof disable !== 'undefined') {
      // check if isDisabled exists
      const cols: any = await prisma.$queryRaw`SHOW COLUMNS FROM \`User\` LIKE 'isDisabled'` as any;
      if (!cols || cols.length === 0) {
        return res.status(400).json({ error: 'disable not supported - add isDisabled column via migration' });
      }
      update.isDisabled = disable ? 1 : 0;
    }

    const user = await prisma.user.update({ where: { id }, data: update, select: { id: true, name: true, email: true, phone: true, role: true, twoFactorEnabled: true, isDisabled: true } as any }) as any;
    res.json({ data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

export default router;

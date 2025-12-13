import { Router, RequestHandler } from 'express';
import { prisma } from '@nolsaf/prisma';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const router = Router();
router.use(requireAuth as RequestHandler, requireRole('ADMIN') as RequestHandler);

/*
 * GET /admin/users
 * Query: { page?: string, perPage?: string, q?: string, role?: string }
 */
router.get('/', async (req, res) => {
  try {
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
    const usersWithStats = await Promise.all(users.map(async (user) => {
      if (user.role !== 'CUSTOMER') {
        return { ...user, bookingCount: 0, totalSpent: 0, lastBookingDate: null };
      }

      const bookingCount = await prisma.booking.count({
        where: { userId: user.id },
      });

      const revenueResult = await prisma.invoice.aggregate({
        where: {
          booking: { userId: user.id },
          status: { in: ['APPROVED', 'PAID'] },
        },
        _sum: { total: true },
      });

      const lastBooking = await prisma.booking.findFirst({
        where: { userId: user.id },
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

    res.json({ meta: { page: p, perPage: pp, total }, data: usersWithStats });
  } catch (err) {
    console.error(err);
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
      const cols: any = await prisma.$queryRawUnsafe("SHOW COLUMNS FROM `User` LIKE 'isDisabled'") as any;
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

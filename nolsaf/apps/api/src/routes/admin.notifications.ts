import { Router } from 'express';
import { prisma } from '@nolsaf/prisma';
import { Prisma } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
// Note: requireAuth and requireRole are already applied in index.ts at route registration
// We keep it here as well for safety (double protection)
router.use(requireAuth as any, requireRole('ADMIN') as any);

// GET /api/admin/notifications?tab=unread|viewed&page=1&pageSize=20
router.get('/', async (req, res) => {
  try {
    const tab = req.query.tab === 'viewed' ? 'viewed' : 'unread';
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 20);

    // For admin, fetch all notifications (no userId/ownerId filter)
    const where: any = {};
    if (tab === 'unread') {
      where.unread = true;
    } else {
      where.unread = false;
    }

    const [items, total, totalUnread] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { unread: true } }),
    ]);

    // Enrich notifications with property and owner info if available
    const dto = await Promise.all(items.map(async (i) => {
      const baseDto: any = {
        id: i.id,
        title: i.title,
        body: i.body,
        createdAt: i.createdAt,
        unread: !!i.unread,
        meta: i.meta ?? null,
      };

      // If meta contains propertyId, fetch property details
      if (i.meta && typeof i.meta === 'object' && (i.meta as any).propertyId) {
        try {
          const propertyId = Number((i.meta as any).propertyId);
          if (Number.isFinite(propertyId)) {
            const property = await prisma.property.findUnique({
              where: { id: propertyId },
              include: {
                owner: { select: { id: true, name: true, email: true } },
              },
            });

            if (property) {
              // Enhance meta with property and owner info
              baseDto.meta = {
                ...(i.meta as any),
                propertyTitle: property.title,
                propertyId: property.id,
                ownerId: property.ownerId,
                ownerName: property.owner?.name || null,
                ownerEmail: property.owner?.email || null,
              };
            }
          }
        } catch (err) {
          // Silently fail - don't break notification display
          console.warn('Failed to fetch property details for notification', err);
        }
      }

      // If ownerId exists but not in meta, add owner info
      if (i.ownerId && (!baseDto.meta || !baseDto.meta.ownerName)) {
        if (i.owner) {
          baseDto.meta = {
            ...(baseDto.meta || {}),
            ownerId: i.ownerId,
            ownerName: i.owner.name || null,
            ownerEmail: i.owner.email || null,
          };
        }
      }

      return baseDto;
    }));

    res.json({ items: dto, total, totalUnread });
  } catch (err: any) {
    console.error('GET /api/admin/notifications failed:', err?.message || err);
    console.error('Error stack:', err?.stack);
    
    // Check if it's a Prisma schema/table error
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2021' || err.code === 'P2022') {
        console.warn('Notification table may not exist or schema mismatch');
        return res.json({ items: [], total: 0, totalUnread: 0 });
      }
    }
    
    // Fail-open with empty list to avoid breaking admin UI
    res.json({ items: [], total: 0, totalUnread: 0 });
  }
});

// POST /api/admin/notifications/:id/mark-read
router.post('/:id/mark-read', async (req, res) => {
  try {
    const { id } = req.params;
    // For admin, we can mark any notification as read (no userId/ownerId restriction)
    const result = await prisma.notification.updateMany({
      where: { id: Number(id) },
      data: { unread: false, readAt: new Date() },
    });
    
    if (result.count === 0) {
      return res.status(404).json({ ok: false, error: 'not_found' });
    }
    
    return res.json({ ok: true });
  } catch (err: any) {
    console.error('POST /api/admin/notifications/:id/mark-read failed:', err?.message || err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

export default router;

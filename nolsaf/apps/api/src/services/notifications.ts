import { prisma } from "@nolsaf/prisma";

export type NotificationDto = {
  id: number | string;
  title: string;
  body: string;
  createdAt: Date;
  unread: boolean;
  meta?: any;
};

/**
 * Fetch notifications for a user (admin, owner, driver, or customer).
 * Supports both ownerId (legacy) and userId (for drivers and other users).
 */
export async function fetchNotifications(opts: { tab?: 'unread' | 'viewed', page?: number, pageSize?: number, ownerId?: number, userId?: number }) {
  const { tab = 'unread', page = 1, pageSize = 20, ownerId, userId } = opts;

  try {
    // Read from prisma.notification
    // newest-first
    const where: any = {};
    if (tab === 'unread') where.unread = true;
    else where.unread = false;
    
    // Support both ownerId (legacy) and userId (for drivers)
    if (userId) {
      where.userId = Number(userId);
    } else if (ownerId) {
      where.ownerId = Number(ownerId);
    }

    const items = await prisma.notification.findMany({ 
      where, 
      orderBy: { createdAt: 'desc' }, 
      skip: (page - 1) * pageSize, 
      take: pageSize 
    });
    const total = await prisma.notification.count({ where });
    
    const unreadWhere = { unread: true, ...(userId ? { userId: Number(userId) } : ownerId ? { ownerId: Number(ownerId) } : {}) };
    const totalUnread = await prisma.notification.count({ where: unreadWhere });

    const dto: NotificationDto[] = items.map((i) => ({ 
      id: i.id, 
      title: i.title, 
      body: i.body, 
      createdAt: i.createdAt, 
      unread: !!i.unread, 
      meta: i.meta ?? null 
    }));
    return { items: dto, total, totalUnread };
  } catch (err: any) {
    // Fallback gracefully if there's an error
    console.warn('notifications service: falling back to empty list due to error', err?.message ?? err);
    return { items: [] as NotificationDto[], totalUnread: 0 };
  }
}

export async function markNotificationRead(id: number | string, ownerId?: number, userId?: number) {
  try {
    // Support both ownerId (legacy) and userId (for drivers)
    const where: any = { id: Number(id) };
    if (userId) {
      where.userId = Number(userId);
    } else if (ownerId) {
      where.ownerId = Number(ownerId);
    }

    const r = await prisma.notification.updateMany({ 
      where, 
      data: { unread: false, readAt: new Date() } 
    });
    if (!r || (typeof r.count === 'number' && r.count === 0)) return { ok: false, error: 'not_found' };
    return { ok: true };
  } catch (err: any) {
    console.warn('markNotificationRead failed', err?.message ?? err);
    return { ok: false, error: String(err?.message ?? err) };
  }
}

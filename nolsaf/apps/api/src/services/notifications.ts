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
 * Fetch notifications for an admin user.
 * If the Notification table/model does not exist, behave gracefully and return empty arrays.
 */
export async function fetchNotifications(opts: { tab?: 'unread' | 'viewed', page?: number, pageSize?: number, ownerId?: number }) {
  const { tab = 'unread', page = 1, pageSize = 20, ownerId } = opts;

  try {
    // try to read from prisma.notification if present
    // newest-first
  const where: any = {};
  if (tab === 'unread') where.unread = true;
  else where.unread = false;
  if (ownerId) where.ownerId = Number(ownerId);

    const items = await (prisma as any).notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize });
    const total = await (prisma as any).notification.count({ where });
    const totalUnread = await (prisma as any).notification.count({ where: { unread: true, ...(ownerId ? { ownerId: Number(ownerId) } : {}) } });

    const dto: NotificationDto[] = items.map((i: any) => ({ id: i.id, title: i.title, body: i.body, createdAt: i.createdAt, unread: !!i.unread, meta: i.meta ?? null }));
    return { items: dto, total, totalUnread };
  } catch (err: any) {
    // Prisma P2022 or missing model will be caught here. Return empty lists gracefully.
    console.warn('notifications service: falling back to empty list due to error', err?.message ?? err);
    return { items: [] as NotificationDto[], totalUnread: 0 };
  }
}

export async function markNotificationRead(id: number | string, ownerId?: number) {
  try {
    // If ownerId provided, ensure we only affect that owner's notification
    const where: any = { id: Number(id) };
    if (ownerId) where.ownerId = Number(ownerId);

    const r: any = await (prisma as any).notification.updateMany({ where, data: { unread: false } });
    if (!r || (typeof r.count === 'number' && r.count === 0)) return { ok: false, error: 'not_found' };
    return { ok: true };
  } catch (err: any) {
    console.warn('markNotificationRead failed', err?.message ?? err);
    return { ok: false, error: String(err?.message ?? err) };
  }
}

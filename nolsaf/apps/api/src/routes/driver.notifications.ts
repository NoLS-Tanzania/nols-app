import { Router } from 'express';
import { prisma } from '@nolsaf/prisma';
import { AuthedRequest, requireAuth, requireRole } from '../middleware/auth.js';
import { fetchNotifications, markNotificationRead } from '../services/notifications';

const router = Router();
router.use(requireAuth as any, requireRole('DRIVER') as any);

const getReminderTitle = (type: unknown, meta: any) => {
  const metaTitle = typeof meta?.title === 'string' ? meta.title.trim() : '';
  if (metaTitle) return metaTitle;

  const rawType = String(type ?? 'INFO').trim().toUpperCase();
  switch (rawType) {
    case 'WARNING':
      return 'Driver Warning';
    case 'SECURITY':
      return 'Security Reminder';
    case 'SAFETY':
      return 'Safety Reminder';
    case 'GOAL':
      return 'Goal Update';
    case 'EARNINGS':
      return 'Earnings Update';
    default:
      return 'Driver Reminder';
  }
};

const getReminderSeverity = (type: unknown) => {
  const rawType = String(type ?? 'INFO').trim().toUpperCase();
  if (rawType === 'WARNING' || rawType === 'SECURITY') return 'warning';
  return 'info';
};

// GET /api/driver/notifications?tab=unread|viewed&page=1&pageSize=20
router.get('/', (async (req: AuthedRequest, res: any) => {
  const driverId = req.user!.id;
  const tab = req.query.tab === 'viewed' ? 'viewed' : 'unread';
  const page = Math.max(1, Number(req.query.page ?? '1'));
  const pageSize = Math.max(1, Math.min(100, Number(req.query.pageSize ?? '20')));

  const notificationPageSize = Math.max(page * pageSize * 3, 100);
  const notificationsResult = await fetchNotifications({ tab: tab as any, page: 1, pageSize: notificationPageSize, userId: driverId });

  let reminders: any[] = [];
  if ((prisma as any).driverReminder) {
    try {
      reminders = await (prisma as any).driverReminder.findMany({
        where: {
          driverId: Number(driverId),
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      console.warn('driver.notifications: failed to load reminders', (err as any)?.message ?? err);
    }
  }

  const reminderItems = reminders
    .filter((item) => (tab === 'unread' ? !item.read : !!item.read))
    .map((item) => ({
      id: `reminder:${String(item.id)}`,
      title: getReminderTitle(item.type, item.meta),
      body: String(item.message ?? ''),
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      unread: !item.read,
      meta: item.meta ?? null,
      kind: 'reminder',
      severity: getReminderSeverity(item.type),
      action: item.action ?? null,
      actionLink: item.actionLink ?? null,
      sourceLabel: 'Admin reminder',
    }));

  const notificationItems = (notificationsResult.items ?? []).map((item: any) => ({
    ...item,
    id: `notification:${String(item.id)}`,
    kind: 'notification',
    severity: String(item?.meta?.severity ?? '').toLowerCase() === 'warning' ? 'warning' : 'info',
    action: typeof item?.meta?.actionLabel === 'string' ? item.meta.actionLabel : null,
    actionLink: typeof item?.meta?.link === 'string' ? item.meta.link : null,
    sourceLabel: typeof item?.meta?.sourceLabel === 'string' ? item.meta.sourceLabel : 'System notification',
  }));

  const merged = [...notificationItems, ...reminderItems].sort((left: any, right: any) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });

  const start = (page - 1) * pageSize;
  const items = merged.slice(start, start + pageSize);
  const totalUnread = Number(notificationsResult.totalUnread ?? 0) + reminders.filter((item) => !item.read).length;
  const totalViewed = Number(notificationsResult.total ?? 0) + reminders.filter((item) => !!item.read).length;

  return res.json({
    items,
    total: tab === 'unread' ? totalUnread : totalViewed,
    totalUnread,
    totalViewed,
    page,
    pageSize,
  });
}) as any);

// POST /api/driver/notifications/:id/mark-read
router.post('/:id/mark-read', (async (req: AuthedRequest, res: any) => {
  const { id } = req.params;
  const driverId = req.user!.id;

  if (String(id).startsWith('reminder:')) {
    const reminderId = Number(String(id).slice('reminder:'.length));
    if (Number.isNaN(reminderId)) return res.status(400).json({ ok: false, error: 'invalid_id' });
    if (!(prisma as any).driverReminder) return res.status(404).json({ ok: false, error: 'not_found' });

    const updated = await (prisma as any).driverReminder.updateMany({
      where: { id: reminderId, driverId: Number(driverId) },
      data: { read: true },
    });
    if (!updated || updated.count === 0) return res.status(404).json({ ok: false, error: 'not_found' });
    return res.json({ ok: true });
  }

  const normalizedId = String(id).startsWith('notification:')
    ? String(id).slice('notification:'.length)
    : id;
  const r = await markNotificationRead(normalizedId, undefined, driverId);
  if (!r.ok) return res.status(404).json(r);
  return res.json(r);
}) as any);

export default router;

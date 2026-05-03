import { Router } from 'express';
import { AuthedRequest, requireAuth, requireRole } from '../middleware/auth.js';
import { deleteReadNotification, deleteReadNotifications, fetchNotifications, markNotificationRead } from '../services/notifications';

const router = Router();
router.use(requireAuth as any, requireRole('OWNER') as any);

// GET /api/owner/notifications?tab=unread|viewed&page=1&pageSize=20
router.get('/', (async (req: AuthedRequest, res: any) => {
  const ownerId = req.user!.id;
  const tab = req.query.tab === 'viewed' ? 'viewed' : 'unread';
  const page = Number(req.query.page ?? '1');
  const pageSize = Number(req.query.pageSize ?? '20');

  const result = await fetchNotifications({ tab: tab as any, page, pageSize, ownerId });
  return res.json(result);
}) as any);

// POST /api/owner/notifications/:id/mark-read
router.post('/:id/mark-read', (async (req: AuthedRequest, res: any) => {
  const { id } = req.params;
  const ownerId = req.user!.id;
  const r = await markNotificationRead(id, ownerId);
  if (!r.ok) return res.status(404).json(r);
  return res.json(r);
}) as any);

// DELETE /api/owner/notifications/read - delete all read notifications for this owner
router.delete('/read', (async (req: AuthedRequest, res: any) => {
  const ownerId = req.user!.id;
  const r = await deleteReadNotifications({ ownerId });
  if (!r.ok) return res.status(500).json(r);
  return res.json(r);
}) as any);

// DELETE /api/owner/notifications/:id - delete a read notification for this owner
router.delete('/:id', (async (req: AuthedRequest, res: any) => {
  const { id } = req.params;
  const ownerId = req.user!.id;
  const r = await deleteReadNotification(id, ownerId);
  if (!r.ok) return res.status(404).json(r);
  return res.json(r);
}) as any);

export default router;

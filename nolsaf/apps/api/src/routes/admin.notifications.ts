import { Router } from 'express';
import { fetchNotifications, markNotificationRead } from '../services/notifications';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth as any, requireRole('ADMIN') as any);

// GET /api/admin/notifications?tab=unread|viewed&page=1&pageSize=20
router.get('/', async (req, res) => {
  try {
    const tab = req.query.tab === 'viewed' ? 'viewed' : 'unread';
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 20);
    const data = await fetchNotifications({ tab: tab as any, page, pageSize });
    res.json(data);
  } catch (err: any) {
    console.error('GET /api/admin/notifications failed:', err?.message || err);
    // Fail-open with empty list to avoid breaking admin UI
    res.json({ items: [], totalUnread: 0 });
  }
});

// POST /api/admin/notifications/:id/mark-read
router.post('/:id/mark-read', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await markNotificationRead(id);
    if (result.ok) return res.json({ ok: true });
    return res.status(404).json({ ok: false, error: result.error || 'not_found' });
  } catch (err: any) {
    console.error('POST /api/admin/notifications/:id/mark-read failed:', err?.message || err);
    return res.status(200).json({ ok: false, error: String(err?.message || err) });
  }
});

export default router;

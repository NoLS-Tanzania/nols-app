import { Router } from 'express';
import { AuthedRequest, requireAuth, requireRole } from '../middleware/auth.js';
import { fetchOwnerMessages, markMessageRead, markMessageUnread } from '../services/messages';

const router = Router();

router.use(requireAuth as any, requireRole('OWNER') as any);

// GET /api/owner/messages?tab=unread|viewed&page=1&pageSize=20
router.get('/', (async (req: AuthedRequest, res: any) => {
  const ownerId = req.user!.id;
  const tab = req.query.tab === 'viewed' ? 'viewed' : 'unread';
  const page = Number(req.query.page ?? '1');
  const pageSize = Number(req.query.pageSize ?? '20');

  const result = await fetchOwnerMessages({ ownerId, tab: tab as any, page, pageSize });
  return res.json(result);
}) as any);

// POST /api/owner/messages/:id/mark-read
router.post('/:id/mark-read', (async (req: AuthedRequest, res: any) => {
  const { id } = req.params;
  const ownerId = req.user!.id;
  const r = await markMessageRead(id, ownerId);
  if (!r.ok) return res.status(404).json(r);
  return res.json(r);
}) as any);

// POST /api/owner/messages/:id/mark-unread
router.post('/:id/mark-unread', (async (req: AuthedRequest, res: any) => {
  const { id } = req.params;
  const ownerId = req.user!.id;
  const r = await markMessageUnread(id, ownerId);
  if (!r.ok) return res.status(404).json(r);
  return res.json(r);
}) as any);

export default router;

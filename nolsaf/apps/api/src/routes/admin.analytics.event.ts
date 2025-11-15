import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const router = Router();
router.use(requireAuth as any, requireRole("ADMIN") as any);

/** POST /admin/analytics/event */
router.post("/event", async (req, res) => {
  try {
    const { event, payload } = req.body || {};
    // Basic validation
    if (!event) return res.status(400).json({ error: 'missing_event' });

    // For now, just log to console. Replace with DB/queue as needed.
    console.info('[admin-analytics]', { event, payload, at: new Date().toISOString(), user: (req as any).user?.id });

    return res.json({ ok: true });
  } catch (err) {
    console.error('[admin-analytics] error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;

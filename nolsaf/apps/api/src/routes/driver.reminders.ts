import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

// List reminders for the authenticated driver
router.get("/", requireAuth as any, async (req, res) => {
  const user = (req as AuthedRequest).user!;
  try {
    if (!(prisma as any).driverReminder) {
      return res.json([]);
    }
    const items = await (prisma as any).driverReminder.findMany({
      where: { 
        driverId: Number(user.id), 
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] 
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Format reminders for frontend
    const formatted = items.map((r: any) => ({
      id: String(r.id),
      type: r.type || 'INFO',
      message: r.message,
      action: r.action || null,
      actionLink: r.actionLink || null,
      expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString() : null,
      isRead: Boolean(r.read),
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      meta: r.meta || {},
    }));
    
    return res.json(formatted);
  } catch (e) {
    console.warn('driver.reminders: failed to list', e);
    return res.status(500).json({ error: 'Failed to list reminders' });
  }
});

// Create a reminder (admin/system only) - accepts driverId in body
router.post("/", requireAuth as any, async (req, res) => {
  const user = (req as AuthedRequest).user!;
  try {
    // allow only admin/system to create reminders; fallback to 403 if role not ADMIN
    if ((user.role || '').toUpperCase() !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    if (!(prisma as any).driverReminder) return res.status(501).json({ error: 'Reminders not enabled' });
    const { driverId, type, message, action, actionLink, expiresAt, meta } = req.body;
    if (!driverId || !message) return res.status(400).json({ error: 'driverId and message required' });
    const created = await (prisma as any).driverReminder.create({ 
      data: { 
        driverId: Number(driverId), 
        type: type ?? 'INFO', 
        message: String(message), 
        action: action ?? null, 
        actionLink: actionLink ?? null, 
        expiresAt: expiresAt ? new Date(expiresAt) : null, 
        meta: meta ?? null 
      } 
    });
    
    // Emit Socket.IO notification to driver
    const app = (req as any).app;
    const io = app?.get('io');
    if (io && typeof io.emit === 'function') {
      io.to(`driver:${driverId}`).emit('new-reminder', {
        id: String(created.id),
        type: created.type || 'INFO',
        message: created.message,
        action: created.action,
        actionLink: created.actionLink,
        expiresAt: created.expiresAt ? new Date(created.expiresAt).toISOString() : null,
        createdAt: created.createdAt ? new Date(created.createdAt).toISOString() : new Date().toISOString(),
      });
    }
    
    return res.json(created);
  } catch (e) {
    console.warn('driver.reminders: failed to create', e);
    return res.status(500).json({ error: 'Failed to create reminder' });
  }
});

// Mark as read (driver owner or admin)
router.post("/:id/read", requireAuth as any, async (req, res) => {
  const user = (req as AuthedRequest).user!;
  const id = req.params.id;
  try {
    if (!(prisma as any).driverReminder) return res.status(501).json({ error: 'Reminders not enabled' });
    const rec = await (prisma as any).driverReminder.findUnique({ where: { id: String(id) } });
    if (!rec) return res.status(404).json({ error: 'Not found' });
    if (rec.driverId !== Number(user.id) && (user.role || '').toUpperCase() !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const updated = await (prisma as any).driverReminder.update({ where: { id: String(id) }, data: { read: true } });
    return res.json(updated);
  } catch (e) {
    console.warn('driver.reminders: failed to mark read', e);
    return res.status(500).json({ error: 'Failed to mark read' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({ bookings: [] });
});

// Create a booking (public-facing). In dev this is a lightweight stub that returns a bookingId and a booking code.
router.post('/', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    // In a real implementation we'd create DB rows (Booking + CheckinCode). For now return a best-effort stub.
    const bookingId = Date.now();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const resp = { bookingId, code, data: body };
    return res.status(201).json(resp);
  } catch (err) {
    console.error('booking create failed', err);
    return res.status(500).json({ error: 'failed' });
  }
});

export default router;

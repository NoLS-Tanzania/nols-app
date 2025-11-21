import { Router } from 'express';
import { prisma } from '@nolsaf/prisma';
import { hashPassword } from '../lib/crypto.js';

const router = Router();

// Simple in-memory OTP store for dev/testing only
const OTP_TTL_MS = 2 * 60 * 1000; // 2 minutes
const otpStore: Record<string, { otp: string; expiresAt: number; role?: string }> = {};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

// POST /api/auth/send-otp
router.post('/send-otp', (req, res) => {
  const { phone, role } = req.body || {};
  if (!phone) return res.status(400).json({ message: 'phone required' });

  const otp = generateOtp();
  otpStore[phone] = { otp, expiresAt: Date.now() + OTP_TTL_MS, role };
  // Log the OTP to console for development (simulate SMS)
  console.log(`[MOCK SMS] OTP for ${phone}${role ? ` (role=${role})` : ''}: ${otp}`);

  // In development it's useful to return the OTP; remove in production
  const payload: any = { ok: true, message: 'OTP sent' };
  if (process.env.NODE_ENV !== 'production') payload.otp = otp;
  return res.json(payload);
});

// POST /api/auth/verify-otp
router.post('/verify-otp', (req, res) => {
  const { phone, otp, role } = req.body || {};
  if (!phone || !otp) return res.status(400).json({ message: 'phone and otp required' });

  // Development master OTP override — accepts this code regardless of stored value.
  const MASTER_OTP = process.env.DEV_MASTER_OTP || '123456';
  if (String(otp) === MASTER_OTP) {
    // allow even if there's no stored OTP (dev convenience)
    const entry = otpStore[phone] || { role };
    delete otpStore[phone];
    const token = `dev.${Buffer.from(String(phone)).toString('base64')}.token`;
    return res.json({ ok: true, message: 'verified (master otp)', token, user: { id: `u_${Date.now()}`, phone, role: entry.role || role || 'USER' } });
  }

  const entry = otpStore[phone];
  if (!entry) return res.status(400).json({ message: 'no OTP found for this phone' });
  if (Date.now() > entry.expiresAt) {
    delete otpStore[phone];
    return res.status(400).json({ message: 'OTP expired' });
  }
  if (entry.otp !== String(otp)) return res.status(400).json({ message: 'invalid OTP' });
  if (role && entry.role && entry.role !== role) return res.status(400).json({ message: 'role mismatch' });

  // success — remove OTP and return a stub user/token for dev
  delete otpStore[phone];
  const token = `dev.${Buffer.from(String(phone)).toString('base64')}.token`;
  return res.json({ ok: true, message: 'verified', token, user: { id: `u_${Date.now()}`, phone, role: entry.role || role || 'USER' } });
});

router.post('/login', (req, res) => {
  const { email } = req.body;
  // Dummy token
  return res.json({ token: `fake.${Buffer.from(email ?? 'user').toString('base64')}.token`, role: 'USER' });
});

/**
 * POST /api/auth/register
 * Body: { email, name?, phone?, password?, role?: 'USER'|'OWNER'|'DRIVER' }
 * NOTE: ADMIN creation is explicitly forbidden here. This endpoint attempts to create a real user via Prisma, but
 * falls back to a safe stub response if the database/schema isn't ready (local dev mode).
 */
router.post('/register', async (req, res) => {
  const { email, name, phone, password, role } = req.body as any;
  const desiredRole = (role || 'USER').toUpperCase();

  const allowed = ['USER', 'OWNER', 'DRIVER'];
  if (!allowed.includes(desiredRole)) return res.status(400).json({ error: 'invalid role' });

  // For safety, never allow creating ADMIN via this public endpoint
  if (desiredRole === 'ADMIN') return res.status(403).json({ error: 'cannot create admin via public registration' });

  // Try to create a real user if Prisma is available and DB schema matches; otherwise fallback to stub
  try {
    const pwHash = password ? await hashPassword(String(password)) : null;
    const created = await prisma.user.create({
      data: {
        email: String(email),
        name: name ?? null,
        phone: phone ?? null,
        role: desiredRole,
        passwordHash: pwHash ?? null,
      } as any,
      select: { id: true, email: true }
    });
    return res.status(201).json({ id: created.id, email: created.email, role: desiredRole });
  } catch (err) {
    // If Prisma fails (missing schema/enum), log and return a safe response so the public UI can continue working in dev.
    console.warn('Prisma create failed in /api/auth/register (falling back to stub):', err);
    return res.status(201).json({ id: null, email: String(email), role: desiredRole, warning: 'created-stub' });
  }
});

export default router;

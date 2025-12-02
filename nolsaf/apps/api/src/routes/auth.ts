import { Router } from 'express';
import { prisma } from '@nolsaf/prisma';
import { hashPassword } from '../lib/crypto.js';
import crypto from 'crypto';
import { sendMail } from '../lib/mailer.js';
import { sendSms } from '../lib/sms.js';
import { validatePasswordStrength, addPasswordToHistory } from '../lib/security.js';

const router = Router();

// Simple in-memory OTP store for dev/testing only
const OTP_TTL_MS = 2 * 60 * 1000; // 2 minutes
const otpStore: Record<string, { otp: string; expiresAt: number; role?: string }> = {};

// In-memory reset token store (hashedToken -> { userId, expiresAt })
const resetTokenStore: Record<string, { userId: string; expiresAt: number }> = {};

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
router.post('/verify-otp', async (req, res) => {
  const { phone, otp, role } = req.body || {};
  if (!phone || !otp) return res.status(400).json({ message: 'phone and otp required' });

  // Development master OTP override — accepts this code regardless of stored value.
  const MASTER_OTP = process.env.DEV_MASTER_OTP || '123456';
  if (String(otp) === MASTER_OTP) {
    // allow even if there's no stored OTP (dev convenience)
    const entry = otpStore[phone] || { role };
    delete otpStore[phone];

    // If the caller requested a password reset flow, generate a reset token
    if (String(role).toUpperCase() === 'RESET') {
      try {
        const raw = crypto.randomBytes(24).toString('hex');
        const hashed = crypto.createHash('sha256').update(raw).digest('hex');
        const expiresAt = Date.now() + 1000 * 60 * 60; // 1 hour
        // try to persist
        let u: any = null;
        try {
          u = await prisma.user.findFirst({ where: { phone: String(phone) } });
          if (u) {
            await prisma.user.update({ where: { id: u.id }, data: { resetPasswordToken: hashed as any, resetPasswordExpires: new Date(expiresAt) as any } as any });
          } else {
            resetTokenStore[hashed] = { userId: `u_${Date.now()}`, expiresAt };
          }
        } catch (e) {
          resetTokenStore[hashed] = { userId: `u_${Date.now()}`, expiresAt };
        }
        const origin = process.env.WEB_ORIGIN || process.env.APP_ORIGIN || 'http://localhost:3000';
        const resetLink = `${origin}/account/reset-password?token=${raw}&id=${u ? u.id : `u_${Date.now()}`}`;
        const out: any = { ok: true, message: 'verified (master otp)', resetToken: raw, link: resetLink };
        if (process.env.NODE_ENV !== 'production') out.debug = { token: raw, link: resetLink };
        return res.json(out);
      } catch (e) {
        console.warn('failed to generate reset token for master otp', e);
      }
    }

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

  // success — remove OTP
  delete otpStore[phone];

  // If this OTP was requested for reset flow, issue a reset token and return it
  if (String(role).toUpperCase() === 'RESET') {
    try {
      const user = await prisma.user.findFirst({ where: { phone: String(phone) } });
      const raw = crypto.randomBytes(24).toString('hex');
      const hashed = crypto.createHash('sha256').update(raw).digest('hex');
      const expiresAt = Date.now() + 1000 * 60 * 60; // 1 hour
      try {
        if (user) {
          await prisma.user.update({ where: { id: user.id }, data: { resetPasswordToken: hashed as any, resetPasswordExpires: new Date(expiresAt) as any } as any });
        } else {
          resetTokenStore[hashed] = { userId: `u_${Date.now()}`, expiresAt };
        }
      } catch (e) {
        resetTokenStore[hashed] = { userId: user ? String(user.id) : `u_${Date.now()}`, expiresAt };
      }
      const origin = process.env.WEB_ORIGIN || process.env.APP_ORIGIN || 'http://localhost:3000';
      const resetLink = `${origin}/account/reset-password?token=${raw}&id=${user ? user.id : `u_${Date.now()}`}`;
      const out: any = { ok: true, message: 'verified', resetToken: raw, link: resetLink, user: user ? { id: user.id, phone: user.phone } : { id: `u_${Date.now()}`, phone } };
      if (process.env.NODE_ENV !== 'production') out.debug = { token: raw, link: resetLink };
      return res.json(out);
    } catch (e) {
      console.error('failed to create reset token after otp verify', e);
      return res.status(500).json({ message: 'failed' });
    }
  }

  // normal auth flow: return a stub user/token for dev
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

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email, phone } = req.body || {};
  if (!email && !phone) return res.status(400).json({ message: 'email or phone required' });

  try {
    // try to find user by email or phone
    const user = await prisma.user.findFirst({ where: email ? { email: String(email) } : { phone: String(phone) } });
    // Always respond with 200 to avoid user enumeration
    if (!user) {
      return res.json({ ok: true, message: 'If an account exists, an email/SMS has been sent.' });
    }

    // generate raw token and a hashed token for storage
    const raw = crypto.randomBytes(24).toString('hex');
    const hashed = crypto.createHash('sha256').update(raw).digest('hex');
    const expiresAt = Date.now() + 1000 * 60 * 60; // 1 hour

    // Try to persist hashed token to user record if schema allows
    try {
      await prisma.user.update({ where: { id: user.id }, data: { resetPasswordToken: hashed as any, resetPasswordExpires: new Date(expiresAt) as any } as any });
    } catch (e) {
      // fallback to in-memory store
      resetTokenStore[hashed] = { userId: String(user.id), expiresAt };
    }

    // Build reset link
    const origin = process.env.WEB_ORIGIN || process.env.APP_ORIGIN || 'http://localhost:3000';
    const resetLink = `${origin}/account/reset-password?token=${raw}&id=${user.id}`;

    // Send via email if available, otherwise via SMS
    if (user.email) {
      try {
        await sendMail(user.email, 'Password reset', `<p>Click to reset your password: <a href="${resetLink}">${resetLink}</a></p>`);
      } catch (e) {
        console.warn('Failed to send reset email:', e);
      }
    } else if (user.phone) {
      try {
        await sendSms(String(user.phone), `Reset your password: ${resetLink}`);
      } catch (e) {
        console.warn('Failed to send reset SMS:', e);
      }
    }

    const out: any = { ok: true, message: 'If an account exists, an email/SMS has been sent.' };
    if (process.env.NODE_ENV !== 'production') out.debug = { token: raw, link: resetLink };
    return res.json(out);
  } catch (err) {
    console.error('forgot-password error', err);
    return res.status(500).json({ message: 'failed' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, userId, password } = req.body || {};
  if (!token || !userId || !password) return res.status(400).json({ message: 'token, userId and password required' });

  const hashed = crypto.createHash('sha256').update(String(token)).digest('hex');

  try {
    // Check DB first
    let user: any = null;
    try {
      user = await prisma.user.findUnique({ where: { id: userId as any } });
      if (user && user.resetPasswordToken) {
        const dbToken = String(user.resetPasswordToken);
        const expires = user.resetPasswordExpires ? new Date(user.resetPasswordExpires).getTime() : 0;
        if (dbToken !== hashed) return res.status(400).json({ message: 'invalid token' });
        if (Date.now() > expires) return res.status(400).json({ message: 'token expired' });
      } else {
        user = null; // fall back to memory
      }
    } catch (e) {
      user = null;
    }

    // If not persisted, check in-memory store
    if (!user) {
      const rec = resetTokenStore[hashed];
      if (!rec || String(rec.userId) !== String(userId)) return res.status(400).json({ message: 'invalid token' });
      if (Date.now() > rec.expiresAt) { delete resetTokenStore[hashed]; return res.status(400).json({ message: 'token expired' }); }
      // fetch user record to update password
      try { user = await prisma.user.findUnique({ where: { id: userId as any } }); } catch (e) { user = null; }
    }

    if (!user) {
      // no user found, still return generic
      return res.status(400).json({ message: 'invalid token or user' });
    }

    // Validate password strength
    const strength = validatePasswordStrength(String(password));
    if (!strength.valid) return res.status(400).json({ message: 'weak_password', reasons: strength.reasons });

    // Hash and update password
    const pwHash = await hashPassword(String(password));
    try {
      await prisma.user.update({ where: { id: userId as any }, data: { passwordHash: pwHash as any, resetPasswordToken: null as any, resetPasswordExpires: null as any } as any });
    } catch (e) {
      // if DB update fails, still accept but do not persist
      console.warn('Failed to persist new password to DB', e);
    }

    // Update in-memory history if applicable
    try { await addPasswordToHistory(userId, pwHash); } catch (e) { /* ignore */ }

    // Remove in-memory token
    if (resetTokenStore[hashed]) delete resetTokenStore[hashed];

    return res.json({ ok: true, message: 'password reset' });
  } catch (err) {
    console.error('reset-password error', err);
    return res.status(500).json({ message: 'failed' });
  }
});

import { Router } from 'express';
import multer from 'multer';
import { prisma } from '@nolsaf/prisma';
import { hashPassword, verifyPassword } from '../lib/crypto.js';
import crypto from 'crypto';
import { sendMail } from '../lib/mailer.js';
import { sendSms } from '../lib/sms.js';
import { addPasswordToHistory } from '../lib/security.js';
import { validatePasswordWithSettings } from '../lib/securitySettings.js';
import { signUserJwt, setAuthCookie, clearAuthCookie } from '../lib/sessionManager.js';
import { limitOtpSend, limitOtpVerify, limitLoginAttempts } from '../middleware/rateLimit.js';
import { isEmailLocked, recordFailedAttempt, clearFailedAttempts, getRemainingAttempts, getLockoutStatus } from '../lib/loginAttemptTracker.js';
import { debugLog } from "../lib/debugLog.js";
const log = (data: any) => void debugLog(data);

const router = Router();

// Configure multer for file uploads (for profile creation with documents)
const upload = multer({ storage: multer.memoryStorage() });

// Simple in-memory OTP store for dev/testing only
const OTP_TTL_MS = 2 * 60 * 1000; // 2 minutes
const otpStore: Record<string, { otp: string; expiresAt: number; role?: string }> = {};

// In-memory reset token store (hashedToken -> { userId, expiresAt })
const resetTokenStore: Record<string, { userId: string; expiresAt: number }> = {};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

// POST /api/auth/send-otp
// Rate limited: 3 requests per phone number per 15 minutes
router.post('/send-otp', limitOtpSend, (req, res) => {
  const { phone, role } = req.body || {};
  if (!phone) return res.status(400).json({ message: 'phone required' });

  const otp = generateOtp();
  otpStore[phone] = { otp, expiresAt: Date.now() + OTP_TTL_MS, role };
  // Log OTP only in development mode (not in production)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] OTP for ${phone}${role ? ` (role=${role})` : ''}: ${otp}`);
  }

  // In development it's useful to return the OTP; remove in production
  const payload: any = { ok: true, message: 'OTP sent' };
  if (process.env.NODE_ENV !== 'production') payload.otp = otp;
  return res.json(payload);
});

// POST /api/auth/verify-otp
// Rate limited: 10 verification attempts per phone number per 15 minutes
router.post('/verify-otp', limitOtpVerify, async (req, res) => {
  const { phone, otp, role } = req.body || {};
  if (!phone || !otp) return res.status(400).json({ message: 'phone and otp required' });

  // Development master OTP override — accepts this code regardless of stored value.
  // DISABLED in production for security
  const isProduction = process.env.NODE_ENV === 'production';
  const MASTER_OTP = isProduction ? null : (process.env.DEV_MASTER_OTP || '123456');
  if (!isProduction && MASTER_OTP && String(otp) === MASTER_OTP) {
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

    // In dev, still issue a real JWT if possible (so production behavior can be tested locally).
    try {
      const desiredRole = String(entry.role || role || "USER").toUpperCase();
      const allowed = ["USER", "OWNER", "DRIVER", "CUSTOMER", "ADMIN"];
      const safeRole = allowed.includes(desiredRole) ? desiredRole : "USER";
      const user = await prisma.user.upsert({
        where: { phone: String(phone) },
        update: { phoneVerifiedAt: new Date(), role: safeRole },
        create: { phone: String(phone), role: safeRole, phoneVerifiedAt: new Date() } as any,
        select: { id: true, role: true, email: true, phone: true },
      });
      const token = await signUserJwt({ id: user.id, role: user.role, email: user.email });
      await setAuthCookie(res, token, user.role);
      return res.json({ ok: true, message: "verified (master otp)", user: { id: user.id, phone: user.phone, role: user.role } });
    } catch (e: any) {
      // fallback: old stub token in dev
      const token = `dev.${Buffer.from(String(phone)).toString('base64')}.token`;
      return res.json({ ok: true, message: 'verified (master otp)', token, user: { id: `u_${Date.now()}`, phone, role: entry.role || role || 'USER' } });
    }
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

  // Normal auth flow: verify OTP and issue JWT + httpOnly cookie.
  try {
    const desiredRole = String(entry.role || role || "USER").toUpperCase();
    const allowed = ["USER", "OWNER", "DRIVER", "CUSTOMER"];
    const safeRole = allowed.includes(desiredRole) ? desiredRole : "USER";
    const user = await prisma.user.upsert({
      where: { phone: String(phone) },
      update: { phoneVerifiedAt: new Date() },
      create: { phone: String(phone), role: safeRole, phoneVerifiedAt: new Date() } as any,
      select: { id: true, role: true, email: true, phone: true },
    });
    const token = await signUserJwt({ id: user.id, role: user.role, email: user.email });
    await setAuthCookie(res, token, user.role);
    return res.json({ ok: true, message: "verified", user: { id: user.id, phone: user.phone, role: user.role } });
  } catch (e) {
    console.error("verify-otp failed to issue JWT", e);
    return res.status(500).json({ message: "failed" });
  }
});

router.post('/login', (req, res) => {
  return res.status(400).json({ error: "Use POST /api/auth/login-password for email/password login." });
});

// POST /api/auth/login-password
// Body: { email, password }
// Rate limited: 10 login attempts per IP per 15 minutes
router.post("/login-password", limitLoginAttempts, async (req, res) => {
  try {
    // Ensure we always return JSON, even on errors
    res.setHeader('Content-Type', 'application/json');
    
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }
    
    // Check if account is locked
    const lockoutStatus = await isEmailLocked(String(email));
    if (lockoutStatus.locked) {
      const timeRemaining = Math.ceil((lockoutStatus.lockedUntil! - Date.now()) / 1000 / 60); // minutes
      return res.status(423).json({ 
        error: "Account temporarily locked due to too many failed login attempts.",
        message: `Please try again in ${timeRemaining} minute${timeRemaining !== 1 ? 's' : ''}.`,
        code: "ACCOUNT_LOCKED",
        lockedUntil: lockoutStatus.lockedUntil
      });
    }
    
    // Get client IP for tracking
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    let user;
    try {
      user = await prisma.user.findFirst({
      where: { email: String(email) },
      select: { id: true, role: true, email: true, passwordHash: true },
    });
    } catch (dbError: any) {
      // Check if it's a database connection error
      const isConnectionError = 
        dbError?.code === 'P1001' || // Can't reach database server
        dbError?.code === 'P1017' || // Server has closed the connection
        dbError?.message?.includes("Can't reach database server") ||
        dbError?.message?.includes("connect ECONNREFUSED") ||
        dbError?.message?.includes("Connection refused");
      
      console.error("Database connection error:", dbError);
      
      if (isConnectionError) {
        return res.status(503).json({ 
          error: "Database connection unavailable. Please contact support or try again later.",
          code: "DATABASE_UNAVAILABLE"
        });
      }
      
      // Re-throw if it's not a connection error
      throw dbError;
    }
    
    if (!user || !user.passwordHash) {
      // Record failed attempt even if user doesn't exist (prevents email enumeration)
      await recordFailedAttempt(String(email), clientIp);
      const remaining = await getRemainingAttempts(String(email));
      return res.status(401).json({ 
        error: "invalid_credentials",
        remainingAttempts: remaining
      });
    }
    
    // Verify password with error handling
    let ok = false;
    try {
      ok = await verifyPassword(String(user.passwordHash), String(password));
    } catch (verifyError: any) {
      console.error("Password verification error:", verifyError);
      await recordFailedAttempt(String(email), clientIp);
      const remaining = await getRemainingAttempts(String(email));
      return res.status(401).json({ 
        error: "invalid_credentials",
        remainingAttempts: remaining
      });
    }
    
    if (!ok) {
      // Record failed attempt
      await recordFailedAttempt(String(email), clientIp);
      const remaining = await getRemainingAttempts(String(email));
      
      // Check if account is now locked
      const newLockoutStatus = await isEmailLocked(String(email));
      if (newLockoutStatus.locked) {
        const timeRemaining = Math.ceil((newLockoutStatus.lockedUntil! - Date.now()) / 1000 / 60);
        return res.status(423).json({ 
          error: "Account temporarily locked due to too many failed login attempts.",
          message: `Please try again in ${timeRemaining} minute${timeRemaining !== 1 ? 's' : ''}.`,
          code: "ACCOUNT_LOCKED",
          lockedUntil: newLockoutStatus.lockedUntil
        });
      }
      
      return res.status(401).json({ 
        error: "invalid_credentials",
        remainingAttempts: remaining
      });
    }

    // Successful login - clear failed attempts
    await clearFailedAttempts(String(email));

    // Generate JWT token with error handling
    let token: string;
    try {
      token = await signUserJwt({ id: user.id, role: user.role, email: user.email });
    } catch (tokenError: any) {
      console.error("JWT token generation error:", tokenError);
      return res.status(500).json({ error: "Failed to generate authentication token" });
    }

    // Set auth cookie with error handling
    try {
      await setAuthCookie(res, token, user.role);
    } catch (cookieError: any) {
      console.error("Cookie setting error:", cookieError);
      // Token was generated, so we can still return success even if cookie fails
      // The token is in the response body
    }

    return res.status(200).json({ ok: true, user: { id: user.id, role: user.role, email: user.email } });
  } catch (e: any) {
    console.error("login-password failed", e);
    console.error("Error details:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      name: e?.name,
    });
    
    // Ensure JSON response header is set
    res.setHeader('Content-Type', 'application/json');
    
    // Check for database connection errors in the outer catch as well
    const isConnectionError = 
      e?.code === 'P1001' ||
      e?.code === 'P1017' ||
      e?.message?.includes("Can't reach database server") ||
      e?.message?.includes("connect ECONNREFUSED") ||
      e?.message?.includes("Connection refused");
    
    if (isConnectionError) {
      return res.status(503).json({ 
        error: "Database connection unavailable. Please contact support or try again later.",
        code: "DATABASE_UNAVAILABLE"
      });
    }
    
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? "Login failed. Please try again." 
      : (e?.message || String(e) || "Login failed");
    return res.status(500).json({ error: errorMessage });
  }
});

// POST /api/auth/logout
router.post("/logout", async (_req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

/**
 * POST /api/auth/register
 * Body: { email, name?, phone?, password?, role?: 'USER'|'OWNER'|'DRIVER' }
 * NOTE: ADMIN creation is explicitly forbidden here. This endpoint attempts to create a real user via Prisma, but
 * falls back to a safe stub response if the database/schema isn't ready (local dev mode).
 */
router.post('/register', async (req, res) => {
  const { email, name, phone, password, role, referralCode } = req.body as any;
  const desiredRole = (role || 'USER').toUpperCase();

  const allowed = ['USER', 'OWNER', 'DRIVER'];
  if (!allowed.includes(desiredRole)) return res.status(400).json({ error: 'invalid role' });

  // For safety, never allow creating ADMIN via this public endpoint
  if (desiredRole === 'ADMIN') return res.status(403).json({ error: 'cannot create admin via public registration' });

  // Get Socket.IO instance from app
  const io: any = (req as any).app?.get?.('io');

  // Try to create a real user if Prisma is available and DB schema matches; otherwise fallback to stub
  try {
    // Check for referral code and find referring driver
    let referredBy: string | number | null = null;
    if (referralCode) {
      try {
        // Extract driver ID from referral code (format: DRIVER-XXXXXX)
        const match = String(referralCode).match(/^DRIVER-(\d+)$/i);
        if (match) {
          referredBy = parseInt(match[1], 10);
          // Verify the driver exists
          const driver = await prisma.user.findUnique({ where: { id: referredBy, role: 'DRIVER' } as any });
          if (!driver) {
            referredBy = null; // Invalid referral code
          }
        }
      } catch (e) {
        console.warn('Failed to process referral code', referralCode, e);
      }
    }

    const pwHash = password ? await hashPassword(String(password)) : null;
    const created = await prisma.user.create({
      data: {
        email: String(email),
        name: name ?? null,
        phone: phone ?? null,
        role: desiredRole,
        passwordHash: pwHash ?? null,
        referredBy: referredBy as any,
        referralCode: referralCode || null,
      } as any,
      select: { id: true, email: true, name: true, phone: true, role: true }
    });

    // Emit Socket.IO notification to referring driver if applicable
    if (referredBy && io) {
      try {
        // Emit notification to driver immediately
        io.to(`driver:${referredBy}`).emit('referral-notification', {
          type: 'new_referral',
          message: `${created.name || created.email || 'Someone'} just registered using your referral link!`,
          referralData: {
            userId: created.id,
            name: created.name,
            email: created.email,
            role: desiredRole,
            registeredAt: new Date().toISOString(),
          }
        });

        // Emit full referral update (will trigger frontend to refresh data)
        io.to(`driver:${referredBy}`).emit('referral-update', {
          driverId: referredBy,
          timestamp: Date.now(),
          action: 'new_referral',
        });
      } catch (e) {
        console.warn('Failed to emit referral notification', e);
      }
    }

    return res.status(201).json({ id: created.id, email: created.email, role: desiredRole });
  } catch (err) {
    // If Prisma fails (missing schema/enum), log and return a safe response so the public UI can continue working in dev.
    console.warn('Prisma create failed in /api/auth/register (falling back to stub):', err);
    return res.status(201).json({ id: null, email: String(email), role: desiredRole, warning: 'created-stub' });
  }
});

/**
 * POST /api/auth/profile
 * Creates or updates user profile after OTP verification and onboarding
 * Body: FormData with role, name, email, and optional referralCode
 */
router.post('/profile', upload.any(), async (req, res) => {
  try {
    // Parse form data (multer handles multipart/form-data)
    const body = req.body;
    const { role, name, email, referralCode } = body;
    
    // Get user from token (Authorization: Bearer OR httpOnly cookie)
    const token =
      req.headers.authorization?.replace('Bearer ', '') ||
      (() => {
        const raw = req.headers.cookie || "";
        const part = raw.split(";").map((s) => s.trim()).find((s) => s.startsWith("nolsaf_token="));
        if (!part) return "";
        return decodeURIComponent(part.slice("nolsaf_token=".length));
      })();
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get Socket.IO instance from app
    const io: any = (req as any).app?.get?.('io');

    // For now, decode token to get user ID (simplified - in production use proper JWT verification)
    let userId: string | number | null = null;
    try {
      if (token.startsWith('dev.')) {
        const decoded = Buffer.from(token.split('.')[1], 'base64').toString();
        // Extract user ID from session or create user
        // This is a simplified flow - in production you'd have proper user creation
        const existingUser = await prisma.user.findFirst({ 
          where: { email: String(email) } 
        });
        if (existingUser) {
          userId = existingUser.id;
        }
      }
    } catch (e) {
      console.warn('Failed to decode token', e);
    }

    // Check for referral code and find referring driver
    let referredBy: string | number | null = null;
    if (referralCode) {
      try {
        // Extract driver ID from referral code (format: DRIVER-XXXXXX)
        const match = String(referralCode).match(/^DRIVER-(\d+)$/i);
        if (match) {
          referredBy = parseInt(match[1], 10);
          // Verify the driver exists
          const driver = await prisma.user.findUnique({ where: { id: referredBy, role: 'DRIVER' } as any });
          if (!driver) {
            referredBy = null; // Invalid referral code
          }
        }
      } catch (e) {
        console.warn('Failed to process referral code', referralCode, e);
      }
    }

    // Update or create user with referral information
    let updatedUser: any = null;
    if (userId) {
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name: String(name),
          email: String(email),
          referredBy: referredBy as any,
          referralCode: referralCode || null,
        } as any,
        select: { id: true, email: true, name: true, role: true }
      });
    } else {
      // If user doesn't exist, create it (fallback)
      updatedUser = await prisma.user.create({
        data: {
          email: String(email),
          name: String(name),
          role: (role || 'USER').toUpperCase(),
          referredBy: referredBy as any,
          referralCode: referralCode || null,
        } as any,
        select: { id: true, email: true, name: true, role: true }
      });
    }

    // Emit Socket.IO notification to referring driver if applicable
    if (referredBy && io && updatedUser) {
      try {
        // Emit notification to driver immediately
        io.to(`driver:${referredBy}`).emit('referral-notification', {
          type: 'new_referral',
          message: `${updatedUser.name || updatedUser.email || 'Someone'} just registered using your referral link!`,
          referralData: {
            userId: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            registeredAt: new Date().toISOString(),
          }
        });

        // Emit full referral update (will trigger frontend to refresh data)
        io.to(`driver:${referredBy}`).emit('referral-update', {
          driverId: referredBy,
          timestamp: Date.now(),
          action: 'new_referral',
        });
      } catch (e) {
        console.warn('Failed to emit referral notification', e);
      }
    }

    return res.json({ ok: true, user: updatedUser });
  } catch (err: any) {
    console.error('Failed to save profile', err);
    return res.status(500).json({ error: 'Failed to save profile', message: err.message });
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

    // Validate password strength using SystemSetting configuration
    const strength = await validatePasswordWithSettings(String(password), user?.role);
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

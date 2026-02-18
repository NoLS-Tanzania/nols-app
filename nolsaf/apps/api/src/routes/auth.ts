import { Router } from 'express';
import multer from 'multer';
import { prisma } from '@nolsaf/prisma';
import { hashPassword, verifyPassword } from '../lib/crypto.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { sendMail } from '../lib/mailer.js';
import { sendSms } from '../lib/sms.js';
import { addPasswordToHistory } from '../lib/security.js';
import { validatePasswordWithSettings } from '../lib/securitySettings.js';
import { getRoleSessionMaxMinutes } from '../lib/securitySettings.js';
import { signUserJwt, setAuthCookie, clearAuthCookie } from '../lib/sessionManager.js';
import { audit } from '../lib/audit.js';
import { hashCode } from '../lib/otp.js';
import { maybeAuth, requireAuth } from '../middleware/auth.js';
import { limitOtpSend, limitOtpVerify, limitLoginAttempts, limitRegisterAttempts } from '../middleware/rateLimit.js';
import { isEmailLocked, recordFailedAttempt, clearFailedAttempts, getRemainingAttempts, getLockoutStatus } from '../lib/loginAttemptTracker.js';
import { asyncHandler } from '../middleware/errorHandler.js';

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

function maskOtp(code: string): string {
  const s = String(code || "");
  if (s.length <= 2) return "••••••";
  return `••••${s.slice(-2)}`;
}

function otpEntityKey(destinationType: "PHONE" | "EMAIL", destination: string, codeHash: string): string {
  // Encode enough to support string filtering in admin dashboards without JSON queries.
  return `OTP:${destinationType}:${destination}:${codeHash}`;
}

function normalizePhoneForAuth(input: string): string {
  let cleaned = String(input || '').trim();
  if (!cleaned) return '';
  cleaned = cleaned.replace(/[^\d+]/g, '');

  // Convert 00-prefixed international numbers to +
  if (cleaned.startsWith('00')) cleaned = `+${cleaned.slice(2)}`;

  if (cleaned.startsWith('+')) return cleaned;

  // Default to Tanzania (+255) unless overridden
  const defaultCallingCode = String(process.env.DEFAULT_COUNTRY_CALLING_CODE || '255').replace(/\D/g, '') || '255';
  if (cleaned.startsWith(defaultCallingCode)) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+${defaultCallingCode}${cleaned.slice(1)}`;
  return `+${defaultCallingCode}${cleaned}`;
}

function normalizeSignupRole(input: any): 'CUSTOMER' | 'OWNER' | 'DRIVER' | 'RESET' | null {
  const v = String(input ?? '').trim().toUpperCase();
  if (!v) return null;
  if (v === 'RESET') return 'RESET';
  if (v === 'OWNER') return 'OWNER';
  if (v === 'DRIVER') return 'DRIVER';
  if (v === 'TRAVELLER' || v === 'TRAVELER' || v === 'USER' || v === 'CUSTOMER') return 'CUSTOMER';
  return null;
}

function getJwtSecret(): string {
  return (
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV !== 'production' ? (process.env.DEV_JWT_SECRET || 'dev_jwt_secret') : '')
  );
}

function getTokenFromReq(req: any): string | null {
  const authHeader = req?.headers?.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  const cookieHeader = req?.headers?.cookie;
  if (!cookieHeader || typeof cookieHeader !== 'string') return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (!key) continue;
    const value = part.slice(idx + 1).trim();
    if (key === 'nolsaf_token' || key === '__Host-nolsaf_token' || key === 'token' || key === '__Host-token') {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}

// GET /api/auth/session
// Returns countdown metadata for the current session.
router.get(
  '/session',
  requireAuth,
  asyncHandler(async (req: any, res) => {
    const token = getTokenFromReq(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const decoded = jwt.decode(token) as any;
    const issuedAtSec = typeof decoded?.iat === 'number' ? decoded.iat : Number(decoded?.iat);
    const expSec = typeof decoded?.exp === 'number' ? decoded.exp : Number(decoded?.exp);
    if (!Number.isFinite(issuedAtSec) || issuedAtSec <= 0) {
      return res.status(200).json({ ok: true, nowSec: Math.floor(Date.now() / 1000), expiresAt: null, remainingSec: null });
    }

    const role = String(req?.user?.role || '').toUpperCase();
    const roleMaxMinutes = await getRoleSessionMaxMinutes(role || null);
    const dynamicExpSec = issuedAtSec + roleMaxMinutes * 60;
    const effectiveExpSec = Number.isFinite(expSec) && expSec > 0 ? Math.min(expSec, dynamicExpSec) : dynamicExpSec;

    const nowSec = Math.floor(Date.now() / 1000);
    const remainingSec = Math.max(0, Math.floor(effectiveExpSec - nowSec));
    return res.json({
      ok: true,
      nowSec,
      expiresAt: new Date(effectiveExpSec * 1000).toISOString(),
      remainingSec,
      roleMaxMinutes,
    });
  })
);

// POST /api/auth/send-otp
// Rate limited: 3 requests per phone number per 15 minutes
router.post('/send-otp', limitOtpSend, async (req, res) => {
  const { phone, role } = req.body || {};
  if (!phone) return res.status(400).json({ message: 'phone required' });

  const normalizedPhone = normalizePhoneForAuth(String(phone));
  if (!normalizedPhone) return res.status(400).json({ message: 'phone required' });

  const normalizedRole = normalizeSignupRole(role);

  // If no role is provided, treat this as a LOGIN OTP request.
  // In this flow, the phone number must already belong to an existing account.
  if (!normalizedRole) {
    try {
      const existing = await prisma.user.findFirst({
        where: { phone: normalizedPhone },
        select: { id: true },
      });
      if (!existing) {
        return res.status(404).json({
          error: 'account_not_found',
          message: 'No account found for this phone number. Please register first.',
          action: 'register',
        });
      }
    } catch {
      return res.status(503).json({
        error: 'database_unavailable',
        message: 'Unable to send OTP right now. Please try again.',
      });
    }
  }

  // Policy: once a phone is verified during registration, do not allow a new registration.
  // Allow OTP for RESET flow (forgot password).
  if (normalizedRole && normalizedRole !== 'RESET') {
    try {
      const existing = await prisma.user.findFirst({
        where: { phone: normalizedPhone },
        select: { id: true, phoneVerifiedAt: true },
      });
      if (existing?.phoneVerifiedAt) {
        return res.status(409).json({
          error: 'phone_already_registered',
          message: 'This phone number already has an account. Please login or use forgot password to access it.',
          action: 'login_or_forgot_password',
        });
      }
    } catch {
      // If the DB is temporarily unavailable, continue with OTP send.
    }
  }

  const otp = generateOtp();
  otpStore[normalizedPhone] = { otp, expiresAt: Date.now() + OTP_TTL_MS, role: normalizedRole || undefined };
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  const codeHash = hashCode(String(otp));
  const entity = otpEntityKey("PHONE", normalizedPhone, codeHash);

  // Log OTP only in development mode (not in production)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] OTP for ${normalizedPhone}${normalizedRole ? ` (role=${normalizedRole})` : ''}: ${otp}`);
  }

  const smsText = `Your NoLSAF verification code is ${otp}`;
  const smsResult = await sendSms(normalizedPhone, smsText);
  if (process.env.NODE_ENV === 'production' && !smsResult?.success) {
    return res.status(502).json({ error: 'sms_failed', message: 'Failed to send OTP. Please try again.' });
  }

  // Audit for Management/No4P OTP tracking.
  // Never store raw OTP codes in audit logs.
  try {
    let userName: string | null = null;
    let userRole: string | null = null;
    try {
      const existing = await prisma.user.findFirst({
        where: { phone: normalizedPhone },
        select: { name: true, role: true },
      });
      userName = existing?.name ?? null;
      userRole = (existing?.role as any) ?? null;
    } catch {
      // ignore lookup failures
    }
    await audit(req, "NO4P_OTP_SENT", entity, null, {
      destinationType: "PHONE",
      destination: normalizedPhone,
      codeHash,
      codeMasked: maskOtp(otp),
      expiresAt: expiresAt.toISOString(),
      usedFor: normalizedRole === "RESET" ? "AUTH_RESET" : normalizedRole ? "AUTH_SIGNUP" : "AUTH_LOGIN",
      provider: smsResult?.provider ?? null,
      userRole,
      userName,
      policyCompliant: true,
    });
  } catch {
    // swallow
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

  const normalizedPhone = normalizePhoneForAuth(String(phone));
  if (!normalizedPhone) return res.status(400).json({ message: 'phone and otp required' });

  const requestedRole = normalizeSignupRole(role);

  // Development master OTP override — accepts this code regardless of stored value.
  // DISABLED in production for security
  const isProduction = process.env.NODE_ENV === 'production';
  const MASTER_OTP = isProduction ? null : (process.env.DEV_MASTER_OTP || '123456');
  if (!isProduction && MASTER_OTP && String(otp) === MASTER_OTP) {
    // allow even if there's no stored OTP (dev convenience)
    const entry = otpStore[normalizedPhone] || { role: requestedRole || undefined };
    delete otpStore[normalizedPhone];

    const storedRole = normalizeSignupRole(entry.role);
    const effectiveRole = storedRole || requestedRole;

    // If the caller requested a password reset flow, generate a reset token
    if (effectiveRole === 'RESET') {
      try {
        const raw = crypto.randomBytes(24).toString('hex');
        const hashed = crypto.createHash('sha256').update(raw).digest('hex');
        const expiresAt = Date.now() + 1000 * 60 * 60; // 1 hour
        // try to persist
        let u: any = null;
        try {
          u = await prisma.user.findFirst({ where: { phone: normalizedPhone } });
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
      const safeRole = (effectiveRole || 'CUSTOMER') as 'CUSTOMER' | 'OWNER' | 'DRIVER';
      const user = await prisma.user.upsert({
        where: { phone: normalizedPhone },
        update: { phoneVerifiedAt: new Date() },
        create: { phone: normalizedPhone, role: safeRole, phoneVerifiedAt: new Date() } as any,
        select: { id: true, role: true, email: true, phone: true },
      });
      const token = await signUserJwt({ id: user.id, role: user.role, email: user.email });
      await setAuthCookie(res, token, user.role);
      return res.json({ ok: true, message: "verified (master otp)", user: { id: user.id, phone: user.phone, role: user.role } });
    } catch (e: any) {
      console.error("verify-otp (master otp) failed to issue JWT", e);
      return res.status(503).json({ error: 'database_unavailable', message: 'Unable to create account right now.' });
    }
  }

  const entry = otpStore[normalizedPhone];
  if (!entry) {
    try {
      const codeHash = hashCode(String(otp));
      const entity = otpEntityKey("PHONE", normalizedPhone, codeHash);
      await audit(req, "NO4P_OTP_VERIFY_FAILED", entity, null, {
        destinationType: "PHONE",
        destination: normalizedPhone,
        codeHash,
        usedFor: requestedRole === "RESET" ? "AUTH_RESET" : requestedRole ? "AUTH_SIGNUP" : "AUTH_LOGIN",
        reason: "no_otp",
      });
    } catch {
      // swallow
    }
    return res.status(400).json({ message: 'no OTP found for this phone' });
  }
  if (Date.now() > entry.expiresAt) {
    try {
      const codeHash = hashCode(String(otp));
      const entity = otpEntityKey("PHONE", normalizedPhone, codeHash);
      await audit(req, "NO4P_OTP_VERIFY_FAILED", entity, null, {
        destinationType: "PHONE",
        destination: normalizedPhone,
        codeHash,
        usedFor: requestedRole === "RESET" ? "AUTH_RESET" : requestedRole ? "AUTH_SIGNUP" : "AUTH_LOGIN",
        reason: "expired",
      });
    } catch {
      // swallow
    }
    delete otpStore[normalizedPhone];
    return res.status(400).json({ message: 'OTP expired' });
  }
  if (entry.otp !== String(otp)) {
    try {
      const codeHash = hashCode(String(otp));
      const entity = otpEntityKey("PHONE", normalizedPhone, codeHash);
      await audit(req, "NO4P_OTP_VERIFY_FAILED", entity, null, {
        destinationType: "PHONE",
        destination: normalizedPhone,
        codeHash,
        usedFor: requestedRole === "RESET" ? "AUTH_RESET" : requestedRole ? "AUTH_SIGNUP" : "AUTH_LOGIN",
        reason: "invalid",
      });
    } catch {
      // swallow
    }
    return res.status(400).json({ message: 'invalid OTP' });
  }

  const storedRole = normalizeSignupRole(entry.role);
  if (requestedRole && storedRole && requestedRole !== storedRole) {
    return res.status(400).json({ message: 'role mismatch' });
  }

  // success — remove OTP
  delete otpStore[normalizedPhone];

  const effectiveRole = storedRole || requestedRole;

  // LOGIN OTP flow: no role was provided/stored, so this must authenticate an existing account.
  // Do NOT create users in the login flow.
  if (!effectiveRole) {
    try {
      const existing = await prisma.user.findFirst({
        where: { phone: normalizedPhone },
        select: { id: true, role: true, email: true, phone: true },
      });
      if (!existing) {
        return res.status(404).json({
          error: 'account_not_found',
          message: 'No account found for this phone number. Please register first.',
          action: 'register',
        });
      }

      // Mark phone as verified on successful login OTP.
      try {
        await prisma.user.update({
          where: { id: existing.id },
          data: { phoneVerifiedAt: new Date() },
        });
      } catch {
        // ignore update failures; login can still proceed
      }

      const token = await signUserJwt({ id: existing.id, role: existing.role as any, email: existing.email });
      await setAuthCookie(res, token, existing.role as any);
      return res.json({
        ok: true,
        message: 'verified',
        user: { id: existing.id, phone: existing.phone, role: existing.role },
      });
    } catch (e) {
      console.error('verify-otp login flow failed', e);
      return res.status(503).json({ error: 'database_unavailable', message: 'Unable to login right now.' });
    }
  }

  try {
    const codeHash = hashCode(String(otp));
    const entity = otpEntityKey("PHONE", normalizedPhone, codeHash);
    await audit(req, "NO4P_OTP_USED", entity, null, {
      destinationType: "PHONE",
      destination: normalizedPhone,
      codeHash,
      usedAt: new Date().toISOString(),
      usedFor: effectiveRole === "RESET" ? "AUTH_RESET" : "AUTH_SIGNUP",
      policyCompliant: true,
    });
  } catch {
    // swallow
  }

  // If this OTP was requested for reset flow, issue a reset token and return it
  if (effectiveRole === 'RESET') {
    try {
      const user = await prisma.user.findFirst({ where: { phone: normalizedPhone } });
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
    const safeRole = (effectiveRole || 'CUSTOMER') as 'CUSTOMER' | 'OWNER' | 'DRIVER';
    const user = await prisma.user.upsert({
      where: { phone: normalizedPhone },
      update: { phoneVerifiedAt: new Date() },
      create: { phone: normalizedPhone, role: safeRole, phoneVerifiedAt: new Date() } as any,
      select: { id: true, role: true, email: true, phone: true },
    });
    const token = await signUserJwt({ id: user.id, role: user.role, email: user.email });
    await setAuthCookie(res, token, user.role);
    return res.json({ ok: true, message: "verified", user: { id: user.id, phone: user.phone, role: user.role } });
  } catch (e) {
    console.error("verify-otp failed to issue JWT", e);
    return res.status(503).json({ error: 'database_unavailable', message: "Unable to create account right now." });
  }
});

router.post('/login', (req, res) => {
  return res.status(400).json({ error: "Use POST /api/auth/login-password for email/password login." });
});

// POST /api/auth/login-password
// Body: { email, password }
// Rate limited: 10 login attempts per IP per 15 minutes

// Register the route with rate limiting and async error handling
router.post("/login-password", limitLoginAttempts, asyncHandler(async (req, res, next) => {
    // Ensure we always return JSON, even on errors
    res.setHeader('Content-Type', 'application/json');
  
  try {
    
    const { email, password } = req.body || {};
    const identifier = String(email || '').trim();
    if (!identifier || !password) {
      return res.status(400).json({ error: "email and password required" });
    }
    
    // Check if account is locked
    let lockoutStatus;
    try {
      lockoutStatus = await isEmailLocked(identifier);
    } catch (lockoutError: any) {
      console.error('[LOGIN] Error checking lockout status:', lockoutError);
      // Default to not locked on error
      lockoutStatus = { locked: false, lockedUntil: null };
    }
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
      const phoneCandidates = (() => {
        const v = identifier;
        const out: string[] = [];
        out.push(v);
        if (/^\d+$/.test(v) && v.length <= 12) out.push(`+255${v}`);
        if (v.startsWith('0') && /^\d+$/.test(v.slice(1))) out.push(`+255${v.slice(1)}`);
        return Array.from(new Set(out));
      })();

      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier },
            { name: identifier },
            ...phoneCandidates.map((p) => ({ phone: p } as any)),
          ] as any,
        } as any,
        select: { id: true, role: true, email: true, passwordHash: true },
      });
    } catch (dbError: any) {
      console.error('[LOGIN] Database query error:', dbError);
      // Check if it's a database connection error
      const isConnectionError = 
        dbError?.code === 'P1001' || // Can't reach database server
        dbError?.code === 'P1017' || // Server has closed the connection
        dbError?.message?.includes("Can't reach database server") ||
        dbError?.message?.includes("connect ECONNREFUSED") ||
        dbError?.message?.includes("Connection refused");
      
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
      try {
        await recordFailedAttempt(identifier, clientIp);
      } catch (err) {
        console.error('[LOGIN] Failed to record failed attempt:', err);
      }
      let remaining = 5; // Default
      try {
        remaining = await getRemainingAttempts(identifier);
      } catch (err) {
        console.error('[LOGIN] Failed to get remaining attempts:', err);
      }
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
      try {
        await recordFailedAttempt(identifier, clientIp);
      } catch (err) {
        console.error('[LOGIN] Failed to record failed attempt:', err);
      }

      // Audit failed login attempt for known user (best-effort)
      try {
        ;(req as any).user = user
        await audit(req, "USER_LOGIN", `user:${user.id}`, null, {
          role: user.role,
          email: user.email,
          loginMethod: "password",
          event: "login",
          success: false,
          error: "verify_error",
        })
      } catch {
        /* ignore */
      }

      let remaining = 5; // Default
      try {
        remaining = await getRemainingAttempts(identifier);
      } catch (err) {
        console.error('[LOGIN] Failed to get remaining attempts:', err);
      }
      return res.status(401).json({ 
        error: "invalid_credentials",
        remainingAttempts: remaining
      });
    }
    
    if (!ok) {
      // Record failed attempt
      try {
        await recordFailedAttempt(identifier, clientIp);
      } catch (err) {
        console.error('[LOGIN] Failed to record failed attempt:', err);
      }

      // Audit failed login attempt for known user (best-effort)
      try {
        ;(req as any).user = user
        await audit(req, "USER_LOGIN", `user:${user.id}`, null, {
          role: user.role,
          email: user.email,
          loginMethod: "password",
          event: "login",
          success: false,
          error: "invalid_credentials",
        })
      } catch {
        /* ignore */
      }

      let remaining = 5; // Default
      try {
        remaining = await getRemainingAttempts(identifier);
      } catch (err) {
        console.error('[LOGIN] Failed to get remaining attempts:', err);
      }
      
      // Check if account is now locked
      let newLockoutStatus;
      try {
        newLockoutStatus = await isEmailLocked(identifier);
      } catch (err) {
        console.error('[LOGIN] Failed to check lockout status:', err);
        newLockoutStatus = { locked: false, lockedUntil: null };
      }
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
    try {
      await clearFailedAttempts(identifier);
    } catch (err) {
      console.error('[LOGIN] Failed to clear failed attempts:', err);
      // Continue - don't block successful login
    }

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

    // Audit successful login
    try {
      // `audit()` derives actorId/actorRole from `req.user`. During login, middleware
      // has not attached a user yet, so explicitly attach for attribution.
      ;(req as any).user = user
      await audit(req, "USER_LOGIN", `user:${user.id}`, null, { 
        role: user.role,
        email: user.email,
        loginMethod: 'password',
        event: 'login',
        success: true,
      });
    } catch (auditError) {
      // Don't block login if audit fails
      console.warn("Failed to audit login:", auditError);
    }

    return res.status(200).json({ ok: true, user: { id: user.id, role: user.role, email: user.email } });
  } catch (e: any) {
    console.error("[LOGIN] login-password failed", e);
    
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
    
    // Return detailed error in development
    const errorResponse: any = { error: errorMessage };
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.details = {
        message: e?.message,
        name: e?.name,
        code: e?.code,
      };
    }
    
    // Check if response already sent
    if (res.headersSent) {
      return;
    }
    
    try {
    return res.status(500).json(errorResponse);
    } catch (sendError: any) {
      console.error("[LOGIN] Failed to send error response:", sendError);
      // If we can't send response, pass to Express error handler
      next(e);
    }
  }
}));

// POST /api/auth/logout
// Use maybeAuth to optionally extract user for audit logging
function safeNextPath(raw: any): string {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v) return "/account/login";
  // Only allow same-site relative paths (avoid open redirects)
  if (!v.startsWith("/") || v.startsWith("//")) return "/account/login";
  return v;
}

// GET /api/auth/logout?next=/account/login
// Useful for reliable cookie clearing via top-level navigation.
router.get("/logout", maybeAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (userId) {
      const u = (req as any).user
      await audit(req, "USER_LOGOUT", `user:${userId}`, null, {
        role: u?.role ?? null,
        email: u?.email ?? null,
        event: "logout",
        success: true,
        logoutMethod: "manual",
        via: "GET",
      });
    }
  } catch (auditError) {
    console.warn("Failed to audit logout:", auditError);
  }

  clearAuthCookie(res);
  const next = safeNextPath((req as any)?.query?.next);
  return res.redirect(302, next);
});

router.post("/logout", maybeAuth, async (req, res) => {
  // Audit logout if user is authenticated
  try {
    const userId = (req as any).user?.id;
    if (userId) {
      const u = (req as any).user
      await audit(req, "USER_LOGOUT", `user:${userId}`, null, { 
        role: u?.role ?? null,
        email: u?.email ?? null,
        event: "logout",
        success: true,
        logoutMethod: 'manual'
      });
    }
  } catch (auditError) {
    // Don't block logout if audit fails
    console.warn("Failed to audit logout:", auditError);
  }
  
  clearAuthCookie(res);
  return res.json({ ok: true });
});

/**
 * POST /api/auth/register
 * Body: { email, name?, phone?, password, role?: 'CUSTOMER'|'OWNER'|'DRIVER'|'USER'|'TRAVELLER' }
 * NOTE: ADMIN creation is explicitly forbidden here. Registration must be DB-backed (no stub fallback).
 */
router.post('/register', limitRegisterAttempts, async (req, res) => {
  const { email, name, phone, password, role, referralCode, tin, address, vehicleMake, vehiclePlate, licenseNumber } = req.body as any;

  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) return res.status(400).json({ error: 'invalid email' });
  if (!password || String(password).length < 1) return res.status(400).json({ error: 'password required' });

  const desiredRole = normalizeSignupRole(role) || 'CUSTOMER';
  if (desiredRole === 'RESET') return res.status(400).json({ error: 'invalid role' });

  const normalizedPhone = phone ? normalizePhoneForAuth(String(phone)) : null;
  if (phone && !normalizedPhone) return res.status(400).json({ error: 'invalid_phone' });

  // Get Socket.IO instance from app
  const io: any = (req as any).app?.get?.('io');

  try {
    // Policy: once an email is verified (or already in use), do not allow a new registration.
    // Users must login or use forgot-password.
    const existingByEmail = await prisma.user.findFirst({
      where: { email: cleanEmail },
      select: { id: true, emailVerifiedAt: true },
    });
    if (existingByEmail?.emailVerifiedAt) {
      return res.status(409).json({
        error: 'email_already_registered',
        message: 'This email already has an account. Please login or use forgot password to access it.',
        action: 'login_or_forgot_password',
      });
    }
    if (existingByEmail) {
      return res.status(409).json({
        error: 'email_already_in_use',
        message: 'This email is already linked to an account. Please login or use forgot password.',
        action: 'login_or_forgot_password',
      });
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

    const strength = await validatePasswordWithSettings(String(password), desiredRole);
    if (!strength.valid) return res.status(400).json({ error: 'weak_password', reasons: strength.reasons });

    // Policy: disallow registering a second account with an already-verified phone.
    if (normalizedPhone) {
      const existingByPhone = await prisma.user.findFirst({
        where: { phone: normalizedPhone },
        select: { id: true, phoneVerifiedAt: true },
      });
      if (existingByPhone?.phoneVerifiedAt) {
        return res.status(409).json({
          error: 'phone_already_registered',
          message: 'This phone number already has an account. Please login or use forgot password to access it.',
          action: 'login_or_forgot_password',
        });
      }
      // Even if not verified, the unique constraint will block duplicates; return a clearer message.
      if (existingByPhone) {
        return res.status(409).json({
          error: 'phone_already_in_use',
          message: 'This phone number is already linked to an account. Please login or use forgot password.',
          action: 'login_or_forgot_password',
        });
      }
    }

    const pwHash = await hashPassword(String(password));
    const created = await prisma.user.create({
      data: {
        email: cleanEmail,
        name: name ?? null,
        phone: normalizedPhone ?? null,
        role: desiredRole,
        passwordHash: pwHash,
        ...(desiredRole === 'OWNER'
          ? {
              tin: typeof tin === 'string' ? tin : null,
              address: typeof address === 'string' ? address : null,
            }
          : {}),
        ...(desiredRole === 'DRIVER'
          ? {
              vehicleMake: typeof vehicleMake === 'string' ? vehicleMake : null,
              vehiclePlate: typeof vehiclePlate === 'string' ? vehiclePlate : null,
              licenseNumber: typeof licenseNumber === 'string' ? licenseNumber : null,
            }
          : {}),
        referredBy: referredBy as any,
        referralCode: referralCode || null,
      } as any,
      select: { id: true, email: true, name: true, phone: true, role: true }
    });

    try {
      await addPasswordToHistory(created.id, pwHash);
    } catch {
      // ignore
    }

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

    return res.status(201).json({ ok: true, id: created.id, email: created.email, role: created.role });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      const target = (err?.meta?.target || []) as any;
      const targetArr = Array.isArray(target) ? target.map(String) : [String(target)];
      if (targetArr.some((t) => t.toLowerCase().includes('phone'))) {
        return res.status(409).json({
          error: 'phone_already_registered',
          message: 'This phone number already has an account. Please login or use forgot password to access it.',
          action: 'login_or_forgot_password',
        });
      }
      if (targetArr.some((t) => t.toLowerCase().includes('email'))) {
        return res.status(409).json({
          error: 'email_already_registered',
          message: 'This email already has an account. Please login or use forgot password to access it.',
          action: 'login_or_forgot_password',
        });
      }
      return res.status(409).json({ error: 'email_or_phone_already_in_use' });
    }
    console.error('Prisma create failed in /api/auth/register:', err);
    return res.status(503).json({ error: 'database_unavailable', message: 'Unable to register right now.' });
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
    const {
      role,
      name,
      email,
      referralCode,
      tin,
      address,
      gender,
      nationality,
      nin,
      licenseNumber,
      plateNumber,
      vehicleType,
      operationArea,
      paymentPhone,
      paymentVerified,
    } = body;
    
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

    const secret = getJwtSecret();
    if (!secret) return res.status(500).json({ error: 'server_misconfigured' });

    let userId: number | null = null;
    try {
      const decoded = jwt.verify(token, secret) as any;
      userId = decoded?.sub ? Number(decoded.sub) : null;
    } catch {
      userId = null;
    }
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Enforce that the role in the request (if any) matches the user's role (prevents role hopping)
    try {
      const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
      if (!dbUser) return res.status(401).json({ error: 'Unauthorized' });
      const requested = normalizeSignupRole(role);
      // Normalize DB roles too (e.g. USER/TRAVELLER should be treated as CUSTOMER)
      const dbRole = normalizeSignupRole(dbUser.role) || String(dbUser.role || '').trim().toUpperCase();
      if (requested && requested !== 'RESET' && dbRole !== requested) {
        return res.status(400).json({
          error: 'role_mismatch',
          message: `Role mismatch: account role is ${dbRole || 'UNKNOWN'} but request role is ${requested}.`,
        });
      }
    } catch (e) {
      return res.status(503).json({ error: 'database_unavailable', message: 'Unable to save profile right now.' });
    }

    // Get Socket.IO instance from app
    const io: any = (req as any).app?.get?.('io');

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

    const cleanEmail = email ? String(email).trim().toLowerCase() : null;
    let updatedUser: any = null;
    const extractUnknownArg = (err: any): string | null => {
      const msg = String(err?.message ?? '');
      const m = msg.match(/Unknown argument `([^`]+)`/);
      return m?.[1] ?? null;
    };
    try {
      // Some environments may run with an older generated Prisma Client that doesn't
      // include newer columns yet (e.g., gender/nationality/tin/address/etc).
      // Avoid passing unknown fields (Prisma validates args before hitting the DB).
      const meta = (prisma as any).user?._meta ?? {};
      const hasField = (field: string) => Object.prototype.hasOwnProperty.call(meta, field);

      const dataToUpdate: any = {
        name: name ? String(name) : undefined,
        email: cleanEmail || undefined,
      };

      // Owner fields
      if (hasField('tin') && typeof tin === 'string') dataToUpdate.tin = tin;
      if (hasField('address') && typeof address === 'string') dataToUpdate.address = address;

      // Driver fields
      if (hasField('gender') && typeof gender === 'string') dataToUpdate.gender = gender;
      if (hasField('nationality') && typeof nationality === 'string') dataToUpdate.nationality = nationality;
      if (hasField('nin') && typeof nin === 'string') dataToUpdate.nin = nin;
      if (hasField('licenseNumber') && typeof licenseNumber === 'string') dataToUpdate.licenseNumber = licenseNumber;
      if (hasField('plateNumber') && typeof plateNumber === 'string') dataToUpdate.plateNumber = plateNumber;
      if (hasField('vehicleType') && typeof vehicleType === 'string') dataToUpdate.vehicleType = vehicleType;
      if (hasField('operationArea') && typeof operationArea === 'string') dataToUpdate.operationArea = operationArea;
      if (hasField('paymentPhone') && typeof paymentPhone === 'string') dataToUpdate.paymentPhone = paymentPhone;
      if (hasField('paymentVerified') && typeof paymentVerified !== 'undefined') {
        dataToUpdate.paymentVerified =
          String(paymentVerified) === '1' || String(paymentVerified).toLowerCase() === 'true';
      }

      // Referral fields
      if (hasField('referredBy')) dataToUpdate.referredBy = referredBy as any;
      if (hasField('referralCode')) dataToUpdate.referralCode = referralCode || null;

      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
        select: { id: true, email: true, name: true, role: true }
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return res.status(409).json({ error: 'email_or_phone_already_in_use' });
      }

      // Last line of defense: retry once by dropping the unknown field Prisma complains about.
      const badField = (typeof (prisma as any).user?._meta === 'undefined') ? null : extractUnknownArg(e);
      if (badField) {
        try {
          const retryData: any = {
            name: name ? String(name) : undefined,
            email: cleanEmail || undefined,
            // Best-effort include common fields; we'll drop the bad one below.
            tin: typeof tin === 'string' ? tin : undefined,
            address: typeof address === 'string' ? address : undefined,
            gender: typeof gender === 'string' ? gender : undefined,
            nationality: typeof nationality === 'string' ? nationality : undefined,
            nin: typeof nin === 'string' ? nin : undefined,
            licenseNumber: typeof licenseNumber === 'string' ? licenseNumber : undefined,
            plateNumber: typeof plateNumber === 'string' ? plateNumber : undefined,
            vehicleType: typeof vehicleType === 'string' ? vehicleType : undefined,
            operationArea: typeof operationArea === 'string' ? operationArea : undefined,
            paymentPhone: typeof paymentPhone === 'string' ? paymentPhone : undefined,
            paymentVerified:
              typeof paymentVerified !== 'undefined'
                ? (String(paymentVerified) === '1' || String(paymentVerified).toLowerCase() === 'true')
                : undefined,
            referredBy: referredBy as any,
            referralCode: referralCode || null,
          };
          delete retryData[badField];
          updatedUser = await prisma.user.update({
            where: { id: userId },
            data: retryData as any,
            select: { id: true, email: true, name: true, role: true },
          });
        } catch (e2: any) {
          throw e2;
        }
      } else {
        throw e;
      }
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

  const normalizedPhone = phone ? normalizePhoneForAuth(String(phone)) : null;

  try {
    // try to find user by email or phone
    const user = await prisma.user.findFirst({
      where: email ? { email: String(email).trim().toLowerCase() } : { phone: normalizedPhone || String(phone) },
    });
    
    // Security: Always respond with 200 to avoid user enumeration
    // Only send reset link if user actually exists in database
    if (!user) {
      console.log(`[forgot-password] User not found for ${email ? 'email' : 'phone'}: ${email || phone} - No reset link sent`);
      return res.json({ ok: true, message: 'If an account exists, an email/SMS has been sent.' });
    }
    
    console.log(`[forgot-password] User found (ID: ${user.id}) for ${email ? 'email' : 'phone'}: ${email || phone} - Generating reset link`);

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
  const { token, userId, id, password } = req.body || {};
  const rawUserId = typeof userId !== 'undefined' ? userId : id;
  if (!token || !rawUserId || !password) return res.status(400).json({ message: 'token, userId and password required' });

  const userIdStr = String(rawUserId);
  const normalizedUserId: any = /^\d+$/.test(userIdStr) ? Number(userIdStr) : rawUserId;

  const hashed = crypto.createHash('sha256').update(String(token)).digest('hex');

  try {
    // Check DB first
    let user: any = null;
    try {
      user = await prisma.user.findUnique({ where: { id: normalizedUserId as any } });
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
      if (!rec || String(rec.userId) !== userIdStr) return res.status(400).json({ message: 'invalid token' });
      if (Date.now() > rec.expiresAt) { delete resetTokenStore[hashed]; return res.status(400).json({ message: 'token expired' }); }
      // fetch user record to update password
      try { user = await prisma.user.findUnique({ where: { id: normalizedUserId as any } }); } catch (e) { user = null; }
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
      await prisma.user.update({ where: { id: normalizedUserId as any }, data: { passwordHash: pwHash as any, resetPasswordToken: null as any, resetPasswordExpires: null as any } as any });
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

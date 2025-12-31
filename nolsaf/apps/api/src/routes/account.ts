import { Router } from "express";
import type { RequestHandler, Response } from "express";
import { z } from "zod";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { hashPassword, verifyPassword, encrypt, decrypt, hashCode, verifyCode } from "../lib/crypto.js";
import { validatePasswordStrength, isPasswordReused, addPasswordToHistory } from "../lib/security.js";
import { validatePasswordWithSettings } from "../lib/securitySettings.js";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import rateLimit from "express-rate-limit";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler);

// Constants
const BACKUP_CODES_COUNT = 10;
const PAYMENT_METHODS_LIMIT = 20;
const DEFAULT_SESSIONS_PAGE_SIZE = 20;
const SENSITIVE_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const SENSITIVE_RATE_LIMIT_MAX = 50;

// Rate limiter for sensitive endpoints
const sensitive = rateLimit({ 
  windowMs: SENSITIVE_RATE_LIMIT_WINDOW_MS, 
  max: SENSITIVE_RATE_LIMIT_MAX 
});

// Helper: Standardized error response
function sendError(res: Response, status: number, message: string, details?: any) {
  res.status(status).json({ 
    error: message, 
    ...(details && { details }) 
  });
}

// Helper: Standardized success response
function sendSuccess(res: Response, data?: any, message?: string) {
  res.json({ 
    ok: true, 
    ...(message && { message }),
    ...(data && { data })
  });
}

// Helper: Get authenticated user ID
function getUserId(req: AuthedRequest): number {
  return req.user!.id;
}

// Zod Validation Schemas
const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(160).optional(),
  name: z.string().min(1).max(160).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  email: z.string().email().max(190).optional(),
  avatarUrl: z.string().url().max(500).optional(),
  tin: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
}).strict();

const updatePayoutsSchema = z.object({
  bankAccountName: z.string().max(200).optional(),
  bankName: z.string().max(100).optional(),
  bankAccountNumber: z.string().max(50).optional(),
  bankBranch: z.string().max(100).optional(),
  mobileMoneyProvider: z.string().max(50).optional(),
  mobileMoneyNumber: z.string().max(20).optional(),
  payoutPreferred: z.enum(['BANK', 'MOBILE_MONEY']).optional(),
}).strict();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
}).strict();

const totpVerifySchema = z.object({
  code: z.string().length(6).regex(/^\d+$/),
}).strict();

const totpDisableSchema = z.object({
  code: z.string().min(1).optional(),
}).strict();

const revokeSessionSchema = z.object({
  sessionId: z.string().min(1),
}).strict();

const listSessionsSchema = z.object({
  page: z.string().regex(/^\d+$/).optional().transform(Number),
  pageSize: z.string().regex(/^\d+$/).optional().transform(Number),
}).strict();

/** GET /account/me */
const getMe: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req as AuthedRequest);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      return sendError(res, 404, "User not found");
    }

    // Exclude sensitive fields
    const { passwordHash, totpSecretEnc, backupCodesHash, ...safe } = user as any;
    sendSuccess(res, safe);
  } catch (error: any) {
    console.error('account.me failed', error);
    sendError(res, 500, "Failed to fetch user data");
  }
};
router.get("/me", getMe as unknown as RequestHandler);

/** PUT /account/profile - update authenticated user's profile */
const updateProfile: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req as AuthedRequest);
    
    // Validate input
    const validationResult = updateProfileSchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendError(res, 400, "Invalid input", validationResult.error.errors);
    }

    const data = validationResult.data;
    
    // Get user to check role
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return sendError(res, 404, "User not found");
    }
    
    // Drivers should use /api/driver/profile
    if (user.role === 'DRIVER') {
      return sendError(res, 400, "Drivers should use /api/driver/profile");
    }

    // Get before state for audit
    const meta = (prisma as any).user?._meta ?? {};
    const beforeSelect: any = { fullName: true, name: true, phone: true, email: true, avatarUrl: true };
    if (Object.prototype.hasOwnProperty.call(meta, 'tin')) beforeSelect.tin = true;
    if (Object.prototype.hasOwnProperty.call(meta, 'address')) beforeSelect.address = true;

    let before: any = null;
    try {
      before = await prisma.user.findUnique({ where: { id: userId }, select: beforeSelect });
    } catch (e) {
      // Best-effort audit
    }

    // Build update data
    const updateData: any = {};
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (Object.prototype.hasOwnProperty.call(meta, 'tin') && data.tin !== undefined) updateData.tin = data.tin;
    if (Object.prototype.hasOwnProperty.call(meta, 'address') && data.address !== undefined) updateData.address = data.address;

    const updated = await prisma.user.update({ where: { id: userId }, data: updateData } as any);
    
    try {
      await audit(req as AuthedRequest, 'USER_PROFILE_UPDATE', `user:${updated.id}`, before, updateData);
    } catch (e) {
      // Best-effort audit
    }
    
    sendSuccess(res, null, "Profile updated successfully");
  } catch (error: any) {
    console.error('account.profile.update failed', error);
    sendError(res, 500, "Failed to update profile");
  }
};
router.put("/profile", updateProfile as unknown as RequestHandler);

/** PUT /account/payouts (Owner only fields) */
const updatePayouts: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req as AuthedRequest);
    
    // Validate input
    const validationResult = updatePayoutsSchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendError(res, 400, "Invalid input", validationResult.error.errors);
    }

    const data = validationResult.data;
    
    // Get current payout data (stored as JSON)
    const currentUser = await prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { payout: true } 
    });
    
    const before = currentUser?.payout || null;
    
    // Merge new fields into payout JSON
    const payoutData: Record<string, any> = {
      ...(typeof before === 'object' && before !== null ? before : {}),
    };
    
    // Only add fields that are provided
    if (data.bankAccountName !== undefined) payoutData.bankAccountName = data.bankAccountName;
    if (data.bankName !== undefined) payoutData.bankName = data.bankName;
    if (data.bankAccountNumber !== undefined) payoutData.bankAccountNumber = data.bankAccountNumber;
    if (data.bankBranch !== undefined) payoutData.bankBranch = data.bankBranch;
    if (data.mobileMoneyProvider !== undefined) payoutData.mobileMoneyProvider = data.mobileMoneyProvider;
    if (data.mobileMoneyNumber !== undefined) payoutData.mobileMoneyNumber = data.mobileMoneyNumber;
    if (data.payoutPreferred !== undefined) payoutData.payoutPreferred = data.payoutPreferred;
    
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { payout: payoutData },
    });
    
    await audit(req as AuthedRequest, "USER_PAYOUT_UPDATE", `user:${updated.id}`, before, payoutData);
    sendSuccess(res, null, "Payout information updated successfully");
  } catch (error: any) {
    console.error('account.payouts.update failed', error);
    sendError(res, 500, "Failed to update payout information");
  }
};
router.put("/payouts", updatePayouts as unknown as RequestHandler);

/** POST /account/password/change */
const changePassword: RequestHandler = async (req, res) => {
  try {
    // Validate input
    const validationResult = changePasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendError(res, 400, "Invalid input", validationResult.error.errors);
    }

    const { currentPassword, newPassword } = validationResult.data;
    const userId = getUserId(req as AuthedRequest);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return sendError(res, 404, "User not found");
    }
    
    if (!user.passwordHash) {
      return sendError(res, 400, "No password set for this account");
    }

    // Verify current password
    const isValid = await verifyPassword(user.passwordHash, currentPassword);
    if (!isValid) {
      return sendError(res, 400, "Current password incorrect");
    }

    // Validate password strength using SystemSetting configuration
    const { valid, reasons } = await validatePasswordWithSettings(newPassword, user.role || null);
    if (!valid) {
      return sendError(res, 400, "Password does not meet strength requirements", { reasons });
    }

    // Prevent reuse of recent passwords
    const reused = await isPasswordReused(user.id, newPassword);
    if (reused) {
      return sendError(res, 400, "Password was used recently", { reasons: ['Do not reuse recent passwords'] });
    }

    // Update password
    const newHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
    
    // Record the new hash in password history (best-effort)
    try {
      await addPasswordToHistory(user.id, newHash);
    } catch (e) {
      // Best-effort
    }

    // Check if force logout on password change is enabled
    const { shouldForceLogout, clearAuthCookie } = await import('../lib/sessionManager.js');
    const forceLogout = await shouldForceLogout();
    
    if (forceLogout) {
      clearAuthCookie(res);
    }

    await audit(req as AuthedRequest, "USER_PASSWORD_CHANGE", `user:${user.id}`);
    sendSuccess(res, { forceLogout }, "Password changed successfully");
  } catch (error: any) {
    console.error('account.password.change failed', error);
    sendError(res, 500, "Failed to change password");
  }
};
router.post("/password/change", sensitive as unknown as RequestHandler, changePassword as unknown as RequestHandler);

/** 2FA: TOTP Setup — step 1: create secret + otpauth URL + QR */
const setupTotp: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req as AuthedRequest);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      return sendError(res, 404, "User not found");
    }

    const issuer = process.env.TOTP_ISSUER || "NoLSAF";
    const secret = authenticator.generateSecret();
    const accountName = user.email || user.phone || `user-${user.id}`;
    const otpauth = authenticator.keyuri(accountName, issuer, secret);
    const qr = await QRCode.toDataURL(otpauth);

    // Temporarily store encrypted secret until verified
    await prisma.user.update({ 
      where: { id: user.id }, 
      data: { totpSecretEnc: encrypt(secret) } 
    });

    sendSuccess(res, {
      otpauthUrl: otpauth,
      qrDataUrl: qr,
      secretMasked: `${secret.slice(0, 4)}••••••${secret.slice(-2)}`
    });
  } catch (error: any) {
    console.error('account.2fa.totp.setup failed', error);
    sendError(res, 500, "Failed to setup TOTP");
  }
};
router.post("/2fa/totp/setup", sensitive as unknown as RequestHandler, setupTotp as unknown as RequestHandler);

/** 2FA: Verify and enable — step 2 */
const verifyTotp: RequestHandler = async (req, res) => {
  try {
    // Validate input
    const validationResult = totpVerifySchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendError(res, 400, "Invalid input", validationResult.error.errors);
    }

    const { code } = validationResult.data;
    const userId = getUserId(req as AuthedRequest);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecretEnc) {
      return sendError(res, 400, "TOTP not initiated");
    }

    const secret = decrypt(user.totpSecretEnc);
    const isValid = authenticator.verify({ token: code, secret });
    if (!isValid) {
      return sendError(res, 400, "Invalid code");
    }

    // Generate backup codes
    const plainCodes: string[] = Array.from({ length: BACKUP_CODES_COUNT }, () => genBackupCode());
    const hashed = await Promise.all(plainCodes.map((c) => hashCode(c)));

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true, twoFactorMethod: "TOTP", backupCodesHash: hashed },
    });
    
    await audit(req as AuthedRequest, "USER_2FA_ENABLED", `user:${user.id}`);

    // Return plaintext codes ONCE
    sendSuccess(res, { backupCodes: plainCodes }, "2FA enabled successfully");
  } catch (error: any) {
    console.error('account.2fa.totp.verify failed', error);
    sendError(res, 500, "Failed to verify TOTP");
  }
};
router.post("/2fa/totp/verify", sensitive as unknown as RequestHandler, verifyTotp as unknown as RequestHandler);

function genBackupCode(): string {
  // XXXX-XXXX format
  const n = Math.floor(Math.random() * 36 ** 8).toString(36).padStart(8, "0");
  return `${n.slice(0, 4)}-${n.slice(4)}`.toUpperCase();
}

/** 2FA: Disable (accepts TOTP code or backup code) */
const disable2FA: RequestHandler = async (req, res) => {
  try {
    // Validate input
    const validationResult = totpDisableSchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendError(res, 400, "Invalid input", validationResult.error.errors);
    }

    const { code } = validationResult.data;
    const userId = getUserId(req as AuthedRequest);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return sendError(res, 404, "User not found");
    }
    
    if (!user.twoFactorEnabled) {
      return sendError(res, 400, "2FA not enabled");
    }

    // Verify code if provided
    let isValid = false;
    if (code) {
      if (code.includes("-")) {
        // Backup code
        if (user.backupCodesHash && Array.isArray(user.backupCodesHash)) {
          for (const hash of user.backupCodesHash as string[]) {
            if (await verifyCode(hash, code)) {
              isValid = true;
              break;
            }
          }
        }
      } else if (user.totpSecretEnc) {
        // TOTP code
        isValid = authenticator.verify({ token: code, secret: decrypt(user.totpSecretEnc) });
      }
    }
    
    if (!isValid) {
      return sendError(res, 400, "Invalid code");
    }

    await prisma.user.update({ 
      where: { id: user.id }, 
      data: { 
        twoFactorEnabled: false, 
        twoFactorMethod: null, 
        backupCodesHash: [], 
        totpSecretEnc: null 
      } 
    });
    
    await audit(req as AuthedRequest, "USER_2FA_DISABLED", `user:${user.id}`);
    sendSuccess(res, null, "2FA disabled successfully");
  } catch (error: any) {
    console.error('account.2fa.disable failed', error);
    sendError(res, 500, "Failed to disable 2FA");
  }
};
router.post("/2fa/disable", sensitive as unknown as RequestHandler, disable2FA as unknown as RequestHandler);

/** 2FA: Regenerate backup codes */
const regenCodes: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req as AuthedRequest);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user?.twoFactorEnabled) {
      return sendError(res, 400, "2FA not enabled");
    }

    const plainCodes: string[] = Array.from({ length: BACKUP_CODES_COUNT }, () => genBackupCode());
    const hashed = await Promise.all(plainCodes.map((c) => hashCode(c)));
    
    await prisma.user.update({ 
      where: { id: user.id }, 
      data: { backupCodesHash: hashed } 
    });
    
    await audit(req as AuthedRequest, "USER_2FA_CODES_REGEN", `user:${user.id}`);
    sendSuccess(res, { backupCodes: plainCodes }, "Backup codes regenerated successfully");
  } catch (error: any) {
    console.error('account.2fa.codes.regenerate failed', error);
    sendError(res, 500, "Failed to regenerate backup codes");
  }
};
router.post("/2fa/codes/regenerate", sensitive as unknown as RequestHandler, regenCodes as unknown as RequestHandler);

/** DELETE /account - delete or soft-delete the current user account */
const deleteAccount: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req as AuthedRequest);
    
    // Revoke active sessions first (best-effort)
    try {
      await prisma.session.updateMany({ 
        where: { userId, revokedAt: null }, 
        data: { revokedAt: new Date() } 
      });
    } catch (e) {
      // Best-effort
    }

    // Get before state for audit
    const meta = (prisma as any).user?._meta ?? {};
    let before: any = null;
    try {
      before = await prisma.user.findUnique({ where: { id: userId } });
    } catch (e) {
      // Best-effort
    }

    if (Object.prototype.hasOwnProperty.call(meta, 'deletedAt')) {
      // Soft-delete if schema has deletedAt
      await prisma.user.update({ 
        where: { id: userId }, 
        data: { deletedAt: new Date() } 
      } as any);
    } else {
      // Fallback: hard-delete
      try {
        await prisma.user.delete({ where: { id: userId } } as any);
      } catch (e: any) {
        console.error('Failed to delete user', e);
        return sendError(res, 500, "Failed to delete account");
      }
    }

    await audit(req as AuthedRequest, 'USER_ACCOUNT_DELETE', `user:${userId}`, before, null);
    sendSuccess(res, null, "Account deleted successfully");
  } catch (error: any) {
    console.error('account.delete failed', error);
    sendError(res, 500, "Failed to delete account");
  }
};
router.delete("/", sensitive as unknown as RequestHandler, deleteAccount as unknown as RequestHandler);

/** GET /account/sessions - list user sessions with pagination */
const listSessions: RequestHandler = async (req, res) => {
  try {
    // Validate and parse query params
    const validationResult = listSessionsSchema.safeParse(req.query);
    const page = validationResult.success ? (validationResult.data.page || 1) : 1;
    const pageSize = validationResult.success ? (validationResult.data.pageSize || DEFAULT_SESSIONS_PAGE_SIZE) : DEFAULT_SESSIONS_PAGE_SIZE;
    
    const userId = getUserId(req as AuthedRequest);
    const skip = (page - 1) * pageSize;

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({ 
        where: { userId, revokedAt: null }, 
        orderBy: { lastSeenAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.session.count({ 
        where: { userId, revokedAt: null } 
      }),
    ]);

    sendSuccess(res, {
      sessions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      }
    });
  } catch (error: any) {
    console.error('account.sessions.list failed', error);
    sendError(res, 500, "Failed to fetch sessions");
  }
};
router.get("/sessions", listSessions as unknown as RequestHandler);

/** POST /account/sessions/revoke - revoke a specific session */
const revokeSession: RequestHandler = async (req, res) => {
  try {
    // Validate input
    const validationResult = revokeSessionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendError(res, 400, "Invalid input", validationResult.error.errors);
    }

    const { sessionId } = validationResult.data;
    const userId = getUserId(req as AuthedRequest);

    await prisma.session.updateMany({ 
      where: { id: sessionId, userId }, 
      data: { revokedAt: new Date() } 
    });
    
    await audit(req as AuthedRequest, "USER_SESSION_REVOKE", `session:${sessionId}`);
    sendSuccess(res, null, "Session revoked successfully");
  } catch (error: any) {
    console.error('account.sessions.revoke failed', error);
    sendError(res, 500, "Failed to revoke session");
  }
};
router.post("/sessions/revoke", sensitive as unknown as RequestHandler, revokeSession as unknown as RequestHandler);

/** POST /account/sessions/revoke-others - revoke all other sessions */
const revokeOtherSessions: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req as AuthedRequest);
    const currentId = (req as any).sessionId as string | undefined;
    
    await prisma.session.updateMany({
      where: { 
        userId, 
        ...(currentId ? { NOT: { id: currentId } } : {}), 
        revokedAt: null 
      },
      data: { revokedAt: new Date() },
    });
    
    await audit(req as AuthedRequest, "USER_SESSION_REVOKE_OTHERS", `user:${userId}`);
    sendSuccess(res, null, "Other sessions revoked successfully");
  } catch (error: any) {
    console.error('account.sessions.revoke-others failed', error);
    sendError(res, 500, "Failed to revoke other sessions");
  }
};
router.post("/sessions/revoke-others", sensitive as unknown as RequestHandler, revokeOtherSessions as unknown as RequestHandler);

/** GET /account/payment-methods - returns user's payout details and recent payment methods */
const getPaymentMethods: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req as AuthedRequest);
    
    // Get payout data
    let payout: any = null;
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { payout: true },
      });
      payout = user?.payout || null;
    } catch (e) {
      // Best-effort
    }

    // Collect recent payment methods from invoices
    const methods: any[] = [];
    try {
      const invoices = await prisma.invoice.findMany({
        where: { paidBy: userId, status: 'PAID' },
        orderBy: { paidAt: 'desc' },
        take: PAYMENT_METHODS_LIMIT,
        select: { paymentMethod: true, paymentRef: true, paidAt: true } as any,
      });
      
      const seen = new Set<string>();
      for (const invoice of invoices) {
        const key = String(invoice.paymentMethod ?? invoice.paymentRef ?? '');
        if (!key || seen.has(key)) continue;
        seen.add(key);
        methods.push({ 
          method: invoice.paymentMethod ?? null, 
          ref: invoice.paymentRef ?? null, 
          paidAt: invoice.paidAt ?? null 
        });
      }
    } catch (e) {
      // Best-effort
    }

    sendSuccess(res, { payout, methods });
  } catch (error: any) {
    console.error('account.payment-methods.get failed', error);
    sendError(res, 500, "Failed to fetch payment methods");
  }
};
router.get('/payment-methods', getPaymentMethods as unknown as RequestHandler);

export default router;

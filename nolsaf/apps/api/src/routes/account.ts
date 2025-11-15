import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { hashPassword, verifyPassword, encrypt, decrypt, hashCode, verifyCode } from "../lib/crypto.js";
import { validatePasswordStrength, isPasswordReused, addPasswordToHistory } from "../lib/security.js";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import rateLimit from "express-rate-limit";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler);

// (Optional) stricter limiter for sensitive endpoints
const sensitive = rateLimit({ windowMs: 10 * 60 * 1000, max: 50 });
/** GET /account/me */
const getMe: RequestHandler = async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: (req as AuthedRequest).user!.id } });
  if (!u) { res.status(404).json({ error: "User not found" }); return; }
  const { passwordHash, totpSecretEnc, backupCodesHash, ...safe } = u as any;
  res.json(safe);
};
router.get("/me", getMe as unknown as RequestHandler);

// Note: profile updates for drivers are handled under the driver router (/api/driver/profile)

/** PUT /account/payouts (Owner only fields) */
const updatePayouts: RequestHandler = async (req, res) => {
  const { bankAccountName, bankName, bankAccountNumber, bankBranch, mobileMoneyProvider, mobileMoneyNumber, payoutPreferred } = req.body ?? {};
  const before = await prisma.user.findUnique({ where: { id: (req as AuthedRequest).user!.id }, select: { bankAccountName: true, bankName: true, bankAccountNumber: true, bankBranch: true, mobileMoneyProvider: true, mobileMoneyNumber: true, payoutPreferred: true }});
  const u = await prisma.user.update({
    where: { id: (req as AuthedRequest).user!.id },
    data: { bankAccountName, bankName, bankAccountNumber, bankBranch, mobileMoneyProvider, mobileMoneyNumber, payoutPreferred },
  });
  await audit(req as AuthedRequest, "USER_PAYOUT_UPDATE", `user:${u.id}`, before, { bankAccountName, bankName, bankAccountNumber, bankBranch, mobileMoneyProvider, mobileMoneyNumber, payoutPreferred });
  res.json({ ok: true });
};
router.put("/payouts", updatePayouts as unknown as RequestHandler);

/** POST /account/password/change */
const changePassword: RequestHandler = async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) { res.status(400).json({ error: "currentPassword and newPassword required" }); return; }

  const u = await prisma.user.findUnique({ where: { id: (req as AuthedRequest).user!.id } });
  if (!u) { res.status(404).json({ error: "User not found" }); return; }

  const ok = await verifyPassword(u.passwordHash, currentPassword);
  if (!ok) { res.status(400).json({ error: "Current password incorrect" }); return; }

  // Validate password strength with role-aware defaults
  const minLen = await getMinPasswordLength();
  const { valid, reasons } = validatePasswordStrength(newPassword, { minLength: minLen, role: (u as any).role });
  if (!valid) {
    res.status(400).json({ error: "Password does not meet strength requirements", reasons });
    return;
  }

    // Prevent reuse of recent passwords
    const reused = await isPasswordReused(u.id, newPassword);
    if (reused) {
      res.status(400).json({ error: 'Password was used recently', reasons: ['Do not reuse recent passwords'] });
      return;
    }

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: newHash, lastPasswordChangeAt: new Date() } });
    // Record the new hash in password history (best-effort)
    try { await addPasswordToHistory(u.id, newHash); } catch (e) { /* ignore */ }

  await audit(req as AuthedRequest, "USER_PASSWORD_CHANGE", `user:${u.id}`);
  res.json({ ok: true, message: 'Password changed successfully' });
};
router.post("/password/change", sensitive as unknown as RequestHandler, changePassword as unknown as RequestHandler);

async function getMinPasswordLength(): Promise<number> {
  const s = await prisma.systemSetting.findUnique({ where: { id: 1 } });
  return s?.minPasswordLength ?? 10;
}

/** 2FA: TOTP Setup — step 1: create secret + otpauth URL + QR */
const setupTotp: RequestHandler = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: (req as AuthedRequest).user!.id } });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const issuer = process.env.TOTP_ISSUER || "NoLSAF";
  const secret = authenticator.generateSecret();
  const accountName = user.email;
  const otpauth = authenticator.keyuri(accountName, issuer, secret);
  const qr = await QRCode.toDataURL(otpauth);

  // Temporarily store encrypted secret in session table (or user temp field); here we reuse totpSecretEnc until verified
  await prisma.user.update({ where: { id: user.id }, data: { totpSecretEnc: encrypt(secret) } });

  res.json({ otpauthUrl: otpauth, qrDataUrl: qr, secretMasked: `${secret.slice(0,4)}••••••${secret.slice(-2)}` });
};
router.post("/2fa/totp/setup", sensitive as unknown as RequestHandler, setupTotp as unknown as RequestHandler);

/** 2FA: Verify and enable — step 2 */
const verifyTotp: RequestHandler = async (req, res) => {
  const { code } = req.body ?? {};
  if (!code) { res.status(400).json({ error: "Code required" }); return; }

  const u = await prisma.user.findUnique({ where: { id: (req as AuthedRequest).user!.id } });
  if (!u?.totpSecretEnc) { res.status(400).json({ error: "TOTP not initiated" }); return; }

  const secret = decrypt(u.totpSecretEnc);
  const valid = authenticator.verify({ token: code, secret });
  if (!valid) { res.status(400).json({ error: "Invalid code" }); return; }

  // generate backup codes (10 codes)
  const plainCodes: string[] = Array.from({ length: 10 }, () => genBackupCode());
  const hashed = await Promise.all(plainCodes.map((c) => hashCode(c)));

  await prisma.user.update({
    where: { id: u.id },
    data: { twoFactorEnabled: true, twoFactorMethod: "TOTP", backupCodesHash: hashed },
  });
  await audit(req as AuthedRequest, "USER_2FA_ENABLED", `user:${u.id}`);

  // Return plaintext codes ONCE
  res.json({ ok: true, backupCodes: plainCodes });
};
router.post("/2fa/totp/verify", sensitive as unknown as RequestHandler, verifyTotp as unknown as RequestHandler);

function genBackupCode() {
  // XXXX-XXXX format
  const n = Math.floor(Math.random() * 36 ** 8).toString(36).padStart(8, "0");
  return `${n.slice(0,4)}-${n.slice(4)}`.toUpperCase();
}

/** 2FA: Disable (accepts TOTP code or backup code) */
const disable2FA: RequestHandler = async (req, res) => {
  const { code } = req.body ?? {};
  const u = await prisma.user.findUnique({ where: { id: (req as AuthedRequest).user!.id } });
  if (!u) { res.status(404).json({ error: "User not found" }); return; }
  if (!u.twoFactorEnabled) { res.status(400).json({ error: "2FA not enabled" }); return; }

  let ok = false;
  if (code) {
    if (code.includes("-")) {
      // backup code
      if (u.backupCodesHash && Array.isArray(u.backupCodesHash)) {
        for (const h of u.backupCodesHash as string[]) {
          if (await verifyCode(h, code)) { ok = true; break; }
        }
      }
    } else if (u.totpSecretEnc) {
      ok = authenticator.verify({ token: code, secret: decrypt(u.totpSecretEnc) });
    }
  }
  if (!ok) { res.status(400).json({ error: "Invalid code" }); return; }

  await prisma.user.update({ where: { id: u.id }, data: { twoFactorEnabled: false, twoFactorMethod: null, backupCodesHash: [], totpSecretEnc: null } });
  await audit(req as AuthedRequest, "USER_2FA_DISABLED", `user:${u.id}`);
  res.json({ ok: true });
};
router.post("/2fa/disable", sensitive as unknown as RequestHandler, disable2FA as unknown as RequestHandler);

/** 2FA: Regenerate backup codes */
const regenCodes: RequestHandler = async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: (req as AuthedRequest).user!.id } });
  if (!u?.twoFactorEnabled) { res.status(400).json({ error: "2FA not enabled" }); return; }
  const plainCodes: string[] = Array.from({ length: 10 }, () => genBackupCode());
  const hashed = await Promise.all(plainCodes.map((c) => hashCode(c)));
  await prisma.user.update({ where: { id: u.id }, data: { backupCodesHash: hashed } });
  await audit(req as AuthedRequest, "USER_2FA_CODES_REGEN", `user:${u.id}`);
  res.json({ ok: true, backupCodes: plainCodes });
};
router.post("/2fa/codes/regenerate", sensitive as unknown as RequestHandler, regenCodes as unknown as RequestHandler);

/** DELETE /account - delete or soft-delete the current user account */
const deleteAccount: RequestHandler = async (req, res) => {
  const userId = (req as AuthedRequest).user!.id;
  // Revoke active sessions first (best-effort)
  try {
    await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  } catch (e) {
    // ignore
  }

  const meta = (prisma as any).user?._meta ?? {};
  let before: any = null;
  try { before = await prisma.user.findUnique({ where: { id: userId } }); } catch (e) { /* ignore */ }

  if (Object.prototype.hasOwnProperty.call(meta, 'deletedAt')) {
    // soft-delete if schema has deletedAt
    await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } } as any);
  } else {
    // fallback: hard-delete
    try {
      await prisma.user.delete({ where: { id: userId } } as any);
    } catch (e) {
      // If delete fails (FKs), try to null out a few relations or return an error
      console.error('Failed to delete user', e);
      res.status(500).json({ error: 'Failed to delete account' });
      return;
    }
  }

  await audit(req as AuthedRequest, 'USER_ACCOUNT_DELETE', `user:${userId}`, before, null);
  res.json({ ok: true });
};
router.delete("/", sensitive as unknown as RequestHandler, deleteAccount as unknown as RequestHandler);

/** Sessions */
const listSessions: RequestHandler = async (req, res) => {
  const list = await prisma.session.findMany({ where: { userId: (req as AuthedRequest).user!.id, revokedAt: null }, orderBy: { lastSeenAt: "desc" } });
  res.json(list);
};
router.get("/sessions", listSessions as unknown as RequestHandler);

const revokeSession: RequestHandler = async (req, res) => {
  const { sessionId } = req.body ?? {};
  await prisma.session.updateMany({ where: { id: sessionId, userId: (req as AuthedRequest).user!.id }, data: { revokedAt: new Date() } });
  await audit(req as AuthedRequest, "USER_SESSION_REVOKE", `session:${sessionId}`);
  res.json({ ok: true });
};
router.post("/sessions/revoke", sensitive as unknown as RequestHandler, revokeSession as unknown as RequestHandler);

const revokeOtherSessions: RequestHandler = async (req, res) => {
  const currentId = (req as any).sessionId as string | undefined;
  await prisma.session.updateMany({
    where: { userId: (req as AuthedRequest).user!.id, ...(currentId ? { NOT: { id: currentId } } : {}), revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await audit(req as AuthedRequest, "USER_SESSION_REVOKE_OTHERS", `user:${(req as AuthedRequest).user!.id}`);
  res.json({ ok: true });
};
router.post("/sessions/revoke-others", sensitive as unknown as RequestHandler, revokeOtherSessions as unknown as RequestHandler);

/** GET /account/payment-methods - returns user's payout details and recent payment methods (best-effort) */
const getPaymentMethods: RequestHandler = async (req, res) => {
  const userId = (req as AuthedRequest).user!.id;
  // Best-effort: return payout fields from user record if present
  let payout: any = null;
  try {
    payout = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        bankAccountName: true,
        bankName: true,
        bankAccountNumber: true,
        bankBranch: true,
        mobileMoneyProvider: true,
        mobileMoneyNumber: true,
        payoutPreferred: true,
        // if a JSON `payout` column exists, include it (best-effort)
        payout: (prisma as any).user?._meta && Object.prototype.hasOwnProperty.call((prisma as any).user._meta, 'payout') ? true : undefined,
      } as any,
    });
  } catch (e) {
    // ignore if fields/table absent
  }

  // Collect recent payment methods from invoices/payments (best-effort)
  const methods: any[] = [];
  try {
    const invs = await prisma.invoice.findMany({
      where: { paidBy: userId, status: 'PAID' },
      orderBy: { paidAt: 'desc' },
      take: 20,
      select: { paymentMethod: true, paymentRef: true, paidAt: true } as any,
    });
    const seen = new Set<string>();
    for (const i of invs) {
      const key = String(i.paymentMethod ?? i.paymentRef ?? '');
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      methods.push({ method: i.paymentMethod ?? null, ref: i.paymentRef ?? null, paidAt: i.paidAt ?? null });
    }
  } catch (e) {
    // ignore if invoice model absent
  }

  res.json({ payout, methods });
};
router.get('/payment-methods', getPaymentMethods as unknown as RequestHandler);

export default router;

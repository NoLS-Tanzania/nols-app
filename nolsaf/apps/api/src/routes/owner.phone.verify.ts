import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { hashCode, verifyCode } from "../lib/crypto.js";
import { hashCode as hashOtpCode } from "../lib/otp.js";
import { audit } from "../lib/audit.js";
import { sendSms } from "../lib/sms.js";

export const router = Router();
router.use(requireAuth as RequestHandler, requireRole("OWNER") as RequestHandler);

function maskOtp(code: string): string {
  const s = String(code || "");
  if (s.length <= 2) return "••••••";
  return `••••${s.slice(-2)}`;
}

function otpEntityKey(destinationType: "PHONE" | "EMAIL", destination: string, codeHash: string): string {
  return `OTP:${destinationType}:${destination}:${codeHash}`;
}

function gen6() { return String(Math.floor(100000 + Math.random() * 900000)); }

/** Start phone verification (sends OTP) */
router.post("/start", (async (req: AuthedRequest, res) => {
  const me = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const phone = (req.body?.phone || me?.phone)?.toString();
  if (!phone) return res.status(400).json({ error: "phone required" });

  const code = gen6();
  const codeHash = await hashCode(code);
  const auditHash = hashOtpCode(code);
  const expires = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes

  await prisma.phoneOtp.create({ data: { userId: me!.id, phone, codeHash, expiresAt: expires } });
  const smsResult = await sendSms(phone, `NoLSAF verification code: ${code}`);

  try {
    const entity = otpEntityKey("PHONE", phone, auditHash);
    await audit(req as any, "NO4P_OTP_SENT", entity, null, {
      destinationType: "PHONE",
      destination: phone,
      codeHash: auditHash,
      codeMasked: maskOtp(code),
      expiresAt: expires.toISOString(),
      usedFor: "OWNER_PHONE_VERIFY",
      provider: (smsResult as any)?.provider ?? null,
      userRole: (me as any)?.role ?? "OWNER",
      userName: (me as any)?.name ?? null,
      policyCompliant: true,
    });
  } catch {
    // swallow
  }

  res.json({ ok: true, phoneMasked: maskPhone(phone) });
}) as RequestHandler);

function maskPhone(p: string) {
  const tail = p.slice(-3);
  return `••••••${tail}`;
}

/** Verify OTP */
router.post("/verify", (async (req: AuthedRequest, res) => {
  const { code } = req.body ?? {};
  if (!code) return res.status(400).json({ error: "code required" });

  const rec = await prisma.phoneOtp.findFirst({
    where: { userId: req.user!.id, usedAt: null },
    orderBy: { id: "desc" },
  });
  if (!rec || rec.expiresAt < new Date()) return res.status(400).json({ error: "Invalid/expired code" });

  const ok = await verifyCode(rec.codeHash, code);
  if (!ok) {
    try {
      const auditHash = hashOtpCode(String(code));
      const entity = otpEntityKey("PHONE", rec.phone, auditHash);
      await audit(req as any, "NO4P_OTP_VERIFY_FAILED", entity, null, {
        destinationType: "PHONE",
        destination: rec.phone,
        codeHash: auditHash,
        usedFor: "OWNER_PHONE_VERIFY",
        reason: "invalid",
      });
    } catch {
      // swallow
    }
    return res.status(400).json({ error: "Invalid code" });
  }

  await prisma.$transaction([
    prisma.phoneOtp.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ 
      where: { id: req.user!.id }, 
      data: { 
        phone: rec.phone,
        phoneVerifiedAt: new Date() 
      } as any 
    }),
  ]);

  try {
    const auditHash = hashOtpCode(String(code));
    const entity = otpEntityKey("PHONE", rec.phone, auditHash);
    await audit(req as any, "NO4P_OTP_USED", entity, null, {
      destinationType: "PHONE",
      destination: rec.phone,
      codeHash: auditHash,
      usedAt: new Date().toISOString(),
      usedFor: "OWNER_PHONE_VERIFY",
      policyCompliant: true,
    });
  } catch {
    // swallow
  }

  res.json({ ok: true });
}) as RequestHandler);
/** GET /owner/phone/verify - get current status */
router.get("/", (async (req: AuthedRequest, res) => {
  const me = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!me) return res.status(404).json({ error: "User not found" });

  const rec = await prisma.phoneOtp.findFirst({
    where: { userId: me.id, usedAt: null },
    orderBy: { id: "desc" },
  });

  res.json({ ok: true, phoneMasked: maskPhone(me.phone), otpSent: !!rec });
}) as RequestHandler);
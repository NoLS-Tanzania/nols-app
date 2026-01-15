import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { hashCode, verifyCode } from "../lib/crypto.js";
import { sendSms } from "../lib/sms.js";

export const router = Router();
router.use(requireAuth as RequestHandler, requireRole("OWNER") as RequestHandler);

function gen6() { return String(Math.floor(100000 + Math.random() * 900000)); }

/** Start phone verification (sends OTP) */
router.post("/start", (async (req: AuthedRequest, res) => {
  const me = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const phone = (req.body?.phone || me?.phone)?.toString();
  if (!phone) return res.status(400).json({ error: "phone required" });

  const code = gen6();
  const codeHash = await hashCode(code);
  const expires = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes

  await prisma.phoneOtp.create({ data: { userId: me!.id, phone, codeHash, expiresAt: expires } });
  await sendSms(phone, `NoLSAF verification code: ${code}`);

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
  if (!ok) return res.status(400).json({ error: "Invalid code" });

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
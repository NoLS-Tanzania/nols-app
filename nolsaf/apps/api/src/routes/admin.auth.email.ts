import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";
import crypto from "crypto";
import { sendMail } from "../lib/mailer.js";
import { audit } from "../lib/audit.js";

export const router = Router();
router.use(
  requireAuth as RequestHandler,
  requireRole("ADMIN") as unknown as RequestHandler
);

function randToken() {
  return crypto.randomBytes(24).toString("base64url");
}

/** Request verification link for current admin email */
router.post("/verify/send", (async (req, res) => {
  const me = await prisma.user.findUnique({ where: { id: (req as any).user.id } });
  if (!me) return res.status(404).json({ error: "User not found" });

  const token = randToken();
  const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 min
  await prisma.emailVerificationToken.create({
    data: { userId: me.id, token, newEmail: null, expiresAt: expires }
  });

  const url = `${process.env.APP_URL}/api/admin/email/verify?token=${token}`;
  const greetingName = (me as any).fullName || me.name || me.email || "there";
  await sendMail(me.email, "Verify your email", `
    <p>Hello ${greetingName},</p>
    <p>Verify your email by clicking this link:</p>
    <p><a href="${url}">${url}</a></p>
    <p>This link expires in 30 minutes.</p>
  `);
  await audit(req as any, "ADMIN_EMAIL_VERIFY_SEND", `user:${me.id}`);
  res.json({ ok: true });
}) as RequestHandler);

/** Start change-email → send verification to NEW address */
router.post("/change/send", (async (req, res) => {
  const { newEmail } = req.body ?? {};
  if (!newEmail) return res.status(400).json({ error: "newEmail required" });

  const me = await prisma.user.findUnique({ where: { id: (req as any).user.id } });
  if (!me) return res.status(404).json({ error: "User not found" });

  // Prevent duplicates
  const exists = await prisma.user.findUnique({ where: { email: newEmail } });
  if (exists) return res.status(400).json({ error: "Email already in use" });

  const token = randToken();
  const expires = new Date(Date.now() + 1000 * 60 * 30);
  await prisma.emailVerificationToken.create({
    data: { userId: me.id, token, newEmail, expiresAt: expires }
  });

  const url = `${process.env.APP_URL}/api/admin/email/verify?token=${token}`;
  const greetingName = (me as any).fullName || me.name || me.email || "there";
  await sendMail(newEmail, "Confirm your new email", `
    <p>Hello ${greetingName},</p>
    <p>Confirm your new email by clicking this link:</p>
    <p><a href="${url}">${url}</a></p>
    <p>This link expires in 30 minutes.</p>
  `);
  await audit(req as any, "ADMIN_EMAIL_CHANGE_SEND", `user:${me.id}`, { old: me.email }, { new: newEmail });
  res.json({ ok: true });
}) as RequestHandler);
/** GET /admin/email/verify?token=... */
router.get("/verify", (async (req, res) => {
  const { token } = req.query as { token?: string };
  if (!token) return res.status(400).json({ error: "Token is required" });

  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record) return res.status(404).json({ error: "Token not found" });

  // Check if the token is expired
  if (record.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } });
    return res.status(400).json({ error: "Token has expired" });
  }

  // If the token is valid, update the user's email
  await prisma.user.update({
    where: { id: record.userId },
    data: { email: record.newEmail }
  });
  await prisma.emailVerificationToken.delete({ where: { id: record.id } });
  res.json({ ok: true });
}) as RequestHandler);
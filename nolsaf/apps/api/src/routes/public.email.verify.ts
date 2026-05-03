import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { audit } from "../lib/audit.js";

export const router = Router();

function wantsJson(req: any) {
  return String(req.query.format || "").toLowerCase() === "json" || String(req.headers.accept || "").includes("application/json");
}

function getRedirectPath(role: string | null | undefined) {
  const userRole = String(role || "").toUpperCase();
  if (userRole === "OWNER") return "/owner/profile?email_verified=1";
  if (userRole === "ADMIN") return "/admin/profile?email_verified=1";
  if (userRole === "DRIVER") return "/driver/profile?email_verified=1";
  if (userRole === "AGENT") return "/account/agent/profile?email_verified=1";
  return "/account/security?email_verified=1";
}

function respondError(req: any, res: any, status: number, message: string) {
  if (wantsJson(req)) return res.status(status).json({ ok: false, error: message });
  const app = (process.env.APP_URL || process.env.WEB_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
  return res.redirect(`${app}/email/verify?status=failed&message=${encodeURIComponent(message)}`);
}

async function handleEmailVerify(req: any, res: any) {
  const token = String(req.query.token || "");
  if (!token) return respondError(req, res, 400, "Missing verification token");

  const rec = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!rec || rec.expiresAt < new Date()) return respondError(req, res, 400, "Invalid or expired verification link");

  const user = await prisma.user.findUnique({ where: { id: rec.userId } });
  if (!user) return respondError(req, res, 404, "User not found");

  if (rec.newEmail) {
    // change-email flow
    const before = { email: user.email };
    await prisma.user.update({ where: { id: user.id }, data: { email: rec.newEmail, emailVerifiedAt: new Date() } });
    await audit(req, "EMAIL_CHANGED", `user:${user.id}`, before, { email: rec.newEmail });
  } else {
    // verify existing email
    await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    await audit(req, "EMAIL_VERIFIED", `user:${user.id}`);
  }

  await prisma.emailVerificationToken.delete({ where: { id: rec.id } });

  // Redirect to appropriate page based on user role
  const app = (process.env.APP_URL || process.env.WEB_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
  const redirectPath = getRedirectPath(user.role);
  if (wantsJson(req)) return res.json({ ok: true, redirectPath, role: user.role });
  res.redirect(`${app}${redirectPath}`);
}

/** GET /api/admin/email/verify?token=... (legacy path) */
router.get("/admin/email/verify", handleEmailVerify);

/** GET /api/public/email/verify?token=... (owner/user path) */
router.get("/public/email/verify", handleEmailVerify);

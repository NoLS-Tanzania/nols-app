import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { audit } from "../lib/audit.js";

export const router = Router();

/** GET /api/admin/email/verify?token=... */
router.get("/admin/email/verify", async (req, res) => {
  const token = String(req.query.token || "");
  if (!token) return res.status(400).json({ error: "Missing token" });

  const rec = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!rec || rec.expiresAt < new Date()) return res.status(400).json({ error: "Invalid/expired token" });

  const user = await prisma.user.findUnique({ where: { id: rec.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (rec.newEmail) {
    // change-email flow
    const before = { email: user.email };
    await prisma.user.update({ where: { id: user.id }, data: { email: rec.newEmail, emailVerifiedAt: new Date() } });
    await audit(req as any, "ADMIN_EMAIL_CHANGED", `user:${user.id}`, before, { email: rec.newEmail });
  } else {
    // verify existing email
    await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    await audit(req as any, "ADMIN_EMAIL_VERIFIED", `user:${user.id}`);
  }

  await prisma.emailVerificationToken.delete({ where: { id: rec.id } });

  // Redirect to app success page
  const app = process.env.APP_URL || "/";
  res.redirect(`${app}/admin/settings?email_verified=1`);
});

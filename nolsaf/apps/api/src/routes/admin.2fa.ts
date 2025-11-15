// apps/api/src/routes/admin.2fa.ts
import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { generate6, hashCode } from "../lib/otp.js";

// your SMS/email sender: dynamic import fallback to avoid compile-time export mismatch
async function notifyAdminFallback(adminId: string, event: string, data: any) {
  try {
    const mod = await import("../lib/notifications.js");
    if (typeof (mod as any).notifyAdmin === "function") {
      return (mod as any).notifyAdmin(adminId, event, data);
    }
    if (typeof (mod as any).default === "function") {
      return (mod as any).default(adminId, event, data);
    }
  } catch (e) {
    // ignore dynamic import failures
  }
  // Fallback: no-op (or log)
  console.warn("notifyAdmin not available; fallback no-op", { adminId, event, data });
  return;
}

export const router = Router();
router.use(requireAuth as RequestHandler, requireRole("ADMIN") as RequestHandler);

/** POST /admin/2fa/otp/send  -> { purpose?: "FINANCE_VIEW" } */
router.post("/otp/send", async (req, res) => {
  const adminId = (req.user as { id: string }).id;
  const purpose = String(req.body?.purpose ?? "FINANCE_VIEW");
  // Rate-limit: max 3 active codes, or one every 30s
  const recent = await prisma.adminOtp.findFirst({
    where: { adminId, purpose, expiresAt: { gt: new Date() }, usedAt: null },
    orderBy: { id: "desc" }
  });
  if (recent && Date.now() - recent.createdAt.getTime() < 30_000) {
    return res.status(429).json({ error: "Please wait before requesting another code." });
  }

  const code = generate6();
  const expiresAt = new Date(Date.now() + 10*60*1000); // 10 minutes
  await prisma.adminOtp.create({
    data: { adminId, purpose, codeHash: hashCode(code), expiresAt }
  });

  // Send via your channel (phone or email on admin profile)
  await notifyAdminFallback(adminId, "otp_code", { code, purpose, expiresAt });

  res.json({ ok: true, expiresAt });
});

/** POST /admin/2fa/otp/verify -> { code, purpose? } */
router.post("/otp/verify", async (req, res) => {
  const adminId = (req.user as { id: string }).id;
  const code = String(req.body?.code ?? "");
  const purpose = String(req.body?.purpose ?? "FINANCE_VIEW");

  const otp = await prisma.adminOtp.findFirst({
    where: { adminId, purpose, expiresAt: { gt: new Date() }, usedAt: null },
    orderBy: { id: "desc" }
  });
  if (!otp) return res.status(400).json({ error: "No active code. Request a new one." });
  if (otp.codeHash !== hashCode(code)) return res.status(400).json({ error: "Invalid code." });

  // Mark used
  await prisma.adminOtp.update({ where: { id: otp.id }, data: { usedAt: new Date() } });

  // Grant: 15 minutes finance visibility
  (req.session as any).financeOkUntil = Date.now() + 15*60*1000;

  res.json({ ok: true, until: (req.session as any).financeOkUntil });
});

export default router;

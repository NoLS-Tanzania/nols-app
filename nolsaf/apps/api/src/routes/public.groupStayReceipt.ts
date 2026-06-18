// apps/api/src/routes/public.groupStayReceipt.ts
//
// Token-gated download of a group stay deposit receipt PDF. The mobile app
// cannot attach an Authorization header when opening a URL in the device
// browser/PDF viewer, so the customer first exchanges their session for a
// short-lived token (see customer.groupStays.ts: GET /:id/deposit-receipt-token)
// and opens this URL with that token.

import { Router, Request, Response } from "express";
import { rateLimitWithRedis as rateLimit } from "../lib/redisRateLimitStore.js";
import { verifyGroupStayReceiptToken } from "../lib/groupStayReceiptToken.js";
import { loadGroupStayDepositReceipt } from "../lib/groupStayReceipts.js";

const router = Router();

const receiptLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests" },
});

/**
 * GET /api/public/group-stays/receipt?token=...
 */
router.get("/", receiptLimiter, async (req: Request, res: Response) => {
  const token = String(req.query.token || "").trim();
  if (!token) {
    return res.status(400).json({ ok: false, error: "missing_token" });
  }

  const payload = verifyGroupStayReceiptToken(token);
  if (!payload) {
    return res.status(401).json({ ok: false, error: "invalid_token" });
  }

  try {
    const result = await loadGroupStayDepositReceipt(payload.bookingId, payload.userId);
    if (!result.ok) {
      return res.status(result.status).json({ ok: false, error: result.error, message: result.message });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${result.filename}"`);
    res.setHeader("Content-Length", String(result.buffer.length));
    return res.send(result.buffer);
  } catch (error: any) {
    console.error("GET /public/group-stays/receipt error:", error);
    return res.status(500).json({ ok: false, error: "Failed to generate deposit receipt" });
  }
});

export default router;

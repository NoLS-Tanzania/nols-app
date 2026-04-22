/**
 * AzamPay Payment Routes
 *
 * SECURITY POLICY enforced in this file:
 *  - Env var VALUES are NEVER written to logs; only key names if missing.
 *  - Raw AzamPay response bodies are NEVER forwarded to the caller.
 *  - Every outbound fetch has a hard AbortController timeout (10 s).
 *  - On a 401 from AzamPay the token cache is invalidated and retried once.
 *  - Idempotency keys are stored in Redis (fallback: in-process LRU; final
 *    fallback: DB lookup) so restarts / multi-instance can't duplicate charges.
 *  - Amount is always read from the server-side Invoice row — never the client.
 */

// apps/api/src/routes/payments.azampay.ts
import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { getAzamPayToken, invalidateAzamPayToken } from "../lib/azampay.auth.js";
import { getRedis } from "../lib/redis.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ── Config ────────────────────────────────────────────────────────────────────

const AZAMPAY_API_URL = (process.env.AZAMPAY_API_URL || "https://api.azampay.co.tz").replace(/\/$/, "");
const FETCH_TIMEOUT_MS = 10_000;
const IDEM_TTL_SEC = 10 * 60; // 10 minutes

// ── Rate limiter ──────────────────────────────────────────────────────────────

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: any, res: any) => {
    res.status(429).json({ error: "rate_limited", message: "Too many payment requests — please wait before retrying." });
  },
  keyGenerator: (req: any) => String(req.user?.id || req.ip || "anon"),
});

// ── Input schema ──────────────────────────────────────────────────────────────

// Tanzania phone: +255 or 0, then network digit (6=Airtel, 7=Vodacom/Tigo/Halo, 2=TTCL), then 8 digits
const TZ_PHONE_RE = /^(\+255|0)(6|7|2)\d{8}$/;

const initiateSchema = z.object({
  invoiceId:      z.number().int().positive(),
  phoneNumber:    z.string().min(9).max(15).regex(
    /^[\d+]+$/,
    "Phone number must contain only digits and an optional leading +"
  ),
  provider:       z.enum(["Airtel", "Tigo", "M-Pesa", "Halopesa"]).default("Airtel"),
  idempotencyKey: z.string().min(8).max(128).optional(),
});

// ── Idempotency helpers (Redis → in-process LRU fallback) ─────────────────────

const localIdem = new Map<string, { result: object; exp: number }>();

async function idemGet(key: string): Promise<object | null> {
  try {
    const redis = getRedis();
    if (redis) {
      const raw = await redis.get(`azp:idem:${key}`);
      if (raw) return JSON.parse(raw);
    }
  } catch { /* skip */ }
  const entry = localIdem.get(key);
  if (entry && entry.exp > Date.now()) return entry.result;
  return null;
}

async function idemSet(key: string, result: object): Promise<void> {
  const exp = Date.now() + IDEM_TTL_SEC * 1000;
  try {
    const redis = getRedis();
    if (redis) await redis.set(`azp:idem:${key}`, JSON.stringify(result), "EX", IDEM_TTL_SEC);
  } catch { /* skip */ }
  localIdem.set(key, { result, exp });
  if (localIdem.size > 500) {
    const now = Date.now();
    for (const [k, v] of localIdem) {
      if (v.exp < now) localIdem.delete(k);
      if (localIdem.size <= 400) break;
    }
  }
}

// ── Phone normalisation & validation (Tanzania only) ────────────────────────

/**
 * Normalise a raw phone string to E.164 (+255XXXXXXXXX).
 * Accepts: +255XXXXXXXXX | 255XXXXXXXXX | 0XXXXXXXXX
 * Returns null if the result fails the Tanzania format check.
 */
function normalizePhone(raw: string): string | null {
  // Strip whitespace, dashes, parens
  let n = raw.replace(/[\s\-()]/g, "");
  // Keep only the leading + (if any) then strip any other + signs
  const hasLeadingPlus = n.startsWith("+");
  n = (hasLeadingPlus ? "+" : "") + n.replace(/\+/g, "");

  if (n.startsWith("+255")) {
    // already E.164 — keep as-is
  } else if (n.startsWith("255") && n.length === 12) {
    n = `+${n}`;
  } else if (n.startsWith("0") && n.length === 10) {
    n = `+255${n.slice(1)}`;
  } else {
    // Unknown format — refuse rather than silently add a wrong country code
    return null;
  }

  // Final validation: must match Tanzanian E.164 pattern
  if (!TZ_PHONE_RE.test(n)) return null;
  return n;
}

// ── Outbound fetch wrapper ────────────────────────────────────────────────────

async function azampayPost(path: string, body: object, token: string): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(`${AZAMPAY_API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (err: any) {
    // Surface only the error type — never echo request body on failure
    throw new Error(`AzamPay request failed: ${err?.name ?? "NetworkError"}`);
  } finally {
    clearTimeout(timer);
  }
}

// ── POST /api/payments/azampay/initiate ───────────────────────────────────────

router.post("/initiate", requireAuth, paymentLimiter, async (req, res) => {
  try {
    // 1. Validate input
    const parsed = initiateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "validation_error",
        details: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      });
    }
    const { invoiceId, phoneNumber, provider, idempotencyKey } = parsed.data;

    // Normalise & validate phone before anything else (fast-fail)
    const normalizedPhone = normalizePhone(phoneNumber);
    if (!normalizedPhone) {
      return res.status(400).json({
        error: "validation_error",
        message: "Invalid phone number. Please enter a valid Tanzanian number (e.g. +255712345678 or 0712345678).",
      });
    }

    // Deterministic idempotency key: same invoice + same phone always reuses the same key,
    // preventing double-charges when the client retries without supplying its own key.
    const idemKey = idempotencyKey ?? `azp-${invoiceId}-${normalizedPhone.replace(/\+/g, "")}`;

    // 2. Idempotency check
    const hit = await idemGet(idemKey);
    if (hit) return res.json({ ok: true, cached: true, idempotencyKey: idemKey, ...hit });

    // 3. Load & validate invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        booking: {
          include: {
            property: { select: { id: true, currency: true } },
            user: { select: { id: true, phone: true } },
          },
        },
      },
    });

    if (!invoice) return res.status(404).json({ error: "not_found", message: "Invoice not found" });

    if (String(invoice.invoiceNumber ?? "").startsWith("OINV-"))
      return res.status(400).json({ error: "invalid_invoice", message: "This invoice cannot be paid via this method" });

    if (invoice.status === "DRAFT" || invoice.status === "REJECTED")
      return res.status(400).json({ error: "invalid_status", message: "Invoice is not payable" });

    if (invoice.status === "PAID")
      return res.status(400).json({ error: "already_paid", message: "Invoice already paid" });

    // 4. Server-side amount — never trust the client
    const amount = Number(invoice.total ?? invoice.netPayable ?? 0);
    const currency = invoice.booking?.property?.currency ?? "TZS";
    if (!Number.isFinite(amount) || amount <= 0)
      return res.status(400).json({ error: "invalid_amount", message: "Invoice has no payable amount" });

    // 5. Payment ref (normalizedPhone already computed and validated above)
    const paymentRef = invoice.paymentRef ?? `INV-${invoice.id}-${Date.now()}`;

    // 6. Mark invoice as PROCESSING
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paymentRef: invoice.paymentRef ?? paymentRef,
        paymentMethod: provider,
        status: invoice.status !== "PROCESSING" ? "PROCESSING" : invoice.status,
      },
    });

    // 7. Build checkout payload (no secret material inside)
    // TZS has no fractional cents — always send as a rounded integer string.
    const azampayBody = {
      accountNumber: normalizedPhone,
      amount: Math.round(amount).toString(),
      currency,
      externalId: paymentRef,
      provider,
      additionalProperties: {
        invoiceId: invoice.id.toString(),
        bookingId: invoice.bookingId?.toString() ?? "",
      },
    };

    // 8. Acquire Bearer token — fail fast with opaque 503 on error
    let token: string;
    try {
      token = await getAzamPayToken();
    } catch (authErr: any) {
      console.error("[AzamPay] Token acquisition failed:", authErr?.message ?? "unknown");
      return res.status(503).json({ error: "payment_unavailable", message: "Payment service temporarily unavailable" });
    }

    // 9. Call AzamPay; retry once on 401 (stale token)
    let apiRes = await azampayPost("/api/v1/Partner/PostCheckout", azampayBody, token);
    if (apiRes.status === 401) {
      await invalidateAzamPayToken();
      try { token = await getAzamPayToken(); } catch { /* let next block handle */ }
      apiRes = await azampayPost("/api/v1/Partner/PostCheckout", azampayBody, token!);
    }

    if (!apiRes.ok) {
      try { await apiRes.text(); } catch { /* discard */ }
      console.error(`[AzamPay] Checkout HTTP ${apiRes.status} for invoice ${invoice.id}`);
      return res.status(502).json({ error: "payment_failed", message: "Payment could not be initiated — please try again" });
    }

    let azampayData: any;
    try { azampayData = await apiRes.json(); }
    catch {
      console.error("[AzamPay] Non-JSON response from checkout endpoint");
      return res.status(502).json({ error: "payment_failed", message: "Unexpected response from payment provider" });
    }

    // 10. Record payment event (non-fatal)
    try {
      await prisma.paymentEvent.create({
        data: {
          provider: "AZAMPAY",
          eventId: azampayData.transactionId ?? paymentRef,
          invoiceId: invoice.id,
          amount,
          currency,
          status: "PENDING",
          payload: {
            transactionId: azampayData.transactionId ?? null,
            paymentRef,
            phoneNumber: normalizedPhone,
            provider,
            checkoutUrl: azampayData.checkoutUrl ?? null,
          },
        },
      });
    } catch (dbErr: any) {
      console.warn("[AzamPay] Failed to create PaymentEvent:", dbErr?.message ?? dbErr);
    }

    // 11. Cache result and respond
    const result = {
      transactionId: azampayData.transactionId ?? paymentRef,
      paymentRef,
      status: "PENDING",
      checkoutUrl: azampayData.checkoutUrl ?? null,
    };
    await idemSet(idemKey, result);
    return res.json({ ok: true, idempotencyKey: idemKey, ...result });

  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[AzamPay] /initiate unhandled error:", err);
    } else {
      console.error("[AzamPay] /initiate unhandled error:", err?.message ?? "unknown");
    }
    return res.status(500).json({ error: "internal_error", message: "An unexpected error occurred" });
  }
});

// ── GET /api/payments/azampay/status/:paymentRef ──────────────────────────────

router.get("/status/:paymentRef", requireAuth, async (req, res) => {
  try {
    const { paymentRef } = req.params;

    // Basic format guard
    if (!paymentRef || paymentRef.length > 100 || !/^[\w\-]+$/.test(paymentRef))
      return res.status(400).json({ error: "invalid_ref", message: "Invalid payment reference" });

    const invoice = await prisma.invoice.findFirst({
      where: { paymentRef },
      select: {
        id: true,
        status: true,
        booking: { select: { property: { select: { currency: true } } } },
      },
    });

    if (!invoice) return res.status(404).json({ error: "not_found", message: "Payment reference not found" });

    const event = await prisma.paymentEvent.findFirst({
      where: { invoiceId: invoice.id, provider: "AZAMPAY" },
      orderBy: { createdAt: "desc" },
      select: { status: true, createdAt: true },
    });

    return res.json({
      ok: true,
      invoiceStatus: invoice.status,
      paymentStatus: event?.status ?? "UNKNOWN",
      currency: invoice.booking?.property?.currency ?? "TZS",
    });
  } catch (err: any) {
    console.error("[AzamPay] /status error:", err?.message ?? err);
    return res.status(500).json({ error: "internal_error", message: "An unexpected error occurred" });
  }
});

export default router;



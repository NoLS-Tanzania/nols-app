import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "@nolsaf/prisma";
import { asyncHandler } from "../middleware/errorHandler.js";
import { sanitizeText } from "../lib/sanitize.js";
import { limitPublicTourBookingCreate } from "../middleware/rateLimit.js";
import { getAzamPayToken, invalidateAzamPayToken } from "../lib/azampay.auth.js";
import rateLimit from "express-rate-limit";

const router = Router();

// ── Constants ─────────────────────────────────────────────────────────────────
const AZAMPAY_API_URL = (process.env.AZAMPAY_API_URL || "https://api.azampay.co.tz").replace(/\/$/, "");
const FETCH_TIMEOUT_MS = 10_000;
const TZ_PHONE_RE = /^(\+255|0)(6|7|2)\d{8}$/;
const PAYMENT_ACCESS_TOKEN_HOURS = 12;

// ── Rate limiters ─────────────────────────────────────────────────────────────
const tourPaymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 4,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => `tour-pay:${req.ip || "anon"}`,
  message: { ok: false, error: "rate_limited", message: "Too many payment attempts. Please try again later." },
});

// ── JWT helpers ───────────────────────────────────────────────────────────────
function getTokenSecret(): string {
  const secret =
    process.env.PUBLIC_LINK_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV !== "production" ? "dev_jwt_secret" : "");
  if (!secret) throw new Error("tour_booking_secret_missing");
  return secret;
}

function signTourBookingAccessToken(tourBookingId: number): string {
  return jwt.sign(
    { typ: "TOUR_BOOKING_ACCESS", tourBookingId },
    getTokenSecret(),
    { expiresIn: `${PAYMENT_ACCESS_TOKEN_HOURS}h`, issuer: "nolsaf-public", subject: String(tourBookingId) }
  );
}

function verifyTourBookingAccessToken(token: string | undefined, tourBookingId: number): boolean {
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, getTokenSecret(), { issuer: "nolsaf-public" }) as any;
    return decoded?.typ === "TOUR_BOOKING_ACCESS" && Number(decoded.tourBookingId) === tourBookingId;
  } catch {
    return false;
  }
}

// ── Phone normalisation ───────
function isDraftPaymentAccessActive(createdAt: Date): boolean {
  const createdAtMs = createdAt instanceof Date && Number.isFinite(createdAt.getTime()) ? createdAt.getTime() : 0;
  return createdAtMs > 0 && createdAtMs + PAYMENT_ACCESS_TOKEN_HOURS * 60 * 60 * 1000 > Date.now();
}

function normalizePhone(raw: string): string | null {
  let n = raw.replace(/[\s\-()]/g, "");
  const hasLeadingPlus = n.startsWith("+");
  n = (hasLeadingPlus ? "+" : "") + n.replace(/\+/g, "");
  if (n.startsWith("+255")) { /* already E.164 */ }
  else if (n.startsWith("255") && n.length === 12) n = `+${n}`;
  else if (n.startsWith("0") && n.length === 10) n = `+255${n.slice(1)}`;
  else return null;
  if (!TZ_PHONE_RE.test(n)) return null;
  return n;
}

// ── AzamPay helper ──────
async function azampayPost(path: string, body: object, token: string): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(`${AZAMPAY_API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (err: any) {
    throw new Error(`AzamPay request failed: ${err?.name ?? "NetworkError"}`);
  } finally {
    clearTimeout(timer);
  }
}

type OperatorProfile = {
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  operatingRegions?: unknown;
  packageItems?: unknown;
};

const createTourBookingSchema = z
  .object({
    operatorAgentId: z.number().int().positive(),
    packageId: z.string().min(1).max(120),
    travelerCount: z.number().int().positive().max(200).default(1),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
    guestName: z.string().max(160).optional().default(""),
    guestEmail: z.string().email().max(160).optional().or(z.literal("")).default(""),
    guestPhone: z.string().max(40).optional().default(""),
    nationality: z.string().max(80).optional().default(""),
    notes: z.string().max(2000).optional().default(""),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

function asProfile(value: unknown): OperatorProfile {
  return value && typeof value === "object" ? (value as OperatorProfile) : {};
}

function approvedProfile(value: unknown): OperatorProfile | null {
  if (!value || typeof value !== "object") return null;
  const profile = value as Record<string, any>;
  const status = String(profile.reviewStatus || profile.review?.status || "").toUpperCase();
  if (status !== "APPROVED") return null;
  const approved = profile.approvedSnapshot && typeof profile.approvedSnapshot === "object" ? profile.approvedSnapshot : profile;
  return asProfile(approved);
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safeObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, any>) : {};
}

function money(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function clean(value: unknown, max = 500): string | null {
  const s = sanitizeText(String(value || "").trim()).slice(0, max);
  return s || null;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function findPackage(profile: OperatorProfile, packageId: string) {
  return asArray<any>(profile.packageItems).find((pkg, index) => String(pkg?.id || index) === packageId) || null;
}

async function getTourCommissionPercent(): Promise<number> {
  try {
    const settings =
      (await prisma.systemSetting.findUnique({ where: { id: 1 }, select: { agentCommissionPercent: true } as any })) ??
      (await prisma.systemSetting.create({ data: { id: 1 } } as any));
    const pct = Number((settings as any)?.agentCommissionPercent ?? 15);
    return Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 15;
  } catch {
    return 15;
  }
}

async function makeBookingCode(): Promise<string> {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  for (let i = 0; i < 8; i += 1) {
    const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
    const bookingCode = `TOUR-${stamp}-${suffix}`;
    const existing = await prisma.tourBooking.findUnique({ where: { bookingCode }, select: { id: true } });
    if (!existing) return bookingCode;
  }
  return `TOUR-${stamp}-${Date.now().toString(36).toUpperCase()}`;
}

router.post(
  "/",
  limitPublicTourBookingCreate,
  asyncHandler(async (req: any, res) => {
    const parsed = createTourBookingSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "invalid_tour_booking", details: parsed.error.flatten() });
    }

    const data = parsed.data;
    const agent = await prisma.agent.findFirst({
      where: {
        id: data.operatorAgentId,
        status: "ACTIVE",
        operatorProfile: { not: null },
      },
      select: {
        id: true,
        operatorProfile: true,
        user: {
          select: {
            id: true,
            name: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!agent) return res.status(404).json({ ok: false, error: "operator_not_found" });

    const profile = approvedProfile(agent.operatorProfile);
    if (!profile) return res.status(403).json({ ok: false, error: "operator_not_approved" });

    const pkg = findPackage(profile, data.packageId);
    if (!pkg) return res.status(404).json({ ok: false, error: "package_not_found" });
    const packageStatus = String(pkg?.status || "APPROVED").toUpperCase();
    if (!["APPROVED", "LIVE", "PUBLISHED", "ACTIVE"].includes(packageStatus)) {
      return res.status(403).json({ ok: false, error: "package_not_approved" });
    }

    const minPax = Math.max(1, num(pkg?.minPax) || 1);
    const maxPax = Math.max(minPax, num(pkg?.maxPax) || minPax);
    if (data.travelerCount < minPax || data.travelerCount > maxPax) {
      return res.status(400).json({
        ok: false,
        error: "invalid_traveler_count",
        minPax,
        maxPax,
      });
    }

    const baseUnitPrice = money(num(pkg?.pricePerPerson || pkg?.price));
    if (baseUnitPrice <= 0) {
      return res.status(400).json({ ok: false, error: "package_price_missing" });
    }

    const currency = String(pkg?.currency || "TZS").slice(0, 3).toUpperCase();
    const commissionPercent = await getTourCommissionPercent();
    const baseSubtotal = money(baseUnitPrice * data.travelerCount);
    const commissionAmount = money((baseSubtotal * commissionPercent) / 100);
    const grossAmount = money(baseSubtotal + commissionAmount);
    const operatorPayoutAmount = money(Math.max(0, grossAmount - commissionAmount));
    const unitPrice = money(grossAmount / data.travelerCount);
    const startDate = parseDate(data.startDate);
    const endDate = parseDate(data.endDate);

    const paymentAccessIssuedAt = new Date();
    const paymentAccessExpiresAt = new Date(paymentAccessIssuedAt.getTime() + PAYMENT_ACCESS_TOKEN_HOURS * 60 * 60 * 1000);
    const initialMetadata = {
      ...safeObject(data.metadata),
      paymentAccess: {
        issuedAt: paymentAccessIssuedAt.toISOString(),
        expiresAt: paymentAccessExpiresAt.toISOString(),
        tokenHours: PAYMENT_ACCESS_TOKEN_HOURS,
        source: "PUBLIC_BOOKING_CREATE",
      },
    };
    const booking = await prisma.tourBooking.create({
      data: {
        bookingCode: await makeBookingCode(),
        operatorAgentId: agent.id,
        customerId: req.user?.id ?? null,
        packageId: data.packageId,
        packageSnapshot: pkg,
        operatorSnapshot: {
          companyName: profile.companyName || agent.user?.fullName || agent.user?.name || null,
          contactEmail: profile.contactEmail || agent.user?.email || null,
          contactPhone: profile.contactPhone || agent.user?.phone || null,
          operatingRegions: asArray(profile.operatingRegions),
        },
        title: clean(pkg?.name || pkg?.title || "Tour package", 200) || "Tour package",
        destination: clean(pkg?.destination, 200),
        category: clean(pkg?.category, 80),
        startDate,
        endDate,
        guestName: clean(data.guestName, 160),
        guestEmail: clean(data.guestEmail, 160),
        guestPhone: clean(data.guestPhone, 40),
        nationality: clean(data.nationality, 80),
        travelerCount: data.travelerCount,
        status: "PENDING_PAYMENT",
        paymentStatus: "UNPAID",
        payoutStatus: "NOT_READY",
        currency,
        unitPrice: unitPrice as any,
        grossAmount: grossAmount as any,
        commissionPercent: commissionPercent as any,
        commissionAmount: commissionAmount as any,
        operatorPayoutAmount: operatorPayoutAmount as any,
        notes: clean(data.notes, 2000),
        metadata: initialMetadata,
      },
    });
    const bookingAccessToken = signTourBookingAccessToken(booking.id);

    return res.status(201).json({
      ok: true,
      booking: {
        id: booking.id,
        bookingCode: booking.bookingCode,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        currency: booking.currency,
        grossAmount: Number(booking.grossAmount),
        commissionAmount: Number(booking.commissionAmount),
        operatorPayoutAmount: Number(booking.operatorPayoutAmount),
        title: booking.title,
        destination: booking.destination,
        travelerCount: booking.travelerCount,
        startDate: booking.startDate,
      },
      accessToken: bookingAccessToken,
      accessTokenExpiresAt: paymentAccessExpiresAt.toISOString(),
      nextStep: "checkout",
    });
  }),
);

// ── GET /:id/payment-status ───────────────────────────────────────────────────

router.get(
  "/:id/payment-status",
  asyncHandler(async (req: any, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: "invalid_id" });
    }

    const accessToken = String(req.query.accessToken || "");
    if (!verifyTourBookingAccessToken(accessToken, id)) {
      return res.status(403).json({ ok: false, error: "invalid_access_token" });
    }

    const booking = await prisma.tourBooking.findUnique({
      where: { id },
      select: {
        id: true,
        bookingCode: true,
        title: true,
        destination: true,
        category: true,
        startDate: true,
        travelerCount: true,
        status: true,
        paymentStatus: true,
        currency: true,
        grossAmount: true,
        unitPrice: true,
        commissionPercent: true,
        commissionAmount: true,
        guestName: true,
        guestPhone: true,
        payerPhone: true,
        paidAt: true,
        operatorSnapshot: true,
        createdAt: true,
      },
    });

    if (!booking) return res.status(404).json({ ok: false, error: "not_found" });
    if (booking.paymentStatus !== "PAID" && !booking.paidAt && !isDraftPaymentAccessActive(booking.createdAt)) {
      return res.status(410).json({ ok: false, error: "payment_access_expired", message: "This draft payment link has expired." });
    }

    return res.json({
      ok: true,
      booking: {
        id: booking.id,
        bookingCode: booking.bookingCode,
        title: booking.title,
        destination: booking.destination,
        category: booking.category,
        startDate: booking.startDate,
        travelerCount: booking.travelerCount,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        currency: booking.currency,
        grossAmount: Number(booking.grossAmount),
        unitPrice: Number(booking.unitPrice),
        commissionPercent: Number(booking.commissionPercent),
        commissionAmount: Number(booking.commissionAmount),
        guestName: booking.guestName,
        guestPhone: booking.guestPhone,
        payerPhone: booking.payerPhone,
        paidAt: booking.paidAt,
        operatorSnapshot: booking.operatorSnapshot,
      },
    });
  }),
);

// ── POST /:id/initiate-payment ────────────────────────────────────────────────

const initiatePaymentSchema = z.object({
  phoneNumber: z.string().min(9).max(15),
  provider: z.enum(["Airtel", "Mixx", "M-Pesa", "Halopesa"]).default("Airtel"),
  accessToken: z.string().min(20).max(1024),
});

router.post(
  "/:id/initiate-payment",
  tourPaymentLimiter,
  asyncHandler(async (req: any, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: "invalid_id" });
    }

    const parsed = initiatePaymentSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "validation_error", details: parsed.error.flatten() });
    }

    const { phoneNumber, provider, accessToken } = parsed.data;

    if (!verifyTourBookingAccessToken(accessToken, id)) {
      return res.status(403).json({ ok: false, error: "invalid_access_token" });
    }

    const normalizedPhone = normalizePhone(phoneNumber);
    if (!normalizedPhone) {
      return res.status(400).json({
        ok: false,
        error: "invalid_phone",
        message: "Please enter a valid Tanzanian phone number (e.g. +255712345678 or 0712345678).",
      });
    }

    const booking = await prisma.tourBooking.findUnique({
      where: { id },
      select: {
        id: true,
        bookingCode: true,
        status: true,
        paymentStatus: true,
        currency: true,
        grossAmount: true,
        paymentRef: true,
        title: true,
        operatorAgentId: true,
        paidAt: true,
        createdAt: true,
      },
    });

    if (!booking) return res.status(404).json({ ok: false, error: "not_found" });

    if (booking.paymentStatus === "PAID" || booking.paidAt) {
      return res.status(400).json({ ok: false, error: "already_paid", message: "This booking is already paid." });
    }
    if (!isDraftPaymentAccessActive(booking.createdAt)) {
      return res.status(410).json({ ok: false, error: "payment_access_expired", message: "This draft payment link has expired." });
    }

    const amount = Math.round(Number(booking.grossAmount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ ok: false, error: "invalid_amount", message: "Booking has no payable amount." });
    }

    const paymentRef = booking.paymentRef ?? `TOUR-${booking.id}-${Date.now()}`;
    const currency = booking.currency || "TZS";

    const azampayBody = {
      accountNumber: normalizedPhone,
      amount: Math.round(amount).toString(),
      currency,
      externalId: paymentRef,
      provider,
      additionalProperties: {
        tourBookingId: booking.id.toString(),
        bookingCode: booking.bookingCode,
      },
    };

    let token: string;
    try {
      token = await getAzamPayToken();
    } catch {
      return res.status(503).json({ ok: false, error: "payment_unavailable", message: "Payment service temporarily unavailable." });
    }

    let apiRes = await azampayPost("/api/v1/Partner/PostCheckout", azampayBody, token);
    if (apiRes.status === 401) {
      await invalidateAzamPayToken();
      try { token = await getAzamPayToken(); } catch { /* handled below */ }
      apiRes = await azampayPost("/api/v1/Partner/PostCheckout", azampayBody, token!);
    }

    if (!apiRes.ok) {
      try { await apiRes.text(); } catch { /* discard */ }
      return res.status(502).json({ ok: false, error: "payment_failed", message: "Payment could not be initiated. Please try again." });
    }

    let azampayData: any;
    try { azampayData = await apiRes.json(); }
    catch {
      return res.status(502).json({ ok: false, error: "payment_failed", message: "Unexpected response from payment provider." });
    }

    // Update booking — store paymentRef and mark as PENDING
    await prisma.tourBooking.update({
      where: { id: booking.id },
      data: {
        paymentRef: booking.paymentRef ?? paymentRef,
        payerPhone: normalizedPhone,
        paymentStatus: "PENDING",
        checkoutSessionId: azampayData.transactionId ?? null,
      },
    });

    // Record payment event (non-fatal)
    try {
      await prisma.paymentEvent.create({
        data: {
          provider: "AZAMPAY",
          eventId: azampayData.transactionId ?? paymentRef,
          tourBookingId: booking.id,
          amount,
          currency,
          status: "PENDING",
          payload: {
            transactionId: azampayData.transactionId ?? null,
            paymentRef,
            phoneNumber: normalizedPhone,
            provider,
          },
        },
      });
    } catch (dbErr: any) {
      console.warn("[TourPay] Failed to create PaymentEvent:", dbErr?.message ?? dbErr);
    }

    return res.json({
      ok: true,
      transactionId: azampayData.transactionId ?? paymentRef,
      paymentRef,
      status: "PENDING",
    });
  }),
);

export default router;

import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@nolsaf/prisma";
import { asyncHandler } from "../middleware/errorHandler.js";
import { sanitizeText } from "../lib/sanitize.js";
import { limitPublicTourBookingCreate } from "../middleware/rateLimit.js";

const router = Router();

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

    const unitPrice = money(num(pkg?.pricePerPerson || pkg?.price));
    if (unitPrice <= 0) {
      return res.status(400).json({ ok: false, error: "package_price_missing" });
    }

    const currency = String(pkg?.currency || "TZS").slice(0, 3).toUpperCase();
    const grossAmount = money(unitPrice * data.travelerCount);
    const commissionPercent = await getTourCommissionPercent();
    const commissionAmount = money((grossAmount * commissionPercent) / 100);
    const operatorPayoutAmount = money(Math.max(0, grossAmount - commissionAmount));
    const startDate = parseDate(data.startDate);
    const endDate = parseDate(data.endDate);

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
        metadata: data.metadata ?? null,
      },
    });

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
      },
      nextStep: "checkout",
    });
  }),
);

export default router;

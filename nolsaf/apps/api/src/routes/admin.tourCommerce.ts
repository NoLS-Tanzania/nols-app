import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth as unknown as RequestHandler);
router.use(requireRole("ADMIN") as unknown as RequestHandler);

type OperatorProfile = {
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  operatingRegions?: unknown;
  packageItems?: unknown;
  documentProofs?: unknown;
  reviewStatus?: string;
  review?: {
    status?: string;
  };
};

function asProfile(value: unknown): OperatorProfile {
  return value && typeof value === "object" ? (value as OperatorProfile) : {};
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDocStatus(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  return String((value as any).status || "").toUpperCase();
}

function profileReadiness(profile: OperatorProfile) {
  const docs = profile.documentProofs && typeof profile.documentProofs === "object"
    ? (profile.documentProofs as Record<string, unknown>)
    : {};
  const required = ["brela", "tin", "license", "business"];
  const approvedDocs = required.filter((key) => normalizeDocStatus(docs[key]) === "APPROVED").length;
  const packages = asArray(profile.packageItems);
  const reviewStatus = String(profile.reviewStatus || profile.review?.status || "").toUpperCase();
  const isApproved = reviewStatus === "APPROVED";

  return {
    hasCompanyName: Boolean(String(profile.companyName || "").trim()),
    hasContact: Boolean(String(profile.contactEmail || profile.contactPhone || "").trim()),
    approvedDocs,
    requiredDocs: required.length,
    packageCount: packages.length,
    publicReady:
      isApproved ||
      Boolean(String(profile.companyName || "").trim()) &&
      Boolean(String(profile.contactEmail || profile.contactPhone || "").trim()) &&
      approvedDocs === required.length &&
      packages.length > 0,
  };
}

function normalizePackage(
  agent: any,
  pkg: any,
  index: number,
  commissionPercent: number,
  bookingStatsMap: Map<string, { bookingsCount: number; totalGenerated: number }>,
) {
  const profile = asProfile(agent.operatorProfile);
  const price = num(pkg?.pricePerPerson || pkg?.price);
  const minPax = Math.max(1, num(pkg?.minPax) || 1);
  const maxPax = Math.max(minPax, num(pkg?.maxPax) || minPax);
  const profileReviewStatus = String(profile?.reviewStatus || profile?.review?.status || "").toUpperCase();
  const status = String(pkg?.status || pkg?.visibility || profileReviewStatus || "DRAFT").toUpperCase();
  const title = String(pkg?.name || "Untitled tour package");
  const destination = String(pkg?.destination || "");
  const bookingKey = `${agent.id}::${title.trim().toLowerCase()}::${destination.trim().toLowerCase()}`;
  const stats = bookingStatsMap.get(bookingKey) || { bookingsCount: 0, totalGenerated: 0 };
  const approvedLike = ["APPROVED", "LIVE", "PUBLISHED", "ACTIVE"].includes(status);

  return {
    id: `${agent.id}:${String(pkg?.id || index)}`,
    packageId: String(pkg?.id || index),
    agentId: agent.id,
    operatorName: String(profile.companyName || agent.user?.fullName || agent.user?.name || "Unnamed operator"),
    title,
    destination,
    category: String(pkg?.category || ""),
    duration: String(pkg?.duration || ""),
    minPax,
    maxPax,
    pricePerPerson: price,
    currency: String(pkg?.currency || "TZS"),
    estimatedGross: price * minPax,
    nolsafPercent: approvedLike ? commissionPercent : 0,
    bookingsCount: stats.bookingsCount,
    totalGenerated: stats.totalGenerated,
    status,
  };
}

async function loadOperators() {
  return prisma.agent.findMany({
    where: { operatorProfile: { not: null } },
    orderBy: { updatedAt: "desc" },
    take: 500,
    select: {
      id: true,
      status: true,
      isAvailable: true,
      totalCompletedTrips: true,
      totalRevenueGenerated: true,
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
}

router.get("/overview", async (_req, res) => {
  try {
    const [agents, recentBookings, paidTotals, systemSetting, paidPackageGroups] = await Promise.all([
      loadOperators(),
      prisma.tourBooking.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          operator: {
            select: {
              id: true,
              user: { select: { name: true, fullName: true, email: true } },
              operatorProfile: true,
            },
          },
          customer: { select: { id: true, name: true, fullName: true, email: true, phone: true } },
        },
      }),
      prisma.tourBooking.aggregate({
        where: { paymentStatus: "PAID" },
        _count: { _all: true },
        _sum: {
          grossAmount: true,
          commissionAmount: true,
          operatorPayoutAmount: true,
        },
      }),
      prisma.systemSetting.findFirst({
        select: {
          commissionPercent: true,
        },
      }),
      prisma.tourBooking.groupBy({
        by: ["operatorAgentId", "title", "destination"],
        where: { paymentStatus: "PAID" },
        _count: { _all: true },
        _sum: { grossAmount: true },
      }),
    ]);

    const commissionPercent = num(systemSetting?.commissionPercent ?? 10);
    const bookingStatsMap = new Map<string, { bookingsCount: number; totalGenerated: number }>();
    for (const row of paidPackageGroups) {
      const key = `${Number(row.operatorAgentId || 0)}::${String(row.title || "").trim().toLowerCase()}::${String(row.destination || "").trim().toLowerCase()}`;
      bookingStatsMap.set(key, {
        bookingsCount: Number((row as any)?._count?._all || 0),
        totalGenerated: Number((row as any)?._sum?.grossAmount || 0),
      });
    }

    const packages = agents.flatMap((agent) =>
      asArray(asProfile(agent.operatorProfile).packageItems).map((pkg, index) =>
        normalizePackage(agent, pkg, index, commissionPercent, bookingStatsMap),
      ),
    );

    const operators = agents.map((agent) => {
      const profile = asProfile(agent.operatorProfile);
      return {
        id: agent.id,
        status: agent.status,
        isAvailable: agent.isAvailable,
        name: profile.companyName || agent.user?.fullName || agent.user?.name || "Unnamed operator",
        email: profile.contactEmail || agent.user?.email || null,
        phone: profile.contactPhone || agent.user?.phone || null,
        regions: asArray<string>(profile.operatingRegions),
        completedTrips: agent.totalCompletedTrips,
        totalRevenueGenerated: Number(agent.totalRevenueGenerated || 0),
        readiness: profileReadiness(profile),
      };
    });

    const publicReadyOperators = operators.filter((operator) => operator.readiness.publicReady).length;
    const grossPackageFloor = packages.reduce((sum, pkg) => sum + Number(pkg.estimatedGross || 0), 0);
    const bookings = recentBookings.map((booking) => {
      const operatorProfile = asProfile(booking.operator?.operatorProfile);
      return {
        id: booking.id,
        bookingCode: booking.bookingCode,
        operatorAgentId: booking.operatorAgentId,
        operatorName: operatorProfile.companyName || booking.operator?.user?.fullName || booking.operator?.user?.name || "Unnamed operator",
        customerName: booking.customer?.fullName || booking.customer?.name || booking.guestName || "Guest",
        customerEmail: booking.customer?.email || booking.guestEmail || null,
        title: booking.title,
        destination: booking.destination,
        category: booking.category,
        travelerCount: booking.travelerCount,
        startDate: booking.startDate,
        endDate: booking.endDate,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        payoutStatus: booking.payoutStatus,
        currency: booking.currency,
        grossAmount: Number(booking.grossAmount || 0),
        commissionAmount: Number(booking.commissionAmount || 0),
        operatorPayoutAmount: Number(booking.operatorPayoutAmount || 0),
        paidAt: booking.paidAt,
        createdAt: booking.createdAt,
      };
    });
    const paidBookingCount = Number(paidTotals._count?._all || 0);
    const livePackageCount = packages.filter((pkg) => ["LIVE", "PUBLISHED", "ACTIVE", "APPROVED"].includes(String(pkg.status).toUpperCase())).length;

    return res.json({
      ok: true,
      summary: {
        operators: operators.length,
        activeOperators: operators.filter((operator) => String(operator.status).toUpperCase() === "ACTIVE").length,
        publicReadyOperators,
        packages: packages.length,
        livePackages: livePackageCount,
        paidBookings: paidBookingCount,
        grossBookingRevenue: Number(paidTotals._sum.grossAmount || 0),
        nolsafCommission: Number(paidTotals._sum.commissionAmount || 0),
        operatorPayout: Number(paidTotals._sum.operatorPayoutAmount || 0),
        grossPackageFloor,
        currency: "TZS",
      },
      operators,
      packages,
      bookings,
    });
  } catch (err: any) {
    console.error("[GET /admin/tour-commerce/overview] Error:", err);
    return res.status(500).json({ ok: false, error: "Failed to load tour commerce overview" });
  }
});

export default router;

// =============================================================================
// Agent (tour-operator) tier model — SINGLE SOURCE OF TRUTH.
//
// A tier is earned by meeting ALL three tour-company signals at once:
//   • Volume  — completed tour bookings (TourBooking, status = COMPLETED)
//   • Revenue — NoLSAF commission realised, in USD (Σ TourBooking.commissionAmount).
//               The tour flow is quoted in USD end-to-end (invoice → payout), so
//               commission is already USD — no FX conversion.
//   • Quality — average customer rating (AgentReview), gated by a minimum count
//
// Benefits per tier are visibility + badge + payout speed only.
// Commission rate is intentionally NOT a tier benefit — it stays flat for all.
//
// Both /api/agent/me (operator dashboard) and /api/admin/agents/:id (admin panel)
// import this so the level can never disagree between views again.
// =============================================================================

export type AgentTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export interface AgentTierBenefits {
  /// Customer-facing verified badge label (null = no badge).
  badge: string | null;
  /// Marketplace ranking treatment (human label).
  visibility: string;
  /// Numeric ranking weight for marketplace search ordering (higher = earlier).
  visibilityWeight: number;
  /// Payout speed tier.
  payout: string;
}

export interface AgentTierSpec {
  level: AgentTier;
  minTours: number;
  minRevenue: number; // NoLSAF commission revenue, in USD
  minRating: number; // average rating gate (0 = no gate)
  minReviews: number; // reviews required before the rating gate is trusted
  benefits: AgentTierBenefits;
}

// Listed HIGHEST FIRST so the first qualifying tier wins.
export const AGENT_TIERS: AgentTierSpec[] = [
  {
    level: "PLATINUM",
    minTours: 60,
    minRevenue: 20_000, // USD
    minRating: 4.6,
    minReviews: 20,
    benefits: { badge: "Platinum verified", visibility: "Featured", visibilityWeight: 4, payout: "Fastest" },
  },
  {
    level: "GOLD",
    minTours: 30,
    minRevenue: 8_000, // USD
    minRating: 4.3,
    minReviews: 10,
    benefits: { badge: "Gold verified", visibility: "Priority", visibilityWeight: 3, payout: "Faster" },
  },
  {
    level: "SILVER",
    minTours: 10,
    minRevenue: 2_000, // USD
    minRating: 3.8,
    minReviews: 3,
    benefits: { badge: "Silver verified", visibility: "Boosted", visibilityWeight: 2, payout: "Standard" },
  },
  {
    level: "BRONZE",
    minTours: 0,
    minRevenue: 0,
    minRating: 0,
    minReviews: 0,
    benefits: { badge: null, visibility: "Standard", visibilityWeight: 1, payout: "Standard" },
  },
];

export interface AgentLevelInputs {
  completedTours: number;
  noLSAFRevenue: number;
  overallRating: number | null;
  totalReviews: number;
}

export interface AgentLevelNext {
  level: AgentTier;
  requirements: { tours: number; revenue: number; rating: number; reviews: number };
  remaining: { tours: number; revenue: number };
  met: { tours: boolean; revenue: boolean; rating: boolean; reviews: boolean };
  progress: { tours: number; revenue: number; rating: number; reviews: number; overall: number };
}

export interface AgentLevelResult {
  level: AgentTier;
  benefits: AgentTierBenefits;
  completedTours: number;
  noLSAFRevenue: number;
  overallRating: number | null;
  totalReviews: number;
  next: AgentLevelNext | null;
}

const pct = (current: number, min: number) =>
  min <= 0 ? 100 : Math.min(100, Math.round((current / min) * 100));

// The four editable thresholds per tier (benefits are NOT admin-editable).
const EDITABLE_TIERS: AgentTier[] = ["SILVER", "GOLD", "PLATINUM"];
const THRESHOLD_KEYS = ["minTours", "minRevenue", "minRating", "minReviews"] as const;
type ThresholdKey = (typeof THRESHOLD_KEYS)[number];

/** The current default ladder as a plain editable config (for admin forms). */
export function defaultTierLadderConfig(): Record<string, Record<ThresholdKey, number>> {
  const out: Record<string, Record<ThresholdKey, number>> = {};
  for (const tier of EDITABLE_TIERS) {
    const spec = AGENT_TIERS.find((t) => t.level === tier)!;
    out[tier] = { minTours: spec.minTours, minRevenue: spec.minRevenue, minRating: spec.minRating, minReviews: spec.minReviews };
  }
  return out;
}

/**
 * Strict validation for the admin SAVE path. Each tier's thresholds must be
 * non-negative (rating 0–5) and monotonically non-decreasing SILVER→PLATINUM.
 */
export function validateTierLadder(
  raw: unknown
): { ok: true; ladder: Record<string, Record<ThresholdKey, number>> } | { ok: false; errors: Array<{ field: string; message: string }> } {
  const errors: Array<{ field: string; message: string }> = [];
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, any>) : {};
  const ladder = defaultTierLadderConfig();

  for (const tier of EDITABLE_TIERS) {
    const tierRaw = obj[tier] && typeof obj[tier] === "object" ? obj[tier] : {};
    for (const key of THRESHOLD_KEYS) {
      if (tierRaw[key] === undefined || tierRaw[key] === null || tierRaw[key] === "") continue; // keep default
      const n = Number(tierRaw[key]);
      if (!Number.isFinite(n) || n < 0) {
        errors.push({ field: `${tier}.${key}`, message: "Must be a non-negative number." });
        continue;
      }
      if (key === "minRating" && n > 5) {
        errors.push({ field: `${tier}.${key}`, message: "Rating must be between 0 and 5." });
        continue;
      }
      if ((key === "minTours" || key === "minReviews") && !Number.isInteger(n)) {
        errors.push({ field: `${tier}.${key}`, message: "Must be a whole number." });
        continue;
      }
      ladder[tier][key] = n;
    }
  }

  // Monotonicity: each tier must be >= the one below it on every threshold.
  for (let i = 1; i < EDITABLE_TIERS.length; i++) {
    const lower = ladder[EDITABLE_TIERS[i - 1]];
    const higher = ladder[EDITABLE_TIERS[i]];
    for (const key of THRESHOLD_KEYS) {
      if (higher[key] < lower[key]) {
        errors.push({
          field: `${EDITABLE_TIERS[i]}.${key}`,
          message: `Must be ≥ ${EDITABLE_TIERS[i - 1]} (${lower[key]}).`,
        });
      }
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, ladder };
}

/**
 * Defensive resolver for READ paths. Merges stored config over the hardcoded
 * defaults; on any invalid/missing config it returns the full defaults.
 * Benefits always come from the defaults — only thresholds are configurable.
 */
export function resolveTierLadder(raw: unknown): AgentTierSpec[] {
  const result = validateTierLadder(raw);
  if (!result.ok) return AGENT_TIERS;
  const cfg = result.ladder;
  return AGENT_TIERS.map((spec) => {
    if (!EDITABLE_TIERS.includes(spec.level)) return spec; // BRONZE base
    const t = cfg[spec.level];
    return { ...spec, minTours: t.minTours, minRevenue: t.minRevenue, minRating: t.minRating, minReviews: t.minReviews };
  });
}

export function computeAgentLevel(
  inputs: AgentLevelInputs,
  tiers: AgentTierSpec[] = AGENT_TIERS
): AgentLevelResult {
  const completedTours = Math.max(0, Math.floor(Number(inputs.completedTours) || 0));
  const noLSAFRevenue = Math.max(0, Number(inputs.noLSAFRevenue) || 0);
  const totalReviews = Math.max(0, Math.floor(Number(inputs.totalReviews) || 0));
  const overallRating = inputs.overallRating != null ? Number(inputs.overallRating) : null;
  const rating = overallRating != null ? overallRating : 0;

  const qualifies = (t: AgentTierSpec) =>
    completedTours >= t.minTours &&
    noLSAFRevenue >= t.minRevenue &&
    totalReviews >= t.minReviews &&
    rating >= t.minRating;

  const idx = tiers.findIndex(qualifies);
  const safeIdx = idx === -1 ? tiers.length - 1 : idx; // BRONZE fallback
  const current = tiers[safeIdx];
  const nextSpec = safeIdx > 0 ? tiers[safeIdx - 1] : null;

  let next: AgentLevelNext | null = null;
  if (nextSpec) {
    const tours = pct(completedTours, nextSpec.minTours);
    const revenue = pct(noLSAFRevenue, nextSpec.minRevenue);
    const ratingP = pct(rating, nextSpec.minRating);
    const reviewsP = pct(totalReviews, nextSpec.minReviews);
    next = {
      level: nextSpec.level,
      requirements: {
        tours: nextSpec.minTours,
        revenue: nextSpec.minRevenue,
        rating: nextSpec.minRating,
        reviews: nextSpec.minReviews,
      },
      remaining: {
        tours: Math.max(0, nextSpec.minTours - completedTours),
        revenue: Math.max(0, nextSpec.minRevenue - noLSAFRevenue),
      },
      met: {
        tours: completedTours >= nextSpec.minTours,
        revenue: noLSAFRevenue >= nextSpec.minRevenue,
        rating: rating >= nextSpec.minRating,
        reviews: totalReviews >= nextSpec.minReviews,
      },
      progress: {
        tours,
        revenue,
        rating: ratingP,
        reviews: reviewsP,
        overall: Math.round((tours + revenue + ratingP + reviewsP) / 4),
      },
    };
  }

  return { level: current.level, benefits: current.benefits, completedTours, noLSAFRevenue, overallRating, totalReviews, next };
}

export function tierBenefits(level: string): AgentTierBenefits {
  const found = AGENT_TIERS.find((t) => t.level === String(level).toUpperCase());
  return (found ?? AGENT_TIERS[AGENT_TIERS.length - 1]).benefits;
}

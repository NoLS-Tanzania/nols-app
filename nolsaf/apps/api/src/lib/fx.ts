// apps/api/src/lib/fx.ts
//
// Display-currency FX layer.
//
// IMPORTANT — read before changing anything:
//   TZS is the *money of record*. Every charge, payout, invoice and commission
//   is computed and settled in TZS. The values produced here are PRESENTATION
//   ONLY. They convert an authoritative TZS amount into a number we *show* the
//   user in their chosen display currency. They must NEVER be written back into
//   a charge, payout, invoice total, or anything the payment processor sees.
//
// Representation:
//   We store `tzsPerUnit[X]` = how many TZS equal 1 unit of currency X.
//   Display value = amountTZS / tzsPerUnit[X].
//   This is the most intuitive shape for manual admin entry ("1 USD = 2600 TZS").
//
// Resilience ladder (getFxRates merges in this order, later wins):
//   1. Baked-in FALLBACK_TZS_PER_UNIT (always present, never crashes)
//   2. Stored manual/auto rates from SystemSetting.fxRates (if column exists)
// A short in-process cache keeps this off the hot path; it is never a
// per-request live network dependency.

import { prisma } from "@nolsaf/prisma";

export const BASE_CURRENCY = "TZS" as const;

export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
  /** Decimal places used when formatting amounts in this currency. */
  decimals: number;
}

/**
 * Currencies the platform is allowed to *display*. Adding a row here is safe;
 * it just needs a fallback rate + (ideally) a stored rate. TZS must stay first.
 */
export const SUPPORTED_CURRENCIES: Record<string, CurrencyMeta> = {
  TZS: { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", decimals: 0 },
  USD: { code: "USD", name: "US Dollar", symbol: "$", decimals: 2 },
  EUR: { code: "EUR", name: "Euro", symbol: "€", decimals: 2 },
  KES: { code: "KES", name: "Kenyan Shilling", symbol: "KSh", decimals: 0 },
};

export const SUPPORTED_CURRENCY_CODES = Object.keys(SUPPORTED_CURRENCIES);

/**
 * Baked-in last-resort rates (TZS per 1 unit). Deliberately conservative,
 * round numbers — they only ever show up if the DB has nothing better. Keep
 * these updated occasionally so the floor never drifts wildly from reality.
 */
export const FALLBACK_TZS_PER_UNIT: Record<string, number> = {
  TZS: 1,
  USD: 2600,
  EUR: 2800,
  KES: 20,
};

/**
 * Absolute sanity bounds (TZS per unit). Any rate outside its band is rejected
 * on input and ignored on read — protects against fat-finger entry and a future
 * automated feed returning garbage. Wide enough to never block a real move.
 */
export const RATE_BOUNDS: Record<string, { min: number; max: number }> = {
  TZS: { min: 1, max: 1 },
  USD: { min: 1500, max: 6000 },
  EUR: { min: 1600, max: 6500 },
  KES: { min: 8, max: 45 },
};

/** Relative drift band vs. the current effective rate (used by the auto feed later). */
export const DRIFT_BAND = 0.2; // ±20%

/** How long a stored rate set is considered fresh for display purposes. */
export const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface FxRateState {
  base: typeof BASE_CURRENCY;
  /** TZS per 1 unit of each supported currency. Always includes every supported code. */
  tzsPerUnit: Record<string, number>;
  /** ISO timestamp of the last stored update, or null if only fallbacks are in use. */
  updatedAt: string | null;
  /** Where the effective rates came from. */
  source: "fallback" | "manual" | "auto";
  /** Per-currency admin pin: a locked rate is never overwritten by the auto feed. */
  locked: Record<string, boolean>;
  /** True when the stored set exists but is older than STALE_AFTER_MS. */
  stale: boolean;
}

// ─── In-process cache ───────────────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cached: { state: FxRateState; at: number } | null = null;

export function invalidateFxCache(): void {
  cached = null;
}

// Graceful column-availability guard (mirrors admin.settings.ts pattern). The
// fxRates column may not exist yet on an unmigrated DB; never crash the API.
let fxColumnAvailable: boolean | null = null;
async function hasFxColumn(): Promise<boolean> {
  if (fxColumnAvailable !== null) return fxColumnAvailable;
  try {
    await prisma.systemSetting.findUnique({
      where: { id: 1 },
      select: { fxRates: true } as any,
    });
    fxColumnAvailable = true;
  } catch (err: any) {
    if (
      err?.code === "P2022" ||
      err?.code === "P2021" ||
      String(err?.message || "").includes("ColumnNotFound") ||
      String(err?.message || "").includes("TableNotFound") ||
      String(err?.message || "").includes("Unknown field")
    ) {
      fxColumnAvailable = false;
    } else {
      throw err;
    }
  }
  return fxColumnAvailable;
}

function fallbackState(): FxRateState {
  return {
    base: BASE_CURRENCY,
    tzsPerUnit: { ...FALLBACK_TZS_PER_UNIT },
    updatedAt: null,
    source: "fallback",
    locked: {},
    stale: false,
  };
}

/** True when `value` (TZS per unit of `code`) is within its absolute bounds. */
export function isRateSane(code: string, value: unknown): boolean {
  const bounds = RATE_BOUNDS[code];
  if (!bounds) return false;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return false;
  return value >= bounds.min && value <= bounds.max;
}

/** True when `next` is within DRIFT_BAND of `current` (both TZS per unit). */
export function passesDriftBand(current: number, next: number): boolean {
  if (!Number.isFinite(current) || current <= 0) return true; // no baseline → accept
  const ratio = next / current;
  return ratio >= 1 - DRIFT_BAND && ratio <= 1 + DRIFT_BAND;
}

/**
 * Resolve the effective display-rate state. Starts from baked-in fallbacks and
 * overlays any sane stored rates. Cached for CACHE_TTL_MS. Never throws.
 */
export async function getFxRates(force = false): Promise<FxRateState> {
  const now = Date.now();
  if (!force && cached && now - cached.at < CACHE_TTL_MS) {
    return cached.state;
  }

  const state = fallbackState();

  try {
    if (await hasFxColumn()) {
      const row = await prisma.systemSetting.findUnique({
        where: { id: 1 },
        select: { fxRates: true } as any,
      });
      const stored = (row as any)?.fxRates as
        | {
            base?: string;
            tzsPerUnit?: Record<string, unknown>;
            updatedAt?: string;
            source?: string;
            locked?: Record<string, unknown>;
          }
        | null
        | undefined;

      if (stored && stored.tzsPerUnit && typeof stored.tzsPerUnit === "object") {
        let overlaidAny = false;
        for (const code of SUPPORTED_CURRENCY_CODES) {
          const v = (stored.tzsPerUnit as Record<string, unknown>)[code];
          if (isRateSane(code, v)) {
            state.tzsPerUnit[code] = v as number;
            overlaidAny = true;
          }
        }
        if (overlaidAny) {
          state.source = stored.source === "auto" ? "auto" : "manual";
          state.updatedAt = typeof stored.updatedAt === "string" ? stored.updatedAt : null;
          if (stored.locked && typeof stored.locked === "object") {
            for (const code of SUPPORTED_CURRENCY_CODES) {
              if ((stored.locked as Record<string, unknown>)[code] === true) {
                state.locked[code] = true;
              }
            }
          }
          if (state.updatedAt) {
            const age = now - new Date(state.updatedAt).getTime();
            state.stale = Number.isFinite(age) && age > STALE_AFTER_MS;
          }
        }
      }
    }
  } catch {
    // Any unexpected failure → silently keep fallbacks. Display must never break.
  }

  cached = { state, at: now };
  return state;
}

/**
 * Convert an authoritative TZS amount into a display currency. Returns the raw
 * numeric value (unrounded); formatting is the caller's job (Intl.NumberFormat).
 * Falls back to the TZS amount unchanged if the currency/rate is unusable.
 */
export function convertFromBase(
  amountTZS: number,
  currency: string,
  state: FxRateState
): number {
  if (!Number.isFinite(amountTZS)) return amountTZS;
  if (currency === BASE_CURRENCY) return amountTZS;
  const rate = state.tzsPerUnit[currency];
  if (!Number.isFinite(rate) || rate <= 0) return amountTZS;
  return amountTZS / rate;
}

export interface SetManualRatesInput {
  /** TZS per unit for one or more supported currencies (TZS itself is ignored). */
  tzsPerUnit: Record<string, number>;
  /** Optional per-currency pin update. */
  locked?: Record<string, boolean>;
}

export interface SetManualRatesResult {
  ok: boolean;
  state: FxRateState;
  rejected: { code: string; value: unknown; reason: string }[];
}

/**
 * Persist admin-entered manual rates into SystemSetting.fxRates. Validates each
 * value against its absolute bounds; out-of-range values are rejected (not
 * stored). Merges over the currently stored set so a partial update is safe.
 * Invalidates the cache so the next read reflects the change immediately.
 */
export async function setManualRates(input: SetManualRatesInput): Promise<SetManualRatesResult> {
  const rejected: { code: string; value: unknown; reason: string }[] = [];

  if (!(await hasFxColumn())) {
    return {
      ok: false,
      state: await getFxRates(true),
      rejected: [{ code: "*", value: null, reason: "fxRates column not available (DB not migrated)" }],
    };
  }

  // Start from whatever is currently effective (stored overlaid on fallback) so
  // unspecified currencies retain their existing values.
  const current = await getFxRates(true);
  const nextTzsPerUnit: Record<string, number> = { ...current.tzsPerUnit, TZS: 1 };
  const nextLocked: Record<string, boolean> = { ...current.locked };

  for (const [rawCode, rawValue] of Object.entries(input.tzsPerUnit || {})) {
    const code = rawCode.toUpperCase();
    if (code === "TZS") continue; // base is fixed at 1
    if (!SUPPORTED_CURRENCY_CODES.includes(code)) {
      rejected.push({ code, value: rawValue, reason: "unsupported currency" });
      continue;
    }
    if (!isRateSane(code, rawValue)) {
      rejected.push({ code, value: rawValue, reason: "out of sane bounds" });
      continue;
    }
    nextTzsPerUnit[code] = rawValue as number;
  }

  if (input.locked) {
    for (const [rawCode, on] of Object.entries(input.locked)) {
      const code = rawCode.toUpperCase();
      if (code === "TZS" || !SUPPORTED_CURRENCY_CODES.includes(code)) continue;
      if (on) nextLocked[code] = true;
      else delete nextLocked[code];
    }
  }

  const payload = {
    base: BASE_CURRENCY,
    tzsPerUnit: nextTzsPerUnit,
    updatedAt: new Date().toISOString(),
    source: "manual" as const,
    locked: nextLocked,
  };

  await prisma.systemSetting.upsert({
    where: { id: 1 },
    update: { fxRates: payload as any },
    create: { id: 1, fxRates: payload as any } as any,
  });

  invalidateFxCache();
  const state = await getFxRates(true);
  return { ok: rejected.length === 0, state, rejected };
}

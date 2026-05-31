// apps/web/lib/money.ts
//
// Pure, no-side-effect helpers for currency conversion and formatting.
// Mirrors the rate model in apps/api/src/lib/fx.ts.
// Presentation only — never affects charges, payouts, or invoices.

/** tzsPerUnit[X] = how many TZS equal 1 unit of currency X */
export type TzsPerUnit = Record<string, number>;

export type SupportedCurrencyMeta = {
  code: string;
  symbol: string;
  name: string;
  /** Decimal places used when formatting */
  decimals: number;
  flag: string;
};

export const SUPPORTED_CURRENCIES: Record<string, SupportedCurrencyMeta> = {
  TZS: { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling", decimals: 0, flag: "🇹🇿" },
  USD: { code: "USD", symbol: "$",   name: "US Dollar",          decimals: 2, flag: "🇺🇸" },
  EUR: { code: "EUR", symbol: "€",   name: "Euro",               decimals: 2, flag: "🇪🇺" },
  KES: { code: "KES", symbol: "KSh", name: "Kenyan Shilling",    decimals: 0, flag: "🇰🇪" },
};

export const SUPPORTED_CURRENCY_CODES = ["TZS", "USD", "EUR", "KES"] as const;
export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCY_CODES)[number];

/** Baked-in fallback — used when the API hasn't been reached yet */
export const FALLBACK_TZS_PER_UNIT: TzsPerUnit = {
  TZS: 1,
  USD: 2600,
  EUR: 2800,
  KES: 20,
};

/**
 * Convert a TZS-denominated amount to another currency.
 * Returns null if the rate is missing or invalid.
 */
export function convertFromTzs(
  amountTzs: number,
  toCurrency: string,
  tzsPerUnit: TzsPerUnit
): number | null {
  if (toCurrency === "TZS") return amountTzs;
  const rate = tzsPerUnit[toCurrency];
  if (!rate || !Number.isFinite(rate) || rate <= 0) return null;
  return amountTzs / rate;
}

/**
 * Format a number as a locale-aware currency string.
 * Falls back to a plain `SYMBOL amount` string if Intl is unavailable.
 */
export function formatMoney(amount: number, currency: string): string {
  try {
    const meta = SUPPORTED_CURRENCIES[currency];
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: meta?.decimals ?? 2,
      minimumFractionDigits: meta?.decimals ?? 0,
    }).format(amount);
  } catch {
    const meta = SUPPORTED_CURRENCIES[currency];
    return `${meta?.symbol ?? currency} ${amount.toLocaleString()}`;
  }
}

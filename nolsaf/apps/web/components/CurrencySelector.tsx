"use client";
// apps/web/components/CurrencySelector.tsx
//
// A compact dropdown that lets the viewer pick their display currency.
// Changing the selection persists to cookie + server (logged-in users),
// and immediately re-renders every PriceDisplay on the page.
//
// This selector is "presentation only" — it never reaches the payment layer.

import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_CURRENCY_CODES,
} from "@/lib/money";
import { useCurrency } from "@/contexts/CurrencyContext";

interface CurrencySelectorProps {
  className?: string;
  labelClassName?: string;
}

export function CurrencySelector({ className, labelClassName }: CurrencySelectorProps) {
  const { currency, setCurrency, isLoading } = useCurrency();

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className ?? ""}`}>
      {labelClassName !== null && (
        <span className={labelClassName ?? "text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:inline"}>
          Currency
        </span>
      )}
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        disabled={isLoading}
        aria-label="Display currency"
        className={[
          "appearance-none cursor-pointer rounded-xl border border-slate-200 bg-white",
          "px-3 py-1.5 pr-7 text-sm font-semibold text-slate-800",
          "shadow-sm transition-colors",
          "hover:border-[#02665e] hover:text-[#02665e]",
          "focus:outline-none focus:ring-2 focus:ring-[#02665e]/25 focus:border-[#02665e]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          // chevron icon via background
          "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")] bg-no-repeat bg-[right_8px_center]",
        ].join(" ")}
      >
        {SUPPORTED_CURRENCY_CODES.map((code) => {
          const meta = SUPPORTED_CURRENCIES[code];
          return (
            <option key={code} value={code}>
              {meta.flag} {code}
            </option>
          );
        })}
      </select>
    </div>
  );
}

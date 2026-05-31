"use client";
// apps/web/components/PriceDisplay.tsx
//
// Shows a TZS-denominated price in the viewer's preferred display currency.
//
// Rules (established by the platform):
//   • TZS is always the home / settlement currency for properties.
//   • The displayed converted amount is a LENS — it never changes what is charged.
//   • When showing a foreign currency, a "Charged as X TZS" note is always shown.
//   • Tour packages stay USD-only and never use this component.

import { useCurrency } from "@/contexts/CurrencyContext";
import { convertFromTzs, formatMoney } from "@/lib/money";

interface PriceDisplayProps {
  /** The property price in TZS (home currency — money of record). */
  amountTzs: number | null | undefined;
  /** Label appended after the amount, e.g. "/ night" */
  suffix?: string;
  /** Extra class names for the primary price span */
  className?: string;
  /** Extra class names for the "Charged as …" note */
  noteClassName?: string;
  /** When true, show nothing (not even a dash) while loading rates */
  suppressUntilLoaded?: boolean;
  /** When false, hide the "~ X TZS" charge note and show only the display currency */
  showNote?: boolean;
}

export function PriceDisplay({
  amountTzs,
  suffix,
  className,
  noteClassName,
  suppressUntilLoaded = false,
  showNote = true,
}: PriceDisplayProps) {
  const { currency, rates, isLoading } = useCurrency();

  if (suppressUntilLoaded && isLoading) return null;

  if (amountTzs == null || !Number.isFinite(amountTzs) || amountTzs <= 0) {
    return <span className={className}>–</span>;
  }

  const suffixEl = suffix ? (
    <span className="text-sm font-normal ml-1 opacity-70">{suffix}</span>
  ) : null;

  if (currency === "TZS") {
    return (
      <span className={className}>
        {formatMoney(amountTzs, "TZS")}
        {suffixEl}
      </span>
    );
  }

  const converted = convertFromTzs(amountTzs, currency, rates.tzsPerUnit);
  if (converted == null) {
    // Rate unavailable — gracefully fall back to TZS
    return (
      <span className={className}>
        {formatMoney(amountTzs, "TZS")}
        {suffixEl}
      </span>
    );
  }

  return (
    <span className={className}>
      {formatMoney(converted, currency)}
      {suffixEl}
      {showNote && (
        <span
          className={
            noteClassName ??
            "block text-xs font-normal text-slate-500 mt-0.5"
          }
        >
          ~ {formatMoney(amountTzs, "TZS")}
        </span>
      )}
    </span>
  );
}

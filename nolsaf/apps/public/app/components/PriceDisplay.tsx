"use client";
// apps/public/app/components/PriceDisplay.tsx
//
// Client component: shows a TZS property price in the viewer's display currency.
// The converted amount is always shown alongside the TZS charge note.

import { useCurrency } from "../../contexts/CurrencyContext";
import { convertFromTzs, formatMoney } from "../../lib/money";

interface PriceDisplayProps {
  amountTzs: number | null | undefined;
  suffix?: string;
  className?: string;
}

export function PriceDisplay({ amountTzs, suffix, className }: PriceDisplayProps) {
  const { currency, rates } = useCurrency();

  if (amountTzs == null || !Number.isFinite(amountTzs) || amountTzs <= 0) {
    return <span className={className}>–</span>;
  }

  const suffixEl = suffix ? <span style={{ fontSize: "0.85em", fontWeight: "normal", marginLeft: "4px", opacity: 0.7 }}>{suffix}</span> : null;

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
      <span style={{ display: "block", fontSize: "0.78em", fontWeight: "normal", opacity: 0.65, marginTop: "2px" }}>
        ~ {formatMoney(amountTzs, "TZS")}
      </span>
    </span>
  );
}

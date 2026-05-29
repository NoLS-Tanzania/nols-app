"use client";
// apps/public/app/components/CurrencySelector.tsx

import { useCurrency } from "../../contexts/CurrencyContext";
import { SUPPORTED_CURRENCIES, SUPPORTED_CURRENCY_CODES } from "../../lib/money";

export function CurrencySelector() {
  const { currency, setCurrency, isLoading } = useCurrency();

  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      disabled={isLoading}
      aria-label="Display currency"
      style={{
        padding: "4px 8px",
        borderRadius: "8px",
        border: "1px solid #d1d5db",
        fontSize: "13px",
        fontWeight: 600,
        cursor: "pointer",
        background: "white",
        opacity: isLoading ? 0.5 : 1,
      }}
    >
      {SUPPORTED_CURRENCY_CODES.map((code) => {
        const m = SUPPORTED_CURRENCIES[code];
        return (
          <option key={code} value={code}>
            {m.flag} {code}
          </option>
        );
      })}
    </select>
  );
}

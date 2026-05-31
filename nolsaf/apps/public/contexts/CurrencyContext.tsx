"use client";
// apps/public/contexts/CurrencyContext.tsx
//
// Per-user currency preference context for the public browsing app.
// Mirrors apps/web/contexts/CurrencyContext.tsx — same rules apply:
//   • TZS is the settlement currency for properties; this is display only.
//   • One user's preference never affects another user's view.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { FALLBACK_TZS_PER_UNIT, type TzsPerUnit } from "../lib/money";

export type FxRates = {
  base: string;
  tzsPerUnit: TzsPerUnit;
  updatedAt: string | null;
  source: string;
  stale: boolean;
};

export type CurrencyContextValue = {
  currency: string;
  rates: FxRates;
  setCurrency: (code: string) => void;
  isLoading: boolean;
};

const DEFAULT_RATES: FxRates = {
  base: "TZS",
  tzsPerUnit: FALLBACK_TZS_PER_UNIT,
  updatedAt: null,
  source: "fallback",
  stale: false,
};

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "TZS",
  rates: DEFAULT_RATES,
  setCurrency: () => {},
  isLoading: true,
});

function readLocalCurrency(): string {
  if (typeof document === "undefined") return "TZS";
  const m = document.cookie.match(/(?:^|;\s*)pref_currency=([A-Z]{3})/);
  if (m) return m[1];
  try { return localStorage.getItem("pref_currency") || "TZS"; } catch { return "TZS"; }
}

function persistLocalCurrency(code: string) {
  if (typeof document === "undefined") return;
  document.cookie = `pref_currency=${code};path=/;max-age=31536000;samesite=lax`;
  try { localStorage.setItem("pref_currency", code); } catch { /* ignore */ }
}

const API_BASE = (
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000")
    : "http://localhost:4000"
).replace(/\/$/, "");

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, _setCurrency] = useState("TZS");
  const [rates, setRates] = useState<FxRates>(DEFAULT_RATES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const local = readLocalCurrency();
    _setCurrency(local);

    let alive = true;
    (async () => {
      try {
        const ratesRes = await fetch(`${API_BASE}/api/fx/rates`);
        if (alive && ratesRes.ok) {
          const d = await ratesRes.json();
          setRates({
            base: d.base ?? "TZS",
            tzsPerUnit: d.tzsPerUnit ?? FALLBACK_TZS_PER_UNIT,
            updatedAt: d.updatedAt ?? null,
            source: d.source ?? "unknown",
            stale: d.stale ?? false,
          });
        }
        // Attempt to read server preference if user is logged in.
        // API responds { currency: "<ISO>" } — see GET /api/fx/preference.
        const prefRes = await fetch(`${API_BASE}/api/fx/preference`, { credentials: "include" });
        if (alive && prefRes.ok) {
          const p = await prefRes.json();
          const serverCurrency = p?.currency;
          if (serverCurrency && serverCurrency !== local) {
            _setCurrency(serverCurrency);
            persistLocalCurrency(serverCurrency);
          }
        }
      } catch {
        // Silently fall through to fallback rates
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const setCurrency = useCallback(async (code: string) => {
    _setCurrency(code);
    persistLocalCurrency(code);
    try {
      await fetch(`${API_BASE}/api/fx/preference`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: code }),
      });
    } catch { /* non-fatal */ }
  }, []);

  const value = useMemo(
    () => ({ currency, rates, setCurrency, isLoading }),
    [currency, rates, setCurrency, isLoading]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}

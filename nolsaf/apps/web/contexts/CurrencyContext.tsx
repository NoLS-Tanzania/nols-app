"use client";
// apps/web/contexts/CurrencyContext.tsx
//
// Per-user currency preference context.
//
// Priority (highest → lowest):
//   1. Server-persisted preference  (GET /api/fx/preference — logged-in users)
//   2. pref_currency cookie         (anonymous)
//   3. pref_currency in localStorage (fallback)
//   4. "TZS"                        (default)
//
// Rates come from GET /api/fx/rates (with built-in fallback).
// A user changing their currency NEVER affects any other user's view.
// No converted amount ever reaches the payment layer — TZS is still charged.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { FALLBACK_TZS_PER_UNIT, type TzsPerUnit } from "@/lib/money";

export type FxRates = {
  base: string;
  tzsPerUnit: TzsPerUnit;
  updatedAt: string | null;
  source: string;
  stale: boolean;
};

export type CurrencyContextValue = {
  /** ISO 4217 code the current viewer wants to see prices in */
  currency: string;
  /** Latest FX rates (or fallback if API unreachable) */
  rates: FxRates;
  /** Change and persist the viewer's currency preference */
  setCurrency: (code: string) => void;
  /** True while the initial rates + preference fetch is in flight */
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

// ── helpers ──────────────────────────────────────────────────────────────────

function readLocalCurrency(): string {
  if (typeof document === "undefined") return "TZS";
  const m = document.cookie.match(/(?:^|;\s*)pref_currency=([A-Z]{3})/);
  if (m) return m[1];
  try { return localStorage.getItem("pref_currency") || "TZS"; } catch { return "TZS"; }
}

function persistLocalCurrency(code: string) {
  if (typeof document === "undefined") return;
  // 1-year non-httpOnly cookie so the server can read it for SSR hints later
  document.cookie = `pref_currency=${code};path=/;max-age=31536000;samesite=lax`;
  try { localStorage.setItem("pref_currency", code); } catch { /* ignore */ }
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, _setCurrency] = useState("TZS");
  const [rates, setRates] = useState<FxRates>(DEFAULT_RATES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Seed from local storage immediately (no flash)
    const local = readLocalCurrency();
    _setCurrency(local);

    let alive = true;
    (async () => {
      try {
        // 1. Fetch live rates
        const ratesRes = await fetch("/api/fx/rates");
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
        // 2. If logged in, server preference overrides local.
        //    API responds { currency: "<ISO>" } — see GET /api/fx/preference.
        const prefRes = await fetch("/api/fx/preference", { credentials: "include" });
        if (alive && prefRes.ok) {
          const p = await prefRes.json();
          const serverCurrency = p?.currency;
          if (serverCurrency && serverCurrency !== local) {
            _setCurrency(serverCurrency);
            persistLocalCurrency(serverCurrency);
          }
        }
      } catch {
        // Network failure — silently fall through to local/fallback
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const setCurrency = useCallback(async (code: string) => {
    _setCurrency(code);
    persistLocalCurrency(code);
    // Fire-and-forget server persist (only works for logged-in users)
    try {
      await fetch("/api/fx/preference", {
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

/** Use inside any component that renders within <CurrencyProvider>. */
export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import PremiumLoader from "@/components/PremiumLoader";

function getNetworkHint() {
  const navAny = typeof navigator !== "undefined" ? (navigator as any) : null;
  const conn = navAny?.connection || navAny?.mozConnection || navAny?.webkitConnection;
  const effectiveType = String(conn?.effectiveType || "");

  // Rough buckets: faster networks ramp quicker.
  if (effectiveType.includes("4g")) return "fast" as const;
  if (effectiveType.includes("3g")) return "medium" as const;
  if (effectiveType.includes("2g")) return "slow" as const;
  return "unknown" as const;
}

function useSimulatedProgress(active: boolean) {
  const hint = useMemo(() => getNetworkHint(), []);
  const [p, setP] = useState(0);

  useEffect(() => {
    if (!active) return;

    const start = performance.now();
    let raf = 0;

    const config =
      hint === "fast"
        ? { firstMs: 900, firstTarget: 0.78, secondTarget: 0.92, secondMs: 2200 }
        : hint === "medium"
          ? { firstMs: 1100, firstTarget: 0.68, secondTarget: 0.88, secondMs: 3000 }
          : { firstMs: 1400, firstTarget: 0.55, secondTarget: 0.82, secondMs: 4200 };

    const tick = (t: number) => {
      const elapsed = t - start;

      let next = 0;
      if (elapsed <= config.firstMs) {
        // 0 -> firstTarget quickly (~1s)
        const u = Math.min(1, elapsed / config.firstMs);
        next = config.firstTarget * (1 - Math.pow(1 - u, 2));
      } else {
        // then ease toward secondTarget and plateau
        const u = Math.min(1, (elapsed - config.firstMs) / config.secondMs);
        next = config.firstTarget + (config.secondTarget - config.firstTarget) * (1 - Math.pow(1 - u, 3));
      }

      // Never go backwards.
      setP((prev) => Math.max(prev, Math.floor(next * 100)));
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [active, hint]);

  return p;
}

export default function LoadingScreen({ label = "Loading..." }: { label?: string }) {
  const progress = useSimulatedProgress(true);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80">
      <div className="relative w-[min(520px,92vw)] overflow-hidden rounded-3xl border border-white/10 bg-slate-900/55 p-8 shadow-card">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_25%_30%,rgba(2,32,153,0.18),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(2,102,94,0.18),transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-24 opacity-35 blur-2xl bg-[conic-gradient(from_180deg,rgba(2,32,153,0.25),rgba(2,102,94,0.25),rgba(22,163,74,0.22),rgba(2,32,153,0.25))]"
        />


        <div className="relative flex flex-col items-center justify-center text-center">
          <PremiumLoader size="xl" progress={progress} showPercent label={label} />
          <p className="mt-5 text-sm text-slate-200/80">
            This may vary with your internet connection.
          </p>
        </div>
      </div>
    </div>
  );
}

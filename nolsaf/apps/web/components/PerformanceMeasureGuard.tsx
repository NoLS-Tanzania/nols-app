"use client";

import { useEffect } from "react";

export default function PerformanceMeasureGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    try {
      if (typeof performance === "undefined" || typeof performance.measure !== "function") return;
      const original = performance.measure.bind(performance);

      performance.measure = function patchedMeasure(name, optionsOrStart?: PerformanceMeasureOptions | string, end?: string) {
        try {
          if (optionsOrStart && typeof optionsOrStart === "object") {
            const normalized = { ...optionsOrStart };
            if (typeof normalized.start === "number" && normalized.start < 0) normalized.start = 0;
            if (typeof normalized.end === "number" && normalized.end < 0) normalized.end = 0;
            return original(name, normalized);
          }
          return original(name, optionsOrStart as string | undefined, end);
        } catch {
          return undefined as unknown as PerformanceMeasure;
        }
      };

      return () => {
        performance.measure = original;
      };
    } catch {
      return;
    }
  }, []);

  return null;
}

"use client";

import type { ReactNode } from "react";

export function StepHeader({
  step,
  title,
  description,
  right,
}: {
  step: number;
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 pb-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full text-xs font-bold border" style={{ background: "rgba(2,102,94,0.22)", borderColor: "rgba(2,102,94,0.55)", color: "#3fb950" }}>
            {step}
          </span>
          <h2 className="text-base sm:text-lg font-bold truncate" style={{ color: "#e6edf3" }}>{title}</h2>
        </div>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "#b1bac4" }}>{description}</p>
        ) : null}
      </div>
      {right ? <div className="flex-shrink-0">{right}</div> : null}
    </div>
  );
}

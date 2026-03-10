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
    <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#30363d]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[rgba(2,102,94,0.18)] text-emerald-400 text-xs font-semibold border border-[rgba(2,102,94,0.4)]">
            {step}
          </span>
          <h2 className="text-base sm:text-lg font-semibold text-[#e6edf3] truncate">{title}</h2>
        </div>
        {description ? <p className="mt-1 text-sm text-[#8b949e]">{description}</p> : null}
      </div>
      {right ? <div className="flex-shrink-0">{right}</div> : null}
    </div>
  );
}

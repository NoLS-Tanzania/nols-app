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
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full text-xs font-bold bg-white text-emerald-700 shadow-sm">
            {step}
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white truncate">{title}</h2>
        </div>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-white">{description}</p>
        ) : null}
      </div>
      {right ? <div className="flex-shrink-0">{right}</div> : null}
    </div>
  );
}

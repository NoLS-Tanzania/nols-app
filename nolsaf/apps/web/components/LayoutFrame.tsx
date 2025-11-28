"use client";

import React from "react";

type LayoutFrameProps = {
  heightVariant?: "sm" | "md" | "lg"; // controls marker height
  topVariant?: "none" | "sm" | "md"; // controls top offset
  colorVariant?: "muted" | "accent"; // color theme
  variant?: "solid" | "dashed"; // marker style
  labelLeft?: string | null;
  labelRight?: string | null;
  className?: string;
};

const HEIGHT_MAP: Record<string, string> = {
  sm: "h-14", // 56px
  md: "h-20", // 80px
  lg: "h-28", // 112px
};

const TOP_MAP: Record<string, string> = {
  none: "top-0",
  sm: "top-6",
  md: "top-8",
};

const COLOR_MAP: Record<string, string> = {
  muted: "border-gray-300",
  accent: "border-emerald-500",
};

export default function LayoutFrame({
  heightVariant = "sm",
  topVariant = "sm",
  colorVariant = "muted",
  variant = "solid",
  labelLeft = "content edge",
  labelRight = null,
  className = "",
}: LayoutFrameProps) {
  const heightClass = HEIGHT_MAP[heightVariant] ?? HEIGHT_MAP.sm;
  const topClass = TOP_MAP[topVariant] ?? TOP_MAP.sm;
  const colorClass = COLOR_MAP[colorVariant] ?? COLOR_MAP.muted;
  const dashClass = variant === "dashed" ? "border-dashed" : "border-solid";

  return (
    <div className={`w-full pointer-events-none ${className}`} aria-hidden>
      <div className="max-w-6xl mx-auto relative px-4">
        {/* left marker */}
        <div className={`absolute left-0 -translate-x-1/2 ${topClass} ${heightClass} border-l-2 ${dashClass} ${colorClass}`} />

        {/* right marker */}
        <div className={`absolute right-0 translate-x-1/2 ${topClass} ${heightClass} border-l-2 ${dashClass} ${colorClass}`} />

        {/* optional labels */}
        {labelLeft ? (
          <div className={`${topClass} absolute left-0 -translate-x-1/2 mt-1`}> 
            <span className="text-xs text-gray-500 bg-white/80 px-1 rounded">{labelLeft}</span>
          </div>
        ) : null}

        {labelRight ? (
          <div className={`${topClass} absolute right-0 translate-x-1/2 mt-1`}> 
            <span className="text-xs text-gray-500 bg-white/80 px-1 rounded">{labelRight}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

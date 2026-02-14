import Image from "next/image";
import React from "react";

type LogoSpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeMap: Record<LogoSpinnerSize, { outer: string; inner: string; ring: string }> = {
  xs: { outer: "h-5 w-5", inner: "h-3 w-3", ring: "border" },
  sm: { outer: "h-6 w-6", inner: "h-4 w-4", ring: "border" },
  md: { outer: "h-8 w-8", inner: "h-5 w-5", ring: "border-2" },
  lg: { outer: "h-10 w-10", inner: "h-6 w-6", ring: "border-2" },
  xl: { outer: "h-12 w-12", inner: "h-7 w-7", ring: "border-2" },
};

export default function LogoSpinner({
  size = "md",
  className = "",
  ariaLabel = "Loading",
}: {
  size?: LogoSpinnerSize;
  className?: string;
  ariaLabel?: string;
}) {
  const s = sizeMap[size];

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
      className={`relative inline-flex items-center justify-center ${s.outer} ${className}`.trim()}
    >
      <span
        aria-hidden
        className={`absolute inset-0 rounded-full ${s.ring} border-slate-200/70 dark:border-white/15 border-t-brand/80 dark:border-t-brand/70 motion-reduce:animate-none animate-spin`}
      />
      <span
        aria-hidden
        className={`relative rounded-full bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 shadow-sm flex items-center justify-center ${s.outer}`}
      >
        <span className={`relative ${s.inner}`}>
          <Image
            src="/assets/nolsnewlog.png"
            alt=""
            fill
            sizes="64px"
            className="object-contain"
            priority={false}
          />
        </span>
      </span>
      <span className="sr-only">Loading...</span>
    </span>
  );
}

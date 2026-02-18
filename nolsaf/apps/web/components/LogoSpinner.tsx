import React from "react";
import PremiumLoader from "@/components/PremiumLoader";

type LogoSpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

export default function LogoSpinner({
  size = "md",
  className = "",
  ariaLabel = "Loading",
}: {
  size?: LogoSpinnerSize;
  className?: string;
  ariaLabel?: string;
}) {
  // Keep backward-compatible API; render the new premium loader.
  // Note: LogoSpinner is used in many places; do not delete until all call sites migrate.
  return <PremiumLoader size={size} className={className} ariaLabel={ariaLabel} />;
}

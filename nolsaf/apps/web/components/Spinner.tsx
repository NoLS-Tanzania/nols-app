"use client";
import React from "react";

type Props = {
  size?: "sm" | "default";
  className?: string;
  ariaLabel?: string;
};

export default function Spinner({ size = "default", className = "", ariaLabel }: Props) {
  return (
    <span
  role="status"
  aria-label={ariaLabel}
  aria-hidden={ariaLabel ? "false" : "true"}
      aria-live="polite"
      className={`dot-spinner ${size === "sm" ? "dot-sm" : ""} ${className}`.trim()}
    >
      <span className="dot dot-blue" />
      <span className="dot dot-black" />
      <span className="dot dot-yellow" />
      <span className="dot dot-green" />
    </span>
  );
}

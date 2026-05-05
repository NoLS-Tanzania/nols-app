"use client";

import type { ReactNode } from "react";

// Scroll-reveal animations removed for a clean, professional look.
// This component is kept as a no-op passthrough so all call sites still compile.
export default function ScrollReveal({
  children,
  className,
  // all animation props accepted but ignored
  direction: _d,
  delay: _de,
  duration: _du,
  distance: _di,
  once: _o,
  margin: _m,
  scale: _s,
}: {
  children: ReactNode;
  direction?: string;
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
  once?: boolean;
  margin?: string;
  scale?: number;
}) {
  return <div className={className}>{children}</div>;
}

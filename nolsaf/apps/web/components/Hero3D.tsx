"use client";

import React from "react";
import HeroRingsBackground, { type HeroRingsMode } from "./HeroRingsBackground";

// Compatibility shim: 3D was removed in favor of a cleaner, lighter SVG/CSS background.
export type Hero3DMode = HeroRingsMode;

export default function Hero3D({
  mode,
  className,
}: {
  mode: Hero3DMode;
  className?: string;
}) {
  return <HeroRingsBackground mode={mode} className={className} />;
}

"use client";
import React from "react";
import DriverAvailabilitySwitch from "./DriverAvailabilitySwitch";

interface DriverLiveMapTopControlsProps {
  isDark?: boolean;
  hideAvailability?: boolean;
  compact?: boolean;
}

export default function DriverLiveMapTopControls({ 
  isDark,
  hideAvailability = false,
  compact = false,
}: DriverLiveMapTopControlsProps) {
  const themed = (light: string, dark: string) => (isDark ? dark : light);
  const pillBase = themed("bg-white", "bg-slate-950/55 backdrop-blur-md");
  const pillBorder = themed("", "border border-white/15");

  return (
    <div className={`absolute top-0 left-0 right-0 z-30 px-4 ${compact ? "pt-3 pb-1" : "pt-4 pb-2"} pointer-events-none`}>
      <div className="flex items-center justify-center max-w-6xl mx-auto">
        <div className="flex justify-center">
          {!hideAvailability && (
            <div className="pointer-events-auto">
              <div className={[`rounded-full ${compact ? "px-2.5 py-1.5" : "px-3 py-2"} shadow-lg flex items-center gap-2`, pillBase, pillBorder].join(" ")}>
                <DriverAvailabilitySwitch variant="compact" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


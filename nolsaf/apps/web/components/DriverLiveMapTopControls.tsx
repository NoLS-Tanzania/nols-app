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
  const pillBase = themed(
    "bg-white/88 backdrop-blur-xl shadow-[0_20px_45px_rgba(15,23,42,0.12)] border border-white/80 ring-1 ring-slate-200/70",
    "bg-slate-950/62 backdrop-blur-xl shadow-[0_20px_48px_rgba(2,6,23,0.45)] border border-white/12 ring-1 ring-white/10"
  );
  const eyebrow = themed("text-slate-500", "text-slate-300/70");

  return (
    <div className={`absolute top-0 left-0 right-0 z-30 px-4 ${compact ? "pt-3 pb-1" : "pt-4 pb-2"} pointer-events-none`}>
      <div className="flex items-center justify-center max-w-6xl mx-auto">
        <div className="flex justify-center">
          {!hideAvailability && (
            <div className="pointer-events-auto">
              <div className={[`rounded-[1.35rem] ${compact ? "px-3 py-2" : "px-3.5 py-2.5"} flex items-center gap-3`, pillBase].join(" ")}>
                <div className="flex flex-col leading-none">
                  <span className={["text-[10px] font-semibold uppercase tracking-[0.18em]", eyebrow].join(" ")}>Driver Status</span>
                  <span className={themed("text-slate-700", "text-slate-100") + " text-[11px] font-semibold mt-1"}>Live availability</span>
                </div>
                <DriverAvailabilitySwitch variant="compact" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


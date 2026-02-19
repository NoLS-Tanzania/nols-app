"use client";

import React from "react";

export default function LoadingScreen({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div role="status" aria-live="polite" className="flex flex-col items-center justify-center text-center">
        <div className="dot-spinner mb-3" aria-hidden>
          <span className="dot dot-green" />
          <span className="dot dot-yellow" />
          <span className="dot dot-blue" />
          <span className="dot dot-black" />
        </div>
        <div className="text-sm font-semibold text-slate-700">{label}</div>
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}

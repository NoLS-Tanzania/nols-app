"use client";

import React from "react";
import Image from "next/image";

export default function LoadingScreen({ label = "Preparing your stay..." }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-[linear-gradient(135deg,#ecfdf5_0%,#f8fafc_45%,#eff6ff_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(2,102,94,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(2,180,245,0.12),transparent_28%)]" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div role="status" aria-live="polite" className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-[28px] bg-white shadow-[0_20px_50px_rgba(2,102,94,0.16)] ring-1 ring-[#02665e]/10">
            <Image
              src="/assets/NoLS2025-04.png"
              alt="NoLSAF"
              width={76}
              height={76}
              className="h-[68px] w-[68px] object-contain"
              priority
            />
          </div>

          <div className="text-2xl font-bold tracking-tight text-slate-900">NoLSAF</div>
          <div className="mt-1 text-sm font-medium text-[#02665e]">Quality Stay for Every Wallet</div>
          <div className="mt-3 text-sm text-slate-600">{label}</div>

          <div className="mt-5 flex items-center justify-center gap-2" aria-hidden>
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#02665e] [animation-delay:-0.2s]" />
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-[#02b4f5] [animation-delay:-0.1s]" />
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-emerald-400" />
          </div>

          <span className="sr-only">{label}</span>
        </div>
      </div>
    </div>
  );
}

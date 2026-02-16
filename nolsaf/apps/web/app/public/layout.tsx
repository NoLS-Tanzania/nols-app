"use client";

import type { ReactNode } from "react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import FloatingChatWidget from "@/components/FloatingChatWidget";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full min-h-screen px-1 py-1 sm:px-1.5 sm:py-1.5 lg:px-2 lg:py-2">
        <div className="relative min-h-full rounded-[26px] bg-gradient-to-br from-slate-200/70 via-white/60 to-slate-200/40 p-[1px] shadow-sm">
          <PublicHeader />
          <div
            className="relative min-h-full overflow-hidden rounded-[25px] border border-white/60 bg-white ring-1 ring-slate-900/5"
            style={{ ['--footer-height' as any]: '0px' }}
          >
            <div className="pointer-events-none absolute inset-0 rounded-[25px] bg-gradient-to-b from-white/55 via-white/35 to-white/25" aria-hidden />
            <div className="pointer-events-none absolute -top-28 -right-24 h-80 w-80 rounded-full bg-slate-400/10 blur-3xl" aria-hidden />


            {children}
            <PublicFooter withRail={false} />
          </div>
        </div>
      </div>

      <FloatingChatWidget position="bottom-right" />
    </div>
  );
}

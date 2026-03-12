"use client";

import type { ReactNode } from "react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import FloatingChatWidget from "@/components/FloatingChatWidget";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />
      <div className="relative min-h-screen" style={{ ['--footer-height' as any]: '0px' }}>
        <div className="relative z-10">
          {children}
          <PublicFooter withRail={false} />
        </div>
      </div>

      <FloatingChatWidget position="bottom-right" mobileBottomOffset={56} />
    </div>
  );
}

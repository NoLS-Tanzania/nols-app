"use client";
import "@/styles/globals.css";
import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import PublicFooter from "@/components/PublicFooter";
import LayoutFrame from "@/components/LayoutFrame";
import FloatingChatWidget from "@/components/FloatingChatWidget";

export default function CustomerAccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <SiteHeader role="CUSTOMER" />

      <div className="flex-1 w-full overflow-x-hidden">
        <div className="public-container relative">
          <LayoutFrame
            heightVariant="sm"
            topVariant="sm"
            colorVariant="muted"
            variant="solid"
            box
            boxRadiusClass="rounded-2xl"
            className="mb-2"
          />

          {/* Main content */}
          <div className="pt-16 pb-6">
            <main className="w-full max-w-full overflow-x-hidden">
              {children}
            </main>
          </div>
        </div>
      </div>

      <div className="relative z-20">
        <PublicFooter withRail />
      </div>
      <FloatingChatWidget position="bottom-right" />
    </div>
  );
}

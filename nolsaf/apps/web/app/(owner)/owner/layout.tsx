"use client";

// apps/web/app/(owner)/owner/layout.tsx
import "@/styles/globals.css";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import OwnerSiteHeader from "@/components/OwnerSiteHeader";
import OwnerFooter from "@/components/OwnerFooter";
import OwnerSidebar from "@/components/OwnerSidebar";
import LayoutFrame from "@/components/LayoutFrame";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Listen for global toggle events dispatched from the header so the header
  // can control the sidebar without prop drilling. Use useEffect to ensure
  // listener is registered once and properly cleaned up.
  useEffect(() => {
    const handler = () => {
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      if (isDesktop) {
        setSidebarOpen((v) => !v);
      } else {
        setMobileSidebarOpen((v) => !v);
      }
    };

    window.addEventListener('toggle-owner-sidebar', handler as EventListener);
    return () => window.removeEventListener('toggle-owner-sidebar', handler as EventListener);
  }, []);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-neutral-50">
      <OwnerSiteHeader />

      {/* Body area: sits below the fixed 64px header */}
      <div className="flex-1 min-h-0 pt-16">
        <div className="public-container h-full flex flex-row relative">
          {/* Decorative frame (pointer-events-none background ornament) */}
          <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" box />

          {/* ── Desktop sidebar — left flex column, full remaining height ── */}
          <aside
            className={`relative hidden md:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out overflow-y-auto scroll-smooth
              ${sidebarOpen ? 'w-56 px-4 py-4' : 'w-16 px-2 py-2'}`}
          >
            <OwnerSidebar collapsed={!sidebarOpen} />
          </aside>

          {/* ── Mobile off-canvas sidebar ── */}
          {mobileSidebarOpen && (
            <div className="md:hidden fixed inset-0 z-40">
              <button
                type="button"
                aria-label="Close sidebar"
                className="absolute inset-0 bg-black/20 backdrop-blur-sm nols-soft-overlay"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <aside className="absolute left-0 top-16 h-[calc(100%-4rem)] w-[min(20rem,calc(100vw-1rem))] p-3 nols-soft-popover">
                <div className="h-full overflow-y-auto scroll-smooth rounded-3xl">
                  <OwnerSidebar collapsed={false} />
                </div>
              </aside>
            </div>
          )}

          {/* ── Right column: scrollable content + footer pinned at bottom ── */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto scroll-smooth px-4 sm:px-5 py-6 box-border">
              <div className="w-full">
                {children}
              </div>
            </main>

            {/* Footer sits flush at the bottom of the right column, always visible */}
            <div className="flex-shrink-0 border-t border-slate-200/70">
              <OwnerFooter />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

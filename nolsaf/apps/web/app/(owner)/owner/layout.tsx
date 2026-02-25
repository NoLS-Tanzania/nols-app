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

      {/* Centered container so the LayoutFrame can span both sidebar and content */}
      <div className="flex-1 w-full min-h-0">
        <div className="public-container relative h-full">
          <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" box />

          {/* Sidebar toggle controlled from SiteHeader (header-only menu icon). */}

          {/* Sidebar placed inside the centered container so it is considered part of the frame */}
          {/* Sidebar inside the frame container on md+; collapsed shows icons only */}
          <aside className={`absolute left-0 top-16 hidden md:block transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-56 p-4' : 'w-16 p-2'} h-[calc(100%-4rem)] overflow-y-auto scroll-smooth`}>
            <div className="sidebar-scroll">
              <OwnerSidebar collapsed={!sidebarOpen} />
            </div>
          </aside>

          {/* Mobile off-canvas sidebar (same links, responsive presentation) */}
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

          {/* Main content: add left padding on md+ equal to sidebar width plus small gap so content clears it */}
          <div className={`pt-16 pb-6 transition-all duration-300 ease-in-out box-border max-w-full overflow-x-hidden ${sidebarOpen ? 'owner-content-gap' : 'md:ml-16'} h-full overflow-y-auto scroll-smooth`}>
            <main>
              <div className="w-full">
                {children}
              </div>
            </main>
            <OwnerFooter />
          </div>
        </div>
      </div>
    </div>
  );
}

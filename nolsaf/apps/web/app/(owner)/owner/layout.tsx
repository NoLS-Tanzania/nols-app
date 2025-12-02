"use client";

// apps/web/app/(owner)/owner/layout.tsx
import "@/styles/globals.css";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SectionSeparator from "@/components/SectionSeparator";
import OwnerSidebar from "@/components/OwnerSidebar";
import LayoutFrame from "@/components/LayoutFrame";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Listen for global toggle events dispatched from the header so the header
  // can control the sidebar without prop drilling. Use useEffect to ensure
  // listener is registered once and properly cleaned up.
  useEffect(() => {
    const handler = () => setSidebarOpen((v) => !v);

    window.addEventListener('toggle-owner-sidebar', handler as EventListener);
    return () => window.removeEventListener('toggle-owner-sidebar', handler as EventListener);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <SiteHeader role="OWNER" />

      {/* Centered container so the LayoutFrame can span both sidebar and content */}
      <div className="flex-1 w-full">
        <div className="max-w-6xl mx-auto w-full px-4 relative">
          <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" box />

          {/* Sidebar toggle controlled from SiteHeader (header-only menu icon). */}

          {/* Sidebar placed inside the centered container so it is considered part of the frame */}
          <aside className={`absolute left-0 top-16 w-56 p-4 shadow-sm text-[#02665e] bg-white border-r border-gray-200 owner-sidebar-container hidden ${sidebarOpen ? 'md:block' : 'md:hidden'}`}>
            <div className="sidebar-scroll">
              <OwnerSidebar />
            </div>
          </aside>

          {/* Main content: add left padding on md+ equal to sidebar width plus small gap so content clears it (removed when sidebar hidden) */}
          <div className={`pt-16 pb-6 ${sidebarOpen ? 'owner-content-gap' : ''}`}>
            <main>
              <div className="w-full">
                <div className="mx-auto max-w-6xl">
                  {children}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* use the modern SectionSeparator above the footer for owner pages */}
      <SectionSeparator className="mt-6" />
      <SiteFooter topSeparator={false} withRail={false} />
    </div>
  );
}

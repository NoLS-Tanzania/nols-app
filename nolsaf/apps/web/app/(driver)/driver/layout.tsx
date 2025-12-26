"use client";
// apps/web/app/(driver)/driver/layout.tsx
import "@/styles/globals.css";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import DriverFooter from "@/components/DriverFooter";
import DriverSidebar from "@/components/DriverSidebar";
import LayoutFrame from "@/components/LayoutFrame";

export default function DriverLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Listen for global toggle events (header hamburger can dispatch `toggle-driver-sidebar`)
  useEffect(() => {
    const handler = () => setSidebarOpen((v) => !v);
    window.addEventListener("toggle-driver-sidebar", handler as EventListener);
    return () => window.removeEventListener("toggle-driver-sidebar", handler as EventListener);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Full-width header in driver mode */}
      <SiteHeader role="OWNER" driverMode={true} />

      <div className="flex-1 w-full overflow-x-hidden">
        <div className="max-w-6xl mx-auto w-full relative px-4">
          {/* Frame spanning sidebar + content (match admin layout) */}
          <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" box boxRadiusClass="rounded-2xl" className="mb-2" />

          {/* Sidebar anchored inside the frame container */}
          <aside
            className={`${
              sidebarOpen ? "block" : "hidden"
            } ${sidebarOpen ? "md:block" : "md:hidden"} absolute left-4 top-16 w-56 shadow-sm bg-emerald-50/60 border border-slate-200 owner-sidebar-container rounded-l-2xl z-0 h-[calc(100vh-4rem)]`}
          >
            <div className="sidebar-scroll h-full">
              <div className="p-4 pt-2">
                <DriverSidebar />
              </div>
            </div>
          </aside>

          {/* Overlay for mobile when sidebar open */}
          {sidebarOpen && (
            <div
              className="md:hidden fixed inset-0 bg-black/30 z-10"
              onClick={() => setSidebarOpen(false)}
              aria-hidden
            />
          )}

          {/* Main content with gap matching sidebar (owner style) */}
          <div className={`pt-16 pb-6 app-driver-layout ${sidebarOpen ? "owner-content-gap" : ""} ${sidebarOpen ? "md:border-l md:border-slate-200" : ""}`}>
            <main className="w-full max-w-full overflow-x-hidden">
              {children}
            </main>
          </div>
        </div>
      </div>

      <div className="relative z-20">
        <DriverFooter />
      </div>
    </div>
  );
}

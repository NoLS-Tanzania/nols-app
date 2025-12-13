"use client";
import "@/styles/globals.css";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import PublicFooter from "@/components/PublicFooter";
import CustomerSidebar from "@/components/CustomerSidebar";
import LayoutFrame from "@/components/LayoutFrame";

export default function CustomerAccountLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Listen for global toggle events
  useEffect(() => {
    const handler = () => setSidebarOpen((v) => !v);
    window.addEventListener("toggle-customer-sidebar", handler as EventListener);
    return () => window.removeEventListener("toggle-customer-sidebar", handler as EventListener);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <SiteHeader role="CUSTOMER" />

      <div className="flex-1 w-full overflow-x-hidden">
        <div className="max-w-6xl mx-auto w-full relative px-4">
          <LayoutFrame
            heightVariant="sm"
            topVariant="sm"
            colorVariant="muted"
            variant="solid"
            box
            boxRadiusClass="rounded-2xl"
            className="mb-2"
          />

          {/* Sidebar */}
          <aside
            className={`${
              sidebarOpen ? "block" : "hidden"
            } ${sidebarOpen ? "md:block" : "md:hidden"} absolute left-4 top-16 w-56 shadow-sm bg-white border border-slate-200 rounded-l-2xl z-0 h-[calc(100vh-4rem)]`}
          >
            <div className="sidebar-scroll h-full">
              <div className="p-4 pt-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 px-2">Your account</h2>
                <CustomerSidebar />
              </div>
            </div>
          </aside>

          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="md:hidden fixed inset-0 bg-black/30 z-10"
              onClick={() => setSidebarOpen(false)}
              aria-hidden
            />
          )}

          {/* Main content */}
          <div
            className={`pt-16 pb-6 ${
              sidebarOpen ? "md:ml-[240px]" : ""
            } ${sidebarOpen ? "md:border-l md:border-slate-200" : ""}`}
          >
            <main className="w-full max-w-full overflow-x-hidden px-4">
              {children}
            </main>
          </div>
        </div>
      </div>

      <div className="relative z-20">
        <PublicFooter withRail />
      </div>
    </div>
  );
}

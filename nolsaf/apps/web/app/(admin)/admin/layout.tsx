"use client";
import "@/styles/globals.css";
import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import AdminFooter from "@/components/AdminFooter";
import AdminNav from "@/components/AdminSidebar";
import LayoutFrame from "@/components/LayoutFrame";
import SectionSeparator from "@/components/SectionSeparator";
export default function AdminLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef(false);

  // Listen for global toggle events dispatched from the header to control sidebar
  useEffect(() => {
    const handler = () => setSidebarOpen((v) => !v);
    window.addEventListener("toggle-admin-sidebar", handler as EventListener);
    return () => window.removeEventListener("toggle-admin-sidebar", handler as EventListener);
  }, []);

  // One-way scroll sync: scrolling the main content should also scroll the sidebar.
  // Scrolling the sidebar should NOT affect the main content.
  useEffect(() => {
    const mainEl = mainRef.current;
    const sideEl = sidebarRef.current;
    if (!mainEl || !sideEl) return;

    const onMainScroll = () => {
      // Only sync when sidebar is visible on md+ screens
      const isVisible = sidebarOpen && window.matchMedia('(min-width: 768px)').matches;
      if (!isVisible) return;
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        sideEl.scrollTop = mainEl.scrollTop;
      } finally {
        syncingRef.current = false;
      }
    };

    mainEl.addEventListener('scroll', onMainScroll, { passive: true });
    return () => {
      mainEl.removeEventListener('scroll', onMainScroll as EventListener);
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Full-width header */}
      <SiteHeader role="ADMIN" />

      {/* Centered container so LayoutFrame spans both sidebar and content (like Owner) */}
      <div className="flex-1 w-full">
        <div className="max-w-6xl mx-auto w-full px-4 relative">
          {/* Content frame/markers */}
          <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" box />

          {/* Sidebar inside the frame container on md+; hide/show via header toggle */}
          <aside ref={sidebarRef} className={`absolute left-0 top-16 w-56 p-4 shadow-sm text-[#02665e] bg-white border-r border-gray-200 ${sidebarOpen ? 'hidden md:block' : 'hidden md:hidden'} h-[calc(100vh-4rem)] overflow-y-auto`}>
            <div className="sidebar-scroll">
              <AdminNav variant="light" />
            </div>
          </aside>

          {/* Main content: match Owner spacing and styling (no extra border/bg) */}
          <div
            ref={mainRef}
            className={`pt-16 pb-6 ${sidebarOpen ? 'owner-content-gap' : ''}`}
          >
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

      {/* Apply the same footer separator used on Owner pages */}
      <SectionSeparator className="mt-6" />
      <AdminFooter />
    </div>
  );
}

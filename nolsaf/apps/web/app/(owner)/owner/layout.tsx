// apps/web/app/(owner)/owner/layout.tsx
import "@/styles/globals.css";
import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import OwnerSidebar from "@/components/OwnerSidebar";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <SiteHeader role="OWNER" />

      {/* Fixed left sidebar on md+ so the sidebar is pinned to the left like admin */}
  <aside className="hidden md:block admin-sidebar-fixed p-4 shadow-sm text-white bg-[#02665e] border-r border-[#015149]">
        <div className="pt-16 h-full sidebar-scroll">
          <OwnerSidebar />
        </div>
      </aside>

      {/* Main content; add left margin on md+ equal to sidebar width so content aligns */}
      <div className="flex-1 mx-auto max-w-6xl w-full px-4 pt-16 pb-6 md:ml-56 grid grid-cols-1 gap-6">
        <main>
          {/* Center page content inside a constrained column to avoid overlap with the fixed sidebar */}
          <div className="w-full">
            <div className="mx-auto max-w-4xl">
              {children}
            </div>
          </div>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}

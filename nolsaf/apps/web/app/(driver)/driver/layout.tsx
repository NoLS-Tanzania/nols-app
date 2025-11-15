// apps/web/app/(driver)/driver/layout.tsx
import "@/styles/globals.css";
import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DriverSidebar from "@/components/DriverSidebar";

export default function DriverLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
  {/* Driver pages: use the same owner header color but enable driverMode so only specific icons show */}
  <SiteHeader role="OWNER" driverMode={true} />

      <aside className="hidden md:block admin-sidebar-fixed p-4 shadow-sm text-white bg-[#02665e] border-r border-[#015149]">
        <div className="pt-16 h-full sidebar-scroll">
          <DriverSidebar />
        </div>
      </aside>

      <div className="flex-1 mx-auto max-w-6xl w-full px-4 pt-16 pb-6 md:ml-56 grid grid-cols-1 gap-6">
        <main>
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

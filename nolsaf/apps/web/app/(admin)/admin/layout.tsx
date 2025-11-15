import "@/styles/globals.css";
import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import AdminFooter from "@/components/AdminFooter";
import AdminNav from "@/components/AdminSidebar";
import AdminMiniFooter from "@/components/AdminMiniFooter";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Header is full-width; content is constrained. We pin the sidebar on md+ and offset the inner content to avoid overlap. */}
      <SiteHeader role="ADMIN" />

      {/* Fixed left sidebar for md+ screens */}
  <aside className="hidden md:block admin-sidebar-fixed p-4 shadow-sm text-white bg-[#02665e] border-r border-[#015149]">
        {/* Sidebar scroll container: independent vertical scroll, contains overscroll so wheel/touch doesn't bubble to main */}
        <div className="pt-16 h-full sidebar-scroll overscroll-contain">
          {/* removed the 'Admin' heading per request; only navigation remains */}
          <AdminNav variant="dark" />
        </div>
      </aside>

  {/* Main centered content; top padding accounts for fixed header (h-16) and add left padding on md+ equal to sidebar width (w-64) */}
  <div className="flex-1 mx-auto max-w-6xl w-full px-4 pt-16 pb-6 md:pl-0 content-with-footer">
        <div className="md:ml-0 w-full">
          <main className="md:ml-0 md:pl-0 lg:pl-0">
            {/* On md+ screens provide left offset so content doesn't sit under fixed sidebar */}
            <div className="w-full">
              <div className="md:ml-0 md:pl-0">
                <div className="md:pl-0 lg:pl-0">
                  <div className="md:ml-0">
                    <div className="md:mx-0">
                      {/* Apply responsive left margin to the container that holds the page content */}
                      <div className="w-full">
                        {/* On md and up, add left margin equal to sidebar width */}
                        <div className="md:ml-56">{children}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <div className="mini-footer-above hidden md:block">
        <AdminMiniFooter />
      </div>

      {/* Admin footer (static, sits at end of content) */}
      <AdminFooter />

      {/* Floating help button removed — AdminMiniFooter now contains support */}
    </div>
  );
}

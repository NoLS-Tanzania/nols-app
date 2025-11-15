"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Users, Building2, Calendar, LineChart, Wallet, Settings, FileText, ChevronDown, FileArchive } from "lucide-react";

type Item = {
  href: string;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const items: Item[] = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/owners", label: "Owners", Icon: Users },
  { href: "/admin/properties", label: "Properties", Icon: Building2 },
  { href: "/admin/bookings", label: "Bookings", Icon: Calendar },
  { href: "/admin/revenue", label: "Revenues", Icon: LineChart },
  { href: "/admin/payments", label: "Payments", Icon: Wallet },
  { href: "/admin/metrics-docs", label: "Metrics docs", Icon: FileText },
];

// Keep Management minimal: System Settings, Audit Log and History (Reports)
const managementItems: Item[] = [
  { href: "/admin/management/settings", label: "System Settings", Icon: Settings },
  { href: "/admin/management/audit-log", label: "Audit Log", Icon: FileArchive },
  { href: "/admin/management/reports", label: "History", Icon: LineChart },
];

export default function AdminNav({ variant = "light" }: { variant?: "light" | "dark" }) {
  const path = usePathname();
  const [openManagement, setOpenManagement] = useState<boolean>(() => path?.startsWith("/admin/management") ?? false);
  // Use inline-flex so hover/bg only covers the content and doesn't stretch full width
  // Slightly larger type for better readability
  const base = "inline-flex w-auto items-stretch rounded-md text-lg transition no-underline";
  const focusRing = variant === "dark" ? "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40" : "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300";
  // For dark variant keep the sidebar background intact; set active background explicitly to match sidebar color (#02665e)
  // Ensure idle state is explicitly transparent so it doesn't get a white panel behind it.
  const active = variant === "dark" ? "bg-[#02665e] text-white" : "bg-emerald-50 text-emerald-700";
  const idle = variant === "dark" ? "bg-transparent text-white hover:bg-[#015b54]/80" : "hover:bg-gray-50 text-gray-700";

  return (
    <nav className="space-y-2.5">
      {items.map(({ href, label, Icon }) => {
        const isActive = path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`${focusRing} block`}
          >
            {/* Inner wrapper controls background/hover width */}
            <span className={`${base} ${isActive ? active : idle} px-4 py-3 flex items-center gap-3` }>
              <Icon className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </span>
          </Link>
        );
      })}

      {/* Management group (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setOpenManagement((s) => !s)}
          className={`${focusRing} w-full text-left bg-transparent border-0 management-toggle`}
          aria-expanded={openManagement ? 'true' : 'false'}
          aria-controls="admin-management-panel"
        >
          <span className={`${base} ${path.startsWith("/admin/management") ? active : idle} px-4 py-3 flex items-center gap-3 justify-between` }>
            <span className="flex items-center gap-3">
              <Settings className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">Management</span>
            </span>
            <ChevronDown className={`h-5 w-5 transition-transform ${openManagement ? "rotate-180" : ""}`} />
          </span>
        </button>
        {openManagement && (
          <div id="admin-management-panel" className="mt-2 space-y-1 pl-6 admin-management-panel">
            {managementItems.map(({ href, label, Icon }) => {
              const isActive = path.startsWith(href);
              return (
                <Link key={href} href={href} className={`${focusRing} block`}>
                  <span className={`${base} ${isActive ? active : idle} px-3 py-2 flex items-center gap-2 text-sm`}>
                    <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}

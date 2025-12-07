"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { Home, LayoutDashboard, Users, UsersRound, UserSquare2, Truck, LineChart, Building2, Calendar, FileText, Wallet, Settings, ChevronDown, ChevronUp, ShieldCheck, Link2, Receipt, ListFilter, ClipboardList, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";

type Item = {
  href: string;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

// Top-level visible by default: Admin, Owners, Users.
// All remaining admin sections live under the Admin mini-sidebar.
const items: Item[] = [
  { href: "/admin/home", label: "Home", Icon: Home },
  { href: "/admin", label: "Owners", Icon: Building2 },
  { href: "/admin/drivers", label: "Drivers", Icon: Truck },
  { href: "/admin/users", label: "Users", Icon: UserSquare2 },
  { href: "/admin/group-stays", label: "Group Stay", Icon: UsersRound },
  { href: "/admin/plan-with-us", label: "Plan with US", Icon: ClipboardList },
  { href: "/admin/management", label: "Management", Icon: LayoutDashboard },
];

const adminDetails: Item[] = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/owners", label: "Owners", Icon: Building2 },
  { href: "/admin/bookings", label: "Bookings", Icon: Calendar },
  { href: "/admin/properties", label: "Properties", Icon: FileText },
  { href: "/admin/payments", label: "Payments", Icon: Wallet },
];

const driverDetails: Item[] = [
  { href: "/admin/drivers", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/drivers/trips", label: "Trips", Icon: Calendar },
  { href: "/admin/drivers/invoices", label: "Invoices", Icon: FileText },
  { href: "/admin/drivers/paid", label: "Paid", Icon: Wallet },
  { href: "/admin/drivers/revenues", label: "Revenues", Icon: LineChart },
];

const groupStayDetails: Item[] = [
  { href: "/admin/group-stays", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/group-stays/bookings", label: "Bookings", Icon: Calendar },
  { href: "/admin/group-stays/requests", label: "Requests", Icon: FileText },
  { href: "/admin/group-stays/passengers", label: "Passengers", Icon: Users },
  { href: "/admin/group-stays/arrangements", label: "Arrangements", Icon: Settings },
];

const planWithUsDetails: Item[] = [
  { href: "/admin/plan-with-us", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/plan-with-us/requests", label: "Requests", Icon: FileText },
  { href: "/admin/plan-with-us/recommended", label: "Recommended", Icon: CheckCircle },
];

const managementDetails: Item[] = [
  { href: "/admin/management", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/management/audit-log", label: "Audit Log", Icon: ShieldCheck },
  { href: "/admin/management/bookings", label: "Bookings", Icon: Calendar },
  { href: "/admin/management/integrations", label: "Integrations", Icon: Link2 },
  { href: "/admin/management/invoices", label: "Invoices", Icon: Receipt },
  { href: "/admin/management/ip-allowlist", label: "IP Allowlist", Icon: ListFilter },
  { href: "/admin/management/owners", label: "Owners", Icon: Building2 },
  { href: "/admin/management/properties", label: "Properties", Icon: FileText },
  { href: "/admin/management/settings", label: "Settings", Icon: Settings },
  { href: "/admin/management/users", label: "Users", Icon: Users },
];

// Detailed admin links (analytics, owners, bookings, properties, etc.) remain reachable from the Admin dashboard page.

export default function AdminNav({ variant = "light" }: { variant?: "light" | "dark" }) {
  const path = usePathname();
  const [adminOpen, setAdminOpen] = useState(true);
  const [driverOpen, setDriverOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [groupStayOpen, setGroupStayOpen] = useState(false);
  const [planWithUsOpen, setPlanWithUsOpen] = useState(false);

  useEffect(() => {
    // Auto-open Admin mini-sidebar when navigating to admin child routes
    // but keep Drivers and Users as top-level pages (they should not auto-open Admin).
    if (!path) return;
    const isAdminPath = path.startsWith("/admin");
    const isDrivers = path.startsWith("/admin/drivers");
    const isManagement = path.startsWith("/admin/management");
    const isUsers = path.startsWith("/admin/users");
    const isGroupStay = path.startsWith("/admin/group-stays");
    const isPlanWithUs = path.startsWith("/admin/plan-with-us");
    // Owner (admin) mini-sidebar: open when on admin child routes that aren't drivers/users/group-stays/plan-with-us
    if (isAdminPath && !isDrivers && !isUsers && !isGroupStay && !isPlanWithUs) setAdminOpen(true);
    else setAdminOpen(false);
    // Driver mini-sidebar: open when on driver-related routes
    if (isDrivers) setDriverOpen(true);
    else setDriverOpen(false);
    // Management mini-sidebar: open when on management routes
    if (isManagement) setManagementOpen(true);
    else setManagementOpen(false);
    // Group Stay mini-sidebar: open when on group stay routes
    if (isGroupStay) setGroupStayOpen(true);
    else setGroupStayOpen(false);
    // Plan with US mini-sidebar: open when on plan-with-us routes
    if (isPlanWithUs) setPlanWithUsOpen(true);
    else setPlanWithUsOpen(false);
    // Visual chevrons for Users
    setUsersOpen(isUsers);
  }, [path]);
  // no local collapsible groups at top-level; Admin dashboard contains detailed links
  // Use inline-flex so hover/bg only covers the content and doesn't stretch full width
  // Slightly larger type for better readability
  const base = "inline-flex w-auto items-stretch rounded-md text-lg transition no-underline";
  const focusRing = variant === "dark" ? "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40" : "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300";
  // For dark variant keep the sidebar background intact; set active background explicitly to match sidebar color (#02665e)
  // Ensure idle state is explicitly transparent so it doesn't get a white panel behind it.
  const active = variant === "dark"
    ? "bg-[#02665e] text-white"
    : "bg-[#e6f4f2] text-[#02665e]";
  const idle = variant === "dark"
    ? "bg-transparent text-white hover:bg-[#015b54]/70"
    : "text-[#02665e] hover:bg-[#eaf7f5]";

  return (
    <nav className="space-y-2.5">
      {items.map(({ href, label, Icon }) => {
        const isActive = path.startsWith(href);
        // Special handling for the top-level Admin entry: toggle the detailed admin sidebar
        if (href === "/admin") {
          return (
            <div key={href}>
              {/* Owner top-level is a toggle only; the actual Dashboard link performs Owner tasks */}
              <div className="block">
                <button
                  type="button"
                  aria-expanded={adminOpen}
                  aria-controls="owner-details"
                  onClick={() => setAdminOpen((s) => !s)}
                  className={`${focusRing} ${base} ${isActive ? active : idle} px-4 py-3 w-full flex items-center gap-3 justify-between`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </span>
                  <span className="flex items-center">
                    {adminOpen ? (
                      <ChevronUp className="h-4 w-4 text-[#02665e]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#02665e]" />
                    )}
                  </span>
                </button>
              </div>

              {/* Render admin detailed sidebar immediately after Owner item so it pushes subsequent items down */}
              {adminOpen && (
                <div id="owner-details" className="mt-2 space-y-1 pl-4">
                  {adminDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => {
                    const isActiveDetail = path.startsWith(dHref);
                    return (
                      <Link key={dHref} href={dHref} aria-current={isActiveDetail ? "page" : undefined} className={`${focusRing} block`}>
                        <span className={`${base} ${isActiveDetail ? active : idle} px-3 py-2 text-sm flex items-center gap-2`}>
                          <DIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                          <span className="truncate">{dLabel}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        // Render Drivers as a toggle with its own mini-sidebar
        if (href === "/admin/drivers") {
          const isActiveDriver = path.startsWith(href);
          return (
            <div key={href}>
              <div className="block">
                <button
                  type="button"
                  aria-expanded={driverOpen}
                  aria-controls="driver-details"
                  onClick={() => setDriverOpen((s) => !s)}
                  className={`${focusRing} ${base} ${isActiveDriver ? active : idle} px-4 py-3 w-full flex items-center gap-3 justify-between`}
                >
                  <span className="flex items-center gap-3">
                    <Truck className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">Drivers</span>
                  </span>
                  <span className="flex items-center">
                    {driverOpen ? (
                      <ChevronUp className="h-4 w-4 text-[#02665e]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#02665e]" />
                    )}
                  </span>
                </button>
              </div>

              {driverOpen && (
                <div id="driver-details" className="mt-2 space-y-1 pl-4">
                  {driverDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => {
                    const isActiveDetail = path.startsWith(dHref);
                    return (
                      <Link key={dHref} href={dHref} aria-current={isActiveDetail ? "page" : undefined} className={`${focusRing} block`}>
                        <span className={`${base} ${isActiveDetail ? active : idle} px-3 py-2 text-sm flex items-center gap-2`}>
                          <DIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                          <span className="truncate">{dLabel}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        // Render Management as a toggle with its own mini-sidebar
        if (href === "/admin/management") {
          const isActiveManagement = path.startsWith(href);
          return (
            <div key={href}>
              <div className="block">
                <button
                  type="button"
                  aria-expanded={managementOpen}
                  aria-controls="management-details"
                  onClick={() => setManagementOpen((s) => !s)}
                  className={`${focusRing} ${base} ${isActiveManagement ? active : idle} px-4 py-3 w-full flex items-center gap-3 justify-between`}
                >
                  <span className="flex items-center gap-3">
                    <LayoutDashboard className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">Management</span>
                  </span>
                  <span className="flex items-center">
                    {managementOpen ? (
                      <ChevronUp className="h-4 w-4 text-[#02665e]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#02665e]" />
                    )}
                  </span>
                </button>
              </div>

              {managementOpen && (
                <div id="management-details" className="mt-2 space-y-1 pl-4">
                  {managementDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => {
                    const isActiveDetail = path.startsWith(dHref);
                    return (
                      <Link key={dHref} href={dHref} aria-current={isActiveDetail ? "page" : undefined} className={`${focusRing} block`}>
                        <span className={`${base} ${isActiveDetail ? active : idle} px-3 py-2 text-sm flex items-center gap-2`}>
                          <DIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                          <span className="truncate">{dLabel}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        // Render Users with a visual chevron (no submenu)
        if (href === "/admin/users") {
          const isActiveUsers = path.startsWith(href);
          return (
            <div key={href}>
              <div className="block">
                <button
                  type="button"
                  aria-expanded={usersOpen}
                  aria-controls="users-details"
                  onClick={() => setUsersOpen((s) => !s)}
                  className={`${focusRing} ${base} ${isActiveUsers ? active : idle} px-4 py-3 w-full flex items-center gap-3 justify-between`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">Users</span>
                  </span>
                  <span className="flex items-center">
                    {usersOpen ? (
                      <ChevronUp className="h-4 w-4 text-[#02665e]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#02665e]" />
                    )}
                  </span>
                </button>
              </div>
            </div>
          );
        }

        // Render Group Stay as a toggle with its own mini-sidebar
        if (href === "/admin/group-stays") {
          const isActiveGroup = path.startsWith(href);
          return (
            <div key={href}>
              <div className="block">
                <button
                  type="button"
                  aria-expanded={groupStayOpen}
                  aria-controls="groupstay-details"
                  onClick={() => setGroupStayOpen((s) => !s)}
                  className={`${focusRing} ${base} ${isActiveGroup ? active : idle} px-4 py-3 w-full flex items-center gap-3 justify-between`}
                >
                  <span className="flex items-center gap-3">
                    <UsersRound className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">Group Stay</span>
                  </span>
                  <span className="flex items-center">
                    {groupStayOpen ? (
                      <ChevronUp className="h-4 w-4 text-[#02665e]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#02665e]" />
                    )}
                  </span>
                </button>
              </div>

              {groupStayOpen && (
                <div id="groupstay-details" className="mt-2 space-y-1 pl-4">
                  {groupStayDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => {
                    const isActiveDetail = path.startsWith(dHref);
                    return (
                      <Link key={dHref} href={dHref} aria-current={isActiveDetail ? "page" : undefined} className={`${focusRing} block`}>
                        <span className={`${base} ${isActiveDetail ? active : idle} px-3 py-2 text-sm flex items-center gap-2`}>
                          <DIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                          <span className="truncate">{dLabel}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        // Render Plan with US as a toggle with its own mini-sidebar
        if (href === "/admin/plan-with-us") {
          const isActivePlan = path.startsWith(href);
          return (
            <div key={href}>
              <div className="block">
                <button
                  type="button"
                  aria-expanded={planWithUsOpen}
                  aria-controls="planwithus-details"
                  onClick={() => setPlanWithUsOpen((s) => !s)}
                  className={`${focusRing} ${base} ${isActivePlan ? active : idle} px-4 py-3 w-full flex items-center gap-3 justify-between`}
                >
                  <span className="flex items-center gap-3">
                    <ClipboardList className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">Plan with US</span>
                  </span>
                  <span className="flex items-center">
                    {planWithUsOpen ? (
                      <ChevronUp className="h-4 w-4 text-[#02665e]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#02665e]" />
                    )}
                  </span>
                </button>
              </div>

              {planWithUsOpen && (
                <div id="planwithus-details" className="mt-2 space-y-1 pl-4">
                  {planWithUsDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => {
                    const isActiveDetail = path.startsWith(dHref);
                    return (
                      <Link key={dHref} href={dHref} aria-current={isActiveDetail ? "page" : undefined} className={`${focusRing} block`}>
                        <span className={`${base} ${isActiveDetail ? active : idle} px-3 py-2 text-sm flex items-center gap-2`}>
                          <DIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                          <span className="truncate">{dLabel}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

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

      

      {/* Detailed admin links are available from the Admin dashboard page. */}
    </nav>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { Home, LayoutDashboard, Users, UsersRound, UserSquare2, Truck, LineChart, Building2, Calendar, FileText, Wallet, Settings, ChevronDown, ChevronRight, ShieldCheck, Link2, Receipt, ListFilter, ClipboardList, CheckCircle, Award, Megaphone, UserPlus, Trophy, Star, Bell, BarChart3, Activity, Eye, Briefcase, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

type Item = {
  href: string;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

function Item({ href, label, Icon, isSubItem = false }: { href: string; label: string; Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>; isSubItem?: boolean }) {
  const path = usePathname();
  const active = path === href || path?.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`no-underline flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 bg-white border border-transparent
        ${active ? "text-[#02665e] border-[#02665e]/20" : "text-[#02665e] hover:bg-gray-50"}
        ${isSubItem ? "ml-4" : ""}`}
      style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
    >
      <div className="flex items-center gap-3">
        {Icon ? (
          <Icon className="h-4 w-4 text-[#02665e] flex-shrink-0" aria-hidden />
        ) : null}
        <span>{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-[#02665e] opacity-60 flex-shrink-0" aria-hidden />
    </Link>
  );
}

// Top-level visible by default: Admin, Owners, Users.
// All remaining admin sections live under the Admin mini-sidebar.
const items: Item[] = [
  { href: "/admin/home", label: "Home", Icon: Home },
  { href: "/admin", label: "Owners", Icon: Building2 },
  { href: "/admin/drivers", label: "Drivers", Icon: Truck },
  { href: "/admin/users", label: "Users", Icon: UserSquare2 },
  { href: "/admin/group-stays", label: "Group Stay", Icon: UsersRound },
  { href: "/admin/plan-with-us", label: "Plan with US", Icon: ClipboardList },
  { href: "/admin/cancellations", label: "Cancellations", Icon: XCircle },
  { href: "/admin/management", label: "Management", Icon: LayoutDashboard },
];

const adminDetails: Item[] = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/owners", label: "Owners", Icon: Building2 },
  { href: "/admin/bookings", label: "Bookings", Icon: Calendar },
  { href: "/admin/properties", label: "Properties", Icon: FileText },
  { href: "/admin/properties/previews", label: "Previews", Icon: Eye },
  { href: "/admin/payments", label: "Payments", Icon: Wallet },
];

const driverDetails: Item[] = [
  { href: "/admin/drivers", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/drivers/trips", label: "Trips", Icon: Calendar },
  { href: "/admin/drivers/invoices", label: "Invoices", Icon: FileText },
  { href: "/admin/drivers/paid", label: "Paid", Icon: Wallet },
  { href: "/admin/drivers/revenues", label: "Revenues", Icon: LineChart },
  { href: "/admin/drivers/referrals", label: "Referrals", Icon: UserPlus },
  { href: "/admin/drivers/bonuses", label: "Bonuses", Icon: Award },
  { href: "/admin/drivers/levels", label: "Levels", Icon: Trophy },
  { href: "/admin/drivers/reminders", label: "Reminders", Icon: Bell },
  { href: "/admin/drivers/stats", label: "Stats", Icon: BarChart3 },
  { href: "/admin/drivers/activities", label: "All Activities", Icon: Activity },
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

const cancellationsDetails: Item[] = [
  { href: "/admin/cancellations", label: "Dashboard", Icon: LayoutDashboard },
];

const userDetails: Item[] = [
  { href: "/admin/users", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/users/list", label: "All Users", Icon: Users },
  { href: "/admin/users/transport-bookings", label: "Transport Bookings", Icon: Truck },
  { href: "/admin/users/bookings", label: "Bookings", Icon: Calendar },
];

const managementDetails: Item[] = [
  { href: "/admin/management", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/management/audit-log", label: "Audit Log", Icon: ShieldCheck },
  { href: "/admin/management/bookings", label: "Bookings", Icon: Calendar },
  { href: "/admin/management/careers", label: "Careers", Icon: Briefcase },
  { href: "/admin/management/integrations", label: "Integrations", Icon: Link2 },
  { href: "/admin/management/invoices", label: "Invoices", Icon: Receipt },
  { href: "/admin/management/ip-allowlist", label: "IP Allowlist", Icon: ListFilter },
  { href: "/admin/management/owners", label: "Owners", Icon: Building2 },
  { href: "/admin/management/properties", label: "Properties", Icon: FileText },
  { href: "/admin/management/trust-partners", label: "Trust Partners", Icon: Award },
  { href: "/admin/management/settings", label: "Settings", Icon: Settings },
  { href: "/admin/management/updates", label: "Updates", Icon: Megaphone },
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
  const [cancellationsOpen, setCancellationsOpen] = useState(false);

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
    const isCancellations = path.startsWith("/admin/cancellations");
    // Owner (admin) mini-sidebar: open when on admin child routes that aren't drivers/users/group-stays/plan-with-us
    if (isAdminPath && !isDrivers && !isUsers && !isGroupStay && !isPlanWithUs && !isCancellations) setAdminOpen(true);
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
    // Cancellations mini-sidebar
    if (isCancellations) setCancellationsOpen(true);
    else setCancellationsOpen(false);
    // Visual chevrons for Users
    setUsersOpen(isUsers);
  }, [path]);

  return (
    <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
      <div className="space-y-2">
        {/* Home */}
        <Item href="/admin/home" label="Home" Icon={Home} />

        {/* Admin/Owners */}
        <div>
          <button 
            onClick={() => setAdminOpen(v => !v)} 
            className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-[#02665e] bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200"
            style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
          >
            <span>Owners</span>
            {adminOpen ? (
              <ChevronDown className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
            )}
          </button>
          {adminOpen && (
            <div className="mt-2 space-y-2">
              {adminDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => (
                <Item key={dHref} href={dHref} label={dLabel} Icon={DIcon} isSubItem />
              ))}
            </div>
          )}
        </div>

        {/* Drivers */}
        <div>
          <button 
            onClick={() => setDriverOpen(v => !v)} 
            className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-[#02665e] bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200"
            style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
          >
            <span>Drivers</span>
            {driverOpen ? (
              <ChevronDown className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
            )}
          </button>
          {driverOpen && (
            <div className="mt-2 space-y-2">
              {driverDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => (
                <Item key={dHref} href={dHref} label={dLabel} Icon={DIcon} isSubItem />
              ))}
            </div>
          )}
        </div>

        {/* Users */}
        <div>
          <button 
            onClick={() => setUsersOpen(v => !v)} 
            className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-[#02665e] bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200"
            style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
          >
            <span>Users</span>
            {usersOpen ? (
              <ChevronDown className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
            )}
          </button>
          {usersOpen && (
            <div className="mt-2 space-y-2">
              {userDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => (
                <Item key={dHref} href={dHref} label={dLabel} Icon={DIcon} isSubItem />
              ))}
            </div>
          )}
        </div>

        {/* Group Stay */}
        <div>
          <button 
            onClick={() => setGroupStayOpen(v => !v)} 
            className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-[#02665e] bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200"
            style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
          >
            <span>Group Stay</span>
            {groupStayOpen ? (
              <ChevronDown className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
            )}
          </button>
          {groupStayOpen && (
            <div className="mt-2 space-y-2">
              {groupStayDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => (
                <Item key={dHref} href={dHref} label={dLabel} Icon={DIcon} isSubItem />
              ))}
            </div>
          )}
        </div>

        {/* Plan with US */}
        <div>
          <button 
            onClick={() => setPlanWithUsOpen(v => !v)} 
            className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-[#02665e] bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200"
            style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
          >
            <span>Plan with US</span>
            {planWithUsOpen ? (
              <ChevronDown className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
            )}
          </button>
          {planWithUsOpen && (
            <div className="mt-2 space-y-2">
              {planWithUsDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => (
                <Item key={dHref} href={dHref} label={dLabel} Icon={DIcon} isSubItem />
              ))}
            </div>
          )}
        </div>

        {/* Cancellations */}
        <div>
          <button
            onClick={() => setCancellationsOpen((v) => !v)}
            className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-[#02665e] bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200"
            style={{ backfaceVisibility: "hidden", transform: "translateZ(0)" }}
          >
            <span>Cancellations</span>
            {cancellationsOpen ? (
              <ChevronDown className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
            )}
          </button>
          {cancellationsOpen && (
            <div className="mt-2 space-y-2">
              {cancellationsDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => (
                <Item key={dHref} href={dHref} label={dLabel} Icon={DIcon} isSubItem />
              ))}
            </div>
          )}
        </div>

        {/* Management */}
        <div>
          <button 
            onClick={() => setManagementOpen(v => !v)} 
            className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-[#02665e] bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200"
            style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
          >
            <span>Management</span>
            {managementOpen ? (
              <ChevronDown className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
            )}
          </button>
          {managementOpen && (
            <div className="mt-2 space-y-2">
              {managementDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => (
                <Item key={dHref} href={dHref} label={dLabel} Icon={DIcon} isSubItem />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

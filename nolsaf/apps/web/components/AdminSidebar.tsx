"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { Home, LayoutDashboard, Users, Truck, LineChart, Building2, Calendar, FileText, Wallet, Settings, ChevronDown, ChevronRight, ShieldCheck, Link2, Receipt, ListFilter, CheckCircle, Award, Megaphone, UserPlus, Trophy, Bell, BarChart3, Activity, Eye, Briefcase, MessageSquare, Ban, Bot, Gift } from "lucide-react";
import { useEffect, useState } from "react";

type Item = {
  href: string;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

function Item({ href, label, Icon, isSubItem = false, collapsed = false }: { href: string; label: string; Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>; isSubItem?: boolean; collapsed?: boolean }) {
  const path = usePathname();
  const active = path === href || path?.startsWith(href + "/");
  
  if (collapsed) {
    return (
      <Link
        href={href}
        title={label}
        className={`group relative no-underline flex items-center justify-center rounded-lg p-3 text-sm font-medium transition-all duration-200 bg-white border border-transparent
          ${active ? "text-[#02665e] border-[#02665e]/20 bg-[#02665e]/5" : "text-[#02665e] hover:bg-gray-50"}
          active:scale-95 hover:scale-105
          [backface-visibility:hidden] [transform:translateZ(0)]`}
      >
        {Icon ? (
          <Icon className="h-5 w-5 text-[#02665e] flex-shrink-0" aria-hidden />
        ) : null}
        {/* Tooltip for collapsed state */}
        <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
          {label}
        </span>
      </Link>
    );
  }
  
  return (
    <Link
      href={href}
      className={`no-underline flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 bg-white border border-transparent
        ${active ? "text-[#02665e] border-[#02665e]/20" : "text-[#02665e] hover:bg-gray-50"}
        active:scale-[0.98] hover:scale-[1.02]
        ${isSubItem ? "ml-4" : ""} [backface-visibility:hidden] [transform:translateZ(0)]`}
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

const adminDetails: Item[] = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/owners", label: "Owners", Icon: Building2 },
  { href: "/admin/bookings", label: "Bookings", Icon: Calendar },
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
  { href: "/admin/group-stays/claims", label: "Submitted Claims", Icon: Gift },
  { href: "/admin/group-stays/assignments", label: "Assignments", Icon: Users },
  { href: "/admin/group-stays/passengers", label: "Passengers", Icon: Users },
  { href: "/admin/group-stays/arrangements", label: "Arrangements", Icon: Settings },
];

const planWithUsDetails: Item[] = [
  { href: "/admin/plan-with-us", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/plan-with-us/requests", label: "Requests", Icon: FileText },
  { href: "/admin/plan-with-us/recommended", label: "Recommended", Icon: CheckCircle },
];

const agentsDetails: Item[] = [
  { href: "/admin/agents", label: "All Agents", Icon: Users },
  { href: "/admin/agents/ai", label: "Twiga", Icon: MessageSquare },
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
  { href: "/admin/management/trust-partners", label: "Trust Partners", Icon: Award },
  { href: "/admin/management/settings", label: "Settings", Icon: Settings },
  { href: "/admin/management/updates", label: "Updates", Icon: Megaphone },
  { href: "/admin/management/users", label: "Users", Icon: Users },
];

// Detailed admin links (analytics, owners, bookings, properties, etc.) remain reachable from the Admin dashboard page.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function AdminNav({ variant = "light", collapsed = false }: { variant?: "light" | "dark"; collapsed?: boolean }) {
  const path = usePathname();
  const [adminOpen, setAdminOpen] = useState(false);
  const [driverOpen, setDriverOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [groupStayOpen, setGroupStayOpen] = useState(false);
  const [planWithUsOpen, setPlanWithUsOpen] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [cancellationsOpen, setCancellationsOpen] = useState(false);

  useEffect(() => {
    // Auto-open sections only when navigating to routes within that section
    // Default: all sections closed, /admin/home is the default landing page
    if (!path) return;
    const isAdminHome = path === "/admin/home";
    const isDrivers = path.startsWith("/admin/drivers");
    const isManagement = path.startsWith("/admin/management");
    const isUsers = path.startsWith("/admin/users");
    const isGroupStay = path.startsWith("/admin/group-stays");
    const isPlanWithUs = path.startsWith("/admin/plan-with-us");
    const isAgents = path.startsWith("/admin/agents");
    const isCancellations = path.startsWith("/admin/cancellations");
    // Owner (admin) mini-sidebar: open when on /admin (owners dashboard) or admin child routes
    // but NOT on /admin/home (which is the admin , not owners)
    const isAdminChildRoute = (path === "/admin" ||
                                path === "/admin/owners" || path.startsWith("/admin/owners/") ||
                                path === "/admin/bookings" || path.startsWith("/admin/bookings/") ||
                                path === "/admin/properties" || path.startsWith("/admin/properties/") ||
                                path === "/admin/payments" || path.startsWith("/admin/payments/") ||
                                path === "/admin/revenue" || path.startsWith("/admin/revenue/")) &&
                                !isAdminHome && !isDrivers && !isUsers && !isGroupStay && !isPlanWithUs && !isAgents && !isCancellations && !isManagement;
    setAdminOpen(isAdminChildRoute);
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
    // Agents mini-sidebar: open when on agents routes
    if (isAgents) setAgentsOpen(true);
    else setAgentsOpen(false);
    // Cancellations mini-sidebar
    if (isCancellations) setCancellationsOpen(true);
    else setCancellationsOpen(false);
    // Visual chevrons for Users
    setUsersOpen(isUsers);
  }, [path]);

  // Collapsible section button component
  const CollapsibleButton = ({ 
    label, 
    Icon, 
    isOpen, 
    onClick, 
    collapsed 
  }: { 
    label: string; 
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; 
    isOpen: boolean; 
    onClick: () => void;
    collapsed: boolean;
  }) => {
    if (collapsed) {
      return (
        <button 
          onClick={onClick}
          title={label}
          className="group relative w-full flex items-center justify-center rounded-lg p-3 text-sm font-medium text-[#02665e] bg-white border border-gray-300 hover:bg-gray-50 active:scale-95 hover:scale-105 transition-all duration-200 [backface-visibility:hidden] [transform:translateZ(0)]"
        >
          <Icon className="h-5 w-5 text-[#02665e] flex-shrink-0" aria-hidden />
          {/* Tooltip for collapsed state */}
          <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
            {label}
          </span>
        </button>
      );
    }
    
    return (
      <button 
        onClick={onClick}
        className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-[#02665e] bg-white border border-gray-300 hover:bg-gray-50 active:scale-[0.98] hover:scale-[1.02] transition-all duration-200 [backface-visibility:hidden] [transform:translateZ(0)]"
      >
        <span>{label}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
        )}
      </button>
    );
  };

  return (
    <div className={`bg-gray-50 rounded-2xl border border-gray-200 ${collapsed ? 'p-2' : 'p-3'}`}>
      <div className={`space-y-2 ${collapsed ? 'space-y-1' : ''}`}>
        {/* Home */}
        <Item href="/admin/home" label="Home" Icon={Home} collapsed={collapsed} />

        {/* Admin/Owners */}
        {collapsed ? (
          <Item href="/admin" label="Owners" Icon={Building2} collapsed={collapsed} />
        ) : (
          <div>
            <CollapsibleButton 
              label="Owners" 
              Icon={Building2} 
              isOpen={adminOpen} 
              onClick={() => setAdminOpen(v => !v)}
              collapsed={collapsed}
            />
            {adminOpen && (
              <div className="mt-2 space-y-2">
                {adminDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => (
                  <Item key={dHref} href={dHref} label={dLabel} Icon={DIcon} isSubItem collapsed={collapsed} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Drivers */}
        {collapsed ? (
          <Item href="/admin/drivers" label="Drivers" Icon={Truck} collapsed={collapsed} />
        ) : (
          <div>
            <CollapsibleButton 
              label="Drivers" 
              Icon={Truck} 
              isOpen={driverOpen} 
              onClick={() => setDriverOpen(v => !v)}
              collapsed={collapsed}
            />
            {driverOpen && (
              <div className="mt-2 space-y-2">
                {driverDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => (
                  <Item key={dHref} href={dHref} label={dLabel} Icon={DIcon} isSubItem collapsed={collapsed} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users */}
        {collapsed ? (
          <Item href="/admin/users" label="Users" Icon={Users} collapsed={collapsed} />
        ) : (
          <div>
            <CollapsibleButton 
              label="Users" 
              Icon={Users} 
              isOpen={usersOpen} 
              onClick={() => setUsersOpen(v => !v)}
              collapsed={collapsed}
            />
            {usersOpen && (
              <div className="mt-2 space-y-2">
                {userDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => (
                  <Item key={dHref} href={dHref} label={dLabel} Icon={DIcon} isSubItem collapsed={collapsed} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Group Stay */}
        {collapsed ? (
          <Item href="/admin/group-stays" label="Group Stay" Icon={Users} collapsed={collapsed} />
        ) : (
          <div>
            <CollapsibleButton 
              label="Group Stay" 
              Icon={Users} 
              isOpen={groupStayOpen} 
              onClick={() => setGroupStayOpen(v => !v)}
              collapsed={collapsed}
            />
            {groupStayOpen && (
              <div className="mt-2 space-y-2">
                {groupStayDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => (
                  <Item key={dHref} href={dHref} label={dLabel} Icon={DIcon} isSubItem collapsed={collapsed} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Plan with US */}
        {collapsed ? (
          <Item href="/admin/plan-with-us" label="Plan with US" Icon={ListFilter} collapsed={collapsed} />
        ) : (
          <div>
            <CollapsibleButton 
              label="Plan with US" 
              Icon={ListFilter} 
              isOpen={planWithUsOpen} 
              onClick={() => setPlanWithUsOpen(v => !v)}
              collapsed={collapsed}
            />
            {planWithUsOpen && (
              <div className="mt-2 space-y-2">
                {planWithUsDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => (
                  <Item key={dHref} href={dHref} label={dLabel} Icon={DIcon} isSubItem collapsed={collapsed} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Agents */}
        {collapsed ? (
          <Item href="/admin/agents" label="IoT & AI Agents" Icon={Bot} collapsed={collapsed} />
        ) : (
          <div>
            <CollapsibleButton 
              label="IoT & AI Agents" 
              Icon={Bot} 
              isOpen={agentsOpen} 
              onClick={() => setAgentsOpen(v => !v)}
              collapsed={collapsed}
            />
            {agentsOpen && (
              <div className="mt-2 space-y-2">
                {agentsDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => (
                  <Item key={dHref} href={dHref} label={dLabel} Icon={DIcon} isSubItem collapsed={collapsed} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cancellations */}
        {collapsed ? (
          <Item href="/admin/cancellations" label="Cancellations" Icon={Ban} collapsed={collapsed} />
        ) : (
          <div>
            <CollapsibleButton 
              label="Cancellations" 
              Icon={Ban} 
              isOpen={cancellationsOpen} 
              onClick={() => setCancellationsOpen(v => !v)}
              collapsed={collapsed}
            />
            {cancellationsOpen && (
              <div className="mt-2 space-y-2">
                {cancellationsDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => (
                  <Item key={dHref} href={dHref} label={dLabel} Icon={DIcon} isSubItem collapsed={collapsed} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Management */}
        {collapsed ? (
          <Item href="/admin/management" label="Management" Icon={Settings} collapsed={collapsed} />
        ) : (
          <div>
            <CollapsibleButton 
              label="Management" 
              Icon={Settings} 
              isOpen={managementOpen} 
              onClick={() => setManagementOpen(v => !v)}
              collapsed={collapsed}
            />
            {managementOpen && (
              <div className="mt-2 space-y-2">
                {managementDetails.map(({ href: dHref, label: dLabel, Icon: DIcon }) => (
                  <Item key={dHref} href={dHref} label={dLabel} Icon={DIcon} isSubItem collapsed={collapsed} />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

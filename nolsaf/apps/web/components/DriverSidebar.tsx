"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, ListChecks, User, Map, FileText, Clock, Settings, Wallet, BarChart2, Gift, ChevronDown } from 'lucide-react';
import React from 'react';

function Item({ href, label, Icon, collapsed }: { href: string; label: string; Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>; collapsed?: boolean }) {
  const path = usePathname();
  const active = path === href || path?.startsWith(href + "/");
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
  className={`no-underline flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-4'} py-3 rounded-md ${collapsed ? 'text-base' : 'text-3xl'} transition border
        ${active ? "bg-white text-brand-primary border-brand-primary/30" : "bg-white/70 hover:bg-white border-transparent"}`}
    >
      <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''} relative group`}>
        {Icon ? (
          <span className="h-6 w-6 flex items-center justify-center">
            <Icon className={`${collapsed ? 'h-5 w-5' : 'h-6 w-6'} text-white`} aria-hidden />
          </span>
        ) : null}
        {!collapsed && <span>{label}</span>}

        {/* Tooltip shown when collapsed and hovering the item */}
        {collapsed && (
          <span className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 whitespace-nowrap rounded-md bg-black text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {label}
          </span>
        )}
      </div>
      {!collapsed && <span className="text-xs opacity-60">›</span>}
    </Link>
  );
}

export default function DriverSidebar() {
  // Avoid SSR/CSR mismatches: initialize closed and read persisted value on mount
  const [collapsed, setCollapsed] = useState<boolean>(false);
  
  

  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        setCollapsed(localStorage.getItem('driver_sidebar_collapsed') === '1');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const toggleCollapsed = () => {
    const v = !collapsed;
    setCollapsed(v);
    try { localStorage.setItem('driver_sidebar_collapsed', v ? '1' : '0'); } catch (e) { /* ignore */ }
  };

  // Local UI state: whether the Revenue group is expanded. Persist in localStorage.
  // Initialize closed on the server to avoid hydration mismatch; read persisted value on client
  const [revenueOpen, setRevenueOpen] = useState<boolean>(false);

  // Read persisted preference on client after mount
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('driver_revenue_open');
        setRevenueOpen(raw === null ? true : raw !== '0');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // update storage whenever revenueOpen changes
  React.useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('driver_revenue_open', revenueOpen ? '1' : '0');
      }
    } catch (e) {
      // ignore
    }
  }, [revenueOpen]);

  return (
    <div>
      <div className={`bg-neutral-100 rounded-2xl p-3 border ${collapsed ? 'w-16' : ''}`}>
        <div className="flex items-center justify-end mb-2">
          <button onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="p-1 rounded-md bg-white/70 hover:bg-white text-sm">
            {collapsed ? '›' : '‹'}
          </button>
        </div>
        <div className="mb-2">
          <Item href="/driver" label="Dashboard" Icon={LayoutDashboard} collapsed={collapsed} />
        </div>

        {/* quick links were moved to the Driver welcome card */}

        <div className="mt-2">
          <div className="grid gap-2">
              <Item href="/driver/map?live=1" label="Live Map" Icon={Map} collapsed={collapsed} />
            <Item href="/driver/trips" label="My Trips" Icon={ListChecks} collapsed={collapsed} />

            {/* Revenue group: parent label (toggle) with child items. Clicking toggles open/close. */}
            <div className="mt-1">
              <div
                role="button"
                tabIndex={0}
                aria-expanded={revenueOpen}
                onClick={() => setRevenueOpen((v) => !v)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setRevenueOpen((v) => !v) }}
                className={`no-underline flex items-center ${collapsed ? 'justify-center px-2' : 'px-4'} py-2 rounded-md text-sm text-white cursor-pointer transition-colors hover:bg-white/70`}
              >
                <span className="h-6 w-6 flex items-center justify-center mr-3">
                  <BarChart2 className={`${collapsed ? 'h-5 w-5' : 'h-5 w-5'} text-white`} aria-hidden />
                </span>
                {!collapsed && <span className="font-medium">My Revenue</span>}
                <span className={`${collapsed ? 'ml-1' : 'ml-auto'} transition-transform ${revenueOpen ? 'rotate-180' : ''}`}>
                  <ChevronDown className={`h-3 w-3 text-white`} aria-hidden />
                </span>
              </div>

              <div className={`ml-6 mt-1 space-y-1 ${!revenueOpen ? 'hidden' : ''}`}>
                <Item href="/driver/invoices" label="Invoices" Icon={FileText} collapsed={collapsed} />
                <Item href="/driver/payouts" label="Payouts" Icon={Wallet} collapsed={collapsed} />
                <Item href="/driver/bonus" label="Bonus" Icon={Gift} collapsed={collapsed} />
              </div>
            </div>

            <Item href="/driver/history" label="History" Icon={Clock} collapsed={collapsed} />
            <Item href="/driver/management" label="Managements" Icon={Settings} collapsed={collapsed} />
          </div>
        </div>

        <div className="h-4" />
        <Item href="/driver/profile" label="Profile" Icon={User} collapsed={collapsed} />
      </div>
      {/* LiveMap overlay is shown on the map page itself; sidebar is a simple shortcut */}
    </div>
  );
}

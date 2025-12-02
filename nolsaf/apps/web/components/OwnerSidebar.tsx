"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Building2, Calendar, Wallet, FileText, PlusSquare, LayoutDashboard } from 'lucide-react';

function Item({ href, label, Icon }: { href: string; label: string; Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>> }) {
  const path = usePathname();
  const active = path === href || path?.startsWith(href + "/");
  // render icon without colored circular background; user requested white SVG icons
  return (
    <Link
      href={href}
      className={`no-underline flex items-center justify-between rounded-md px-4 py-3 text-lg transition border
        ${active ? "bg-white text-brand-primary border-brand-primary/30" : "bg-white/70 hover:bg-white border-transparent"}`}
    >
      <div className="flex items-center gap-3">
        {Icon ? (
          // render the icon directly (white SVG) — no colored circle
          <span className="h-6 w-6 flex items-center justify-center">
            <Icon className="h-4 w-4 text-current" aria-hidden />
          </span>
        ) : null}
        <span>{label}</span>
      </div>
      <span className="text-xs opacity-60">›</span>
    </Link>
  );
}

export default function OwnerSidebar() {
  const [propOpen, setPropOpen] = useState(true);
  const [bookOpen, setBookOpen] = useState(true);
  const [revenueOpen, setRevenueOpen] = useState(true);

  return (
    <div>
      <div className="bg-neutral-100 rounded-2xl p-3 border">

        {/* Dashboard */}
        <div className="mb-2">
          <Item href="/owner" label="Dashboard" Icon={LayoutDashboard} />
        </div>

        {/* My Properties */}
        <button onClick={()=>setPropOpen(v=>!v)} className="w-full flex items-center justify-between px-4 py-3 rounded-md text-left font-medium bg-white">
          <div className="flex items-center gap-3">
            {/* intentionally no leading icon to match other sidebar sections */}
            <span>My Properties</span>
          </div>
          <span className="text-xs opacity-60">{propOpen ? "▾" : "▸"}</span>
        </button>
        {propOpen && (
            <div className="mt-2 grid gap-2">
            <Item href="/owner/properties/approved" label="Approved" Icon={Building2} />
            <Item href="/owner/properties/pending" label="Pending" Icon={Building2} />
            <Item href="/owner/properties/add" label="Add New" Icon={PlusSquare} />
          </div>
        )}

        {/* Bookings */}
        <div className="h-4" />
        <button onClick={()=>setBookOpen(v=>!v)} className="w-full flex items-center justify-between px-4 py-3 rounded-md text-left font-medium bg-white">
          <span>Bookings</span>
          <span className="text-xs opacity-60">{bookOpen ? "▾" : "▸"}</span>
        </button>
        {bookOpen && (
          <div className="mt-2 grid gap-2">
            <Item href="/owner/bookings/recent" label="Recent Bookings" Icon={Calendar} />
            <Item href="/owner/bookings/validate" label="Check-in Validation" Icon={Calendar} />
            <Item href="/owner/bookings/checked-in" label="Checked-In" Icon={Calendar} />
          </div>
        )}

        {/* Revenue section (independent) */}
        <div className="h-4" />
        <button onClick={() => setRevenueOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3 rounded-md text-left font-medium bg-white">
          <span>My Revenue</span>
          <span className="text-xs opacity-60">{revenueOpen ? "▾" : "▸"}</span>
        </button>
        {revenueOpen && (
          <div className="mt-2 grid gap-2">
            <Item href="/owner/revenue/requested" label="Requested" Icon={Wallet} />
            <Item href="/owner/revenue/paid" label="Paid Invoices" Icon={Wallet} />
            <Item href="/owner/revenue/rejected" label="Rejected" Icon={Wallet} />
            <Item href="/owner/reports/overview" label="Reports" Icon={FileText} />
          </div>
        )}
      </div>
    </div>
  );
}

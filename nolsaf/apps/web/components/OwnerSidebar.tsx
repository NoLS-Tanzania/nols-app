"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Building2, Calendar, Wallet, FileText, PlusSquare, LayoutDashboard, ChevronDown, ChevronRight } from 'lucide-react';

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

export default function OwnerSidebar() {
  const [propOpen, setPropOpen] = useState(true);
  const [bookOpen, setBookOpen] = useState(true);
  const [revenueOpen, setRevenueOpen] = useState(true);

  return (
    <div>
      <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
        <div className="space-y-2">
          {/* Dashboard */}
          <Item href="/owner" label="Dashboard" Icon={LayoutDashboard} />

          {/* My Properties */}
          <div>
            <button 
              onClick={() => setPropOpen(v => !v)} 
              className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-[#02665e] bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200"
              style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
            >
              <span>My Properties</span>
              {propOpen ? (
                <ChevronDown className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
              )}
            </button>
            {propOpen && (
              <div className="mt-2 space-y-2">
                <Item href="/owner/properties/approved" label="Approved" Icon={FileText} isSubItem />
                <Item href="/owner/properties/pending" label="Pending" Icon={FileText} isSubItem />
                <Item href="/owner/properties/add" label="Add New" Icon={PlusSquare} isSubItem />
              </div>
            )}
          </div>

          {/* Bookings */}
          <div>
            <button 
              onClick={() => setBookOpen(v => !v)} 
              className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-[#02665e] bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200"
              style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
            >
              <span>Bookings</span>
              {bookOpen ? (
                <ChevronDown className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
              )}
            </button>
            {bookOpen && (
              <div className="mt-2 space-y-2">
                <Item href="/owner/bookings/recent" label="Recent Bookings" Icon={Calendar} isSubItem />
                <Item href="/owner/bookings/validate" label="Check-in" Icon={Calendar} isSubItem />
                <Item href="/owner/bookings/checked-in" label="Checked-In" Icon={Calendar} isSubItem />
              </div>
            )}
          </div>

          {/* Revenue section (independent) */}
          <div>
            <button 
              onClick={() => setRevenueOpen(v => !v)} 
              className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-[#02665e] bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200"
              style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
            >
              <span>My Revenue</span>
              {revenueOpen ? (
                <ChevronDown className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#02665e] opacity-60" aria-hidden />
              )}
            </button>
            {revenueOpen && (
              <div className="mt-2 space-y-2">
                <Item href="/owner/revenue/requested" label="Requested" Icon={Wallet} isSubItem />
                <Item href="/owner/revenue/paid" label="Paid Invoices" Icon={Wallet} isSubItem />
                <Item href="/owner/revenue/rejected" label="Rejected" Icon={Wallet} isSubItem />
                <Item href="/owner/reports/overview" label="Reports" Icon={FileText} isSubItem />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

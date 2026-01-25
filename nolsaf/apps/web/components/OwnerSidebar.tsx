"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import axios from "axios";
import { Calendar, Wallet, FileText, PlusSquare, LayoutDashboard, ChevronDown, ChevronRight, Users, HandHeart, CalendarDays, CheckCircle2 } from 'lucide-react';

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

function Item({ href, label, Icon, isSubItem = false, count, collapsed = false }: { href: string; label: string; Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>; isSubItem?: boolean; count?: number; collapsed?: boolean }) {
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
          {count !== undefined && count > 0 && ` (${count})`}
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
        {count !== undefined && count > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#02665e]/10 text-[#02665e]">
            {count}
          </span>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-[#02665e] opacity-60 flex-shrink-0" aria-hidden />
    </Link>
  );
}

export default function OwnerSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const [propOpen, setPropOpen] = useState(true);
  const [bookOpen, setBookOpen] = useState(true);
  const [revenueOpen, setRevenueOpen] = useState(true);
  const [groupStaysOpen, setGroupStaysOpen] = useState(false);
  const [checkedInCount, setCheckedInCount] = useState<number>(0);
  const [checkoutDueCount, setCheckoutDueCount] = useState<number>(0);

  // Fetch checked-in bookings count
  useEffect(() => {
    let mounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const abortController = new AbortController();
    const url = "/api/owner/bookings/checked-in";
    const urlOut = "/api/owner/bookings/for-checkout";

    const normalizeArray = (raw: any) =>
      Array.isArray(raw)
        ? raw
        : (Array.isArray(raw?.data)
          ? raw.data
          : (Array.isArray(raw?.items)
            ? raw.items
            : []));

    const fetchCheckedInCount = async () => {
      if (!mounted) return;
      
      try {
        const response = await api.get<unknown>(url, {
          signal: abortController.signal,
          timeout: 10000, // 10 second timeout
        });
        if (!mounted) return;

        const raw: any = (response as any).data;
        // Normalize response: ensure it's always an array
        const normalized = normalizeArray(raw);
        
        setCheckedInCount(normalized.length);
      } catch (err: any) {
        if (!mounted) return;
        
        // Ignore aborted requests (expected when component unmounts)
        if (err.code === 'ECONNABORTED' || err.name === 'AbortError' || err.message === 'Request aborted') {
          return; // Silently ignore - component is unmounting
        }
        
        console.warn('Failed to load checked-in count', err);
        setCheckedInCount(0);
      }
    };

    const fetchCheckoutDueCount = async () => {
      if (!mounted) return;
      
      try {
        const response = await api.get<unknown>(urlOut, {
          signal: abortController.signal,
          timeout: 10000, // 10 second timeout
        });
        if (!mounted) return;
        
        const raw: any = (response as any).data;
        const normalized = normalizeArray(raw);
        setCheckoutDueCount(normalized.length);
      } catch (err: any) {
        if (!mounted) return;
        
        // Ignore aborted requests (expected when component unmounts)
        if (err.code === 'ECONNABORTED' || err.name === 'AbortError' || err.message === 'Request aborted') {
          return; // Silently ignore - component is unmounting
        }
        
        console.warn('Failed to load checked-out count', err);
        setCheckoutDueCount(0);
      }
    };

    // Fetch immediately
    fetchCheckedInCount();
    fetchCheckoutDueCount();

    // Refresh every 30 seconds to keep count updated
    intervalId = setInterval(() => {
      if (mounted) {
        fetchCheckedInCount();
        fetchCheckoutDueCount();
      }
    }, 30000);

    // Also refresh immediately after a successful validation/check-in (no wait for polling)
    const onCheckedInChanged = () => {
      if (mounted) {
        fetchCheckedInCount();
        fetchCheckoutDueCount();
      }
    };
    window.addEventListener("nols:checkedin-changed", onCheckedInChanged);

    const onCheckoutChanged = () => {
      if (mounted) {
        fetchCheckoutDueCount();
      }
    };
    window.addEventListener("nols:checkout-changed", onCheckoutChanged);

    return () => {
      mounted = false;
      abortController.abort(); // Cancel all pending requests
      window.removeEventListener("nols:checkedin-changed", onCheckedInChanged);
      window.removeEventListener("nols:checkout-changed", onCheckoutChanged);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Collapsible section button component
  const CollapsibleButton = ({ 
    label, 
    Icon, 
    isOpen, 
    onClick, 
    collapsed 
  }: { 
    label: string; 
    Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>; 
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
          {Icon ? (
            <Icon className="h-5 w-5 text-[#02665e] flex-shrink-0" aria-hidden />
          ) : null}
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
        {/* Dashboard */}
        <Item href="/owner" label="Dashboard" Icon={LayoutDashboard} collapsed={collapsed} />

        {/* My Properties */}
        {collapsed ? (
          <Item href="/owner/properties/approved" label="My Properties" Icon={FileText} collapsed={collapsed} />
        ) : (
          <div>
            <CollapsibleButton 
              label="My Properties" 
              Icon={FileText}
              isOpen={propOpen} 
              onClick={() => setPropOpen(v => !v)}
              collapsed={collapsed}
            />
            {propOpen && (
              <div className="mt-2 space-y-2">
                <Item href="/owner/properties/approved" label="Approved" Icon={FileText} isSubItem collapsed={collapsed} />
                <Item href="/owner/properties/pending" label="Pending" Icon={FileText} isSubItem collapsed={collapsed} />
                <Item href="/owner/properties/availability" label="Room Availability" Icon={CalendarDays} isSubItem collapsed={collapsed} />
                <Item href="/owner/properties/add" label="Add New" Icon={PlusSquare} isSubItem collapsed={collapsed} />
              </div>
            )}
          </div>
        )}

        {/* Bookings */}
        {collapsed ? (
          <Item href="/owner/bookings" label="Bookings" Icon={Calendar} collapsed={collapsed} />
        ) : (
          <div>
            <CollapsibleButton 
              label="Bookings" 
              Icon={Calendar}
              isOpen={bookOpen} 
              onClick={() => setBookOpen(v => !v)}
              collapsed={collapsed}
            />
            {bookOpen && (
              <div className="mt-2 space-y-2">
                <Item href="/owner/bookings/validate" label="Check-in" Icon={Calendar} isSubItem collapsed={collapsed} />
                <Item href="/owner/bookings/checked-in" label="Checked-In" Icon={Calendar} isSubItem count={checkedInCount} collapsed={collapsed} />
                <Item href="/owner/bookings/check-out" label="Check-out" Icon={Calendar} isSubItem count={checkoutDueCount} collapsed={collapsed} />
                <Item href="/owner/bookings/checked-out" label="Checked-Out" Icon={CheckCircle2} isSubItem collapsed={collapsed} />
              </div>
            )}
          </div>
        )}

        {/* Group Stays section */}
        {collapsed ? (
          <Item href="/owner/group-stays" label="Group Stays" Icon={Users} collapsed={collapsed} />
        ) : (
          <div>
            <CollapsibleButton 
              label="Group Stays" 
              Icon={Users}
              isOpen={groupStaysOpen} 
              onClick={() => setGroupStaysOpen(v => !v)}
              collapsed={collapsed}
            />
            {groupStaysOpen && (
              <div className="mt-2 space-y-2">
                <Item href="/owner/group-stays" label="Assigned to Me" Icon={Users} isSubItem collapsed={collapsed} />
                <Item href="/owner/group-stays/claims" label="Available to Claim" Icon={HandHeart} isSubItem collapsed={collapsed} />
                <Item href="/owner/group-stays/claims/my-claims" label="My Claims" Icon={FileText} isSubItem collapsed={collapsed} />
              </div>
            )}
          </div>
        )}

        {/* Revenue section */}
        {collapsed ? (
          <Item href="/owner/revenue/requested" label="My Revenue" Icon={Wallet} collapsed={collapsed} />
        ) : (
          <div>
            <CollapsibleButton 
              label="My Revenue" 
              Icon={Wallet}
              isOpen={revenueOpen} 
              onClick={() => setRevenueOpen(v => !v)}
              collapsed={collapsed}
            />
            {revenueOpen && (
              <div className="mt-2 space-y-2">
                <Item href="/owner/revenue/requested" label="Requested" Icon={Wallet} isSubItem collapsed={collapsed} />
                <Item href="/owner/revenue/paid" label="Paid Invoices" Icon={Wallet} isSubItem collapsed={collapsed} />
                <Item href="/owner/revenue/rejected" label="Rejected" Icon={Wallet} isSubItem collapsed={collapsed} />
                <Item href="/owner/reports/overview" label="Reports" Icon={FileText} isSubItem collapsed={collapsed} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

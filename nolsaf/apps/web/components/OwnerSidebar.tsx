"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import axios from "axios";
import { Calendar, Wallet, FileText, PlusSquare, LayoutDashboard, ChevronDown, ChevronRight } from 'lucide-react';

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

function Item({ href, label, Icon, isSubItem = false, count }: { href: string; label: string; Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>; isSubItem?: boolean; count?: number }) {
  const path = usePathname();
  const active = path === href || path?.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`no-underline flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 bg-white border border-transparent
        ${active ? "text-[#02665e] border-[#02665e]/20" : "text-[#02665e] hover:bg-gray-50"}
        ${isSubItem ? "ml-4" : ""}`}
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

export default function OwnerSidebar() {
  const [propOpen, setPropOpen] = useState(true);
  const [bookOpen, setBookOpen] = useState(true);
  const [revenueOpen, setRevenueOpen] = useState(true);
  const [checkedInCount, setCheckedInCount] = useState<number>(0);
  const [checkoutDueCount, setCheckoutDueCount] = useState<number>(0);

  // Fetch checked-in bookings count
  useEffect(() => {
    let mounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OwnerSidebar.tsx:fetchCheckedInCount',message:'fetch checked-in count (start)',data:{url},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'SIDEBAR_URL'})}).catch(()=>{});
      // #endregion
      try {
        const response = await api.get<unknown>(url);
        if (!mounted) return;

        const raw: any = (response as any).data;
        // Normalize response: ensure it's always an array
        const normalized = normalizeArray(raw);
        
        setCheckedInCount(normalized.length);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OwnerSidebar.tsx:fetchCheckedInCount',message:'fetch checked-in count (done)',data:{status:(response as any).status,contentType:String(((response as any).headers as any)?.['content-type']??''),rawIsArray:Array.isArray(raw),normalizedLen:normalized.length,rawType:typeof raw},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'SIDEBAR_RESPONSE'})}).catch(()=>{});
        // #endregion
      } catch (err: any) {
        if (!mounted) return;
        console.warn('Failed to load checked-in count', err);
        setCheckedInCount(0);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OwnerSidebar.tsx:fetchCheckedInCount',message:'fetch checked-in count (error)',data:{url,error:String(err?.message??err)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'SIDEBAR_ERROR'})}).catch(()=>{});
        // #endregion
      }
    };

    const fetchCheckoutDueCount = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OwnerSidebar.tsx:fetchCheckoutDueCount',message:'fetch checkout-due count (start)',data:{url:urlOut},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'SIDEBAR_CHKOUT_URL'})}).catch(()=>{});
      // #endregion
      try {
        const response = await api.get<unknown>(urlOut);
        if (!mounted) return;
        const raw: any = (response as any).data;
        const normalized = normalizeArray(raw);
        setCheckoutDueCount(normalized.length);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OwnerSidebar.tsx:fetchCheckoutDueCount',message:'fetch checkout-due count (done)',data:{status:(response as any).status,contentType:String(((response as any).headers as any)?.['content-type']??''),rawIsArray:Array.isArray(raw),normalizedLen:normalized.length,rawType:typeof raw},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'SIDEBAR_CHKOUT_RESPONSE'})}).catch(()=>{});
        // #endregion
      } catch (err: any) {
        if (!mounted) return;
        console.warn('Failed to load checked-out count', err);
        setCheckoutDueCount(0);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OwnerSidebar.tsx:fetchCheckoutDueCount',message:'fetch checkout-due count (error)',data:{url:urlOut,error:String(err?.message??err)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'SIDEBAR_CHKOUT_ERROR'})}).catch(()=>{});
        // #endregion
      }
    };

    // Fetch immediately
    fetchCheckedInCount();
    fetchCheckoutDueCount();

    // Refresh every 30 seconds to keep count updated
    intervalId = setInterval(() => { fetchCheckedInCount(); fetchCheckoutDueCount(); }, 30000);

    // Also refresh immediately after a successful validation/check-in (no wait for polling)
    const onCheckedInChanged = () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OwnerSidebar.tsx:onCheckedInChanged',message:'checked-in event received',data:{event:'nols:checkedin-changed'},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'SIDEBAR_EVENT'})}).catch(()=>{});
      // #endregion
      fetchCheckedInCount();
      fetchCheckoutDueCount();
    };
    window.addEventListener("nols:checkedin-changed", onCheckedInChanged);

    const onCheckoutChanged = () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OwnerSidebar.tsx:onCheckoutChanged',message:'checkout event received',data:{event:'nols:checkout-changed'},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'SIDEBAR_EVENT2'})}).catch(()=>{});
      // #endregion
      fetchCheckoutDueCount();
    };
    window.addEventListener("nols:checkout-changed", onCheckoutChanged);

    return () => {
      mounted = false;
      window.removeEventListener("nols:checkedin-changed", onCheckedInChanged);
      window.removeEventListener("nols:checkout-changed", onCheckoutChanged);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

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
                <Item href="/owner/bookings/validate" label="Check-in" Icon={Calendar} isSubItem />
                <Item href="/owner/bookings/checked-in" label="Checked-In" Icon={Calendar} isSubItem count={checkedInCount} />
                <Item href="/owner/bookings/check-out" label="Check-out" Icon={Calendar} isSubItem count={checkoutDueCount} />
              </div>
            )}
          </div>

          {/* Revenue section (independent) */}
          <div>
            <button 
              onClick={() => setRevenueOpen(v => !v)} 
              className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-[#02665e] bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200"
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

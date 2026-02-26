"use client";
import AdminPageHeader from "@/components/AdminPageHeader";
import Link from "next/link";
import { AlertTriangle, Bell, CheckCheck, FileCheck2, FileBadge, LayoutDashboard, Building2, RefreshCw, ShieldCheck, Users, BarChart3, LineChart, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import GeneralReports from '@/components/GeneralReports';
  // Read-only widget limits (used by loaders). Persisted UI control was removed in favor of header-level prefs.
  const limits = (() => {
    if (typeof window === 'undefined') return { approvals: 6, invoices: 5, bookings: 6 };
    try { 
      const raw = localStorage.getItem('admin.widgetLimits');
      if (!raw || raw === '') return { approvals: 6, invoices: 5, bookings: 6 };
      return JSON.parse(raw) || { approvals: 6, invoices: 5, bookings: 6 }; 
    } catch { 
      return { approvals: 6, invoices: 5, bookings: 6 }; 
    }
  })();
// Use relative paths in browser to leverage Next.js rewrites (avoids CORS issues)
// Only use absolute URL for server-side or when explicitly needed
const API = '';

// Send a lightweight analytics event to the API (non-blocking)
async function sendAnalytics(eventName: string, payload: any = {}) {
  try {
    // fire-and-forget; don't await in callers unless necessary
    void fetch(`${API}/admin/analytics/event`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: eventName, payload }),
    });
  } catch {
    // swallow errors to avoid interfering with UX
  }
}

function QLink({ href, label, Icon, color = '' }: { href: string; label: string; Icon: any; color?: string }) {
  // color is a tailwind bg class (e.g. 'bg-emerald-600') or custom style
  const base = `qlink w-full h-16 flex items-center justify-center gap-3 text-white ${color}`;
  return (
    <div className="qlink-wrapper w-full h-full relative">
      <Link href={href} className={base}>
        <Icon className="h-5 w-5" />
        <span className="ml-2 font-medium truncate">{label}</span>
      </Link>
      {/* Interactive popup: outside the anchor so pointer events don't trigger navigation */}
      <div className="qlink-popup hidden absolute left-1/2 -translate-x-1/2 -top-2 transform -translate-y-full mt-1 w-auto max-w-xs rounded-md bg-white text-gray-900 text-sm p-2 shadow-lg">
        <div tabIndex={0} className="outline-none">{label}</div>
      </div>
    </div>
  );
}

export default function AdminHome() {
  // simple date ranges for KPIs (Today/7d/30d)
  type Range = "today" | "7d" | "30d";
  const [range] = useState<Range>(() => {
    if (typeof window === "undefined") return "7d";
    return (localStorage.getItem("admin.range") as Range) || "7d";
  });
  const { from, to } = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);
    if (range === "today") {
      start.setHours(0,0,0,0);
    } else if (range === "7d") {
      start.setDate(start.getDate() - 6);
      start.setHours(0,0,0,0);
    } else {
      start.setDate(start.getDate() - 29);
      start.setHours(0,0,0,0);
    }
    return { from: start.toISOString(), to: end.toISOString() };
  }, [range]);

  // Chart-specific range (only affects the Compact overview chart)
  // Compact overview removed — replaced by GeneralReports component

  // KPI and widget state
  const [overview, setOverview] = useState<any>(null);
  const [loadingKpis, setLoadingKpis] = useState<boolean>(true);
  // Properties (Approvals widget)
  const [propNew, setPropNew] = useState<any>({ items: [], total: 0 }); // NEW = PENDING (submitted, not yet handled)
  const [propPending, setPropPending] = useState<any>({ items: [], total: 0 }); // PENDING bucket = SUSPENDED
  const [propApproved, setPropApproved] = useState<any>({ items: [] }); // APPROVED
  const [propRejected, setPropRejected] = useState<any>({ items: [] }); // REJECTED
  const [loadingApprovals, setLoadingApprovals] = useState<boolean>(true);
  const [invNew, setInvNew] = useState<any>({ items: [] });
  const [invApproved, setInvApproved] = useState<any>({ items: [] });
  const [invPaid, setInvPaid] = useState<any>({ items: [] });
  const [invRejected, setInvRejected] = useState<any>({ items: [] });
  const [loadingInv, setLoadingInv] = useState<boolean>(true);
  // Validation lookup state — booking code check-in validation
  const [validationCode, setValidationCode] = useState<string>("");
  const [validationResult, setValidationResult] = useState<any>(null);
  const [loadingValidation, setLoadingValidation] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [vConfirming, setVConfirming] = useState(false);
  const [vSuccess, setVSuccess] = useState<{ bookingId: number; ownerName: string } | null>(null);
  const [vConfirmError, setVConfirmError] = useState<string | null>(null);
  const validationRef = useRef<HTMLDivElement | null>(null);

  // Auto-lookup when validationCode changes (debounced) — calls booking code validate API
  useEffect(() => {
    if (!validationCode || !validationCode.trim()) {
      setValidationResult(null); setValidationError(null); setVSuccess(null);
      return;
    }
    const t = setTimeout(async () => {
      setLoadingValidation(true); setValidationError(null); setValidationResult(null);
      setVSuccess(null); setVConfirmError(null);
      try {
        const res = await fetch(`${API}/api/admin/help-owners/validate`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: validationCode.trim() }),
        });
        const json = await res.json();
        if (!res.ok) { setValidationError(json?.error ?? "Code not found or invalid."); }
        else { setValidationResult(json.details ?? null); setValidationModalOpen(true); }
      } catch { setValidationError("Network error — could not reach server."); }
      finally { setLoadingValidation(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [validationCode]);

  async function vConfirmCheckin() {
    if (!validationResult?.bookingId) return;
    setVConfirming(true); setVConfirmError(null);
    try {
      const res = await fetch(`${API}/api/admin/help-owners/confirm-checkin`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: validationResult.bookingId }),
      });
      const json = await res.json();
      if (!res.ok) { setVConfirmError(json?.error ?? "Confirmation failed."); }
      else {
        setVSuccess({ bookingId: validationResult.bookingId, ownerName: validationResult.property?.owner?.name ?? "Owner" });
        setValidationResult(null);
        sendAnalytics('admin.booking.checkin_confirmed', { bookingId: validationResult.bookingId });
      }
    } catch { setVConfirmError("Network error during confirmation."); }
    finally { setVConfirming(false); }
  }

  function vCloseModal() {
    setValidationModalOpen(false);
    setValidationCode("");
    setValidationResult(null);
    setValidationError(null);
    setVSuccess(null);
    setVConfirmError(null);
  }

  // totalInvoicesCount removed (not displayed in header anymore)
  
  // Global search removed (not used in current build)
  // confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<{ action: 'verify' | 'validate'; invId?: number | string } | null>(null);
  // property filter state (Approvals widget)
  const [propertyFilter, setPropertyFilter] = useState<'new' | 'pending' | 'approved' | 'rejected'>('pending');
  // invoice filter state (clickable cards) — only status-specific filters (no 'all')
  const [invoiceFilter, setInvoiceFilter] = useState<'new' | 'approved' | 'paid' | 'rejected'>('new');

  function openSection(status: 'new' | 'approved' | 'paid' | 'rejected') {
    setInvoiceFilter(status);
  }

  const loadApprovals = useCallback(async () => {
    setLoadingApprovals(true);
    try {
      const pageSize = Number(limits.approvals) || 6;
      const urls = {
        new: `${API}/api/admin/properties?status=PENDING&page=1&pageSize=${pageSize}`,
        pending: `${API}/api/admin/properties?status=SUSPENDED&page=1&pageSize=${pageSize}`,
        approved: `${API}/api/admin/properties?status=APPROVED&page=1&pageSize=${pageSize}`,
        rejected: `${API}/api/admin/properties?status=REJECTED&page=1&pageSize=${pageSize}`,
      } as const;

      const [rNew, rPending, rApproved, rRejected] = await Promise.all([
        fetch(urls.new, { credentials: "include" }),
        fetch(urls.pending, { credentials: "include" }),
        fetch(urls.approved, { credentials: "include" }),
        fetch(urls.rejected, { credentials: "include" }),
      ]);

      const jDraft = await rNew.json(); // actually PENDING (NEW)
      const jPending = await rPending.json();
      const jApproved = await rApproved.json();
      const jRejected = await rRejected.json();

      setPropNew(jDraft ?? { items: [], total: 0 });
      setPropPending(jPending ?? { items: [], total: 0 });
      setPropApproved(jApproved ?? { items: [], total: 0 });
      setPropRejected(jRejected ?? { items: [], total: 0 });
    } catch (e: any) {
      setPropNew({ items: [], total: 0 });
      setPropPending({ items: [], total: 0 });
      setPropApproved({ items: [] });
      setPropRejected({ items: [] });
    } finally {
      setLoadingApprovals(false);
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    setLoadingInv(true);
    try {
      // Fetch REQUESTED and VERIFIED and merge as 'New'
      const [rRequested, rVerified, rApproved, rPaid, rRejected] = await Promise.all([
        fetch(`${API}/admin/revenue/invoices?status=REQUESTED&page=1&pageSize=${Number(limits.invoices) || 5}`, { credentials: "include" }),
        fetch(`${API}/admin/revenue/invoices?status=VERIFIED&page=1&pageSize=${Number(limits.invoices) || 5}`, { credentials: "include" }),
        fetch(`${API}/admin/revenue/invoices?status=APPROVED&page=1&pageSize=${Number(limits.invoices) || 5}`, { credentials: "include" }),
        fetch(`${API}/admin/revenue/invoices?status=PAID&page=1&pageSize=${Number(limits.invoices) || 5}`, { credentials: "include" }),
        fetch(`${API}/admin/revenue/invoices?status=REJECTED&page=1&pageSize=${Number(limits.invoices) || 5}`, { credentials: "include" }),
      ]);
      const jRequested = await rRequested.json();
      const jVerified = await rVerified.json();
      const jApproved = await rApproved.json();
      const jPaid = await rPaid.json();
      const jRejected = await rRejected.json();
      // merge requested + verified into the New bucket
      const newItems = [ ...(jRequested?.items || []), ...(jVerified?.items || []) ];
      setInvNew({ items: newItems });
      setInvApproved(jApproved ?? { items: [] });
      setInvPaid(jPaid ?? { items: [] });
      setInvRejected(jRejected ?? { items: [] });
    } catch {
      setInvNew({ items: [] });
      setInvApproved({ items: [] });
      setInvPaid({ items: [] });
      setInvRejected({ items: [] });
    } finally {
      setLoadingInv(false);
    }
  }, []);

  const loadKpis = useCallback(async () => {
    setLoadingKpis(true);
    try {
      const res = await fetch(
        `${API}/admin/stats/overview?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { credentials: "include" }
      );
      const json = await res.json();
      setOverview(json);
    } catch {
      setOverview(null);
    } finally {
      setLoadingKpis(false);
    }
  }, [from, to]);

  

  useEffect(() => { loadKpis(); }, [loadKpis]);
  useEffect(() => { loadApprovals(); loadInvoices(); }, [loadApprovals, loadInvoices]);

  // export helpers removed for compact overview

  // Refresh KPIs and invoices when payments land
  useEffect(() => {
    // For WebSocket connections, we need to connect directly to the API server
    // because Next.js rewrites don't support WebSocket upgrades
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || 
                process.env.NEXT_PUBLIC_API_URL || 
                (typeof window !== 'undefined' ? "http://localhost:4000" : "");
    
    if (!url) {
      console.warn("Socket.IO: No API URL configured, skipping connection");
      return;
    }
    
    const s: Socket = io(url, {
      transports: ['websocket', 'polling'],
      withCredentials: true, // Send cookies automatically
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    
    s.on('connect', () => {
      console.debug('[Socket.IO] Connected to admin room');
      // Join admin room after connection
      s.emit('join-admin-room', (response: any) => {
        if (response?.error) {
          console.warn('[Socket.IO] Failed to join admin room:', response.error);
        } else {
          console.debug('[Socket.IO] Joined admin room');
        }
      });
    });
    
    s.on('connect_error', (error: Error) => {
      console.warn('[Socket.IO] Connection error:', error.message);
    });
    
    s.on('disconnect', (reason: string) => {
      console.log('[Socket.IO] Disconnected:', reason);
    });
    
    const onPaid = () => { loadKpis(); loadInvoices(); };
    s.on("admin:invoice:paid", onPaid);
    
    return () => { 
      s.off("admin:invoice:paid", onPaid);
      s.emit('leave-admin-room', () => {});
      s.disconnect();
    };
  }, [loadKpis, loadInvoices]);

  // Persist selected date range and widget limits
  useEffect(() => { try { localStorage.setItem("admin.range", range); } catch {} }, [range]);
  // compact chartRange persistence removed
  // limits is read-only here; persisted elsewhere if needed

  // Global search removed


  // small confirm modal component (accessible)
  function ConfirmModal({ open, title, onConfirm, onCancel }: { open: boolean; title: string; onConfirm: ()=>void; onCancel: ()=>void; }) {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
        <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
        <div role="dialog" aria-modal="true" aria-label={title} className="bg-white rounded-lg p-4 z-10 w-full max-w-md shadow-lg">
          <div className="font-medium mb-2">{title}</div>
          <div className="flex justify-end gap-2">
            <button onClick={onCancel} className="px-3 py-1 rounded bg-gray-100">Cancel</button>
            <button autoFocus onClick={onConfirm} className="px-3 py-1 rounded bg-brand text-white">Confirm</button>
          </div>
        </div>
      </div>
    );
  }

  async function handleConfirm() {
    if (!confirmPayload) return;
    const { action, invId } = confirmPayload;
    setConfirmOpen(false);
    try {
      if (action === 'verify') {
        await fetch(`${API}/admin/revenue/invoices/${invId}/verify`, { method: 'POST', credentials: "include", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: 'Verified from dashboard' }) });
      } else if (action === 'validate') {
        await fetch(`${API}/admin/revenue/invoices/${invId}/verify`, { method: 'POST', credentials: "include", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: 'Validated from dashboard' }) });
      }
    } catch {
      // ignore
    } finally {
      loadInvoices();
      loadKpis();
      setConfirmPayload(null);
    }
  }

  // search helpers removed

  

  return (
    <div className="space-y-6">
      <ConfirmModal open={confirmOpen} title={confirmPayload?.action === 'validate' ? 'Confirm validation' : 'Confirm verification'} onConfirm={handleConfirm} onCancel={() => { setConfirmOpen(false); setConfirmPayload(null); }} />
      <AdminPageHeader
        title="Owners Control Dashboard"
        icon={<LayoutDashboard className="h-8 w-8" />}
        actions={<div className="flex items-center gap-2"><div className="text-sm text-gray-600"> </div></div>} />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingKpis ? (
          Array.from({ length: 4 }).map((_,i) => (
            <div key={i} className="skeleton-card" />
          ))
        ) : (
          <>
            <StatCard label="No. Owners" value={String(overview?.ownerCount ?? overview?.owners ?? 0)} rail="rail-brand" />
            <StatCard label="No. Properties" value={String(overview?.propertyCount ?? overview?.properties ?? 0)} rail="rail-success" />
            <StatCard label="Net Payable" value={fmt(overview?.netPayable ?? 0)} rail="rail-danger" />
            <StatCard label="NoLSAF Revenue" value={fmt(overview?.nolsRevenue ?? overview?.revenue ?? 0)} rail="rail-info" />
          </>
        )}
      </div>

      {/* Compact invoice status controls: moved into the Invoices section header below; removed large summary cards */}

      {/* Needs attention + Quick links (3-column grid; needs attention spans 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Needs attention */}
        <div className="lg:col-span-2 card">
          <div className="card-section">
            {/* Three columns inside: Approvals, Invoices, Bookings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 divide-y-2 divide-brand md:divide-y-0 md:divide-x md:divide-gray-200">
              {/* Approvals */}
              <div className="md:pr-4 md:border-r-2 md:border-gray-300">
                <div className="flex items-center mb-2">
                  <div className="flex items-center gap-2 font-medium text-gray-800">
                    <FileBadge className="h-4 w-4" /> Approvals
                  </div>
                </div>
                <div className="flex">
                  {/* Vertical status controls, confined to the approvals box */}
                  <div className="w-28 pr-3 hidden md:flex flex-col items-start gap-3 border-r border-gray-100">
                    <div className="pt-0.5" />
                    <div className="flex flex-col items-start gap-2 mt-1">
                      <button
                        onClick={() => setPropertyFilter('new')}
                        className={`w-full px-2 py-1 rounded text-xs flex items-center justify-between ${propertyFilter==='new' ? 'bg-gray-100 text-gray-800' : 'hover:bg-gray-50'}`}
                      >
                        <span className="truncate">New</span>
                        <span className="ml-2 text-[11px] text-gray-500">{propNew?.total ?? (propNew?.items?.length ?? 0)}</span>
                      </button>
                      <button
                        onClick={() => setPropertyFilter('pending')}
                        className={`w-full px-2 py-1 rounded text-xs flex items-center justify-between ${propertyFilter==='pending' ? 'bg-yellow-100 text-yellow-800' : 'hover:bg-gray-50'}`}
                      >
                        <span className="truncate">Pending</span>
                        <span className="ml-2 text-[11px] text-gray-500">{propPending?.total ?? (propPending?.items?.length ?? 0)}</span>
                      </button>
                      <button
                        onClick={() => setPropertyFilter('approved')}
                        className={`w-full px-2 py-1 rounded text-xs flex items-center justify-between ${propertyFilter==='approved' ? 'bg-green-100 text-green-800' : 'hover:bg-gray-50'}`}
                      >
                        <span className="truncate">Approved</span>
                        <span className="ml-2 text-[11px] text-gray-500">{propApproved?.total ?? (propApproved?.items?.length ?? 0)}</span>
                      </button>
                      <button
                        onClick={() => setPropertyFilter('rejected')}
                        className={`w-full px-2 py-1 rounded text-xs flex items-center justify-between ${propertyFilter==='rejected' ? 'bg-red-100 text-red-800' : 'hover:bg-gray-50'}`}
                      >
                        <span className="truncate">Rejected</span>
                        <span className="ml-2 text-[11px] text-gray-500">{propRejected?.total ?? (propRejected?.items?.length ?? 0)}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 pl-3">
                    <div className="mb-3" />
                    {loadingApprovals ? (
                      <div className="space-y-2">{Array.from({ length: 4 }).map((_,i) => <div key={i} className="skeleton h-8" />)}</div>
                    ) : (
                      <div className="min-w-0" />
                    )}
                  </div>
                </div>
              </div>

              {/* Invoices grouped by status */}
              <div className="md:px-4">
                <div className="flex items-center mb-2">
                  <div className="flex items-center gap-2 font-medium text-gray-800">
                    <FileCheck2 className="h-4 w-4" /> Invoices
                  </div>
                </div>
                <div className="flex">
                  {/* Vertical status controls, confined to the invoices box */}
                  <div className="w-28 pr-3 hidden md:flex flex-col items-start gap-3 border-r border-gray-100">
                    <div className="pt-0.5" />
                    <div className="flex flex-col items-start gap-2 mt-1">
                      <button onClick={() => openSection('new')} className={`w-full px-2 py-1 rounded text-xs flex items-center justify-between ${invoiceFilter==='new' ? 'bg-yellow-100 text-yellow-800' : 'hover:bg-gray-50'}`}>
                        <span className="truncate">New</span>
                        <span className="ml-2 text-[11px] text-gray-500">{invNew?.items?.length ?? 0}</span>
                      </button>
                      <button onClick={() => openSection('approved')} className={`w-full px-2 py-1 rounded text-xs flex items-center justify-between ${invoiceFilter==='approved' ? 'bg-green-100 text-green-800' : 'hover:bg-gray-50'}`}>
                        <span className="truncate">Approved</span>
                        <span className="ml-2 text-[11px] text-gray-500">{invApproved?.items?.length ?? 0}</span>
                      </button>
                      <button onClick={() => openSection('paid')} className={`w-full px-2 py-1 rounded text-xs flex items-center justify-between ${invoiceFilter==='paid' ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-50'}`}>
                        <span className="truncate">Paid</span>
                        <span className="ml-2 text-[11px] text-gray-500">{invPaid?.items?.length ?? 0}</span>
                      </button>
                      <button onClick={() => openSection('rejected')} className={`w-full px-2 py-1 rounded text-xs flex items-center justify-between ${invoiceFilter==='rejected' ? 'bg-red-100 text-red-800' : 'hover:bg-gray-50'}`}>
                        <span className="truncate">Rejected</span>
                        <span className="ml-2 text-[11px] text-gray-500">{invRejected?.items?.length ?? 0}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 pl-3">
                    {/* Validation input is shown in its own column below; placeholder here remains empty */}
                    <div className="mb-3" />
                    {/* header left intentionally empty; icon+label shown to the left to avoid duplication */}

                    {loadingInv ? (
                      <div className="space-y-2">{Array.from({ length: 4 }).map((_,i) => <div key={i} className="skeleton h-8" />)}</div>
                    ) : (
                      <div className="min-w-0" />
                    )}
                  </div>
                </div>
              </div>

              {/* Validation column */}
              {/* Third column */}
              <div className="md:pl-4 md:border-l-2 md:border-gray-200">
                <div className="flex items-center mb-3">
                  <div className="flex items-center gap-2 font-semibold text-gray-800">
                    <FileCheck2 className="h-5 w-5 text-blue-600" /> Validation
                  </div>
                </div>
                <div ref={validationRef} className="min-w-0 space-y-3 overflow-hidden">
                  {/* Input field */}
                  <div className="flex justify-center w-full">
                    <input
                      value={validationCode}
                      onChange={(e) => setValidationCode(e.target.value)}
                      placeholder="Paste validation code"
                      className="w-full max-w-xs px-4 py-2.5 text-sm font-mono tracking-wider border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 placeholder:text-gray-400 bg-white text-center"
                      aria-label="Validation code"
                    />
                  </div>

                  {/* Loading state */}
                  {loadingValidation && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="flex gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" />
                      </div>
                      <span>Checking code…</span>
                    </div>
                  )}

                  {/* Error inline */}
                  {validationError && !loadingValidation && (
                    <div className="w-full rounded-lg bg-red-50 border border-red-200 p-3 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <p className="text-sm text-red-700">{validationError}</p>
                      </div>
                    </div>
                  )}

                  {/* Preview found — prompt to open popup */}
                  {validationResult && !loadingValidation && !validationModalOpen && (
                    <button
                      type="button"
                      onClick={() => setValidationModalOpen(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow transition-all active:scale-95"
                    >
                      <ShieldCheck className="h-4 w-4" /> View &amp; Confirm
                    </button>
                  )}
                </div>
              </div>

              {/* ── Booking Validation Popup Modal ── */}
              {validationModalOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Booking Validation"
                  onClick={(e) => { if (e.target === e.currentTarget) vCloseModal(); }}
                >
                  <div
                    className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
                    style={{ background: "linear-gradient(160deg, #0e1a3a 0%, #0a2a38 45%, #012820 100%)" }}
                  >
                    {/* Modal header */}
                    <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-2xl border border-sky-400/30 bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                          <ShieldCheck className="h-4.5 w-4.5 text-sky-300" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">Booking Validation</div>
                          <div className="text-xs text-slate-400">Review details before confirming check-in</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={vCloseModal}
                        className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
                        aria-label="Close"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>

                    <div className="px-6 pt-5 pb-6 space-y-4">
                      {/* Success state */}
                      {vSuccess ? (
                        <div className="space-y-4">
                          <div className="flex flex-col items-center gap-3 py-4 text-center">
                            <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                              <CheckCheck className="h-7 w-7 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-base font-bold text-emerald-300">Check-in Confirmed!</p>
                              <p className="text-sm text-slate-400 mt-1">
                                Booking <span className="font-mono text-white">#{vSuccess.bookingId}</span> validated for{" "}
                                <span className="font-semibold text-white">{vSuccess.ownerName}</span>.
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-emerald-300/80 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
                              <Bell className="h-3.5 w-3.5" /> Owner notification dispatched
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={vCloseModal}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-white/15 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition"
                          >
                            <RefreshCw className="h-4 w-4" /> New validation
                          </button>
                        </div>
                      ) : validationResult ? (
                        <>
                          {/* Property + booking summary */}
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="min-w-0">
                                <div className="text-xs text-sky-400 font-semibold uppercase tracking-wider">Property</div>
                                <div className="text-base font-extrabold text-white truncate mt-0.5">{validationResult.property?.title ?? "—"}</div>
                                <div className="text-xs text-slate-400">{validationResult.property?.type ?? ""}</div>
                              </div>
                              <span className="flex-shrink-0 inline-flex items-center rounded-xl border border-emerald-500/25 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                                {validationResult.booking?.status ?? "ACTIVE"}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-lg border border-white/8 bg-white/5 px-3 py-2">
                                <div className="text-slate-500 uppercase tracking-wider text-[10px] mb-0.5">Check-in</div>
                                <div className="font-semibold text-white">{validationResult.booking?.checkIn ? new Date(validationResult.booking.checkIn).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—"}</div>
                              </div>
                              <div className="rounded-lg border border-white/8 bg-white/5 px-3 py-2">
                                <div className="text-slate-500 uppercase tracking-wider text-[10px] mb-0.5">Check-out</div>
                                <div className="font-semibold text-white">{validationResult.booking?.checkOut ? new Date(validationResult.booking.checkOut).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—"}</div>
                              </div>
                              <div className="rounded-lg border border-white/8 bg-white/5 px-3 py-2">
                                <div className="text-slate-500 uppercase tracking-wider text-[10px] mb-0.5">Nights</div>
                                <div className="font-semibold text-white">{validationResult.booking?.nights ?? "—"}</div>
                              </div>
                              <div className="rounded-lg border border-white/8 bg-white/5 px-3 py-2">
                                <div className="text-slate-500 uppercase tracking-wider text-[10px] mb-0.5">Amount</div>
                                <div className="font-semibold text-white tabular-nums">{validationResult.booking?.currency ?? "TZS"} {Number(validationResult.booking?.totalAmount ?? 0).toLocaleString()}</div>
                              </div>
                            </div>
                          </div>

                          {/* Owner + Guest */}
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                              <div className="text-slate-500 uppercase tracking-wider text-[10px] mb-1">Owner</div>
                              <div className="font-semibold text-white truncate">{validationResult.property?.owner?.name ?? "—"}</div>
                              <div className="text-slate-400 truncate mt-0.5">{validationResult.property?.owner?.phone ?? validationResult.property?.owner?.email ?? ""}</div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                              <div className="text-slate-500 uppercase tracking-wider text-[10px] mb-1">Guest</div>
                              <div className="font-semibold text-white truncate">{validationResult.guest?.fullName ?? validationResult.customer?.name ?? "—"}</div>
                              <div className="text-slate-400 truncate mt-0.5">{validationResult.guest?.phone ?? validationResult.customer?.phone ?? ""}</div>
                            </div>
                          </div>

                          {/* Confirm error */}
                          {vConfirmError && (
                            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-red-300">{vConfirmError}</p>
                            </div>
                          )}

                          {/* Confirm button */}
                          <button
                            type="button"
                            onClick={vConfirmCheckin}
                            disabled={vConfirming}
                            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 font-bold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{ boxShadow: "0 0 40px -15px rgba(34,197,94,0.5)" }}
                          >
                            {vConfirming ? (
                              <><RefreshCw className="h-4 w-4 animate-spin" /> Confirming…</>
                            ) : (
                              <><ShieldCheck className="h-4 w-4" /> Confirm check-in for {validationResult.property?.owner?.name ?? "owner"}</>
                            )}
                          </button>
                          <p className="text-center text-[10px] text-slate-500">Owner will be notified immediately upon confirmation.</p>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="card">
          <div className="card-section">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 text-gray-800 font-medium">
                  <LayoutDashboard className="h-5 w-5 text-gray-700" />
                  <div>Quick links</div>
                </div>
                <div className="text-xs text-gray-500">Common admin tasks</div>
              </div>
            </div>
            {/* Equal-height grid for quick-links: two columns, two rows, matching tile heights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 auto-rows-fr">
              <div className="h-full">
                <QLink href="/admin/properties/previews" label="Manage Properties" Icon={Building2} color="bg-[#02665e]" />
              </div>
              <div className="h-full">
                <QLink href="/admin/owners" label="View Owners" Icon={Users} color="bg-sky-600" />
              </div>
              <div className="h-full">
                <QLink href="/admin" label="Analytics" Icon={BarChart3} color="bg-violet-600" />
              </div>
              <div className="h-full">
                <QLink href="/admin/revenue" label="Revenue" Icon={LineChart} color="bg-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact overview removed; replaced by GeneralReports below */}
      {/* General reports section (new) */}
      <GeneralReports />
    </div>
  );
}

function StatCard({ label, value, rail }: { label: string; value: string; rail: string }) {
  return (
    <div className={`stat-card ${rail}`}>
      <div className="stat-body">
        <div className="stat-top">
          <div className="stat-icon" />
          <div>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

/* ---------- Small helper components ---------- */
// Section component removed (search removed)

 

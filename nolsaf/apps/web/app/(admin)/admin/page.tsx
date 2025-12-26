"use client";
import AdminPageHeader from "@/components/AdminPageHeader";
import Link from "next/link";
import { LayoutDashboard, Building2, Users, BarChart3, LineChart, FileCheck2, FileBadge } from "lucide-react";
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
  const [approvals, setApprovals] = useState<any>({ items: [] });
  const [loadingApprovals, setLoadingApprovals] = useState<boolean>(true);
  const [invNew, setInvNew] = useState<any>({ items: [] });
  const [invApproved, setInvApproved] = useState<any>({ items: [] });
  const [invPaid, setInvPaid] = useState<any>({ items: [] });
  const [invRejected, setInvRejected] = useState<any>({ items: [] });
  const [loadingInv, setLoadingInv] = useState<boolean>(true);
  // Validation lookup state (retrieve invoice by special code)
  const [validationCode, setValidationCode] = useState<string>("");
  const [validationResult, setValidationResult] = useState<any>(null);
  const [loadingValidation, setLoadingValidation] = useState<boolean>(false);
  const validationRef = useRef<HTMLDivElement | null>(null);

  // click-outside: clear validation input/result when user clicks anywhere outside the validation box
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = validationRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) {
        setValidationCode('');
        setValidationResult(null);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Auto-lookup when validationCode changes (debounced)
  useEffect(() => {
    if (!validationCode || !validationCode.trim()) { setValidationResult(null); return; }
    const t = setTimeout(async () => {
      setLoadingValidation(true);
      try {
        const res = await fetch(`${API}/admin/revenue/invoices?code=${encodeURIComponent(validationCode)}&page=1&pageSize=1`, { credentials: "include" });
        const json = await res.json();
        setValidationResult((json?.items && json.items.length) ? json.items[0] : null);
      } catch {
        setValidationResult(null);
      } finally { setLoadingValidation(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [validationCode]);

  // totalInvoicesCount removed (not displayed in header anymore)
  
  // Global search removed (not used in current build)
  // confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<{ action: 'verify' | 'validate'; invId?: number | string } | null>(null);
  // invoice filter state (clickable cards) — only status-specific filters (no 'all')
  const [invoiceFilter, setInvoiceFilter] = useState<'new' | 'approved' | 'paid' | 'rejected'>('new');
  // refs for invoice sections so buttons can open/scroll to them
  const newRef = useRef<HTMLDivElement | null>(null);
  const approvedRef = useRef<HTMLDivElement | null>(null);
  const paidRef = useRef<HTMLDivElement | null>(null);
  const rejectedRef = useRef<HTMLDivElement | null>(null);

  function openSection(status: 'new' | 'approved' | 'paid' | 'rejected') {
    setInvoiceFilter(status);
    // small delay to ensure DOM updates if necessary, then scroll
    setTimeout(() => {
      const ref = status === 'new' ? newRef : status === 'approved' ? approvedRef : status === 'paid' ? paidRef : rejectedRef;
      try { ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {};
    }, 80);
  }

  const loadApprovals = useCallback(async () => {
    setLoadingApprovals(true);
    try {
      const res = await fetch(
        `${API}/admin/properties?status=PENDING&page=1&pageSize=${Number(limits.approvals) || 6}`,
        { credentials: "include" }
      );
      const json = await res.json();
      setApprovals(json ?? { items: [] });
    } catch {
      setApprovals({ items: [] });
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
    // Use direct API URL for Socket.IO in browser to ensure WebSocket works in dev
    const url = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000")
      : (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "");
    const s: Socket = io(url);
    const onPaid = () => { loadKpis(); loadInvoices(); };
    s.on("admin:invoice:paid", onPaid);
    return () => { s.off("admin:invoice:paid", onPaid); s.close(); };
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
        title="Admin Dashboard"
        icon={<LayoutDashboard className="h-8 w-8" />}
        actions={<div className="flex items-center gap-2"><div className="text-sm text-gray-600"> </div></div>} />

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingKpis ? (
          Array.from({ length: 4 }).map((_,i) => (
            <div key={i} className="skeleton-card" />
          ))
        ) : (
          <>
            <StatCard label="No. Owners" value={String(overview?.ownerCount ?? overview?.owners ?? 0)} rail="rail-brand" />
            <StatCard label="No. Properties" value={String(overview?.propertyCount ?? overview?.properties ?? 0)} rail="rail-success" />
            <StatCard label="Net Payable" value={fmt(overview?.netPayable ?? 0)} rail="rail-danger" />
            <StatCard label="NoLS Revenue" value={fmt(overview?.nolsRevenue ?? overview?.revenue ?? 0)} rail="rail-info" />
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
                {loadingApprovals ? (
                  <div className="space-y-2">{Array.from({ length: 4 }).map((_,i) => <div key={i} className="skeleton h-8" />)}</div>
                ) : approvals?.items?.length ? (
                  <ul className="space-y-2">
                    {approvals.items.map((p: any) => (
                      <li key={p.id} className="rounded border p-2 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{p.title}</div>
                          <div className="text-[11px] text-gray-500">Owner: {p.owner?.name ?? `#${p.ownerId}`}</div>
                        </div>
                        <Link href={`/admin/properties/${p.id}`} className="btn btn-ghost text-xs">Open</Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-600">No pending approvals.</div>
                )}
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
                      <div className="space-y-3">
                        {invoiceFilter === 'new' ? (
                          <div ref={newRef} className="min-w-0">
                            <div className="sr-only">New</div>
                            {invNew?.items?.length ? (
                              <ul className="space-y-1">
                                {invNew.items.map((inv: any) => (
                                  <li key={inv.id} className="rounded border p-2 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                                    <div className="text-sm">{inv.invoiceNumber ?? `#${inv.id}`}</div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        className="btn btn-outline text-xs"
                                        onClick={() => { setConfirmPayload({ action: 'verify', invId: inv.id }); setConfirmOpen(true); }}
                                      >
                                        Mark Verified
                                      </button>
                                      <button
                                        className="btn btn-outline text-xs"
                                        onClick={() => { setConfirmPayload({ action: 'validate', invId: inv.id }); setConfirmOpen(true); }}
                                      >
                                        Mark Validated
                                      </button>
                                      <Link href={`/admin/revenue`} className="btn btn-ghost text-xs">Review</Link>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ) : null}

                        {invoiceFilter === 'approved' ? (
                          <div ref={approvedRef}>
                            <div className="sr-only">Approved</div>
                            {invApproved?.items?.length ? (
                              <ul className="space-y-1">
                                {invApproved.items.map((inv: any) => (
                                  <li key={inv.id} className="rounded border p-2 flex items-center justify-between">
                                    <div className="text-sm">{inv.invoiceNumber ?? `#${inv.id}`}</div>
                                    <div className="flex items-center gap-2">
                                      <Link href={`/admin/revenue`} className="btn btn-ghost text-xs">Open</Link>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ) : null}

                        {invoiceFilter === 'paid' ? (
                          <div ref={paidRef}>
                            <div className="sr-only">Paid</div>
                            {invPaid?.items?.length ? (
                              <ul className="space-y-1">
                                {invPaid.items.map((inv: any) => (
                                  <li key={inv.id} className="rounded border p-2 flex items-center justify-between">
                                    <div className="text-sm">{inv.invoiceNumber ?? `#${inv.id}`}</div>
                                    <div className="flex items-center gap-2">
                                      <Link href={`/admin/revenue`} className="btn btn-ghost text-xs">Open</Link>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ) : null}

                        {invoiceFilter === 'rejected' ? (
                          <div ref={rejectedRef}>
                            <div className="sr-only">Rejected</div>
                            {invRejected?.items?.length ? (
                              <ul className="space-y-1">
                                {invRejected.items.map((inv: any) => (
                                  <li key={inv.id} className="rounded border p-2 flex items-center justify-between">
                                    <div className="text-sm">{inv.invoiceNumber ?? `#${inv.id}`}</div>
                                    <div className="flex items-center gap-2">
                                      <Link href={`/admin/revenue`} className="btn btn-ghost text-xs">Open</Link>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Validation column: move validation UI into a distinct third column for clarity */}
              {/* Third column */}
              <div className="md:pl-4 md:border-l-2 md:border-gray-200">
                <div className="flex items-center mb-2">
                  <div className="flex items-center gap-2 font-medium text-gray-800">
                    <FileCheck2 className="h-4 w-4" /> Validation
                  </div>
                </div>
                <div ref={validationRef} className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      value={validationCode}
                      onChange={(e)=>setValidationCode(e.target.value)}
                      placeholder="Paste validation code"
                      className="flex-1 min-w-0 px-2 py-1 border rounded text-sm"
                      aria-label="Validation code"
                    />
                    {/* no clear button by design; keep input value while validating */}
                  </div>
                  {loadingValidation ? <div className="text-sm text-gray-500 mt-2">Validating…</div> : null}
                  {validationResult ? (
                    <div className="mt-3 rounded border p-2 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{validationResult.invoiceNumber ?? `#${validationResult.id}`}</div>
                        <div className="text-xs text-gray-500">Amount: {validationResult.amount}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="btn btn-outline text-xs"
                          onClick={()=>{ sendAnalytics('invoice.validate_click', { id: validationResult.id }); setConfirmPayload({ action: 'validate', invId: validationResult.id }); setConfirmOpen(true); }}
                        >
                          Mark Validated
                        </button>
                        <Link href={`/admin/revenue`} className="btn btn-ghost text-xs">Open</Link>
                      </div>
                    </div>
                  ) : validationCode && !loadingValidation ? (
                    <div className="text-sm text-gray-500 mt-2">No invoice found for that code.</div>
                  ) : null}
                </div>
              </div>
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
                <QLink href="/admin/properties" label="Manage Properties" Icon={Building2} color="bg-[#02665e]" />
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

 

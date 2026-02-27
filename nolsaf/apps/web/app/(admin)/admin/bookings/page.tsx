"use client";
import { useEffect, useRef, useState } from "react";
import { BarChart2, Calendar, CheckCircle2, ChevronDown, ChevronUp, ChevronsUpDown, Clock, CreditCard, Eye, Landmark, LogIn, LogOut, Search, Smartphone, Sparkles, X, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import DatePicker from "@/components/ui/DatePicker";
import axios from "axios";
import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";

// Use same-origin for HTTP calls so Next.js rewrites proxy to the API
const api = axios.create({ baseURL: "" });
function authify() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
}

type Row = {
  id: number;
  status: string;
  checkIn: string;
  checkOut: string;
  guestName?: string | null;
  guestPhone?: string | null;
  roomCode?: string | null;
  totalAmount: number;
  property: { id: number; title: string; ownerId: number; regionName?: string | null; city?: string | null };
  code?: { id: number; code: string; status: string } | null;
  user?: { id: number; name?: string | null; email?: string | null; phone?: string | null } | null;
  payment?: { amount?: number | null; paidAt?: string | null; method?: string | null } | null;
};

// Column presets for each filter button. Keys correspond to the status value used
// in the status buttons ('' means All). These are the column keys used by
// the table renderer below.
const COLUMN_PRESETS: Record<string, string[]> = {
    "": [
      "bookingCode",
      "guestName",
      "owner",
      "region",
      "propertyRoom",
      "amountPaid",
      "status",
      "checkIn",
      "checkOut",
      "nights",
      "actions",
    ],
    NEW: [
      "bookingCode",
      "guestName",
      "contact",
      "paymentDate",
      "owner",
      "propertyRoom",
      "amountPaid",
      "status",
      "actions",
    ],
    CONFIRMED: [
      "bookingCode",
      "guestName",
      "owner",
      "propertyRoom",
      "amountPaid",
      "status",
      "checkIn",
      "checkOut",
      "nights",
      "actions",
    ],
    CHECKED_IN: [
      "bookingCode",
      "guestName",
      "owner",
      "propertyRoom",
      "roomNumber",
      "checkIn",
      "checkOut",
      "nights",
      "status",
      "actions",
    ],
    CHECKED_OUT: [
      "bookingCode",
      "guestName",
      "owner",
      "propertyRoom",
      "checkIn",
      "checkOut",
      "nights",
      "amountPaid",
      "actions",
    ],
    CANCELED: [
      "bookingCode",
      "guestName",
      "owner",
      "propertyRoom",
      "cancelledAt",
      "cancelReason",
      "amountRefunded",
      "actions",
    ],
};

export default function AdminBookingsPage() {
  const [status, setStatus] = useState<string>("");
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [date, setDate] = useState<string | string[]>("");
  const [q, setQ] = useState("");
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [pickerAnim, setPickerAnim] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [openIds, setOpenIds] = useState<Record<number, boolean>>({});
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function sortToggle(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  function toggleMobile(id: number) {
    setOpenIds((p) => ({ ...(p || {}), [id]: !p[id] }));
  }

  // initialize visible columns from the 'all' preset
  useEffect(() => {
    // try to restore from URL params (deep-linking). If not present, fall back
    // to the default 'all' preset.
    try {
      const url = new URL(window.location.href);
      const filterParam = url.searchParams.get("filter");
      const colsParam = url.searchParams.get("cols");
      if (filterParam) {
        const mapped = filterParam === "all" ? "" : filterParam;
        setStatus(mapped);
      }
      if (colsParam) {
        const parts = colsParam.split(",").map((s) => s.trim()).filter(Boolean);
        if (parts.length > 0) setVisibleColumns(parts);
        else setVisibleColumns(COLUMN_PRESETS[""]);
      } else {
        setVisibleColumns(COLUMN_PRESETS[""]);
      }
    } catch (e) {
      setVisibleColumns(COLUMN_PRESETS[""]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // try to fetch counts for bookings per status (best-effort)
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/api/admin/bookings/counts');
        if (r?.data) setCounts(r.data as Record<string, number>);
      } catch (e) {
        // ignore if not available
      }
    })();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get("/api/admin/bookings", {
        params: { status, date: Array.isArray(date) ? date.join(',') : date, q, page: 1, pageSize: 40 },
      });
      const items = (r.data as { items: Row[] })?.items ?? [];
      setList(items);
    } catch (err) {
      console.error('Failed to load bookings', err);
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCounts() {
    try {
      const r = await api.get('/api/admin/bookings/counts');
      if (r?.data) setCounts(r.data as Record<string, number>);
    } catch (e) {
      // ignore failures
    }
  }

  // initial load + socket attach
  useEffect(() => {
    authify();
    load();

    // Use direct API URL for Socket.IO in browser to ensure WebSocket works in dev
    const url = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_SOCKET_URL || "http://127.0.0.1:4000")
      : (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "");

    // Attach token via auth for server-side verify (optional)
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const s = io(url, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      auth: token ? { token } : undefined,
    });

    socketRef.current = s;

    // Live refresh on important events (reload list + counts)
    const refresh = () => {
      // fire-and-forget
      load().catch(() => {});
      fetchCounts().catch(() => {});
    };
    s.on("connect", () => {
      // console.debug("socket connected", s.id);
    });
    s.on("disconnect", () => {
      // console.debug("socket disconnected");
    });

    // Emitted by backend in admin.bookings.ts
    s.on("admin:code:generated", refresh);
    s.on("admin:code:voided", refresh);

    // If your API emits general booking changes, react to them too
    s.on("booking.changed", refresh);

    return () => {
      s.off("admin:code:generated", refresh);
      s.off("admin:code:voided", refresh);
      s.off("booking.changed", refresh);
      s.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload when filters change
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, date, q]);

  // when status changes, pick the corresponding column preset and update URL
  useEffect(() => {
    const preset = COLUMN_PRESETS[status ?? ""] ?? COLUMN_PRESETS[""];
    setVisibleColumns(preset);

    try {
      const url = new URL(window.location.href);
      url.searchParams.set("filter", status || "all");
      url.searchParams.set("cols", preset.join(","));
      window.history.replaceState({}, "", url.toString());
    } catch (e) {
      // ignore on SSR or if URL APIs are not available
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const sortedList = !sortCol ? list : [...list].sort((a, b) => {
    let av: string | number = 0, bv: string | number = 0;
    if (sortCol === 'bookingCode') { av = a.id; bv = b.id; }
    else if (sortCol === 'guestName') { av = (a.guestName ?? '').toLowerCase(); bv = (b.guestName ?? '').toLowerCase(); }
    else if (sortCol === 'amountPaid') { av = a.totalAmount; bv = b.totalAmount; }
    else if (sortCol === 'checkIn') { av = a.checkIn; bv = b.checkIn; }
    else if (sortCol === 'checkOut') { av = a.checkOut; bv = b.checkOut; }
    else if (sortCol === 'nights') { av = +new Date(a.checkOut) - +new Date(a.checkIn); bv = +new Date(b.checkOut) - +new Date(b.checkIn); }
    return av < bv ? (sortDir === 'asc' ? -1 : 1) : av > bv ? (sortDir === 'asc' ? 1 : -1) : 0;
  });

  return (
    <>
      {/* ── Page header ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <div className="h-9 w-9 rounded-xl bg-[#02665e]/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4.5 w-4.5 text-[#02665e]" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Bookings</h1>
            </div>
            <p className="text-sm text-gray-500 ml-12">View and manage guest bookings and codes</p>
          </div>
          {/* KPI chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: 'Total',     val: (counts['NEW'] ?? 0) + (counts['CONFIRMED'] ?? 0) + (counts['CHECKED_IN'] ?? 0) + (counts['PENDING_CHECKIN'] ?? 0) + (counts['CHECKED_OUT'] ?? 0) + (counts['CANCELED'] ?? 0), cls: 'bg-gray-100 text-gray-700 ring-gray-200' },
              { label: 'New',       val: counts['NEW'] ?? 0,   cls: 'bg-blue-50 text-blue-700 ring-blue-200' },
              { label: 'Active',    val: (counts['CHECKED_IN'] ?? 0) + (counts['PENDING_CHECKIN'] ?? 0), cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
              { label: 'Checked out', val: counts['CHECKED_OUT'] ?? 0, cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
              { label: 'Cancelled', val: counts['CANCELED'] ?? 0, cls: 'bg-red-50 text-red-600 ring-red-200' },
            ].map(k => (
              <div key={k.label} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 ${k.cls}`}>
                <span className="font-bold tabular-nums">{k.val}</span>
                <span className="opacity-60 font-medium">{k.label}</span>
              </div>
            ))}
          </div>
        </div>
        {/* ── Distribution bar ── */}
        {(() => {
          const _total = (counts['NEW'] ?? 0) + (counts['CONFIRMED'] ?? 0) + (counts['CHECKED_IN'] ?? 0) + (counts['PENDING_CHECKIN'] ?? 0) + (counts['CHECKED_OUT'] ?? 0) + (counts['CANCELED'] ?? 0);
          const segs = [
            { label: 'New',        val: counts['NEW'] ?? 0,                                               color: '#3b82f6' },
            { label: 'Validated',  val: counts['CONFIRMED'] ?? 0,                                         color: '#10b981' },
            { label: 'Check-in',   val: (counts['CHECKED_IN'] ?? 0) + (counts['PENDING_CHECKIN'] ?? 0),  color: '#f59e0b' },
            { label: 'Check-out',  val: counts['CHECKED_OUT'] ?? 0,                                       color: '#0ea5e9' },
            { label: 'Cancelled',  val: counts['CANCELED'] ?? 0,                                          color: '#ef4444' },
          ].filter(s => s.val > 0);
          if (!_total) return null;
          return (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5 mb-1.5">
                <BarChart2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Booking distribution</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden gap-px w-full">
                {segs.map(s => (
                  <div key={s.label} className="h-full transition-all" style={{ flex: s.val / _total, background: s.color }} title={`${s.label}: ${s.val}`} />
                ))}
              </div>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {segs.map(s => (
                  <div key={s.label} className="flex items-center gap-1 text-[10px]">
                    <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-gray-400">{s.label}</span>
                    <span className="font-bold text-gray-700 tabular-nums">{s.val}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Search + Filters ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        {/* Search box — unchanged */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={searchRef}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none text-sm box-border"
            placeholder="Search (guest, code, property)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search bookings"
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); load(); }
            }}
          />
          {q && (
            <button
              type="button"
              onClick={() => { setQ(''); load(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              aria-label="Clear search"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status tabs + date */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { label: 'All',        value: '',            color: '#02665e' },
              { label: 'New',        value: 'NEW',         color: '#3b82f6' },
              { label: 'Validated',  value: 'CONFIRMED',   color: '#10b981' },
              { label: 'Check-in',   value: 'CHECKED_IN',  color: '#f59e0b' },
              { label: 'Check-out',  value: 'CHECKED_OUT', color: '#0ea5e9' },
              { label: 'Cancelled',  value: 'CANCELED',    color: '#ef4444' },
            ] as { label: string; value: string; color: string }[]).map((s) => {
              const cnt =
                s.value === ''
                  ? (counts['NEW'] ?? 0) + (counts['CONFIRMED'] ?? 0) + (counts['CHECKED_IN'] ?? 0) + (counts['PENDING_CHECKIN'] ?? 0) + (counts['CHECKED_OUT'] ?? 0) + (counts['CANCELED'] ?? 0)
                  : s.value === 'CHECKED_IN'
                  ? (counts['CHECKED_IN'] ?? 0) + (counts['PENDING_CHECKIN'] ?? 0)
                  : (counts[s.value] ?? 0);
              const active = status === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => { setStatus(s.value); setTimeout(() => load(), 0); }}
                  aria-pressed={active ? 'true' : 'false'}
                  aria-label={`Filter ${s.label} bookings`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border"
                  style={active
                    ? { background: s.color, color: '#fff', borderColor: 'transparent', boxShadow: `0 2px 10px ${s.color}55` }
                    : { background: `${s.color}12`, color: s.color, borderColor: `${s.color}28` }}
                >
                  {s.label}
                  <span
                    className="tabular-nums text-[10px] font-bold rounded-lg px-1.5 py-0.5"
                    style={active
                      ? { background: 'rgba(255,255,255,0.22)', color: '#fff' }
                      : { background: `${s.color}1a`, color: s.color }}
                  >{cnt}</span>
                </button>
              );
            })}
          </div>

          {/* Date picker button — shows active state when date is selected */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              aria-label="Open date picker"
              onClick={() => {
                setPickerAnim(true);
                window.setTimeout(() => setPickerAnim(false), 350);
                setPickerOpen((v) => !v);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                date
                  ? 'border-[#02665e] bg-[#02665e]/8 text-[#02665e]'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50'
              } ${pickerAnim ? 'ring-2 ring-[#02665e]/20' : ''}`}
            >
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{date ? (Array.isArray(date) ? `${date[0]} – ${date[date.length - 1]}` : String(date)) : 'Date filter'}</span>
              {date && (
                <span
                  role="button"
                  aria-label="Clear date filter"
                  onClick={(e) => { e.stopPropagation(); setDate(''); }}
                  className="ml-0.5 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </button>
            {pickerOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <DatePicker
                    selected={date || undefined}
                    onSelectAction={(s) => { setDate(s as string | string[]); }}
                    onCloseAction={() => setPickerOpen(false)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Table / Content ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Skeleton loader */}
        {loading && (
          <div>
            <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50/80">
              {[40, 60, 80, 60, 40, 50].map((w, i) => (
                <div key={i} className={`h-3 rounded bg-gray-200 animate-pulse`} style={{ width: `${w}px` }} />
              ))}
            </div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-4 border-b border-gray-50" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="h-2.5 w-[3px] rounded-full bg-gray-200 animate-pulse mr-1" />
                <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: '52px' }} />
                <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: '110px' }} />
                <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: '80px' }} />
                <div className="h-3 bg-gray-100 rounded animate-pulse flex-1" />
                <div className="h-6 bg-gray-100 rounded-full animate-pulse" style={{ width: '72px' }} />
                <div className="h-7 bg-gray-100 rounded-lg animate-pulse" style={{ width: '52px' }} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && (!list || list.length === 0) && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-base font-semibold text-gray-800">No bookings found</p>
            <p className="text-sm text-gray-400 mt-1.5 max-w-xs leading-relaxed">
              {q
                ? `No results matching "${q}". Try a different search term.`
                : status
                ? `No bookings with the selected status.`
                : 'There are no bookings to display yet.'}
            </p>
            {(q || status || date) && (
              <button
                type="button"
                onClick={() => { setQ(''); setStatus(''); setDate(''); }}
                className="mt-5 px-4 py-2 text-sm font-semibold text-[#02665e] border border-[#02665e]/30 rounded-lg hover:bg-[#02665e]/6 transition"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {!loading && list && list.length > 0 && (
          <>
            {/* ── Mobile cards ── */}
            <div className="sm:hidden divide-y divide-gray-100">
              {sortedList.map((b) => {
                const stripe: Record<string, string> = {
                  NEW: 'border-l-blue-400',
                  CONFIRMED: 'border-l-emerald-400',
                  PENDING_CHECKIN: 'border-l-emerald-400',
                  CHECKED_IN: 'border-l-emerald-500',
                  CHECKED_OUT: 'border-l-sky-400',
                  CANCELED: 'border-l-red-400',
                };
                return (
                  <div key={`m-${b.id}`} className={`border-l-4 ${stripe[b.status] ?? 'border-l-gray-300'} pl-4 pr-4 py-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm leading-tight">#{b.id} · {b.property.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{b.guestName ?? '—'}</div>
                        <div className="text-xs text-gray-400 mt-0.5 tabular-nums">
                          {new Date(b.checkIn).toLocaleDateString()} → {new Date(b.checkOut).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className="text-sm font-bold text-gray-900 tabular-nums">{new Intl.NumberFormat().format(b.totalAmount)} <span className="text-xs font-normal text-gray-400">TZS</span></span>
                        <StatusBadge s={b.status} />
                        <button
                          onClick={() => toggleMobile(b.id)}
                          aria-expanded={!!openIds[b.id] ? 'true' : 'false'}
                          aria-controls={`booking-${b.id}-details`}
                          className="text-xs font-semibold text-[#02665e] hover:underline"
                        >
                          {openIds[b.id] ? 'Hide' : 'Details'}
                        </button>
                      </div>
                    </div>
                    {openIds[b.id] && (
                      <div id={`booking-${b.id}-details`} className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-gray-400">Room: <span className="font-medium text-gray-700">{b.roomCode ?? '—'}</span></span>
                        <a
                          href={`/admin/bookings/${b.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#02665e] border border-[#02665e]/40 rounded-lg hover:bg-[#02665e] hover:text-white transition"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Desktop table ── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    {/* Status stripe column */}
                    <th className="w-[3px] p-0" />
                    {visibleColumns.map((c) => {
                      const SORTABLE = new Set(['bookingCode','guestName','amountPaid','checkIn','checkOut','nights']);
                      const label = c === 'bookingCode' ? 'Booking' : c === 'guestName' ? 'Guest' : c === 'owner' ? 'Owner' : c === 'region' ? 'Region' : c === 'propertyRoom' ? 'Property / Room' : c === 'amountPaid' ? 'Amount' : c === 'status' ? 'Status' : c === 'checkIn' ? 'Check\u2011in' : c === 'checkOut' ? 'Check\u2011out' : c === 'nights' ? 'Nights' : c === 'actions' ? '' : c === 'contact' ? 'Contact' : c === 'paymentDate' ? 'Payment' : c === 'roomNumber' ? 'Room' : c === 'cancelledAt' ? 'Cancelled' : c === 'cancelReason' ? 'Reason' : c === 'amountRefunded' ? 'Refunded' : c;
                      const canSort = SORTABLE.has(c);
                      const isSorted = sortCol === c;
                      return (
                        <th
                          key={c}
                          onClick={canSort ? () => sortToggle(c) : undefined}
                          className={`px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${canSort ? 'cursor-pointer select-none hover:text-[#02665e] hover:bg-[#02665e]/4 transition-colors' : ''}`}
                        >
                          <div className="flex items-center gap-1">
                            {label}
                            {canSort && (
                              <span className={`transition-colors flex-shrink-0 ${isSorted ? 'text-[#02665e]' : 'text-gray-300'}`}>
                                {isSorted
                                  ? sortDir === 'asc'
                                    ? <ChevronUp className="h-3 w-3" />
                                    : <ChevronDown className="h-3 w-3" />
                                  : <ChevronsUpDown className="h-3 w-3" />}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedList.map((b) => {
                    const stripeColor: Record<string, string> = {
                      NEW: 'bg-blue-400',
                      CONFIRMED: 'bg-emerald-400',
                      PENDING_CHECKIN: 'bg-emerald-400',
                      CHECKED_IN: 'bg-emerald-500',
                      CHECKED_OUT: 'bg-sky-400',
                      CANCELED: 'bg-red-400',
                    };
                    return (
                      <tr key={b.id} className="group hover:bg-gray-50/70 transition-colors duration-100">
                        {/* Status stripe */}
                        <td className="p-0 w-[3px]">
                          <div className={`w-[3px] h-full min-h-[52px] ${stripeColor[b.status] ?? 'bg-gray-300'} opacity-60`} />
                        </td>
                        {visibleColumns.map((c) => (
                          <td key={c} className="px-4 py-3.5 text-sm text-gray-700">
                            {(() => {
                              switch (c) {
                                case 'bookingCode':
                                  return (
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-gray-900">#{b.id}</span>
                                      {b.code?.code && <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{b.code.code}</span>}
                                    </div>
                                  );
                                case 'guestName':
                                  return <span className="font-medium text-gray-900">{b.guestName ?? '—'}</span>;
                                case 'owner':
                                  return <span className="text-gray-500">{b.property?.ownerId ?? '—'}</span>;
                                case 'region': {
                                  const parts = [b.property?.regionName, b.property?.city].filter(Boolean);
                                  return parts.length > 0 ? (
                                    <div>
                                      <div className="font-medium text-gray-800 leading-tight">{parts[0]}</div>
                                      {parts[1] && <div className="text-xs text-gray-400 mt-0.5">{parts[1]}</div>}
                                    </div>
                                  ) : <span className="text-gray-300">—</span>;
                                }
                                case 'propertyRoom':
                                  return (
                                    <div>
                                      <div className="font-medium text-gray-900 leading-tight">{b.property.title}</div>
                                      {b.roomCode && <div className="text-xs text-gray-400 mt-0.5">{b.roomCode}</div>}
                                    </div>
                                  );
                                case 'amountPaid':
                                  return (
                                    <span className="font-semibold text-gray-900 tabular-nums">
                                      {new Intl.NumberFormat().format(b.totalAmount)}{' '}
                                      <span className="text-xs font-normal text-gray-400">TZS</span>
                                    </span>
                                  );
                                case 'status': {
                                  const _icons: Record<string, JSX.Element | null> = {
                                    NEW: <Sparkles className="h-3 w-3" />,
                                    CONFIRMED: <CheckCircle2 className="h-3 w-3" />,
                                    PENDING_CHECKIN: <Clock className="h-3 w-3" />,
                                    CHECKED_IN: <LogIn className="h-3 w-3" />,
                                    CHECKED_OUT: <LogOut className="h-3 w-3" />,
                                    CANCELED: <XCircle className="h-3 w-3" />,
                                  };
                                  const _labels: Record<string, string> = { NEW: 'New', CONFIRMED: 'Validated', PENDING_CHECKIN: 'Pending', CHECKED_IN: 'Checked in', CHECKED_OUT: 'Checked out', CANCELED: 'Cancelled' };
                                  const _palette: Record<string, [string, string]> = {
                                    NEW: ['#eff6ff','#3b82f6'], CONFIRMED: ['#ecfdf5','#10b981'], PENDING_CHECKIN: ['#fffbeb','#f59e0b'],
                                    CHECKED_IN: ['#f0fdf4','#22c55e'], CHECKED_OUT: ['#f0f9ff','#0ea5e9'], CANCELED: ['#fef2f2','#ef4444'],
                                  };
                                  const [_bg, _col] = _palette[b.status] ?? ['#f9fafb','#6b7280'];
                                  return (
                                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap" style={{ background: _bg, color: _col }}>
                                      {_icons[b.status] ?? null}
                                      {_labels[b.status] ?? b.status}
                                    </span>
                                  );
                                }
                                case 'checkIn':
                                  return <span className="tabular-nums text-gray-700">{new Date(b.checkIn).toLocaleDateString()}</span>;
                                case 'checkOut':
                                  return <span className="tabular-nums text-gray-700">{new Date(b.checkOut).toLocaleDateString()}</span>;
                                case 'nights': {
                                  const d1 = new Date(b.checkIn), d2 = new Date(b.checkOut);
                                  return <span className="tabular-nums">{Math.max(0, Math.round((+d2 - +d1) / 86400000))}</span>;
                                }
                                case 'actions':
                                  return (
                                    <a
                                      href={`/admin/bookings/${b.id}`}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#02665e] border border-[#02665e]/40 rounded-lg hover:bg-[#02665e] hover:text-white transition group-hover:border-[#02665e]/70"
                                    >
                                      <Eye className="h-3.5 w-3.5" /> View
                                    </a>
                                  );
                                case 'contact': {
                                  const phone = b.guestPhone || b.user?.phone;
                                  return phone ? (
                                    <span className="inline-flex items-center gap-1.5 text-gray-700 font-medium tabular-nums">
                                      <Smartphone className="h-3.5 w-3.5 text-[#02665e] flex-shrink-0" />
                                      {phone}
                                    </span>
                                  ) : <span className="text-gray-300">—</span>;
                                }
                                case 'paymentDate': {
                                  const method = b.payment?.method?.toUpperCase() ?? '';
                                  const isMobile = ['MPESA','TIGOPESA','AZAMPAY','AIRTEL','HALOPESA','TTCL','VODACOM'].some(m => method.includes(m));
                                  const isVisa = method.includes('VISA');
                                  const isMaster = method.includes('MASTER');
                                  const isBank = method.includes('BANK') || method.includes('TRANSFER');
                                  const Icon = isMobile ? Smartphone : (isVisa || isMaster) ? CreditCard : isBank ? Landmark : method ? CreditCard : null;
                                  const label = isMobile
                                    ? method.replace('AZAMPAY','Mobile Pay')
                                    : isVisa ? 'Visa' : isMaster ? 'Mastercard' : isBank ? 'Bank Transfer' : method || null;
                                  if (!label && !Icon) return <span className="text-gray-300">—</span>;
                                  return (
                                    <div className="inline-flex items-center gap-1.5">
                                      <span className={`flex items-center justify-center h-6 w-6 rounded-lg flex-shrink-0 ${
                                        isMobile ? 'bg-emerald-50 text-emerald-600' : (isVisa||isMaster) ? 'bg-blue-50 text-blue-600' : isBank ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
                                      }`}>
                                        {Icon && <Icon className="h-3.5 w-3.5" />}
                                      </span>
                                      <span className="text-xs font-semibold text-gray-700 leading-tight">{label}</span>
                                    </div>
                                  );
                                }
                                case 'roomNumber':
                                  return <span className="text-gray-700">{b.roomCode ?? '—'}</span>;
                                case 'cancelledAt':
                                  return <span className="text-gray-400">—</span>;
                                case 'cancelReason':
                                  return <span className="text-gray-400">—</span>;
                                case 'amountRefunded':
                                  return <span className="text-gray-400">—</span>;
                                default:
                                  return null;
                              }
                            })()}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { Calendar, Search, X, Eye } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import DatePicker from "@/components/ui/DatePicker";
import axios from "axios";
import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";
import TableRow from "@/components/TableRow";

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
  roomCode?: string | null;
  totalAmount: number;
  property: { id: number; title: string; ownerId: number };
  code?: { id: number; code: string; status: string } | null;
};

function badgeClasses(v: string) {
  switch (v) {
    case "NEW":
      return "bg-gray-100 text-gray-700";
    case "CONFIRMED":
      return "bg-blue-100 text-blue-700";
    case "PENDING_CHECKIN":
      // treat pending check-in as checked in in counts/ badges
      return "bg-emerald-100 text-emerald-700";
    case "CHECKED_IN":
      return "bg-emerald-100 text-emerald-700";
    case "CHECKED_OUT":
      return "bg-sky-100 text-sky-700";
    case "CANCELED":
      return "bg-red-100 text-red-700";
    case "":
    default:
      return "bg-gray-100 text-gray-700";
  }
}

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

  return (
    <>
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <Calendar className="h-8 w-8 text-gray-400 mb-3" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Bookings
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            View and manage guest bookings and codes
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col gap-4 max-w-4xl mx-auto">
          {/* Search Box */}
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

          {/* Status Filters and Date Picker */}
          <div className="flex flex-wrap items-center gap-2 justify-center">
            <div className="flex gap-2 items-center">
              {[
                { label: 'All', value: '' },
                { label: 'New', value: 'NEW' },
                { label: 'Validated', value: 'CONFIRMED' },
                { label: 'Check-in', value: 'CHECKED_IN' },
                { label: 'Check-out', value: 'CHECKED_OUT' },
                { label: 'Canceled', value: 'CANCELED' },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => { setStatus(s.value); setTimeout(() => load(), 0); }}
                  aria-pressed={status === s.value ? 'true' : 'false'}
                  aria-label={`Filter ${s.label} bookings`}
                  className={`px-3 py-1.5 rounded-full border text-sm flex items-center gap-2 transition-all duration-200 ${
                    status === s.value 
                      ? 'bg-[#02665e] text-white border-[#02665e] shadow-sm' 
                      : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
                  }`}
                >
                  <span>{s.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    status === s.value 
                      ? 'bg-white/20 text-white' 
                      : badgeClasses(s.value)
                  }`}>
                    {s.value === ''
                      ? ((counts['NEW'] ?? 0) + (counts['CONFIRMED'] ?? 0) + (counts['CHECKED_IN'] ?? 0) + (counts['PENDING_CHECKIN'] ?? 0) + (counts['CHECKED_OUT'] ?? 0) + (counts['CANCELED'] ?? 0))
                      : s.value === 'CHECKED_IN'
                      ? ((counts['CHECKED_IN'] ?? 0) + (counts['PENDING_CHECKIN'] ?? 0))
                      : (counts[s.value] ?? 0)}
                  </span>
                </button>
              ))}
              <div className="relative">
                <button
                  type="button"
                  aria-label="Open date picker"
                  title="Pick a date"
                  onClick={() => {
                    setPickerAnim(true);
                    window.setTimeout(() => setPickerAnim(false), 350);
                    setPickerOpen((v) => !v);
                  }}
                  className={`px-3 py-1.5 rounded-full border text-sm flex items-center justify-center text-gray-700 bg-white transition-all duration-200 ${
                    pickerAnim ? 'ring-2 ring-[#02665e]/20' : 'hover:bg-gray-50'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                </button>
                {pickerOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                    <div className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <DatePicker
                        selected={date || undefined}
                        onSelectAction={(s) => {
                          setDate(s as string | string[]);
                        }}
                        onCloseAction={() => setPickerOpen(false)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">Loading…</div>
        ) : !list || list.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">No bookings found.</div>
        ) : (
          <>
            {/* Mobile: collapsible cards */}
            <div className="sm:hidden space-y-2 p-4">
              {list.map((b) => (
                <div key={`m-${b.id}`} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">#{b.id} • {b.property.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{b.guestName ?? '-'}</div>
                      <div className="text-xs text-gray-500 mt-1">{new Date(b.checkIn).toLocaleDateString()} → {new Date(b.checkOut).toLocaleDateString()}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-sm font-medium text-gray-900">{new Intl.NumberFormat().format(b.totalAmount)} TZS</div>
                      <StatusBadge s={b.status} />
                      <button
                        onClick={() => toggleMobile(b.id)}
                        aria-expanded={!!openIds[b.id] ? 'true' : 'false'}
                        aria-controls={`booking-${b.id}-details`}
                        className="text-xs text-[#02665e] hover:text-[#013a37] transition-colors"
                      >
                        {openIds[b.id] ? 'Hide' : 'Details'}
                      </button>
                    </div>
                  </div>
                  <div id={`booking-${b.id}-details`} className={`${openIds[b.id] ? 'block' : 'hidden'} mt-3 pt-3 border-t border-gray-200 text-xs`}> 
                    <div className="text-gray-600 mb-2">Room: <span className="font-medium">{b.roomCode ?? '-'}</span></div>
                    <div className="mt-2">
                      <a 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#02665e] border border-[#02665e] rounded-lg hover:bg-[#02665e] hover:text-white transition-all duration-200" 
                        href={`/admin/bookings/${b.id}`}
                        title="View booking details"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/table: hidden on small screens */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {visibleColumns.map((c) => (
                      <th key={c} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {(() => {
                          switch (c) {
                            case 'bookingCode':
                              return 'Booking';
                            case 'guestName':
                              return 'Guest';
                            case 'owner':
                              return 'Owner';
                            case 'region':
                              return 'Region';
                            case 'propertyRoom':
                              return 'Property / Room';
                            case 'amountPaid':
                              return 'Amount';
                            case 'status':
                              return 'Status';
                            case 'checkIn':
                              return 'Check‑in';
                            case 'checkOut':
                              return 'Check‑out';
                            case 'nights':
                              return 'Nights';
                            case 'actions':
                              return 'Action';
                            case 'contact':
                              return 'Contact';
                            case 'paymentDate':
                              return 'Payment';
                            case 'roomNumber':
                              return 'Room';
                            case 'cancelledAt':
                              return 'Cancelled At';
                            case 'cancelReason':
                              return 'Reason';
                            case 'amountRefunded':
                              return 'Refunded';
                            default:
                              return c;
                          }
                        })()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {list.map((b) => (
                    <TableRow key={b.id}>
                      {visibleColumns.map((c) => (
                        <td key={c} className="px-6 py-4 whitespace-nowrap">
                        {(() => {
                          switch (c) {
                            case 'bookingCode':
                              return (
                                <div className="font-medium">#{b.id}{b.code?.code ? ` • ${b.code.code}` : ''}</div>
                              );
                            case 'guestName':
                              return b.guestName ?? '-';
                            case 'owner':
                              return b.property?.ownerId ?? '—';
                            case 'region':
                              return '—';
                            case 'propertyRoom':
                              return (
                                <div className="flex flex-col">
                                  <span className="font-medium">{b.property.title}</span>
                                  <span className="text-xs opacity-70">{b.roomCode ?? '-'}</span>
                                </div>
                              );
                            case 'amountPaid':
                              return `${new Intl.NumberFormat().format(b.totalAmount)} TZS`;
                            case 'status':
                              return <StatusBadge s={b.status} />;
                            case 'checkIn':
                              return new Date(b.checkIn).toLocaleDateString();
                            case 'checkOut':
                              return new Date(b.checkOut).toLocaleDateString();
                            case 'nights':
                              try {
                                const d1 = new Date(b.checkIn);
                                const d2 = new Date(b.checkOut);
                                const nights = Math.max(0, Math.round((+d2 - +d1) / (1000 * 60 * 60 * 24)));
                                return nights;
                              } catch (e) {
                                return '-';
                              }
                            case 'actions':
                              return (
                                <a 
                                  href={`/admin/bookings/${b.id}`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-[#02665e] border border-[#02665e] rounded-lg hover:bg-[#02665e] hover:text-white transition-all duration-200"
                                  title="View booking details"
                                >
                                  <Eye className="h-4 w-4" />
                                </a>
                              );
                            case 'contact':
                              return <div className="text-xs opacity-70">{b.guestName ? '—' : '—'}</div>;
                            case 'paymentDate':
                              return '-';
                            case 'roomNumber':
                              return b.roomCode ?? '-';
                            case 'cancelledAt':
                              return '-';
                            case 'cancelReason':
                              return '-';
                            case 'amountRefunded':
                              return '-';
                            default:
                              return null;
                          }
                        })()}
                        </td>
                      ))}
                    </TableRow>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}

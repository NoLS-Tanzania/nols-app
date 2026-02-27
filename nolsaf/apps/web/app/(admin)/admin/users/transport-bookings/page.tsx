"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Truck,
  Search,
  X,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Filter,
  Eye,
  Hourglass,
  XCircle,
  BadgeCheck,
  CircleDashed,
  CircleCheck,
  FileSearch,
  Mail,
  Phone,
  Bookmark,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";

const api = axios.create({ baseURL: "", withCredentials: true });
function authify() {
  if (typeof window === "undefined") return;

  // Most of the app uses a Bearer token (often stored in localStorage).
  // The admin endpoints are protected by requireAuth/requireRole, so we must attach it.
  const lsToken =
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("nolsaf_token") ||
    window.localStorage.getItem("__Host-nolsaf_token");

  if (lsToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${lsToken}`;
    return;
  }

  // Fallback: non-httpOnly cookie (if present)
  const m = String(document.cookie || "").match(/(?:^|;\s*)(?:nolsaf_token|__Host-nolsaf_token)=([^;]+)/);
  const cookieToken = m?.[1] ? decodeURIComponent(m[1]) : "";
  if (cookieToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${cookieToken}`;
  }
}

type TransportBooking = {
  id: number;
  groupType: string;
  toRegion: string;
  toLocation: string | null;
  fromRegion: string | null;
  fromLocation: string | null;
  checkIn: string | null;
  checkOut: string | null;
  useDates: boolean;
  kind: "group" | "individual";
  headcount: number | null;
  roomsQty: number | null;
  status: string;
  totalAmount: number | null;
  currency: string | null;
  pickupLocation: string | null;
  pickupTime: string | null;
  arrangementNotes: string | null;
  createdAt: string;
  urgency: "urgent" | "later" | "specified" | "flexible";
  urgencyReason: string;
  user: {
    id: number | null;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
};

function formatPickupTime(pickupTime: string | null) {
  if (!pickupTime) return null;

  const trimmed = String(pickupTime).trim();

  // Many transport times come back as ISO strings.
  // Some also come back as parseable date strings; format them compactly.
  const maybeDate = new Date(trimmed);
  if (!Number.isNaN(maybeDate.getTime())) {
    const date = maybeDate.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
    const time = maybeDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return `${date} • ${time}`;
  }

  // Otherwise, keep it as-is (e.g. "10:00 AM").
  return trimmed;
}

function shortenText(text: string, max = 42) {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function formatDateShort(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatDateTimeShort(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" }),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
  };
}

const MARKS_STORAGE_KEY = "admin_transport_bookings_marks_v1";

type SortKey = "date" | "pickup" | "created" | "destination" | "customer" | "status" | "urgency";
type SortDir = "asc" | "desc";

export default function TransportBookingsPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TransportBooking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [markedKeys, setMarkedKeys] = useState<string[]>([]);
  const [markedOnly, setMarkedOnly] = useState(false);
  const pageSize = 30;
  const searchRef = useRef<HTMLInputElement | null>(null);

  const markedSet = useMemo(() => new Set(markedKeys), [markedKeys]);

  const bookingKey = (booking: TransportBooking) => `${booking.kind}:${booking.id}`;

  const toggleMark = (key: string) => {
    setMarkedKeys((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      return [key, ...prev].slice(0, 500);
    });
  };

  const toggleSort = (key: SortKey) => {
    setSortKey((prev) => {
      if (prev !== key) {
        setSortDir("asc");
        return key;
      }
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return prev;
    });
    setPage(1);
  };

  const SortIcon = ({ active }: { active: boolean }) => {
    if (!active) return <ArrowUpDown className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.28)" }} />;
    return sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" style={{ color: "#6ee7b7" }} /> : <ArrowDown className="h-3.5 w-3.5" style={{ color: "#6ee7b7" }} />;
  };

  const SortableHeader = ({ label, keyName, align = "left" }: { label: string; keyName: SortKey; align?: "left" | "right" }) => {
    const isActive = sortKey === keyName;
    return (
      <th className={`px-6 py-3 text-${align}`} style={{ fontSize: "0.68rem", fontWeight: 700, color: isActive ? "#6ee7b7" : "rgba(255,255,255,0.45)", letterSpacing: "0.07em", textTransform: "uppercase" }}>
        <button
          type="button"
          onClick={() => toggleSort(keyName)}
          className="inline-flex items-center gap-1.5 border-0 bg-transparent p-0 transition-colors focus:outline-none"
          style={{ fontSize: "0.68rem", fontWeight: 700, color: "inherit", letterSpacing: "inherit", textTransform: "inherit" }}
          aria-label={`Sort by ${label}`}
          title={`Sort by ${label}`}
        >
          <span>{label}</span>
          <SortIcon active={isActive} />
        </button>
      </th>
    );
  };

  const getViewHref = (booking: TransportBooking) =>
    booking.kind === "group"
      ? `/admin/group-stays/bookings?bookingId=${booking.id}`
      : `/admin/bookings/${booking.id}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(MARKS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setMarkedKeys(parsed.filter((x) => typeof x === "string").slice(0, 500));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(MARKS_STORAGE_KEY, JSON.stringify(markedKeys));
    } catch {
      // ignore
    }
  }, [markedKeys]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      authify();
      const params: any = { page, pageSize };
      if (status) params.status = status;
      if (q) params.q = q;
      if (sortKey) params.sort = sortKey;
      if (sortDir) params.dir = sortDir;

      // NOTE: do NOT call `/admin/users/transport-bookings` here.
      // That path is a Next.js page route (this page), so XHR would receive HTML.
      // Use a non-page path that rewrites/proxies to the API server.
      const r = await api.get<{ items: TransportBooking[]; total: number }>("/api/admin/users/transport-bookings", { params });

      const data: any = r.data;
      const nextItems = Array.isArray(data?.items) ? (data.items as TransportBooking[]) : [];
      const nextTotal = typeof data?.total === "number" ? data.total : 0;

      setItems(nextItems);
      setTotal(nextTotal);

      if (!Array.isArray(data?.items)) {
        setError("Unexpected response while loading transport bookings.");
      }
    } catch (err) {
      console.error("Failed to load transport bookings", err);
      setError("Failed to load transport bookings. Please refresh and try again.");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, q, sortKey, sortDir]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  const getUrgencyBadge = (urgency: string, reason: string) => {
    switch (urgency) {
      case "urgent":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.38)", color: "#fca5a5" }}>
            <AlertTriangle className="h-3 w-3 mr-1" />
            Urgent: {reason}
          </span>
        );
      case "later":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(245,158,11,0.18)", border: "1px solid rgba(245,158,11,0.38)", color: "#fcd34d" }}>
            <Clock className="h-3 w-3 mr-1" />
            Later: {reason}
          </span>
        );
      case "specified":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(14,165,233,0.18)", border: "1px solid rgba(14,165,233,0.38)", color: "#7dd3fc" }}>
            <Calendar className="h-3 w-3 mr-1" />
            {reason}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.55)" }}>
            <Clock className="h-3 w-3 mr-1" />
            Flexible
          </span>
        );
    }
  };

  const normalizeStatusForFilter = (rawStatus: string) => {
    const s = String(rawStatus || "").toUpperCase();
    if (s === "CANCELLED") return "CANCELED";
    return s;
  };

  const getStatusIndicator = (rawStatus: string) => {
    const map: Record<
      string,
      {
        label: string;
        Icon: React.ComponentType<{ className?: string }>;
        color: string;
      }
    > = {
      NEW: { label: "New", Icon: CircleDashed, color: "text-slate-400" },
      PENDING: { label: "Pending", Icon: Hourglass, color: "text-slate-300" },
      REVIEWING: { label: "Reviewing", Icon: FileSearch, color: "text-sky-400" },
      CONFIRMED: { label: "Confirmed", Icon: BadgeCheck, color: "text-sky-300" },
      PROCESSING: { label: "Processing", Icon: Clock, color: "text-amber-400" },
      CHECKED_IN: { label: "Checked in", Icon: CircleCheck, color: "text-emerald-400" },
      CHECKED_OUT: { label: "Checked out", Icon: CheckCircle, color: "text-slate-400" },
      COMPLETED: { label: "Completed", Icon: CheckCircle, color: "text-emerald-400" },
      CANCELED: { label: "Canceled", Icon: XCircle, color: "text-red-400" },
      CANCELLED: { label: "Cancelled", Icon: XCircle, color: "text-red-400" },
    };

    const bookingStatus = String(rawStatus || "").toUpperCase();
    const entry = map[bookingStatus] || { label: bookingStatus || "Unknown", Icon: CircleDashed, color: "text-gray-600" };
    const Icon = entry.Icon;
    const filterValue = normalizeStatusForFilter(bookingStatus);
    const isActive = normalizeStatusForFilter(status) === filterValue;

    return (
      <button
        type="button"
        title={`Filter: ${entry.label}`}
        aria-label={`Filter by status: ${entry.label}`}
        onClick={() => {
          setStatus((prev) => (normalizeStatusForFilter(prev) === filterValue ? "" : filterValue));
          setPage(1);
        }}
        className={`inline-flex items-center justify-center border-0 bg-transparent p-1 transition duration-150 hover:scale-110 hover:opacity-90 focus:outline-none ${
          isActive ? "scale-110" : ""
        }`}
      >
        <Icon className={`h-4 w-4 ${entry.color}`} />
        <span className="sr-only">Filter by status: {entry.label}</span>
      </button>
    );
  };

  const visibleItems = useMemo(() => {
    if (!markedOnly) return items;
    return items.filter((b) => markedSet.has(bookingKey(b)));
  }, [items, markedOnly, markedSet]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Premium Banner */}
      <div style={{ position: "relative", borderRadius: "1.25rem", overflow: "hidden", background: "linear-gradient(135deg, #0e2a7a 0%, #0a5c82 38%, #02665e 100%)", boxShadow: "0 28px 65px -15px rgba(2,102,94,0.45), 0 8px 22px -8px rgba(14,42,122,0.50)", padding: "2rem 2rem 1.75rem" }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.13, pointerEvents: "none" }} viewBox="0 0 900 160" preserveAspectRatio="xMidYMid slice">
          <circle cx="820" cy="30" r="90" fill="none" stroke="white" strokeWidth="1.2" />
          <circle cx="820" cy="30" r="55" fill="none" stroke="white" strokeWidth="0.7" />
          <circle cx="60" cy="140" r="70" fill="none" stroke="white" strokeWidth="1.0" />
          <line x1="0" y1="40" x2="900" y2="40" stroke="white" strokeWidth="0.4" />
          <line x1="0" y1="72" x2="900" y2="72" stroke="white" strokeWidth="0.4" />
          <line x1="0" y1="104" x2="900" y2="104" stroke="white" strokeWidth="0.4" />
          <line x1="0" y1="136" x2="900" y2="136" stroke="white" strokeWidth="0.4" />
          <polyline points="0,130 90,112 180,96 270,80 360,65 450,88 540,52 630,68 720,36 810,50 900,32" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <polygon points="0,130 90,112 180,96 270,80 360,65 450,88 540,52 630,68 720,36 810,50 900,32 900,160 0,160" fill="white" opacity={0.06} />
          <polyline points="0,145 90,133 180,119 270,130 360,112 450,125 540,100 630,115 720,92 810,105 900,82" fill="none" stroke="white" strokeWidth="1.2" strokeDasharray="6 4" opacity={0.5} />
          <circle cx="540" cy="52" r="5" fill="white" opacity={0.75} />
          <circle cx="720" cy="36" r="5" fill="white" opacity={0.75} />
          <circle cx="900" cy="32" r="5" fill="white" opacity={0.75} />
          <defs><radialGradient id="tbGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="white" stopOpacity="0.12" /><stop offset="100%" stopColor="white" stopOpacity="0" /></radialGradient></defs>
          <ellipse cx="450" cy="90" rx="200" ry="70" fill="url(#tbGlow)" />
        </svg>
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,0.10)", border: "1.5px solid rgba(255,255,255,0.18)", boxShadow: "0 0 0 8px rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Truck style={{ width: 22, height: 22, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "white", margin: 0, letterSpacing: "-0.01em" }}>Transport Bookings</h1>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.62)", margin: "2px 0 0" }}>Customers who booked accommodation with transport requested (group stays + individual bookings)</p>
          </div>
        </div>
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.20)", borderRadius: "0.85rem", padding: "0.6rem 1rem", minWidth: 90 }}>
            <div style={{ fontSize: "0.63rem", fontWeight: 700, color: "rgba(255,255,255,0.70)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Total</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "white", fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>{loading ? "…" : total.toLocaleString()}</div>
          </div>
          <div style={{ background: "rgba(14,165,233,0.16)", border: "1px solid rgba(14,165,233,0.35)", borderRadius: "0.85rem", padding: "0.6rem 1rem", minWidth: 90 }}>
            <div style={{ fontSize: "0.63rem", fontWeight: 700, color: "rgba(125,211,252,0.85)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Pages</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#7dd3fc", fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>{loading ? "…" : pages}</div>
          </div>
          <div style={{ background: "rgba(245,158,11,0.16)", border: "1px solid rgba(245,158,11,0.35)", borderRadius: "0.85rem", padding: "0.6rem 1rem", minWidth: 90 }}>
            <div style={{ fontSize: "0.63rem", fontWeight: 700, color: "rgba(252,211,77,0.85)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Marked</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#fcd34d", fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>{markedKeys.length}</div>
          </div>
          <div style={{ background: "rgba(16,185,129,0.16)", border: "1px solid rgba(16,185,129,0.35)", borderRadius: "0.85rem", padding: "0.6rem 1rem", minWidth: 90 }}>
            <div style={{ fontSize: "0.63rem", fontWeight: 700, color: "rgba(110,231,183,0.85)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Showing</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#6ee7b7", fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>{loading ? "…" : visibleItems.length}</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)", background: "linear-gradient(135deg, #0a1a19 0%, #0d2320 60%, #0a1f2e 100%)", padding: "1rem 1.25rem" }}>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-full">
          {/* Search */}
          <div className="relative flex-1 min-w-0 w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" style={{ color: "rgba(255,255,255,0.35)" }} />
            <input
              ref={searchRef}
              type="text"
              className="w-full pl-10 pr-10 py-2 rounded-lg text-sm box-border max-w-full outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.88)" }}
              placeholder="Search by customer name, email, phone, or location..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setPage(1);
                  load();
                }
              }}
            />
            {q && (
              <button
                type="button"
                onClick={() => { setQ(""); setPage(1); load(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "rgba(255,255,255,0.40)" }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-shrink-0">
            <Filter className="h-4 w-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.40)" }} />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full sm:w-auto px-3 py-2 rounded-lg text-sm outline-none box-border min-w-[140px]"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.80)" }}
            >
              <option value="" style={{ background: "#0d2320" }}>All Status</option>
              <option value="NEW" style={{ background: "#0d2320" }}>New</option>
              <option value="PENDING" style={{ background: "#0d2320" }}>Pending</option>
              <option value="REVIEWING" style={{ background: "#0d2320" }}>Reviewing</option>
              <option value="CONFIRMED" style={{ background: "#0d2320" }}>Confirmed</option>
              <option value="PROCESSING" style={{ background: "#0d2320" }}>Processing</option>
              <option value="CHECKED_IN" style={{ background: "#0d2320" }}>Checked in</option>
              <option value="CHECKED_OUT" style={{ background: "#0d2320" }}>Checked out</option>
              <option value="COMPLETED" style={{ background: "#0d2320" }}>Completed</option>
              <option value="CANCELED" style={{ background: "#0d2320" }}>Canceled</option>
            </select>
          </div>

          {/* Marked */}
          <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-shrink-0">
            <button
              type="button"
              onClick={() => setMarkedOnly((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
              style={markedOnly
                ? { background: "rgba(16,185,129,0.18)", border: "1px solid rgba(16,185,129,0.40)", color: "#6ee7b7" }
                : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)" }}
              title={markedOnly ? "Showing marked only (current page)" : "Show marked only (current page)"}
              aria-pressed={markedOnly}
            >
              <Bookmark className="h-4 w-4" />
              <span className="whitespace-nowrap">Marked</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>({markedKeys.length})</span>
            </button>
            {markedKeys.length > 0 && (
              <button
                type="button"
                onClick={() => setMarkedKeys([])}
                className="px-3 py-2 rounded-lg text-sm transition-colors"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)" }}
                title="Clear all marks"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div style={{ borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)", background: "linear-gradient(135deg, #0a1a19 0%, #0d2320 60%, #0a1f2e 100%)", overflow: "hidden" }}>
        {error && (
          <div className="px-6 py-4 text-sm flex items-start gap-2" style={{ borderBottom: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.10)", color: "#fcd34d" }}>
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}
        {loading ? (
          <>
            {/* Skeleton Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.04)" }}>
                  <tr>
                    {["&nbsp;","Customer","Destination","Dates","Urgency","Group Details","Pickup Info","Created","Status","Actions"].map((h, i) => (
                      <th key={i} className={`px-6 py-3 ${h==="Actions"?"text-right":"text-left"}`} style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.07em", textTransform: "uppercase" }} dangerouslySetInnerHTML={{ __html: h }} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 rounded w-32 mb-2" style={{ background: "rgba(255,255,255,0.08)" }}></div><div className="h-3 rounded w-40" style={{ background: "rgba(255,255,255,0.06)" }}></div></td>
                      <td className="px-6 py-4"><div className="h-4 rounded w-24 mb-2" style={{ background: "rgba(255,255,255,0.08)" }}></div><div className="h-3 rounded w-32" style={{ background: "rgba(255,255,255,0.06)" }}></div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 rounded w-24" style={{ background: "rgba(255,255,255,0.08)" }}></div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="h-6 rounded w-20" style={{ background: "rgba(255,255,255,0.08)" }}></div></td>
                      <td className="px-6 py-4"><div className="h-4 rounded w-20 mb-2" style={{ background: "rgba(255,255,255,0.08)" }}></div><div className="h-3 rounded w-16" style={{ background: "rgba(255,255,255,0.06)" }}></div></td>
                      <td className="px-6 py-4"><div className="h-4 rounded w-28" style={{ background: "rgba(255,255,255,0.08)" }}></div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="h-6 rounded w-16" style={{ background: "rgba(255,255,255,0.08)" }}></div></td>
                      <td className="px-6 py-4 whitespace-nowrap text-right"><div className="h-8 rounded w-16 ml-auto" style={{ background: "rgba(255,255,255,0.08)" }}></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : visibleItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem" }}>
              <Truck style={{ width: 22, height: 22, color: "rgba(255,255,255,0.30)" }} />
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.40)" }}>{markedOnly ? "No marked transport bookings on this page." : "No transport bookings found."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.04)" }}>
                <tr>
                  <th className="px-3 py-3 text-left" style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.07em", textTransform: "uppercase" }}>&nbsp;</th>
                  <SortableHeader label="Customer" keyName="customer" />
                  <SortableHeader label="Destination" keyName="destination" />
                  <SortableHeader label="Dates" keyName="date" />
                  <SortableHeader label="Urgency" keyName="urgency" />
                  <th className="px-6 py-3 text-left" style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.07em", textTransform: "uppercase" }}>Group Details</th>
                  <SortableHeader label="Pickup Info" keyName="pickup" />
                  <SortableHeader label="Created" keyName="created" />
                  <SortableHeader label="Status" keyName="status" />
                  <th className="px-6 py-3 text-right" style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.07em", textTransform: "uppercase" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((booking) => (
                  <tr
                    key={`${booking.kind}:${booking.id}`}
                    className="group transition-colors duration-150 cursor-pointer"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    onClick={(e) => {
                      const el = e.target as HTMLElement | null;
                      if (el?.closest("a,button,input,select,textarea")) return;
                      router.push(getViewHref(booking));
                    }}
                  >
                    <td className="px-3 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleMark(bookingKey(booking));
                        }}
                        aria-label={markedSet.has(bookingKey(booking)) ? "Unmark" : "Mark"}
                        title={markedSet.has(bookingKey(booking)) ? "Unmark" : "Mark"}
                        className="inline-flex items-center justify-center p-1 transition-colors"
                        style={{ color: markedSet.has(bookingKey(booking)) ? "#6ee7b7" : "rgba(255,255,255,0.30)" }}
                      >
                        <Bookmark
                          className="h-4 w-4"
                          fill={markedSet.has(bookingKey(booking)) ? "currentColor" : "none"}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium" style={{ color: "rgba(255,255,255,0.88)" }}>{booking.user.name || "N/A"}</div>
                      <div className="text-sm flex items-center gap-2" style={{ color: "rgba(255,255,255,0.45)" }}>
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
                        <span className="max-w-[240px] truncate" title={booking.user.email || ""}>
                          {booking.user.email || "N/A"}
                        </span>
                      </div>
                      <div className="text-xs flex items-center gap-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                        <Phone className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.20)" }} />
                        <span className="max-w-[240px] truncate" title={booking.user.phone || ""}>
                          {booking.user.phone || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.30)" }} />
                        <div>
                          <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>{booking.toRegion}</div>
                          {booking.toLocation && (
                            <div
                              className="text-xs max-w-[220px] sm:max-w-[320px] overflow-hidden"
                              title={booking.toLocation}
                              style={{ color: "rgba(255,255,255,0.42)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                            >
                              {shortenText(booking.toLocation, 48)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {booking.checkIn && booking.checkOut ? (
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 mt-0.5" style={{ color: "rgba(255,255,255,0.30)" }} />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                              <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.82)" }}>{formatDateShort(booking.checkIn)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-rose-400" aria-hidden="true" />
                              <span className="text-sm" style={{ color: "rgba(255,255,255,0.60)" }}>{formatDateShort(booking.checkOut)}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Flexible</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getUrgencyBadge(booking.urgency, booking.urgencyReason)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium" style={{ color: "rgba(255,255,255,0.82)" }}>{booking.kind === "individual" ? "Individual" : booking.groupType}</div>
                        <div className="text-xs" style={{ color: "rgba(255,255,255,0.42)" }}>
                          {booking.kind === "individual"
                            ? `${booking.roomsQty ?? 1} room(s)`
                            : `${booking.headcount ?? 0} people`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {booking.pickupLocation ? (
                        <div className="text-sm space-y-1">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "rgba(255,255,255,0.30)" }} />
                            <div
                              className="font-medium leading-snug max-w-[240px] sm:max-w-[340px] overflow-hidden"
                              title={booking.pickupLocation}
                              style={{ color: "rgba(255,255,255,0.80)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                            >
                              {shortenText(booking.pickupLocation, 50)}
                            </div>
                          </div>
                          {booking.pickupTime && (
                            <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.42)" }}>
                              <Clock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
                              <span className="leading-snug">{formatPickupTime(booking.pickupTime)}</span>
                            </div>
                          )}
                          {booking.arrangementNotes && booking.kind === "individual" && (
                            <div className="text-xs" style={{ color: "rgba(255,255,255,0.42)" }}>
                              <span className="font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>Vehicle:</span> {booking.arrangementNotes}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color: "rgba(255,255,255,0.28)" }}>—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const v = formatDateTimeShort(booking.createdAt);
                        if (!v) return <span className="text-sm" style={{ color: "rgba(255,255,255,0.28)" }}>—</span>;
                        return (
                          <div className="text-sm leading-snug">
                            <div className="font-medium" style={{ color: "rgba(255,255,255,0.80)" }}>{v.date}</div>
                            <div className="text-xs" style={{ color: "rgba(255,255,255,0.42)" }}>{v.time}</div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusIndicator(booking.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => toggleMark(bookingKey(booking))}
                        aria-label={markedSet.has(bookingKey(booking)) ? "Unmark" : "Mark"}
                        title={markedSet.has(bookingKey(booking)) ? "Unmark" : "Mark"}
                        className="inline-flex items-center justify-center transition-colors mr-3"
                        style={{ color: markedSet.has(bookingKey(booking)) ? "#fcd34d" : "rgba(255,255,255,0.30)" }}
                      >
                        <Bookmark
                          className="h-4 w-4"
                          fill={markedSet.has(bookingKey(booking)) ? "currentColor" : "none"}
                        />
                      </button>
                      <Link
                        href={getViewHref(booking)}
                        aria-label="View"
                        title="View"
                        className="inline-flex items-center text-sm font-medium no-underline"
                        style={{ color: "#6ee7b7" }}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {items.length > 0 && (
        <div style={{ borderRadius: "1rem", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)", background: "linear-gradient(135deg, #0a1a19 0%, #0d2320 60%, #0a1f2e 100%)", padding: "1rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="text-sm" style={{ color: "rgba(255,255,255,0.50)" }}>
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} bookings
          </div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)" }}
            >
              Previous
            </button>
            <div className="px-4 py-2 text-sm font-medium" style={{ color: "rgba(255,255,255,0.60)" }}>
              Page {page} of {pages}
            </div>
            <button
              disabled={page >= pages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)" }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


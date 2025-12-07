"use client";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Building2, ChevronLeft, ChevronRight, Search, X, Eye, Download } from "lucide-react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import TableRow from "@/components/TableRow";

// Use relative paths in browser to leverage Next.js rewrites (avoids CORS issues)
const API = typeof window === 'undefined' 
  ? (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000")
  : '';

const api = axios.create({ baseURL: API });
function authify(){ const t = typeof window!=="undefined" ? localStorage.getItem("token"):null; if(t) api.defaults.headers.common["Authorization"]=`Bearer ${t}`;}

type Row = {
  id:number; name:string|null; email:string; phone:string|null;
  createdAt:string; suspendedAt:string|null; kycStatus:string;
  _count: { properties:number };
};

export default function AdminOwnersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 50;
  const [counts, setCounts] = useState<Record<string, number>>({
    "": 0,
    ACTIVE: 0,
    SUSPENDED: 0,
    PENDING_KYC: 0,
    APPROVED_KYC: 0,
    REJECTED_KYC: 0,
  });

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollControls, setShowScrollControls] = useState(false);
  const [suggestions, setSuggestions] = useState<Row[]>([]);
  const countsKey = useMemo(() => JSON.stringify(counts), [counts]);
  const itemsCount = items?.length ?? 0;

  type OwnersResponse = {
    items: Row[];
    total: number;
    page: number;
    pageSize: number;
  };

  const load = useCallback(async () => {
    try {
      const r = await api.get<OwnersResponse>("/admin/owners", {
        params: { q, status, page, pageSize }
      });
      setItems(r.data.items ?? []);
      setTotal(r.data.total ?? 0);
    } catch (err) {
      // network or server errors shouldn't break the page — log and show empty list
      // eslint-disable-next-line no-console
      console.error('Failed to load owners list', err);
      setItems([]);
      setTotal(0);
    }
  }, [q, status, page]);

  useEffect(() => { authify(); void load(); }, [load]);
  useEffect(() => { void load(); }, [status, page, load]);

  // detect horizontal overflow for status buttons (show arrows on small screens)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let timeout: any;
    const check = () => {
      const has = el.scrollWidth > el.clientWidth + 4;
      setShowScrollControls(has);
    };
    check();
    const onResize = () => { clearTimeout(timeout); timeout = setTimeout(check, 120); };
    el.addEventListener("scroll", check);
    window.addEventListener("resize", onResize);
    const mo = new MutationObserver(() => { clearTimeout(timeout); timeout = setTimeout(check, 80); });
    mo.observe(el, { childList: true, subtree: true });
    return () => { clearTimeout(timeout); el.removeEventListener("scroll", check); window.removeEventListener("resize", onResize); mo.disconnect(); };
  }, [itemsCount, status, q, countsKey]);

  // optional counts fetch; keep zeros if endpoint missing
  useEffect(() => {
    authify(); // Ensure auth header is set
    (async () => {
      try {
        const r = await api.get<Record<string, number>>('/admin/owners/counts', {
          headers: {
            'x-role': 'ADMIN',
            'Content-Type': 'application/json'
          },
          validateStatus: (status) => status < 500 // Don't throw on 4xx errors
        });
        
        // Check if response is actually JSON
        const contentType = r.headers['content-type'];
        if (contentType && contentType.includes('application/json') && r?.data && typeof r.data === 'object') {
          setCounts((p) => ({ ...p, ...r.data }));
        }
      } catch (e: any) {
        // Silently ignore - counts are optional
        // Only log if it's not a 401/403 (auth errors are expected if not logged in)
        if (e?.response?.status !== 401 && e?.response?.status !== 403) {
          console.warn('Failed to fetch owner counts:', e?.message || e);
        }
      }
    })();
  }, []);

  const handleSearch = useCallback(async () => {
    try {
      await load();
    } catch (e) {
      // swallow network errors for UX
    }
    // analytics/logging (fire-and-forget)
    try {
      console.log("[analytics] owners search", { query: q, ts: new Date().toISOString() });
      api.post("/admin/analytics/search", { query: q, timestamp: new Date().toISOString() }).catch(() => {});
    } catch (e) { /* swallow */ }
  }, [load, q]);

  // Debounce automatic search when typing (suggestions)
  useEffect(() => {
    const term = q;
    if (!term || term.trim() === "") {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      (async () => {
        try {
          const r = await api.get<{ items: Row[] }>("/admin/owners", {
            params: { status, q: term, page: 1, pageSize: 5 },
          });
          setSuggestions(r.data.items ?? []);
        } catch (e) {
          setSuggestions([]);
        }
        // also perform the full search to update the main list
        handleSearch().catch(() => {});
      })();
    }, 500);
    return () => clearTimeout(t);
  }, [q, status, handleSearch]);

  // live refresh when KYC/suspend changes
  useEffect(()=>{
    authify();
    // Use direct API URL for Socket.IO in browser to ensure WebSocket works in dev
    const url = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000")
      : (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "");
    const token = typeof window!=="undefined" ? localStorage.getItem("token"):null;
  const s: Socket = io(url, { transports: ['websocket'], auth: token? { token } : undefined });
    s.on("admin:owner:updated", load);
    s.on("admin:kyc:updated", load);
    return ()=>{ s.off("admin:owner:updated", load); s.off("admin:kyc:updated", load); s.disconnect(); };
  },[load]);

  const pages = useMemo(()=> Math.max(1, Math.ceil(total / pageSize)),[total]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <Building2 className="h-8 w-8 text-gray-400 mb-3" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Owners
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage platform owners and KYC status
          </p>
        </div>
        <div className="flex justify-center mt-4">
          <button 
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:border-[#02665e] hover:text-[#02665e] transition-all duration-200 font-medium text-sm"
            onClick={() => alert('Export owners - implement server side export')}
          >
            <Download className="h-4 w-4" />
            Export owners
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-4xl mx-auto">
          {/* Search Box */}
          <div className="relative w-full sm:flex-1 min-w-0 sm:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none text-sm box-border"
                placeholder="Search name, email, or phone"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); setPage(1); load(); }
                }}
                aria-label="Search owners"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setPage(1);
                    load();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* Suggestions dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 z-10">
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setQ(s.name ?? s.email);
                        setSuggestions([]);
                        setPage(1);
                        handleSearch().catch(() => {});
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm transition-colors"
                    >
                      <div className="font-medium">{s.name ?? s.email}</div>
                      <div className="text-xs text-gray-500">{s.email}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative w-full sm:w-auto sm:flex-shrink-0">
            <div 
              ref={scrollRef} 
              className="status-filter-scroll flex gap-2 justify-start sm:justify-center overflow-x-auto px-2 -mx-2 sm:flex-wrap snap-x snap-mandatory"
              style={{ 
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              } as React.CSSProperties}
            >
              {[
                { label: "All", value: "" },
                { label: "Active", value: "ACTIVE" },
                { label: "Pending KYC", value: "PENDING_KYC" },
                { label: "Approved KYC", value: "APPROVED_KYC" },
                { label: "Rejected KYC", value: "REJECTED_KYC" },
                { label: "Suspended", value: "SUSPENDED" },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => { setStatus(s.value); setPage(1); }}
                  className={`px-3 py-1.5 rounded-full border text-sm flex items-center gap-2 flex-shrink-0 transition-all duration-200 snap-start ${
                    status === s.value 
                      ? 'bg-[#02665e] text-white border-[#02665e] shadow-sm' 
                      : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
                  }`}
                >
                  <span className="whitespace-nowrap">{s.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                    status === s.value 
                      ? 'bg-white/20 text-white' 
                      : badgeClasses(s.value)
                  }`}>
                    {counts[s.value ?? ''] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {showScrollControls && (
              <>
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:hidden bg-gradient-to-r from-white via-white to-transparent z-10" />
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:hidden bg-gradient-to-l from-white via-white to-transparent z-10" />

                <button
                  type="button"
                  onClick={() => scrollRef.current?.scrollBy({ left: -150, behavior: "smooth" })}
                  className="sm:hidden absolute left-2 top-1/2 -translate-y-1/2 bg-white border-2 border-gray-300 rounded-full p-2 shadow-lg opacity-90 hover:opacity-100 focus:opacity-100 active:scale-95 transition-all z-20 touch-manipulation"
                  aria-label="Scroll left"
                  title="Scroll left"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-700" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRef.current?.scrollBy({ left: 150, behavior: "smooth" })}
                  className="sm:hidden absolute right-2 top-1/2 -translate-y-1/2 bg-white border-2 border-gray-300 rounded-full p-2 shadow-lg opacity-90 hover:opacity-100 focus:opacity-100 active:scale-95 transition-all z-20 touch-manipulation"
                  aria-label="Scroll right"
                  title="Scroll right"
                >
                  <ChevronRight className="h-4 w-4 text-gray-700" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Properties</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KYC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Joined</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {itemsCount === 0 ? (
                <TableRow hover={false}>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                    No owners found.
                  </td>
                </TableRow>
              ) : (
                (items || []).map(o => (
                  <TableRow key={o.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 truncate">{o.name ?? "-"}</div>
                      <div className="text-xs text-gray-500 md:hidden mt-1">
                        {o.email} {o.phone ? `• ${o.phone}` : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="text-sm text-gray-900">{o.email}</div>
                      <div className="text-sm text-gray-500">{o.phone ?? "-"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="text-sm text-gray-900 font-medium">{o._count.properties}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge(o.kycStatus)}`} aria-label={`KYC: ${kycLabel(o.kycStatus)}`}>
                        {kycLabel(o.kycStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {o.suspendedAt ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="text-sm text-gray-900">
                        {new Date(o.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a 
                        href={`/admin/owners/${o.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#02665e] border border-[#02665e] rounded-lg hover:bg-[#02665e] hover:text-white transition-all duration-200"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </a>
                    </td>
                  </TableRow>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-6 py-4 shadow-sm">
        <div className="text-sm text-gray-700">
          Total: <span className="font-medium">{total}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            disabled={page <= 1} 
            onClick={() => setPage(p => p - 1)} 
            className="inline-flex items-center justify-center p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#02665e] hover:text-[#02665e] transition-all duration-200"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-sm text-gray-700 px-3">
            Page <span className="font-medium">{page}</span> / <span className="font-medium">{pages}</span>
          </div>
          <button 
            disabled={page >= pages} 
            onClick={() => setPage(p => p + 1)} 
            className="inline-flex items-center justify-center p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#02665e] hover:text-[#02665e] transition-all duration-200"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function badge(status:string){
  // Use similar semantic colors as the status buttons (slightly stronger bg)
  if (status === "APPROVED_KYC") return "bg-emerald-50 border border-emerald-200 text-emerald-700";
  if (status === "REJECTED_KYC") return "bg-red-50 border border-red-200 text-red-700";
  if (status === "PENDING_KYC") return "bg-amber-50 border border-amber-200 text-amber-800";
  return "bg-gray-50 border border-gray-200 text-gray-700";
}

function kycLabel(status: string) {
  switch (status) {
    case "APPROVED_KYC":
      return "Approved";
    case "REJECTED_KYC":
      return "Rejected";
    case "PENDING_KYC":
      return "Pending";
    default:
      // fallback: prettify unknown codes
      return status ? status.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (t) => t.toUpperCase()) : "Unknown";
  }
}

function badgeClasses(v: string) {
  switch (v) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700";
    case "PENDING_KYC":
      return "bg-amber-100 text-amber-800";
    case "APPROVED_KYC":
      return "bg-emerald-100 text-emerald-700";
    case "REJECTED_KYC":
      return "bg-red-100 text-red-700";
    case "SUSPENDED":
      return "bg-indigo-100 text-indigo-700";
    case "":
    default:
      return "bg-gray-100 text-gray-700";
  }
}
// apps/api/src/routes/admin.owners.ts
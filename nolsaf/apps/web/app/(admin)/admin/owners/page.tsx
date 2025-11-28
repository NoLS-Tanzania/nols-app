"use client";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import { io, Socket } from "socket.io-client";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });
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
    (async () => {
      try {
        const r = await api.get<Record<string, number>>('/admin/owners/counts');
        if (r?.data) setCounts((p) => ({ ...p, ...r.data }));
      } catch (e) { /* ignore */ }
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
    // Use relative paths in browser to leverage Next.js rewrites (avoids CORS issues)
    const url = typeof window === 'undefined' 
      ? (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "")
      : undefined;
    const token = typeof window!=="undefined" ? localStorage.getItem("token"):null;
  const s: Socket = io(url, { transports: ['websocket'], auth: token? { token } : undefined });
    s.on("admin:owner:updated", load);
    s.on("admin:kyc:updated", load);
    return ()=>{ s.off("admin:owner:updated", load); s.off("admin:kyc:updated", load); s.disconnect(); };
  },[load]);

  const pages = useMemo(()=> Math.max(1, Math.ceil(total / pageSize)),[total]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col items-center text-center">
        <div className="rounded-full bg-blue-50 p-3 inline-flex items-center justify-center">
          <Users className="h-6 w-6 text-blue-600" />
        </div>
        <h1 className="mt-3 text-2xl font-semibold">Owners</h1>
        <div className="mt-2 w-full max-w-3xl flex flex-col sm:flex-row items-center sm:items-center justify-between gap-3">
          <p className="text-sm text-gray-500 m-0">Manage platform owners and KYC status</p>
          <div className="flex items-center">
            <div className="relative w-full max-w-md">
              <div className="border rounded-full bg-white shadow-sm">
                <input
                  className="w-full px-4 py-2 pr-4 rounded-full outline-none text-sm"
                  placeholder="Search name/email/phone"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Search owners"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); setPage(1); load(); }
                    if (e.key === 'Escape') { /* nothing to clear here */ }
                  }}
                />
              </div>
                {/* Suggestions dropdown: shows up to 5 recommended matches while typing */}
                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 z-10">
                    <div className="bg-white border rounded shadow max-h-56 overflow-auto">
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
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                        >
                          <div className="font-medium">{s.name ?? s.email}</div>
                          <div className="text-xs opacity-60">{s.email}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2 justify-center">
        <div className="w-full max-w-3xl mx-auto flex justify-center">
          <div className="relative w-full">
            <div ref={scrollRef} className="flex gap-2 justify-center overflow-x-auto px-2 -mx-2 sm:flex-wrap snap-x snap-mandatory">
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
                  className={"px-3 py-1 rounded-full border text-sm flex items-center gap-2 flex-shrink-0 " + (status === s.value ? 'bg-gray-100 border-gray-300' : 'bg-white hover:bg-gray-50')}
                >
                  <span>{s.label}</span>
                  <span className={"text-xs px-2 py-0.5 rounded-full " + badgeClasses(s.value)}>{counts[s.value ?? ''] ?? 0}</span>
                </button>
              ))}
            </div>

            {showScrollControls && (
              <>
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:hidden bg-gradient-to-r from-white to-transparent" />
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:hidden bg-gradient-to-l from-white to-transparent" />

                <button
                  type="button"
                  onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: "smooth" })}
                  className="sm:hidden absolute left-1 top-1/2 -translate-y-1/2 bg-white border rounded-full p-1 shadow opacity-40 hover:opacity-100 focus:opacity-100 transition-opacity"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: "smooth" })}
                  className="sm:hidden absolute right-1 top-1/2 -translate-y-1/2 bg-white border rounded-full p-1 shadow opacity-40 hover:opacity-100 focus:opacity-100 transition-opacity"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Responsive table: hide less-important columns on small screens */}
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Owner</th>
              <th className="text-left p-2 hidden md:table-cell">Contact</th>
              <th className="text-left p-2 hidden md:table-cell">Properties</th>
              <th className="text-left p-2">KYC</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2 hidden md:table-cell">Joined</th>
              <th className="text-right p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(items || []).map(o => (
              <tr key={o.id} className="border-t">
                <td className="p-2">
                  <div className="font-medium truncate">{o.name ?? "-"}</div>
                  {/* on small screens we show a compact secondary line to keep rows useful */}
                  <div className="text-xs text-gray-500 md:hidden">{o.email} {o.phone ? `• ${o.phone}` : ''}</div>
                </td>
                <td className="p-2 hidden md:table-cell">
                  <div>{o.email}</div>
                  <div className="opacity-70">{o.phone ?? "-"}</div>
                </td>
                <td className="p-2 hidden md:table-cell">{o._count.properties}</td>
                <td className="p-2">
                  <span className={`px-2 py-0.5 rounded border text-xs ${badge(o.kycStatus)}`} aria-label={`KYC: ${kycLabel(o.kycStatus)}`}>{kycLabel(o.kycStatus)}</span>
                </td>
                <td className="p-2">
                  {o.suspendedAt ? <span className="px-2 py-0.5 rounded border text-xs bg-red-50 border-red-200 text-red-700">Suspended</span>
                                  : <span className="px-2 py-0.5 rounded border text-xs bg-emerald-50 border-emerald-200 text-emerald-700">Active</span>}
                </td>
                <td className="p-2 hidden md:table-cell">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="p-2 text-right">
                  <a href={`/admin/owners/${o.id}`} className="px-3 py-1 rounded bg-emerald-600 text-white">Open</a>
                </td>
              </tr>
            ))}
            {itemsCount === 0 && (
              <tr><td colSpan={7} className="p-4 text-center opacity-60">No owners found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs opacity-70">Total: {total}</div>
        <div className="flex gap-2">
          <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
          <div className="text-sm px-2 py-1">Page {page} / {pages}</div>
          <button disabled={page>=pages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}

function badge(status:string){
  // Use similar semantic colors as the status buttons (slightly stronger bg)
  if (status === "APPROVED_KYC") return "bg-emerald-100 border-emerald-200 text-emerald-700";
  if (status === "REJECTED_KYC") return "bg-red-100 border-red-200 text-red-700";
  if (status === "PENDING_KYC") return "bg-amber-100 border-amber-200 text-amber-800";
  return "bg-gray-100 border-gray-200 text-gray-700";
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
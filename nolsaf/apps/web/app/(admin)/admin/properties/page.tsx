"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { Home, ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import { io, Socket } from "socket.io-client";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });
function authify() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
}

type Row = {
  id: number;
  title: string;
  status: string;
  type: string;
  photos?: string[];
  regionName?: string | null;
  district?: string | null;
  updatedAt?: string;
  owner?: { id: number; name?: string | null; email?: string | null; phone?: string | null } | null;
};

export default function AdminPropertiesPage() {
  const [status, setStatus] = useState<string>("PENDING");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<number[]>([]);
  const [suggestions, setSuggestions] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    DRAFT: 0,
    PENDING: 0,
    APPROVED: 0,
    NEEDS_FIXES: 0,
    REJECTED: 0,
    SUSPENDED: 0,
  });

  const badgeClasses = (v: string) => {
    switch (v) {
      case "APPROVED":
        return "bg-green-100 text-green-700";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "NEEDS_FIXES":
        return "bg-amber-100 text-amber-800";
      case "REJECTED":
        return "bg-red-100 text-red-700";
      case "SUSPENDED":
        return "bg-indigo-100 text-indigo-700";
      case "DRAFT":
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollControls, setShowScrollControls] = useState(false);

  // derived count to avoid accessing items.length when items may be undefined
  const itemsCount = items?.length ?? 0;

  // detect horizontal overflow and toggle scroll hints/arrows
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let timeout: any;
    const check = () => {
      const has = el.scrollWidth > el.clientWidth + 4;
      setShowScrollControls(has);
    };
    // initial check
    check();
    const onResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(check, 120);
    };
    el.addEventListener("scroll", check);
    window.addEventListener("resize", onResize);
    // also observe content changes
    const mo = new MutationObserver(() => { clearTimeout(timeout); timeout = setTimeout(check, 80); });
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      clearTimeout(timeout);
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", onResize);
      mo.disconnect();
    };
    // re-run when items, counts, query or status change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsCount, status, q, suggestions.length, JSON.stringify(counts)]);

  async function load() {
    setLoading(true);
    const r = await api.get<{ items: Row[]; total?: number }>("/admin/properties", {
      params: { status, q, page: 1, pageSize: 30 },
    });
    setItems(r.data.items);
    setSel([]);
    setLoading(false);
  }

  // initial mount: auth and fetch the default list (use explicit fetch to avoid hook-dep lint)
  useEffect(() => {
    authify();
    (async () => {
      setLoading(true);
      try {
        const r = await api.get<{ items: Row[]; total?: number }>("/admin/properties", {
          params: { status: "PENDING", q: "", page: 1, pageSize: 30 },
        });
        setItems(r.data.items);
        setSel([]);
      } catch (e) {
        // ignore
      }
      setLoading(false);
    })();
  }, []);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // live refresh on moderation events
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "";
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const s: Socket = io(url, { auth: token ? { token } : undefined });
    const refresh = () => load();
    s.on("admin:property:status", refresh);
    return () => {
      s.off("admin:property:status", refresh);
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allChecked = useMemo(() => sel.length > 0 && sel.length === itemsCount, [sel, itemsCount]);
  const toggleAll = () => setSel(allChecked ? [] : (items || []).map((i) => i.id));
  const toggleOne = (id: number) => setSel((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // Search handler: show compact loading state while running
  const handleSearch = async () => {
    try {
      await load();
    } catch (e) {
      // swallow network errors for UX
    }
    // analytics/logging (fire-and-forget). Keep it silent if endpoint missing.
    try {
      console.log("[analytics] search", { query: q, ts: new Date().toISOString() });
      api.post("/admin/analytics/search", { query: q, timestamp: new Date().toISOString() }).catch(() => {});
    } catch (e) {
      /* swallow */
    }
  };

  // Debounce automatic search when typing
  useEffect(() => {
    const term = q;
    if (!term || term.trim() === "") {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      (async () => {
        try {
          const r = await api.get<{ items: Row[] }>('/admin/properties', {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // try to fetch counts for each status (non-blocking); keep zeros if endpoint missing
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<Record<string, number>>('/admin/properties/counts');
        if (r?.data) setCounts((prev) => ({ ...prev, ...r.data }));
      } catch (e) {
        // ignore if backend doesn't expose counts
      }
    })();
  }, []);


  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col items-center text-center">
        <div className="rounded-full bg-blue-50 p-3 inline-flex items-center justify-center">
          <Home className="h-6 w-6 text-blue-600" />
        </div>
        <h1 className="mt-3 text-2xl font-semibold">Property Moderation</h1>
        <div className="mt-2 w-full max-w-3xl flex flex-col sm:flex-row items-center sm:items-center justify-between gap-3">
          <p className="text-sm text-gray-500 m-0">Review and manage property listings</p>
          <div className="flex items-center">
            <div className="relative w-full max-w-md">
              <div className="border rounded-full bg-white shadow-sm">
                <input
                  className="w-full px-4 py-2 pr-4 rounded-full outline-none text-sm"
                  placeholder="Search title/region/district"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Search properties"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                    if (e.key === 'Escape') {
                      setSuggestions([]);
                    }
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
                          setQ(s.title);
                          setSuggestions([]);
                          // run full search for the chosen suggestion
                          handleSearch().catch(() => {});
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                      >
                        <div className="font-medium">{s.title}</div>
                        <div className="text-xs opacity-60">{s.regionName ?? '-'}{s.district ? `, ${s.district}` : ''}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="w-full max-w-3xl mx-auto flex justify-center">
          {/* Status buttons (Drafts, Pending, Approved, Need Fixes, Rejected, Suspended) */}
          <div className="relative w-full">
            <div
              ref={scrollRef}
              className="flex gap-2 justify-center overflow-x-auto px-2 -mx-2 sm:flex-wrap snap-x snap-mandatory"
            >
            {[
              { label: "Drafts", value: "DRAFT" },
              { label: "Pending", value: "PENDING" },
              { label: "Approved", value: "APPROVED" },
              { label: "Need Fixes", value: "NEEDS_FIXES" },
              { label: "Rejected", value: "REJECTED" },
              { label: "Suspended", value: "SUSPENDED" },
            ].map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(s.value)}
                className={"px-3 py-1 rounded-full border text-sm flex items-center gap-2 flex-shrink-0 " + (status === s.value ? 'bg-gray-100 border-gray-300' : 'bg-white hover:bg-gray-50')}
              >
                <span>{s.label}</span>
                <span className={"text-xs px-2 py-0.5 rounded-full " + badgeClasses(s.value)}>{counts[s.value] ?? 0}</span>
              </button>
            ))}
            </div>

            {/* left/right gradient hints (small screens only) */}
            {showScrollControls && (
              <>
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:hidden bg-gradient-to-r from-white to-transparent" />
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:hidden bg-gradient-to-l from-white to-transparent" />

                {/* scroll arrows for small screens */}
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

        <div className="flex items-center gap-2 justify-end">
          {/* search moved to header area */}
        </div>
      </div>

      {loading && <div>Loading…</div>}
      {!loading && itemsCount === 0 && <div className="text-sm opacity-70">No properties.</div>}

      {itemsCount > 0 && (
        <div className="grid gap-3">
          {/* header row */}
          <div className="grid grid-cols-[32px_72px_1fr_220px_120px_160px_90px] gap-2 px-2 text-xs uppercase opacity-70">
            <div>
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleAll}
                aria-label="Select all properties"
                title="Select all properties"
              />
            </div>
            <div>Photos</div>
            <div>Property</div>
            <div>Owner</div>
            <div>Status</div>
            <div>Location</div>
            <div>Open</div>
          </div>

          {(items || []).map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[32px_72px_1fr_220px_120px_160px_90px] gap-2 items-center bg-white border rounded-xl p-2"
            >
              <div>
                <input
                  type="checkbox"
                  checked={sel.includes(p.id)}
                  onChange={() => toggleOne(p.id)}
                  title={`Select property #${p.id}`}
                  aria-label={`Select property #${p.id}`}
                />
              </div>

              {/* photos */}
              <div className="flex -space-x-2 items-center">
                {(p.photos ?? []).slice(0, 3).map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={u} alt="" className="w-10 h-10 rounded border object-cover" />
                ))}
                {(p.photos?.length ?? 0) > 3 && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded border bg-white">+{(p.photos!.length - 3)}</span>
                )}
              </div>

              {/* property */}
              <div className="min-w-[260px]">
                <div className="font-medium">
                  {p.title} <span className="text-xs opacity-60">• {p.type}</span>
                </div>
                {p.updatedAt && (
                  <div className="text-[11px] opacity-60">Updated: {new Date(p.updatedAt).toLocaleString()}</div>
                )}
              </div>

              {/* owner */}
              <div className="text-xs">
                {p.owner?.name ?? "-"}
                <div className="opacity-60">{p.owner?.phone ?? p.owner?.email ?? ""}</div>
              </div>

              {/* status */}
              <div className="text-xs px-2 py-1 rounded border w-max">{p.status}</div>

              {/* location */}
              <div className="text-xs">
                {p.regionName ?? "-"}
                {p.district ? `, ${p.district}` : ""}
              </div>

              {/* open */}
              <div>
                <a className="px-3 py-1 rounded bg-emerald-600 text-white" href={`/admin/properties/${p.id}`}>
                  Open
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

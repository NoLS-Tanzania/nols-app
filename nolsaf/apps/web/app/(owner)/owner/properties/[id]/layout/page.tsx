"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calendar, RefreshCw, Home, Sparkles, X, Users, Clock, CheckCircle2 } from "lucide-react";
import { io, type Socket } from "socket.io-client";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

type Door = { x:number; y:number; dir:"N"|"S"|"E"|"W" };
type Rect = { w:number; h:number };
type Pos = { x:number; y:number };
type RoomNode = {
  id:string; name:string; pos:Pos; size:Rect; doors:Door[];
  pricePerNight:number; photos:string[]; amenities:string[]; accessible:boolean; code:string;
};
type SpaceNode = { id:string; type:string; name?:string; pos:Pos; size:Rect };
type Floor = { id:string; label:string; size:Rect; rooms:RoomNode[]; spaces:SpaceNode[] };
type Layout = { version:1; metric:"cm"; entrances:{floor:string;space:string}[]; floors:Floor[] };

type AvItem = {
  code:string;
  busy:boolean;
  occupancyPct:number;  // 0..100
  nightsBooked:number;
  nightsTotal:number;
  bookings:{id:number;checkIn:string;checkOut:string;status:string;guestName:string | null;totalAmount:number | null}[];
};
type Availability = { window:{from:string;to:string}; rooms:AvItem[]; nightsTotal:number };

const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  // Prefer IPv4 loopback in dev to avoid IPv6 ::1 binding issues on some systems.
  return typeof window !== "undefined" ? "http://127.0.0.1:4000" : "";
};

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const lsToken =
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("nolsaf_token") ||
    window.localStorage.getItem("__Host-nolsaf_token");
  if (lsToken) return lsToken;
  const m = String(document.cookie || "").match(/(?:^|;\s*)(?:nolsaf_token|__Host-nolsaf_token|token)=([^;]+)/);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

export default function OwnerPropertyLayoutPage() {
  const routeParams = useParams<{ id?: string | string[] }>();
  const idParam = Array.isArray(routeParams?.id) ? routeParams?.id?.[0] : routeParams?.id;
  const propertyId = Number(idParam);
  const [layout, setLayout] = useState<Layout|null>(null);
  const [activeFloor, setActiveFloor] = useState<string|undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<{ room: RoomNode; bookings: AvItem['bookings'] } | null>(null);

  // date range for overlay
  const todayISO = new Date().toISOString().slice(0,10);
  const tomorrowISO = new Date(Date.now()+86400000).toISOString().slice(0,10);
  const [from, setFrom] = useState<string>(todayISO);
  const [to, setTo] = useState<string>(tomorrowISO);

  // Format date as "DD MMM YY" (e.g., "17 Jan 26")
  const formatDateShort = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const year = date.getFullYear() % 100; // Get 2-digit year
    return `${day} ${monthNames[date.getMonth()]} ${year}`;
  };

  // availability map
  const [availability, setAvailability] = useState<Record<string, AvItem>>({});

  useEffect(()=>{
    if (!Number.isFinite(propertyId) || propertyId <= 0) return;
    (async()=>{
      try {
        setError(null);
        const r = await api.get<Layout| null>(`/api/owner/properties/${propertyId}/layout`);
        if (!r.data) {
          const g = await api.post<Layout>(`/api/owner/properties/${propertyId}/layout/generate`);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout/page.tsx:82',message:'Layout generated from API',data:{floorsCount:g.data.floors?.length || 0,floorIds:g.data.floors?.map((f:any)=>f.id) || [],floorLabels:g.data.floors?.map((f:any)=>f.label) || []},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          setLayout(g.data);
          if (g.data.floors && g.data.floors.length > 0) {
            setActiveFloor(g.data.floors[0].id);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout/page.tsx:85',message:'Active floor set after generation',data:{activeFloorId:g.data.floors[0].id,allFloors:g.data.floors.map((f:any)=>({id:f.id,label:f.label}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
          }
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout/page.tsx:88',message:'Layout fetched from API',data:{floorsCount:r.data.floors?.length || 0,floorIds:r.data.floors?.map((f:any)=>f.id) || [],floorLabels:r.data.floors?.map((f:any)=>f.label) || [],fullLayout:JSON.stringify(r.data).substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          setLayout(r.data);
          if (r.data.floors && r.data.floors.length > 0) {
            setActiveFloor(r.data.floors[0].id);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout/page.tsx:91',message:'Active floor set after fetch',data:{activeFloorId:r.data.floors[0].id,allFloors:r.data.floors.map((f:any)=>({id:f.id,label:f.label}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
          }
        }
      } catch (e: any) {
        const msg = e?.response?.data?.error || e?.message || "Failed to load floor plan";
        setError(String(msg));
      }
      finally { setLoading(false); }
    })();
  },[propertyId]);

  const fetchAvailability = useCallback(async () => {
    if (!from || !to) return;
    try {
      const r = await api.get<Availability>(`/api/owner/properties/${propertyId}/availability`, { params: { from, to }});
      const map: Record<string, AvItem> = {};
      for (const it of r.data.rooms) map[it.code] = it;
      setAvailability(map);
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Failed to load availability overlay";
      setError(String(msg));
    }
  }, [from, to, propertyId]);

  // Connect live updates when the page is open.
  useEffect(() => {
    if (!Number.isFinite(propertyId) || propertyId <= 0) return;
    const socketUrl = getSocketUrl();
    if (!socketUrl) return;

    const token = getAuthToken();
    const s = io(socketUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      ...(token
        ? {
            transportOptions: {
              polling: {
                extraHeaders: { Authorization: `Bearer ${token}` },
              },
            },
          }
        : {}),
    });

    socketRef.current = s;
    s.on("connect", () => {
      setConnected(true);
      s.emit("join-property-availability", { propertyId });
    });
    s.on("disconnect", () => setConnected(false));
    s.on("connect_error", () => setConnected(false));

    // Any availability update -> refresh overlay (best-effort)
    s.on("availability:update", (payload: any) => {
      if (payload?.propertyId && Number(payload.propertyId) !== propertyId) return;
      fetchAvailability();
    });

    return () => {
      try {
        s.emit("leave-property-availability", { propertyId });
      } catch {}
      s.disconnect();
      socketRef.current = null;
    };
  }, [propertyId, fetchAvailability]);

  useEffect(() => {
    if (layout) {
      fetchAvailability();
    }
  }, [layout, fetchAvailability]);

  const floor = useMemo(()=> {
    if (!layout || !layout.floors || layout.floors.length === 0) return null;
    // Find floor by activeFloor, or default to first floor
    const result = layout.floors.find(f=>f.id===activeFloor) ?? layout.floors[0];
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout/page.tsx:170',message:'Floor computed from useMemo',data:{activeFloor,computedFloorId:result?.id,computedFloorLabel:result?.label,allFloorIds:layout.floors.map((f:any)=>f.id),allFloorLabels:layout.floors.map((f:any)=>f.label),roomsCount:result?.rooms?.length || 0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return result;
  }, [layout, activeFloor]);

  // Log when activeFloor changes
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout/page.tsx:167',message:'ActiveFloor state changed',data:{activeFloor,floorId:floor?.id,floorLabel:floor?.label},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  }, [activeFloor, floor]);

  if (loading) return <div className="p-6">Loading layout…</div>;
  if (!layout || !layout.floors || layout.floors.length === 0) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-lg font-semibold">Floor plan unavailable</div>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
        <div className="text-sm text-slate-600">Try refreshing, or regenerate the layout.</div>
      </div>
    );
  }
  if (!floor) {
    // If no floor is selected, select the first one
    if (layout.floors.length > 0 && !activeFloor) {
      setActiveFloor(layout.floors[0].id);
    }
    return <div className="p-6">Loading floor…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[860px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[420px] w-[520px] rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href={`/owner/properties/${propertyId}/availability/manage`}
              className="no-underline mt-1 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
            >
              <ChevronLeft className="h-4 w-4" />
              Availability
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Floor Plan</h1>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${connected ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/5 text-white/70"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-300 animate-pulse" : "bg-white/30"}`} />
                  {connected ? "Connected" : "Offline"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
                  <Home className="h-3.5 w-3.5" />
                  {layout.floors.length} floors
                </span>
              </div>
              <p className="mt-1 text-sm text-white/60">See occupancy overlay and quickly jump between floors.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white transition"
              onClick={fetchAvailability}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
              onClick={async()=>{
                const r = await api.post<Layout>(`/api/owner/properties/${propertyId}/layout/generate`);
                setLayout(r.data);
                setActiveFloor(r.data.floors[0]?.id);
                fetchAvailability();
              }}
            >
              <Sparkles className="h-4 w-4" />
              Regenerate
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <aside className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-white/70" />
                  <h2 className="text-sm font-semibold text-white">Overlay window</h2>
                </div>
                <span className="text-xs text-white/50">Availability</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-white/60" htmlFor="date-from">From</label>
                  <div className="relative mt-1">
                    <input
                      id="date-from"
                      type="date"
                      value={from}
                      onChange={e=>setFrom(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      aria-label="From date"
                    />
                    <div className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 pointer-events-none">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{formatDateShort(from)}</span>
                        <Calendar className="h-4 w-4 text-white/50" />
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/60" htmlFor="date-to">To</label>
                  <div className="relative mt-1">
                    <input
                      id="date-to"
                      type="date"
                      value={to}
                      onChange={e=>setTo(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      aria-label="To date"
                    />
                    <div className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 pointer-events-none">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{formatDateShort(to)}</span>
                        <Calendar className="h-4 w-4 text-white/50" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-white/50">Colors show % booked per room for the selected window.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-white">Floors</h2>
                <span className="text-xs text-white/50">Switch view</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {layout.floors && layout.floors.length > 0 ? (
                  layout.floors.map(f=>{
                    const isActive = floor && f.id === floor.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                          isActive
                            ? "border-emerald-400/30 bg-emerald-400/10 text-white shadow-lg shadow-emerald-400/20"
                            : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/20"
                        }`}
                        onClick={()=>{
                          // #region agent log
                          fetch('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout/page.tsx:295',message:'Floor button clicked',data:{clickedFloorId:f.id,clickedFloorLabel:f.label,currentActiveFloor:activeFloor,currentFloorId:floor?.id,willSwitch:activeFloor !== f.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                          // #endregion
                          setActiveFloor(f.id);
                        }}
                      >
                        {f.label}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-white/50">No floors available</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20">
              <h2 className="text-sm font-semibold text-white">Legend</h2>
              <div className="mt-4 space-y-2 text-sm">
                <span className="flex items-center gap-2 text-white/70"><ColorBox hex="#22c55e" /> 0% (Free)</span>
                <span className="flex items-center gap-2 text-white/70"><ColorBox hex="#f59e0b" /> 50% (Half)</span>
                <span className="flex items-center gap-2 text-white/70"><ColorBox hex="#ef4444" /> 100% (Busy)</span>
              </div>
            </div>
          </aside>

          <main className="lg:col-span-8 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20">
              <h2 className="text-sm font-semibold text-white">Plan</h2>
              <p className="mt-1 text-xs text-white/60">Tip: click a room to open a new booking tab.</p>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white">
                <svg
                  className="w-full"
                  viewBox={`0 0 ${floor.size.w} ${floor.size.h}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Pattern definition for fully booked rooms */}
                  <defs>
                    <pattern id="booked-pattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="0" x2="8" y2="8" stroke="#dc2626" strokeWidth="1" opacity="0.4"/>
                    </pattern>
                  </defs>
        {/* spaces */}
        {floor.spaces.map((s, spaceIndex)=>(
          <g key={s.id ? `space-${floor.id}-${s.id}` : `space-${floor.id}-${spaceIndex}`}>
            <rect x={s.pos.x} y={s.pos.y} width={s.size.w} height={s.size.h} fill="#f3f4f6" stroke="#9ca3af" />
            <text x={s.pos.x + 8} y={s.pos.y + 18} fontSize="16" fill="#374151">{s.name ?? s.type}</text>
          </g>
        ))}

        {/* rooms with gradient availability */}
        {floor.rooms.map((r, roomIndex)=>{
          const av = availability[r.code];
          const pct = av?.occupancyPct ?? 0; // 0..100
          const isBooked = pct > 0;
          const isFullyBooked = pct >= 100;
          // More distinct colors: green for free, amber for partial, red for fully booked
          const fill = isFullyBooked ? "#fee2e2" : isBooked ? "#fef3c7" : "#dcfce7"; // red-100, amber-100, green-100
          const stroke = isFullyBooked ? "#dc2626" : isBooked ? "#d97706" : "#16a34a"; // red-600, amber-600, green-600
          const strokeWidth = isBooked ? 3 : 2;
          const label = isFullyBooked ? "Fully Booked" : isBooked ? `${pct}% Booked` : "Available";
          // Text colors that contrast well
          const textColor = isFullyBooked ? "#991b1b" : isBooked ? "#92400e" : "#166534"; // red-800, amber-800, green-800
          const priceColor = "#1f2937"; // slate-800 for price (always readable)
          return (
            <g key={`room-${floor.id}-${r.code || r.id || roomIndex}`} className="cursor-pointer" onClick={()=>{
              setSelectedRoom({ room: r, bookings: av?.bookings || [] });
            }}>
              <title>{`${r.name} — ${label}`}</title>
              <rect 
                x={r.pos.x} 
                y={r.pos.y} 
                width={r.size.w} 
                height={r.size.h} 
                fill={fill} 
                stroke={stroke} 
                strokeWidth={strokeWidth}
                rx="4"
                className="transition-all hover:opacity-90"
              />
              {/* Pattern overlay for fully booked rooms */}
              {isFullyBooked && (
                <rect 
                  x={r.pos.x} 
                  y={r.pos.y} 
                  width={r.size.w} 
                  height={r.size.h} 
                  fill="url(#booked-pattern)"
                  opacity="0.3"
                />
              )}
              {r.doors.map((d, i)=>(
                <line key={i} x1={d.x-10} y1={d.y} x2={d.x+10} y2={d.y} stroke="#111827" strokeWidth={3}/>
              ))}
              {/* Room name - larger and bold */}
              <text 
                x={r.pos.x + 10} 
                y={r.pos.y + 24} 
                fontSize="22" 
                fill={textColor}
                fontWeight="700"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {r.name}
              </text>
              {/* Price - larger */}
              <text 
                x={r.pos.x + 10} 
                y={r.pos.y + 46} 
                fontSize="18" 
                fill={priceColor}
                fontWeight="600"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {new Intl.NumberFormat(undefined,{style:"currency", currency:"TZS"}).format(r.pricePerNight)}
              </text>
              {/* Status label - larger and prominent */}
              <text 
                x={r.pos.x + 10} 
                y={r.pos.y + 68} 
                fontSize="16" 
                fill={textColor}
                fontWeight="700"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {label}
              </text>
            </g>
          );
        })}
                </svg>
              </div>

              <div className="mt-3 text-xs text-white/50">Schematic plan (not for construction).</div>
            </div>
          </main>
        </div>
      </div>

      {/* Room Details Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 border-b border-slate-200/60 bg-gradient-to-br from-white via-slate-50/30 to-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/20 flex-shrink-0">
                    <Home className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                      {selectedRoom.room.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Room Code: {selectedRoom.room.code || "N/A"} • {selectedRoom.room.pricePerNight ? new Intl.NumberFormat(undefined,{style:"currency", currency:"TZS"}).format(selectedRoom.room.pricePerNight) : "Price N/A"} per night
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all flex-shrink-0"
                  title="Close"
                  aria-label="Close room details"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
              {/* Bookings Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wider">Existing Bookings</h3>
                </div>
                {selectedRoom.bookings.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-50" />
                    <p className="text-sm font-medium">No bookings found</p>
                    <p className="text-xs mt-1">This room is available for the selected period</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedRoom.bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-4 h-4 text-slate-600" />
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {booking.guestName || "Guest"}
                              </p>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                booking.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" :
                                booking.status === "CHECKED_IN" ? "bg-blue-100 text-blue-700" :
                                booking.status === "CHECKED_OUT" ? "bg-slate-100 text-slate-700" :
                                "bg-amber-100 text-amber-700"
                              }`}>
                                {booking.status}
                              </span>
                            </div>
                            <div className="space-y-1.5 text-xs sm:text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                  <span className="font-medium">Check-in:</span> {new Date(booking.checkIn).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                  <span className="font-medium">Check-out:</span> {new Date(booking.checkOut).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                              </div>
                              {booking.totalAmount && booking.totalAmount > 0 && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs font-medium text-emerald-700">
                                    Amount: {new Intl.NumberFormat(undefined,{style:"currency", currency:"TZS"}).format(booking.totalAmount)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Dates Calculation */}
              {selectedRoom.bookings.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wider">Available Dates</h3>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4">
                    <p className="text-xs sm:text-sm text-slate-700">
                      Dates outside the booked periods shown above are available for new bookings.
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Adjust the date range in the sidebar to see availability for different periods.
                    </p>
                  </div>
                </div>
              )}

              {/* Availability Period Info */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                <p className="text-xs sm:text-sm text-slate-600">
                  <span className="font-semibold">Viewing period:</span> {new Date(from).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} - {new Date(to).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Available dates are those not covered by the bookings listed above.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- small UI bits ---- */
function ColorBox({hex}:{hex:string}) {
  const boxRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.style.background = hex;
    }
  }, [hex]);

  return <span ref={boxRef} className="w-4 h-4 inline-block rounded"/>;
}

/* ---- color helpers: 0% => green, 50% => amber, 100% => red ---- */
function pctToFill(pct:number){
  const hex = lerp3("#22c55e", "#f59e0b", "#ef4444", pct/100);
  return lighten(hex, 0.35); // lighter fill
}
function pctToStroke(pct:number){
  return lerp3("#16a34a", "#d97706", "#dc2626", pct/100); // strong border
}
function lerp3(a:string, b:string, c:string, t:number){
  // piecewise: 0..0.5 => a->b, 0.5..1 => b->c
  if (t <= 0.5) return lerpHex(a,b,t/0.5);
  return lerpHex(b,c,(t-0.5)/0.5);
}
function lerpHex(h1:string, h2:string, t:number){
  const [r1,g1,b1]=hexToRgb(h1), [r2,g2,b2]=hexToRgb(h2);
  const r=Math.round(r1+(r2-r1)*t), g=Math.round(g1+(g2-g1)*t), b=Math.round(b1+(b2-b1)*t);
  return rgbToHex(r,g,b);
}
function hexToRgb(h:string){
  const x = h.replace("#",""); const n = parseInt(x,16);
  return [(n>>16)&255,(n>>8)&255,n&255] as const;
}
function rgbToHex(r:number,g:number,b:number){
  return "#"+[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("");
}
function lighten(hex:string, amt:number){
  const [r,g,b]=hexToRgb(hex);
  const lr = Math.round(r + (255 - r) * amt);
  const lg = Math.round(g + (255 - g) * amt);
  const lb = Math.round(b + (255 - b) * amt);
  return rgbToHex(lr,lg,lb);
}

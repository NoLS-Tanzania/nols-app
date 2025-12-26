"use client";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

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
  bookings:{id:number;checkIn:string;checkOut:string;status:string}[];
};
type Availability = { window:{from:string;to:string}; rooms:AvItem[]; nightsTotal:number };

export default function OwnerPropertyLayoutPage({ params }:{ params:{ id:string }}) {
  const propertyId = Number(params.id);
  const [layout, setLayout] = useState<Layout|null>(null);
  const [activeFloor, setActiveFloor] = useState<string|undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // date range for overlay
  const todayISO = new Date().toISOString().slice(0,10);
  const tomorrowISO = new Date(Date.now()+86400000).toISOString().slice(0,10);
  const [from, setFrom] = useState<string>(todayISO);
  const [to, setTo] = useState<string>(tomorrowISO);

  // availability map
  const [availability, setAvailability] = useState<Record<string, AvItem>>({});

  useEffect(()=>{
    (async()=>{
      try {
        const r = await api.get<Layout| null>(`/owner/properties/${propertyId}/layout`);
        if (!r.data) {
          const g = await api.post<Layout>(`/owner/properties/${propertyId}/layout/generate`);
          setLayout(g.data);
          setActiveFloor(g.data.floors[0]?.id);
        } else {
          setLayout(r.data);
          setActiveFloor(r.data.floors[0]?.id);
        }
      } catch {}
      finally { setLoading(false); }
    })();
  },[propertyId]);

  async function fetchAvailability() {
    if (!from || !to) return;
    const r = await api.get<Availability>(`/owner/properties/${propertyId}/availability`, { params: { from, to }});
    const map: Record<string, AvItem> = {};
    for (const it of r.data.rooms) map[it.code] = it;
    setAvailability(map);
  }

  useEffect(()=>{ if (layout) fetchAvailability(); }, [layout]);
  useEffect(()=>{ if (layout) fetchAvailability(); }, [from, to]);

  const floor = useMemo(()=> layout?.floors.find(f=>f.id===activeFloor) ?? layout?.floors[0], [layout, activeFloor]);

  if (loading) return <div className="p-6">Loading layout…</div>;
  if (!layout || !floor) return <div className="p-6">No layout yet.</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">Floor Plan</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm">From</label>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border rounded px-2 py-1"/>
          <label className="text-sm">To</label>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border rounded px-2 py-1"/>
          <button className="px-3 py-1 rounded border" onClick={fetchAvailability}>Refresh</button>
        </div>
        <div className="flex items-center gap-2">
          {layout.floors.map(f=>(
            <button key={f.id}
              className={`px-3 py-1 rounded border ${f.id===floor.id ? "bg-emerald-600 text-white":"bg-white"}`}
              onClick={()=>setActiveFloor(f.id)}
            >{f.label}</button>
          ))}
          <button
            className="px-3 py-1 rounded border"
            onClick={async()=>{
              const r = await api.post<Layout>(`/owner/properties/${propertyId}/layout/generate`);
              setLayout(r.data);
              setActiveFloor(r.data.floors[0]?.id);
              fetchAvailability();
            }}
          >Regenerate</button>
        </div>
      </div>

      {/* Legend */}
      <div className="text-sm flex items-center gap-4">
        <span className="inline-flex items-center gap-2"><ColorBox hex="#22c55e" /> 0% (Free)</span>
        <span className="inline-flex items-center gap-2"><ColorBox hex="#f59e0b" /> 50% (Half)</span>
        <span className="inline-flex items-center gap-2"><ColorBox hex="#ef4444" /> 100% (Busy)</span>
      </div>

      <svg
        className="w-full border rounded bg-white"
        viewBox={`0 0 ${floor.size.w} ${floor.size.h}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* spaces */}
        {floor.spaces.map(s=>(
          <g key={s.id}>
            <rect x={s.pos.x} y={s.pos.y} width={s.size.w} height={s.size.h} fill="#f3f4f6" stroke="#9ca3af" />
            <text x={s.pos.x + 8} y={s.pos.y + 18} fontSize="16" fill="#374151">{s.name ?? s.type}</text>
          </g>
        ))}

        {/* rooms with gradient availability */}
        {floor.rooms.map(r=>{
          const av = availability[r.code];
          const pct = av?.occupancyPct ?? 0; // 0..100
          const fill = pctToFill(pct);        // light shade
          const stroke = pctToStroke(pct);    // strong outline
          const label = `${pct}% booked`;
          return (
            <g key={r.id} className="cursor-pointer" onClick={()=>{
              const url = `/owner/bookings/new?room=${encodeURIComponent(r.code)}&from=${from}&to=${to}`;
              window.open(url, "_blank");
            }}>
              <title>{`${r.name} — ${label}`}</title>
              <rect x={r.pos.x} y={r.pos.y} width={r.size.w} height={r.size.h} fill={fill} stroke={stroke} />
              {r.doors.map((d, i)=>(
                <line key={i} x1={d.x-10} y1={d.y} x2={d.x+10} y2={d.y} stroke="#111827" strokeWidth={3}/>
              ))}
              <text x={r.pos.x + 8} y={r.pos.y + 18} fontSize="16" fill="#111827">{r.name}</text>
              <text x={r.pos.x + 8} y={r.pos.y + 36} fontSize="14" fill="#374151">
                {new Intl.NumberFormat(undefined,{style:"currency", currency:"TZS"}).format(r.pricePerNight)}
              </text>
              <text x={r.pos.x + 8} y={r.pos.y + 54} fontSize="12" fill={stroke}>{label}</text>
            </g>
          );
        })}
      </svg>

      <div className="text-xs text-gray-500">Schematic plan (not for construction).</div>
    </div>
  );
}

/* ---- small UI bits ---- */
function ColorBox({hex}:{hex:string}) {
  return <span className="w-4 h-4 inline-block rounded" style={{background:hex}}/>;
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

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle, Search, X, Calendar, MapPin, Eye, Users, Plane,
  Clock, Star, Building2, Utensils, Car, Target, Ticket, User,
  FileText, Gift, BarChart3, MessageSquare, ChevronRight, Award,
} from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import axios from "axios";

const api = axios.create({ baseURL: "", withCredentials: true });
function authify() {}

type RecommendedRequest = {
  id: number;
  role: string;
  tripType: string;
  destinations: string;
  dateFrom: string | null;
  dateTo: string | null;
  groupSize: number | null;
  budget: string | null;
  notes: string;
  status: string;
  customer: {
    name: string;
    email: string;
    phone: string | null;
  };
  transportRequired: boolean;
  adminResponse?: string | null;
  suggestedItineraries?: string | null;
  requiredPermits?: string | null;
  estimatedTimeline?: string | null;
  assignedAgent?: string | null;
  respondedAt?: string | null;
  createdAt: string;
};

// ── Itinerary parser ──────────────────────────────────────────────────────────
type ParsedOption = { name: string; pricingLines: string[]; inclCats: { label: string; items: string; details: string[] }[]; itineraryLines: string[] };
function parseOptions(raw: string): ParsedOption[] {
  const blocks = raw.split(/(?=^===\s)/m).filter(s => s.trim());
  return blocks.map(block => {
    const lines = block.split("\n");
    const name = (lines[0] ?? "").replace(/^===\s*/, "").replace(/\s*===\s*$/, "").trim();
    const pricingLines: string[] = [];
    const inclusionLines: string[] = [];
    const itineraryLines: string[] = [];
    let section: "pricing" | "inclusions" | "itinerary" = "pricing";
    for (let i = 1; i < lines.length; i++) {
      const l = lines[i];
      if (/^---\s*WHAT[''&#x27;]?S INCLUDED/i.test(l) || /^---\s*WHAT/i.test(l)) { section = "inclusions"; continue; }
      if (/^Itinerary:/i.test(l)) { section = "itinerary"; continue; }
      if (section === "pricing" && l.trim()) pricingLines.push(l.trim());
      if (section === "inclusions") inclusionLines.push(l);
      if (section === "itinerary") itineraryLines.push(l);
    }
    const inclCats: { label: string; items: string; details: string[] }[] = [];
    let currentCat: { label: string; items: string; details: string[] } | null = null;
    for (const l of inclusionLines) {
      if (!l.trim()) continue;
      if (/^\s{2,}/.test(l)) { currentCat?.details.push(l.trim()); }
      else { const m = l.match(/^(.+?):\s*(.*)$/); if (m) { currentCat = { label: m[1].trim(), items: m[2].trim(), details: [] }; inclCats.push(currentCat); } }
    }
    return { name, pricingLines, inclCats, itineraryLines: itineraryLines.filter(l => l.trim()) };
  });
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const TRIP_ICONS: Record<string, typeof Plane> = { Safari: Plane, Cultural: Star, "Adventure / Hiking": Target, "School / Teacher": FileText, "Local tourism": MapPin };
const ROLE_COLORS: Record<string, string> = {
  Tourist: "bg-sky-100 text-sky-700 border-sky-200",
  "Event planner": "bg-violet-100 text-violet-700 border-violet-200",
  "School / Teacher": "bg-amber-100 text-amber-700 border-amber-200",
  University: "bg-rose-100 text-rose-700 border-rose-200",
  "Community group": "bg-teal-100 text-teal-700 border-teal-200",
};

export default function AdminPlanWithUsRecommendedPage() {
  const [role, setRole] = useState("");
  const [tripType, setTripType] = useState("");
  const [date, setDate] = useState<string | string[]>("");
  const [q, setQ] = useState("");
  const [list, setList] = useState<RecommendedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [pickerAnim, setPickerAnim] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RecommendedRequest | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize, status: "COMPLETED" };
      if (role) params.role = role;
      if (tripType) params.tripType = tripType;
      if (date) {
        if (Array.isArray(date)) { params.start = date[0]; params.end = date[1]; }
        else params.date = date;
      }
      if (q) params.q = q;
      const r = await api.get<{ items: RecommendedRequest[]; total: number }>("/api/admin/plan-with-us/requests", { params });
      setList(r.data?.items ?? []);
      setTotal(r.data?.total ?? 0);
    } catch { setList([]); setTotal(0); }
    finally { setLoading(false); }
  }, [page, pageSize, role, tripType, date, q]);

  useEffect(() => { authify(); void load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      {/* ── Premium Header ── */}
      <div className="relative overflow-hidden rounded-2xl shadow-lg" style={{ background: "linear-gradient(135deg,#0e2a7a 0%,#0a5c82 42%,#02665e 100%)" }}>
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 900 140" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <circle cx="820" cy="20" r="140" stroke="white" strokeOpacity="0.06" strokeWidth="1" fill="none"/>
          <circle cx="820" cy="20" r="95" stroke="white" strokeOpacity="0.05" strokeWidth="1" fill="none"/>
          <polyline points="0,110 160,88 320,96 480,68 640,78 800,48 900,60" stroke="white" strokeOpacity="0.12" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <polygon points="0,110 160,88 320,96 480,68 640,78 800,48 900,60 900,140 0,140" fill="white" fillOpacity="0.03"/>
        </svg>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"/>
        <div className="relative px-8 py-7 flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-lg">
            <Award className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-white tracking-tight">Recommended</h1>
              {!loading && (
                <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 text-white text-[10px] font-bold uppercase tracking-widest rounded-full px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"/>
                  {total} completed
                </span>
              )}
            </div>
            <p className="text-teal-300/80 text-sm mt-1 font-medium">Completed proposals sent to customers — full A4 report preview</p>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none text-sm bg-gray-50"
              placeholder="Search by name, email, destination..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); void load(); } }}
            />
            {q && (
              <button type="button" onClick={() => { setQ(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Role */}
          <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-teal-400 outline-none">
            <option value="">All Roles</option>
            <option value="Event planner">Event Planner</option>
            <option value="School / Teacher">School / Teacher</option>
            <option value="University">University</option>
            <option value="Community group">Community Group</option>
            <option value="Tourist">Tourist</option>
            <option value="Other">Other</option>
          </select>
          {/* Trip Type */}
          <select value={tripType} onChange={e => { setTripType(e.target.value); setPage(1); }} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-teal-400 outline-none">
            <option value="">All Trip Types</option>
            <option value="Local tourism">Local Tourism</option>
            <option value="Safari">Safari</option>
            <option value="Cultural">Cultural</option>
            <option value="Adventure / Hiking">Adventure / Hiking</option>
            <option value="Other">Other</option>
          </select>
          {/* Date */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setPickerAnim(true); setTimeout(() => setPickerAnim(false), 350); setPickerOpen(v => !v); }}
              className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm flex items-center gap-2 text-gray-600 bg-gray-50 transition-all ${pickerAnim ? "ring-2 ring-teal-200" : "hover:border-teal-300"}`}
            >
              <Calendar className="h-4 w-4 text-teal-600" />
              <span>{date ? (Array.isArray(date) ? `${date[0]} - ${date[1]}` : date) : "Filter by date"}</span>
              {date && <button type="button" onClick={e => { e.stopPropagation(); setDate(""); setPage(1); }} className="ml-auto text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5"/></button>}
            </button>
            {pickerOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <DatePicker selected={date || undefined} onSelectAction={(s) => { setDate(s as string | string[]); setPage(1); }} onCloseAction={() => setPickerOpen(false)} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── List ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-400" />

        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                <div className="w-11 h-11 rounded-xl bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-44" />
                  <div className="h-3 bg-gray-200 rounded w-64" />
                </div>
                <div className="h-6 bg-gray-200 rounded-full w-24 shrink-0" />
                <div className="h-8 bg-gray-200 rounded-lg w-32 shrink-0" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Award className="h-8 w-8 text-emerald-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">No completed proposals yet</p>
            <p className="text-xs text-gray-400 mt-1">Completed requests with feedback will appear here.</p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="hidden lg:grid grid-cols-[48px_1fr_160px_160px_120px_180px_130px] gap-x-4 px-5 py-2.5 bg-gray-50/80 border-b border-gray-100">
              {["#", "Customer / Destination", "Role", "Trip Type", "Group", "Responded At", ""].map(h => (
                <div key={h} className="text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</div>
              ))}
            </div>

            <div className="divide-y divide-gray-50">
              {list.map((req) => {
                const TripIcon = TRIP_ICONS[req.tripType] ?? Plane;
                const roleColor = ROLE_COLORS[req.role] ?? "bg-gray-100 text-gray-600 border-gray-200";
                const initials = req.customer.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <div key={req.id} className="group px-5 py-3.5 hover:bg-teal-50/30 transition-colors duration-150">
                    {/* Desktop row */}
                    <div className="hidden lg:grid grid-cols-[48px_1fr_160px_160px_120px_180px_130px] gap-x-4 items-center">
                      {/* # */}
                      <div className="text-[11px] font-black text-gray-400 tabular-nums">#{req.id}</div>
                      {/* Customer + Destination */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-black flex-shrink-0" style={{ background: "linear-gradient(135deg,#0e2a7a,#02665e)" }}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold text-gray-900 truncate">{req.customer.name}</div>
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="truncate">{req.destinations || "—"}</span>
                          </div>
                        </div>
                      </div>
                      {/* Role */}
                      <div>
                        <span className={`inline-flex items-center text-[10px] font-bold rounded-full border px-2 py-0.5 ${roleColor}`}>
                          {req.role}
                        </span>
                      </div>
                      {/* Trip type */}
                      <div className="flex items-center gap-1.5">
                        <TripIcon className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                        <span className="text-[12px] text-gray-700 font-medium">{req.tripType}</span>
                      </div>
                      {/* Group */}
                      <div className="flex items-center gap-1 text-[12px] text-gray-600">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        {req.groupSize ?? "—"}
                      </div>
                      {/* Responded at — date + time */}
                      <div>
                        {req.respondedAt ? (
                          <div>
                            <div className="text-[11px] font-semibold text-gray-800">{fmtDate(req.respondedAt)}</div>
                            <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                              {new Date(req.respondedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        ) : <span className="text-[11px] text-gray-400">—</span>}
                      </div>
                      {/* Action */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => { setSelectedRequest(req); setShowModal(true); }}
                          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-[11px] font-bold rounded-lg px-3 py-1.5 shadow-sm transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Report
                          <ChevronRight className="w-3 h-3 opacity-70" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div className="lg:hidden flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[11px] font-black flex-shrink-0 mt-0.5" style={{ background: "linear-gradient(135deg,#0e2a7a,#02665e)" }}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="text-[13px] font-bold text-gray-900">{req.customer.name}</div>
                          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black rounded-full px-2 py-0.5">Completed</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5"><MapPin className="w-2.5 h-2.5"/>{req.destinations || "—"}</div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`text-[10px] font-bold rounded-full border px-2 py-0.5 ${roleColor}`}>{req.role}</span>
                          <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5"><TripIcon className="w-2.5 h-2.5"/>{req.tripType}</span>
                          {req.respondedAt && <span className="flex items-center gap-1 text-[10px] text-gray-500"><Clock className="w-2.5 h-2.5"/>{fmtDateTime(req.respondedAt)}</span>}
                        </div>
                        <button
                          onClick={() => { setSelectedRequest(req); setShowModal(true); }}
                          className="mt-3 inline-flex items-center gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-[11px] font-bold rounded-lg px-3 py-1.5 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Report
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Pagination ── */}
      {list.length > 0 && (
        <div className="flex justify-center py-2">
          <div className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Prev</button>
            <div className="px-4 py-2 text-sm font-bold text-teal-700 border-x border-gray-200 bg-teal-50/60">{page} / {pages}</div>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next</button>
          </div>
        </div>
      )}

      {/* ── A4 Report Modal ── */}
      {showModal && selectedRequest && (() => {
        const req = selectedRequest;
        const options = parseOptions(req.suggestedItineraries || "");
        const permits = (req.requiredPermits || "").split("\n").map(l => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
        const sentDate = req.respondedAt ? new Date(req.respondedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
        const sentTime = req.respondedAt ? new Date(req.respondedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
        const destStops = (() => {
          const raw = req.destinations || "";
          if (!raw.trim()) return [];
          const parts = raw.split(/(?=\d+\))/);
          return parts.map(p => {
            const m = p.match(/^(\d+\))\s*(.+?)(?:\s*[\u2014\u2013-]+\s*(\d+)\s*nights?)?\s*$/i);
            return m ? { name: m[2].trim(), nights: m[3] ? Number(m[3]) : null } : { name: p.replace(/^\d+\)\s*/, "").trim(), nights: null };
          }).filter(s => s.name);
        })();

        type CatCfg = { Icon: typeof Building2; bg: string; border: string; iconColor: string; labelColor: string };
        const catCfg: Record<string, CatCfg> = {
          accommodation: { Icon: Building2, bg: "#eff6ff", border: "#bfdbfe", iconColor: "#3b82f6", labelColor: "#1d4ed8" },
          meal:          { Icon: Utensils,  bg: "#fef9c3", border: "#fde047", iconColor: "#ca8a04", labelColor: "#a16207" },
          food:          { Icon: Utensils,  bg: "#fef9c3", border: "#fde047", iconColor: "#ca8a04", labelColor: "#a16207" },
          transport:     { Icon: Car,       bg: "#fff7ed", border: "#fed7aa", iconColor: "#f97316", labelColor: "#c2410c" },
          guide:         { Icon: User,      bg: "#f0fdf4", border: "#bbf7d0", iconColor: "#22c55e", labelColor: "#15803d" },
          park:          { Icon: MapPin,    bg: "#f0fdfa", border: "#99f6e4", iconColor: "#14b8a6", labelColor: "#0f766e" },
          permit:        { Icon: FileText,  bg: "#fdf4ff", border: "#e9d5ff", iconColor: "#a855f7", labelColor: "#7e22ce" },
          activity:      { Icon: Target,    bg: "#fefce8", border: "#fef08a", iconColor: "#eab308", labelColor: "#a16207" },
          ticket:        { Icon: Ticket,    bg: "#fefce8", border: "#fef08a", iconColor: "#eab308", labelColor: "#a16207" },
        };
        const fallbackCfg: CatCfg = { Icon: Star, bg: "#f8fafc", border: "#e2e8f0", iconColor: "#94a3b8", labelColor: "#475569" };
        const getCfg = (lbl: string) => { const k = Object.keys(catCfg).find(k2 => lbl.toLowerCase().includes(k2)); return k ? catCfg[k] : fallbackCfg; };

        return (
          <>
            <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50" onClick={() => setShowModal(false)} />
            <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[4vh] overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-6 flex flex-col overflow-hidden">

                {/* Modal header */}
                <div className="sticky top-0 z-10 flex-shrink-0 rounded-t-2xl overflow-hidden" style={{ background: "linear-gradient(135deg,#0e2a7a 0%,#0a5c82 50%,#02665e 100%)" }}>
                  <div className="flex items-center justify-between px-6 py-4">
                    <div>
                      <div className="text-white font-black text-base">Trip Proposal — NLS-{String(req.id).padStart(5, "0")}</div>
                      <div className="text-teal-300 text-[10px] mt-0.5 flex items-center gap-2">
                        <span>{req.customer.name}</span>
                        <span className="opacity-50">·</span>
                        <Clock className="w-3 h-3" />
                        <span>Sent {sentDate}{sentTime ? ` at ${sentTime}` : ""}</span>
                      </div>
                    </div>
                    <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* A4 Report */}
                <div className="overflow-y-auto max-h-[82vh] bg-gray-100 p-4">
                  <div className="mx-auto bg-white shadow-xl border border-gray-200 overflow-hidden" style={{ maxWidth: "794px", fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif", fontSize: "13px", lineHeight: "1.5" }}>

                    {/* Visa card header */}
                    <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg,#0e2a7a 0%,#0a5c82 38%,#02665e 100%)" }}>
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 794 120" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                        <circle cx="740" cy="20" r="130" stroke="white" strokeOpacity="0.06" strokeWidth="1" fill="none"/>
                        <circle cx="740" cy="20" r="90" stroke="white" strokeOpacity="0.05" strokeWidth="1" fill="none"/>
                        <polyline points="0,100 130,80 260,88 390,60 520,70 650,40 794,52" stroke="white" strokeOpacity="0.12" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                        <polygon points="0,100 130,80 260,88 390,60 520,70 650,40 794,52 794,120 0,120" fill="white" fillOpacity="0.03"/>
                      </svg>
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"/>
                      <div className="relative px-8 py-6 flex items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/assets/NoLS2025-04.png" alt="NoLSAF" className="h-14 w-auto object-contain drop-shadow-md" />
                          <div>
                            <div className="text-white font-black text-xl tracking-tight leading-none">NoLS Africa</div>
                            <div className="text-teal-300 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Quality Stay For Every Wallet</div>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="flex items-center gap-1 text-[9px] text-white/60"><MapPin className="w-2.5 h-2.5"/>Dar es Salaam, TZ</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <div className="text-[9px] text-white/50 uppercase tracking-widest font-bold">Trip Proposal · Admin View</div>
                          <div className="text-white font-black text-lg mt-0.5">NLS-{String(req.id).padStart(5, "0")}</div>
                          <div className="text-teal-300/80 text-[9px] mt-1">{sentDate}{sentTime ? ` · ${sentTime}` : ""}</div>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="px-8 py-6 space-y-6 bg-gray-50/40">

                      {/* Customer Info strip */}
                      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-4 h-0.5 bg-teal-500 inline-block rounded"/>
                          <span className="text-[9px] font-black uppercase tracking-widest text-teal-700">For</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                          <div><div className="text-gray-400 text-[9px] uppercase font-bold mb-0.5">Customer</div><div className="font-bold text-gray-900">{req.customer.name}</div></div>
                          <div><div className="text-gray-400 text-[9px] uppercase font-bold mb-0.5">Email</div><div className="font-semibold text-gray-700 truncate">{req.customer.email}</div></div>
                          {req.customer.phone && <div><div className="text-gray-400 text-[9px] uppercase font-bold mb-0.5">Phone</div><div className="font-semibold text-gray-700">{req.customer.phone}</div></div>}
                          <div><div className="text-gray-400 text-[9px] uppercase font-bold mb-0.5">Role</div><div className="font-bold text-gray-900">{req.role}</div></div>
                          <div><div className="text-gray-400 text-[9px] uppercase font-bold mb-0.5">Trip Type</div><div className="font-bold text-gray-900">{req.tripType}</div></div>
                          {req.groupSize && <div><div className="text-gray-400 text-[9px] uppercase font-bold mb-0.5">Group</div><div className="font-bold text-gray-900">{req.groupSize} {req.groupSize === 1 ? "person" : "people"}</div></div>}
                        </div>
                      </div>

                      {/* Section 1 — Request Summary */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-black" style={{ background: "linear-gradient(135deg,#0e2a7a,#02665e)" }}>1</div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-gray-700">Request Summary</span>
                          <div className="flex-1 h-px bg-gray-200"/>
                        </div>
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white rounded-xl border border-blue-100 p-3 flex items-start gap-2.5 shadow-sm">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#eff6ff,#fff)", border: "1px solid #bfdbfe" }}><Plane className="w-3.5 h-3.5 text-blue-500"/></div>
                              <div><div className="text-[8px] font-black uppercase tracking-wider text-blue-600">Trip Type</div><div className="text-[11px] font-bold text-gray-900 mt-0.5">{req.tripType}</div></div>
                            </div>
                            <div className="bg-white rounded-xl border border-cyan-100 p-3 flex items-start gap-2.5 shadow-sm">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#ecfeff,#fff)", border: "1px solid #a5f3fc" }}><Users className="w-3.5 h-3.5 text-cyan-600"/></div>
                              <div><div className="text-[8px] font-black uppercase tracking-wider text-cyan-700">Group Size</div><div className="text-[11px] font-bold text-gray-900 mt-0.5">{req.groupSize ?? "—"} {req.groupSize === 1 ? "person" : "people"}</div></div>
                            </div>
                            <div className="bg-white rounded-xl border border-emerald-100 p-3 flex items-start gap-2.5 shadow-sm">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#ecfdf5,#fff)", border: "1px solid #a7f3d0" }}><Target className="w-3.5 h-3.5 text-emerald-600"/></div>
                              <div><div className="text-[8px] font-black uppercase tracking-wider text-emerald-700">Budget</div><div className="text-[11px] font-bold text-gray-900 mt-0.5">{req.budget ? `TZS ${Number(req.budget).toLocaleString()}` : "Flexible"}</div></div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white rounded-xl border border-orange-100 p-3 flex items-start gap-2.5 shadow-sm">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#fff7ed,#fff)", border: "1px solid #fed7aa" }}><Car className="w-3.5 h-3.5 text-orange-500"/></div>
                              <div><div className="text-[8px] font-black uppercase tracking-wider text-orange-600">Transport</div><div className="text-[11px] font-bold text-gray-900 mt-0.5">{req.transportRequired ? "Required" : "Not required"}</div></div>
                            </div>
                            <div className="bg-white rounded-xl border border-violet-100 p-3 flex items-start gap-2.5 shadow-sm">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#f5f3ff,#fff)", border: "1px solid #ddd6fe" }}><Calendar className="w-3.5 h-3.5 text-violet-600"/></div>
                              <div><div className="text-[8px] font-black uppercase tracking-wider text-violet-700">Travel Window</div><div className="text-[11px] font-bold text-gray-900 mt-0.5">{req.dateFrom && req.dateTo ? `${fmtDate(req.dateFrom)} - ${fmtDate(req.dateTo)}` : req.dateFrom ? fmtDate(req.dateFrom) : "Flexible"}</div></div>
                            </div>
                          </div>
                          {/* Destinations */}
                          {req.destinations && (
                            <div className="bg-white rounded-xl border border-teal-200 overflow-hidden shadow-sm">
                              <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "linear-gradient(90deg,#0f172a,#0e2a7a)" }}>
                                <MapPin className="w-3 h-3 text-teal-400 flex-shrink-0"/>
                                <span className="text-[9px] font-black uppercase tracking-widest text-teal-300">Destinations{destStops.length > 1 ? ` · ${destStops.length} Stops` : ""}</span>
                              </div>
                              {destStops.length > 0 ? (
                                <div className="divide-y divide-gray-50">
                                  {destStops.map((s, si) => (
                                    <div key={si} className="flex items-center justify-between px-4 py-2.5">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-black flex-shrink-0" style={{ background: "linear-gradient(135deg,#0e2a7a,#02665e)" }}>{si + 1}</div>
                                        <span className="text-[12px] font-bold text-gray-800">{s.name}</span>
                                      </div>
                                      {s.nights && (
                                        <span className="flex items-center gap-1 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5 text-[9px] font-bold text-teal-700">
                                          <Clock className="w-2.5 h-2.5"/>{s.nights} nights
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="px-4 py-3 text-[12px] font-semibold text-gray-700">{req.destinations}</p>
                              )}
                            </div>
                          )}
                          {/* Notes */}
                          {req.notes && (
                            <div className="bg-white rounded-xl border border-amber-200 overflow-hidden shadow-sm">
                              <div className="px-4 py-2 flex items-center gap-2" style={{ background: "linear-gradient(90deg,#78350f,#d97706)" }}>
                                <MessageSquare className="w-3 h-3 text-amber-200 flex-shrink-0"/>
                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-100">Client Notes</span>
                              </div>
                              <p className="px-4 py-3 text-[11px] text-gray-600 italic leading-relaxed">&ldquo;{req.notes}&rdquo;</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section 2 — Itinerary Options */}
                      {options.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-black" style={{ background: "linear-gradient(135deg,#0e2a7a,#02665e)" }}>2</div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-gray-700">Itinerary Options</span>
                            <div className="flex-1 h-px bg-gray-200"/>
                          </div>
                          <div className="space-y-5">
                            {options.map((opt, oi) => (
                              <div key={oi} className="rounded-2xl border border-gray-200 overflow-hidden shadow-md">
                                <div className="relative overflow-hidden flex items-center justify-between px-5 py-4" style={{ background: "linear-gradient(135deg,#0e2a7a 0%,#0a5c82 50%,#02665e 100%)" }}>
                                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 700 60" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                                    <polyline points="0,50 120,38 240,44 360,28 480,34 600,16 700,22" stroke="white" strokeOpacity="0.10" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                                  </svg>
                                  <div className="relative flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/30 flex items-center justify-center text-white font-black text-base flex-shrink-0">{String.fromCharCode(65 + oi)}</div>
                                    <div>
                                      <div className="text-white font-black text-[15px] leading-tight">{opt.name || `Option ${String.fromCharCode(65 + oi)}`}</div>
                                      {options.length > 1 && <div className="text-[9px] text-white/55 font-bold uppercase tracking-[0.2em] mt-0.5">Option {oi + 1} of {options.length}</div>}
                                    </div>
                                  </div>
                                  <div className="relative hidden sm:flex -space-x-3">
                                    <div className="w-7 h-7 rounded-full" style={{ background: "radial-gradient(circle at 38% 38%,#2563eb,#0e2a7a)", opacity: 0.85 }}/>
                                    <div className="w-7 h-7 rounded-full" style={{ background: "radial-gradient(circle at 62% 38%,#02665e,#013f3a)", opacity: 0.75 }}/>
                                  </div>
                                </div>
                                <div className="bg-gray-50/60 p-4 space-y-4">
                                  {/* Pricing */}
                                  {opt.pricingLines.length > 0 && (() => {
                                    const rows = opt.pricingLines.map(l => {
                                      const ci = l.lastIndexOf(":");
                                      const isTotal = /total for group/i.test(l);
                                      return { label: ci > -1 ? l.slice(0, ci).trim() : l.trim(), value: ci > -1 ? l.slice(ci + 1).trim() : "", isTotal };
                                    });
                                    return (
                                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
                                          <BarChart3 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0"/>
                                          <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Pricing Breakdown</span>
                                        </div>
                                        <div className="divide-y divide-gray-50">
                                          {rows.map((row, ri) => row.isTotal ? (
                                            <div key={ri} className="flex items-center justify-between px-4 py-3" style={{ background: "linear-gradient(90deg,#ecfdf5,#d1fae5)" }}>
                                              <span className="flex items-center gap-2 text-[12px] font-black text-emerald-800"><span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"/>{row.label}</span>
                                              <span className="text-[14px] font-black text-emerald-700 tabular-nums">{row.value}</span>
                                            </div>
                                          ) : (
                                            <div key={ri} className="flex items-center justify-between px-4 py-2.5">
                                              <span className="text-[11px] text-gray-500">{row.label}</span>
                                              <span className="text-[12px] font-bold text-gray-800 tabular-nums">{row.value}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  {/* Inclusions */}
                                  {opt.inclCats.length > 0 && (() => {
                                    return (
                                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
                                          <Gift className="w-3.5 h-3.5 text-teal-600 flex-shrink-0"/>
                                          <span className="text-[9px] font-black uppercase tracking-widest text-teal-700">What&apos;s Included</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100">
                                          {opt.inclCats.map((cat, ci) => {
                                            const cfg = getCfg(cat.label);
                                            const CatIcon = cfg.Icon;
                                            const catName = cat.label.replace(/^[\p{Emoji}\s]+/u, "").split(":")[0].trim();
                                            const linked = cat.details.find(d => /linked listings:/i.test(d));
                                            const others = cat.details.filter(d => !/linked listings:/i.test(d));
                                            return (
                                              <div key={ci} className="bg-white p-3.5 flex items-start gap-3">
                                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `linear-gradient(135deg,${cfg.bg},#fff)`, border: `1px solid ${cfg.border}` }}>
                                                  <CatIcon className="w-4 h-4" style={{ color: cfg.iconColor }}/>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <div className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: cfg.labelColor }}>{catName}</div>
                                                  <div className="text-[12px] font-bold text-gray-900 leading-snug">{cat.items}</div>
                                                  {others.map((d, di) => <p key={di} className="text-[10px] text-gray-400 italic mt-0.5">{d}</p>)}
                                                  {linked && (
                                                    <div className="mt-1.5 inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
                                                      <span className="text-[9px]">Link</span>
                                                      <span className="text-[10px] font-bold text-teal-700 truncate">{linked.replace(/linked listings:\s*/i, "")}</span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  {/* Day timeline */}
                                  {opt.itineraryLines.length > 0 && (() => {
                                    type DayBlock = { day: string; desc: string; notes: string[] };
                                    const days: DayBlock[] = [];
                                    opt.itineraryLines.forEach(l => {
                                      const m = l.match(/^(Day\s+\d+[:\-\s]?)/i);
                                      if (m) { days.push({ day: m[1].trim().replace(/[:\u2013-]+$/, ""), desc: l.replace(m[0], "").trim(), notes: [] }); }
                                      else if (days.length > 0) { days[days.length - 1].notes.push(l); }
                                      else { days.push({ day: "", desc: l, notes: [] }); }
                                    });
                                    return (
                                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
                                          <Calendar className="w-3.5 h-3.5 text-violet-600 flex-shrink-0"/>
                                          <span className="text-[9px] font-black uppercase tracking-widest text-violet-700">Day-by-Day Itinerary</span>
                                        </div>
                                        <div className="px-4 py-3">
                                          {days.map((d, di) => (
                                            <div key={di} className="flex gap-3 relative">
                                              {di < days.length - 1 && <div className="absolute left-[14px] top-7 bottom-0 w-px bg-gradient-to-b from-indigo-200 to-transparent z-0"/>}
                                              <div className="flex-shrink-0 z-10 mt-1">
                                                {d.day ? (
                                                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-black" style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>{d.day.replace(/Day\s*/i, "").trim() || (di + 1)}</div>
                                                ) : (
                                                  <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100"><span className="text-gray-400 text-[10px]">+</span></div>
                                                )}
                                              </div>
                                              <div className="flex-1 pb-3.5">
                                                {d.day && <div className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-0.5">{d.day}</div>}
                                                <p className="text-[12px] font-semibold text-gray-800 leading-snug">{d.desc}</p>
                                                {d.notes.map((n, ni) => <p key={ni} className="text-[10px] text-gray-400 italic mt-0.5">{n}</p>)}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section 3 — Permits */}
                      {permits.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-black" style={{ background: "linear-gradient(135deg,#0e2a7a,#02665e)" }}>3</div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-gray-700">Permits &amp; Documents</span>
                            <div className="flex-1 h-px bg-gray-200"/>
                          </div>
                          <div className="bg-white rounded-xl border border-amber-200 overflow-hidden shadow-sm">
                            <div className="divide-y divide-amber-50">
                              {permits.map((p, pi) => (
                                <div key={pi} className="flex items-center gap-3 px-4 py-2.5">
                                  <div className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle className="w-3 h-3 text-amber-600"/>
                                  </div>
                                  <span className="text-[12px] text-gray-700 font-medium">{p}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Section 4 — Timeline */}
                      {req.estimatedTimeline && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-black" style={{ background: "linear-gradient(135deg,#0e2a7a,#02665e)" }}>4</div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-gray-700">Booking Timeline</span>
                            <div className="flex-1 h-px bg-gray-200"/>
                          </div>
                          <div className="bg-white rounded-xl border border-violet-200 p-4 shadow-sm">
                            <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">{req.estimatedTimeline}</p>
                          </div>
                        </div>
                      )}

                      {/* Assigned Agent */}
                      {req.assignedAgent && (
                        <div className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 border border-indigo-200 flex items-center justify-center text-indigo-600 font-black text-base flex-shrink-0">
                              {req.assignedAgent.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Dedicated Travel Agent</div>
                              <div className="text-sm font-bold text-indigo-900">{req.assignedAgent}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-black uppercase tracking-widest rounded-full px-2 py-0.5">Top-Rated</span>
                                <span className="text-[10px] text-indigo-500 font-semibold">Ranked by NoLSAF Intelligence Score</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Footer */}
                    <div className="relative overflow-hidden px-8 py-4" style={{ background: "linear-gradient(135deg,#0e2a7a 0%,#0a5c82 38%,#02665e 100%)" }}>
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"/>
                      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 794 72" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                        <polyline points="0,60 160,48 320,52 480,36 640,42 794,28" stroke="white" strokeOpacity="0.10" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
                      </svg>
                      <div className="relative flex items-center justify-between gap-4">
                        <div>
                          <div className="text-white font-black text-sm tracking-tight">NoLS Africa Inc</div>
                          <div className="text-teal-300 text-[10px] mt-0.5">Authorised Report · NLS-{String(req.id).padStart(5, "0")}</div>
                        </div>
                        <div className="text-center">
                          <span className="text-teal-300/80 text-[10px] italic font-semibold">Quality Stay For Every Wallet</span>
                        </div>
                        <div className="text-right">
                          <div className="text-white/60 text-[10px]">Sent: {sentDate}{sentTime ? ` · ${sentTime}` : ""}</div>
                          <div className="text-white/35 text-[9px] mt-0.5">Admin Reference View</div>
                        </div>
                      </div>
                      <div className="relative mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-3 text-[9px] text-white/35">
                        <span>sales@nolsaf.com</span>
                        <span>Dar es Salaam, Tanzania</span>
                        <span className="ml-auto">© {new Date().getFullYear()} NoLS Africa Inc. · NoLSAF TripEngine(tm)</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
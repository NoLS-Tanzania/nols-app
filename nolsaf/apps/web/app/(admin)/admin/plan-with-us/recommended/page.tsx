"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search, X, Calendar, MapPin, Eye, Users, Plane,
  Clock, Star, Target,
  FileText, ChevronRight, Award,
} from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import axios from "axios";
import TripProposalReport from "@/components/TripProposalReport";

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
        const sentDate = req.respondedAt ? new Date(req.respondedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
        const sentTime = req.respondedAt ? new Date(req.respondedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
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
                  <TripProposalReport request={req} label={false} />
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
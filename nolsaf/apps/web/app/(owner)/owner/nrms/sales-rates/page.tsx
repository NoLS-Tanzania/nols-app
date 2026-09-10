"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, History, Hotel, Loader2, RefreshCw, Send, SlidersHorizontal, Sparkles, XCircle } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useNrms } from "../_components/NrmsProvider";

type Room = { id: number; name: string; baseRate: number; currency: string };
type RateRequest = { id: number; stayDate: string; currentRate: number; proposedRate: number; currency: string; reason: string; status: string; createdAt: string; roomType: { id: number; name: string } };
const fieldClass = "min-h-12 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10";
const statusStyles: Record<string, string> = { PENDING: "bg-amber-50 text-amber-700 ring-amber-200", APPLIED: "bg-emerald-50 text-emerald-700 ring-emerald-200", APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200", DISMISSED: "bg-neutral-100 text-neutral-600 ring-neutral-200", DECLINED: "bg-red-50 text-red-700 ring-red-200" };

function money(value: number, currency: string) { return `${currency} ${Math.round(value).toLocaleString()}`; }
function formatDate(value: string) { return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
function StatusIcon({ status }: { status: string }) { if (["APPLIED", "APPROVED"].includes(status)) return <CheckCircle2 className="h-3.5 w-3.5" />; if (["DISMISSED", "DECLINED"].includes(status)) return <XCircle className="h-3.5 w-3.5" />; return <Clock3 className="h-3.5 w-3.5" />; }

export default function SalesRateRequestsPage() {
  const { selectedPropertyId, selectedProperty } = useNrms();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [requests, setRequests] = useState<RateRequest[]>([]);
  const [form, setForm] = useState({ roomTypeId: "", stayDate: "", proposedRate: "", reason: "" });
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedPropertyId) return;
    setLoading(true); setError(null);
    try { const response = await apiClient.get(`/api/owner/nrms/rate-requests/${selectedPropertyId}`); setRooms(response.data.roomTypes ?? []); setRequests(response.data.requests ?? []); }
    catch (cause: any) { setError(cause?.response?.data?.error || "Rate proposals could not be loaded."); }
    finally { setLoading(false); }
  }, [selectedPropertyId]);
  useEffect(() => { void load(); }, [load]);

  const selectedRoom = rooms.find((room) => room.id === Number(form.roomTypeId)) ?? null;
  const proposedRate = Number(form.proposedRate) || 0;
  const changePercent = selectedRoom && proposedRate ? ((proposedRate - selectedRoom.baseRate) / selectedRoom.baseRate) * 100 : 0;
  const pending = requests.filter((item) => item.status === "PENDING").length;
  const approved = requests.filter((item) => ["APPLIED", "APPROVED"].includes(item.status)).length;
  const declined = requests.filter((item) => ["DISMISSED", "DECLINED"].includes(item.status)).length;
  const filteredRequests = useMemo(() => filter === "ALL" ? requests : requests.filter((item) => item.status === filter), [filter, requests]);
  const ready = Boolean(form.roomTypeId && form.stayDate && proposedRate > 0 && form.reason.trim().length >= 5);

  const submit = async () => {
    if (!selectedPropertyId || !ready) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await apiClient.post(`/api/owner/nrms/rate-requests/${selectedPropertyId}`, { roomTypeId: Number(form.roomTypeId), stayDate: form.stayDate, proposedRate, reason: form.reason });
      setForm({ roomTypeId: "", stayDate: "", proposedRate: "", reason: "" }); setNotice("Rate proposal sent to the property owner for approval."); await load();
    } catch (cause: any) { setError(cause?.response?.data?.error || "Rate proposal could not be submitted."); }
    finally { setBusy(false); }
  };

  return <div className="w-full space-y-5 pb-10">
    <header className="relative overflow-hidden rounded-2xl bg-emerald-950 px-5 py-6 text-white shadow-sm sm:px-7 lg:px-8">
      <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-400/15 ring-1 ring-emerald-300/20"><SlidersHorizontal className="h-5 w-5 text-emerald-300" /></span><div className="min-w-0"><p className="m-0 text-[11px] font-bold uppercase tracking-[.2em] text-emerald-300">Revenue workspace</p><h1 className="mb-0 mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Rate proposals</h1><p className="mb-0 mt-2 max-w-2xl text-sm leading-6 text-emerald-100/70">Recommend a room rate for a specific stay date. Sales provides the commercial case; the owner keeps final publishing control.</p></div></div>
        <div className="flex shrink-0 items-center gap-3 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10"><Hotel className="h-5 w-5 text-emerald-300" /><div><p className="m-0 text-[10px] uppercase tracking-wider text-emerald-100/60">Property</p><p className="mb-0 mt-0.5 max-w-64 truncate text-sm font-bold">{selectedProperty?.title || "Selected property"}</p></div></div>
      </div>
    </header>

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[{ label: "All proposals", value: requests.length, Icon: History, color: "text-neutral-700", background: "bg-neutral-100" }, { label: "Awaiting decision", value: pending, Icon: Clock3, color: "text-amber-700", background: "bg-amber-50" }, { label: "Approved", value: approved, Icon: CheckCircle2, color: "text-emerald-700", background: "bg-emerald-50" }, { label: "Declined", value: declined, Icon: XCircle, color: "text-red-700", background: "bg-red-50" }].map(({ label, value, Icon, color, background }) => <article key={label} className="flex min-w-0 items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-neutral-200 sm:p-5"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${background}`}><Icon className={`h-5 w-5 ${color}`} /></span><div className="min-w-0"><p className="m-0 text-xl font-bold text-neutral-950">{value}</p><p className="mb-0 mt-0.5 truncate text-xs text-neutral-500">{label}</p></div></article>)}
    </section>

    {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">{error}</div>}
    {notice && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">{notice}</div>}

    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(360px,440px)_minmax(0,1fr)]">
      <section className="self-start rounded-2xl bg-white ring-1 ring-neutral-200 xl:sticky xl:top-4">
        <div className="border-b border-neutral-100 px-5 py-4 sm:px-6"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-emerald-700" /><h2 className="m-0 text-base font-bold text-neutral-950">Build a proposal</h2></div><p className="mb-0 mt-1 text-xs leading-5 text-neutral-500">Use a clear commercial reason so the owner can decide quickly.</p></div>
        <div className="grid gap-4 p-5 sm:p-6">
          <label className="grid gap-1.5 text-xs font-bold text-neutral-700">Room type<select className={fieldClass} value={form.roomTypeId} onChange={(event) => setForm({ ...form, roomTypeId: event.target.value })}><option value="">Select a room type</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name} · {money(room.baseRate, room.currency)}</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold text-neutral-700">Stay date<input type="date" min={new Date().toISOString().slice(0, 10)} className={fieldClass} value={form.stayDate} onChange={(event) => setForm({ ...form, stayDate: event.target.value })} /></label>
            <label className="grid gap-1.5 text-xs font-bold text-neutral-700">Proposed nightly rate<div className="relative"><input type="number" min="1" inputMode="decimal" placeholder="0" className={`${fieldClass} pr-14`} value={form.proposedRate} onChange={(event) => setForm({ ...form, proposedRate: event.target.value })} />{selectedRoom && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-400">{selectedRoom.currency}</span>}</div></label>
          </div>
          {selectedRoom && proposedRate > 0 && <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl bg-neutral-50 p-3.5 ring-1 ring-neutral-200"><div><p className="m-0 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Current</p><p className="mb-0 mt-1 text-sm font-bold text-neutral-700">{money(selectedRoom.baseRate, selectedRoom.currency)}</p></div><span className="text-neutral-300">→</span><div className="text-right"><p className="m-0 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Proposed</p><p className="mb-0 mt-1 text-sm font-bold text-emerald-800">{money(proposedRate, selectedRoom.currency)}</p></div><div className={`col-span-3 flex items-center justify-center gap-1 border-t border-neutral-200 pt-2 text-xs font-bold ${changePercent >= 0 ? "text-emerald-700" : "text-amber-700"}`}>{changePercent >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}{Math.abs(changePercent).toFixed(1)}% {changePercent >= 0 ? "increase" : "decrease"}</div></div>}
          <label className="grid gap-1.5 text-xs font-bold text-neutral-700">Commercial reason<textarea rows={4} maxLength={500} placeholder="Example: Strong weekend demand and only two rooms remain." className={`${fieldClass} resize-y py-3 leading-5`} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /><span className="text-right text-[10px] font-medium text-neutral-400">{form.reason.length}/500</span></label>
          <button type="button" disabled={busy || !ready} onClick={() => void submit()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-0 bg-emerald-800 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Submit for owner approval</button>
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200">
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="m-0 text-base font-bold text-neutral-950">Proposal history</h2><p className="mb-0 mt-1 text-xs text-neutral-500">Every request and decision remains visible for accountability.</p></div><div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">{["ALL", "PENDING", "APPLIED", "DISMISSED"].map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`min-h-8 shrink-0 rounded-lg border-0 px-3 text-[10px] font-bold ${filter === item ? "bg-emerald-800 text-white" : "bg-neutral-100 text-neutral-600"}`}>{item === "ALL" ? "All" : item === "APPLIED" ? "Approved" : item === "DISMISSED" ? "Declined" : "Pending"}</button>)}<button type="button" onClick={() => void load()} disabled={loading} aria-label="Refresh proposals" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-0 bg-neutral-100 text-neutral-600"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /></button></div></div>
        {loading ? <div className="grid min-h-80 place-items-center p-8"><div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-emerald-700" /><p className="mb-0 mt-3 text-sm text-neutral-500">Loading rate proposals…</p></div></div> : filteredRequests.length ? <div className="divide-y divide-neutral-100">{filteredRequests.map((request) => { const delta = request.currentRate ? ((request.proposedRate - request.currentRate) / request.currentRate) * 100 : 0; return <article key={request.id} className="grid gap-4 px-5 py-5 transition hover:bg-neutral-50/70 sm:px-6 lg:grid-cols-[minmax(180px,1.1fr)_minmax(230px,1fr)_minmax(220px,1.4fr)_auto] lg:items-center"><div className="min-w-0"><p className="m-0 truncate text-sm font-bold text-neutral-950">{request.roomType.name}</p><p className="mb-0 mt-1 flex items-center gap-1.5 text-xs text-neutral-500"><CalendarDays className="h-3.5 w-3.5" />Stay on {formatDate(request.stayDate)}</p>{request.createdAt && <p className="mb-0 mt-1 text-[10px] text-neutral-400">Submitted {formatDate(request.createdAt)}</p>}</div><div className="flex items-center gap-3"><div><p className="m-0 text-[10px] uppercase tracking-wider text-neutral-400">Current</p><p className="mb-0 mt-1 text-xs font-semibold text-neutral-500 line-through">{money(request.currentRate, request.currency)}</p></div><span className="text-neutral-300">→</span><div><p className="m-0 text-[10px] uppercase tracking-wider text-neutral-400">Proposed</p><p className="mb-0 mt-1 text-sm font-bold text-emerald-800">{money(request.proposedRate, request.currency)}</p></div><span className={`rounded-md px-1.5 py-1 text-[10px] font-bold ${delta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{delta >= 0 ? "+" : ""}{delta.toFixed(1)}%</span></div><p className="m-0 line-clamp-2 text-xs leading-5 text-neutral-600" title={request.reason}>{request.reason}</p><span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold ring-1 ${statusStyles[request.status] || statusStyles.DISMISSED}`}><StatusIcon status={request.status} />{request.status === "APPLIED" ? "APPROVED" : request.status === "DISMISSED" ? "DECLINED" : request.status}</span></article>; })}</div> : <div className="grid min-h-80 place-items-center p-8 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50"><History className="h-5 w-5 text-emerald-700" /></span><h3 className="mb-0 mt-4 text-sm font-bold text-neutral-900">{filter === "ALL" ? "No proposals yet" : `No ${filter.toLowerCase()} proposals`}</h3><p className="mb-0 mt-1 max-w-sm text-xs leading-5 text-neutral-500">{filter === "ALL" ? "Your first proposal will appear here with its approval status and full commercial context." : "Choose another status to review the rest of the proposal history."}</p></div></div>}
      </section>
    </div>
  </div>;
}

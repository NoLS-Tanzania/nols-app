"use client";
import React, { useEffect, useMemo, useState } from 'react';
import TableRow from "@/components/TableRow";
import { ArrowUpDown, Calendar, ChevronLeft, ChevronRight, Eye, RotateCcw } from "lucide-react";
import Link from "next/link";

type BookingRow = {
  id: number;
  status: string;
  checkIn: string;
  checkOut: string;
  guestName?: string | null;
  roomCode?: string | null;
  totalAmount?: number;
  property?: { id: number; title?: string };
};

type PropertyOption = {
  id: number;
  title: string;
  regionName?: string | null;
  district?: string | null;
};

type SortKey =
  | "newest"
  | "oldest"
  | "checkInAsc"
  | "checkInDesc"
  | "propertyAsc"
  | "guestAsc"
  | "statusAsc";

export default function BookingsManagementPage(){
  const apiBase = '';
  const [items, setItems] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  const [propertyIdFilter, setPropertyIdFilter] = useState<string>("all");
  const [propertyOptions, setPropertyOptions] = useState<PropertyOption[]>([]);
  const [propertyOptionsLoading, setPropertyOptionsLoading] = useState(false);

  const isAnyFilterActive =
    propertyIdFilter !== "all" || statusFilter !== "all" || sortKey !== "newest";

  const controlBase =
    "h-11 rounded-xl border bg-white px-4 text-sm text-slate-800 shadow-sm " +
    "transition-[border-color,box-shadow] duration-200 " +
    "focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e]/40 ";

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const base = `${apiBase.replace(/\/$/, '')}/api/admin/bookings`;
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "25",
        });
        if (propertyIdFilter !== "all") params.set("propertyId", propertyIdFilter);
        const url = `${base}?${params.toString()}`;
        const r = await fetch(url, {
          credentials: "include",
        });
        if (!r.ok) throw new Error('fetch failed');
        const contentType = r.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const j = await r.json();
          if (!mounted) return;
          setItems(j.items ?? []);
          setTotal(j.total ?? 0);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (e: any) {
        console.error('bookings fetch', e);
        if (mounted) {
          setError(e?.message ?? 'Failed to load bookings');
          setItems([]);
        }
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [page, apiBase, propertyIdFilter]);

  useEffect(() => {
    // Ensure paging doesn't strand the user on an empty page
    setPage(1);
  }, [propertyIdFilter]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    (async () => {
      try {
        setPropertyOptionsLoading(true);
        const base = `${apiBase.replace(/\/$/, '')}/api/admin/properties/booked`;
        const params = new URLSearchParams({
          status: "APPROVED",
          page: "1",
          pageSize: "5000",
        });
        const url = `${base}?${params.toString()}`;

        const r = await fetch(url, { credentials: "include", signal: controller.signal });
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        const j = await r.json();
        if (!mounted) return;
        const opts = Array.isArray(j?.items) ? j.items : [];
        setPropertyOptions(
          opts
            .map((p: any) => ({
              id: Number(p.id),
              title: String(p.title ?? `Property #${p.id}`),
              regionName: p.regionName ?? null,
              district: p.district ?? null,
            }))
            .filter((p: any) => Number.isFinite(p.id))
        );
      } catch {
        if (!mounted) return;
        setPropertyOptions([]);
      } finally {
        if (mounted) setPropertyOptionsLoading(false);
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [apiBase]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const b of items) {
      if (typeof b?.status === "string" && b.status.trim()) set.add(b.status);
    }
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const filteredAndSorted = useMemo(() => {
    const matchesStatus = (b: BookingRow) => {
      if (statusFilter === "all") return true;
      return (b.status ?? "") === statusFilter;
    };

    const copy = items.filter((b) => matchesStatus(b));

    const getTime = (value: string) => {
      const t = Date.parse(value);
      return Number.isFinite(t) ? t : 0;
    };

    copy.sort((a, b) => {
      switch (sortKey) {
        case "newest":
          return (b.id ?? 0) - (a.id ?? 0);
        case "oldest":
          return (a.id ?? 0) - (b.id ?? 0);
        case "checkInAsc":
          return getTime(a.checkIn) - getTime(b.checkIn);
        case "checkInDesc":
          return getTime(b.checkIn) - getTime(a.checkIn);
        case "propertyAsc": {
          const at = (a.property?.title ?? "").toLowerCase();
          const bt = (b.property?.title ?? "").toLowerCase();
          if (at !== bt) return at.localeCompare(bt);
          return (b.id ?? 0) - (a.id ?? 0);
        }
        case "guestAsc": {
          const ag = (a.guestName ?? "").toLowerCase();
          const bg = (b.guestName ?? "").toLowerCase();
          if (ag !== bg) return ag.localeCompare(bg);
          return (b.id ?? 0) - (a.id ?? 0);
        }
        case "statusAsc": {
          const as = (a.status ?? "").toLowerCase();
          const bs = (b.status ?? "").toLowerCase();
          if (as !== bs) return as.localeCompare(bs);
          return (b.id ?? 0) - (a.id ?? 0);
        }
        default:
          return 0;
      }
    });

    return copy;
  }, [items, sortKey, statusFilter]);


  function getStatusBadgeClass(status: string) {
    const s = status.toLowerCase();
    const base = "inline-flex items-center px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase tracking-[0.08em] ";
    if (s.includes('confirmed') || s.includes('active')) return base + "bg-[#02665e]/[0.08] border-[#02665e]/20 text-[#02665e]";
    if (s.includes('pending') || s.includes('new')) return base + "bg-amber-50 border-amber-200/80 text-amber-700";
    if (s.includes('cancel') || s.includes('reject')) return base + "bg-red-50 border-red-200/70 text-red-600";
    if (s.includes('checked_in') || s.includes('checkin')) return base + "bg-sky-50 border-sky-200/70 text-sky-700";
    if (s.includes('checked_out') || s.includes('checkout') || s.includes('complete')) return base + "bg-violet-50 border-violet-200/70 text-violet-700";
    return base + "bg-slate-50 border-slate-200 text-slate-600";
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200/70 rounded-[16px] p-4 flex items-start justify-between gap-3 shadow-sm">
          <div className="text-sm text-red-700 break-words font-medium">{error}</div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 text-red-400 hover:text-red-600 transition text-lg leading-none"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      <div className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] px-8 py-7">
        <div className="flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-[#02665e]/10 flex items-center justify-center mb-4">
            <Calendar className="h-7 w-7 text-[#02665e]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Bookings
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Showing admin booking records
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="border-b border-slate-100 bg-white/80 backdrop-blur-xl">
          <div className="p-4 sm:p-5">
            <div className="mx-auto w-full max-w-6xl">
              <div
                className={
                  "rounded-2xl border p-3 " +
                  "transition-[background-color,border-color,box-shadow] duration-300 ease-out " +
                  (isAnyFilterActive
                    ? "border-[#02665e]/25 bg-[#02665e]/[0.04] shadow-sm"
                    : "border-slate-200/80 bg-slate-50/60")
                }
              >
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-center">
                <label className="sr-only" htmlFor="bookings-property">Property</label>
                <select
                  id="bookings-property"
                  value={propertyIdFilter}
                  onChange={(e) => setPropertyIdFilter(e.target.value)}
                  className={
                    controlBase +
                    " w-full sm:w-96 " +
                    (propertyIdFilter !== "all"
                      ? "border-[#02665e]/40"
                      : "border-slate-200 hover:border-slate-300")
                  }
                >
                  <option value="all">All approved booked properties</option>
                  {propertyOptionsLoading ? (
                    <option value="__loading" disabled>
                      Loading properties…
                    </option>
                  ) : null}
                  {propertyOptions.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.title}
                      {p.district || p.regionName ? ` — ${[p.district, p.regionName].filter(Boolean).join(", ")}` : ""}
                    </option>
                  ))}
                </select>

              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor="bookings-status">Status</label>
                <select
                  id="bookings-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={
                    controlBase +
                    (statusFilter !== "all"
                      ? "border-[#02665e]/40"
                      : "border-slate-200 hover:border-slate-300")
                  }
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s === "all" ? "All statuses" : s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className={"h-4 w-4 flex-shrink-0 transition-colors duration-200 " + (sortKey !== "newest" ? "text-[#02665e]" : "text-slate-400")} />
                <label className="sr-only" htmlFor="bookings-sort">Sort</label>
                <select
                  id="bookings-sort"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className={
                    controlBase +
                    (sortKey !== "newest"
                      ? "border-[#02665e]/40"
                      : "border-slate-200 hover:border-slate-300")
                  }
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="checkInAsc">Check-in (soonest)</option>
                  <option value="checkInDesc">Check-in (latest)</option>
                  <option value="propertyAsc">Property (A → Z)</option>
                  <option value="guestAsc">Guest (A → Z)</option>
                  <option value="statusAsc">Status (A → Z)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setSortKey("newest");
                  setPropertyIdFilter("all");
                }}
                aria-label="Reset filters"
                title="Reset filters"
                className={
                  "h-11 w-11 inline-flex items-center justify-center rounded-xl border bg-white shadow-sm " +
                  "transition-[border-color,color,background-color] duration-200 " +
                  (isAnyFilterActive
                    ? "border-[#02665e]/35 text-[#02665e] hover:bg-[#02665e]/[0.06]"
                    : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-[#02665e]")
                }
              >
                <RotateCcw className="h-4 w-4" />
              </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">ID</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Property</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Guest</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Check-in</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Check-out</th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Status</th>
                <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableRow hover={false}>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400 font-medium">
                    Loading…
                  </td>
                </TableRow>
              ) : filteredAndSorted.length === 0 ? (
                <TableRow hover={false}>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400 font-medium">
                    No bookings found
                  </td>
                </TableRow>
              ) : (
                filteredAndSorted.map(b => (
                  <TableRow key={b.id}>
                    <td className="px-5 py-3.5 text-sm font-bold text-slate-900 whitespace-nowrap tabular-nums">
                      #{b.id}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-slate-800 max-w-[220px] truncate">
                      {b.property?.title ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">
                      {b.guestName ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-sm whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{new Date(b.checkIn).toLocaleDateString()}</span>
                      <br />
                      <span className="text-xs text-slate-400">
                        {new Date(b.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{new Date(b.checkOut).toLocaleDateString()}</span>
                      <br />
                      <span className="text-xs text-slate-400">
                        {new Date(b.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={getStatusBadgeClass(b.status)}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-center">
                        <Link
                          href={`/admin/management/bookings/${b.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#02665e] border border-[#02665e]/25 hover:bg-[#02665e] hover:text-white hover:border-[#02665e] transition-all duration-200"
                          title="View booking details"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Link>
                      </div>
                    </td>
                  </TableRow>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] px-5 py-4">
        <div className="flex gap-2">
          <button
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#02665e]/40 hover:text-[#02665e] hover:bg-[#02665e]/[0.04] disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#02665e]/40 hover:text-[#02665e] hover:bg-[#02665e]/[0.04] disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => setPage(p => p + 1)}
            disabled={items.length < 25 || loading || (page * 25 >= total)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="text-sm text-slate-500">
          Page <span className="font-bold text-slate-900">{page}</span>
          {total > 0 && (
            <span className="ml-2">
              · <span className="text-slate-700 font-semibold">{total}</span> total
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

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
    "h-11 rounded-2xl border bg-white/80 px-4 text-sm text-gray-900 shadow-sm ring-1 ring-black/[0.03] " +
    "transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out " +
    "hover:-translate-y-[1px] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#02665e]/20";

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
    const statusLower = status.toLowerCase();
    if (statusLower.includes('confirmed') || statusLower.includes('active')) {
      return "inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium";
    }
    if (statusLower.includes('pending') || statusLower.includes('new')) {
      return "inline-flex items-center px-2 py-1 rounded-md bg-yellow-50 text-yellow-700 text-xs font-medium";
    }
    if (statusLower.includes('cancel') || statusLower.includes('reject')) {
      return "inline-flex items-center px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium";
    }
    if (statusLower.includes('check') || statusLower.includes('complete')) {
      return "inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium";
    }
    return "inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-gray-700 text-xs font-medium";
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start justify-between gap-3">
          <div className="text-sm text-red-700 break-words">{error}</div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 no-underline"
            aria-label="Dismiss error"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <Calendar className="h-8 w-8 text-gray-400 mb-3" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Bookings
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Showing admin booking records
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200/70 bg-white/70 backdrop-blur-xl transition-[background-color,border-color] duration-300 ease-out">
          <div className="p-4">
            <div className="mx-auto w-full max-w-6xl">
              <div
                className={
                  "rounded-3xl border p-2.5 shadow-sm ring-1 ring-black/[0.03] " +
                  "transition-[background-color,border-color,box-shadow] duration-300 ease-out " +
                  (isAnyFilterActive
                    ? "border-[#02665e]/30 bg-gradient-to-r from-[#02665e]/[0.07] via-white/70 to-white/70 shadow-md"
                    : "border-gray-200/80 bg-white/70")
                }
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
                <label className="sr-only" htmlFor="bookings-property">Property</label>
                <select
                  id="bookings-property"
                  value={propertyIdFilter}
                  onChange={(e) => setPropertyIdFilter(e.target.value)}
                  className={
                    controlBase +
                    " w-full sm:w-96 " +
                    (propertyIdFilter !== "all"
                      ? "border-[#02665e]/40 bg-white shadow-md"
                      : "border-gray-200/80 hover:border-[#02665e]/25 focus:border-[#02665e]/40")
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
                      ? "border-[#02665e]/40 bg-white shadow-md"
                      : "border-gray-200/80 hover:border-[#02665e]/25 focus:border-[#02665e]/40")
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
                  <ArrowUpDown className={"h-4 w-4 transition-colors duration-200 " + (sortKey !== "newest" ? "text-[#02665e]" : "text-gray-400")} />
                <label className="sr-only" htmlFor="bookings-sort">Sort</label>
                <select
                  id="bookings-sort"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className={
                      controlBase +
                      (sortKey !== "newest"
                        ? "border-[#02665e]/40 bg-white shadow-md"
                        : "border-gray-200/80 hover:border-[#02665e]/25 focus:border-[#02665e]/40")
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
                  title="Reset"
                  className={
                    "h-11 w-11 inline-flex items-center justify-center rounded-2xl border bg-white/80 shadow-sm ring-1 ring-black/[0.03] " +
                    "transition-[background-color,border-color,box-shadow,transform,color] duration-300 ease-out " +
                    "hover:-translate-y-[1px] hover:shadow-md active:translate-y-0 " +
                    (isAnyFilterActive
                      ? "border-[#02665e]/30 text-[#02665e] hover:border-[#02665e]/40"
                      : "border-gray-200/80 text-gray-600 hover:border-[#02665e]/25 hover:text-[#02665e]")
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <TableRow hover={false}>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    Loading…
                  </td>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow hover={false}>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    No bookings
                  </td>
                </TableRow>
              ) : (
                filteredAndSorted.map(b => (
                  <TableRow key={b.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {b.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {b.property?.title ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {b.guestName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {new Date(b.checkIn).toLocaleDateString()}
                      <br />
                      <span className="text-xs text-gray-500">
                        {new Date(b.checkIn).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {new Date(b.checkOut).toLocaleDateString()}
                      <br />
                      <span className="text-xs text-gray-500">
                        {new Date(b.checkOut).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={getStatusBadgeClass(b.status)}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex justify-center">
                        <Link
                          href={`/admin/management/bookings/${b.id}`}
                          className="p-2 rounded-lg text-[#02665e] hover:bg-[#02665e]/10 transition-all duration-200"
                          title="View booking details"
                        >
                          <Eye className="h-5 w-5" />
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

      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex gap-2">
          <button 
            className="p-2 border border-gray-300 rounded-lg hover:border-[#02665e] hover:text-[#02665e] transition-all duration-200 active:border-[#02665e] active:text-[#02665e] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button 
            className="p-2 border border-gray-300 rounded-lg hover:border-[#02665e] hover:text-[#02665e] transition-all duration-200 active:border-[#02665e] active:text-[#02665e] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            onClick={() => setPage(p => p + 1)}
            disabled={items.length < 25 || loading || (page * 25 >= total)}
            aria-label="Next page"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="text-sm text-gray-600">
          Page <span className="font-semibold text-gray-900">{page}</span>
          {total > 0 && (
            <span className="ml-2 text-gray-500">
              (Total: {total})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

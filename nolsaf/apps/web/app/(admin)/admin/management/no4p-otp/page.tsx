"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import apiClient from "@/lib/apiClient";
import TableRow from "@/components/TableRow";
import DatePicker from "@/components/ui/DatePicker";
import { KeyRound, ShieldCheck, ChevronLeft, ChevronRight, Search, X, CheckCircle2, Clock, Ban, Filter, Calendar, Download } from "lucide-react";

const api = apiClient;

type OtpRow = {
  id: number | string;
  role: string | null;
  name: string | null;
  codeMasked: string | null;
  destinationType: string | null;
  destination: string | null;
  requestedAt: string;
  expiresAt: string | null;
  status: "valid" | "expired" | "used" | "unknown";
  usedAt: string | null;
  usedFor: string | null;
  provider: any;
  policyCompliant: boolean | null;
};

type Meta = {
  page: number;
  pageSize: number;
  total: number;
};

type Notice = {
  tone: "success" | "error";
  title: string;
  message?: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function statusPill(status: OtpRow["status"]) {
  switch (status) {
    case "used":
      return {
        label: "Used",
        Icon: CheckCircle2,
        className:
          "bg-success/10 text-success ring-1 ring-success/25 dark:bg-success/15 dark:text-emerald-300 dark:ring-success/30",
      };
    case "expired":
      return {
        label: "Expired",
        Icon: Clock,
        className:
          "bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/30",
      };
    case "valid":
      return {
        label: "Valid",
        Icon: ShieldCheck,
        className:
          "bg-brand/10 text-brand ring-1 ring-brand/25 dark:bg-brand/15 dark:text-brand-100 dark:ring-brand/30",
      };
    default:
      return {
        label: "Unknown",
        Icon: Ban,
        className:
          "bg-slate-500/10 text-slate-800 ring-1 ring-slate-500/25 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-400/30",
      };
  }
}

function localTodayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Page() {
  const [rows, setRows] = useState<OtpRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "valid" | "expired" | "used">("all");
  const [date, setDate] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const maxDate = useMemo(() => localTodayYmd(), []);

  const load = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const params: any = { page, pageSize, status };
      if (q) params.q = q;
      if (date) params.date = date;
      const res = await api.get("/api/admin/no4p-otp", { params });
      const data = res.data?.data;
      const meta: Meta | undefined = res.data?.meta;
      setRows(Array.isArray(data) ? data : []);
      setTotal(meta?.total ?? 0);
    } catch (e) {
      console.error(e);
      setRows([]);
      setTotal(0);
      setNotice({
        tone: "error",
        title: "Failed to load OTP usage",
        message: "Please try again in a moment.",
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, status, date]);

  const exportCsv = useCallback(async () => {
    setNotice(null);
    try {
      const params: any = { status };
      if (q) params.q = q;
      if (date) params.date = date;
      const res = await api.get("/api/admin/no4p-otp/export.csv", {
        params,
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `no4p-otp-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice({
        tone: "success",
        title: "CSV export started",
        message: "The export contains No4P OTP records still inside the 30-day hot database window.",
      });
    } catch (e) {
      console.error(e);
      setNotice({
        tone: "error",
        title: "Failed to export OTP CSV",
        message: "Please try again in a moment.",
      });
    }
  }, [q, status, date]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, status, date]);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-black/5 dark:border-white/15 dark:bg-slate-950/50 md:mb-6 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
                <KeyRound className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-black tracking-tight text-slate-950 dark:text-brand-50 md:text-2xl">No4P OTP</h1>
                <p className="mt-0.5 max-w-3xl text-sm leading-5 text-slate-600 dark:text-slate-300">
                  OTP requests, usage, expiry, and policy flags.
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/15 bg-brand/5 px-3 py-1 text-xs font-bold text-brand dark:border-brand-100/20 dark:bg-brand-100/10 dark:text-brand-100">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                Security log
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                30-day retention
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            title="Export current No4P OTP view to CSV"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </button>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-white/10">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full min-w-0 lg:w-72 lg:flex-none">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search phone or email"
                className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-12 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand/30 focus:bg-white focus:ring-2 focus:ring-brand/15 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:bg-white/10"
              />
              {q ? (
                <button
                  onClick={() => {
                    setQ("");
                    setPage(1);
                    requestAnimationFrame(() => searchInputRef.current?.focus());
                  }}
                  type="button"
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-slate-100"
                  aria-label="Clear search"
                  title="Clear"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
              <div className="relative w-full min-w-0 sm:w-56 sm:flex-none">
                <Filter className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 pl-11 pr-10 text-sm font-semibold text-slate-900 outline-none transition focus:border-brand/30 focus:bg-white focus:ring-2 focus:ring-brand/15 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:bg-white/10"
                >
                  <option value="all">All statuses</option>
                  <option value="valid">Valid</option>
                  <option value="expired">Expired</option>
                  <option value="used">Used</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                className="inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 transition hover:bg-white hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 sm:w-44 sm:flex-none"
                aria-label={date ? `Filter date: ${date}` : "Filter by date"}
                title={date ? `Date: ${date}` : "Pick a date"}
              >
                <Calendar className={date ? "h-5 w-5 text-brand" : "h-5 w-5 text-slate-400"} />
                {date || "Date"}
              </button>
            </div>
          </div>

          {pickerOpen ? (
            <>
              <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm" onClick={() => setPickerOpen(false)} />
              <div className="fixed z-40 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <DatePicker
                  selected={date || undefined}
                  allowRange={false}
                  allowPast={true}
                  maxDate={maxDate}
                  onSelectAction={(s) => {
                    const next = Array.isArray(s) ? s[0] : s;
                    setDate(next || "");
                    setPage(1);
                    setPickerOpen(false);
                  }}
                  onCloseAction={() => setPickerOpen(false)}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>

      {notice ? (
        <div
          className={
            notice.tone === "success"
              ? "mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100"
              : "mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100"
          }
        >
          <div className="text-sm font-semibold">{notice.title}</div>
          {notice.message ? <div className="text-sm opacity-90">{notice.message}</div> : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-sm ring-1 ring-black/5 dark:border-white/15 dark:bg-slate-950/50">
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-700 via-brand-600 to-brand-700" />

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full">
            <thead>
              <tr className="bg-brand-600 text-left text-xs font-semibold uppercase tracking-wide text-white">
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Username / Name</th>
                <th className="px-4 py-3">OTP Code</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Requested At</th>
                <th className="px-4 py-3">OTP Validity</th>
                <th className="px-4 py-3">Used At</th>
                <th className="px-4 py-3">Used For</th>
                <th className="px-4 py-3">Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-800 dark:divide-white/10 dark:text-slate-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <td className="px-4 py-3" colSpan={9}>
                      <div className="h-4 w-full animate-pulse rounded bg-slate-200/70 dark:bg-white/10" />
                    </td>
                  </TableRow>
                ))
              ) : rows.length ? (
                rows.map((r) => {
                  const pill = statusPill(r.status);
                  const PolicyIcon = r.policyCompliant ? ShieldCheck : Ban;
                  return (
                    <TableRow key={r.id} className="transition-colors hover:bg-brand/5 dark:hover:bg-brand/15">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 rounded-2xl bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-900/10 dark:bg-white/10 dark:text-slate-100 dark:ring-white/10">
                          {r.role || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{r.name || "—"}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {r.codeMasked || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-900 dark:text-slate-100">{r.destination || "—"}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{r.destinationType || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatDate(r.requestedAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-2xl px-2.5 py-1 text-xs font-semibold ${pill.className}`}>
                          <pill.Icon className="h-3.5 w-3.5" />
                          {pill.label}
                        </span>
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Expires: {formatDate(r.expiresAt)}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatDate(r.usedAt)}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{r.usedFor || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            r.policyCompliant
                              ? "inline-flex items-center gap-1.5 rounded-2xl bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand ring-1 ring-brand/25 dark:bg-brand/15 dark:text-brand-100 dark:ring-brand/30"
                              : "inline-flex items-center gap-1.5 rounded-2xl bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-500/25 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/30"
                          }
                        >
                          <PolicyIcon className="h-3.5 w-3.5" />
                          {r.policyCompliant ? "Compliant" : "Flag"}
                        </span>
                      </td>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <td className="px-4 py-10 text-center text-sm font-medium text-slate-600 dark:text-slate-300" colSpan={9}>
                    No OTP records found.
                  </td>
                </TableRow>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm dark:border-white/10">
          <div className="text-slate-700 dark:text-slate-300">
            Page <span className="font-semibold text-slate-900 dark:text-slate-100">{page}</span> of {totalPages}
            <span className="ml-2">•</span>
            <span className="ml-2">Total: {total}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-300 bg-white font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:bg-slate-950/50 dark:text-slate-100 dark:hover:bg-white/10"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-300 bg-white font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:bg-slate-950/50 dark:text-slate-100 dark:hover:bg-white/10"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

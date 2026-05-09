"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Search, ShieldCheck } from "lucide-react";

type Audit = {
  id: number;
  adminId?: number | null;
  targetUserId?: number | null;
  action: string;
  details: any;
  createdAt: string;
};

const pageSize = 12;

export default function AuditLogPage() {
  const [data, setData] = useState<Audit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const exportUrl = "/api/admin/audits?format=csv";
  const audits = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const filteredAudits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return audits;
    return audits.filter((audit) => {
      const haystack = [
        audit.id,
        audit.adminId,
        audit.targetUserId,
        audit.action,
        audit.createdAt,
        JSON.stringify(audit.details ?? {}),
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [audits, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filteredAudits.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedAudits = filteredAudits.slice((safePage - 1) * pageSize, safePage * pageSize);

  function coerceAudits(json: any): Audit[] {
    if (json && typeof json === "object") {
      const dataNode = json.data;
      if (Array.isArray(dataNode)) return dataNode as Audit[];
      if (dataNode && typeof dataNode === "object") {
        if (Array.isArray(dataNode.items)) return dataNode.items as Audit[];
        if (Array.isArray(dataNode.audits)) return dataNode.audits as Audit[];
      }
      if (Array.isArray(json.items)) return json.items as Audit[];
      if (Array.isArray(json.audits)) return json.audits as Audit[];
    }
    if (Array.isArray(json)) return json as Audit[];
    return [];
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/audits", { credentials: "include" });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const contentType = res.headers.get("content-type");
        if (!contentType?.includes("application/json")) throw new Error("Invalid response format");
        const json = await res.json();
        if (mounted) setData(coerceAudits(json));
      } catch (err: any) {
        if (mounted) setError(err?.message ?? String(err));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const header = (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/70 shadow-sm backdrop-blur">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50" />
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Audit Log</h1>
          <p className="mt-1 text-sm text-slate-600">Immutable trails for important admin and system actions</p>
        </div>
      </div>
    </div>
  );

  const controls = (
    <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white/70 p-4 shadow-sm backdrop-blur">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-stretch">
          <SummaryPill label="Loaded" value={audits.length} />
          <SummaryPill label="Showing" value={filteredAudits.length} tone={query ? "emerald" : "slate"} />
          <a
            href={exportUrl}
            className="inline-flex min-h-[4.5rem] items-center justify-center gap-2 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-bold text-emerald-700 no-underline shadow-sm transition-all duration-300 hover:-translate-y-px hover:bg-emerald-100 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
            download
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </div>

        <div className="relative mx-auto w-full sm:max-w-2xl">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search action, admin, details..."
            className="w-full rounded-2xl border border-slate-200/70 bg-white py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition-all duration-300 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#02665e] focus:ring-2 focus:ring-[#02665e]/20"
          />
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="min-h-full w-full bg-slate-50">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {header}
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 shadow-sm">
            Failed to load audits: {error}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-full w-full bg-slate-50">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {header}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm font-medium text-slate-500 shadow-sm">
            Loading audit logs...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full max-w-full overflow-x-hidden bg-slate-50">
      <div className="mx-auto max-w-7xl min-w-0 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {header}
        {controls}

        <div className="max-w-full overflow-hidden rounded-3xl border border-slate-200/60 bg-white/70 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">Audit entries</h2>
              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredAudits.length ? (safePage - 1) * pageSize + 1 : 0}-{Math.min(safePage * pageSize, filteredAudits.length)} of {filteredAudits.length}
              </p>
            </div>
            <PaginationControls page={safePage} totalPages={totalPages} onPageChange={setPage} />
          </div>
          <div className="w-full max-w-full overflow-x-auto xl:overflow-x-hidden">
            <table className="w-full min-w-[900px] table-fixed divide-y divide-slate-100 xl:min-w-0">
              <colgroup>
                <col className="w-[13rem]" />
                <col className="w-[5rem]" />
                <col className="w-[18rem]" />
                <col className="w-[5rem]" />
                <col />
              </colgroup>
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">Time</th>
                  <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">Admin</th>
                  <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">Action</th>
                  <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">Target</th>
                  <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredAudits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center">
                      <div className="mx-auto max-w-sm">
                        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                          <ShieldCheck className="h-5 w-5 text-slate-500" />
                        </div>
                        <div className="text-sm font-bold text-slate-900">No audit logs found</div>
                        <div className="mt-1 text-xs text-slate-600">Actions will appear here as admins make changes.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedAudits.map((audit) => (
                    <tr key={audit.id} className="transition-colors hover:bg-slate-50">
                      <td className="truncate px-4 py-3 text-sm font-semibold text-slate-900">
                        {new Date(audit.createdAt).toLocaleString()}
                      </td>
                      <td className="truncate px-4 py-3 text-sm text-slate-700">{audit.adminId ?? "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <span className="inline-flex max-w-full items-center truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-black text-slate-900">
                          {formatAction(audit.action)}
                        </span>
                      </td>
                      <td className="truncate px-4 py-3 text-sm text-slate-700">{audit.targetUserId ?? "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div
                          className="group/details relative w-full cursor-help truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-[11px] leading-5 text-slate-600 outline-none transition-colors hover:border-emerald-200 hover:bg-white focus:border-emerald-300 focus:bg-white"
                          tabIndex={0}
                          title={formatDetails(audit.details)}
                        >
                          {formatDetails(audit.details)}
                          <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-[min(34rem,calc(100vw-3rem))] rounded-xl border border-slate-200 bg-white p-3 font-mono text-[11px] leading-5 text-slate-700 shadow-xl ring-1 ring-black/[0.03] group-hover/details:block group-focus/details:block">
                            <div className="mb-1 font-sans text-[10px] font-black uppercase tracking-wide text-slate-400">Full details</div>
                            <div className="max-h-56 overflow-auto whitespace-pre-wrap break-words">{formatDetails(audit.details)}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredAudits.length > pageSize ? (
            <div className="border-t border-slate-100 px-4 py-3">
              <PaginationControls page={safePage} totalPages={totalPages} onPageChange={setPage} align="end" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PaginationControls({
  page,
  totalPages,
  onPageChange,
  align = "start",
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  align?: "start" | "end";
}) {
  return (
    <div className={`flex items-center gap-2 ${align === "end" ? "justify-end" : ""}`}>
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="min-w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-slate-600">
        {page} / {totalPages}
      </div>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function SummaryPill({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "emerald" }) {
  const valueClass = tone === "emerald" ? "text-emerald-700" : "text-slate-950";
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/60 px-4 py-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-px hover:shadow-md">
      <div className={`text-xl font-black leading-none ${valueClass}`}>{value}</div>
      <div className="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function formatAction(action: string) {
  return action.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDetails(details: any) {
  if (details == null) return "-";
  if (typeof details === "string") return details;
  if (typeof details === "object") return JSON.stringify(details) || "-";
  return String(details);
}

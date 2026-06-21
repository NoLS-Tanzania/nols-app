"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Bug, CheckCircle2, ChevronLeft, ChevronRight, Clock3, ExternalLink, FileCode2, History, RefreshCw, Search, ServerCrash, ShieldCheck, UserRound, Users, X } from "lucide-react";
import apiClient from "@/lib/apiClient";

type ImpactedUser = {
  key: string;
  userId: number | null;
  role: string | null;
  name: string | null;
  email: string | null;
  label: string;
  eventCount: number;
  slowCount: number;
  serverErrorCount: number;
  clientErrorCount: number;
  routes: string[];
  lastSeenAt: string | null;
  lastEvent: {
    action: string;
    route: string | null;
    path: string | null;
    statusCode: number | null;
    durationMs: number | null;
    message: string | null;
    requestId: string | null;
    source: string | null;
    stack: string | null;
    componentStack: string | null;
    release: string | null;
    diagnostic: ErrorDiagnostic | null;
  } | null;
  resolution: {
    status: "open" | "restored";
    note: string | null;
    restoredAt: string | null;
    restoredBy: {
      id: number | null;
      name: string | null;
      email: string | null;
      role: string | null;
    } | null;
  };
};

type ErrorDiagnostic = {
  service: "web" | "api";
  release: string | null;
  fingerprint: string;
  primaryFrame: DiagnosticFrame | null;
  frames: DiagnosticFrame[];
};

type DiagnosticFrame = {
  functionName: string | null;
  file: string;
  line: number | null;
  column: number | null;
  inApp: boolean;
  mapped: boolean;
  codeContext?: Array<{ line: number; content: string; highlight: boolean }>;
  sourceLink?: string | null;
};

type Filter = "all" | "critical" | "slow" | "client" | "server" | "known" | "visitors" | "restored";
const pageSize = 8;

export default function AdminImpactCenterPage() {
  const [items, setItems] = useState<ImpactedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [restoreTarget, setRestoreTarget] = useState<ImpactedUser | null>(null);
  const [restoreNote, setRestoreNote] = useState("");
  const [restoring, setRestoring] = useState(false);

  const load = async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/api/admin/observability/impacted-users?limit=80");
      setItems(res.data?.items ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to load impacted users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const id = window.setInterval(() => load(true), 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filter, query]);

  const summary = useMemo(() => {
    const activeItems = items.filter((item) => item.resolution?.status !== "restored");
    return {
      people: items.length,
      critical: activeItems.filter((item) => item.serverErrorCount > 0 || item.clientErrorCount > 0).length,
      slow: activeItems.filter((item) => item.slowCount > 0).length,
      client: activeItems.filter((item) => item.clientErrorCount > 0).length,
      known: activeItems.filter((item) => item.userId).length,
      visitors: activeItems.filter((item) => !item.userId).length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "restored" && item.resolution?.status !== "restored") return false;
      if (filter !== "restored" && item.resolution?.status === "restored") return false;
      if (filter === "critical" && item.serverErrorCount + item.clientErrorCount === 0) return false;
      if (filter === "slow" && item.slowCount === 0) return false;
      if (filter === "client" && item.clientErrorCount === 0) return false;
      if (filter === "server" && item.serverErrorCount === 0) return false;
      if (filter === "known" && !item.userId) return false;
      if (filter === "visitors" && item.userId) return false;
      if (!q) return true;
      const haystack = [
        item.label,
        item.email,
        item.role,
        item.userId ? String(item.userId) : "",
        item.lastEvent?.message,
        item.lastEvent?.route,
        item.lastEvent?.path,
        item.lastEvent?.diagnostic?.primaryFrame?.file,
        item.lastEvent?.diagnostic?.fingerprint,
        ...item.routes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [filter, items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  async function markRestored() {
    if (!restoreTarget) return;
    setRestoring(true);
    setError(null);
    try {
      await apiClient.post("/api/admin/observability/impacted-users/restore", {
        impactKey: restoreTarget.key,
        label: restoreTarget.label,
        note: restoreNote,
      });
      setRestoreTarget(null);
      setRestoreNote("");
      await load(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to mark impact item as restored");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8f8]">
      <div className="space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="border border-[#02665e] bg-[#02665e] text-white shadow-sm">
          <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <Link href="/admin/observability" className="inline-flex items-center gap-2 text-sm font-semibold text-white/65 no-underline transition-colors hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Observability
              </Link>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-white">Impact Center</h1>
                <span className={`inline-flex w-fit items-center gap-2 border px-3 py-1 text-xs font-bold ${summary.critical > 0 ? "border-red-200 bg-white text-red-700" : "border-emerald-200 bg-white text-[#02665e]"}`}>
                  <span className={`h-2 w-2 rounded-full ${summary.critical > 0 ? "bg-red-500" : "bg-[#02665e]"}`} />
                  {summary.critical > 0 ? "Needs review" : "Quiet"}
                </span>
              </div>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-white/65">
                People-first incident triage for slow calls, server errors, and frontend crashes across known users and visitor sessions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex h-10 w-10 items-center justify-center border border-white/20 bg-white text-[#02665e] shadow-sm transition-colors hover:bg-emerald-50 disabled:opacity-60"
              aria-label="Refresh impact center"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div> : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <SummaryCard icon={UserRound} label="Impacted people" value={summary.people} tone="slate" />
          <SummaryCard icon={AlertTriangle} label="Critical people" value={summary.critical} tone={summary.critical > 0 ? "red" : "green"} />
          <SummaryCard icon={Clock3} label="Slow experience" value={summary.slow} tone={summary.slow > 0 ? "amber" : "green"} />
          <SummaryCard icon={Bug} label="Frontend crash" value={summary.client} tone={summary.client > 0 ? "red" : "green"} />
          <SummaryCard icon={Users} label="Known users" value={summary.known} tone={summary.known > 0 ? "green" : "slate"} />
          <SummaryCard icon={ShieldCheck} label="Visitors" value={summary.visitors} tone={summary.visitors > 0 ? "amber" : "slate"} />
        </div>

        <section className="overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-900">Affected sessions</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Showing {filtered.length ? (safePage - 1) * pageSize + 1 : 0}-{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative w-full lg:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search user or route"
                    className="h-10 w-full border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#02665e]/40 focus:bg-white focus:ring-2 focus:ring-[#02665e]/10"
                  />
                </div>
                <PaginationControls page={safePage} totalPages={totalPages} onPageChange={setPage} align="end" />
              </div>
            </div>
            <div className="mt-4 flex max-w-full flex-wrap gap-1.5 border border-slate-200 bg-slate-50 p-1">
              <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>All</FilterButton>
              <FilterButton active={filter === "critical"} onClick={() => setFilter("critical")}>Critical</FilterButton>
              <FilterButton active={filter === "server"} onClick={() => setFilter("server")}>5xx</FilterButton>
              <FilterButton active={filter === "client"} onClick={() => setFilter("client")}>Client</FilterButton>
              <FilterButton active={filter === "slow"} onClick={() => setFilter("slow")}>Slow</FilterButton>
              <FilterButton active={filter === "known"} onClick={() => setFilter("known")}>Known users</FilterButton>
              <FilterButton active={filter === "visitors"} onClick={() => setFilter("visitors")}>Visitors</FilterButton>
              <FilterButton active={filter === "restored"} onClick={() => setFilter("restored")}>Restored</FilterButton>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {paginated.map((item) => <ImpactPersonCard key={item.key} item={item} onRestore={() => setRestoreTarget(item)} />)}
            {loading ? <EmptyState label="Loading impacted users" /> : null}
            {!loading && filtered.length === 0 ? <EmptyState label="No impacted users match this view" /> : null}
          </div>
          {!loading && filtered.length > pageSize ? (
            <div className="border-t border-slate-100 px-5 py-4">
              <PaginationControls page={safePage} totalPages={totalPages} onPageChange={setPage} align="end" />
            </div>
          ) : null}
        </section>
      </div>

      {restoreTarget ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div className="flex min-w-0 gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-black text-slate-950">Mark restored</h2>
                  <p className="mt-1 truncate text-sm text-slate-600">{restoreTarget.label}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestoreTarget(null)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                aria-label="Close restore dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-w-0 px-5 py-4">
              <label className="text-xs font-black uppercase tracking-wide text-slate-500" htmlFor="restore-note">
                Restoration note
              </label>
              <div className="mt-2 w-full overflow-hidden rounded-lg">
                <textarea
                  id="restore-note"
                  value={restoreNote}
                  onChange={(event) => setRestoreNote(event.target.value)}
                  placeholder="Example: Latency returned to normal after DB index fix."
                  className="block min-h-28 w-full max-w-full resize-y box-border rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium leading-6 text-slate-800 outline-none transition-colors placeholder:whitespace-normal placeholder:text-slate-400 focus:border-[#02665e]/40 focus:bg-white focus:ring-2 focus:ring-[#02665e]/10"
                  style={{ boxSizing: "border-box" }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">This creates an audit record and updates this item as restored.</p>
            </div>
            <div className="flex flex-col-reverse gap-2 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRestoreTarget(null)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={markRestored}
                disabled={restoring}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                {restoring ? "Saving..." : "Mark Restored"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ImpactPersonCard({ item, onRestore }: { item: ImpactedUser; onRestore: () => void }) {
  const serverIssue = item.serverErrorCount > 0;
  const clientIssue = item.clientErrorCount > 0;
  const critical = serverIssue || clientIssue;
  const restored = item.resolution?.status === "restored";
  const severity = restored ? "Restored" : critical ? "Critical" : item.slowCount > 0 ? "Warning" : "Reviewed";
  const iconClass = restored ? "border-emerald-100 bg-emerald-50 text-emerald-700" : critical ? "border-red-100 bg-red-50 text-red-700" : item.slowCount > 0 ? "border-amber-100 bg-amber-50 text-amber-700" : "border-emerald-100 bg-emerald-50 text-emerald-700";
  const eventLabel = item.lastEvent?.message || item.lastEvent?.route || item.lastEvent?.path || item.lastEvent?.action || "Observed impact";
  const diagnostic = item.lastEvent?.diagnostic;

  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-start">
        <div className="flex min-w-0 gap-3">
          <div className={`grid h-10 w-10 shrink-0 place-items-center border ${iconClass}`}>
            {restored ? <CheckCircle2 className="h-5 w-5" /> : serverIssue ? <ServerCrash className="h-5 w-5" /> : clientIssue ? <Bug className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="truncate text-[15px] font-bold leading-6 text-slate-950">{item.label}</h2>
              <span className={`border px-2 py-0.5 text-[11px] font-bold uppercase ${restored ? "border-emerald-200 bg-emerald-50 text-emerald-700" : critical ? "border-red-200 bg-red-50 text-red-700" : item.slowCount > 0 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                {severity}
              </span>
              {item.role ? <span className="border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-600">{item.role}</span> : null}
              {!item.userId ? <span className="border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold uppercase text-sky-700">Visitor</span> : null}
              {item.userId ? <span className="font-mono text-xs text-slate-400">#{item.userId}</span> : null}
            </div>
            {item.email ? <p className="mt-0.5 truncate text-xs text-slate-500">{item.email}</p> : null}
            <p className="mt-3 max-w-4xl text-sm font-medium leading-6 text-slate-800">{eventLabel}</p>
            {diagnostic ? <DiagnosticPanel diagnostic={diagnostic} rawStack={item.lastEvent?.stack} /> : null}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.routes.map((route) => (
                <span key={route} className="border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-600">
                  {route}
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {item.lastSeenAt ? <span>Last seen {formatTime(item.lastSeenAt)}</span> : null}
              {item.lastEvent?.statusCode ? <span>Status {item.lastEvent.statusCode}</span> : null}
              {item.lastEvent?.durationMs ? <span>{Math.round(item.lastEvent.durationMs)}ms</span> : null}
              {item.lastEvent?.requestId ? <span className="font-mono">req {item.lastEvent.requestId}</span> : null}
            </div>
          </div>
        </div>

        <div className="border border-slate-100 bg-slate-50 p-3">
          <div className="grid grid-cols-4 gap-2 text-center">
            <ImpactCount label="Events" value={item.eventCount} />
            <ImpactCount label="Slow" value={item.slowCount} tone={item.slowCount > 0 ? "amber" : "slate"} />
            <ImpactCount label="5xx" value={item.serverErrorCount} tone={item.serverErrorCount > 0 ? "red" : "slate"} />
            <ImpactCount label="Client" value={item.clientErrorCount} tone={item.clientErrorCount > 0 ? "red" : "slate"} />
          </div>
          {restored ? (
            <div className="mt-3 border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <div className="flex flex-wrap items-center gap-2 font-black">
                <CheckCircle2 className="h-4 w-4" />
                Restored {item.resolution.restoredAt ? formatTime(item.resolution.restoredAt) : ""}
              </div>
              {item.resolution.restoredBy ? (
                <div className="mt-1 text-xs font-semibold text-emerald-800">
                  By {item.resolution.restoredBy.name || item.resolution.restoredBy.email || `Admin #${item.resolution.restoredBy.id}`}
                </div>
              ) : null}
              {item.resolution.note ? <p className="mt-2 leading-6 text-emerald-800">{item.resolution.note}</p> : null}
            </div>
          ) : null}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {item.userId ? (
              <Link href={`/admin/users/list?search=${encodeURIComponent(String(item.userId))}`} className="inline-flex h-9 items-center justify-center gap-2 border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 no-underline shadow-sm hover:bg-slate-50">
                <UserRound className="h-3.5 w-3.5" />
                View user
              </Link>
            ) : null}
            <Link href="/admin/observability" className="inline-flex h-9 items-center justify-center gap-2 border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 no-underline shadow-sm hover:bg-slate-50">
              <ShieldCheck className="h-3.5 w-3.5" />
              Open logs
            </Link>
            <Link href="/admin/management/audit-log" className="inline-flex h-9 items-center justify-center gap-2 border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 no-underline shadow-sm hover:bg-slate-50">
              <History className="h-3.5 w-3.5" />
              Audit
            </Link>
            {!restored ? (
              <button
                type="button"
                onClick={onRestore}
                className="inline-flex h-9 items-center justify-center gap-2 border border-emerald-700 bg-emerald-700 px-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 sm:col-span-3"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark restored
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function DiagnosticPanel({ diagnostic, rawStack }: { diagnostic: ErrorDiagnostic; rawStack?: string | null }) {
  const frame = diagnostic.primaryFrame;
  const location = frame
    ? `${frame.file}${frame.line ? `:${frame.line}` : ""}${frame.column ? `:${frame.column}` : ""}`
    : null;

  return (
    <div className="mt-3 overflow-hidden border border-slate-200 bg-slate-950 text-slate-100 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-white/10 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <FileCode2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              {frame?.mapped ? "Exact source location" : "Generated source location"}
            </div>
            <div className="mt-0.5 truncate font-mono text-xs font-semibold text-slate-100" title={location || undefined}>
              {location || "No stack frame available"}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide">
          <span className="border border-white/10 bg-white/5 px-2 py-1 text-slate-300">{diagnostic.service}</span>
          {diagnostic.release ? <span className="border border-white/10 bg-white/5 px-2 py-1 text-slate-300">{diagnostic.release.slice(0, 12)}</span> : null}
          <span className="border border-white/10 bg-white/5 px-2 py-1 font-mono text-slate-400">{diagnostic.fingerprint}</span>
        </div>
      </div>

      {frame?.codeContext?.length ? (
        <div className="overflow-x-auto py-2 font-mono text-[11px] leading-5">
          {frame.codeContext.map((codeLine) => (
            <div
              key={codeLine.line}
              className={`grid min-w-max grid-cols-[3.5rem_minmax(36rem,1fr)] px-3 ${codeLine.highlight ? "bg-rose-500/15 text-rose-100" : "text-slate-300"}`}
            >
              <span className={`select-none pr-3 text-right ${codeLine.highlight ? "font-black text-rose-300" : "text-slate-600"}`}>{codeLine.line}</span>
              <code className="whitespace-pre">{codeLine.content || " "}</code>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-3 py-2 text-xs text-slate-400">
          {frame?.mapped
            ? "Source identified; nearby code is unavailable in this release artifact."
            : "Private source map not available for this release. The generated line is retained for correlation."}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-3 py-2">
        <div className="text-[10px] font-semibold text-slate-500">
          {frame?.functionName ? `Function: ${frame.functionName}` : `${diagnostic.frames.length} captured frame${diagnostic.frames.length === 1 ? "" : "s"}`}
        </div>
        <div className="flex items-center gap-2">
          {rawStack ? (
            <details className="relative">
              <summary className="cursor-pointer list-none text-[11px] font-bold text-slate-300 hover:text-white">Stack trace</summary>
              <pre className="mt-2 max-h-48 max-w-full overflow-auto whitespace-pre-wrap border border-white/10 bg-black/30 p-2 text-[10px] leading-4 text-slate-400 sm:max-w-2xl">{rawStack}</pre>
            </details>
          ) : null}
          {frame?.sourceLink ? (
            <a
              href={frame.sourceLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 no-underline hover:text-emerald-300"
            >
              Open source <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: typeof UserRound; label: string; value: number; tone: "slate" | "red" | "green" | "amber" }) {
  const classes = {
    slate: {
      card: "border-slate-200 bg-white",
      icon: "border-slate-200 bg-slate-50 text-slate-700",
      value: "text-slate-950",
      label: "text-slate-500",
    },
    red: {
      card: "border-red-100 bg-white",
      icon: "border-red-100 bg-red-50 text-red-700",
      value: "text-red-900",
      label: "text-red-700",
    },
    green: {
      card: "border-emerald-100 bg-white",
      icon: "border-emerald-100 bg-emerald-50 text-emerald-700",
      value: "text-emerald-900",
      label: "text-emerald-700",
    },
    amber: {
      card: "border-amber-100 bg-white",
      icon: "border-amber-100 bg-amber-50 text-amber-700",
      value: "text-amber-900",
      label: "text-amber-700",
    },
  }[tone];
  return (
    <div className={`group border p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${classes.card}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={`text-[11px] font-bold uppercase leading-5 tracking-[0.14em] ${classes.label}`}>{label}</div>
          <div className={`mt-2 text-2xl font-black tracking-tight ${classes.value}`}>{value}</div>
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center border shadow-sm transition-transform duration-300 group-hover:scale-105 ${classes.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 border px-2.5 text-xs font-bold transition-all sm:px-3 sm:text-sm ${
        active
          ? "border-emerald-200 bg-emerald-700 text-white shadow-sm shadow-emerald-900/10"
          : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950"
      }`}
    >
      {children}
    </button>
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
        className="inline-flex h-9 w-9 items-center justify-center border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="min-w-24 border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-slate-600">
        {page} / {totalPages}
      </div>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="inline-flex h-9 w-9 items-center justify-center border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ImpactCount({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "amber" | "red" }) {
  const valueClass = tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : "text-slate-900";
  return (
    <div className="border border-slate-200 bg-white px-2 py-2">
      <div className={`text-base font-black ${valueClass}`}>{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="px-4 py-12 text-center text-sm font-medium text-slate-500">{label}</div>;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

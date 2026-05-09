"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Bug, CheckCircle2, ChevronLeft, ChevronRight, Clock3, History, RefreshCw, Search, ServerCrash, ShieldCheck, UserRound, Users, X } from "lucide-react";
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
    return {
      people: items.length,
      critical: items.filter((item) => item.serverErrorCount > 0 || item.clientErrorCount > 0).length,
      slow: items.filter((item) => item.slowCount > 0).length,
      client: items.filter((item) => item.clientErrorCount > 0).length,
      known: items.filter((item) => item.userId).length,
      visitors: items.filter((item) => !item.userId).length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "critical" && item.serverErrorCount + item.clientErrorCount === 0) return false;
      if (filter === "slow" && item.slowCount === 0) return false;
      if (filter === "client" && item.clientErrorCount === 0) return false;
      if (filter === "server" && item.serverErrorCount === 0) return false;
      if (filter === "known" && !item.userId) return false;
      if (filter === "visitors" && item.userId) return false;
      if (filter === "restored" && item.resolution?.status !== "restored") return false;
      if (!q) return true;
      const haystack = [
        item.label,
        item.email,
        item.role,
        item.userId ? String(item.userId) : "",
        item.lastEvent?.message,
        item.lastEvent?.route,
        item.lastEvent?.path,
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
    <div className="min-h-screen bg-slate-50">
      <div className="space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <Link href="/admin/observability" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline transition-colors hover:text-slate-950">
                <ArrowLeft className="h-4 w-4" />
                Observability
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Impact Center</h1>
                <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${summary.critical > 0 ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                  <span className={`h-2 w-2 rounded-full ${summary.critical > 0 ? "bg-red-500" : "bg-emerald-500"}`} />
                  {summary.critical > 0 ? "Needs review" : "Quiet"}
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                People-first incident view for slow calls, server errors, and frontend crashes across known users and visitor sessions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 disabled:opacity-60 sm:w-fit"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
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

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search user or route..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#02665e]/40 focus:bg-white focus:ring-2 focus:ring-[#02665e]/10"
              />
            </div>
            <div className="flex max-w-full flex-wrap justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
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
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">Affected sessions</h2>
              <p className="mt-1 text-sm text-slate-500">
                Showing {filtered.length ? (safePage - 1) * pageSize + 1 : 0}-{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
              </p>
            </div>
            <PaginationControls page={safePage} totalPages={totalPages} onPageChange={setPage} />
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
  const iconClass = critical ? "border-red-100 bg-red-50 text-red-700" : item.slowCount > 0 ? "border-amber-100 bg-amber-50 text-amber-700" : "border-emerald-100 bg-emerald-50 text-emerald-700";
  const eventLabel = item.lastEvent?.message || item.lastEvent?.route || item.lastEvent?.path || item.lastEvent?.action || "Observed impact";

  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
        <div className="flex min-w-0 gap-4">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${iconClass}`}>
            {serverIssue ? <ServerCrash className="h-5 w-5" /> : clientIssue ? <Bug className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="truncate text-lg font-black tracking-tight text-slate-950">{item.label}</h2>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black uppercase ${restored ? "border-emerald-200 bg-emerald-50 text-emerald-700" : critical ? "border-red-200 bg-red-50 text-red-700" : item.slowCount > 0 ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                {severity}
              </span>
              {item.role ? <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-600">{item.role}</span> : null}
              {!item.userId ? <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold uppercase text-sky-700">Visitor</span> : null}
              {item.userId ? <span className="font-mono text-xs text-slate-400">#{item.userId}</span> : null}
            </div>
            {item.email ? <p className="mt-0.5 truncate text-xs text-slate-500">{item.email}</p> : null}
            <p className="mt-4 max-w-4xl text-sm font-semibold leading-6 text-slate-800">{eventLabel}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.routes.map((route) => (
                <span key={route} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-600">
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

        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
          <div className="grid grid-cols-4 gap-2 text-center">
            <ImpactCount label="Events" value={item.eventCount} />
            <ImpactCount label="Slow" value={item.slowCount} tone={item.slowCount > 0 ? "amber" : "slate"} />
            <ImpactCount label="5xx" value={item.serverErrorCount} tone={item.serverErrorCount > 0 ? "red" : "slate"} />
            <ImpactCount label="Client" value={item.clientErrorCount} tone={item.clientErrorCount > 0 ? "red" : "slate"} />
          </div>
          {restored ? (
            <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
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
              <Link href={`/admin/users/list?search=${encodeURIComponent(String(item.userId))}`} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 no-underline shadow-sm hover:bg-slate-50">
                <UserRound className="h-3.5 w-3.5" />
                View user
              </Link>
            ) : null}
            <Link href="/admin/observability" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 no-underline shadow-sm hover:bg-slate-50">
              <ShieldCheck className="h-3.5 w-3.5" />
              Open logs
            </Link>
            <Link href="/admin/management/audit-log" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 no-underline shadow-sm hover:bg-slate-50">
              <History className="h-3.5 w-3.5" />
              Audit
            </Link>
            {!restored ? (
              <button
                type="button"
                onClick={onRestore}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 shadow-sm hover:bg-emerald-100 sm:col-span-3"
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
    <div className={`group rounded-xl border p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${classes.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`max-w-28 text-[11px] font-black uppercase leading-5 tracking-wide ${classes.label}`}>{label}</div>
          <div className={`mt-4 text-3xl font-black tracking-tight ${classes.value}`}>{value}</div>
        </div>
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border shadow-sm transition-transform duration-300 group-hover:scale-105 ${classes.icon}`}>
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
      className={`h-9 rounded-lg border px-3 text-sm font-bold transition-all ${
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

function ImpactCount({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "amber" | "red" }) {
  const valueClass = tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
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

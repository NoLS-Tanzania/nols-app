"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, Clock3, RefreshCw, Server, Trash2, UserRound, Zap } from "lucide-react";
import apiClient from "@/lib/apiClient";

type ObservedRequest = {
  requestId: string;
  method: string;
  path: string;
  route: string;
  statusCode: number;
  durationMs: number;
  ip: string | null;
  userAgent: string | null;
  timestamp: string;
};

type Summary = {
  generatedAt: string;
  uptimeSeconds: number;
  windowSize: number;
  totalRequestsObserved: number;
  requestsInWindow: number;
  errorRate: number;
  averageDurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  slowRequestThresholdMs: number;
  slowRequestsInWindow: number;
  statusCounts: Record<string, number>;
  methodCounts: Record<string, number>;
  topRoutes: Array<{
    route: string;
    count: number;
    slowCount: number;
    errors: number;
    averageDurationMs: number;
    p95DurationMs: number;
    maxDurationMs: number;
  }>;
  slowRoutes: Array<{
    route: string;
    count: number;
    slowCount: number;
    errors: number;
    averageDurationMs: number;
    p95DurationMs: number;
    maxDurationMs: number;
  }>;
};

type ObservabilityData = {
  summary: Summary | null;
  recent: ObservedRequest[];
  slow: ObservedRequest[];
  errors: ObservedRequest[];
  impactedUsers: ImpactedUser[];
};

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
  resolution?: {
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

const emptyData: ObservabilityData = {
  summary: null,
  recent: [],
  slow: [],
  errors: [],
  impactedUsers: [],
};

export default function AdminObservabilityPage() {
  const [data, setData] = useState<ObservabilityData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const load = async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const snapshotRes = await apiClient.get("/api/admin/observability/snapshot?recentLimit=30&slowLimit=15&errorLimit=15");

      setData({
        summary: snapshotRes.data?.summary ?? null,
        recent: snapshotRes.data?.recent ?? [],
        slow: snapshotRes.data?.slow ?? [],
        errors: snapshotRes.data?.errors ?? [],
        impactedUsers: snapshotRes.data?.impactedUsers ?? [],
      });
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to load observability data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const id = window.setInterval(() => load(true), 15000);
    return () => window.clearInterval(id);
  }, []);

  const statusText = useMemo(() => {
    if (loading) return "Loading";
    if (error) return "Needs attention";
    return "Live";
  }, [error, loading]);

  const summary = data.summary;
  const errorRatePct = summary ? `${(summary.errorRate * 100).toFixed(2)}%` : "0.00%";

  async function clearWindow() {
    await apiClient.delete("/api/admin/observability/requests");
    setConfirmClearOpen(false);
    await load(true);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-950">Observability</h1>
                <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                  <span className={`h-2 w-2 rounded-full ${error ? "bg-red-500" : "bg-emerald-500"}`} />
                  {statusText}
                </div>
              </div>
              <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">
                Request logs, API latency, slow calls, and server errors from the current API process.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
            <a
              href="/api/admin/observability/prometheus"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 no-underline shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/25"
            >
              <Server className="h-4 w-4" />
              Metrics
            </a>
            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/25"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:border-red-300 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile icon={Activity} label="Requests" value={summary?.requestsInWindow ?? 0} helper={`${summary?.totalRequestsObserved ?? 0} since start`} status="Traffic" tone="sky" />
          <MetricTile icon={Clock3} label="Average latency" value={`${summary?.averageDurationMs ?? 0}ms`} helper={`p95 ${summary?.p95DurationMs ?? 0}ms`} status={summary && summary.p95DurationMs > 750 ? "Watch" : "Stable"} tone={summary && summary.p95DurationMs > 750 ? "amber" : "indigo"} />
          <MetricTile icon={Zap} label="Slow requests" value={summary?.slowRequestsInWindow ?? 0} helper={`threshold ${summary?.slowRequestThresholdMs ?? 1000}ms`} status={summary && summary.slowRequestsInWindow > 0 ? "Attention" : "Clean"} tone={summary && summary.slowRequestsInWindow > 0 ? "amber" : "violet"} />
          <MetricTile icon={AlertTriangle} label="Error rate" value={errorRatePct} helper={`${data.errors.length} recent server errors`} status={summary && summary.errorRate > 0 ? "Alert" : "Healthy"} tone={summary && summary.errorRate > 0 ? "red" : "green"} />
        </div>

        <ImpactCenterSummary items={data.impactedUsers} loading={loading} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <section className="xl:col-span-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <SectionHeader title="Recent Requests" subtitle={`Last ${data.recent.length} captured`} />
            <RequestTable items={data.recent} loading={loading} />
          </section>

          <section className="xl:col-span-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <SectionHeader title="Slowest Routes" subtitle="Most slow calls in the retained window" />
            <div className="divide-y divide-slate-100">
              {(summary?.slowRoutes ?? []).map((route) => <RouteHealthRow key={route.route} route={route} />)}
              {!loading && !summary?.slowRoutes?.length ? <EmptyState label="No slow routes captured yet" /> : null}
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <SectionHeader title="Route Volume" subtitle="Most requested routes in the retained window" />
          <div className="grid grid-cols-1 divide-y divide-slate-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            {(summary?.topRoutes ?? []).slice(0, 8).map((route) => <RouteHealthRow key={route.route} route={route} compact />)}
            {!loading && !summary?.topRoutes?.length ? <EmptyState label="No routes captured yet" /> : null}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <SectionHeader title="Slow Requests" subtitle={`Over ${summary?.slowRequestThresholdMs ?? 1000}ms`} />
            <RequestTable items={data.slow} loading={loading} compact />
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <SectionHeader title="Server Errors" subtitle="HTTP 5xx responses" />
            <RequestTable items={data.errors} loading={loading} compact />
          </section>
        </div>
      </div>

      {confirmClearOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg border border-red-100 bg-red-50 text-red-700">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-950">Clear Observability Window</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    This clears the current in-memory request sample. It does not delete audit logs or server log files.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/25"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={clearWindow}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-red-600 bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:border-red-700 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
              >
                Clear Window
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RouteHealthRow({
  route,
  compact = false,
}: {
  route: {
    route: string;
    count: number;
    slowCount: number;
    errors: number;
    averageDurationMs: number;
    p95DurationMs: number;
    maxDurationMs: number;
  };
  compact?: boolean;
}) {
  const severity = route.errors > 0 ? "red" : route.slowCount > 0 ? "amber" : "slate";
  const barPct = Math.max(8, Math.min(100, Math.round((route.p95DurationMs / 5000) * 100)));
  const barClass = severity === "red" ? "bg-red-500" : severity === "amber" ? "bg-amber-500" : "bg-slate-300";

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-mono text-xs font-semibold text-slate-900">{route.route}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{route.count} requests</span>
            <span className={route.slowCount > 0 ? "font-semibold text-amber-700" : ""}>{route.slowCount} slow</span>
            <span className={route.errors > 0 ? "font-semibold text-red-700" : ""}>{route.errors} errors</span>
          </div>
        </div>
        <div className="text-right text-xs">
          <div className="font-semibold text-slate-900">p95 {route.p95DurationMs}ms</div>
          {!compact ? <div className="text-slate-500">avg {route.averageDurationMs}ms</div> : null}
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${barPct}%` }} />
      </div>
    </div>
  );
}

function ImpactCenterSummary({ items, loading }: { items: ImpactedUser[]; loading: boolean }) {
  const activeItems = items.filter((item) => item.resolution?.status !== "restored");
  const restoredItems = items.filter((item) => item.resolution?.status === "restored");
  const activeEvents = activeItems.reduce((sum, item) => sum + item.eventCount, 0);
  const errorEvents = activeItems.reduce((sum, item) => sum + item.serverErrorCount + item.clientErrorCount, 0);
  const slowEvents = activeItems.reduce((sum, item) => sum + item.slowCount, 0);
  const hasCritical = errorEvents > 0;
  const healthLabel = hasCritical ? "Needs review" : restoredItems.length > 0 ? "Recovering" : "Quiet";
  const statusClass = hasCritical
    ? "border-red-200 bg-red-50 text-red-700"
    : restoredItems.length > 0
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-50 text-slate-700";
  const statusDotClass = hasCritical ? "bg-red-500" : restoredItems.length > 0 ? "bg-emerald-500" : "bg-slate-400";
  const statusDetail = hasCritical
    ? `${errorEvents} active error ${errorEvents === 1 ? "event" : "events"}`
    : restoredItems.length > 0
      ? `${restoredItems.length} restored ${restoredItems.length === 1 ? "case" : "cases"}`
      : "No active impact";

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-6 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] xl:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${hasCritical ? "border-red-100 bg-red-50 text-red-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}>
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="whitespace-nowrap text-lg font-black tracking-tight text-slate-950">Impact Center</h2>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${hasCritical ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                {healthLabel}
              </span>
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              People-first view of users tied to slow calls, server errors, and frontend crashes.
            </p>
            <div className={`mt-3 inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass}`}>
              <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass}`} />
              <span className="font-black">Status: {healthLabel}</span>
              <span className="hidden text-current/80 sm:inline">{statusDetail}</span>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-3">
          <div className="grid min-w-0 grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <SummaryPill label="Active" value={loading ? "..." : activeItems.length} tone={hasCritical ? "red" : "slate"} />
            <SummaryPill label="Resolved" value={loading ? "..." : restoredItems.length} tone={restoredItems.length > 0 ? "green" : "slate"} />
            <SummaryPill label="Events" value={loading ? "..." : activeEvents} tone={hasCritical ? "red" : "slate"} />
            <SummaryPill label="Slow" value={loading ? "..." : slowEvents} tone={slowEvents > 0 ? "amber" : "slate"} />
          </div>
          <Link
            href="/admin/impact-center"
            className="inline-flex h-10 w-fit justify-self-end items-center justify-center rounded-lg border border-emerald-200 bg-emerald-700 px-4 text-sm font-black text-white no-underline shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-800 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
          >
            <span>Open Impact Center</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function SummaryPill({ label, value, tone = "slate" }: { label: string; value: string | number; tone?: "slate" | "amber" | "red" | "green" }) {
  const valueClass = tone === "red" ? "text-red-700" : tone === "amber" ? "text-amber-700" : tone === "green" ? "text-emerald-700" : "text-slate-900";
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className={`text-xl font-black leading-none ${valueClass}`}>{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  helper,
  status,
  tone = "slate",
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  helper: string;
  status: string;
  tone?: "slate" | "green" | "red" | "sky" | "indigo" | "amber" | "violet";
}) {
  const styles = {
    slate: {
      card: "hover:border-slate-300 hover:shadow-slate-200/70",
      icon: "text-slate-700 bg-slate-50 border-slate-200 group-hover:bg-slate-100",
      value: "text-slate-950",
      chip: "bg-slate-100 text-slate-700 border-slate-200",
    },
    sky: {
      card: "hover:border-sky-200 hover:shadow-sky-100",
      icon: "text-sky-700 bg-sky-50 border-sky-200 group-hover:bg-sky-100",
      value: "text-sky-950",
      chip: "bg-sky-50 text-sky-700 border-sky-200",
    },
    indigo: {
      card: "hover:border-indigo-200 hover:shadow-indigo-100",
      icon: "text-indigo-700 bg-indigo-50 border-indigo-200 group-hover:bg-indigo-100",
      value: "text-indigo-950",
      chip: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    amber: {
      card: "hover:border-amber-200 hover:shadow-amber-100",
      icon: "text-amber-700 bg-amber-50 border-amber-200 group-hover:bg-amber-100",
      value: "text-amber-950",
      chip: "bg-amber-50 text-amber-700 border-amber-200",
    },
    violet: {
      card: "hover:border-violet-200 hover:shadow-violet-100",
      icon: "text-violet-700 bg-violet-50 border-violet-200 group-hover:bg-violet-100",
      value: "text-violet-950",
      chip: "bg-violet-50 text-violet-700 border-violet-200",
    },
    green: {
      card: "hover:border-emerald-200 hover:shadow-emerald-100",
      icon: "text-emerald-700 bg-emerald-50 border-emerald-200 group-hover:bg-emerald-100",
      value: "text-emerald-950",
      chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    red: {
      card: "hover:border-red-200 hover:shadow-red-100",
      icon: "text-red-700 bg-red-50 border-red-200 group-hover:bg-red-100",
      value: "text-red-950",
      chip: "bg-red-50 text-red-700 border-red-200",
    },
  }[tone];

  return (
    <div className={`group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${styles.card}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 transition-colors duration-300 group-hover:text-slate-700">{label}</div>
          <div className={`mt-2 text-2xl font-bold transition-colors duration-300 ${styles.value}`}>{value}</div>
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-xl border shadow-sm transition-all duration-300 group-hover:scale-105 ${styles.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500 transition-colors duration-300 group-hover:text-slate-600">{helper}</div>
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles.chip}`}>
          {status}
        </span>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <div>
        <h2 className="text-sm font-bold text-slate-950">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function RequestTable({ items, loading, compact = false }: { items: ObservedRequest[]; loading: boolean; compact?: boolean }) {
  if (loading) return <EmptyState label="Loading request data" />;
  if (!items.length) return <EmptyState label="No matching requests yet" />;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Time</th>
            <th className="px-4 py-3 font-semibold">Request</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Latency</th>
            {!compact ? <th className="px-4 py-3 font-semibold">ID</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={`${item.requestId}-${item.timestamp}`} className="transition-colors hover:bg-slate-50/70">
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatTime(item.timestamp)}</td>
              <td className="px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[11px] font-bold text-slate-700">{item.method}</span>
                  <span className="max-w-[26rem] truncate font-mono text-xs text-slate-800">{item.path}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass(item.statusCode)}`}>{item.statusCode}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-800">{Math.round(item.durationMs)}ms</td>
              {!compact ? <td className="max-w-[10rem] truncate px-4 py-3 font-mono text-xs text-slate-500">{item.requestId}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="px-4 py-10 text-center text-sm font-medium text-slate-500">{label}</div>;
}

function statusClass(statusCode: number) {
  if (statusCode >= 500) return "bg-red-100 text-red-700";
  if (statusCode >= 400) return "bg-amber-100 text-amber-700";
  if (statusCode >= 300) return "bg-sky-100 text-sky-700";
  return "bg-emerald-100 text-emerald-700";
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

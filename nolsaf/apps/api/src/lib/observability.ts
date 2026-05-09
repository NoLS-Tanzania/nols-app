import { prisma } from "@nolsaf/prisma";

export type ObservedRequest = {
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

export type ObservabilitySummary = {
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
    errors: number;
    averageDurationMs: number;
    p95DurationMs: number;
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

const maxRequests = 1000;
const recentRequests: ObservedRequest[] = [];
const pendingImportantRequests: ObservedRequest[] = [];
let totalRequestsObserved = 0;
let lastRepeatedErrorAlertAt = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushInFlight = false;

export const slowRequestThresholdMs = 1000;
const repeatedErrorWindowMs = 5 * 60 * 1000;
const repeatedErrorThreshold = 5;
const repeatedErrorAlertCooldownMs = 15 * 60 * 1000;
const maxPendingImportantRequests = 500;
const importantRequestFlushDelayMs = 2000;
const importantRequestFlushBatchSize = 100;

export function normalizeRoute(path: string): string {
  return path
    .replace(/\/\d+(?=\/|$)/g, "/:id")
    .replace(/\/[0-9a-f]{16,}(?=\/|$)/gi, "/:hash")
    .replace(/\/[0-9a-f-]{32,}(?=\/|$)/gi, "/:uuid");
}

export function recordObservedRequest(entry: ObservedRequest) {
  totalRequestsObserved += 1;
  recentRequests.push(entry);
  if (recentRequests.length > maxRequests) recentRequests.shift();
  if (entry.statusCode >= 500 || entry.durationMs >= slowRequestThresholdMs) {
    queueImportantRequest(entry);
  }
  if (entry.statusCode >= 500) {
    void maybeAlertRepeatedServerErrors(entry);
  }
}

export function maskIpAddress(ip: string | null | undefined) {
  if (!ip) return null;
  const normalized = ip.replace(/^::ffff:/, "").trim();
  const ipv4 = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) return `${ipv4[1]}.${ipv4[2]}.${ipv4[3]}.0`;
  const parts = normalized.split(":").filter(Boolean);
  if (parts.length >= 3) return `${parts.slice(0, 3).join(":")}::`;
  return "masked";
}

export function getRecentRequests(limit = 100) {
  return recentRequests.slice(-clampLimit(limit)).reverse();
}

export function getRecentSlowRequests(limit = 50) {
  return recentRequests
    .filter((request) => request.durationMs >= slowRequestThresholdMs)
    .slice(-clampLimit(limit))
    .reverse();
}

export function getRecentErrorRequests(limit = 50) {
  return recentRequests
    .filter((request) => request.statusCode >= 500)
    .slice(-clampLimit(limit))
    .reverse();
}

export function clearObservedRequests() {
  recentRequests.length = 0;
  totalRequestsObserved = 0;
}

export function getObservabilitySummary(): ObservabilitySummary {
  const requests = recentRequests.slice();
  const durations = requests.map((request) => request.durationMs).sort((a, b) => a - b);
  const errors = requests.filter((request) => request.statusCode >= 500).length;
  const statusCounts = countBy(requests, (request) => String(request.statusCode));
  const methodCounts = countBy(requests, (request) => request.method);
  const routeBuckets = new Map<string, ObservedRequest[]>();

  for (const request of requests) {
    const bucket = routeBuckets.get(request.route) ?? [];
    bucket.push(request);
    routeBuckets.set(request.route, bucket);
  }

  const topRoutes = Array.from(routeBuckets.entries())
    .map(([route, bucket]) => {
      const routeDurations = bucket.map((request) => request.durationMs).sort((a, b) => a - b);
      const slowCount = bucket.filter((request) => request.durationMs >= slowRequestThresholdMs).length;
      return {
        route,
        count: bucket.length,
        slowCount,
        errors: bucket.filter((request) => request.statusCode >= 500).length,
        averageDurationMs: roundMs(average(routeDurations)),
        p95DurationMs: roundMs(percentile(routeDurations, 95)),
        maxDurationMs: roundMs(routeDurations.at(-1) ?? 0),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const slowRoutes = Array.from(routeBuckets.entries())
    .map(([route, bucket]) => {
      const routeDurations = bucket.map((request) => request.durationMs).sort((a, b) => a - b);
      const slowCount = bucket.filter((request) => request.durationMs >= slowRequestThresholdMs).length;
      return {
        route,
        count: bucket.length,
        slowCount,
        errors: bucket.filter((request) => request.statusCode >= 500).length,
        averageDurationMs: roundMs(average(routeDurations)),
        p95DurationMs: roundMs(percentile(routeDurations, 95)),
        maxDurationMs: roundMs(routeDurations.at(-1) ?? 0),
      };
    })
    .filter((route) => route.slowCount > 0)
    .sort((a, b) => b.slowCount - a.slowCount || b.p95DurationMs - a.p95DurationMs)
    .slice(0, 10);

  return {
    generatedAt: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    windowSize: maxRequests,
    totalRequestsObserved,
    requestsInWindow: requests.length,
    errorRate: requests.length ? roundRatio(errors / requests.length) : 0,
    averageDurationMs: roundMs(average(durations)),
    p95DurationMs: roundMs(percentile(durations, 95)),
    p99DurationMs: roundMs(percentile(durations, 99)),
    slowRequestThresholdMs,
    slowRequestsInWindow: requests.filter((request) => request.durationMs >= slowRequestThresholdMs).length,
    statusCounts,
    methodCounts,
    topRoutes,
    slowRoutes,
  };
}

export function getPrometheusMetrics() {
  const summary = getObservabilitySummary();
  const lines = [
    "# HELP nolsaf_requests_observed_total Total requests observed since process start.",
    "# TYPE nolsaf_requests_observed_total counter",
    `nolsaf_requests_observed_total ${summary.totalRequestsObserved}`,
    "# HELP nolsaf_requests_window Current number of requests retained in memory.",
    "# TYPE nolsaf_requests_window gauge",
    `nolsaf_requests_window ${summary.requestsInWindow}`,
    "# HELP nolsaf_request_duration_average_ms Average request duration in the retained window.",
    "# TYPE nolsaf_request_duration_average_ms gauge",
    `nolsaf_request_duration_average_ms ${summary.averageDurationMs}`,
    "# HELP nolsaf_request_duration_p95_ms P95 request duration in the retained window.",
    "# TYPE nolsaf_request_duration_p95_ms gauge",
    `nolsaf_request_duration_p95_ms ${summary.p95DurationMs}`,
    "# HELP nolsaf_request_duration_p99_ms P99 request duration in the retained window.",
    "# TYPE nolsaf_request_duration_p99_ms gauge",
    `nolsaf_request_duration_p99_ms ${summary.p99DurationMs}`,
    "# HELP nolsaf_request_error_rate Error rate in the retained window.",
    "# TYPE nolsaf_request_error_rate gauge",
    `nolsaf_request_error_rate ${summary.errorRate}`,
    "# HELP nolsaf_slow_requests_window Slow requests in the retained window.",
    "# TYPE nolsaf_slow_requests_window gauge",
    `nolsaf_slow_requests_window ${summary.slowRequestsInWindow}`,
  ];

  for (const [status, count] of Object.entries(summary.statusCounts)) {
    lines.push(`nolsaf_requests_by_status{status="${escapeLabel(status)}"} ${count}`);
  }

  for (const route of summary.topRoutes) {
    lines.push(`nolsaf_requests_by_route{route="${escapeLabel(route.route)}"} ${route.count}`);
    lines.push(`nolsaf_request_route_p95_ms{route="${escapeLabel(route.route)}"} ${route.p95DurationMs}`);
  }

  return `${lines.join("\n")}\n`;
}

function queueImportantRequest(entry: ObservedRequest) {
  pendingImportantRequests.push(entry);
  if (pendingImportantRequests.length > maxPendingImportantRequests) {
    pendingImportantRequests.splice(0, pendingImportantRequests.length - maxPendingImportantRequests);
  }

  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushImportantRequests();
    }, importantRequestFlushDelayMs);
  }
}

async function flushImportantRequests() {
  if (flushInFlight || pendingImportantRequests.length === 0) return;
  flushInFlight = true;
  const batch = pendingImportantRequests.splice(0, importantRequestFlushBatchSize);

  try {
    await prisma.auditLog.createMany({
      data: batch.map((entry) => ({
        actorId: null,
        actorRole: null,
        action: entry.statusCode >= 500 ? "OBSERVABILITY_5XX_REQUEST" : "OBSERVABILITY_SLOW_REQUEST",
        entity: "OBSERVABILITY",
        entityId: null,
        ip: entry.ip,
        ua: entry.userAgent,
        beforeJson: null,
        afterJson: {
          requestId: entry.requestId,
          method: entry.method,
          path: entry.path,
          route: entry.route,
          statusCode: entry.statusCode,
          durationMs: Math.round(entry.durationMs * 100) / 100,
          timestamp: entry.timestamp,
        },
      })),
    });
  } catch (err: any) {
    console.warn("[observability] failed to persist request events", err?.message || err);
  } finally {
    flushInFlight = false;
    if (pendingImportantRequests.length > 0 && !flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        void flushImportantRequests();
      }, importantRequestFlushDelayMs);
    }
  }
}

async function maybeAlertRepeatedServerErrors(entry: ObservedRequest) {
  const now = Date.now();
  if (now - lastRepeatedErrorAlertAt < repeatedErrorAlertCooldownMs) return;

  const since = now - repeatedErrorWindowMs;
  const recentErrors = recentRequests.filter((request) => {
    if (request.statusCode < 500) return false;
    const requestTime = new Date(request.timestamp).getTime();
    return Number.isFinite(requestTime) && requestTime >= since;
  });

  if (recentErrors.length < repeatedErrorThreshold) return;

  lastRepeatedErrorAlertAt = now;
  try {
    await prisma.notification.create({
      data: {
        userId: null,
        ownerId: null,
        title: "Repeated API Server Errors",
        body: `${recentErrors.length} server errors were observed in the last 5 minutes. Latest: ${entry.method} ${entry.route} returned ${entry.statusCode}.`,
        unread: true,
        type: "system",
        meta: {
          kind: "observability_repeated_5xx",
          count: recentErrors.length,
          windowMinutes: 5,
          latestRequestId: entry.requestId,
          latestRoute: entry.route,
          latestStatusCode: entry.statusCode,
          latestDurationMs: Math.round(entry.durationMs * 100) / 100,
        },
      },
    });
  } catch (err: any) {
    console.warn("[observability] failed to create repeated 5xx notification", err?.message || err);
  }
}

function clampLimit(limit: number) {
  if (!Number.isFinite(limit)) return 100;
  return Math.max(1, Math.min(500, Math.round(limit)));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(sortedValues: number[], p: number) {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(sortedValues.length - 1, index))] ?? 0;
}

function countBy<T>(items: T[], selector: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = selector(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function roundMs(value: number) {
  return Math.round(value * 100) / 100;
}

function roundRatio(value: number) {
  return Math.round(value * 10000) / 10000;
}

function escapeLabel(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

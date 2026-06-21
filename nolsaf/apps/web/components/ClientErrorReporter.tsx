"use client";

import { useEffect } from "react";

export default function ClientErrorReporter() {
  useEffect(() => {
    let sawClientError = false;
    const recentlyReported = new Map<string, number>();
    const release = process.env.NEXT_PUBLIC_GIT_SHA || process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0";

    const report = (payload: { message?: string; source?: string; stack?: string; line?: number; column?: number; componentStack?: string }) => {
      sawClientError = true;
      const fingerprint = `${payload.message || ""}|${payload.source || ""}|${payload.stack || ""}`.slice(0, 2_000);
      const now = Date.now();
      const previous = recentlyReported.get(fingerprint) || 0;
      if (now - previous < 5_000) return;
      recentlyReported.set(fingerprint, now);
      try {
        fetch("/api/client-errors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            ...payload,
            path: window.location.pathname,
            release,
            monitoringProtocol: "nolsaf-client-error-v1",
          }),
        }).catch(() => {});
      } catch {
        // Never let monitoring create user-facing errors.
      }
    };

    const reportHealthyRoute = () => {
      if (sawClientError) return;
      try {
        const path = window.location.pathname;
        const storageKey = `nolsaf:route-health:${path}`;
        const previous = Number(window.sessionStorage.getItem(storageKey) || 0);
        const now = Date.now();
        if (Number.isFinite(previous) && now - previous < 5 * 60 * 1000) return;
        window.sessionStorage.setItem(storageKey, String(now));
        fetch("/api/client-errors/health", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            path,
            release,
            monitoringProtocol: "nolsaf-client-error-v1",
          }),
        }).catch(() => {});
      } catch {
        // Never let monitoring create user-facing errors.
      }
    };

    const onError = (event: ErrorEvent) => {
      report({
        message: event.message || "Unhandled client error",
        source: event.filename || "window.error",
        stack: event.error?.stack,
        line: event.lineno || undefined,
        column: event.colno || undefined,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      report({
        message: typeof reason?.message === "string" ? reason.message : "Unhandled promise rejection",
        source: "unhandledrejection",
        stack: typeof reason?.stack === "string" ? reason.stack : typeof reason === "string" ? reason : undefined,
      });
    };

    const onBoundaryError = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      report({
        message: detail.message || "React component error",
        source: detail.source || "react-error-boundary",
        stack: detail.stack,
        componentStack: detail.componentStack,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("nols:client-error", onBoundaryError);
    const healthTimer = window.setTimeout(reportHealthyRoute, 3500);
    return () => {
      window.clearTimeout(healthTimer);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("nols:client-error", onBoundaryError);
    };
  }, []);

  return null;
}

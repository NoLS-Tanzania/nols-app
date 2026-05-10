"use client";

import { useEffect } from "react";

export default function ClientErrorReporter() {
  useEffect(() => {
    let sawClientError = false;

    const report = (payload: { message?: string; source?: string; stack?: string }) => {
      sawClientError = true;
      try {
        fetch("/api/client-errors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            ...payload,
            path: window.location.pathname,
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

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    const healthTimer = window.setTimeout(reportHealthyRoute, 3500);
    return () => {
      window.clearTimeout(healthTimer);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}

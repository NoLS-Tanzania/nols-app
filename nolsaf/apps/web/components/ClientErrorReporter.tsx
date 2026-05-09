"use client";

import { useEffect } from "react";

export default function ClientErrorReporter() {
  useEffect(() => {
    const report = (payload: { message?: string; source?: string; stack?: string }) => {
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
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}

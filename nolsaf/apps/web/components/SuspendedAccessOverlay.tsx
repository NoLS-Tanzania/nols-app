"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertCircle, ShieldAlert } from "lucide-react";

declare global {
  interface Window {
    __nolsafSuspendedActive?: boolean;
    __nolsafSuspendedCheckedAt?: number;
    __nolsafFetchPatched?: boolean;
  }
}

const WAS_SUSPENDED_KEY = "nolsaf:wasSuspended";

function portalLabelFromPath(pathname: string) {
  if (pathname.startsWith("/admin")) return "Admin Portal";
  if (pathname.startsWith("/owner")) return "Owner Portal";
  if (pathname.startsWith("/driver")) return "Driver Portal";
  if (pathname.startsWith("/account/agent")) return "Agent Portal";
  if (pathname.startsWith("/account")) return "Account";
  if (pathname.startsWith("/public")) return "Public Portal";
  return "NoLSAF";
}

async function parseJsonSafely(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function SuspendedAccessOverlay() {
  const pathname = usePathname();
  const portalLabel = useMemo(() => portalLabelFromPath(pathname || "/"), [pathname]);
  // Always start with false on both server and client to avoid hydration mismatch (#418).
  // The window flag is read in a useEffect below, which only runs on the client after hydration.
  const [active, setActive] = useState<boolean>(false);
  const [showRestored, setShowRestored] = useState<boolean>(false);
  const activeRef = useRef(active);
  const showRestoredRef = useRef(showRestored);
  const restoreTimerRef = useRef<number | null>(null);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    showRestoredRef.current = showRestored;
  }, [showRestored]);

  useEffect(() => {
    return () => {
      if (restoreTimerRef.current) {
        window.clearTimeout(restoreTimerRef.current);
        restoreTimerRef.current = null;
      }
    };
  }, []);

  const activate = useCallback(() => {
    if (typeof window !== "undefined") {
      window.__nolsafSuspendedActive = true;
    }
    try {
      localStorage.setItem(WAS_SUSPENDED_KEY, "1");
    } catch {
      // ignore
    }
    setActive(true);
  }, []);

  const deactivate = useCallback(() => {
    if (typeof window !== "undefined") {
      window.__nolsafSuspendedActive = false;
    }
    setActive(false);
  }, []);

  const showRestoredOnceFor3s = useCallback(() => {
    if (showRestoredRef.current) return;
    setShowRestored(true);
    try {
      localStorage.removeItem(WAS_SUSPENDED_KEY);
    } catch {
      // ignore
    }

    if (restoreTimerRef.current) {
      window.clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = null;
    }

    restoreTimerRef.current = window.setTimeout(() => {
      setShowRestored(false);
      restoreTimerRef.current = null;
    }, 3000);
  }, []);

  const checkSuspensionStatus = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/account/me", { credentials: "include", signal });

      let wasSuspended = false;
      try {
        wasSuspended = localStorage.getItem(WAS_SUSPENDED_KEY) === "1";
      } catch {
        // ignore
      }

      // If the account is active again, clear the overlay and show a friendly welcome message.
      if (res.ok) {
        if (activeRef.current || wasSuspended) {
          deactivate();
          showRestoredOnceFor3s();
        }
        return;
      }

      if (res.status !== 403) return;
      const data: any = await parseJsonSafely(res);
      if (data?.code === "ACCOUNT_SUSPENDED") activate();
    } catch {
      // ignore
    }
  }, [activate, deactivate, showRestoredOnceFor3s]);

  // Check on route changes (covers direct visits + most portal navigation).
  useEffect(() => {
    let alive = true;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    (async () => {
      // Avoid spamming: 30s in-memory throttle.
      const now = Date.now();
      const last = typeof window !== "undefined" ? window.__nolsafSuspendedCheckedAt : undefined;
      if (typeof last === "number" && now - last < 30_000) return;
      if (typeof window !== "undefined") window.__nolsafSuspendedCheckedAt = now;

      if (!alive) return;
      await checkSuspensionStatus(controller?.signal);
    })();
    return () => {
      alive = false;
      try {
        controller?.abort();
      } catch {
        // ignore
      }
    };
  }, [pathname, checkSuspensionStatus]);

  // While suspended, periodically re-check so we can automatically unlock when unsuspended.
  useEffect(() => {
    if (!active) return;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const id = window.setInterval(() => {
      checkSuspensionStatus(controller?.signal);
    }, 8_000);
    return () => {
      window.clearInterval(id);
      try {
        controller?.abort();
      } catch {
        // ignore
      }
    };
  }, [active, checkSuspensionStatus]);

  // Catch suspended responses from any client fetch in the app.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__nolsafFetchPatched) return;
    window.__nolsafFetchPatched = true;

    const originalFetch = window.fetch.bind(window);
    window.fetch = (async (...args: Parameters<typeof fetch>) => {
      const res = await originalFetch(...args);
      try {
        if (!window.__nolsafSuspendedActive && res && res.status === 403) {
          const data: any = await parseJsonSafely(res.clone());
          if (data?.code === "ACCOUNT_SUSPENDED") activate();
        }
      } catch {
        // ignore
      }
      return res;
    }) as any;
  }, [activate]);

  const visible = active || showRestored;

  // Lock scrolling when the overlay is visible.
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-950/60 via-slate-900/40 to-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/70 bg-white shadow-sm ring-1 ring-slate-900/5">
        <div className="flex items-start gap-3 border-b border-slate-200/80 px-5 py-4">
          <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${showRestored ? "bg-emerald-50" : "bg-rose-50"}`}>
            <ShieldAlert className={`h-5 w-5 ${showRestored ? "text-emerald-600" : "text-rose-600"}`} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-slate-900">{showRestored ? "Welcome back" : "Access suspended"}</div>
            <div className="mt-0.5 text-xs text-slate-600">
              {showRestored
                ? "Your access is restored. Opening your account…"
                : "Thanks for trying to access NoLSAF. You’re currently blocked from using the system."}
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="text-xs font-semibold text-slate-800">{showRestored ? "All set" : "What’s happening"}</div>
            {showRestored ? (
              <p className="mt-1 text-sm text-slate-700">You can continue to the {portalLabel} in a moment.</p>
            ) : (
              <p className="mt-1 text-sm text-slate-700">
                Unfortunately, your account has been suspended, so you can’t access the {portalLabel} right now.
              </p>
            )}
            {!showRestored ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/70 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 text-slate-500" />
                <p className="text-xs text-slate-700">
                  If you believe this is a mistake, please contact the NoLSAF support team or your administrator to resolve it.
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-4 text-[11px] text-slate-500">
            {showRestored ? "Just a second…" : "This screen can’t be dismissed while your account is suspended."}
          </div>
        </div>
      </div>
    </div>
  );
}

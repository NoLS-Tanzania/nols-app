"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    __nolsafPublicSuspendedActive?: boolean;
    __nolsafPublicFetchPatched?: boolean;
  }
}

async function parseJsonSafely(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function SuspendedAccessOverlay() {
  const [active, setActive] = useState<boolean>(() => Boolean(typeof window !== "undefined" && window.__nolsafPublicSuspendedActive));

  const activate = () => {
    if (typeof window !== "undefined") window.__nolsafPublicSuspendedActive = true;
    setActive(true);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/account/me", { credentials: "include" });
        if (!alive) return;
        if (res.status !== 403) return;
        const data: any = await parseJsonSafely(res);
        if (data?.code === "ACCOUNT_SUSPENDED") activate();
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__nolsafPublicFetchPatched) return;
    window.__nolsafPublicFetchPatched = true;

    const originalFetch = window.fetch.bind(window);
    window.fetch = (async (...args: Parameters<typeof fetch>) => {
      const res = await originalFetch(...args);
      try {
        if (!window.__nolsafPublicSuspendedActive && res && res.status === 403) {
          const data: any = await parseJsonSafely(res.clone());
          if (data?.code === "ACCOUNT_SUSPENDED") activate();
        }
      } catch {
        // ignore
      }
      return res;
    }) as any;
  }, []);

  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Access suspended"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background:
          "radial-gradient(1100px circle at 15% 10%, rgba(2,102,94,0.18), transparent 45%), radial-gradient(900px circle at 85% 20%, rgba(244,63,94,0.14), transparent 42%), radial-gradient(900px circle at 50% 110%, rgba(15,23,42,0.22), transparent 40%), rgba(2, 6, 23, 0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))",
          borderRadius: 20,
          border: "1px solid rgba(148,163,184,0.55)",
          boxShadow: "0 18px 50px rgba(2,6,23,0.22)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 22,
            borderBottom: "1px solid rgba(148,163,184,0.35)",
            background: "linear-gradient(90deg, rgba(2,102,94,0.06), rgba(244,63,94,0.03))",
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div
              style={{
                height: 44,
                width: 44,
                borderRadius: 14,
                background: "rgba(244,63,94,0.10)",
                border: "1px solid rgba(244,63,94,0.22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#e11d48" }}>
                <path d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4z" />
                <path d="M12 8v5" />
                <path d="M12 17h.01" />
              </svg>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a", letterSpacing: "-0.01em" }}>Access suspended</div>
              <div style={{ marginTop: 6, fontSize: 13, color: "#475569", lineHeight: 1.45 }}>
                Thanks for trying to access NoLSAF. You’re currently blocked from using the system.
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: 22 }}>
          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(248,250,252,0.85)",
              padding: 18,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>What’s happening</div>
            <div style={{ marginTop: 10, fontSize: 18, color: "#0f172a", lineHeight: 1.35, letterSpacing: "-0.01em" }}>
              Unfortunately, your account has been suspended, so you can’t access the Account right now.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.28)",
                background: "rgba(255,255,255,0.80)",
                padding: 14,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#64748b", marginTop: 2 }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
                If you believe this is a mistake, please contact the NoLSAF support team or your administrator to resolve it.
                <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                  Portals: Owners, Drivers, Admin, Agent, and Public Portal.
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, fontSize: 12, color: "#64748b" }}>
            This screen can’t be dismissed while your account is suspended.
          </div>
        </div>
      </div>
    </div>
  );
}

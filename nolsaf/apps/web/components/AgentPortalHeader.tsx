"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSocket } from "@/hooks/useSocket";
import {
  Bell,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";

export default function AgentPortalHeader() {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [agentUnreadCount, setAgentUnreadCount] = useState<number>(0);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const { socket } = useSocket(undefined, { enabled: true, joinDriverRoom: false });

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const node = profileMenuRef.current;
      if (!node) return;
      if (!node.contains(e.target as Node)) setProfileMenuOpen(false);
    };
    if (!profileMenuOpen) return;
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [profileMenuOpen]);

  const iconButtonClass =
    "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/90 shadow-card transition-all duration-300 ease-out hover:bg-white/10 hover:border-white/20 hover:text-white hover:shadow-md hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 motion-reduce:transition-none";

  const menuItemClass =
    "group flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors no-underline";

  const logoutRedirect = "/account/login";

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const load = async () => {
      try {
        const r = await fetch("/api/agent/notifications?tab=unread&page=1&pageSize=1", {
          credentials: "include",
          signal: controller.signal,
        });
        if (!r.ok) return;
        const j = await r.json();
        const c = Number(j.totalUnread ?? j.total ?? 0);
        if (mounted) setAgentUnreadCount(Number.isFinite(c) ? c : 0);
      } catch {
        // ignore
      }
    };

    void load();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as any;
      const count = Number(detail?.count);
      if (Number.isFinite(count)) setAgentUnreadCount(count);
    };

    window.addEventListener("agent:notifications:unreadCount", handler as EventListener);
    return () => window.removeEventListener("agent:notifications:unreadCount", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onNew = (payload: any) => {
      if (payload?.type !== "agent") return;
      setAgentUnreadCount((c) => (Number.isFinite(c) ? c + 1 : 1));
    };

    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [socket]);

  return (
    <div className="sticky top-0 z-40 bg-transparent">
      <div className="public-container h-16 flex items-center">
        <div className="w-full h-14 rounded-3xl border border-white/10 bg-slate-950/60 text-white backdrop-blur shadow-card flex items-center justify-between gap-4 px-3 sm:px-4 transition-all duration-300 ease-out hover:bg-slate-950/70 hover:shadow-lg motion-reduce:transition-none">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/account/agent"
              aria-label="NoLSAF Agent Portal"
              className="group inline-flex items-center gap-2 min-w-0"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-card transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none">
                <Image
                  src="/assets/NoLS2025-04.png"
                  alt="NoLSAF"
                  width={44}
                  height={44}
                  className="h-7 w-7 brightness-0 invert"
                  priority
                />
              </span>
            </Link>

            <div className="h-6 w-px bg-white/10" aria-hidden />

            <div className="min-w-0">
              <div className="text-[13px] font-extrabold text-white tracking-tight truncate">Agent Portal</div>
              <div className="text-xs text-white/70 truncate">Support workspace & assignments</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/account/agent/notifications"
              aria-label="Notifications"
              title="Notifications"
              className={`group relative ${iconButtonClass}`}
            >
              <Bell className="h-5 w-5 transition-transform duration-300 ease-out group-hover:scale-110 motion-reduce:transition-none" aria-hidden />
              {agentUnreadCount > 0 ? (
                <span
                  className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-[11px] font-extrabold tabular-nums inline-flex items-center justify-center ring-2 ring-slate-950/80 animate-scale-in"
                  aria-label={`${agentUnreadCount} unread notifications`}
                >
                  {agentUnreadCount > 99 ? "99+" : agentUnreadCount}
                </span>
              ) : null}
            </Link>

            <Link
              href="/account/agent/settings"
              aria-label="Agent settings"
              className={`group ${iconButtonClass}`}
            >
              <Settings className="h-5 w-5 transition-transform duration-300 ease-out group-hover:rotate-12 group-hover:scale-110 motion-reduce:transition-none" aria-hidden />
            </Link>

            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                aria-label="Profile menu"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((v) => !v)}
                className={`group ${iconButtonClass} transition-all duration-300 ease-out hover:scale-105 active:scale-95 motion-reduce:transition-none`}
              >
                <span className="sr-only">Open profile menu</span>
                <UserRound className="h-5 w-5 transition-transform duration-300 ease-out group-hover:scale-110 motion-reduce:transition-none" aria-hidden />
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  aria-label="Agent menu"
                  className="absolute right-0 mt-3 w-72 rounded-2xl border border-white/10 bg-slate-950/80 text-white backdrop-blur-xl shadow-card overflow-hidden z-50"
                >
                  <div className="py-2">
                    <div className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-white/50">
                      Portal
                    </div>

                    <Link
                      role="menuitem"
                      href="/account/agent"
                      onClick={() => setProfileMenuOpen(false)}
                      className={menuItemClass}
                    >
                      <LayoutDashboard className="h-4 w-4 text-white/60 group-hover:text-brand transition-colors" aria-hidden />
                      <span className="flex-1">Dashboard</span>
                      <ChevronRight className="h-3.5 w-3.5 text-white/40 group-hover:text-brand transition-colors" aria-hidden />
                    </Link>

                    <Link
                      role="menuitem"
                      href="/account/agent/assignments"
                      onClick={() => setProfileMenuOpen(false)}
                      className={menuItemClass}
                    >
                      <ClipboardList className="h-4 w-4 text-white/60 group-hover:text-brand transition-colors" aria-hidden />
                      <span className="flex-1">Assignments</span>
                      <ChevronRight className="h-3.5 w-3.5 text-white/40 group-hover:text-brand transition-colors" aria-hidden />
                    </Link>

                    <div className="my-2 mx-4 h-px bg-white/10" />

                    <div className="px-4 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-white/50">
                      Account
                    </div>

                    <Link
                      role="menuitem"
                      href="/account/agent/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className={menuItemClass}
                    >
                      <UserRound className="h-4 w-4 text-white/60 group-hover:text-brand transition-colors" aria-hidden />
                      <span className="flex-1">My profile</span>
                      <ChevronRight className="h-3.5 w-3.5 text-white/40 group-hover:text-brand transition-colors" aria-hidden />
                    </Link>

                    <Link
                      role="menuitem"
                      href="/account/agent/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className={menuItemClass}
                    >
                      <Settings className="h-4 w-4 text-white/60 group-hover:text-brand transition-colors" aria-hidden />
                      <span className="flex-1">Settings</span>
                      <ChevronRight className="h-3.5 w-3.5 text-white/40 group-hover:text-brand transition-colors" aria-hidden />
                    </Link>

                    <div className="my-2 mx-4 h-px bg-white/10" />

                    <button
                      type="button"
                      role="menuitem"
                      onClick={async () => {
                        setProfileMenuOpen(false);
                        try {
                          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                        } catch {}
                        window.location.href = logoutRedirect;
                      }}
                      className="group w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/10 transition-colors border-0 bg-transparent cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 text-rose-300 group-hover:text-rose-200 transition-colors" aria-hidden />
                      <span className="flex-1 text-left">Logout</span>
                      <ChevronRight className="h-3.5 w-3.5 text-rose-300/70 group-hover:text-rose-200 transition-colors" aria-hidden />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

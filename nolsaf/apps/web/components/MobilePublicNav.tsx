"use client";

import Link from "next/link";
import React, { useEffect, useState, useCallback } from "react";
import { Home, Building2, Plus, User, Car, Calendar, Users, ClipboardList, Settings as SettingsIcon, LogOut, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

interface MeResponse {
  id: number;
  name?: string;
  profileImage?: string;
}

type Slot = "home" | "stays" | "list" | "rides" | "account";

export default function MobilePublicNav() {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<MeResponse | null>(null);
  const [pressed, setPressed] = useState<Slot | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const press   = useCallback((s: Slot) => setPressed(s), []);
  const release = useCallback(() => setPressed(null), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/account/me", { credentials: "include" });
        if (!alive) return;
        if (r.ok) {
          const data = await r.json();
          setAuthed(true);
          setUser(data ?? null);
        } else {
          setAuthed(false);
        }
      } catch {
        if (alive) setAuthed(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const isHome       = pathname === "/public";
  const isProperties = pathname.startsWith("/public/properties");
  const isRides      = pathname.startsWith("/account/rides");
  const isAccount    = pathname.startsWith("/account") && !isRides;

  // Hide on portals that have their own navigation
  const isHidden =
    pathname.startsWith("/admin")  ||
    pathname.startsWith("/owner")  ||
    pathname.startsWith("/driver") ||
    pathname.startsWith("/agent");

  if (isHidden) return null;

  /* Touch-spring helpers */
  const touch = (s: Slot) => ({
    onTouchStart:  () => press(s),
    onTouchEnd:    release,
    onTouchCancel: release,
    onMouseDown:   () => press(s),
    onMouseUp:     release,
    onMouseLeave:  release,
  });

  const iconScale = (s: Slot): React.CSSProperties => ({
    transform:  pressed === s ? "scale(0.80)" : "scale(1)",
    transition: pressed === s
      ? "transform 0.07s cubic-bezier(0.25,0.46,0.45,0.94)"
      : "transform 0.40s cubic-bezier(0.34,1.56,0.64,1)",
  });

  const fabScale = (s: Slot): React.CSSProperties => ({
    transform:  pressed === s ? "scale(0.84)" : "scale(1)",
    transition: pressed === s
      ? "transform 0.07s cubic-bezier(0.25,0.46,0.45,0.94)"
      : "transform 0.42s cubic-bezier(0.34,1.56,0.64,1)",
  });

  /* Brand accent - clean teal */
  const TEAL = "#2dd4bf";

  const iconColor  = (active: boolean) => active ? TEAL : "rgba(255,255,255,0.45)";
  const strokeW    = (active: boolean) => active ? 2.4 : 1.5;

  return (
    <>
    <nav
      aria-label="Mobile navigation"
      className="flex md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(8, 12, 20, 0.97)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRadius: "12px 12px 0 0",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.45), 0 -1px 0 rgba(45,212,191,0.12)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Subtle teal shimmer on top edge */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(45,212,191,0.30) 30%, rgba(45,212,191,0.55) 50%, rgba(45,212,191,0.30) 70%, transparent 100%)",
        }}
        aria-hidden
      />

      <div className="flex w-full items-stretch h-[62px]">

        {/* Home */}
        <Link
          href="/public"
          aria-label="Home"
          style={{ textDecoration: "none" }}
          className="relative flex items-center justify-center flex-1 h-full select-none outline-none"
          {...touch("home")}
        >
          <span
            className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
            style={{
              width:      isHome ? "22px" : "0px",
              height:     "2.5px",
              background: TEAL,
              opacity:    isHome ? 1 : 0,
              transition: "width 0.2s ease, opacity 0.2s ease",
            }}
          />
          <span style={iconScale("home")}>
            <Home width={22} height={22} strokeWidth={strokeW(isHome)} color={iconColor(isHome)} />
          </span>
        </Link>

        {/* Stays */}
        <Link
          href="/public/properties"
          aria-label="Browse stays"
          style={{ textDecoration: "none" }}
          className="relative flex items-center justify-center flex-1 h-full select-none outline-none"
          {...touch("stays")}
        >
          <span
            className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
            style={{
              width:      isProperties ? "22px" : "0px",
              height:     "2.5px",
              background: TEAL,
              opacity:    isProperties ? 1 : 0,
              transition: "width 0.2s ease, opacity 0.2s ease",
            }}
          />
          <span style={iconScale("stays")}>
            <Building2 width={22} height={22} strokeWidth={strokeW(isProperties)} color={iconColor(isProperties)} />
          </span>
        </Link>

        {/* List Property FAB */}
        <Link
          href="/account/register?role=owner"
          aria-label="List your property"
          style={{ textDecoration: "none" }}
          className="flex items-center justify-center flex-1 h-full select-none outline-none"
          {...touch("list")}
        >
          <span
            className="flex items-center justify-center w-[42px] h-[42px] rounded-full"
            style={{
              ...fabScale("list"),
              background: "linear-gradient(135deg, #0a5c82 0%, #02665e 100%)",
              boxShadow: pressed === "list"
                ? "0 2px 8px rgba(2,102,94,0.35)"
                : "0 4px 18px rgba(2,102,94,0.60), 0 0 0 1px rgba(45,212,191,0.22)",
            }}
          >
            <Plus width={20} height={20} strokeWidth={2.6} color="#ffffff" />
          </span>
        </Link>

        {/* My Rides */}
        <Link
          href={authed ? "/account/rides" : "/account/sign-in"}
          aria-label="My rides"
          style={{ textDecoration: "none" }}
          className="relative flex items-center justify-center flex-1 h-full select-none outline-none"
          {...touch("rides")}
        >
          <span
            className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
            style={{
              width:      isRides ? "22px" : "0px",
              height:     "2.5px",
              background: TEAL,
              opacity:    isRides ? 1 : 0,
              transition: "width 0.2s ease, opacity 0.2s ease",
            }}
          />
          <span style={iconScale("rides")}>
            <Car width={22} height={22} strokeWidth={strokeW(isRides)} color={iconColor(isRides)} />
          </span>
        </Link>

        {/* Account */}
        <button
          type="button"
          aria-label={authed ? "My account" : "Sign in"}
          style={{ background: "none", border: "none", padding: 0 }}
          className="relative flex items-center justify-center flex-1 h-full select-none outline-none cursor-pointer"
          onClick={() => authed ? setMenuOpen(true) : router.push("/account/sign-in")}
          {...touch("account")}
        >
          <span
            className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
            style={{
              width:      isAccount ? "22px" : "0px",
              height:     "2.5px",
              background: TEAL,
              opacity:    isAccount ? 1 : 0,
              transition: "width 0.2s ease, opacity 0.2s ease",
            }}
          />
          <span style={iconScale("account")}>
            {authed && user?.profileImage ? (
              <span className="relative block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.profileImage}
                  alt={user.name ?? "Account"}
                  width={24}
                  height={24}
                  className="rounded-full object-cover"
                  style={{
                    width: "24px",
                    height: "24px",
                    outline: isAccount ? `2px solid ${TEAL}` : "1.5px solid rgba(255,255,255,0.20)",
                    outlineOffset: "1px",
                  }}
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-[7px] h-[7px] rounded-full bg-emerald-400 ring-[1.5px] ring-[#080c14]" />
              </span>
            ) : (
              <User width={22} height={22} strokeWidth={strokeW(isAccount)} color={iconColor(isAccount)} />
            )}
          </span>
        </button>

      </div>
    </nav>

    {/* ── Mobile Account Sheet ── */}
    {menuOpen && (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
        {/* Sheet */}
        <div
          className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-3xl bg-white shadow-2xl"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }}
        >
          {/* Drag handle */}
          <div className="mx-auto mt-3 w-10 h-1 rounded-full bg-slate-200" />
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
            <div>
              {user?.name && (
                <div className="font-bold text-slate-900 text-base leading-tight">{user.name}</div>
              )}
              <div className="text-xs text-slate-400 mt-0.5">Manage your account</div>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Menu items */}
          <div className="px-3 py-2">
            {([
              { href: "/account",            label: "My account",    Icon: User          },
              { href: "/account/bookings",    label: "My Bookings",   Icon: Calendar      },
              { href: "/account/rides",       label: "My Rides",      Icon: Car           },
              { href: "/account/group-stays", label: "My Group Stay", Icon: Users         },
              { href: "/account/event-plans", label: "My Event Plan", Icon: ClipboardList },
              { href: "/account/security",    label: "Settings",      Icon: SettingsIcon  },
            ] as { href: string; label: string; Icon: React.ElementType }[]).map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <button
                  key={href}
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
                  onClick={() => { setMenuOpen(false); router.push(href); }}
                >
                  <span
                    className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                    style={{ background: active ? "linear-gradient(135deg,#0a5c82,#02665e)" : "#f1f5f9" }}
                  >
                    <Icon className="w-4 h-4" style={{ color: active ? "#ffffff" : "#64748b" }} />
                  </span>
                  <span className={`text-sm font-medium ${active ? "text-teal-700" : "text-slate-700"}`}>
                    {label}
                  </span>
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-500" />}
                </button>
              );
            })}
          </div>

          {/* Sign out */}
          <div className="px-3 pb-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors hover:bg-red-50 active:bg-red-100"
              onClick={async () => {
                setMenuOpen(false);
                await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                window.location.href = "/account/login";
              }}
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 bg-red-50">
                <LogOut className="w-4 h-4 text-red-500" />
              </span>
              <span className="text-sm font-medium text-red-500">Sign out</span>
            </button>
          </div>
        </div>
      </>
    )}
    </>
  );
}

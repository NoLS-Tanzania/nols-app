"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Bell,
  CheckCircle,
  ChevronDown,
  Download,
  Home,
  LifeBuoy,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  Settings as SettingsIcon,
  Sun,
  User,
  Building2,
  Calendar,
  DollarSign,
} from "lucide-react";

import ClientErrorBoundary from "@/components/ClientErrorBoundary";

const LegalModal = dynamic(() => import("@/components/LegalModal"), { ssr: false });

// Keep dropdown animation styles consistent with the admin header.
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fade-in-up {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slide-down {
      from { opacity: 0; transform: translateY(-20px); max-height: 0; }
      to { opacity: 1; transform: translateY(0); max-height: 1000px; }
    }
    @keyframes scale-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes slide-in-left {
      from { opacity: 0; transform: translateX(-100%); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes fade-in-overlay {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .animate-fade-in-up { animation: fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-slide-down { animation: slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-scale-in { animation: scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-slide-in-left { animation: slide-in-left 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-fade-in-overlay { animation: fade-in-overlay 0.25s ease forwards; }
    .glass-effect { backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
  `;
  style.setAttribute("data-owner-header-animations", "true");
  if (!document.head.querySelector('style[data-owner-header-animations]')) {
    document.head.appendChild(style);
  }
}

export default function OwnerSiteHeader({ unreadMessages = 0 }: { unreadMessages?: number }) {
  const [open, setOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [touchedIcon, setTouchedIcon] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const logoutRedirect = "/owner/login";

  const handleTouch = (id: string) => {
    setTouchedIcon(id);
    window.setTimeout(() => setTouchedIcon((v) => (v === id ? null : v)), 2000);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("navigationContext", "owner");
    }

    (async () => {
      try {
        const url = "/api/account/me";
        const r = await fetch(url, { credentials: "include" });
        if (!r.ok) return;
        const json = await r.json();
        const me = json?.data ?? json;
        if (me?.avatarUrl) setAvatarUrl(me.avatarUrl);
        if (me?.fullName) setUserName(me.fullName);
        if (me?.email) setUserEmail(me.email);
      } catch {
        // ignore
      }
    })();

    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("theme");
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial = saved === "dark" || (saved === null && prefersDark) ? "dark" : "light";
      setTheme(initial);
      if (initial === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } catch {
      // ignore
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    const handleProfileUpdated = (e: Event) => {
      try {
        const ce = e as CustomEvent<any>;
        const nextAvatarUrl = ce?.detail?.avatarUrl;
        if (typeof nextAvatarUrl === "string" && nextAvatarUrl.trim()) {
          setAvatarUrl(nextAvatarUrl.trim());
        }
      } catch {
        // ignore
      }
    };

    document.addEventListener("click", handleClickOutside);
    window.addEventListener("nolsaf:profile-updated", handleProfileUpdated as EventListener);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      window.removeEventListener("nolsaf:profile-updated", handleProfileUpdated as EventListener);
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
      if (next === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } catch {
      // ignore
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      window.location.reload();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportInvoices = () => {
    (async () => {
      try {
        const defaultUrl = "/admin/invoices.csv";
        const endpoint = process.env.NEXT_PUBLIC_EXPORT_INVOICES_ENDPOINT || defaultUrl;

        const filenameTemplate = process.env.NEXT_PUBLIC_EXPORT_INVOICES_FILENAME || "invoices.csv";
        const date = new Date().toISOString().split("T")[0];
        const filename = filenameTemplate.replace("{date}", date);

        const resp = await fetch(endpoint, { credentials: "include" });
        if (!resp.ok) throw new Error(`Export failed (${resp.status})`);
        const blob = await resp.blob();
        const a = document.createElement("a");
        const downloadUrl = window.URL.createObjectURL(blob);
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      } catch (err) {
        console.error("Export failed", err);
        alert("Export failed. Check console for details.");
      }
    })();
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 text-white transition-all duration-300 bg-transparent"
    >
      {/* Admin-like ambient overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(900px circle at 20% 0%, rgba(255,255,255,0.10), transparent 55%), radial-gradient(900px circle at 80% 0%, rgba(56,189,248,0.10), transparent 60%), linear-gradient(to bottom, rgba(2,102,94,0.55), rgba(2,102,94,0.12) 70%, rgba(2,102,94,0.00))",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10" aria-hidden />

      <div className="public-container h-16 flex items-center relative">
        <div className="w-full h-14 rounded-3xl border border-white/10 backdrop-blur-xl shadow-[0_18px_70px_rgba(0,0,0,0.28),0_0_50px_rgba(2,102,94,0.18)] flex items-center justify-between px-5 md:px-6 relative bg-[#02665e]">
          {/* Left: sidebar toggle + brand mark (kept inside the header bar; no floating layer) */}
          <div className="inline-flex items-center gap-3">
            <button
              onClick={() => {
                try {
                  const evt = new CustomEvent("toggle-owner-sidebar", { detail: { source: "header" } });
                  window.dispatchEvent(evt);
                } catch {
                  // ignore
                }
              }}
              aria-label="Toggle sidebar"
              title="Toggle sidebar"
              className="group hidden md:inline-flex items-center justify-center h-10 w-10 rounded-2xl transition-all duration-300 ease-out bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 hover:border-white/30 hover:scale-105 active:scale-95"
            >
              <svg
                className="w-5 h-5 text-white opacity-90 group-hover:opacity-100 transition-all duration-300"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <Link href="/owner" className="inline-flex items-center no-underline hover:opacity-90 transition-opacity" aria-label="Owner Dashboard">
              <Image src="/assets/NoLS2025-04.png" alt="NoLSAF" width={44} height={44} className="h-9 w-9 brightness-0 invert" />
            </Link>
          </div>

          {/* Right: tools (always visible). On small screens the action icons scroll horizontally. */}
          <div className="flex items-center gap-2 min-w-0 text-white">
            <div className="flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-hide pr-1 text-white">
              <button
                onClick={handleRefresh}
                className={`inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10 ${touchedIcon === "refresh" ? "bg-white/10" : ""}`}
                aria-label="Refresh"
                title="Refresh"
                onTouchStart={() => handleTouch("refresh")}
              >
                <RefreshCw className={`h-5 w-5 text-white ${isRefreshing ? "animate-spin" : ""}`} />
              </button>

              <button
                onClick={handleExportInvoices}
                className={`inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10 ${touchedIcon === "export" ? "bg-white/10" : ""}`}
                aria-label="Export Invoices CSV"
                title="Export Invoices CSV"
                onTouchStart={() => handleTouch("export")}
              >
                <Download className="h-5 w-5 text-white" />
              </button>

              <Link
                href="/owner/properties/add"
                className={`inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10 ${touchedIcon === "add" ? "bg-white/10" : ""}`}
                aria-label="Add property"
                title="Add new property"
                onTouchStart={() => handleTouch("add")}
              >
                <Plus className="h-5 w-5 text-white" />
              </Link>

              <button onClick={toggleTheme} className="inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10" aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="h-5 w-5 text-white" /> : <Moon className="h-5 w-5 text-white" />}
              </button>

              <Link
                href="/owner/support"
                className={`inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10 ${touchedIcon === "support" ? "bg-white/10" : ""}`}
                aria-label="Request assistance"
                title="Request assistance"
                onTouchStart={() => handleTouch("support")}
              >
                <LifeBuoy className="h-5 w-5 text-white" />
              </Link>

              <Link
                href="/owner/notifications"
                className={`relative inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10 ${touchedIcon === "notifications" ? "bg-white/10" : ""}`}
                aria-label="Notifications"
                title="Notifications"
                onTouchStart={() => handleTouch("notifications")}
              >
                <Bell className="h-5 w-5 text-white" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3 min-w-3 px-0.5 rounded-full bg-rose-500 text-[9px] leading-3 text-white font-semibold ring-1 ring-white/50 text-center">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </Link>

              <Link
                href="/owner/settings"
                className={`inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10 ${touchedIcon === "settings" ? "bg-white/10" : ""}`}
                aria-label="Settings"
                title="Settings"
                onTouchStart={() => handleTouch("settings")}
              >
                <SettingsIcon className="h-5 w-5 text-white" />
              </Link>
            </div>

            <div className="hidden sm:block mx-1 h-5 w-px bg-white/20" />

            <div ref={profileDropdownRef} className="relative flex-shrink-0">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="group inline-flex items-center justify-center gap-2 h-10 px-2 rounded-xl bg-transparent border-0 hover:bg-white/10 hover:backdrop-blur-sm hover:border hover:border-white/20 hover:scale-105 active:scale-95 transition-all duration-300 ease-out"
                aria-label="Profile menu"
                aria-expanded={profileDropdownOpen}
                onTouchStart={() => handleTouch("profile")}
                onTouchEnd={() => setTouchedIcon(null)}
              >
                {avatarUrl ? (
                  <div className="h-9 w-9 rounded-full overflow-hidden transition-all duration-300 ease-out group-hover:ring-2 group-hover:ring-white/10">
                    <Image src={avatarUrl} alt="Profile" width={36} height={36} className="object-cover w-full h-full transition-transform duration-300 ease-out group-hover:scale-110" />
                  </div>
                ) : (
                  <div className="h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300 ease-out group-hover:ring-2 group-hover:ring-white/10">
                    <User className="h-5 w-5 text-white opacity-90 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                )}
                <ChevronDown className={`h-4 w-4 text-white opacity-90 transition-all duration-300 ease-out ${profileDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-3 w-72 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden z-50 animate-fade-in-up">
                  <div className="px-4 py-4 border-b border-gray-100/50 bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-slate-50/30">
                    <div className="flex items-center gap-3 mb-3">
                      {avatarUrl ? (
                        <div className="h-12 w-12 rounded-full border-2 border-emerald-300 overflow-hidden flex-shrink-0 transition-transform duration-300 hover:scale-110 ring-2 ring-emerald-100">
                          <Image src={avatarUrl} alt="Profile" width={48} height={48} className="object-cover w-full h-full" />
                        </div>
                      ) : (
                        <div className="h-12 w-12 rounded-full border-2 border-emerald-300 bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-110 ring-2 ring-emerald-100">
                          <User className="h-6 w-6 text-emerald-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-base text-gray-900 truncate">{userName || "Owner"}</div>
                          <div className="flex-shrink-0" title="Verified Account">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 truncate mt-0.5">{userEmail || "No email"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    <Link href="/owner" onClick={() => setProfileDropdownOpen(false)} className="group flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200 no-underline">
                      <Home className="h-4 w-4 text-gray-500 group-hover:text-emerald-600 transition-all duration-200 group-hover:scale-110" />
                      <span className="font-medium">Dashboard</span>
                    </Link>
                    <Link href="/owner/profile" onClick={() => setProfileDropdownOpen(false)} className="group flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200 no-underline">
                      <User className="h-4 w-4 text-gray-500 group-hover:text-emerald-600 transition-all duration-200 group-hover:scale-110" />
                      <span className="font-medium">My Profile</span>
                    </Link>
                    <Link href="/owner/properties/approved" onClick={() => setProfileDropdownOpen(false)} className="group flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200 no-underline">
                      <Building2 className="h-4 w-4 text-gray-500 group-hover:text-emerald-600 transition-all duration-200 group-hover:scale-110" />
                      <span className="font-medium">My Properties</span>
                    </Link>
                    <Link href="/owner/bookings" onClick={() => setProfileDropdownOpen(false)} className="group flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200 no-underline">
                      <Calendar className="h-4 w-4 text-gray-500 group-hover:text-emerald-600 transition-all duration-200 group-hover:scale-110" />
                      <span className="font-medium">My Bookings</span>
                    </Link>
                    <Link href="/owner/revenue" onClick={() => setProfileDropdownOpen(false)} className="group flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200 no-underline">
                      <DollarSign className="h-4 w-4 text-gray-500 group-hover:text-emerald-600 transition-all duration-200 group-hover:scale-110" />
                      <span className="font-medium">My Revenues</span>
                    </Link>
                    <Link href="/owner/settings" onClick={() => setProfileDropdownOpen(false)} className="group flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200 no-underline">
                      <SettingsIcon className="h-4 w-4 text-gray-500 group-hover:text-emerald-600 transition-all duration-200 group-hover:scale-110" />
                      <span className="font-medium">Settings</span>
                    </Link>

                    <div className="my-2 mx-3 h-px bg-gray-200" />

                    <button
                      onClick={async () => {
                        try {
                          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                        } catch {}
                        window.location.href = logoutRedirect;
                      }}
                      className="group w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 no-underline rounded-lg mx-1"
                    >
                      <LogOut className="h-4 w-4 group-hover:scale-110 transition-all duration-200" />
                      <span className="font-semibold">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* Mobile burger (kept for the drawer links) */}
            <button
              className={`md:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/15 hover:border-white/20 active:scale-95 transition-all duration-300 ease-out ${open ? "bg-white/15 border-white/25" : ""}`}
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              <svg
                className={`w-5 h-5 text-white transition-all duration-300 ease-out ${open ? "rotate-90" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                {open ? (
                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile slide-in side drawer */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px] animate-fade-in-overlay"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Side sheet */}
          <div
            className="md:hidden fixed left-0 top-0 bottom-0 z-[70] w-[280px] bg-white shadow-[8px_0_40px_rgba(0,0,0,0.18)] flex flex-col animate-slide-in-left overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Header — teal gradient matching the top bar */}
            <div className="relative flex-shrink-0 bg-[#02665e] px-5 pt-10 pb-6 overflow-hidden">
              {/* subtle dot grid */}
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.06]"
                style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "16px 16px" }}
                aria-hidden
              />
              {/* close button */}
              <button
                onClick={() => setOpen(false)}
                className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Avatar + user info */}
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <div className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-white/40 flex-shrink-0">
                    <Image src={avatarUrl} alt="Profile" width={48} height={48} className="object-cover w-full h-full" />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-white/15 ring-2 ring-white/30 flex items-center justify-center flex-shrink-0">
                    <User className="h-6 w-6 text-white" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white truncate">{userName || "Owner"}</span>
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-300 flex-shrink-0" />
                  </div>
                  <p className="text-[11px] text-white/60 truncate mt-0.5">{userEmail || ""}</p>
                </div>
              </div>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto py-3">
              {([
                { href: "/owner", icon: Home, label: "Dashboard" },
                { href: "/owner/profile", icon: User, label: "My Profile" },
                { href: "/owner/properties/approved", icon: Building2, label: "My Properties" },
                { href: "/owner/bookings", icon: Calendar, label: "My Bookings" },
                { href: "/owner/revenue", icon: DollarSign, label: "My Revenues" },
              ] as const).map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="group flex items-center gap-3.5 px-5 py-3 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors no-underline"
                >
                  <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                    <Icon className="h-4 w-4 text-slate-500 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <span className="font-semibold">{label}</span>
                </Link>
              ))}

              <div className="my-2 mx-4 h-px bg-slate-100" />

              <Link
                href="/owner/notifications"
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3.5 px-5 py-3 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors no-underline"
              >
                <div className="relative flex-shrink-0 h-8 w-8 rounded-lg bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                  <Bell className="h-4 w-4 text-slate-500 group-hover:text-emerald-600 transition-colors" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 rounded-full bg-rose-500 text-[9px] leading-4 text-white font-bold flex items-center justify-center">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </div>
                <span className="font-semibold flex-1">Notifications</span>
                {unreadMessages > 0 && (
                  <span className="ml-auto text-[10px] font-bold text-rose-500 bg-rose-50 rounded-full px-2 py-0.5">
                    {unreadMessages} new
                  </span>
                )}
              </Link>

              <Link
                href="/owner/settings"
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3.5 px-5 py-3 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors no-underline"
              >
                <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                  <SettingsIcon className="h-4 w-4 text-slate-500 group-hover:text-emerald-600 transition-colors" />
                </div>
                <span className="font-semibold">Settings</span>
              </Link>

              <Link
                href="/owner/support"
                onClick={() => setOpen(false)}
                className="group flex items-center gap-3.5 px-5 py-3 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors no-underline"
              >
                <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                  <LifeBuoy className="h-4 w-4 text-slate-500 group-hover:text-emerald-600 transition-colors" />
                </div>
                <span className="font-semibold">Support</span>
              </Link>
            </nav>

            {/* Footer actions */}
            <div className="flex-shrink-0 border-t border-slate-100 p-3 space-y-1">
              <button
                onClick={() => { handleRefresh(); setOpen(false); }}
                disabled={isRefreshing}
                className="group w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors ${isRefreshing ? "animate-spin" : ""}`} />
                <span className="font-medium">Refresh page</span>
              </button>
              <button
                onClick={async () => {
                  setOpen(false);
                  try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
                  window.location.href = logoutRedirect;
                }}
                className="group w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span className="font-bold">Logout</span>
              </button>
            </div>
          </div>
        </>
      )}

      <ClientErrorBoundary>
        <LegalModal />
      </ClientErrorBoundary>
    </header>
  );
}

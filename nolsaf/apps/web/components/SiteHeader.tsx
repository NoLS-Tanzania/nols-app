"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Bell, LifeBuoy, Settings as SettingsIcon, RefreshCw, Download, Sliders, Sun, Moon, Plus, FileText, Shield, Lock, Truck, User, Gift, Calendar, LogOut, ChevronDown, Trophy, Share2 } from "lucide-react";
import dynamic from 'next/dynamic';
const LegalModal = dynamic(() => import('@/components/LegalModal'), { ssr: false });
import ClientErrorBoundary from '@/components/ClientErrorBoundary';

// Add dropdown animation styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fade-in-up {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .animate-fade-in-up {
      animation: fade-in-up 0.2s ease-out forwards;
    }
  `;
  style.setAttribute('data-dropdown-animations', 'true');
  if (!document.head.querySelector('style[data-dropdown-animations]')) {
    document.head.appendChild(style);
  }
}

export default function SiteHeader({
  role = "OWNER",
  unreadMessages = 0,
  driverMode = false,
}: { role?: "ADMIN" | "OWNER" | "DRIVER" | "CUSTOMER"; unreadMessages?: number; driverMode?: boolean }) {
  const [open, setOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const isAdmin = role === "ADMIN";
  const isOwner = role === "OWNER";
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [touchedIcon, setTouchedIcon] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [adminSidebarVisible, setAdminSidebarVisible] = useState(true);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const handleTouch = (id: string) => {
    setTouchedIcon(id);
    // clear after 2s so touch shows the hover state briefly
    window.setTimeout(() => setTouchedIcon((v) => (v === id ? null : v)), 2000);
  };

  useEffect(() => {
    // fetch unread count when running in browser for admin
    (async () => {
      if (!isAdmin) return;
      try {
        // Use relative paths in browser to leverage Next.js rewrites (avoids CORS issues)
        const url = '/api/admin/notifications?tab=unread&page=1&pageSize=1';
        const r = await fetch(url, { credentials: 'include' });
        if (!r.ok) return;
        const data = await r.json();
        if (typeof data.totalUnread === 'number') setUnreadCount(data.totalUnread);
      } catch (err) {
        // ignore
      }
    })();

    // fetch user profile to get avatar
    (async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;
        // Use relative paths in browser to leverage Next.js rewrites (avoids CORS issues)
        const url = '/account/me';
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) return;
        const data = await r.json();
        if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
        if (data.fullName) setUserName(data.fullName);
        if (data.email) setUserEmail(data.email);
      } catch (err) {
        // ignore
      }
    })();

    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('theme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = saved === 'dark' || (saved === null && prefersDark) ? 'dark' : 'light';
      setTheme(initial);
      if (initial === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } catch (err) {
      // ignore
    }

    // Close settings dropdown when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-settings-dropdown]')) {
        setSettingsOpen(false);
      }
      // Close profile dropdown when clicking outside
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isAdmin]);

  // Sync header left margin with admin sidebar visibility to avoid leftover gap
  useEffect(() => {
    if (!isAdmin) return;
    const handler = () => setAdminSidebarVisible((v) => !v);
    window.addEventListener('toggle-admin-sidebar', handler as EventListener);
    return () => window.removeEventListener('toggle-admin-sidebar', handler as EventListener);
  }, [isAdmin]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('theme', next);
      if (next === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } catch (err) {
      // ignore
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh the current page
      window.location.reload();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportInvoices = () => {
    (async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        // Use relative paths in browser to leverage Next.js rewrites (avoids CORS issues)
        const defaultUrl = '/admin/invoices.csv';
        const endpoint = process.env.NEXT_PUBLIC_EXPORT_INVOICES_ENDPOINT || defaultUrl;

        const filenameTemplate = process.env.NEXT_PUBLIC_EXPORT_INVOICES_FILENAME || 'invoices.csv';
        const date = new Date().toISOString().split('T')[0];
        const filename = filenameTemplate.replace('{date}', date);

        const resp = await fetch(endpoint, {
          headers: token ? { Authorization: `Bearer ${token}`, 'x-role': 'ADMIN', 'x-user-id': '1' } : { 'x-role': 'ADMIN', 'x-user-id': '1' },
        });
        if (!resp.ok) throw new Error(`Export failed (${resp.status})`);
        const blob = await resp.blob();
        const a = document.createElement('a');
        const downloadUrl = window.URL.createObjectURL(blob);
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      } catch (err: any) {
        console.error('Export failed', err);
        alert('Export failed. Check console for details.');
      }
    })();
  };

  const handleWidgetPreferences = () => {
    alert("Widget preferences clicked");
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 text-white/95 ${(isAdmin || isOwner) ? "bg-[#02665e]" : "bg-brand-primary"} shadow-none`}
    >
      <div className={`mx-auto max-w-6xl px-4 h-16 flex items-center justify-between ${isAdmin && adminSidebarVisible ? 'md:ml-64' : ''}`}>
        {/* Owner: small toggle to hide/show sidebar. Uses a global event so Layout can listen */}
        {isOwner && !driverMode ? (
          <button
            onClick={() => {
              try {
                window.dispatchEvent(new CustomEvent('toggle-owner-sidebar', { detail: { source: 'header' } }));
              } catch (e) {
                // ignore
              }
            }}
            aria-label="Toggle sidebar"
            className="hidden md:inline-flex items-center justify-center h-9 w-9 rounded-md bg-white/10 text-white/90 hover:bg-white/20 mr-3"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
        {isAdmin ? (
          <button
            onClick={() => {
              try {
                window.dispatchEvent(new CustomEvent('toggle-admin-sidebar', { detail: { source: 'header' } }));
              } catch (e) {
                // ignore
              }
            }}
            aria-label="Toggle sidebar"
            className="hidden md:inline-flex items-center justify-center h-9 w-9 rounded-md bg白/10 text白/90 hover:bg白/20 mr-3"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
        {driverMode ? (
          <button
            onClick={() => {
              try {
                window.dispatchEvent(new CustomEvent('toggle-driver-sidebar', { detail: { source: 'header' } }));
              } catch (e) {
                // ignore
              }
            }}
            aria-label="Toggle sidebar"
            className="hidden md:inline-flex items-center justify-center h-9 w-9 rounded-md bg-white/10 text-white/90 hover:bg-white/20 mr-3"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
        {isAdmin ? (
          <Link href="/" className="inline-flex items-center" aria-label="NoLSAF Home">
            <Image
              src="/assets/nolsnewlog.png"
              alt="NoLSAF"
              width={120}
              height={30}
              className="h-8 w-auto"
            />
          </Link>
        ) : isOwner ? (
          <Link href="/" className="inline-flex items-center" aria-label="NoLSAF Home">
            <Image
              src="/assets/nolsnewlog.png"
              alt="NoLSAF"
              width={120}
              height={30}
              className="h-8 w-auto"
            />
          </Link>
        ) : null}

        {/* driverMode: no textual controls here; icons live in the right-side group below */}

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {isAdmin ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleRefresh}
                className="inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10"
                aria-label="Refresh"
                title="Refresh"
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleExportInvoices}
                className="inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10"
                aria-label="Export Invoices CSV"
                title="Export Invoices CSV"
              >
                <Download className="h-5 w-5" />
              </button>

              <button
                onClick={handleWidgetPreferences}
                className="inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10"
                aria-label="Widget Preferences"
                title="Widget Preferences"
              >
                <Sliders className="h-5 w-5" />
              </button>

              <button
                onClick={toggleTheme}
                className="inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10"
                aria-label="Toggle theme"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <Link
                href="/admin/messages"
                className="relative inline-flex items-center justify-center rounded-md p-1.5 hover:bg-transparent"
                aria-label="Notifications"
                title={"Notifications"}
              >
                <Bell className="h-5 w-5 text-white" />
                <span
                  className="absolute -top-0.5 -right-0.5 h-3 min-w-3 px-0.5 rounded-full bg-rose-500 text-[9px] leading-3 text-white font-semibold ring-1 ring-white/50 text-center"
                  aria-label={`${unreadCount ?? unreadMessages} unread notifications`}
                >
                  {(unreadCount ?? unreadMessages) > 9 ? "9+" : (unreadCount ?? unreadMessages)}
                </span>
              </Link>

              <Link href="/admin/support" className="inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10" aria-label="Support" title={"Support"}>
                <LifeBuoy className="h-5 w-5" />
              </Link>

              <Link href="/admin/settings" className="inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10" aria-label="Settings" title={"Settings"}>
                <SettingsIcon className="h-5 w-5" />
              </Link>

              <div className="mx-2 h-5 w-px bg-white/20" />

              <Link href="/account" className="inline-flex items-center justify-center">
                <div className="h-10 w-10 rounded-full border border-white/20 bg-white/10 text-white/90 flex items-center justify-center text-sm font-semibold">
                  AD
                </div>
              </Link>
            </div>
          ) : null}

          {/* left side for owners is intentionally blank here; owner actions render to the right */}
        </nav>

        {/* Owner right-side icon group (md+). Rendered after the nav so it aligns to the far right.
            If driverMode is enabled (driver dashboard) render a reduced set of icons only. */}
        {driverMode ? (
          <div className="hidden md:inline-flex items-center gap-1">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center justify-center p-1.5 bg-transparent border-0 transition-all duration-300 ease-out active:scale-75 hover:scale-110 active:opacity-70"
              aria-label="Refresh"
              title="Refresh"
              onTouchStart={() => handleTouch('refresh')}
              onTouchEnd={() => setTouchedIcon(null)}
            >
              <RefreshCw className={`h-5 w-5 text-white transition-all duration-300 ease-out ${isRefreshing ? 'animate-spin' : 'hover:rotate-180 active:rotate-360'}`} />
            </button>

            <Link 
              href="/driver/notifications" 
              className="relative inline-flex items-center justify-center p-1.5 bg-transparent transition-all duration-300 ease-out active:scale-75 hover:scale-110 active:opacity-70"
              aria-label="Notifications" 
              title="Notifications"
              onTouchStart={() => handleTouch('notifications')}
              onTouchEnd={() => setTouchedIcon(null)}
            >
              <Bell className="h-5 w-5 text-white transition-all duration-300 ease-out hover:animate-pulse active:scale-125" />
            </Link>

            <Link 
              href="/driver/support" 
              className="inline-flex items-center justify-center p-1.5 bg-transparent transition-all duration-300 ease-out active:scale-75 hover:scale-110 active:opacity-70"
              aria-label="Request assistance" 
              title="Request assistance"
              onTouchStart={() => handleTouch('support')}
              onTouchEnd={() => setTouchedIcon(null)}
            >
              <LifeBuoy className="h-5 w-5 text-white transition-all duration-300 ease-out hover:rotate-12 active:rotate-24" />
            </Link>

            <div className="relative" data-settings-dropdown>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSettingsOpen(!settingsOpen);
                }}
                className="inline-flex items-center justify-center p-1.5 bg-transparent border-0 transition-all duration-300 ease-out active:scale-75 hover:scale-110 active:opacity-70"
                aria-label="Settings"
                title="Settings"
                onTouchStart={() => handleTouch('settings')}
                onTouchEnd={() => setTouchedIcon(null)}
              >
                <SettingsIcon className={`h-5 w-5 text-white transition-all duration-300 ease-out ${settingsOpen ? 'rotate-90' : 'hover:rotate-45 active:rotate-90'}`} />
              </button>

              {settingsOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Management</h3>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/driver/management?tab=documents"
                      onClick={() => setSettingsOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline"
                    >
                      <div className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span>Documents</span>
                      </div>
                      <div className="text-xs text-gray-500 ml-6">License, insurance, contracts</div>
                    </Link>

                    <Link
                      href="/driver/management?tab=safety"
                      onClick={() => setSettingsOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline"
                    >
                      <div className="font-medium flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-600" />
                        <span>Safety Measures</span>
                      </div>
                      <div className="text-xs text-gray-500 ml-6">Incidents and safety summary</div>
                    </Link>

                    <Link
                      href="/driver/security"
                      onClick={() => setSettingsOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline"
                    >
                      <div className="font-medium flex items-center gap-2">
                        <Lock className="h-4 w-4 text-blue-600" />
                        <span>Security</span>
                      </div>
                      <div className="text-xs text-gray-500 ml-6">Password and contact details</div>
                    </Link>

                    <Link
                      href="/driver/management?tab=settings"
                      onClick={() => setSettingsOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors no-underline"
                    >
                      <div className="font-medium flex items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-600" />
                        <span>Vehicle Settings</span>
                      </div>
                      <div className="text-xs text-gray-500 ml-6">Vehicle details and registration</div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="mx-2 h-5 w-px bg-white/20" />

            <div ref={profileDropdownRef} className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="inline-flex items-center justify-center gap-2 p-1 bg-transparent border-0 transition-all duration-300 ease-out active:scale-90 hover:scale-105 active:opacity-70"
                aria-label="Profile menu"
                aria-expanded={profileDropdownOpen}
                onTouchStart={() => handleTouch('profile')}
                onTouchEnd={() => setTouchedIcon(null)}
              >
                {avatarUrl ? (
                  <div className="h-10 w-10 rounded-full border border-white/20 overflow-hidden transition-all duration-300 ease-out hover:border-white/40 hover:scale-110 active:scale-95 active:border-white/60">
                    <Image src={avatarUrl} alt="Profile" width={40} height={40} className="object-cover w-full h-full transition-transform duration-300 ease-out hover:scale-110 active:scale-95" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full border border-white/20 flex items-center justify-center transition-all duration-300 ease-out hover:border-white/40 hover:scale-110 active:scale-95 active:border-white/60">
                    <User className="h-5 w-5 text-white/90 transition-all duration-300 ease-out active:scale-110" />
                  </div>
                )}
                <ChevronDown className={`h-4 w-4 text-white/90 transition-all duration-300 ease-out ${profileDropdownOpen ? 'rotate-180' : 'hover:translate-y-0.5 active:translate-y-1'}`} />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-fade-in-up">
                  {/* Profile Info Section */}
                  <div className="px-3 py-2.5 border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 to-slate-50/50">
                    <div className="flex items-center gap-2.5">
                      {avatarUrl ? (
                        <div className="h-8 w-8 rounded-full border border-emerald-200 overflow-hidden flex-shrink-0 transition-transform duration-300 hover:scale-110">
                          <Image src={avatarUrl} alt="Profile" width={32} height={32} className="object-cover w-full h-full" />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full border border-emerald-200 bg-emerald-100 flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-110">
                          <User className="h-4 w-4 text-emerald-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900 truncate">
                          {userName || 'Driver'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {userEmail || 'No email'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <Link
                      href="/driver/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200 no-underline group"
                    >
                      <User className="h-4 w-4 text-gray-500 group-hover:text-emerald-600 transition-all duration-200 group-hover:scale-110" />
                      <span className="font-medium">My Profile</span>
                    </Link>

                    <Link
                      href="/driver/bonus"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200 no-underline group"
                    >
                      <Gift className="h-4 w-4 text-gray-500 group-hover:text-emerald-600 transition-all duration-200 group-hover:scale-110" />
                      <span className="font-medium">My Bonus</span>
                    </Link>

                    <Link
                      href="/driver/level"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200 no-underline group"
                    >
                      <Trophy className="h-4 w-4 text-gray-500 group-hover:text-emerald-600 transition-all duration-200 group-hover:scale-110" />
                      <span className="font-medium">Level</span>
                    </Link>

                    <Link
                      href="/driver/referral"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200 no-underline group"
                    >
                      <Share2 className="h-4 w-4 text-gray-500 group-hover:text-emerald-600 transition-all duration-200 group-hover:scale-110" />
                      <span className="font-medium">Referral</span>
                    </Link>

                    <Link
                      href="/driver/history"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200 no-underline group"
                    >
                      <Calendar className="h-4 w-4 text-gray-500 group-hover:text-emerald-600 transition-all duration-200 group-hover:scale-110" />
                      <span className="font-medium">History</span>
                    </Link>

                    <Link
                      href="/driver/management"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200 no-underline group"
                    >
                      <SettingsIcon className="h-4 w-4 text-gray-500 group-hover:text-emerald-600 transition-all duration-200 group-hover:scale-110" />
                      <span className="font-medium">Setting</span>
                    </Link>

                    <button
                      onClick={() => {
                        localStorage.removeItem('token');
                        window.location.href = '/login';
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 no-underline group"
                    >
                      <LogOut className="h-4 w-4 group-hover:scale-110 transition-all duration-200" />
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : isOwner ? (
          <div className="hidden md:inline-flex items-center gap-1">
            <button
              onClick={handleRefresh}
              className={`inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10 ${touchedIcon === 'refresh' ? 'bg-white/10' : ''}`}
              aria-label="Refresh"
              title="Refresh"
              onTouchStart={() => handleTouch('refresh')}
            >
              <RefreshCw className={`h-5 w-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleExportInvoices}
              className={`inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10 ${touchedIcon === 'export' ? 'bg-white/10' : ''}`}
              aria-label="Export Invoices CSV"
              title="Export Invoices CSV"
              onTouchStart={() => handleTouch('export')}
            >
              <Download className="h-5 w-5 text-white" />
            </button>

            <Link
              href="/owner/properties/add"
              className={`inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10 ${touchedIcon === 'add' ? 'bg-white/10' : ''}`}
              aria-label="Add property"
              title="Add new property"
              onTouchStart={() => handleTouch('add')}
            >
              <Plus className="h-5 w-5 text-white" />
            </Link>

            <button onClick={toggleTheme} className="inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-5 w-5 text-white" /> : <Moon className="h-5 w-5 text-white" />}
            </button>

            <Link href="/owner/support" className={`inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10 ${touchedIcon === 'support' ? 'bg-white/10' : ''}`} aria-label="Request assistance" title="Request assistance" onTouchStart={() => handleTouch('support')}>
              <LifeBuoy className="h-5 w-5 text-white" />
            </Link>

            <Link href="/owner/notifications" className={`relative inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10 ${touchedIcon === 'notifications' ? 'bg-white/10' : ''}`} aria-label="Notifications" title="Notifications" onTouchStart={() => handleTouch('notifications')}>
              <Bell className="h-5 w-5 text-white" />
              <span className="absolute -top-0.5 -right-0.5 h-3 min-w-3 px-0.5 rounded-full bg-rose-500 text-[9px] leading-3 text-white font-semibold ring-1 ring-white/50 text-center">{unreadMessages > 9 ? '9+' : unreadMessages}</span>
            </Link>

            <Link href="/owner/settings" className={`inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10 ${touchedIcon === 'settings' ? 'bg-white/10' : ''}`} aria-label="Settings" title="Settings" onTouchStart={() => handleTouch('settings')}>
              <SettingsIcon className="h-5 w-5 text-white" />
            </Link>

            <div className="mx-2 h-5 w-px bg-white/20" />

            <Link href="/account" className="inline-flex items-center justify-center">
              {avatarUrl ? (
                <div className="h-10 w-10 rounded-full border border-white/20 overflow-hidden">
                  <Image src={avatarUrl} alt="Profile" width={40} height={40} className="object-cover w-full h-full" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full border border-white/20 bg-white/10 text-white/90 flex items-center justify-center text-sm font-semibold">
                  ME
                </div>
              )}
            </Link>
          </div>
        ) : null}

        {/* Mobile burger */}
        <button
          className="md:hidden inline-flex items-center justify-center rounded-xl px-3 py-2 hover:bg-white/10"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div
          className={`md:hidden border-t border-white/10 ${isAdmin ? "bg-[#02665e]" : "bg-brand-primary/95"}`}
        >
          <nav className="mx-auto max-w-6xl px-4 py-2 flex flex-col gap-1">
            {isAdmin && (
              <>
                <div className="my-2 h-px w-full bg-white/10" />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRefresh}
                    aria-label="Refresh"
                    title="Refresh"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/10 active:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleExportInvoices}
                    aria-label="Export Invoices CSV"
                    title="Export Invoices CSV"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/10 active:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleWidgetPreferences}
                    aria-label="Widget Preferences"
                    title="Widget Preferences"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/10 active:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    <Sliders className="h-5 w-5" />
                  </button>
                  <button
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/10 active:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </button>
                  <Link
                    href="/admin/messages"
                    aria-label="Notifications"
                    title={"Notifications"}
                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-transparent active:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    onClick={() => setOpen(false)}
                  >
                    <Bell className="h-5 w-5 text-white" />
                    <span
                      className="absolute -top-0.5 -right-0.5 h-3 min-w-3 px-0.5 rounded-full bg-rose-500 text-[9px] leading-3 text-white font-semibold ring-1 ring-white/50 text-center"
                      aria-label={`${unreadCount ?? unreadMessages} unread notifications`}
                    >
                      {(unreadCount ?? unreadMessages) > 9 ? "9+" : (unreadCount ?? unreadMessages)}
                    </span>
                  </Link>
                  <Link
                    href="/admin/support"
                    aria-label="Support"
                    title={"Support"}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/10 active:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    onClick={() => setOpen(false)}
                  >
                    <LifeBuoy className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/admin/settings"
                    aria-label="Settings"
                    title={"Settings"}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-white/10 active:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    onClick={() => setOpen(false)}
                  >
                    <SettingsIcon className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/account"
                    aria-label="Profile"
                    title={"Profile"}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/10 active:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    onClick={() => setOpen(false)}
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[11px]">AD</span>
                  </Link>
                </div>
              </>
            )}
            <Link href="/account" className="px-3 py-2 rounded-xl text-sm hover:bg-white/10" onClick={() => setOpen(false)}>
              My Account
            </Link>
          </nav>
        </div>
      )}
      <ClientErrorBoundary>
        <LegalModal />
      </ClientErrorBoundary>
    </header>
  );
}

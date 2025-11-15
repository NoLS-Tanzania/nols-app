"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Bell, LifeBuoy, Settings as SettingsIcon, RefreshCw, Download, Sliders, Sun, Moon, Plus } from "lucide-react";
import dynamic from 'next/dynamic';
const LegalModal = dynamic(() => import('@/components/LegalModal'), { ssr: false });
import ClientErrorBoundary from '@/components/ClientErrorBoundary';

export default function SiteHeader({
  role = "OWNER",
  unreadMessages = 0,
  driverMode = false,
}: { role?: "ADMIN" | "OWNER" | "DRIVER"; unreadMessages?: number; driverMode?: boolean }) {
  const [open, setOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const isAdmin = role === "ADMIN";
  const isOwner = role === "OWNER";
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [touchedIcon, setTouchedIcon] = useState<string | null>(null);

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
        const base = process.env.NEXT_PUBLIC_API_URL || '';
        const url = base ? `${base.replace(/\/$/, '')}/api/admin/notifications?tab=unread&page=1&pageSize=1` : '/api/admin/notifications?tab=unread&page=1&pageSize=1';
        const r = await fetch(url, { credentials: 'include' });
        if (!r.ok) return;
        const data = await r.json();
        if (typeof data.totalUnread === 'number') setUnreadCount(data.totalUnread);
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

        const defaultUrl = `${process.env.NEXT_PUBLIC_API_URL}/admin/invoices.csv`;
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
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between md:ml-64">
        {isAdmin ? (
          <Link href="/" className="inline-flex items-center" aria-label="NoLSAF Home">
            <Image
              src="/assets/nolsnewlog.png"
              alt="NoLSAF"
              width={140}
              height={36}
              className="h-10 w-auto"
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
              className={`inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10 ${touchedIcon === 'refresh' ? 'bg-white/10' : ''}`}
              aria-label="Refresh"
              title="Refresh"
              onTouchStart={() => handleTouch('refresh')}
            >
              <RefreshCw className={`h-5 w-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <Link href="/driver/notifications" className="relative inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10" aria-label="Notifications" title="Notifications">
              <Bell className="h-5 w-5 text-white" />
            </Link>

            <Link href="/driver/support" className="inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10" aria-label="Request assistance" title="Request assistance">
              <LifeBuoy className="h-5 w-5 text-white" />
            </Link>

            <Link href="/driver/settings" className={`inline-flex items-center justify-center rounded-md p-1.5 hover:bg-white/10 ${touchedIcon === 'settings' ? 'bg-white/10' : ''}`} aria-label="Settings" title="Settings">
              <SettingsIcon className="h-5 w-5 text-white" />
            </Link>

            <div className="mx-2 h-5 w-px bg-white/20" />

            <Link href="/account" className="inline-flex items-center justify-center">
              <div className="h-10 w-10 rounded-full border border-white/20 bg-white/10 text-white/90 flex items-center justify-center text-sm font-semibold">
                ME
              </div>
            </Link>
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
              <div className="h-10 w-10 rounded-full border border-white/20 bg-white/10 text-white/90 flex items-center justify-center text-sm font-semibold">
                ME
              </div>
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

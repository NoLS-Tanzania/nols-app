"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

export default function DriverNotificationsPage() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [readCount, setReadCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    (async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const base = process.env.NEXT_PUBLIC_API_URL || '';
        const baseUrl = base ? base.replace(/\/$/, '') : '';
        const headers: HeadersInit | undefined = token ? { Authorization: `Bearer ${token}` } : undefined;

        // fetch unread totals
        const unreadUrl = baseUrl ? `${baseUrl}/api/driver/notifications?tab=unread&page=1&pageSize=1` : '/api/driver/notifications?tab=unread&page=1&pageSize=1';
        const ru = await fetch(unreadUrl, { headers, signal: controller.signal });
        if (ru.ok) {
          const ju = await ru.json();
          if (mounted) setUnreadCount(Number(ju.totalUnread ?? ju.total ?? 0));
        }

        // fetch read totals
        const readUrl = baseUrl ? `${baseUrl}/api/driver/notifications?tab=viewed&page=1&pageSize=1` : '/api/driver/notifications?tab=viewed&page=1&pageSize=1';
        const rr = await fetch(readUrl, { headers, signal: controller.signal });
        if (rr.ok) {
          const jr = await rr.json();
          if (mounted) setReadCount(Number(jr.total ?? 0));
        }
      } catch (err) {
        // ignore errors here; show zeros by default
      }
    })();
    return () => { mounted = false; controller.abort(); };
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full text-center space-y-4">
        <div className="flex justify-center">
          <Bell className="h-10 w-10 text-blue-600" aria-hidden />
        </div>

        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
          Driver Notifications
        </h1>

        <p className="text-sm text-gray-600">View your system notifications and updates</p>

        <div className="flex justify-center gap-3">
          <Link
            href="/driver/notifications/unread"
            className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium transition-colors border border-gray-200 text-gray-700 bg-white shadow-sm hover:bg-gray-50 no-underline hover:no-underline focus:outline-none focus:ring-4 focus:ring-indigo-300/40 focus:ring-offset-2 focus:ring-offset-white"
          >
            Unread ({unreadCount})
          </Link>

          <Link
            href="/driver/notifications/read"
            className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium transition-colors border border-gray-200 text-gray-700 bg-white shadow-sm hover:bg-gray-50 no-underline hover:no-underline focus:outline-none focus:ring-4 focus:ring-indigo-300/40 focus:ring-offset-2 focus:ring-offset-white"
          >
            Read ({readCount})
          </Link>
        </div>
      </div>
    </div>
  );
}

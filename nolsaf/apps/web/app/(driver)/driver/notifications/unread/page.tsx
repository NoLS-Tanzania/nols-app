"use client";
import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import MarkReadButton from "@/components/MarkReadButton";
import BackIcon from "@/components/BackIcon";

type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

export default function DriverUnreadNotificationsPage() {
  const [items, setItems] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      const startTime = Date.now();
      try {
        const r = await fetch('/api/driver/notifications?tab=unread&page=1&pageSize=50', { credentials: "include", signal: controller.signal });
        if (!mounted) return;
        if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
        const j = await r.json();
        setItems((j?.items ?? []).map((it: any) => ({ 
          id: String(it.id), 
          title: it.title ?? '', 
          body: it.body ?? '', 
          createdAt: it.createdAt ?? new Date().toISOString() 
        })));
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.debug('Could not load driver notifications', err);
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 3000 - elapsed);
        setTimeout(() => {
          if (mounted) setLoading(false);
        }, remaining);
      }
    })();
    return () => { mounted = false; controller.abort(); };
  }, []);

  async function markRead(id: string) {
    const before = items;
    setItems((prev) => prev.filter((n) => n.id !== id));
    try {
      const endpoint = `/api/driver/notifications/${encodeURIComponent(id)}/mark-read`;
      const r = await fetch(endpoint, { method: 'POST', credentials: "include" });
      if (!r.ok) throw new Error(`Server returned ${r.status}`);
    } catch (err) {
      console.error('markRead failed', err);
      setItems(before);
      alert('Could not mark notification as read. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span aria-hidden className="dot-spinner">
          <span className="dot dot-blue" />
          <span className="dot dot-black" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto text-center space-y-4 py-8">
        <div className="flex justify-center">
          <Bell className="h-10 w-10 text-blue-600" aria-hidden />
        </div>

        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
          Unread Notifications
        </h1>

        <p className="text-sm text-gray-600">These are your unread notifications.</p>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No unread notifications.</div>
          ) : (
            items.map((n) => (
              <div key={n.id} className="border rounded-md p-4 flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{n.title}</h4>
                  <p className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</p>
                  <p className="mt-2 text-sm text-gray-700">{n.body}</p>
                </div>

                <div className="ml-4 flex-shrink-0 flex flex-col gap-2">
                  <MarkReadButton onClick={() => markRead(n.id)} label="Mark as read" />
                  <Link href="/driver/notifications" className="text-sm text-gray-500">
                    Details
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-right">
          <BackIcon href="/driver/notifications" label="Back to notifications" />
        </div>
      </div>
    </div>
  );
}

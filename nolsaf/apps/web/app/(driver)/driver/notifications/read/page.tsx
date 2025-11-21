"use client";
import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import BackIcon from "@/components/BackIcon";

type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

export default function DriverReadNotificationsPage() {
  const [items, setItems] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      const startTime = Date.now();
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const base = process.env.NEXT_PUBLIC_API_URL || '';
        const url = base ? `${base.replace(/\/$/, '')}/api/driver/notifications?tab=viewed&page=1&pageSize=50` : '/api/driver/notifications?tab=viewed&page=1&pageSize=50';
        const headers: Record<string, string> | undefined = token ? { Authorization: `Bearer ${token}` } : undefined;
        const r = await fetch(url, { headers, signal: controller.signal });
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
          Read Notifications
        </h1>

        <p className="text-sm text-gray-600">These are your previously read notifications.</p>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No read notifications.</div>
          ) : (
            items.map((n) => (
              <div key={n.id} className="border rounded-md p-4 opacity-75">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{n.title}</h4>
                  <p className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</p>
                  <p className="mt-2 text-sm text-gray-700">{n.body}</p>
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

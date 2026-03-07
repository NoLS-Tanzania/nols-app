"use client";
import React, { useEffect, useState } from "react";
import { Bell, CheckCircle2, Clock3 } from "lucide-react";
import BackIcon from "@/components/BackIcon";

type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  sourceLabel?: string;
  kind?: "notification" | "reminder";
};

export default function DriverReadNotificationsPage() {
  const [items, setItems] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/driver/notifications?tab=viewed&page=1&pageSize=50', { credentials: "include", signal: controller.signal });
        if (!mounted) return;
        if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
        const j = await r.json();
        setItems((j?.items ?? []).map((it: any) => ({ 
          id: String(it.id), 
          title: it.title ?? '', 
          body: it.body ?? '', 
          createdAt: it.createdAt ?? new Date().toISOString(),
          sourceLabel: it.sourceLabel ?? undefined,
          kind: it.kind ?? "notification",
        })));
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.debug('Could not load driver notifications', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; controller.abort(); };
  }, []);

  const formatDate = (value: string) => {
    try {
      return new Intl.DateTimeFormat("en-TZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
    } catch {
      return value;
    }
  };

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
    <div className="min-h-[60vh] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <CheckCircle2 className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Read notifications</h1>
              <p className="mt-1 text-sm text-slate-600">Updates you have already reviewed.</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
            <Bell className="h-4 w-4 text-slate-500" />
            {items.length} archived
          </div>
        </div>

        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-slate-500 shadow-sm">No read notifications.</div>
          ) : (
            items.map((n) => (
              <div key={n.id} className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-500">{n.sourceLabel || (n.kind === "reminder" ? "Admin reminder" : "System notification")}</span>
                    </div>
                    <h4 className="mt-2 text-base font-semibold text-slate-900">{n.title}</h4>
                    <p className="mt-1 text-sm italic leading-6 text-slate-600">{n.body}</p>
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatDate(n.createdAt)}
                  </div>
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

"use client";
import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Bell, Clock3 } from "lucide-react";
import Link from "next/link";
import BackIcon from "@/components/BackIcon";

type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  sourceLabel?: string;
  severity?: "info" | "warning";
  kind?: "notification" | "reminder";
  action?: string | null;
  actionLink?: string | null;
};

export default function DriverUnreadNotificationsPage() {
  const [items, setItems] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/driver/notifications?tab=unread&page=1&pageSize=50', { credentials: "include", signal: controller.signal });
        if (!mounted) return;
        if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
        const j = await r.json();
        setItems((j?.items ?? []).map((it: any) => ({ 
          id: String(it.id), 
          title: it.title ?? '', 
          body: it.body ?? '', 
          createdAt: it.createdAt ?? new Date().toISOString(),
          sourceLabel: it.sourceLabel ?? undefined,
          severity: it.severity ?? "info",
          kind: it.kind ?? "notification",
          action: it.action ?? null,
          actionLink: it.actionLink ?? null,
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
    }
  }

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
              <Bell className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Unread notifications</h1>
              <p className="mt-1 text-sm text-slate-600">Items that still need attention.</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#02665e]/12 via-[#0b7a71]/12 to-[#35a79c]/12 px-3 py-1.5 text-sm font-medium text-[#02665e] ring-1 ring-[#02665e]/12">
            <AlertCircle className="h-4 w-4 text-[#02665e]" />
            {items.length} pending
          </div>
        </div>

        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-slate-500 shadow-sm">No unread notifications.</div>
          ) : (
            items.map((n) => (
              <div key={n.id} className="rounded-[1.25rem] border border-[#02665e]/10 bg-gradient-to-br from-white via-[#f3fbfa] to-[#e7f6f4] p-4 shadow-sm shadow-[#02665e]/10">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-gradient-to-r from-[#02665e] via-[#0b7a71] to-[#35a79c] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white shadow-sm shadow-[#02665e]/20">Needs attention</span>
                      <span className="text-xs font-medium text-slate-500">{n.sourceLabel || (n.kind === "reminder" ? "Admin reminder" : "System notification")}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDate(n.createdAt)}
                      </span>
                    </div>

                    <h4 className="mt-2 text-base font-semibold text-slate-900">{n.title}</h4>
                    <p className="mt-1 text-sm italic leading-6 text-slate-600">{n.body}</p>
                  </div>

                  <div className="flex flex-col gap-2 sm:ml-4 sm:min-w-[10rem]">
                    {n.action && n.actionLink ? (
                      <Link href={n.actionLink} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 no-underline transition hover:bg-slate-50">
                        {n.action}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : null}
                    <button onClick={() => markRead(n.id)} className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#02665e] via-[#0b7a71] to-[#35a79c] px-3 py-2 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(2,102,94,0.22)] transition hover:brightness-105">
                      Mark as read
                    </button>
                    <Link href="/driver/notifications" className="text-center text-sm text-slate-500 no-underline transition hover:text-slate-700">
                      Overview
                    </Link>
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

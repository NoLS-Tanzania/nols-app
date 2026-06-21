"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Check, ChevronRight, Loader2, Trash2, Volume2, VolumeX, X } from "lucide-react";
import apiClient from "@/lib/apiClient";

type NotificationItem = {
  id: number;
  type?: string | null;
  title: string;
  body?: string | null;
  createdAt: string;
  unread: boolean;
  priority?: "normal" | "urgent";
  meta?: Record<string, unknown> | null;
};

type NotificationResponse = { items: NotificationItem[]; totalUnread: number };
const SOUND_KEY = "nolsaf:admin-notification-sound";

function notificationHref(item: NotificationItem) {
  const meta = item.meta ?? {};
  if (meta.propertyId) return `/admin/properties/previews?previewId=${encodeURIComponent(String(meta.propertyId))}`;
  if (meta.invoiceId) return `/admin/revenue/${encodeURIComponent(String(meta.invoiceId))}`;
  if (meta.requestId && String(item.type).toLowerCase().includes("cancel")) return `/admin/cancellations/${encodeURIComponent(String(meta.requestId))}`;
  if (meta.tourBookingId) return "/admin/agents/tour-revenue";
  if (meta.transportBookingId) return "/admin/drivers/invoices";
  if (meta.groupBookingId) return "/admin/group-stays/bookings";
  return "/admin/messages";
}

function tone(item: NotificationItem) {
  const value = `${item.type ?? ""} ${item.title ?? ""}`.toLowerCase();
  if (item.priority === "urgent" || /critical|failed|error|danger/.test(value)) return "danger";
  if (/pending|review|warning|attention|claim/.test(value)) return "attention";
  if (/approved|complete|success|paid|resolved/.test(value)) return "success";
  return "neutral";
}

function relativeTime(value: string) {
  const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminNotificationDrawer() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const unread = useMemo(() => items.filter((item) => item.unread).length, [items]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [unreadResponse, viewedResponse] = await Promise.all([
        apiClient.get<NotificationResponse>("/api/admin/notifications", { params: { tab: "unread", pageSize: 16 } }),
        apiClient.get<NotificationResponse>("/api/admin/notifications", { params: { tab: "viewed", pageSize: 8 } }),
      ]);
      const combined = [...unreadResponse.data.items, ...viewedResponse.data.items]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 20);
      setItems(combined);
      window.dispatchEvent(new CustomEvent("nols:admin-unread-change", { detail: { count: unreadResponse.data.totalUnread } }));
    } catch {
      window.dispatchEvent(new CustomEvent("nols:toast", {
        detail: { type: "error", title: "Notifications unavailable", message: "Please try again in a moment." },
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSoundEnabled(localStorage.getItem(SOUND_KEY) !== "off");
    const show = () => { setOpen(true); void load(); };
    const incoming = (event: Event) => {
      const detail = (event as CustomEvent<Partial<NotificationItem>>).detail;
      if (!detail?.id) return;
      setItems((current) => current.some((item) => item.id === Number(detail.id)) ? current : [{
        id: Number(detail.id), title: detail.title || "New notification", body: detail.body,
        type: detail.type, priority: detail.priority, createdAt: detail.createdAt || new Date().toISOString(), unread: true, meta: detail.meta,
      }, ...current].slice(0, 20));
    };
    window.addEventListener("nols:admin-notifications:open", show);
    window.addEventListener("nols:admin-notification", incoming);
    return () => {
      window.removeEventListener("nols:admin-notifications:open", show);
      window.removeEventListener("nols:admin-notification", incoming);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open]);

  const markRead = async (item: NotificationItem) => {
    if (!item.unread) return;
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, unread: false } : entry));
    window.dispatchEvent(new CustomEvent("nols:admin-unread-change", { detail: { delta: -1 } }));
    try { await apiClient.post(`/api/admin/notifications/${item.id}/mark-read`); }
    catch {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, unread: true } : entry));
      window.dispatchEvent(new CustomEvent("nols:admin-unread-change", { detail: { delta: 1 } }));
    }
  };

  const remove = async (item: NotificationItem) => {
    if (item.unread) return;
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    try { await apiClient.delete(`/api/admin/notifications/${item.id}`); }
    catch { void load(); }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    window.dispatchEvent(new CustomEvent("nols:admin-notification-sound-change", { detail: { enabled: next } }));
  };

  return (
    <div className={`fixed inset-0 z-[90] ${open ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open}>
      <button aria-label="Close notifications" onClick={() => setOpen(false)} className={`absolute inset-0 bg-slate-950/25 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} />
      <section role="dialog" aria-modal="true" aria-labelledby="admin-notification-title" className={`admin-drawer-surface absolute bottom-3 right-3 top-3 flex w-[26rem] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-[110%]"}`}>
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-slate-600" /><h2 id="admin-notification-title" className="font-semibold text-slate-900">Notifications</h2></div>
            <p className="mt-1 text-xs text-slate-500">{unread ? `${unread} unread in recent alerts` : "You are caught up"}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleSound} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label={soundEnabled ? "Mute notification sound" : "Enable notification sound"} title={soundEnabled ? "Sound on" : "Sound off"}>{soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button>
            <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-3">
          {loading && items.length === 0 ? <div className="flex h-40 items-center justify-center text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading alerts</div> : null}
          {!loading && items.length === 0 ? <div className="flex h-48 flex-col items-center justify-center text-center"><Bell className="mb-3 h-7 w-7 text-slate-300" /><p className="font-medium text-slate-700">No recent alerts</p><p className="mt-1 text-sm text-slate-500">New activity will appear here.</p></div> : null}
          <div className="space-y-2">
            {items.map((item) => <article key={item.id} className={`rounded-xl border bg-white p-3 ${item.unread ? "border-slate-300" : "border-slate-200"}`}>
              <div className="flex gap-3">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full border admin-status-${tone(item)}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold text-slate-900">{item.title}</p><span className="whitespace-nowrap text-[11px] text-slate-400">{relativeTime(item.createdAt)}</span></div>
                  {item.body ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{item.body}</p> : null}
                  <div className="mt-2 flex items-center justify-between">
                    <Link href={notificationHref(item)} onClick={() => { void markRead(item); setOpen(false); }} className="inline-flex items-center text-xs font-medium text-[#02665e] hover:underline">Open details <ChevronRight className="h-3.5 w-3.5" /></Link>
                    <div className="flex gap-1">
                      {item.unread ? <button onClick={() => void markRead(item)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" title="Mark as read" aria-label="Mark as read"><Check className="h-4 w-4" /></button> : <button onClick={() => void remove(item)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700" title="Delete viewed notification" aria-label="Delete viewed notification"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  </div>
                </div>
              </div>
            </article>)}
          </div>
        </div>
        <footer className="border-t border-slate-200 bg-white p-3"><Link href="/admin/messages" onClick={() => setOpen(false)} className="flex h-10 items-center justify-center rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">View all notifications</Link></footer>
      </section>
    </div>
  );
}

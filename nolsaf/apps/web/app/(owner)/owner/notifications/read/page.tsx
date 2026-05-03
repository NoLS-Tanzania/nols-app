"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, CheckCheck, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";

function relativeTime(v: string): string {
  try {
    const diff = Date.now() - new Date(v).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return v; }
}

function fullDate(v: string): string {
  try {
    return new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return v; }
}

type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

function ownerApi(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  return base ? `${base.replace(/\/$/, "")}${path}` : path;
}

export default function ReadNotificationsPage() {
  const [items, setItems] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());
  const [clearing, setClearing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<
    | { type: "one"; id: string; title: string }
    | { type: "all"; count: number }
    | null
  >(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(ownerApi("/api/owner/notifications?tab=viewed&page=1&pageSize=50"), {
          credentials: "include",
          signal: controller.signal,
        });
        if (!mounted) return;
        if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
        const j = await r.json();
        setItems((j?.items ?? []).map((it: any) => ({
          id: String(it.id),
          title: it.title ?? "",
          body: it.body ?? "",
          createdAt: it.createdAt ?? new Date().toISOString(),
        })));
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(String(err?.message ?? err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; controller.abort(); };
  }, []);

  const historyText = useMemo(() => {
    if (loading) return "Fetching read notifications...";
    if (items.length === 0) return "No read notifications to manage.";
    return `${items.length} read notification${items.length === 1 ? "" : "s"} saved in history.`;
  }, [items.length, loading]);

  async function deleteOne(id: string) {
    const before = items;
    setDeletingIds((prev) => new Set(prev).add(id));
    setItems((prev) => prev.filter((n) => n.id !== id));

    try {
      const r = await fetch(ownerApi(`/api/owner/notifications/${encodeURIComponent(id)}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) throw new Error(`${r.status}`);
    } catch (err) {
      console.error("delete notification failed", err);
      setItems(before);
      setError("Could not delete that notification. Please try again.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function clearReadHistory() {
    if (items.length === 0 || clearing) return;

    const before = items;
    setClearing(true);
    setItems([]);
    setError(null);

    try {
      const r = await fetch(ownerApi("/api/owner/notifications/read"), {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) throw new Error(`${r.status}`);
    } catch (err) {
      console.error("clear read notifications failed", err);
      setItems(before);
      setError("Could not clear read notifications. Please try again.");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-teal-50 blur-3xl" />
        <div className="pointer-events-none absolute right-8 top-8 h-24 w-24 rounded-full border border-teal-100/70" />

        <div className="relative grid gap-5 px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50 text-[#02665e]">
              <CheckCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#02665e]">Read history</p>
              <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">Read notifications</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{historyText}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/owner/notifications"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 no-underline shadow-sm transition hover:border-slate-300 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            {!loading && items.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmDelete({ type: "all", count: items.length })}
                disabled={clearing}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Clear read
              </button>
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50">
            <Loader2 className="h-5 w-5 animate-spin text-[#02665e]" />
          </div>
          <p className="text-sm font-medium text-slate-400">Loading history...</p>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-100 bg-white px-6 py-10 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50">
            <Bell className="h-5 w-5 text-rose-500" />
          </div>
          <p className="text-sm font-bold text-rose-600">Could not load notifications</p>
          <p className="mt-1 text-xs text-slate-400">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50">
            <CheckCheck className="h-6 w-6 text-slate-300" />
          </div>
          <p className="text-sm font-black text-slate-700">No read notifications</p>
          <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-slate-400">
            Messages you mark as read will appear here until you delete them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {items.map((n) => {
            const deleting = deletingIds.has(n.id);
            return (
              <article
                key={n.id}
                className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg"
              >
                <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-teal-50 blur-2xl" />
                <div className="grid gap-4 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-start sm:p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
                    <CheckCheck className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-black leading-snug text-slate-800">{n.title || "Notification"}</h2>
                      <span className="rounded-full border border-teal-100 bg-teal-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#02665e]">
                        Read
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{n.body}</p>
                    <p className="mt-3 text-xs font-semibold text-slate-400" title={fullDate(n.createdAt)}>
                      {relativeTime(n.createdAt)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setConfirmDelete({ type: "one", id: n.id, title: n.title || "Notification" })}
                    disabled={deleting}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 sm:self-start"
                    aria-label="Delete read notification"
                    title="Delete read notification"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/20">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black text-slate-950">
                  {confirmDelete.type === "all" ? "Clear read notifications?" : "Delete notification?"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {confirmDelete.type === "all"
                    ? `${confirmDelete.count} read notification${confirmDelete.count === 1 ? "" : "s"} will be removed. Unread notifications stay untouched.`
                    : "This read notification will be removed from your history."}
                </p>
                {confirmDelete.type === "one" && (
                  <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 line-clamp-2">
                    {confirmDelete.title}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const next = confirmDelete;
                  setConfirmDelete(null);
                  if (next.type === "all") {
                    await clearReadHistory();
                  } else {
                    await deleteOne(next.id);
                  }
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-rose-600 text-sm font-black text-white shadow-sm transition hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

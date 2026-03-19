"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Bell, Check, ChevronDown, ChevronUp, ExternalLink, User, Calendar, Building2, AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

type Message = {
  id: string;
  title: string;
  body: string;
  time?: string;
  date?: string;
  createdAt?: string;
  unread: boolean;
  meta?: any;
};

export default function Page() {
  const [tab, setTab] = useState<"unread" | "viewed">("unread");
  const [unread, setUnread] = useState<Message[]>([]);
  const [viewed, setViewed] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const formatTime = useCallback((dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
      return date.toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  }, []);

  const fetchTab = useCallback(async (t: "unread" | "viewed") => {
    setLoading(true);
    setFetchError(null);
    const ac = new AbortController();
    const timer = window.setTimeout(() => ac.abort(), 10_000);
    try {
      const q = new URLSearchParams({ tab: t, page: "1", pageSize: "50" });
      const r = await fetch(`/api/admin/notifications?${q.toString()}`, {
        credentials: "include",
        signal: ac.signal,
      });
      if (!r.ok) {
        throw new Error(r.status >= 500 ? `SERVER_${r.status}` : `Fetch failed ${r.status}`);
      }
      const data = await r.json();
      const formatted = (data.items ?? []).map((item: any) => ({
        ...item,
        time: formatTime(item.createdAt ?? item.date),
      }));
      if (t === "unread") setUnread(formatted);
      else setViewed(formatted);
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (err?.name === "AbortError" || msg.toLowerCase().includes("aborted")) {
        setFetchError("The server took too long to respond. It may be starting up — please wait a moment and retry.");
      } else if (msg.startsWith("SERVER_502") || msg.startsWith("SERVER_503")) {
        setFetchError("The server is temporarily unavailable. It may be starting up — please wait a moment and retry.");
      } else if (msg.startsWith("SERVER_")) {
        setFetchError(`Server error (${msg.replace("SERVER_", "")}). Please retry.`);
      } else if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("networkerror")) {
        setFetchError("Network error — check your connection and retry.");
      } else {
        setFetchError("Failed to load notifications. Please try again.");
      }
    } finally {
      window.clearTimeout(timer);
      setLoading(false);
    }
  }, [formatTime]);

  useEffect(() => {
    fetchTab("unread");
    fetchTab("viewed");
  }, [fetchTab]);

  const [openId, setOpenId] = useState<string | null>(null);

  const renderList = (items: Message[]) => {
    if (items.length === 0) {
      return (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white p-10 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-[#02665e]/10 text-[#02665e] mb-3">
            <Bell className="h-6 w-6" aria-hidden />
          </div>
          <div className="text-sm font-bold text-slate-900">No notifications</div>
          <div className="text-sm text-slate-500 mt-1">
            {tab === "unread" ? "All caught up — nothing new." : "No viewed notifications yet."}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((m) => {
          const isOpen = openId === m.id;
          return (
            <div
              key={m.id}
              className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-colors ${
                m.unread ? "border-[#02665e]/25" : "border-slate-200"
              }`}
            >
              {/* Row header */}
              <button
                type="button"
                className="w-full px-4 py-3.5 flex items-start justify-between gap-4 text-left"
                onClick={async () => {
                  const next = isOpen ? null : m.id;
                  setOpenId(next);
                  if (m.unread && next === m.id) {
                    try {
                      await fetch(`/api/admin/notifications/${m.id}/mark-read`, {
                        method: "POST",
                        credentials: "include",
                      });
                      setUnread((u) => u.filter((x) => x.id !== m.id));
                      setViewed((v) => [{ ...m, unread: false }, ...v]);
                    } catch (err) {
                      console.error("mark read failed", err);
                    }
                  }
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {m.unread && (
                      <span className="h-2 w-2 rounded-full bg-[#02665e] flex-shrink-0" aria-hidden />
                    )}
                    <span className="text-sm font-bold text-slate-900 truncate">{m.title}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap text-xs font-semibold text-slate-500">
                    <span>{m.time}</span>
                    {m.unread && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#02665e]/10 text-[#02665e] border border-[#02665e]/15">
                        Unread
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {m.unread && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#02665e]">
                      <Check className="h-4 w-4" aria-hidden />
                      Mark read
                    </span>
                  )}
                  {isOpen
                    ? <ChevronUp className="h-5 w-5 text-slate-400" aria-hidden />
                    : <ChevronDown className="h-5 w-5 text-slate-400" aria-hidden />}
                </div>
              </button>

              {/* Expanded body */}
              {isOpen && (
                <div className="px-4 pb-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{m.body}</p>

                    {m.meta && (
                      <div className="pt-3 border-t border-slate-200 space-y-3">
                        {m.meta.propertyId && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#02665e]/10 flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-4 h-4 text-[#02665e]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-0.5">Property</div>
                              <div className="text-sm font-semibold text-slate-900 mb-1">
                                {m.meta.propertyTitle || `Property #${m.meta.propertyId}`}
                              </div>
                              <Link
                                href={`/admin/properties/previews?previewId=${m.meta.propertyId}`}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#02665e] hover:text-[#014e47] no-underline transition-colors"
                              >
                                View Property <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        )}

                        {(m.meta.ownerId || m.meta.ownerName) && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-0.5">Property Owner</div>
                              <div className="text-sm font-semibold text-slate-900 mb-1">
                                {m.meta.ownerName || `Owner #${m.meta.ownerId}`}
                              </div>
                              {m.meta.ownerId && (
                                <Link
                                  href={`/admin/owners/${m.meta.ownerId}`}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#02665e] hover:text-[#014e47] no-underline transition-colors"
                                >
                                  View Owner <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              )}
                            </div>
                          </div>
                        )}

                        {m.meta.approvedBy && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-0.5">Approved By</div>
                              <div className="text-sm font-semibold text-slate-900">
                                {m.meta.approvedByName || `Admin #${m.meta.approvedBy}`}
                              </div>
                            </div>
                          </div>
                        )}

                        {m.createdAt && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                              <Calendar className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-0.5">Date &amp; Time</div>
                              <div className="text-sm font-semibold text-slate-900">
                                {new Date(m.createdAt).toLocaleString("en-US", {
                                  year: "numeric", month: "long", day: "numeric",
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {m.meta.note && (
                          <div className="pt-3 border-t border-slate-200">
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Note</div>
                            <div className="text-sm text-slate-800 leading-relaxed">{m.meta.note}</div>
                          </div>
                        )}

                        {m.meta.reasons && (
                          <div className="pt-3 border-t border-slate-200">
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1">Reasons</div>
                            <div className="text-sm text-slate-800 leading-relaxed">
                              {Array.isArray(m.meta.reasons) ? m.meta.reasons.join(", ") : m.meta.reasons}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {!m.meta && m.createdAt && (
                      <div className="pt-3 border-t border-slate-200 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-0.5">Date &amp; Time</div>
                          <div className="text-sm font-semibold text-slate-900">
                            {new Date(m.createdAt).toLocaleString("en-US", {
                              year: "numeric", month: "long", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const currentItems = tab === "unread" ? unread : viewed;
  const hasItems = currentItems.length > 0;

  return (
    <div className="w-full py-4 space-y-5">
      {/* Hero card */}
      <div className="relative rounded-3xl border border-slate-200 bg-white/70 backdrop-blur overflow-hidden shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-[#02665e]/8 via-white to-slate-50" aria-hidden />
        <div className="relative px-5 py-7 sm:px-8 sm:py-9">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Notifications</h1>
            <p className="mt-1.5 text-sm sm:text-base text-slate-500">
              System events, approval updates, and admin alerts.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setTab("unread")}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                tab === "unread"
                  ? "border-[#02665e]/30 bg-[#02665e]/10 text-[#02665e]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Unread
              <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-white/80 border border-slate-200 text-xs font-extrabold tabular-nums text-slate-700">
                {unread.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab("viewed")}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                tab === "viewed"
                  ? "border-[#02665e]/30 bg-[#02665e]/10 text-[#02665e]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Viewed
              <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-white/80 border border-slate-200 text-xs font-extrabold tabular-nums text-slate-700">
                {viewed.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* List card */}
      <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white flex items-center justify-between gap-4">
          <span className="text-sm font-bold text-slate-900">
            {tab === "unread" ? "Unread" : "Viewed"}
          </span>
          {loading && <span className="text-xs font-semibold text-slate-400">Loading…</span>}
          {!loading && (
            <button
              type="button"
              onClick={() => { fetchTab("unread"); fetchTab("viewed"); }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          )}
        </div>

        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center py-14">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-[#02665e]" />
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-amber-500" />
              </div>
              <div className="max-w-sm">
                <p className="text-sm font-bold text-slate-900 mb-1">Could not load notifications</p>
                <p className="text-sm text-slate-500 leading-relaxed">{fetchError}</p>
              </div>
              <button
                type="button"
                onClick={() => { fetchTab("unread"); fetchTab("viewed"); }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#02665e] text-white text-sm font-semibold hover:bg-[#014e47] transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          ) : hasItems ? (
            renderList(currentItems)
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white p-10 text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-[#02665e]/10 text-[#02665e] mb-3">
                <Bell className="h-6 w-6" aria-hidden />
              </div>
              <div className="text-sm font-bold text-slate-900">No notifications</div>
              <div className="text-sm text-slate-500 mt-1">
                {tab === "unread" ? "All caught up — nothing new." : "No viewed notifications yet."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Check, ChevronDown, ChevronUp, ExternalLink, Trophy, HeartHandshake, Clock } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";

type DriverNotification = {
  id: string | number;
  title: string;
  body: string;
  createdAt?: string;
  unread: boolean;
  meta?: any;
  time?: string;
};

type NotificationKind = "CLAIM_AWARDED" | "CLAIM_NOT_SELECTED" | "CLAIM_PENDING" | "other";

function resolveKind(m: DriverNotification): NotificationKind {
  const s = m?.meta?.status as string | undefined;
  if (s === "CLAIM_AWARDED") return "CLAIM_AWARDED";
  if (s === "CLAIM_NOT_SELECTED") return "CLAIM_NOT_SELECTED";
  if (s === "CLAIM_PENDING") return "CLAIM_PENDING";
  return "other";
}

function TripDetailPanel({ meta }: { meta: any }) {
  if (!meta) return null;
  const rows: { label: string; value: string }[] = [];
  if (meta.tripDate) rows.push({ label: "Date", value: new Date(meta.tripDate).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) });
  if (meta.from) rows.push({ label: "From", value: meta.from });
  if (meta.to) rows.push({ label: "To", value: meta.to });
  if (meta.vehicleType) rows.push({ label: "Vehicle", value: meta.vehicleType });
  if (meta.amount) rows.push({ label: "Fare", value: `${meta.currency || "TZS"} ${Number(meta.amount).toLocaleString()}` });
  if (meta.pickupLocation) rows.push({ label: "Pickup point", value: meta.pickupLocation });
  if (rows.length === 0) return null;
  return (
    <div className="mt-3 rounded-xl border border-[#02665e]/20 bg-[#02665e]/5 overflow-hidden">
      <table className="w-full text-xs">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-[#02665e]/10 last:border-0">
              <td className="px-3 py-2 font-semibold text-[#02665e]/70 w-28 whitespace-nowrap">{r.label}</td>
              <td className="px-3 py-2 text-slate-800 font-medium">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatTime(dateString?: string) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateString;
  }
}

export default function DriverNotificationsPage() {
  const [tab, setTab] = useState<"unread" | "viewed">("unread");
  const [unread, setUnread] = useState<DriverNotification[]>([]);
  const [viewed, setViewed] = useState<DriverNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | number | null>(null);

  const { socket } = useSocket(undefined, { enabled: true, joinDriverRoom: true });

  const counts = useMemo(() => ({ unread: unread.length, viewed: viewed.length }), [unread.length, viewed.length]);

  const fetchTab = useCallback(async (t: "unread" | "viewed", signal?: AbortSignal) => {
    const q = new URLSearchParams({ tab: t, page: "1", pageSize: "50" });
    const r = await fetch(`/api/driver/notifications?${q.toString()}`, { credentials: "include", signal });
    if (!r.ok) throw new Error(`Fetch failed ${r.status}`);
    const data = await r.json();
    return (data.items ?? []).map((x: any) => ({
      id: x.id,
      title: x.title,
      body: x.body,
      createdAt: x.createdAt,
      unread: !!x.unread,
      meta: x.meta ?? null,
      time: formatTime(x.createdAt),
    })) as DriverNotification[];
  }, []);

  const refresh = useCallback(async (opts?: { showLoading?: boolean }) => {
    if (opts?.showLoading ?? true) setLoading(true);
    try {
      const controller = new AbortController();
      const [u, v] = await Promise.all([fetchTab("unread", controller.signal), fetchTab("viewed", controller.signal)]);
      setUnread(u);
      setViewed(v);
    } catch { /* ignore */ } finally {
      if (opts?.showLoading ?? true) setLoading(false);
    }
  }, [fetchTab]);

  useEffect(() => {
    if (!socket) return;
    const onNew = (payload: any) => {
      if (payload?.type !== "driver") return;
      void refresh({ showLoading: false });
    };
    socket.on("notification:new", onNew);
    return () => { socket.off("notification:new", onNew); };
  }, [socket, refresh]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    (async () => {
      try {
        setLoading(true);
        const [u, v] = await Promise.all([fetchTab("unread", controller.signal), fetchTab("viewed", controller.signal)]);
        if (!mounted) return;
        setUnread(u);
        setViewed(v);
      } catch { /* ignore */ } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; controller.abort(); };
  }, [fetchTab]);

  const list = tab === "unread" ? unread : viewed;

  return (
    <div className="w-full py-4">
      {/* Hero card */}
      <div className="relative rounded-3xl border border-slate-200 bg-white/70 backdrop-blur shadow-card overflow-hidden mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-[#02665e]/10 via-white to-slate-50" aria-hidden />
        <div className="relative p-5 sm:p-7">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Notifications</h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1">Updates from admins and assignment activity.</p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setTab("unread")}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold shadow-card transition-colors ${
                tab === "unread"
                  ? "border-[#02665e]/30 bg-[#02665e]/10 text-[#02665e]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Unread
              <span className="inline-flex items-center justify-center min-w-7 h-6 px-2 rounded-full bg-white/70 border border-slate-200 text-xs font-extrabold tabular-nums">
                {counts.unread}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab("viewed")}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold shadow-card transition-colors ${
                tab === "viewed"
                  ? "border-[#02665e]/30 bg-[#02665e]/10 text-[#02665e]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Read
              <span className="inline-flex items-center justify-center min-w-7 h-6 px-2 rounded-full bg-white/70 border border-slate-200 text-xs font-extrabold tabular-nums">
                {counts.viewed}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* List card */}
      <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur shadow-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white flex items-center justify-between gap-4">
          <div className="text-sm font-bold text-slate-900">{tab === "unread" ? "Unread" : "Read"}</div>
          {loading ? <div className="text-xs font-semibold text-slate-500">Loading…</div> : null}
        </div>

        <div className="p-4 sm:p-5">
          {list.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-[#02665e]/10 text-[#02665e] mb-3">
                <Bell className="h-6 w-6" aria-hidden />
              </div>
              <div className="text-sm font-bold text-slate-900">No notifications</div>
              <div className="text-sm text-slate-600 mt-1">You&apos;re all caught up.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((m) => {
                const isOpen = openId === m.id;
                const actionLink = m?.meta?.link;
                const kind = resolveKind(m);

                const cardBorder =
                  kind === "CLAIM_AWARDED"
                    ? "border-amber-300/60 bg-gradient-to-br from-amber-50 to-white"
                    : kind === "CLAIM_NOT_SELECTED"
                    ? "border-[#02665e]/15 bg-white"
                    : m.unread
                    ? "border-[#02665e]/20 bg-white"
                    : "border-slate-200 bg-white";

                const KindIcon =
                  kind === "CLAIM_AWARDED"
                    ? Trophy
                    : kind === "CLAIM_NOT_SELECTED"
                    ? HeartHandshake
                    : kind === "CLAIM_PENDING"
                    ? Clock
                    : null;

                const iconColour =
                  kind === "CLAIM_AWARDED"
                    ? "text-amber-500"
                    : kind === "CLAIM_NOT_SELECTED"
                    ? "text-[#02665e]"
                    : "text-slate-400";

                return (
                  <div
                    key={String(m.id)}
                    className={`rounded-2xl border shadow-card overflow-hidden transition-colors ${cardBorder}`}
                  >
                    <button
                      type="button"
                      onClick={async () => {
                        const next = isOpen ? null : m.id;
                        setOpenId(next);
                        if (m.unread && next === m.id) {
                          try {
                            await fetch(`/api/driver/notifications/${encodeURIComponent(String(m.id))}/mark-read`, {
                              method: "POST", credentials: "include",
                            });
                            setUnread((u) => u.filter((x) => x.id !== m.id));
                            setViewed((v) => [{ ...m, unread: false }, ...v]);
                          } catch { /* ignore */ }
                        }
                      }}
                      className="w-full px-4 py-3 flex items-start justify-between gap-4 text-left"
                    >
                      <div className="min-w-0 flex-1 flex items-start gap-3">
                        {KindIcon ? (
                          <div className={`mt-0.5 flex-shrink-0 ${iconColour}`}>
                            <KindIcon className="h-4 w-4" aria-hidden />
                          </div>
                        ) : m.unread ? (
                          <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#02665e]" aria-hidden />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className={`text-sm font-bold truncate ${kind === "CLAIM_AWARDED" ? "text-amber-700" : "text-slate-900"}`}>
                            {m.title}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <span>{m.time || ""}</span>
                            {m.unread ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#02665e]/10 text-[#02665e] border border-[#02665e]/15">
                                Unread
                              </span>
                            ) : null}
                            {kind === "CLAIM_AWARDED" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                Awarded
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {m.unread ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#02665e]">
                            <Check className="h-4 w-4" aria-hidden />
                            Mark read
                          </span>
                        ) : null}
                        {isOpen
                          ? <ChevronUp className="h-5 w-5 text-slate-400" aria-hidden />
                          : <ChevronDown className="h-5 w-5 text-slate-400" aria-hidden />}
                      </div>
                    </button>

                    {isOpen ? (
                      <div className="px-4 pb-4">
                        <div className={`rounded-2xl border p-4 ${kind === "CLAIM_AWARDED" ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-slate-50/60"}`}>
                          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{m.body}</div>
                          {kind === "CLAIM_AWARDED" ? <TripDetailPanel meta={m.meta} /> : null}
                          {typeof actionLink === "string" && actionLink.trim() ? (
                            <div className="mt-3">
                              <Link href={actionLink} className="inline-flex items-center gap-2 text-sm font-semibold text-[#02665e] hover:text-[#02665e]/80 no-underline">
                                View trip details
                                <ExternalLink className="h-4 w-4" aria-hidden />
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

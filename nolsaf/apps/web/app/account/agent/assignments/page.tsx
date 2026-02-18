"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { ClipboardList, Calendar, User, ArrowRight, AlertCircle } from "lucide-react";
import LogoSpinner from "@/components/LogoSpinner";

const api = axios.create({ baseURL: "", withCredentials: true });

type Assignment = {
  id: string | number;
  title?: string;
  description?: string | null;
  status?: string;
  createdAt?: string;
  completedAt?: string | null;
  assignedBy?: { name?: string | null } | string | null;
};

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const style =
    s.includes("complete") || s === "done"
      ? "bg-success/5 text-success border-success/20"
      : s.includes("progress")
      ? "bg-info/5 text-info border-info/20"
      : s.includes("cancel")
      ? "bg-danger/5 text-danger border-danger/20"
      : "bg-slate-50 text-slate-700 border-slate-200";

  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${style}`}>{status}</span>;
}

export default function AgentAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const pageTitle = useMemo(() => "My Assignments", []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setAuthRequired(false);

        // Ensure user is authenticated.
        await api.get("/api/account/me");

        const res = await api.get("/api/agent/assignments").catch(() => ({ data: { items: [] } }));
        if (!alive) return;

        const list: any[] = res.data?.items ?? res.data?.data?.items ?? res.data ?? [];
        setItems(Array.isArray(list) ? list : []);
      } catch (e: any) {
        if (!alive) return;
        if (e?.response?.status === 401) {
          setAuthRequired(true);
          setItems([]);
          setError(null);
        } else {
          const msg = e?.response?.data?.error || "Failed to load assignments";
          setError(String(msg));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="w-full py-2 sm:py-4">
      <div className="mb-6 relative rounded-3xl border border-slate-200/70 bg-white/70 text-slate-900 backdrop-blur shadow-card overflow-hidden ring-1 ring-slate-900/5">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-white/80 to-slate-50" aria-hidden />
        <div className="absolute -top-28 -right-24 h-72 w-72 rounded-full bg-brand/15 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-28 h-80 w-80 rounded-full bg-slate-200/40 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/80" aria-hidden />

        <div className="relative p-5 sm:p-7">
          <div className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/60 backdrop-blur px-5 py-4 sm:px-6 sm:py-5 shadow-card ring-1 ring-slate-900/5">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/70 via-transparent to-brand/10" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" aria-hidden />

            <div className="relative">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{pageTitle}</h1>
                <p className="text-sm sm:text-base text-slate-600 mt-1 leading-relaxed">
                  All assignments assigned to you, with status and details.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <LogoSpinner size="lg" className="mb-4" ariaLabel="Loading assignments" />
          <p className="text-sm text-slate-600">Loading assignments...</p>
        </div>
      ) : authRequired ? (
        <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur p-6 shadow-card">
          <div className="text-sm font-bold text-slate-900">Sign in required</div>
          <div className="text-sm text-slate-600 mt-1">Log in to see your assignments.</div>
          <div className="mt-4">
            <Link
              href="/account/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white font-semibold no-underline hover:bg-brand-700 shadow-card transition-colors"
            >
              Sign in
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/70 border border-rose-200 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-rose-600" aria-hidden />
            </div>
            <div>
              <div className="font-bold">Couldn’t load assignments</div>
              <div className="text-sm mt-1 text-rose-800">{error}</div>
              <div className="text-sm mt-3 text-rose-800">
                If this is your first time here, the assignment API may not be connected yet.
              </div>
            </div>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 text-slate-100 backdrop-blur shadow-card ring-1 ring-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-brand/15" aria-hidden />
          <div className="absolute -top-28 -right-24 h-72 w-72 rounded-full bg-brand/20 blur-3xl" aria-hidden />
          <div className="absolute -bottom-32 -left-28 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" aria-hidden />

          <div className="relative px-6 py-10 sm:px-10 sm:py-12 min-h-[220px] sm:min-h-[260px] flex items-center">
            <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_auto] items-start lg:items-center gap-8">
              <div className="flex items-start gap-4 min-w-0">
                <div className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-card ring-1 ring-white/10">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand/25 via-transparent to-transparent" aria-hidden />
                  <ClipboardList className="relative h-7 w-7 text-white/80" aria-hidden />
                </div>

                <div className="min-w-0">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">No assignments yet</h3>
                  <p className="mt-2 text-sm sm:text-base text-white/70 leading-relaxed max-w-2xl">
                    When you receive assignments, they’ll show here with status and details.
                  </p>
                </div>
              </div>

              <div className="lg:pl-8 lg:border-l lg:border-white/10">
                <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 py-4 shadow-card ring-1 ring-white/10">
                  <Link
                    href="/account/agent"
                    className="inline-flex items-center justify-center h-11 px-7 rounded-full bg-brand text-white font-semibold no-underline hover:bg-brand-700 shadow-card transition-colors"
                  >
                    Go to dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((a) => {
            const id = a.id;
            const title = a.title || `Assignment #${id}`;
            const status = a.status || "Pending";
            const createdAt = a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : null;
            const assignedByName =
              typeof a.assignedBy === "string"
                ? a.assignedBy
                : (a.assignedBy as any)?.name || null;

            return (
              <Link
                key={String(id)}
                href={`/account/agent/assignments/${encodeURIComponent(String(id))}`}
                className="no-underline"
              >
                <div className="group rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="p-5 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">{title}</div>
                        <div className="text-xs text-slate-600 mt-1 truncate">#{String(id)}</div>
                      </div>
                      <StatusPill status={status} />
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    {a.description ? (
                      <div className="text-sm text-slate-600 line-clamp-2">{a.description}</div>
                    ) : (
                      <div className="text-sm text-slate-500">No description provided.</div>
                    )}

                    <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
                      <div className="inline-flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" aria-hidden />
                        <span>{createdAt || "—"}</span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" aria-hidden />
                        <span className="truncate max-w-[10rem]">{assignedByName || "—"}</span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
                        View details
                        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

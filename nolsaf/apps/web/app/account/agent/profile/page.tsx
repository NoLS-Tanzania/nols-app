"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { ArrowLeft, Briefcase, Clock, Globe, GraduationCap, Mail, MapPin, Phone, UserRound, ArrowRight } from "lucide-react";
import LogoSpinner from "@/components/LogoSpinner";

const api = axios.create({ baseURL: "", withCredentials: true });

type AccountMe = {
  id: number;
  role?: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  fullName?: string | null;
  nationality?: string | null;
  region?: string | null;
  district?: string | null;
  timezone?: string | null;
};

type AgentMe = {
  ok: boolean;
  agent?: {
    id: number;
    status?: string;
    level?: string | null;
    educationLevel?: string | null;
    areasOfOperation?: any;
    languages?: any;
    yearsOfExperience?: number | null;
    specializations?: any;
    bio?: string | null;
    isAvailable?: boolean | null;
    maxActiveRequests?: number | null;
    currentActiveRequests?: number | null;
    employmentCommencedAt?: string | null;
    employmentType?: string | null;
    employmentTitle?: string | null;
    user?: { id: number; name?: string | null; email?: string | null; phone?: string | null };
  };
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function asStringList(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return [];
}

function InfoItem({
  icon,
  label,
  value,
  accent = "brand",
  tone = "light",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: "brand" | "amber";
  tone?: "light" | "dark";
}) {
  const isDark = tone === "dark";

  const iconWrapClass = isDark
    ? accent === "amber"
      ? "h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-300/20 flex items-center justify-center text-amber-200"
      : "h-10 w-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-200"
    : accent === "amber"
      ? "h-10 w-10 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-600"
      : "h-10 w-10 rounded-2xl bg-brand/5 border border-brand/15 flex items-center justify-center text-brand";

  return (
    <div className="flex items-start gap-3">
      <div className={iconWrapClass}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className={isDark ? "text-xs font-semibold text-white/60" : "text-xs font-semibold text-slate-600"}>{label}</div>
        <div className={isDark ? "text-sm font-bold text-white mt-0.5 break-words" : "text-sm font-bold text-slate-900 mt-0.5 break-words"}>{value}</div>
      </div>
    </div>
  );
}

function PillList({ items, tone = "light" }: { items: string[]; tone?: "light" | "dark" }) {
  const isDark = tone === "dark";
  if (!items.length) return <div className={isDark ? "text-sm text-white/60" : "text-sm text-slate-600"}>—</div>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t, idx) => (
        <span
          key={`${t}-${idx}`}
          className={
            isDark
              ? "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80"
              : "inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800"
          }
        >
          {t}
        </span>
      ))}
    </div>
  );
}

export default function AgentProfilePage() {
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [account, setAccount] = useState<AccountMe | null>(null);
  const [agent, setAgent] = useState<AgentMe["agent"] | null>(null);

  const displayName = useMemo(() => account?.fullName || account?.name || agent?.user?.name || "—", [account, agent]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setAuthRequired(false);

        const [meRes, agentRes] = await Promise.all([
          api.get("/api/account/me"),
          api.get("/api/agent/me").catch(() => ({ data: null })),
        ]);

        if (!alive) return;

        setAccount(meRes.data || null);
        setAgent((agentRes as any)?.data?.agent ?? null);
      } catch (e: any) {
        if (!alive) return;
        if (e?.response?.status === 401) {
          setAuthRequired(true);
          setAccount(null);
          setAgent(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const areas = asStringList(agent?.areasOfOperation);
  const langs = asStringList(agent?.languages);
  const specs = asStringList(agent?.specializations);

  return (
    <div className="w-full py-2 sm:py-4">
      <div className="mb-6 relative rounded-3xl border border-slate-200 bg-white shadow-card overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-br from-brand/10 via-white to-slate-50"
          aria-hidden
        />
        <div className="relative p-5 sm:p-7">
          <div className="relative min-h-10">
            <Link
              href="/account/agent"
              aria-label="Back"
              className="absolute left-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/70 text-slate-700 shadow-card transition-colors hover:bg-slate-50 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Link>

            <div className="flex justify-center px-12">
              <div className="pt-0.5 text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">My Profile</h1>
                <p className="text-sm sm:text-base text-slate-600 mt-1">
                  Personal details, specialization, and employment context.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <LogoSpinner size="lg" className="mb-4" ariaLabel="Loading profile" />
          <p className="text-sm text-slate-600">Loading profile...</p>
        </div>
      ) : authRequired ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="text-sm font-bold text-slate-900">Sign in required</div>
          <div className="text-sm text-slate-600 mt-1">Log in to view your agent profile.</div>
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/60">
              <div>
                <div className="text-sm font-bold text-slate-900">Personal details</div>
                <div className="text-sm text-slate-600 mt-1">Contact and location details.</div>
              </div>
            </div>
            <div className="p-5 sm:p-6 grid grid-cols-2 gap-4">
              <InfoItem icon={<UserRound className="w-5 h-5" aria-hidden />} label="Full name" value={displayName} />
              <InfoItem icon={<Mail className="w-5 h-5" aria-hidden />} label="Email" value={account?.email || agent?.user?.email || "—"} />
              <InfoItem icon={<Phone className="w-5 h-5" aria-hidden />} label="Phone" value={account?.phone || agent?.user?.phone || "—"} />
              <InfoItem icon={<Globe className="w-5 h-5" aria-hidden />} label="Nationality" value={account?.nationality || "—"} />
              <InfoItem icon={<MapPin className="w-5 h-5" aria-hidden />} label="Region" value={account?.region || "—"} />
              <InfoItem icon={<MapPin className="w-5 h-5" aria-hidden />} label="District" value={account?.district || "—"} />
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/60">
              <div className="text-sm font-bold text-slate-900">Employment</div>
              <div className="text-sm text-slate-600 mt-1">Role and employment metadata.</div>
            </div>
            <div className="p-5 sm:p-6 grid grid-cols-2 gap-4">
              <InfoItem icon={<Briefcase className="w-5 h-5" aria-hidden />} label="Employment title" value={agent?.employmentTitle || "—"} />
              <InfoItem icon={<Briefcase className="w-5 h-5" aria-hidden />} label="Employment type" value={agent?.employmentType || "—"} />
              <InfoItem icon={<Briefcase className="w-5 h-5" aria-hidden />} label="Employment commenced" value={formatDate(agent?.employmentCommencedAt)} />
              <InfoItem icon={<Briefcase className="w-5 h-5" aria-hidden />} label="Agent level" value={agent?.level || "—"} />
            </div>
          </div>

          <div className="lg:col-span-6 relative rounded-2xl border border-white/10 bg-slate-950/70 shadow-card overflow-hidden backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/20 via-slate-950/80 to-slate-950" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/10 to-transparent" aria-hidden />

            <div className="relative p-5 sm:p-6 border-b border-white/10 bg-white/5">
              <div className="text-sm font-bold text-white">Specialization</div>
              <div className="text-sm text-white/70 mt-1">Your specialization focus and experience.</div>
            </div>
            <div className="relative p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem tone="dark" accent="amber" icon={<GraduationCap className="w-5 h-5" aria-hidden />} label="Education level" value={agent?.educationLevel || "—"} />
                <InfoItem tone="dark" accent="amber" icon={<Clock className="w-5 h-5" aria-hidden />} label="Years of experience" value={typeof agent?.yearsOfExperience === "number" ? agent.yearsOfExperience : "—"} />
              </div>

              <div>
                <div className="text-xs font-semibold text-white/60">Specializations</div>
                <div className="mt-2">
                  <PillList tone="dark" items={specs} />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-white/60">Bio</div>
                <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                  {agent?.bio ? agent.bio : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 relative rounded-2xl border border-white/10 bg-slate-950/70 shadow-card overflow-hidden backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/15 via-slate-950/85 to-slate-950" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/10 to-transparent" aria-hidden />

            <div className="relative p-5 sm:p-6 border-b border-white/10 bg-white/5">
              <div className="text-sm font-bold text-white">Operations</div>
              <div className="text-sm text-white/70 mt-1">Areas of operation and languages.</div>
            </div>
            <div className="relative p-5 sm:p-6 space-y-5">
              <div>
                <div className="text-xs font-semibold text-white/60">Areas of operation</div>
                <div className="mt-2">
                  <PillList tone="dark" items={areas} />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-white/60">Languages</div>
                <div className="mt-2">
                  <PillList tone="dark" items={langs} />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-12 rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/60">
              <div className="text-sm font-bold text-slate-900">Work capacity</div>
              <div className="text-sm text-slate-600 mt-1">Availability and workload.</div>
            </div>
            <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-semibold text-slate-600">Availability</div>
                <div className="text-sm font-bold text-slate-900 mt-1">{agent?.isAvailable === null || agent?.isAvailable === undefined ? "—" : agent.isAvailable ? "Available" : "Not available"}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-semibold text-slate-600">Max active requests</div>
                <div className="text-sm font-bold text-slate-900 mt-1">{typeof agent?.maxActiveRequests === "number" ? agent.maxActiveRequests : "—"}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-semibold text-slate-600">Current active requests</div>
                <div className="text-sm font-bold text-slate-900 mt-1">{typeof agent?.currentActiveRequests === "number" ? agent.currentActiveRequests : "—"}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

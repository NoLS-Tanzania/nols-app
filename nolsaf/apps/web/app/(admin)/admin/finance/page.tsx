"use client";

// "Mother of all revenue" — a single, READ-ONLY view that rolls up every
// NoLSAF revenue stream (accommodation, tours, transport, group stay,
// subscriptions) into one set of KPIs. It does not collect or mutate anything;
// each stream is still owned by its own page. Source: GET /api/admin/finance/overview.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  HandCoins,
  Hourglass,
  Building2,
  Map as MapIcon,
  Car,
  Users,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import apiClient from "@/lib/apiClient";

type StreamKey = "accommodation" | "tours" | "transport" | "groupStay" | "subscriptions";

type StreamSummary = {
  key: StreamKey;
  label: string;
  gmv: number;
  nolsafRevenue: number;
  partnerNet: number;
  realizedCount: number;
  pendingRevenue: number;
  pendingCount: number;
  note?: string;
};

type Overview = {
  ok: boolean;
  baseCurrency: string;
  range: { from: string | null; to: string | null; allTime: boolean };
  totals: {
    gmv: number;
    nolsafRevenue: number;
    partnerNet: number;
    realizedCount: number;
    pendingRevenue: number;
    pendingCount: number;
  };
  streams: StreamSummary[];
  generatedAt: string;
};

const STREAM_META: Record<StreamKey, { icon: any; tone: string; href: string | null }> = {
  accommodation: { icon: Building2, tone: "text-emerald-300", href: "/admin/revenue" },
  tours: { icon: MapIcon, tone: "text-sky-300", href: "/admin/agents/tour-revenue" },
  transport: { icon: Car, tone: "text-amber-300", href: "/admin/drivers/invoices" },
  groupStay: { icon: Users, tone: "text-violet-300", href: "/admin/group-stays/revenue" },
  subscriptions: { icon: CreditCard, tone: "text-slate-300", href: null },
};

export default function AdminFinancePage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get("/api/admin/finance/overview");
        if (!cancelled) setData(res.data as Overview);
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.error || e?.message || "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fmt = useMemo(() => {
    const cur = data?.baseCurrency || "TZS";
    const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
    return (v: number) => `${cur} ${nf.format(Math.round(v || 0))}`;
  }, [data?.baseCurrency]);

  const loading = data === null && !error;
  const totals = data?.totals;
  const maxRev = useMemo(
    () => Math.max(1, ...(data?.streams || []).map((s) => s.nolsafRevenue)),
    [data?.streams],
  );

  return (
    <div className="relative min-h-screen w-full bg-[#070B1C] text-slate-100 overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Wallet className="h-4 w-4" />
            <span>Finance overview</span>
            {data && (
              <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-slate-300">
                {data.range.allTime ? "All time" : "Filtered range"}
              </span>
            )}
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">
            NoLSAF Revenue across all streams
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            GMV and NoLSAF revenue rolled up across accommodation, tours, transport, group stay and
            subscriptions. Read only. Each stream stays managed on its own page.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            Couldn’t load finance overview: {error}
          </div>
        )}

        {/* Hero KPIs */}
        <div className="grid grid-cols-12 gap-4">
          <HeroCard
            className="col-span-12 sm:col-span-6 xl:col-span-3"
            label="NoLSAF revenue"
            sublabel="Realized platform take"
            icon={TrendingUp}
            tone="bg-[#123c36] border-[#24584f]"
            currency={data?.baseCurrency || "TZS"}
            value={totals ? totals.nolsafRevenue : null}
            loading={loading}
          />
          <HeroCard
            className="col-span-12 sm:col-span-6 xl:col-span-3"
            label="Total GMV"
            sublabel="Gross value transacted"
            icon={Wallet}
            tone="bg-[#17384b] border-[#28536a]"
            currency={data?.baseCurrency || "TZS"}
            value={totals ? totals.gmv : null}
            loading={loading}
          />
          <HeroCard
            className="col-span-12 sm:col-span-6 xl:col-span-3"
            label="Paid to partners"
            sublabel="Owners, operators, drivers"
            icon={HandCoins}
            tone="bg-[#2d3151] border-[#454b70]"
            currency={data?.baseCurrency || "TZS"}
            value={totals ? totals.partnerNet : null}
            loading={loading}
          />
          <HeroCard
            className="col-span-12 sm:col-span-6 xl:col-span-3"
            label="Pending revenue"
            sublabel={totals ? `${totals.pendingCount} in pipeline` : "In pipeline"}
            icon={Hourglass}
            tone="bg-[#3a342e] border-[#554a40]"
            currency={data?.baseCurrency || "TZS"}
            value={totals ? totals.pendingRevenue : null}
            loading={loading}
          />
        </div>

        {/* Per-stream breakdown */}
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-white/10">
            <div className="text-sm font-semibold">Revenue by stream</div>
            <div className="text-xs text-slate-400">NoLSAF take per source (realized)</div>
          </div>

          <div className="p-3 sm:p-4">
            {loading ? (
              <ul className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <li key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />
                ))}
              </ul>
            ) : (
              <ul className="space-y-2">
                {(data?.streams || []).map((s) => {
                  const meta = STREAM_META[s.key];
                  const Icon = meta.icon;
                  const share = totals && totals.nolsafRevenue > 0 ? s.nolsafRevenue / totals.nolsafRevenue : 0;
                  const barPct = Math.round((s.nolsafRevenue / maxRev) * 100);
                  const inner = (
                    <div className="flex items-center gap-4 rounded-2xl px-4 py-3 hover:bg-white/5 transition-colors">
                      <div className={"shrink-0 rounded-xl bg-white/5 border border-white/10 p-2.5 " + meta.tone}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{s.label}</span>
                            {meta.href && <ExternalLink className="h-3.5 w-3.5 text-slate-500" />}
                          </div>
                          <span className="text-sm font-bold tabular-nums text-white">{fmt(s.nolsafRevenue)}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-white/70 to-white/30"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-slate-400">
                          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>GMV {fmt(s.gmv)}</span>
                            <span>{s.realizedCount} transactions</span>
                            {s.pendingRevenue > 0 ? <span>{fmt(s.pendingRevenue)} pending</span> : null}
                          </span>
                          <span className="tabular-nums">{Math.round(share * 100)}% of revenue</span>
                        </div>
                        {s.note && <div className="mt-1 text-[11px] text-slate-500">{s.note}</div>}
                      </div>
                    </div>
                  );
                  return (
                    <li key={s.key}>
                      {meta.href ? (
                        <Link href={meta.href} className="block no-underline">
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {data && (
          <p className="mt-4 text-[11px] text-slate-500">
            Money of record: {data.baseCurrency}. Generated {new Date(data.generatedAt).toLocaleString()}.
          </p>
        )}
      </div>
    </div>
  );
}

const HERO_NF = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

function HeroCard({
  className,
  label,
  sublabel,
  icon: Icon,
  tone,
  currency,
  value,
  loading,
}: {
  className?: string;
  label: string;
  sublabel: string;
  icon: any;
  tone: string;
  currency: string;
  value: number | null;
  loading: boolean;
}) {
  return (
    <div
      className={
        "rounded-3xl border " +
        tone +
        " p-5 " +
        (className ?? "")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-slate-100">{label}</div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
          <Icon className="h-[18px] w-[18px] text-slate-200" />
        </div>
      </div>
      <div className="mt-4 flex min-h-8 items-baseline gap-2 whitespace-nowrap">
        {loading ? (
          <span className="inline-block h-7 w-32 rounded bg-white/10 animate-pulse" />
        ) : (
          <>
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{currency}</span>
            <span className="text-2xl font-extrabold tabular-nums tracking-tight text-white leading-none">
              {value === null ? "0" : HERO_NF.format(Math.round(value))}
            </span>
          </>
        )}
      </div>
      <div className="mt-2 text-xs text-slate-400">{sublabel}</div>
    </div>
  );
}

"use client";

// Group-stay revenue/payout tracking — READ-ONLY, mirroring tour-revenue.
// Source: GET /api/admin/group-stays/revenue/overview.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  HandCoins,
  Hourglass,
  Wallet,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from "lucide-react";
import apiClient from "@/lib/apiClient";

type RevenueStatus =
  | "PENDING"
  | "AWAITING_DEPOSIT"
  | "DEPOSIT_PAID"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELED";

type Record_ = {
  id: number;
  groupType: string;
  headcount: number;
  destination: string;
  customerName: string;
  ownerName: string | null;
  propertyTitle: string | null;
  currency: string;
  gmv: number;
  ownerPayout: number;
  nolsafRevenue: number;
  commissionPercent: number;
  depositAmount: number;
  depositPaid: boolean;
  status: RevenueStatus;
  realized: boolean;
  createdAt: string;
};

type Overview = {
  ok: boolean;
  baseCurrency: string;
  summary: {
    total: number;
    realizedCount: number;
    pendingCount: number;
    canceledCount: number;
    gmv: number;
    nolsafRevenue: number;
    ownerPayout: number;
    pendingRevenue: number;
  };
  records: Record_[];
  generatedAt: string;
};

const STATUS_TONE: Record<RevenueStatus, string> = {
  PENDING: "border-white/10 bg-white/5 text-slate-300",
  AWAITING_DEPOSIT: "border-amber-400/20 bg-amber-500/10 text-amber-100",
  DEPOSIT_PAID: "border-sky-400/20 bg-sky-500/10 text-sky-100",
  CONFIRMED: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  COMPLETED: "border-emerald-400/30 bg-emerald-500/15 text-emerald-50",
  CANCELED: "border-rose-400/20 bg-rose-500/10 text-rose-100",
};

const STATUS_LABEL: Record<RevenueStatus, string> = {
  PENDING: "Pending",
  AWAITING_DEPOSIT: "Awaiting deposit",
  DEPOSIT_PAID: "Deposited",
  // Booking flips to CONFIRMED once the deposit is paid; surface that as "Deposited"
  // (only the deposit is collected by NoLSAF — the balance is paid to the owner at the property).
  CONFIRMED: "Deposited",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
};

export default function GroupStayRevenuePage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get("/api/admin/group-stays/revenue/overview");
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
  const s = data?.summary;

  // ── Sorting + pagination (client-side; API returns up to 1000 rows) ──
  type SortKey = "id" | "ownerName" | "gmv" | "ownerPayout" | "nolsafRevenue" | "status";
  const [sortKey, setSortKey] = useState<SortKey>("nolsafRevenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "ownerName" || key === "status" ? "asc" : "desc");
    }
    setPage(1);
  };

  const sorted = useMemo(() => {
    const rows = [...(data?.records || [])];
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortKey === "ownerName" || sortKey === "status") {
        av = (sortKey === "ownerName" ? a.ownerName : a.status) || "";
        bv = (sortKey === "ownerName" ? b.ownerName : b.status) || "";
        return String(av).localeCompare(String(bv)) * dir;
      }
      av = a[sortKey] as number;
      bv = b[sortKey] as number;
      return (av - bv) * dir;
    });
    return rows;
  }, [data?.records, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="relative min-h-screen w-full bg-[#070B1C] text-slate-100 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(900px circle at 18% 20%, rgba(139,92,246,0.16), transparent 45%), radial-gradient(900px circle at 78% 16%, rgba(59,130,246,0.12), transparent 44%), linear-gradient(to bottom, rgba(2,6,23,0.00), rgba(2,6,23,0.60))",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(to_right,rgba(255,255,255,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:42px_42px]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Users className="h-4 w-4" />
            <span>Group stay</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">Group stay revenue</h1>
          <p className="mt-1 text-sm text-slate-400">
            Owner payout and NoLSAF take per group booking. Read only. Rolled into the{" "}
            <Link href="/admin/finance" className="text-slate-200 underline-offset-2 hover:underline">
              All Revenue
            </Link>{" "}
            view.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            Couldn’t load group stay revenue: {error}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-12 gap-4">
          <SummaryCard className="col-span-12 sm:col-span-6 xl:col-span-3" label="NoLSAF revenue" sublabel="Realized take" icon={TrendingUp} tone="from-emerald-500/20 to-emerald-300/5 border-emerald-400/20" currency={data?.baseCurrency || "TZS"} value={s ? s.nolsafRevenue : null} loading={loading} />
          <SummaryCard className="col-span-12 sm:col-span-6 xl:col-span-3" label="GMV" sublabel="Gross value" icon={Wallet} tone="from-sky-500/20 to-sky-300/5 border-sky-400/20" currency={data?.baseCurrency || "TZS"} value={s ? s.gmv : null} loading={loading} />
          <SummaryCard className="col-span-12 sm:col-span-6 xl:col-span-3" label="Owner payout" sublabel={s ? `${s.realizedCount} realized` : "Owners"} icon={HandCoins} tone="from-violet-500/20 to-violet-300/5 border-violet-400/20" currency={data?.baseCurrency || "TZS"} value={s ? s.ownerPayout : null} loading={loading} />
          <SummaryCard className="col-span-12 sm:col-span-6 xl:col-span-3" label="Pending revenue" sublabel={s ? `${s.pendingCount} in pipeline` : "Pipeline"} icon={Hourglass} tone="from-amber-500/20 to-amber-300/5 border-amber-400/20" currency={data?.baseCurrency || "TZS"} value={s ? s.pendingRevenue : null} loading={loading} />
        </div>

        {/* Records table */}
        <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-white/10">
            <div className="text-sm font-semibold">Bookings</div>
            <div className="text-xs text-slate-400">{data ? `${data.records.length} financial records` : "Loading"}</div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : data && data.records.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-white/10">
                    <SortableTh label="Booking" active={sortKey === "id"} dir={sortDir} onClick={() => toggleSort("id")} />
                    <SortableTh label="Owner" active={sortKey === "ownerName"} dir={sortDir} onClick={() => toggleSort("ownerName")} />
                    <SortableTh label="GMV" align="right" active={sortKey === "gmv"} dir={sortDir} onClick={() => toggleSort("gmv")} />
                    <SortableTh label="Owner payout" align="right" active={sortKey === "ownerPayout"} dir={sortDir} onClick={() => toggleSort("ownerPayout")} />
                    <SortableTh label="NoLSAF take" align="right" active={sortKey === "nolsafRevenue"} dir={sortDir} onClick={() => toggleSort("nolsafRevenue")} />
                    <SortableTh label="Status" active={sortKey === "status"} dir={sortDir} onClick={() => toggleSort("status")} />
                  </tr>
                </thead>
                <tbody>
                  {paged.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/admin/group-stays/bookings?id=${r.id}`} className="font-semibold text-white no-underline hover:underline">
                          #{r.id} · {r.groupType}
                        </Link>
                        <div className="text-[11px] text-slate-400">
                          {r.headcount} pax · {r.destination} · {r.customerName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {r.ownerName || <span className="text-slate-500">Unassigned</span>}
                        {r.propertyTitle && <div className="text-[11px] text-slate-500">{r.propertyTitle}</div>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-200">{fmt(r.gmv)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-300">{fmt(r.ownerPayout)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-200">{fmt(r.nolsafRevenue)}</td>
                      <td className="px-4 py-3">
                        <span className={"inline-flex rounded-lg border px-2 py-0.5 text-[11px] font-semibold " + STATUS_TONE[r.status]}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-4 py-8 text-sm text-slate-400">No group-stay revenue records yet.</div>
            )}
          </div>

          {!loading && sorted.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-xs text-slate-400">
              <span>
                {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <span className="px-2 tabular-nums text-slate-300">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </section>

        {data && (
          <p className="mt-4 text-[11px] text-slate-500">
            NoLSAF take = GMV minus owner payout. Realized at deposit. Generated{" "}
            {new Date(data.generatedAt).toLocaleString()}.
          </p>
        )}
      </div>
    </div>
  );
}

function SortableTh({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <th className={"px-4 py-3 font-medium " + (align === "right" ? "text-right" : "text-left")}>
      <button
        type="button"
        onClick={onClick}
        className={
          "inline-flex items-center gap-1 bg-transparent border-0 p-0 shadow-none appearance-none cursor-pointer uppercase tracking-wide transition-colors hover:text-white " +
          (align === "right" ? "flex-row-reverse " : "") +
          (active ? "text-white" : "text-slate-400")
        }
      >
        <span>{label}</span>
        {active ? (
          dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  );
}

const SUM_NF = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

function SummaryCard({
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
    <div className={"rounded-3xl border bg-gradient-to-b " + tone + " backdrop-blur-xl p-5 shadow-[0_20px_80px_-60px_rgba(0,0,0,0.9)] " + (className ?? "")}>
      <div className="flex items-start justify-between">
        <div className="text-sm font-semibold text-white">{label}</div>
        <Icon className="h-5 w-5 text-white/70 shrink-0" />
      </div>
      <div className="mt-3 h-8 flex items-baseline gap-1.5 whitespace-nowrap">
        {loading ? (
          <span className="inline-block h-7 w-32 rounded bg-white/10 animate-pulse" />
        ) : (
          <>
            <span className="text-xs font-semibold text-slate-300/70">{currency}</span>
            <span className="text-2xl font-extrabold tabular-nums text-white leading-none">
              {value === null ? "0" : SUM_NF.format(Math.round(value))}
            </span>
          </>
        )}
      </div>
      <div className="mt-1.5 text-xs text-slate-300/80">{sublabel}</div>
    </div>
  );
}

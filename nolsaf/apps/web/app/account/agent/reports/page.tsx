"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Clock,
  DollarSign,
  Package,
  Printer,
  TrendingUp,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import DatePickerField from "@/components/DatePickerField";
import LogoSpinner from "@/components/LogoSpinner";
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const api = apiClient;

type RevenueItem = {
  id: string | number;
  title: string;
  tripType: string;
  status: string;
  isCompleted: boolean;
  budget: number;
  commissionPercent: number;
  commissionAmount: number;
  agentEarning: number;
  currency: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  createdAt?: string;
  completedAt?: string | null;
  client: string;
  nationality?: string | null;
};

type MeData = {
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
  address?: string | null;
  region?: string | null;
  district?: string | null;
};

function fmtMoney(n: number) {
  return `TZS ${Math.round(Number(n || 0)).toLocaleString()}`;
}

function toDateOnlyInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseDateSafe(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtDateTime(d: Date) {
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AgentReportsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RevenueItem[]>([]);
  const [me, setMe] = useState<MeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const [from, setFrom] = useState<string>(toDateOnlyInput(monthStart));
  const [to, setTo] = useState<string>(toDateOnlyInput(today));

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [revenuesRes, meRes] = await Promise.all([
          api.get("/api/agent/revenues"),
          api.get("/api/account/me").catch(() => null),
        ]);
        const data = (revenuesRes as any)?.data;
        const meData = (meRes as any)?.data?.data ?? (meRes as any)?.data ?? null;
        if (!mounted) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
        setMe(meData);
      } catch {
        if (!mounted) return;
        setError("Could not load report data.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const fromD = parseDateSafe(from);
    const toD = parseDateSafe(to);
    if (!fromD || !toD) return items;

    const fromStart = new Date(fromD.getFullYear(), fromD.getMonth(), fromD.getDate(), 0, 0, 0, 0).getTime();
    const toEnd = new Date(toD.getFullYear(), toD.getMonth(), toD.getDate(), 23, 59, 59, 999).getTime();

    return items.filter((item) => {
      const d = parseDateSafe(item.completedAt || item.createdAt || item.dateFrom || item.dateTo);
      if (!d) return false;
      const t = d.getTime();
      return t >= fromStart && t <= toEnd;
    });
  }, [items, from, to]);

  const kpis = useMemo(() => {
    const paid = filteredItems.filter((i) => i.isCompleted);
    const pending = filteredItems.filter((i) => !i.isCompleted);

    const paidEarnings = paid.reduce((s, i) => s + Number(i.agentEarning || 0), 0);
    const pendingEarnings = pending.reduce((s, i) => s + Number(i.agentEarning || 0), 0);
    const avgPerTrip = filteredItems.length > 0 ? paidEarnings / filteredItems.length : 0;

    return {
      totalTrips: filteredItems.length,
      paidTrips: paid.length,
      pendingTrips: pending.length,
      paidEarnings,
      pendingEarnings,
      avgPerTrip,
    };
  }, [filteredItems]);

  const trend = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const fromD = parseDateSafe(from) || new Date();
    const toD = parseDateSafe(to) || new Date();

    const start = new Date(fromD.getFullYear(), fromD.getMonth(), 1);
    const end = new Date(toD.getFullYear(), toD.getMonth(), 1);

    const buckets: Array<{ key: string; label: string; paid: number; pending: number }> = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({
        key,
        label: `${monthNames[cursor.getMonth()]} ${cursor.getFullYear()}`,
        paid: 0,
        pending: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    if (buckets.length === 0) {
      const d = new Date();
      buckets.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        paid: 0,
        pending: 0,
      });
    }

    const byKey = new Map(buckets.map((b) => [b.key, b]));

    for (const item of filteredItems) {
      const d = parseDateSafe(item.completedAt || item.createdAt || item.dateFrom || item.dateTo);
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = byKey.get(key);
      if (!bucket) continue;
      if (item.isCompleted) bucket.paid += Number(item.agentEarning || 0);
      else bucket.pending += Number(item.agentEarning || 0);
    }

    const maxY = Math.max(1, ...buckets.map((b) => Math.max(b.paid, b.pending)));

    const pointsFor = (field: "paid" | "pending") =>
      buckets
        .map((b, i) => {
          const x = (i / Math.max(1, buckets.length - 1)) * 100;
          const y = 100 - (b[field] / maxY) * 100;
          return `${x},${Number.isFinite(y) ? y : 100}`;
        })
        .join(" ");

    return {
      buckets,
      paidPoints: pointsFor("paid"),
      pendingPoints: pointsFor("pending"),
    };
  }, [filteredItems, from, to]);

  const rows = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const da = parseDateSafe(a.completedAt || a.createdAt || a.dateFrom || a.dateTo)?.getTime() || 0;
      const db = parseDateSafe(b.completedAt || b.createdAt || b.dateFrom || b.dateTo)?.getTime() || 0;
      return db - da;
    });
  }, [filteredItems]);

  const trendSeries = useMemo(() => {
    const totals = trend.buckets.map((b) => b.paid + b.pending);
    return trend.buckets.map((b, idx) => {
      const start = Math.max(0, idx - 1);
      const end = Math.min(totals.length - 1, idx + 1);
      const window = totals.slice(start, end + 1);
      const moving = window.length ? window.reduce((s, n) => s + n, 0) / window.length : 0;
      return {
        label: b.label,
        revenue: totals[idx],
        trend: Math.round(moving),
      };
    });
  }, [trend.buckets]);

  const statusData = useMemo(() => {
    const base = ["PAID", "REQUESTED", "VERIFIED"];
    const map = new Map<string, number>(base.map((k) => [k, 0]));
    for (const item of filteredItems) {
      const raw = String(item.status || "").trim().toUpperCase();
      const key = raw || (item.isCompleted ? "PAID" : "REQUESTED");
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredItems]);

  const typeData = useMemo(() => {
    const baseTypes = ["SAFARI", "BEACH", "CULTURAL", "MOUNTAIN", "OTHER"];
    const map = new Map<string, number>(baseTypes.map((k) => [k, 0]));
    for (const item of filteredItems) {
      const key = String(item.tripType || "OTHER").trim().toUpperCase() || "OTHER";
      map.set(key, (map.get(key) || 0) + Number(item.agentEarning || 0));
    }
    const total = Array.from(map.values()).reduce((s, n) => s + n, 0);
    const rows = Array.from(map.entries())
      .map(([name, value]) => ({
        name,
        value,
        pct: total > 0 ? Math.round((value / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    return { rows, total };
  }, [filteredItems]);

  const statusColors = ["#02665e", "#f59e0b", "#4f46e5", "#16a34a", "#0ea5e9", "#ef4444"];

  const printReport = () => {
    const generatedAt = new Date();
    const operatorName = String(me?.fullName || me?.name || "Operator");
    const operatorEmail = String(me?.email || "-");
    const operatorAddress = String(
      me?.address || [me?.district, me?.region].filter(Boolean).join(", ") || "Address not provided"
    );
    const reportId = `AGT-${generatedAt.getFullYear()}${String(generatedAt.getMonth() + 1).padStart(2, "0")}${String(generatedAt.getDate()).padStart(2, "0")}-${String(Date.now()).slice(-6)}`;
    const verifyUrl = `${window.location.origin}/account/agent/reports?reportId=${encodeURIComponent(reportId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(verifyUrl)}`;

    const tableRows = rows
      .map((item) => {
        const dateTxt =
          parseDateSafe(item.completedAt || item.createdAt || item.dateFrom || item.dateTo)?.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }) || "-";

        return `
          <tr>
            <td>${escapeHtml(String(item.title || "-"))}</td>
            <td>${escapeHtml(String(item.client || "-") + (item.nationality ? ` • ${String(item.nationality)}` : ""))}</td>
            <td>${escapeHtml(String(item.tripType || "-"))}</td>
            <td>${escapeHtml(item.isCompleted ? "Completed" : "Pending")}</td>
            <td>${escapeHtml(fmtMoney(item.budget))}</td>
            <td>${escapeHtml(`${item.commissionPercent}% (${fmtMoney(item.commissionAmount)})`)}</td>
            <td>${escapeHtml(fmtMoney(item.agentEarning))}</td>
            <td>${escapeHtml(dateTxt)}</td>
          </tr>
        `;
      })
      .join("\n");

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Operator Report ${escapeHtml(reportId)}</title>
  <style>
    :root { --ink:#0b1220; --muted:#5b6472; --line:#e5e7eb; --brand:#02665e; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:var(--ink); background:#fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 20px; }
    .sheet { border: 1px solid var(--line); border-radius: 14px; padding: 14px; }
    .header { display:flex; justify-content:space-between; gap:12px; border-bottom:1px solid var(--line); padding-bottom:10px; }
    .title { font-weight:900; font-size:20px; letter-spacing:-0.02em; }
    .meta { margin-top:3px; font-size:11px; color:var(--muted); line-height:1.4; }
    .badges { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-top:12px; }
    .badge { border:1px solid var(--line); border-radius:10px; padding:8px; }
    .badge .k { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:.06em; }
    .badge .v { margin-top:3px; font-weight:900; font-size:14px; color:var(--brand); }
    .section { margin-top:14px; }
    .section h2 { margin:0 0 8px; font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:#334155; }
    table { width:100%; border-collapse: collapse; border:1px solid var(--line); border-radius:12px; overflow:hidden; }
    th { font-size:10px; text-align:left; color:var(--muted); background:#f8fafc; padding:8px; border-bottom:1px solid var(--line); }
    td { font-size:11px; padding:8px; border-bottom:1px solid #eef2f7; vertical-align:top; }
    tr:last-child td { border-bottom:none; }
    .footer { margin-top:14px; border-top:1px solid var(--line); padding-top:10px; }
    .footer-row { display:grid; grid-template-columns: 1.5fr 0.8fr 1fr; gap:14px; align-items:end; }
    .prepared { font-size:11px; color:#64748b; line-height:1.5; }
    .prepared .id { margin-top:2px; }
    .prepared .copy { margin-top:8px; }
    .qr-wrap { text-align:center; }
    .qr-wrap img { width:120px; height:120px; border:1px solid #dbe3ea; border-radius:8px; background:#fff; }
    .qr-cap { margin-top:6px; font-size:10px; color:var(--muted); line-height:1.35; }
    .sig { text-align:center; }
    .sig .line { border-top:2px solid #1f2937; margin:0 10px 8px; }
    .sig .label { font-size:11px; color:#64748b; }
    .sig .name { margin-top:4px; font-size:14px; font-weight:800; color:#0f172a; }
    .sig .role { margin-top:2px; font-size:11px; color:#94a3b8; }
    .footer-bar { margin-top:12px; height:4px; background:#02665e; border-radius:2px; }
    @media print { @page { size: A4; margin: 10mm; } .page { padding:0; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="sheet">
      <div class="header">
        <div>
          <div class="title">Operator Report</div>
          <div class="meta">Operator: ${escapeHtml(operatorName)}<br/>Email: ${escapeHtml(operatorEmail)}<br/>Physical address: ${escapeHtml(operatorAddress)}</div>
        </div>
        <div class="meta" style="text-align:right">
          Report ID: ${escapeHtml(reportId)}<br/>
          Range: ${escapeHtml(from)} to ${escapeHtml(to)}<br/>
          Generated: ${escapeHtml(fmtDateTime(generatedAt))}
        </div>
      </div>

      <div class="badges">
        <div class="badge"><div class="k">Trips in range</div><div class="v">${escapeHtml(String(kpis.totalTrips))}</div></div>
        <div class="badge"><div class="k">Paid earnings</div><div class="v">${escapeHtml(fmtMoney(kpis.paidEarnings))}</div></div>
        <div class="badge"><div class="k">Pending earnings</div><div class="v">${escapeHtml(fmtMoney(kpis.pendingEarnings))}</div></div>
        <div class="badge"><div class="k">Avg paid per trip</div><div class="v">${escapeHtml(fmtMoney(kpis.avgPerTrip))}</div></div>
      </div>

      <div class="section">
        <h2>Operations Details Preview</h2>
        <table>
          <thead>
            <tr>
              <th>Operation</th>
              <th>Client</th>
              <th>Type</th>
              <th>Status</th>
              <th>Budget</th>
              <th>Commission</th>
              <th>Earning</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="8">No operations found in this range.</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <div class="footer-row">
          <div class="prepared">
            <div>Prepared for operational use and compliance purposes.</div>
            <div class="id">Report ID: ${escapeHtml(reportId)}</div>
            <div class="copy">
              This document is generated automatically by the NoLSAF Operator Platform. All figures reflect data recorded in the system at time of generation.
              This report may be used for management, tax, or compliance filings.
            </div>
          </div>
          <div class="qr-wrap">
            <img src="${escapeHtml(qrUrl)}" alt="Report authenticity QR" />
            <div class="qr-cap">Scan to verify<br/>this report online</div>
          </div>
          <div class="sig">
            <div class="line"></div>
            <div class="label">Authorised Signature</div>
            <div class="name">${escapeHtml(operatorName)}</div>
            <div class="role">Tour Operator</div>
          </div>
        </div>
        <div class="footer-bar"></div>
      </div>
    </div>
  </div>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) {
      window.alert("Unable to open print preview. Please allow popups for this site.");
      return;
    }

    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 300);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LogoSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="relative mx-auto flex max-w-6xl items-center justify-center px-4 py-3">
          <Link
            href="/account/agent"
            className="absolute left-4 inline-flex items-center justify-center rounded-full p-1.5 text-slate-500 no-underline transition hover:bg-slate-100 hover:text-[#02665e]"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <h1 className="text-xl font-extrabold text-slate-900">My Reports</h1>
            <p className="text-sm text-slate-500">Operational reports for your assigned trips</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Report controls</p>
              <p className="text-xs text-slate-400">Filter date range, preview details, and print the report.</p>
            </div>
            <button
              type="button"
              onClick={printReport}
              className="inline-flex items-center gap-2 rounded-lg bg-[#02665e] px-3 py-2 text-sm font-semibold text-white hover:brightness-95"
            >
              <Printer className="h-4 w-4" />
              Print report
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="text-xs font-semibold text-slate-600">
              <div>From</div>
              <div className="mt-1">
                <DatePickerField
                  label="From date"
                  value={from}
                  max={to}
                  onChangeAction={setFrom}
                  widthClassName="w-full"
                />
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-600">
              <div>To</div>
              <div className="mt-1">
                <DatePickerField
                  label="To date"
                  value={to}
                  min={from}
                  onChangeAction={setTo}
                  widthClassName="w-full"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const start = new Date(now);
                start.setDate(start.getDate() - 6);
                setFrom(toDateOnlyInput(start));
                setTo(toDateOnlyInput(now));
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const start = new Date(now);
                start.setDate(start.getDate() - 13);
                setFrom(toDateOnlyInput(start));
                setTo(toDateOnlyInput(now));
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              14 Days
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const start = new Date(now);
                start.setMonth(start.getMonth() - 1);
                setFrom(toDateOnlyInput(start));
                setTo(toDateOnlyInput(now));
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              01 Month
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const start = new Date(now);
                start.setMonth(start.getMonth() - 6);
                setFrom(toDateOnlyInput(start));
                setTo(toDateOnlyInput(now));
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              6 Month
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const start = new Date(now);
                start.setMonth(start.getMonth() - 12);
                setFrom(toDateOnlyInput(start));
                setTo(toDateOnlyInput(now));
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              12 Month
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
              <Package className="h-4 w-4" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">{kpis.totalTrips}</p>
            <p className="text-xs font-semibold text-slate-500">Trips in range</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <DollarSign className="h-4 w-4" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">{fmtMoney(kpis.paidEarnings)}</p>
            <p className="text-xs font-semibold text-slate-500">Paid earnings</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">{fmtMoney(kpis.pendingEarnings)}</p>
            <p className="text-xs font-semibold text-slate-500">Pending earnings</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <TrendingUp className="h-4 w-4" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">{fmtMoney(kpis.avgPerTrip)}</p>
            <p className="text-xs font-semibold text-slate-500">Avg paid per trip</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Visual Summary</h2>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-xl font-extrabold text-slate-900">Revenue trend</h3>
              <div className="mt-2 h-72 rounded-2xl border border-slate-200 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendSeries} margin={{ left: 4, right: 8, top: 6, bottom: 6 }}>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                    <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                    <Tooltip formatter={(value: any) => fmtMoney(Number(value || 0))} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#0f766e" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="trend" name="Trend" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-xl font-extrabold text-slate-900">Invoices by status</h3>
              <div className="mt-2 h-72 rounded-2xl border border-slate-200 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={95} paddingAngle={2}>
                      {statusData.map((entry, idx) => (
                        <Cell key={`${entry.name}-${idx}`} fill={statusColors[idx % statusColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `${value} items`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-xl font-extrabold text-slate-900">Revenue by property type</h3>
              <div className="mt-4 space-y-3">
                {typeData.rows.map((row, idx) => (
                  <div key={row.name} className="space-y-1.5">
                    <div className="h-5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${row.pct === 0 ? 0 : Math.max(3, row.pct)}%`, backgroundColor: statusColors[idx % statusColors.length] }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-700">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: statusColors[idx % statusColors.length] }} />
                        {row.name}
                      </span>
                      <span>{row.pct}%</span>
                      <span className="font-bold text-slate-900">{fmtMoney(row.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Operations details</p>
            <p className="mt-1 text-xs text-slate-400">Same report style, but with your operator-assigned trip data.</p>
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <BarChart3 className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-500">No report rows in this range</p>
              <p className="text-xs text-slate-400">Try extending your date range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 whitespace-nowrap">Operation</th>
                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 whitespace-nowrap">Budget</th>
                    <th className="px-4 py-3 whitespace-nowrap">Commission</th>
                    <th className="px-4 py-3 whitespace-nowrap">Earning</th>
                    <th className="px-4 py-3 whitespace-nowrap">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors align-top">
                      <td className="px-4 py-3 min-w-[240px]">
                        <div className="font-semibold text-slate-900">{item.title}</div>
                        <div className="text-xs text-slate-500">{item.client}{item.nationality ? ` • ${item.nationality}` : ""}</div>
                        <div className="text-[11px] text-slate-400">{item.tripType}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase ${item.isCompleted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {item.isCompleted ? "Completed" : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-800">{fmtMoney(item.budget)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-700">{item.commissionPercent}%</div>
                        <div className="text-xs text-slate-400">{fmtMoney(item.commissionAmount)}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-bold text-[#02665e]">{fmtMoney(item.agentEarning)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        <div className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {parseDateSafe(item.completedAt || item.createdAt || item.dateFrom || item.dateTo)?.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }) || "-"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

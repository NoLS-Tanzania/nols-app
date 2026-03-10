"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Printer, ShieldCheck, Sliders } from "lucide-react";
import { Popover, Transition } from "@headlessui/react";

import Chart from "@/components/Chart";
import DatePickerField from "@/components/DatePickerField";
import { escapeAttr, escapeHtml } from "@/utils/html";

type Series = { labels: string[]; data: number[] };

type InvoiceStatusCounts = Record<string, number>;

type InvoiceRow = {
  id: number;
  invoiceNumber?: string | null;
  receiptNumber?: string | null;
  status?: string | null;
  issuedAt?: string | null;
  total?: number | null;
  netPayable?: number | null;
  booking?: {
    id?: number | null;
    property?: {
      id?: number | null;
      title?: string | null;
    } | null;
  } | null;
};

type DriverRevenueRow = {
  id?: number | null;
  commissionAmount?: number | null;
};

type MeResponse = {
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
};

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseIsoDateOnly(iso: string): Date {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(iso || ""));
  if (!m) return new Date(NaN);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return new Date(NaN);
  return new Date(Date.UTC(y, mo - 1, d));
}

function addDaysUtc(dateUtc: Date, days: number): Date {
  return new Date(dateUtc.getTime() + days * 864e5);
}

const MAX_REPORT_DAYS_INCLUSIVE = 366;

function clampRangeToMax(fromIso: string, toIso: string) {
  const fromD = parseIsoDateOnly(fromIso);
  const toD = parseIsoDateOnly(toIso);
  if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
    return { from: fromIso, to: toIso, clamped: false, maxTo: null as string | null };
  }

  let from = fromD;
  let to = toD;
  if (to.getTime() < from.getTime()) {
    const tmp = from;
    from = to;
    to = tmp;
  }

  const maxToDate = addDaysUtc(from, MAX_REPORT_DAYS_INCLUSIVE - 1);
  const clamped = to.getTime() > maxToDate.getTime();
  if (clamped) to = maxToDate;

  return {
    from: formatDate(from),
    to: formatDate(to),
    clamped,
    maxTo: formatDate(maxToDate),
  };
}

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addMonthsUtc(dateUtc: Date, months: number) {
  const y = dateUtc.getUTCFullYear();
  const m = dateUtc.getUTCMonth();
  const d = dateUtc.getUTCDate();
  const target = new Date(Date.UTC(y, m + months, 1));
  const daysInTargetMonth = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, daysInTargetMonth));
  return target;
}

function firstOfYearUtc(dateUtc = startOfTodayUtc()) {
  return new Date(Date.UTC(dateUtc.getUTCFullYear(), 0, 1));
}

type QuickRangeKey = "today" | "7d" | "30d" | "3m" | "6m" | "ytd" | "12m";

function getQuickRange(key: QuickRangeKey) {
  const end = startOfTodayUtc();
  let start = end;

  if (key === "today") start = end;
  if (key === "7d") start = addDaysUtc(end, -6);
  if (key === "30d") start = addDaysUtc(end, -29);
  if (key === "3m") start = addMonthsUtc(end, -3);
  if (key === "6m") start = addMonthsUtc(end, -6);
  if (key === "12m") start = addMonthsUtc(end, -12);
  if (key === "ytd") start = firstOfYearUtc(end);

  const clamped = clampRangeToMax(formatDate(start), formatDate(end));
  return { from: clamped.from, to: clamped.to };
}

async function safeJson(response: Response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.substring(0, 160)}`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Expected JSON but got ${contentType}: ${text.substring(0, 160)}`);
  }
  return response.json();
}

function fmtDateTime(isoOrDate: string | Date) {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return String(isoOrDate);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sum(nums: unknown[]): number {
  return nums.reduce((acc: number, v) => acc + (Number(v) || 0), 0);
}

function fmtMoneyTZS(n: number) {
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
  } catch {
    return String(Math.round(n));
  }
}

function calcCommissionPct(total: unknown, netPayable: unknown): number | null {
  const t = Number(total);
  const net = Number(netPayable);
  if (!Number.isFinite(t) || t <= 0) return null;
  if (!Number.isFinite(net) || net < 0) return null;
  const comm = t - net;
  if (!Number.isFinite(comm) || comm < 0) return null;
  return (comm / t) * 100;
}

function calcCommissionAmount(total: unknown, netPayable: unknown): number | null {
  const t = Number(total);
  const net = Number(netPayable);
  if (!Number.isFinite(t) || t <= 0) return null;
  if (!Number.isFinite(net) || net < 0) return null;
  const comm = t - net;
  if (!Number.isFinite(comm) || comm < 0) return null;
  return comm;
}

function fmtPct(p: number | null, decimals = 1) {
  if (p === null) return "—";
  const n = Math.max(0, Math.min(100, p));
  const f = decimals <= 0 ? String(Math.round(n)) : n.toFixed(decimals);
  return `${f}%`;
}

export default function AdminReportsPage() {
  const today = new Date();
  const [from, setFrom] = useState(() => formatDate(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(() => formatDate(today));

  const clampInfo = useMemo(() => clampRangeToMax(from, to), [from, to]);

  const applyRange = useCallback((nextFrom: string, nextTo: string) => {
    const clamped = clampRangeToMax(nextFrom, nextTo);
    setFrom(clamped.from);
    setTo(clamped.to);
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [me, setMe] = useState<MeResponse | null>(null);

  const [revenueSeries, setRevenueSeries] = useState<Series>({ labels: [], data: [] });
  const [activePropsSeries, setActivePropsSeries] = useState<Series>({ labels: [], data: [] });
  const [revenueByType, setRevenueByType] = useState<Series>({ labels: [], data: [] });
  const [invoiceStatusCounts, setInvoiceStatusCounts] = useState<InvoiceStatusCounts>({});
  const [invoiceItems, setInvoiceItems] = useState<InvoiceRow[]>([]);

  const [ownerCommissionTotal, setOwnerCommissionTotal] = useState<number | null>(null);
  const [driverCommissionTotal, setDriverCommissionTotal] = useState<number | null>(null);
  const [subscriptionRevenueTotal, setSubscriptionRevenueTotal] = useState<number | null>(null);
  const [totalsLoading, setTotalsLoading] = useState(false);

  const [loading, setLoading] = useState(false);

  const [revCanvas, setRevCanvas] = useState<HTMLCanvasElement | null>(null);
  const [statusCanvas, setStatusCanvas] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/account/me", { credentials: "include" });
        if (!r.ok) return;
        const data = (await safeJson(r)) as MeResponse;
        setMe(data || null);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      setLoading(true);
      try {
        const qs = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&region=${encodeURIComponent("ALL")}`;

        const r1 = await fetch(`/admin/stats/revenue-series${qs}`, { credentials: "include", signal });
        const rev = (await safeJson(r1)) as Series;
        setRevenueSeries(rev || { labels: [], data: [] });

        const r2 = await fetch(`/admin/stats/active-properties-series${qs}`, { credentials: "include", signal });
        const ap = (await safeJson(r2)) as Series;
        setActivePropsSeries(ap || { labels: [], data: [] });

        const r3 = await fetch(`/admin/stats/revenue-by-type${qs}`, { credentials: "include", signal });
        const rbt = (await safeJson(r3)) as Series;
        setRevenueByType(rbt || { labels: [], data: [] });

        const r4 = await fetch(`/admin/stats/invoice-status?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
          credentials: "include",
          signal,
        });
        const invs = (await safeJson(r4)) as InvoiceStatusCounts;
        setInvoiceStatusCounts(invs || {});

        const r5 = await fetch(
          `/api/admin/revenue/invoices?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=1&pageSize=200&sortBy=issuedAt&sortDir=desc`,
          { credentials: "include", signal }
        );
        const invList = (await safeJson(r5)) as any;
        const items = Array.isArray(invList?.items) ? (invList.items as InvoiceRow[]) : [];
        setInvoiceItems(items);

        setTotalsLoading(true);

        const fetchOwnerCommission = async () => {
          let page = 1;
          const pageSize = 500;
          let totalComm = 0;
          let safety = 0;
          while (true) {
            const rr = await fetch(
              `/api/admin/revenue/invoices?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=${page}&pageSize=${pageSize}&sortBy=issuedAt&sortDir=desc`,
              { credentials: "include", signal }
            );
            const data = (await safeJson(rr)) as any;
            const rows = Array.isArray(data?.items) ? (data.items as InvoiceRow[]) : [];
            for (const inv of rows) {
              const comm = calcCommissionAmount(inv?.total, inv?.netPayable);
              if (comm !== null) totalComm += comm;
            }

            const reportedTotal = Number(data?.total ?? 0);
            const hasMoreByCount = Number.isFinite(reportedTotal) && reportedTotal > 0 ? page * pageSize < reportedTotal : rows.length === pageSize;
            if (!hasMoreByCount) break;

            page += 1;
            safety += 1;
            if (safety > 40) break;
          }
          return totalComm;
        };

        const fetchDriverCommission = async () => {
          let page = 1;
          const pageSize = 200;
          let totalComm = 0;
          let safety = 0;
          while (true) {
            const rr = await fetch(
              `/api/admin/drivers/revenues?start=${encodeURIComponent(from)}&end=${encodeURIComponent(to)}&page=${page}&pageSize=${pageSize}`,
              { credentials: "include", signal }
            );
            const data = (await safeJson(rr)) as any;
            const rows = Array.isArray(data?.items) ? (data.items as DriverRevenueRow[]) : [];
            for (const row of rows) {
              totalComm += Number(row?.commissionAmount) || 0;
            }

            const reportedTotal = Number(data?.total ?? 0);
            const hasMoreByCount = Number.isFinite(reportedTotal) && reportedTotal > 0 ? page * pageSize < reportedTotal : rows.length === pageSize;
            if (!hasMoreByCount) break;

            page += 1;
            safety += 1;
            if (safety > 40) break;
          }
          return totalComm;
        };

        const [ownerComm, driverComm] = await Promise.all([
          fetchOwnerCommission().catch(() => null),
          fetchDriverCommission().catch(() => null),
        ]);

        setOwnerCommissionTotal(ownerComm);
        setDriverCommissionTotal(driverComm);
        setSubscriptionRevenueTotal(null);
      } catch (err: any) {
        if (String(err?.name) === "AbortError") return;
        console.error("Failed to load admin reports", err);
        setRevenueSeries({ labels: [], data: [] });
        setActivePropsSeries({ labels: [], data: [] });
        setRevenueByType({ labels: [], data: [] });
        setInvoiceStatusCounts({});
        setInvoiceItems([]);
        setOwnerCommissionTotal(null);
        setDriverCommissionTotal(null);
        setSubscriptionRevenueTotal(null);
      } finally {
        setLoading(false);
        setTotalsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [from, to]);

  const printedByName = (me?.fullName || me?.name || "Admin").toString();
  const printedByEmail = (me?.email || "").toString();

  const totalRevenue = useMemo(() => sum(revenueSeries.data || []), [revenueSeries.data]);
  const totalActive = useMemo(() => {
    const arr = activePropsSeries.data || [];
    return arr.length ? Number(arr[arr.length - 1]) || 0 : 0;
  }, [activePropsSeries.data]);

  const invoicesTotal = useMemo(() => sum(Object.values(invoiceStatusCounts || {})), [invoiceStatusCounts]);

  const totalNolsafRevenue = useMemo(() => {
    const owner = ownerCommissionTotal ?? 0;
    const driver = driverCommissionTotal ?? 0;
    const subs = subscriptionRevenueTotal ?? 0;
    if (ownerCommissionTotal === null && driverCommissionTotal === null && subscriptionRevenueTotal === null) return null;
    return owner + driver + subs;
  }, [driverCommissionTotal, ownerCommissionTotal, subscriptionRevenueTotal]);

  const chartPalette = useMemo(() => ["#02665e", "#f59e0b", "#4f46e5"] as const, []);

  const revenueChartData = useMemo(() => {
    const labels = (revenueSeries.labels || []).map((x) => String(x ?? ""));
    const revenue = (revenueSeries.data || []).map((x) => Number(x) || 0);

    const windowSize = 7;
    const avg = revenue.map((_, idx) => {
      const start = Math.max(0, idx - (windowSize - 1));
      const slice = revenue.slice(start, idx + 1);
      const total = slice.reduce((acc, v) => acc + (Number(v) || 0), 0);
      return slice.length ? total / slice.length : 0;
    });

    let fill: any = "rgba(2,102,94,0.18)";
    try {
      const ctx = revCanvas?.getContext?.("2d") ?? null;
      if (ctx && revCanvas) {
        const h = Math.max(1, Number(revCanvas.height) || 220);
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, "rgba(2,102,94,0.28)");
        g.addColorStop(1, "rgba(2,102,94,0.00)");
        fill = g;
      }
    } catch {
      // ignore
    }

    return {
      labels,
      datasets: [
        {
          label: "Revenue",
          data: revenue,
          backgroundColor: fill,
          borderColor: "#02665e",
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 0,
        },
        {
          label: "Trend",
          data: avg,
          backgroundColor: "transparent",
          borderColor: "#f59e0b",
          borderWidth: 2,
          tension: 0.35,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
        },
      ],
    };
  }, [revCanvas, revenueSeries]);

  const invoiceStatusChartData = useMemo(() => {
    const entries = Object.entries(invoiceStatusCounts || {})
      .filter(([, v]) => Number(v) > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));

    const labels = entries.map(([k]) => k);
    const data = entries.map(([, v]) => Number(v) || 0);
    const colors = labels.map((_, idx) => chartPalette[idx % chartPalette.length]);

    return {
      labels,
      datasets: [
        {
          label: "Invoice status",
          data,
          backgroundColor: colors,
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    };
  }, [invoiceStatusCounts, chartPalette]);

  const revenueByTypeBreakdown = useMemo(() => {
    const labels = Array.isArray(revenueByType?.labels) ? revenueByType.labels : [];
    const data = Array.isArray(revenueByType?.data) ? revenueByType.data : [];

    const items = labels
      .map((label, idx) => ({
        label: String(label ?? "").trim() || "Other",
        value: Number(data[idx]) || 0,
      }))
      .filter((x) => x.value > 0);

    items.sort((a, b) => b.value - a.value);

    const palette = [
      { key: /hotel/i, color: "#02665e", soft: "rgba(2,102,94,0.20)" },
      { key: /lodge/i, color: "#0f172a", soft: "rgba(15,23,42,0.18)" },
      { key: /apartment/i, color: "#4f46e5", soft: "rgba(79,70,229,0.20)" },
      { key: /villa/i, color: "#f59e0b", soft: "rgba(245,158,11,0.24)" },
    ];

    const fallback = ["#02665e", "#0f172a", "#4f46e5", "#f59e0b"];

    function colorFor(label: string, idx: number) {
      const hit = palette.find((p) => p.key.test(label));
      if (hit) return { color: hit.color, soft: hit.soft };
      const c = fallback[idx % fallback.length];
      if (c === "#0f172a") return { color: c, soft: "rgba(15,23,42,0.18)" };
      if (c === "#4f46e5") return { color: c, soft: "rgba(79,70,229,0.20)" };
      if (c === "#f59e0b") return { color: c, soft: "rgba(245,158,11,0.24)" };
      return { color: c, soft: "rgba(2,102,94,0.20)" };
    }

    const total = items.reduce((acc, it) => acc + (Number(it.value) || 0), 0);
    const withColors = items.map((it, idx) => ({
      ...it,
      ...colorFor(it.label, idx),
      pct: total > 0 ? (it.value / total) * 100 : 0,
    }));

    return { items: withColors, total };
  }, [revenueByType]);

  async function printReport(mode: "full" | "revenueOnly" = "full") {
    const now = new Date();
    const reportId = now.toISOString();
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const reportFilename = `NOLSAF-RPT-${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}_${from}_${to}`;

    let qrDataUrl: string | null = null;
    try {
      const QR: any = await import("qrcode");
      const toDataURL: any = QR?.toDataURL ?? QR?.default?.toDataURL;
      if (typeof toDataURL !== "function") throw new Error("qrcode.toDataURL not available");

      const verifyUrl = new URL("/admin/management/reports/revenue", window.location.origin);
      verifyUrl.searchParams.set("from", from);
      verifyUrl.searchParams.set("to", to);
      verifyUrl.searchParams.set("reportId", reportId);

      qrDataUrl = await toDataURL(verifyUrl.toString(), {
        margin: 1,
        width: 180,
        errorCorrectionLevel: "M",
      });
    } catch {
      qrDataUrl = null;
    }

    const logoUrl = new URL("/assets/NoLS2025-04.png", window.location.origin).toString();

    const revImg = revCanvas ? revCanvas.toDataURL("image/png") : null;
    const statusImg = statusCanvas ? statusCanvas.toDataURL("image/png") : null;
    const typeItems = revenueByTypeBreakdown.items || [];
    const typeTotal = revenueByTypeBreakdown.total || 0;

    const typeSegs = typeItems
      .map((it) => {
        const pct = Math.max(0, Math.min(100, it.pct || 0));
        return `<span class="typeSeg" style="width:${pct}%; background:${escapeAttr(it.color)}"></span>`;
      })
      .join("");

    const typeLegend = typeItems
      .slice(0, 10)
      .map((it) => {
        const pctText = typeTotal > 0 ? `${Math.round(it.pct)}%` : "0%";
        return `<div class="typeItem"><span class="dot" style="background:${escapeAttr(it.color)}"></span><div class="name">${escapeHtml(it.label)}</div><div class="pct">${escapeHtml(pctText)}</div><div class="val">TZS ${escapeHtml(fmtMoneyTZS(Number(it.value) || 0))}</div></div>`;
      })
      .join("");

    const invRows = Object.entries(invoiceStatusCounts || {})
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => {
        return `<tr><td>${escapeHtml(k)}</td><td style="text-align:right; font-weight:700;">${escapeHtml(String(v ?? 0))}</td></tr>`;
      })
      .join("\n");

    const ownerCommText = ownerCommissionTotal === null ? "—" : `TZS ${fmtMoneyTZS(Math.round(ownerCommissionTotal))}`;
    const driverCommText = driverCommissionTotal === null ? "—" : `TZS ${fmtMoneyTZS(Math.round(driverCommissionTotal))}`;
    const subsText = subscriptionRevenueTotal === null ? "Planned" : `TZS ${fmtMoneyTZS(Math.round(subscriptionRevenueTotal))}`;
    const totalText = totalNolsafRevenue === null ? "—" : `TZS ${fmtMoneyTZS(Math.round(totalNolsafRevenue))}`;

    const revenueSourcesSection = `
    <div class="section">
      <h2>NoLSAF Revenue Sources</h2>
      <table>
        <thead><tr><th>Source</th><th style="text-align:right;">NoLSAF revenue</th></tr></thead>
        <tbody>
          <tr><td>Owner commission (bookings)</td><td style="text-align:right; font-weight:900; color: var(--brand)">${escapeHtml(ownerCommText)}</td></tr>
          <tr><td>Driver commission (trips)</td><td style="text-align:right; font-weight:900; color: var(--brand)">${escapeHtml(driverCommText)}</td></tr>
          <tr><td>Subscriptions (annual)</td><td style="text-align:right; font-weight:700; color: var(--muted)">${escapeHtml(subsText)}</td></tr>
          <tr><td style="font-weight:900;">Total</td><td style="text-align:right; font-weight:900;">${escapeHtml(totalText)}</td></tr>
        </tbody>
      </table>
      <div style="margin-top:6px; font-size:10px; color: var(--muted)">Subscriptions are planned; totals update once subscription billing is enforced.</div>
    </div>`;

    const detailRows = (invoiceItems || [])
      .slice(0, 60)
      .map((inv) => {
        const propTitle = inv?.booking?.property?.title || "—";
        const issued = inv?.issuedAt ? fmtDateTime(inv.issuedAt) : "—";
        const total = `TZS ${fmtMoneyTZS(Number(inv?.total || 0))}`;
        const net = `TZS ${fmtMoneyTZS(Number(inv?.netPayable || 0))}`;
        const commPct = fmtPct(calcCommissionPct(inv?.total, inv?.netPayable), 1);
        const commAmtRaw = calcCommissionAmount(inv?.total, inv?.netPayable);
        const commAmt = commAmtRaw === null ? "—" : `TZS ${fmtMoneyTZS(commAmtRaw)}`;
        const invNo = inv?.invoiceNumber || `#${inv?.id}`;
        const status = inv?.status || "—";

        return `\n<tr>\n  <td>${escapeHtml(String(invNo))}</td>\n  <td>${escapeHtml(String(status))}</td>\n  <td>${escapeHtml(String(issued))}</td>\n  <td>${escapeHtml(String(propTitle))}</td>\n  <td style=\"text-align:right;\">${escapeHtml(String(total))}</td>\n  <td style=\"text-align:right;\">${escapeHtml(String(net))}</td>\n  <td style=\"text-align:right; color: var(--brand); font-weight:400;\">${escapeHtml(String(commAmt))}</td>\n  <td style=\"text-align:right; font-weight:400;\">${escapeHtml(String(commPct))}</td>\n</tr>`;
      })
      .join("\n");

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(reportFilename)}</title>
  <style>
    :root { --ink:#0b1220; --muted:#5b6472; --line:#e5e7eb; --brand:#02665e; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:var(--ink); background:#fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 22px; }
    .sheet { border: 1px solid var(--line); border-radius: 16px; padding: 14px; }

    .company { display:flex; align-items:center; justify-content:space-between; gap:14px; border:1px solid var(--line); border-radius: 14px; padding: 12px 14px; }
    .company-left { display:flex; align-items:center; gap:12px; min-width:0; }
    .logo { width: 46px; height: 46px; object-fit: contain; }
    .co-name { font-weight: 900; letter-spacing: -0.02em; }
    .co-meta { margin-top: 2px; font-size: 11px; color: var(--muted); line-height: 1.35; }
    .co-meta span { white-space: nowrap; }

    .title { margin-top: 12px; display:flex; justify-content:space-between; align-items:flex-end; gap: 12px; }
    h1 { margin:0; font-size: 18px; letter-spacing: -0.02em; }
    .sub { margin-top: 4px; color: var(--muted); font-size: 11px; }

    .meta { margin-top: 12px; display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .card { border:1px solid var(--line); border-radius: 14px; padding: 10px 12px; }
    .kv { display:grid; grid-template-columns: 120px 1fr; gap: 6px 10px; font-size: 11px; }
    .k { color: var(--muted); }
    .v { font-weight: 700; }

    .kpis { margin-top: 10px; display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .kpi { border:1px solid var(--line); border-radius: 14px; padding: 10px 12px; }
    .kpi .t { color: var(--muted); font-size: 10px; }
    .kpi .n { margin-top: 2px; font-size: 15px; font-weight: 900; }

    .section { margin-top: 14px; }
    .section h2 { margin: 0 0 8px; font-size: 12px; letter-spacing: -0.01em; }

    .charts { display:grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .chartTitle { margin: 0 0 6px; font-size: 11px; font-weight: 900; letter-spacing: -0.01em; }

    .chart { border:1px solid var(--line); border-radius: 14px; padding: 10px 12px; }
    .chart img { width: 100%; height: auto; display:block; border-radius: 10px; border: 1px solid rgba(229,231,235,0.8); }

    .typeLine { margin-top: 2px; height: 14px; border-radius: 999px; background: #f8fafc; border: 1px solid rgba(229,231,235,0.9); overflow:hidden; display:flex; }
    .typeSeg { height: 100%; display:block; }
    .typeLegend { margin-top: 10px; display:grid; grid-template-columns: 1fr; gap: 6px; }
    .typeItem { display:grid; grid-template-columns: 14px 1fr auto auto; gap: 8px; align-items:center; font-size: 10px; }
    .typeItem .dot { width: 10px; height: 10px; border-radius: 3px; display:inline-block; }
    .typeItem .name { color: var(--ink); font-weight: 700; min-width: 0; overflow:hidden; text-overflow: ellipsis; white-space: nowrap; }
    .typeItem .pct { color: var(--muted); font-weight: 700; }
    .typeItem .val { color: var(--ink); font-weight: 900; text-align:right; white-space: nowrap; }

    table { width:100%; border-collapse: collapse; border:1px solid var(--line); border-radius: 14px; overflow:hidden; }
    thead th { font-size: 10px; text-align:left; color: var(--muted); background:#f8fafc; padding: 9px 10px; border-bottom:1px solid var(--line); }
    tbody td { font-size: 11px; padding: 8px 10px; border-bottom: 1px solid rgba(229,231,235,0.8); }
    tbody tr:last-child td { border-bottom: none; }

    .details td, .details th { font-size: 10px; padding: 7px 8px; }
    .details td:nth-child(4) { max-width: 240px; }
    .details td:nth-child(1), .details td:nth-child(4) { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .footer { margin-top: 14px; display:flex; justify-content:space-between; gap: 12px; align-items:flex-end; }
    .sealWrap { display:flex; gap: 12px; align-items:flex-end; }
    .seal { width: 170px; height: 90px; border: 1px dashed rgba(17,24,39,0.45); border-radius: 12px; display:flex; align-items:center; justify-content:center; color: var(--muted); font-size: 11px; }
    .sig { width: 220px; border-top: 1px solid #111827; padding-top: 6px; font-size: 11px; color: var(--muted); text-align:center; }

    .qr { display:flex; gap: 10px; align-items:center; }
    .qr img { width: 92px; height: 92px; border-radius: 10px; border: 1px solid var(--line); background: #fff; }
    .qrTitle { font-weight: 900; color: var(--ink); font-size: 11px; }
    .qrNote { margin-top: 2px; color: var(--muted); font-size: 10px; max-width: 260px; line-height: 1.25; }

    @media print {
      @page { size: A4; margin: 12mm; }
      .page { padding: 0; }
      .sheet { border-radius: 14px; padding: 12px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="sheet">
    <div class="company">
      <div class="company-left">
        <img class="logo" src="${escapeAttr(logoUrl)}" alt="NoLSAF" />
        <div style="min-width:0">
          <div class="co-name">NoLS Africa Inc</div>
          <div class="co-meta">
            <div><span>P.O BOX 23091</span> | <span>Dar es Salaam-Tanzania</span></div>
            <div><span>finance@nolsaf.com</span> | <span>+255736766726</span></div>
          </div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:var(--muted)">Report ID</div>
        <div style="font-weight:900;font-size:11px">${escapeHtml(reportId)}</div>
      </div>
    </div>

    <div class="title">
      <div>
        <h1>NoLSAF Finance & Operations Report</h1>
        <div class="sub">Range: ${escapeHtml(from)} → ${escapeHtml(to)} • Generated: ${escapeHtml(fmtDateTime(reportId))}</div>
      </div>
      <div style="text-align:right; font-size:11px; color: var(--muted)">
        <div><strong style="color:var(--ink)">${escapeHtml(printedByName)}</strong></div>
        <div>${escapeHtml(printedByEmail)}</div>
      </div>
    </div>

    <div class="meta">
      <div class="card">
        <div class="kv">
          <div class="k">Printed by</div><div class="v">${escapeHtml(printedByName)}</div>
          <div class="k">Printed at</div><div class="v">${escapeHtml(fmtDateTime(new Date()))}</div>
          <div class="k">Scope</div><div class="v">All regions</div>
        </div>
      </div>
      <div class="card">
        <div class="kv">
          <div class="k">Range from</div><div class="v">${escapeHtml(from)}</div>
          <div class="k">Range to</div><div class="v">${escapeHtml(to)}</div>
          <div class="k">Invoices (total)</div><div class="v">${escapeHtml(String(invoicesTotal))}</div>
        </div>
      </div>
    </div>

    <div class="kpis">
      <div class="kpi"><div class="t">Revenue (TZS)</div><div class="n">${escapeHtml(fmtMoneyTZS(totalRevenue))}</div></div>
      <div class="kpi"><div class="t">Active properties (latest)</div><div class="n">${escapeHtml(String(totalActive))}</div></div>
      <div class="kpi"><div class="t">Invoices (all statuses)</div><div class="n">${escapeHtml(String(invoicesTotal))}</div></div>
    </div>

    ${revenueSourcesSection}

    <div class="section">
      <h2>Visual Summary</h2>
      <div class="charts">
        <div class="chart">
          <div class="chartTitle">Revenue trend</div>
          ${revImg ? `<img src="${escapeAttr(revImg)}" alt="Revenue chart" />` : `<div style="color:var(--muted);font-size:11px;">(chart not available)</div>`}
        </div>
        <div class="chart">
          <div class="chartTitle">Invoices by status</div>
          ${statusImg ? `<img src="${escapeAttr(statusImg)}" alt="Invoice status chart" />` : `<div style="color:var(--muted);font-size:11px;">(chart not available)</div>`}
        </div>
        <div class="chart">
          <div class="chartTitle">Revenue by property type</div>
          <div class="typeLine">${typeSegs || ""}</div>
          <div class="typeLegend">
            ${typeLegend || `<div style="color:var(--muted);font-size:11px;">No revenue-by-type data in this range.</div>`}
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Invoice Status Summary</h2>
      <table>
        <thead><tr><th>Status</th><th style="text-align:right;">Count</th></tr></thead>
        <tbody>
          ${invRows || `<tr><td colspan="2" style="color:var(--muted)">No invoice data in this range.</td></tr>`}
        </tbody>
      </table>
    </div>

    ${
      mode === "revenueOnly"
        ? ""
        : `
    <div class="section">
      <h2>Invoices (details)</h2>
      <table class="details">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Status</th>
            <th>Issued</th>
            <th>Property</th>
            <th style="text-align:right;">Total</th>
            <th style="text-align:right;">Net</th>
            <th style="text-align:right; color: var(--brand); font-weight: 400;">NoLSAF (TZS)</th>
            <th style="text-align:right;">NoLSAF %</th>
          </tr>
        </thead>
        <tbody>
          ${detailRows || `<tr><td colspan="8" style="color:var(--muted)">No invoice rows found in this range.</td></tr>`}
        </tbody>
      </table>
      <div style="margin-top:6px; font-size:10px; color: var(--muted)">Showing up to 60 rows (condensed for printing).</div>
    </div>`
    }

    <div class="footer">
      <div style="font-size:11px;color:var(--muted)">
        <div><strong style="color:var(--ink)">Audit</strong> • NoLSAF Inc</div>
        <div>Prepared for internal finance operations and compliance.</div>
        ${qrDataUrl ? `
        <div class="qr" style="margin-top:10px;">
          <img src="${escapeAttr(qrDataUrl)}" alt="Verify report QR" />
          <div>
            <div class="qrTitle">Verify this report</div>
            <div class="qrNote">Scan to open the official admin report link (login required).</div>
          </div>
        </div>` : ""}
      </div>
      <div class="sealWrap">
        <div class="seal">Company Seal</div>
        <div>
          <div class="sig">Signature</div>
        </div>
      </div>
    </div>
    </div>
  </div>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) {
      alert("Unable to open print window — please allow popups");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 450);
  }

  return (
    <div className="bg-[#f4f5f6] min-h-screen">
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-4 min-w-0">
      {/* Main dark card */}
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(170deg,#0c1a2e_0%,#0a2236_52%,#0b1d2d_100%)] shadow-[0_32px_80px_-24px_rgba(5,12,26,0.55)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 px-6 pt-6 sm:px-8 sm:pt-7">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#02665e]/30 bg-[#02665e]/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Operational Export
            </div>
            <h2 className="mt-3 text-xl font-black tracking-tight text-white sm:text-2xl">
              NoLSAF Finance &amp; Operations Report
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Select a date range, review the summary and details, then print a signed report with QR verification.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => printReport("full")}
              className="inline-flex items-center justify-center h-10 px-4 rounded-[14px] bg-[#02665e] text-white text-sm font-bold shadow-[0_4px_20px_-6px_rgba(2,102,94,0.50)] hover:brightness-110 transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/50"
            >
              <Printer className="h-4 w-4 mr-2" aria-hidden />
              Print
            </button>

            <button
              type="button"
              onClick={() => printReport("revenueOnly")}
              className="inline-flex items-center justify-center h-10 px-4 rounded-[14px] border border-[#02665e]/30 bg-[#02665e]/10 text-emerald-300 text-sm font-bold hover:bg-[#02665e]/20 transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/40"
              title="Print only NoLSAF revenue sources"
            >
              <Printer className="h-4 w-4 mr-2" aria-hidden />
              Print revenue
            </button>
          </div>
        </div>

        {clampInfo.clamped ? (
          <div className="mx-6 mt-4 sm:mx-8 rounded-[14px] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <div className="font-bold">Range limited</div>
              <div className="text-amber-300/80 break-words">Max range is {MAX_REPORT_DAYS_INCLUSIVE} days.</div>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex items-end gap-3 overflow-x-auto flex-nowrap pb-1 px-6 sm:px-8">
          <div className="shrink-0 w-[190px]">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1.5">From</div>
            <DatePickerField
              label="From date"
              value={from}
              max={to}
              onChangeAction={(nextIso) => applyRange(nextIso, to)}
              widthClassName="w-full"
              variant="dark"
            />
          </div>

          <div className="shrink-0 w-[190px]">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1.5">To</div>
            <DatePickerField
              label="To date"
              value={to}
              min={from}
              max={clampInfo.maxTo ?? undefined}
              onChangeAction={(nextIso) => applyRange(from, nextIso)}
              widthClassName="w-full"
              variant="dark"
            />
          </div>

          <div className="shrink-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1.5">Range</div>
            <div className="flex items-center gap-2 flex-nowrap">
              {(
                [
                  { key: "today" as const, label: "Today", hint: "Today", accent: "bg-emerald-500" },
                  { key: "7d" as const, label: "7D", hint: "Last 7 days", accent: "bg-sky-500" },
                  { key: "30d" as const, label: "1M", hint: "Last 30 days", accent: "bg-violet-500" },
                ] as const
              ).map((p) => {
                const r = getQuickRange(p.key);
                const active = from === r.from && to === r.to;
                return (
                  <RangePill
                    key={p.key}
                    label={p.label}
                    hint={p.hint}
                    accentClassName={p.accent}
                    active={active}
                    onClick={() => applyRange(r.from, r.to)}
                  />
                );
              })}

              <MoreRangesPopover
                mounted={mounted}
                clampInfo={clampInfo}
                moreRanges={[
                  { key: "3m" as const, label: "3M", hint: "Last 3 months", accent: "bg-indigo-500" },
                  { key: "6m" as const, label: "6M", hint: "Last 6 months", accent: "bg-amber-500" },
                  { key: "ytd" as const, label: "YTD", hint: "Year to date", accent: "bg-teal-500" },
                  { key: "12m" as const, label: "12M", hint: "Last 12 months (max)", accent: "bg-slate-600" },
                ]}
                onSelectRange={(k) => {
                  const r = getQuickRange(k);
                  applyRange(r.from, r.to);
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 sm:px-8">
          <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.05] px-5 py-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Revenue (TZS)</div>
            <div className="mt-2 text-2xl font-black text-white">{fmtMoneyTZS(totalRevenue)}</div>
          </div>
          <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.05] px-5 py-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Active properties (latest)</div>
            <div className="mt-2 text-2xl font-black text-white">{String(totalActive)}</div>
          </div>
          <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.05] px-5 py-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Invoices (all statuses)</div>
            <div className="mt-2 text-2xl font-black text-white">{String(invoicesTotal)}</div>
          </div>
        </div>

        <div className="mx-6 mt-4 sm:mx-8 rounded-[20px] border border-[#02665e]/20 bg-[#02665e]/[0.08] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-emerald-200">NoLSAF revenue sources</div>
              <div className="text-xs text-slate-400">Owner commission, driver commission, and subscriptions (planned).</div>
            </div>
            {totalsLoading ? <div className="text-xs text-slate-500">Calculating…</div> : null}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="rounded-[16px] border border-[#02665e]/20 bg-[#02665e]/10 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Owner commission</div>
              <div className="mt-2 text-base font-black text-emerald-300">
                {ownerCommissionTotal === null ? "—" : `TZS ${fmtMoneyTZS(Math.round(ownerCommissionTotal))}`}
              </div>
            </div>
            <div className="rounded-[16px] border border-[#02665e]/20 bg-[#02665e]/10 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Driver commission</div>
              <div className="mt-2 text-base font-black text-emerald-300">
                {driverCommissionTotal === null ? "—" : `TZS ${fmtMoneyTZS(Math.round(driverCommissionTotal))}`}
              </div>
            </div>
            <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.04] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Subscriptions</div>
              <div className="mt-2 text-base font-black text-slate-400">Planned</div>
            </div>
            <div className="rounded-[16px] border border-white/[0.08] bg-white/[0.06] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Total NoLSAF revenue</div>
              <div className="mt-2 text-base font-black text-white">
                {totalNolsafRevenue === null ? "—" : `TZS ${fmtMoneyTZS(Math.round(totalNolsafRevenue))}`}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-6 mt-4 sm:mx-8 rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="text-sm font-bold text-white">Visual summary</div>
              <div className="text-xs text-slate-400">Revenue trend · Invoice status · Breakdown by property type.</div>
            </div>
            {loading ? <div className="text-xs text-slate-500">Loading…</div> : null}
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.04] p-4">
              <div className="text-sm font-bold text-slate-200 mb-3">Revenue trend</div>
              <Chart
                type="line"
                data={revenueChartData as any}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: { boxWidth: 10, boxHeight: 10 },
                    },
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: { display: false } },
                    y: { grid: { display: false }, ticks: { display: false } },
                  },
                } as any}
                height={220}
                onCanvas={setRevCanvas}
              />
            </div>

            <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.04] p-4">
              <div className="text-sm font-bold text-slate-200 mb-3">Invoices by status</div>
              <Chart
                type="doughnut"
                data={invoiceStatusChartData as any}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: { boxWidth: 10, boxHeight: 10 },
                    },
                  },
                  cutout: "62%",
                } as any}
                height={220}
                onCanvas={setStatusCanvas}
              />
            </div>

            <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.04] p-4">
              <div className="text-sm font-bold text-slate-200">Revenue by property type</div>
              <div className="mt-1 text-xs text-slate-500">Breakdown with color classification.</div>

              {revenueByTypeBreakdown.items.length ? (
                <>
                  <div
                    className="mt-3 h-3 rounded-full overflow-hidden border border-white/10 bg-white/[0.06] flex"
                    aria-label="Revenue by property type breakdown"
                  >
                    {revenueByTypeBreakdown.items.map((it) => (
                      <div
                        key={it.label}
                        style={{ width: `${Math.max(0, Math.min(100, it.pct))}%`, backgroundColor: it.color }}
                        title={`${it.label}: ${Math.round(it.pct)}%`}
                      />
                    ))}
                  </div>

                  <div className="mt-3 space-y-2">
                    {revenueByTypeBreakdown.items.slice(0, 10).map((it) => (
                      <div key={it.label} className="flex items-center gap-2 text-xs">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: it.color }} aria-hidden />
                        <div className="min-w-0 flex-1 font-semibold text-slate-300 truncate">{it.label}</div>
                        <div className="text-slate-500 font-semibold whitespace-nowrap">{Math.round(it.pct)}%</div>
                        <div className="text-white font-extrabold whitespace-nowrap">TZS {fmtMoneyTZS(Number(it.value) || 0)}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-3 text-sm text-slate-500">No revenue-by-type data for this range.</div>
              )}
            </div>
          </div>
        </div>

        <div className="mx-6 mt-4 sm:mx-8 rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-5">
            <div className="text-sm font-bold text-white">Invoice Status Summary</div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 border-b border-white/[0.08]">
                    <th className="text-left py-2.5 pr-2">Status</th>
                    <th className="text-right py-2.5 pl-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(invoiceStatusCounts || {}).length ? (
                    Object.entries(invoiceStatusCounts)
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([k, v]) => (
                        <tr key={k} className="border-b border-white/[0.06] last:border-b-0">
                          <td className="py-2.5 pr-2 text-slate-300">{k}</td>
                          <td className="py-2.5 pl-2 text-right font-bold text-white">{String(v ?? 0)}</td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="py-4 text-sm text-slate-500">
                        No invoice data for this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        </div>

        <div className="mx-6 mt-4 mb-6 sm:mx-8 rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-bold text-white">Invoices (details)</div>
              <div className="text-xs text-slate-500">Up to 200 loaded · prints up to 60</div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 border-b border-white/[0.08]">
                    <th className="text-left py-2.5 pr-2">Invoice</th>
                    <th className="text-left py-2.5 px-2">Status</th>
                    <th className="text-left py-2.5 px-2">Issued</th>
                    <th className="text-left py-2.5 px-2">Property</th>
                    <th className="text-right py-2.5 px-2">Total</th>
                    <th className="text-right py-2.5 pl-2">Net</th>
                    <th className="text-right font-bold py-2.5 pl-2 text-emerald-400">NoLSAF (TZS)</th>
                    <th className="text-right py-2.5 pl-2">NoLSAF %</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.length ? (
                    invoiceItems.slice(0, 60).map((inv) => (
                      <tr key={inv.id} className="border-b border-white/[0.06] last:border-b-0">
                        <td className="py-2.5 pr-2 font-bold text-white whitespace-nowrap">
                          {inv.invoiceNumber || `#${inv.id}`}
                        </td>
                        <td className="py-2.5 px-2 text-slate-300 whitespace-nowrap">{inv.status || "—"}</td>
                        <td className="py-2.5 px-2 text-slate-400 whitespace-nowrap">
                          {inv.issuedAt ? fmtDateTime(inv.issuedAt) : "—"}
                        </td>
                        <td className="py-2.5 px-2 text-slate-300 max-w-[320px] truncate">
                          {inv.booking?.property?.title || "—"}
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-200 whitespace-nowrap">
                          TZS {fmtMoneyTZS(Number(inv.total || 0))}
                        </td>
                        <td className="py-2.5 pl-2 text-right font-semibold text-white whitespace-nowrap">
                          TZS {fmtMoneyTZS(Number(inv.netPayable || 0))}
                        </td>
                        <td className="py-2.5 pl-2 text-right font-semibold text-emerald-300 whitespace-nowrap">
                          {(() => {
                            const amt = calcCommissionAmount(inv.total, inv.netPayable);
                            return amt === null ? "—" : `TZS ${fmtMoneyTZS(amt)}`;
                          })()}
                        </td>
                        <td className="py-2.5 pl-2 text-right text-slate-300 whitespace-nowrap">
                          {fmtPct(calcCommissionPct(inv.total, inv.netPayable), 1)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-4 text-sm text-slate-500">
                        No invoice rows for this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
      </div>
      </div>
    </div>
  );
}

function PopoverPositioner({ open, computePos }: { open: boolean; computePos: () => void }) {
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;

    computePos();
    window.addEventListener("resize", computePos);
    window.addEventListener("scroll", computePos, true);
    return () => {
      window.removeEventListener("resize", computePos);
      window.removeEventListener("scroll", computePos, true);
    };
  }, [open, computePos]);

  return null;
}

function MoreRangesPopover({
  mounted,
  moreRanges,
  onSelectRange,
  clampInfo,
}: {
  mounted: boolean;
  moreRanges: Array<{ key: QuickRangeKey; label: string; hint: string; accent: string }>;
  onSelectRange: (k: QuickRangeKey) => void;
  clampInfo: { maxTo: string | null };
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const computePos = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const width = 256;
    const rawLeft = rect.right - width;
    const left = Math.max(12, Math.min(rawLeft, window.innerWidth - 12 - width));
    const top = rect.bottom + 8;
    setPos({ top, left, width });
  }, []);

  return (
    <Popover className="relative shrink-0">
      {({ open, close }) => (
        <>
          <PopoverPositioner open={open} computePos={computePos} />

          <Popover.Button
            ref={buttonRef}
            type="button"
            className={
              "h-12 w-12 inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-300 shadow-sm transition hover:bg-white/[0.10] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 " +
              (open ? "ring-1 ring-white/20" : "")
            }
            title="More ranges"
            aria-label="More ranges"
            onClick={() => {
              if (typeof window !== "undefined") {
                setTimeout(() => {
                  try {
                    computePos();
                  } catch {
                    // ignore
                  }
                }, 0);
              }
            }}
          >
            <Sliders className="h-4 w-4" aria-hidden />
          </Popover.Button>

          {mounted
            ? createPortal(
                <Transition
                  as={Fragment}
                  show={open}
                  enter="transition ease-out duration-150"
                  enterFrom="opacity-0 translate-y-1"
                  enterTo="opacity-100 translate-y-0"
                  leave="transition ease-in duration-120"
                  leaveFrom="opacity-100 translate-y-0"
                  leaveTo="opacity-0 translate-y-1"
                >
                  <Popover.Panel
                    static
                    className="fixed z-[10000] w-64 rounded-[18px] border border-white/10 bg-[#0d1f34] shadow-xl overflow-hidden"
                    style={pos ? { top: pos.top, left: pos.left, width: pos.width } : undefined}
                  >
                    <div className="p-1">
                      <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">More ranges</div>
                      {moreRanges.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => {
                            onSelectRange(p.key);
                            close();
                          }}
                          className="w-full flex items-center gap-2 rounded-[12px] px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30"
                          title={p.hint}
                        >
                          <span className={"h-2.5 w-2.5 rounded-sm " + p.accent} aria-hidden />
                          <div className="min-w-0 text-left">
                            <div className="font-bold leading-5 text-slate-200">{p.label}</div>
                            <div className="text-[11px] text-slate-500 leading-4 truncate">{p.hint}</div>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="px-3 py-2 border-t border-white/[0.07] text-[11px] text-slate-500">
                      Max range: <span className="font-semibold">12 months</span>
                      {clampInfo.maxTo ? (
                        <span className="block">
                          To max: <span className="font-semibold">{clampInfo.maxTo}</span>
                        </span>
                      ) : null}
                    </div>
                  </Popover.Panel>
                </Transition>,
                document.body
              )
            : null}
        </>
      )}
    </Popover>
  );
}

function RangePill({
  label,
  hint,
  accentClassName,
  active,
  onClick,
}: {
  label: string;
  hint: string;
  accentClassName: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={hint}
      className={
        "relative h-12 px-4 rounded-xl border text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/40 " +
        (active ? "border-[#02665e]/40 text-emerald-300 bg-[#02665e]/[0.18]" : "border-white/[0.12] bg-white/[0.07] text-slate-300 hover:bg-white/[0.12]")
      }
    >
      <span className="inline-flex items-center gap-2">
        <span className={"h-2 w-2 rounded-sm " + accentClassName} aria-hidden />
        <span>{label}</span>
      </span>

    </button>
  );
}

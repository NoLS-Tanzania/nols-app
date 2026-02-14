"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ReportsFilter, { ReportsFilters } from "@/components/ReportsFilter";
import { Download, Printer, ShieldCheck, AlertTriangle } from "lucide-react";
import { escapeHtml } from "@/utils/html";

// Use same-origin requests to leverage Next.js rewrites and avoid CORS
const api = axios.create({ baseURL: "", withCredentials: true });

type OwnerHeader = {
  id: number;
  fullName: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

type PropertyHeader = {
  id: number;
  title: string;
  regionName: string | null;
  district: string | null;
  ward: string | null;
  street: string | null;
  apartment: string | null;
  city: string | null;
  zip: string | null;
  country: string | null;
};

type StaysReport = {
  generatedAt: string;
  header: {
    from: string;
    to: string;
    groupBy: "day" | "week" | "month";
    owner: OwnerHeader | null;
    property: PropertyHeader | null;
  };
  stats: {
    nolsafBookings: number;
    externalReservations: number;
    groupStaysReceived: number;
    auctionClaimsSubmitted: number;
    auctionClaimsAccepted: number;
    revenueTzs: number;
    nightsBooked: number;
    nightsBlocked: number;
    groupStayNights: number;
  };
  series: Array<{ key: string; nolsaf: number; external: number; groupStays: number; revenueTzs: number }>;
  bookings: Array<{
    id: number;
    propertyId: number;
    checkIn: string;
    checkOut: string;
    status: string;
    totalAmount: string;
    roomsQty: number;
    roomCode: string | null;
    guestName: string | null;
    guestPhone: string | null;
    nationality: string | null;
    sex: string | null;
    createdAt: string;
    property: PropertyHeader;
  }>;
  external: Array<{
    id: number;
    propertyId: number;
    startDate: string;
    endDate: string;
    roomCode: string | null;
    source: string | null;
    bedsBlocked: number | null;
    createdAt: string;
    property: PropertyHeader;
  }>;
  groupStays: Array<{
    id: number;
    groupType: string;
    accommodationType: string;
    headcount: number;
    roomsNeeded: number;
    toRegion: string;
    toDistrict: string | null;
    toWard: string | null;
    toLocation: string | null;
    checkIn: string | null;
    checkOut: string | null;
    useDates: boolean;
    status: string;
    totalAmount: string | null;
    currency: string;
    isOpenForClaims: boolean;
    openedForClaimsAt: string | null;
    confirmedPropertyId: number | null;
    createdAt: string;
    confirmedProperty: PropertyHeader | null;
  }>;
  auctionClaims: Array<{
    id: number;
    groupBookingId: number;
    ownerId: number;
    propertyId: number;
    offeredPricePerNight: string;
    discountPercent: string | null;
    totalAmount: string;
    currency: string;
    status: string;
    reviewedAt: string | null;
    createdAt: string;
    updatedAt: string;
    property: PropertyHeader;
    groupBooking: {
      id: number;
      groupType: string;
      accommodationType: string;
      headcount: number;
      roomsNeeded: number;
      toRegion: string;
      toDistrict: string | null;
      toLocation: string | null;
      checkIn: string | null;
      checkOut: string | null;
      useDates: boolean;
      status: string;
      totalAmount: string | null;
      currency: string;
      isOpenForClaims: boolean;
      openedForClaimsAt: string | null;
      createdAt: string;
    };
  }>;
};

function fmtMoneyTZS(v: number) {
  const n = Number.isFinite(v) ? v : 0;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function buildPropertyAddress(p: PropertyHeader | null) {
  if (!p) return "All properties";
  const parts = [p.street, p.ward, p.district, p.city, p.regionName, p.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function csvEscape(cell: unknown) {
  const s = String(cell ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function StaysReportPage() {
  const [filters, setFilters] = useState<ReportsFilters | null>(null);
  const [data, setData] = useState<StaysReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filters) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    api
      .get("/api/owner/reports/stays", { params: filters })
      .then((r) => {
        if (!mounted) return;
        setData(r.data);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setData(null);
        setError(e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? "Failed to load stays report");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [filters]);

  const ownerDisplay = useMemo(() => {
    const o = data?.header?.owner;
    if (!o) return "—";
    return (o.fullName || o.name || "Owner").toString();
  }, [data]);

  const propertyDisplay = useMemo(() => {
    const p = data?.header?.property;
    return p?.title || "All properties";
  }, [data]);

  const canExport = !!data && !loading;

  function exportCsv() {
    if (!data) return;

    const owner = data.header.owner;
    const property = data.header.property;

    const meta = {
      propertyTitle: property?.title ?? "All properties",
      propertyAddress: buildPropertyAddress(property),
      ownerName: owner ? (owner.fullName || owner.name || "").toString() : "",
      ownerEmail: owner?.email ?? "",
      ownerPhone: owner?.phone ?? "",
      rangeFrom: fmtDate(data.header.from),
      rangeTo: fmtDate(data.header.to),
      generatedAt: fmtDateTime(data.generatedAt),
    };

    const header = [
      "source",
      "property",
      "property_address",
      "owner_name",
      "owner_email",
      "owner_phone",
      "check_in",
      "check_out",
      "room_code",
      "status",
      "guest_name",
      "guest_phone",
      "nationality",
      "gender",
      "amount_paid_tzs",
      "external_source",
      "beds_blocked",
      "created_at",
      "group_stay_id",
      "group_type",
      "headcount",
      "rooms_needed",
      "auction_claim_id",
      "auction_claim_status",
      "offered_price_per_night_tzs",
      "discount_percent",
    ];

    const rows: unknown[][] = [header];

    for (const b of data.bookings || []) {
      rows.push([
        "NoLSAF",
        b.property?.title ?? meta.propertyTitle,
        buildPropertyAddress(b.property ?? property),
        meta.ownerName,
        meta.ownerEmail,
        meta.ownerPhone,
        fmtDate(b.checkIn),
        fmtDate(b.checkOut),
        b.roomCode ?? "",
        b.status ?? "",
        b.guestName ?? "",
        b.guestPhone ?? "",
        b.nationality ?? "",
        b.sex ?? "",
        String(b.totalAmount ?? ""),
        "",
        "",
        fmtDateTime(b.createdAt),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
    }

    for (const x of data.external || []) {
      rows.push([
        "External",
        x.property?.title ?? meta.propertyTitle,
        buildPropertyAddress(x.property ?? property),
        meta.ownerName,
        meta.ownerEmail,
        meta.ownerPhone,
        fmtDate(x.startDate),
        fmtDate(x.endDate),
        x.roomCode ?? "",
        "BLOCKED",
        "",
        "",
        "",
        "",
        "",
        x.source ?? "",
        x.bedsBlocked ?? "",
        fmtDateTime(x.createdAt),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
    }

    for (const g of data.groupStays || []) {
      const p = g.confirmedProperty || property;
      rows.push([
        "GroupStay",
        p?.title ?? meta.propertyTitle,
        buildPropertyAddress(p ?? property),
        meta.ownerName,
        meta.ownerEmail,
        meta.ownerPhone,
        g.checkIn ? fmtDate(g.checkIn) : "",
        g.checkOut ? fmtDate(g.checkOut) : "",
        "",
        g.status ?? "",
        "",
        "",
        "",
        "",
        String(g.totalAmount ?? ""),
        "",
        "",
        fmtDateTime(g.createdAt),
        String(g.id),
        g.groupType ?? "",
        String(g.headcount ?? ""),
        String(g.roomsNeeded ?? ""),
        "",
        "",
        "",
        "",
      ]);
    }

    for (const c of data.auctionClaims || []) {
      rows.push([
        "AuctionClaim",
        c.property?.title ?? meta.propertyTitle,
        buildPropertyAddress(c.property ?? property),
        meta.ownerName,
        meta.ownerEmail,
        meta.ownerPhone,
        c.groupBooking?.checkIn ? fmtDate(c.groupBooking.checkIn) : "",
        c.groupBooking?.checkOut ? fmtDate(c.groupBooking.checkOut) : "",
        "",
        c.status ?? "",
        "",
        "",
        "",
        "",
        String(c.totalAmount ?? ""),
        "",
        "",
        fmtDateTime(c.createdAt),
        String(c.groupBookingId),
        c.groupBooking?.groupType ?? "",
        String(c.groupBooking?.headcount ?? ""),
        String(c.groupBooking?.roomsNeeded ?? ""),
        String(c.id),
        c.status ?? "",
        String(c.offeredPricePerNight ?? ""),
        String(c.discountPercent ?? ""),
      ]);
    }

    const safeProp = (propertyDisplay || "report").replace(/[^a-z0-9\-_]+/gi, "-");
    downloadCsv(`stays-report-${safeProp}-${data.header.from.slice(0, 10)}_to_${data.header.to.slice(0, 10)}.csv`, rows);
  }

  async function printReport() {
    if (!data) return;

    const owner = data.header.owner;
    const property = data.header.property;

    const ownerName = owner ? (owner.fullName || owner.name || "Owner").toString() : "Owner";
    const propertyTitle = property?.title ?? "All properties";
    const address = buildPropertyAddress(property);

    let qrDataUrl: string | null = null;
    try {
      const QR: any = await import("qrcode");
      const toDataURL: any = QR?.toDataURL ?? QR?.default?.toDataURL;
      if (typeof toDataURL !== "function") throw new Error("qrcode.toDataURL not available");

      const verifyUrl = new URL("/owner/reports/stays", window.location.origin);
      verifyUrl.searchParams.set("from", data.header.from);
      verifyUrl.searchParams.set("to", data.header.to);
      verifyUrl.searchParams.set("groupBy", data.header.groupBy);
      verifyUrl.searchParams.set("reportId", data.generatedAt);
      if (property?.id) verifyUrl.searchParams.set("propertyId", String(property.id));

      qrDataUrl = await toDataURL(verifyUrl.toString(), {
        margin: 1,
        width: 160,
        errorCorrectionLevel: "M",
      });
    } catch {
      qrDataUrl = null;
    }

    const maxSeries = Math.max(1, ...((data.series || []).map((s) => Math.max(s.nolsaf + s.external + (s.groupStays || 0), 1)) || [1]));

    const rowsBookings = (data.bookings || [])
      .map((b) => {
        return `
<tr>
  <td>${escapeHtml(b.guestName || "Guest")}</td>
  <td>${escapeHtml(fmtDate(b.checkIn))}</td>
  <td>${escapeHtml(fmtDate(b.checkOut))}</td>
  <td>${escapeHtml(b.nationality || "—")}</td>
  <td>${escapeHtml(b.sex || "—")}</td>
  <td style="text-align:right;">TZS ${escapeHtml(fmtMoneyTZS(Number(b.totalAmount || 0)))}</td>
  <td>${escapeHtml(b.status || "—")}</td>
</tr>`;
      })
      .join("\n");

    const rowsExternal = (data.external || [])
      .map((x) => {
        return `
<tr>
  <td>${escapeHtml(x.source || "External")}</td>
  <td>${escapeHtml(fmtDate(x.startDate))}</td>
  <td>${escapeHtml(fmtDate(x.endDate))}</td>
  <td>${escapeHtml(x.roomCode || "—")}</td>
  <td style="text-align:right;">${escapeHtml(String(x.bedsBlocked ?? "1"))}</td>
</tr>`;
      })
      .join("\n");

    const rowsGroupStays = (data.groupStays || [])
      .map((g) => {
        const dest = [g.toRegion, g.toDistrict, g.toLocation].filter(Boolean).join(" • ") || "—";
        return `
<tr>
  <td>${escapeHtml(String(g.groupType || "—"))}</td>
  <td>${escapeHtml(dest)}</td>
  <td>${escapeHtml(g.checkIn ? fmtDate(g.checkIn) : "—")}</td>
  <td>${escapeHtml(g.checkOut ? fmtDate(g.checkOut) : "—")}</td>
  <td style="text-align:right;">${escapeHtml(String(g.headcount ?? "—"))}</td>
  <td>${escapeHtml(String(g.status || "—"))}</td>
</tr>`;
      })
      .join("\n");

    const rowsAuctionClaims = (data.auctionClaims || [])
      .map((c) => {
        return `
<tr>
  <td>#${escapeHtml(String(c.groupBookingId))}</td>
  <td>${escapeHtml(String(c.property?.title || "—"))}</td>
  <td style="text-align:right;">TZS ${escapeHtml(fmtMoneyTZS(Number(c.offeredPricePerNight || 0)))}</td>
  <td style="text-align:right;">${escapeHtml(c.discountPercent ? String(c.discountPercent) + '%' : '—')}</td>
  <td>${escapeHtml(String(c.status || "—"))}</td>
  <td>${escapeHtml(fmtDateTime(c.createdAt))}</td>
</tr>`;
      })
      .join("\n");

    const seriesHtml = (data.series || [])
      .map((s) => {
        const total = Math.max(0, Number(s.nolsaf || 0) + Number(s.external || 0) + Number(s.groupStays || 0));
        const pct = Math.min(100, Math.round((total / maxSeries) * 100));
        const nPct = total ? Math.round((Number(s.nolsaf || 0) / total) * pct) : 0;
        const ePct = total ? Math.round((Number(s.external || 0) / total) * pct) : 0;
        const gPct = Math.max(0, pct - nPct - ePct);

        return `
<div class="series-row">
  <div class="series-key">${escapeHtml(s.key)}</div>
  <div class="series-bar">
    <div class="seg nolsaf" style="width:${nPct}%"></div>
    <div class="seg ext" style="width:${ePct}%"></div>
    <div class="seg group" style="width:${gPct}%"></div>
  </div>
  <div class="series-val">${escapeHtml(String(total))}</div>
</div>`;
      })
      .join("\n");

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Stays Report</title>
  <style>
    :root { --ink:#0b1220; --muted:#5b6472; --line:#e5e7eb; --brand:#02665e; --ext:#f59e0b; --group:#6366f1; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:var(--ink); background:#fff; }
    .page { padding: 28px; }
    .watermark { position: fixed; inset: 0; pointer-events:none; opacity: 0.07; display:flex; align-items:center; justify-content:center; }
    .watermark span { transform: rotate(-24deg); font-size: 72px; font-weight: 800; letter-spacing: 1px; color: #0b1220; }

    .top { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; }
    .badge { display:inline-flex; align-items:center; gap:8px; font-weight:700; font-size:12px; padding:6px 10px; border:1px solid rgba(2,102,94,0.25); border-radius:999px; color: var(--brand); background: rgba(2,102,94,0.06); }
    h1 { margin:10px 0 0; font-size:24px; letter-spacing:-0.02em; }
    .sub { margin-top:6px; color: var(--muted); font-size: 12px; }

    .meta { margin-top: 14px; display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .card { border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; }
    .kv { display:grid; grid-template-columns: 130px 1fr; gap: 6px 10px; font-size: 12px; }
    .k { color: var(--muted); }
    .v { font-weight: 600; }

    .kpis { margin-top: 14px; display:grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
    .kpi { border:1px solid var(--line); border-radius: 14px; padding: 10px 12px; }
    .kpi .t { color: var(--muted); font-size: 11px; }
    .kpi .n { margin-top: 2px; font-size: 16px; font-weight: 800; }

    .section { margin-top: 18px; }
    .section h2 { margin: 0 0 10px; font-size: 14px; letter-spacing: -0.01em; }

    .series { border:1px solid var(--line); border-radius: 14px; padding: 12px 14px; }
    .series-row { display:grid; grid-template-columns: 110px 1fr 40px; gap:10px; align-items:center; padding: 6px 0; border-bottom: 1px dashed rgba(229,231,235,0.8); }
    .series-row:last-child { border-bottom: none; }
    .series-key { font-size: 12px; color: var(--muted); white-space: nowrap; overflow:hidden; text-overflow: ellipsis; }
    .series-val { font-size: 12px; font-weight: 800; text-align:right; }
    .series-bar { height: 10px; background: #f3f4f6; border-radius: 999px; overflow:hidden; display:flex; }
    .seg { height: 100%; }
    .seg.nolsaf { background: var(--brand); }
    .seg.ext { background: var(--ext); }
    .seg.group { background: var(--group); }

    table { width:100%; border-collapse: collapse; border:1px solid var(--line); border-radius: 14px; overflow:hidden; }
    thead th { font-size: 11px; text-align:left; color: var(--muted); background:#f8fafc; padding: 10px 10px; border-bottom:1px solid var(--line); }
    tbody td { font-size: 12px; padding: 9px 10px; border-bottom: 1px solid rgba(229,231,235,0.8); }
    tbody tr:last-child td { border-bottom: none; }

    .footer { margin-top: 20px; display:flex; justify-content:space-between; gap: 16px; align-items:flex-end; }
    .sig { border-top: 1px solid #111827; width: 220px; padding-top: 6px; font-size: 11px; color: var(--muted); text-align:center; }

    .qr { margin-top: 10px; display:flex; gap: 10px; align-items:center; }
    .qr img { width: 92px; height: 92px; border-radius: 10px; border: 1px solid var(--line); background: #fff; }
    .qr .qrText { min-width: 0; }
    .qr .qrTitle { font-weight: 800; color: var(--ink); }
    .qr .qrNote { margin-top: 2px; color: var(--muted); max-width: 260px; line-height: 1.25; }

    @media print {
      .page { padding: 18mm; }
      @page { size: A4; margin: 12mm; }
    }
  </style>
</head>
<body>
  <div class="watermark"><span>Powered by NoLSAF</span></div>
  <div class="page">
    <div class="top">
      <div>
        <div class="badge">Operational Report • NoLSAF</div>
        <h1>${escapeHtml(propertyTitle)} — Stays Report</h1>
        <div class="sub">Range: ${escapeHtml(fmtDate(data.header.from))} → ${escapeHtml(fmtDate(data.header.to))} • Generated: ${escapeHtml(fmtDateTime(data.generatedAt))}</div>
      </div>
      <div style="text-align:right; font-size:12px; color:var(--muted)">
        <div><strong style="color:var(--ink)">${escapeHtml(ownerName)}</strong></div>
        <div>${escapeHtml(owner?.email || "")}</div>
        <div>${escapeHtml(owner?.phone || "")}</div>
      </div>
    </div>

    <div class="meta">
      <div class="card">
        <div class="kv">
          <div class="k">Property</div><div class="v">${escapeHtml(propertyTitle)}</div>
          <div class="k">Address</div><div class="v">${escapeHtml(address)}</div>
          <div class="k">Group by</div><div class="v">${escapeHtml(data.header.groupBy)}</div>
        </div>
      </div>
      <div class="card">
        <div class="kv">
          <div class="k">Printed by</div><div class="v">${escapeHtml(ownerName)}</div>
          <div class="k">Printed at</div><div class="v">${escapeHtml(fmtDateTime(new Date().toISOString()))}</div>
          <div class="k">Branding</div><div class="v">Powered by NoLSAF</div>
        </div>
      </div>
    </div>

    <div class="kpis">
      <div class="kpi"><div class="t">NoLSAF bookings</div><div class="n">${escapeHtml(String(data.stats.nolsafBookings || 0))}</div></div>
      <div class="kpi"><div class="t">External reservations</div><div class="n">${escapeHtml(String(data.stats.externalReservations || 0))}</div></div>
      <div class="kpi"><div class="t">Group stays received</div><div class="n">${escapeHtml(String(data.stats.groupStaysReceived || 0))}</div></div>
      <div class="kpi"><div class="t">Revenue (TZS)</div><div class="n">${escapeHtml(fmtMoneyTZS(Number(data.stats.revenueTzs || 0)))}</div></div>
      <div class="kpi"><div class="t">Nights booked</div><div class="n">${escapeHtml(String(data.stats.nightsBooked || 0))}</div></div>
      <div class="kpi"><div class="t">Nights blocked</div><div class="n">${escapeHtml(String(data.stats.nightsBlocked || 0))}</div></div>
    </div>

    <div class="section">
      <h2>Activity mix (by ${escapeHtml(data.header.groupBy)})</h2>
      <div class="series">
        ${seriesHtml || '<div style="color:var(--muted);font-size:12px;">No chart data in this range.</div>'}
        <div style="display:flex; gap:12px; align-items:center; margin-top:10px; font-size:11px; color:var(--muted)">
          <div style="display:flex; align-items:center; gap:8px;"><span style="width:10px;height:10px;border-radius:3px;background:var(--brand);display:inline-block;"></span>NoLSAF</div>
          <div style="display:flex; align-items:center; gap:8px;"><span style="width:10px;height:10px;border-radius:3px;background:var(--ext);display:inline-block;"></span>External</div>
          <div style="display:flex; align-items:center; gap:8px;"><span style="width:10px;height:10px;border-radius:3px;background:var(--group);display:inline-block;"></span>Group stays</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>NoLSAF bookings</h2>
      <table>
        <thead>
          <tr>
            <th>Guest</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Nationality</th>
            <th>Gender</th>
            <th style="text-align:right;">Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsBookings || '<tr><td colspan="7" style="color:var(--muted);">No NoLSAF bookings in this range.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>External reservations (blocks)</h2>
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>Start</th>
            <th>End</th>
            <th>Room</th>
            <th style="text-align:right;">Beds</th>
          </tr>
        </thead>
        <tbody>
          ${rowsExternal || '<tr><td colspan="5" style="color:var(--muted);">No external reservations in this range.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Group stays received</h2>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Destination</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th style="text-align:right;">Headcount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsGroupStays || '<tr><td colspan="6" style="color:var(--muted);">No group stays received in this range.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Auction participation (claims)</h2>
      <table>
        <thead>
          <tr>
            <th>Group stay</th>
            <th>Property</th>
            <th style="text-align:right;">Offer / night</th>
            <th style="text-align:right;">Discount</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${rowsAuctionClaims || '<tr><td colspan="6" style="color:var(--muted);">No auction claims in this range.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div style="font-size:11px;color:var(--muted)">
        <div>Report ID: ${escapeHtml(data.generatedAt)}</div>
        <div>Prepared for operations and compliance.</div>
        ${qrDataUrl ? `
        <div class="qr">
          <img src="${qrDataUrl}" alt="Verify report QR" />
          <div class="qrText">
            <div class="qrTitle">Verify this report</div>
            <div class="qrNote">Scan to open the official NoLSAF report link (login may be required).</div>
          </div>
        </div>` : ""}
      </div>
      <div>
        <div class="sig">Signature</div>
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
    }, 400);
  }

  const kpis = data?.stats;

  return (
    <div className="space-y-6">
      <ReportsFilter onChangeAction={setFilters} exportHref={null} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Operational Export
          </div>
          <h2 className="mt-2 text-xl sm:text-2xl font-bold text-gray-900 tracking-tight truncate">
            {propertyDisplay}
          </h2>
          <p className="text-sm text-gray-600 mt-1">Day / week / month reporting with CSV export and print-ready layout.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canExport}
            onClick={exportCsv}
            className={
              "inline-flex items-center justify-center h-10 px-3 rounded-xl border shadow-sm text-sm font-semibold transition active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 " +
              (canExport ? "bg-white border-gray-200 text-gray-900 hover:bg-gray-50" : "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed")
            }
          >
            <Download className="h-4 w-4 mr-2" aria-hidden />
            Export CSV
          </button>
          <button
            type="button"
            disabled={!canExport}
            onClick={printReport}
            className={
              "inline-flex items-center justify-center h-10 px-3 rounded-xl border border-brand/25 bg-brand text-white shadow-sm hover:brightness-95 transition active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 " +
              (!canExport ? "opacity-50 cursor-not-allowed" : "")
            }
          >
            <Printer className="h-4 w-4 mr-2" aria-hidden />
            Print
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" aria-hidden />
          <div className="min-w-0">
            <div className="font-semibold">Couldn’t load report</div>
            <div className="text-amber-800/90 break-words">{error}</div>
          </div>
        </div>
      ) : null}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        <Kpi title="NoLSAF bookings" value={kpis ? String(kpis.nolsafBookings) : "—"} loading={loading} />
        <Kpi title="External reservations" value={kpis ? String(kpis.externalReservations) : "—"} loading={loading} />
        <Kpi title="Group stays received" value={kpis ? String(kpis.groupStaysReceived) : "—"} loading={loading} accent="text-indigo-700" />
        <Kpi title="Revenue (TZS)" value={kpis ? `TZS ${fmtMoneyTZS(kpis.revenueTzs)}` : "—"} loading={loading} accent="text-emerald-700" />
        <Kpi title="Nights booked" value={kpis ? String(kpis.nightsBooked) : "—"} loading={loading} />
        <Kpi title="Nights blocked" value={kpis ? String(kpis.nightsBlocked) : "—"} loading={loading} />
        <Kpi title="Auction claims" value={kpis ? `${String(kpis.auctionClaimsSubmitted)} (${String(kpis.auctionClaimsAccepted)} accepted)` : "—"} loading={loading} />
      </div>

      {/* Quick visualization */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-gray-900">Sources mix</div>
            <div className="text-xs text-gray-500">NoLSAF vs External blocks vs Group stays (assigned)</div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <LegendDot label="NoLSAF" className="bg-emerald-600" />
            <LegendDot label="External" className="bg-amber-500" />
            <LegendDot label="Group stays" className="bg-indigo-500" />
          </div>
        </div>

        <div className="mt-3">
          <SourcesBar
            nolsaf={Number(kpis?.nolsafBookings ?? 0)}
            external={Number(kpis?.externalReservations ?? 0)}
            groupStays={Number(kpis?.groupStaysReceived ?? 0)}
          />
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="font-semibold text-gray-900">Auction participation</div>
            <div className="mt-1">Submitted: {loading ? "…" : String(kpis?.auctionClaimsSubmitted ?? 0)} • Accepted: {loading ? "…" : String(kpis?.auctionClaimsAccepted ?? 0)}</div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="font-semibold text-gray-900">Group stay nights</div>
            <div className="mt-1">{loading ? "…" : String(kpis?.groupStayNights ?? 0)} nights overlap this range</div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="font-semibold text-gray-900">Tip</div>
            <div className="mt-1">Use this report to track platform activities beyond normal stays.</div>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="text-sm font-semibold text-gray-900">NoLSAF bookings</div>
            <div className="text-xs text-gray-500 mt-0.5">Bookings overlapping the selected range</div>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="text-left py-2 pr-3">Guest</th>
                  <th className="text-left py-2 pr-3">Check-in</th>
                  <th className="text-left py-2 pr-3">Check-out</th>
                  <th className="text-left py-2 pr-3">Nationality</th>
                  <th className="text-left py-2 pr-3">Gender</th>
                  <th className="text-right py-2 pl-3">Amount</th>
                  <th className="text-left py-2 pl-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.bookings?.length ? (
                  data.bookings.map((b) => (
                    <tr key={b.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 font-semibold text-gray-900">{b.guestName || "Guest"}</td>
                      <td className="py-2 pr-3 text-gray-700">{fmtDate(b.checkIn)}</td>
                      <td className="py-2 pr-3 text-gray-700">{fmtDate(b.checkOut)}</td>
                      <td className="py-2 pr-3 text-gray-700">{b.nationality || "—"}</td>
                      <td className="py-2 pr-3 text-gray-700">{b.sex || "—"}</td>
                      <td className="py-2 pl-3 text-right font-semibold text-emerald-700">TZS {fmtMoneyTZS(Number(b.totalAmount || 0))}</td>
                      <td className="py-2 pl-3 text-gray-700">{b.status || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-4 text-gray-500" colSpan={7}>
                      {loading ? "Loading…" : "No NoLSAF bookings in this range."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="text-sm font-semibold text-gray-900">External reservations (blocks)</div>
            <div className="text-xs text-gray-500 mt-0.5">Manual blocks representing outside bookings</div>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="min-w-[640px] w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="text-left py-2 pr-3">Source</th>
                  <th className="text-left py-2 pr-3">Start</th>
                  <th className="text-left py-2 pr-3">End</th>
                  <th className="text-left py-2 pr-3">Room</th>
                  <th className="text-right py-2 pl-3">Beds</th>
                </tr>
              </thead>
              <tbody>
                {data?.external?.length ? (
                  data.external.map((x) => (
                    <tr key={x.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 font-semibold text-gray-900">{x.source || "External"}</td>
                      <td className="py-2 pr-3 text-gray-700">{fmtDate(x.startDate)}</td>
                      <td className="py-2 pr-3 text-gray-700">{fmtDate(x.endDate)}</td>
                      <td className="py-2 pr-3 text-gray-700">{x.roomCode || "—"}</td>
                      <td className="py-2 pl-3 text-right font-semibold text-amber-700">{String(x.bedsBlocked ?? 1)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-4 text-gray-500" colSpan={5}>
                      {loading ? "Loading…" : "No external reservations in this range."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Group stays + auction section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="text-sm font-semibold text-gray-900">Group stays received</div>
            <div className="text-xs text-gray-500 mt-0.5">Group bookings assigned to you (overlapping range or created in-range for flexible dates)</div>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="min-w-[820px] w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="text-left py-2 pr-3">Type</th>
                  <th className="text-left py-2 pr-3">Destination</th>
                  <th className="text-left py-2 pr-3">Check-in</th>
                  <th className="text-left py-2 pr-3">Check-out</th>
                  <th className="text-right py-2 pl-3">Headcount</th>
                  <th className="text-left py-2 pl-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.groupStays?.length ? (
                  data.groupStays.map((g) => (
                    <tr key={g.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 font-semibold text-gray-900">{g.groupType || "—"}</td>
                      <td className="py-2 pr-3 text-gray-700">{[g.toRegion, g.toDistrict, g.toLocation].filter(Boolean).join(" • ") || "—"}</td>
                      <td className="py-2 pr-3 text-gray-700">{g.checkIn ? fmtDate(g.checkIn) : "—"}</td>
                      <td className="py-2 pr-3 text-gray-700">{g.checkOut ? fmtDate(g.checkOut) : "—"}</td>
                      <td className="py-2 pl-3 text-right font-semibold text-gray-900">{String(g.headcount ?? "—")}</td>
                      <td className="py-2 pl-3 text-gray-700">{g.status || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-4 text-gray-500" colSpan={6}>
                      {loading ? "Loading…" : "No group stays received in this range."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="text-sm font-semibold text-gray-900">Auction participation (claims)</div>
            <div className="text-xs text-gray-500 mt-0.5">Your competitive offers on open group stays (created in this range)</div>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="min-w-[840px] w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="text-left py-2 pr-3">Group stay</th>
                  <th className="text-left py-2 pr-3">Property</th>
                  <th className="text-right py-2 pl-3">Offer / night</th>
                  <th className="text-right py-2 pl-3">Discount</th>
                  <th className="text-left py-2 pl-3">Status</th>
                  <th className="text-left py-2 pl-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {data?.auctionClaims?.length ? (
                  data.auctionClaims.map((c) => (
                    <tr key={c.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 font-semibold text-gray-900">#{c.groupBookingId}</td>
                      <td className="py-2 pr-3 text-gray-700">{c.property?.title || "—"}</td>
                      <td className="py-2 pl-3 text-right font-semibold text-indigo-700">TZS {fmtMoneyTZS(Number(c.offeredPricePerNight || 0))}</td>
                      <td className="py-2 pl-3 text-right text-gray-700">{c.discountPercent ? `${String(c.discountPercent)}%` : "—"}</td>
                      <td className="py-2 pl-3 text-gray-700">{c.status || "—"}</td>
                      <td className="py-2 pl-3 text-gray-700">{fmtDateTime(c.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-4 text-gray-500" colSpan={6}>
                      {loading ? "Loading…" : "No auction claims created in this range."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {data?.generatedAt ? (
        <div className="text-xs text-gray-500">Generated at: {fmtDateTime(data.generatedAt)} • Printed by: {ownerDisplay}</div>
      ) : null}
    </div>
  );
}

function Kpi({ title, value, loading, accent }: { title: string; value: string; loading: boolean; accent?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="text-xs text-gray-500 font-semibold">{title}</div>
      <div className={("mt-1 text-xl font-extrabold tracking-tight " + (accent || "text-gray-900"))}>
        {loading ? "…" : value}
      </div>
    </div>
  );
}

function LegendDot({ label, className }: { label: string; className: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={"h-2.5 w-2.5 rounded-sm " + className} aria-hidden />
      <span className="text-gray-600">{label}</span>
    </span>
  );
}

function SourcesBar({ nolsaf, external, groupStays }: { nolsaf: number; external: number; groupStays: number }) {
  const total = Math.max(1, nolsaf + external + groupStays);
  const nPct = Math.round((nolsaf / total) * 100);
  const ePct = Math.round((external / total) * 100);
  const gPct = Math.max(0, 100 - nPct - ePct);

  return (
    <div className="w-full">
      <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden flex">
        <div className="h-full bg-emerald-600" style={{ width: `${nPct}%` }} />
        <div className="h-full bg-amber-500" style={{ width: `${ePct}%` }} />
        <div className="h-full bg-indigo-500" style={{ width: `${gPct}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
        <span><span className="font-semibold text-gray-900">NoLSAF</span>: {nolsaf}</span>
        <span><span className="font-semibold text-gray-900">External</span>: {external}</span>
        <span><span className="font-semibold text-gray-900">Group stays</span>: {groupStays}</span>
      </div>
    </div>
  );
}

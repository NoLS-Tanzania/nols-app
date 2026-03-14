"use client";
import React, { useRef, useState, useEffect } from "react";
import { Download, RefreshCw, AlertTriangle } from 'lucide-react';
import Chart from "@/components/Chart";
import { REGIONS } from '@/lib/tzRegions';
import { escapeAttr, escapeHtml } from "@/utils/html";

function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
}
function fmtTFLabel(tf: string) {
  return tf === '24h' ? 'Last 24 hours' : tf === '7d' ? 'Last 7 days' : tf === '30d' ? 'Last 30 days' : 'Last 12 months';
}

const AXIS_STYLE = {
  grid: { color: 'rgba(0,0,0,0.04)' },
  ticks: { font: { size: 11 }, color: '#94a3b8' },
  border: { display: false },
};

const TOOLTIP_STYLE = {
  backgroundColor: '#1e293b',
  titleColor: '#94a3b8',
  bodyColor: '#f1f5f9',
  padding: 12,
  cornerRadius: 10,
};

export default function GeneralReports() {
  const [activeTab, setActiveTab] = useState<'financial'|'invoices'>('financial');
  const [region, setRegion] = useState('ALL');
  // default timeframe for admins when they login
  const [timeframe, setTimeframe] = useState<'24h'|'7d'|'30d'|'12m'>('7d');
  const [groupBy, setGroupBy] = useState<'region'|'propertyType'>('propertyType');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revenueAreaCanvas = useRef<HTMLCanvasElement | null>(null);
  const propertyTypeCanvas = useRef<HTMLCanvasElement | null>(null);
  const activePropsCanvas = useRef<HTMLCanvasElement | null>(null);
  const invoiceDonutCanvas = useRef<HTMLCanvasElement | null>(null);
  const invoiceBarCanvas = useRef<HTMLCanvasElement | null>(null);

  // Unified export: CSV (all sections), PNG (all canvases), PDF (print-friendly page)
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = React.useRef<HTMLDivElement | null>(null);

  // Close export menu when clicking outside
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = exportMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setExportMenuOpen(false);
      }
    }
    if (exportMenuOpen) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [exportMenuOpen]);

  function downloadDataUrl(dataUrl: string, filename: string) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function exportAllPNGs() {
    try {
      const canvases: Array<{c: HTMLCanvasElement | null; name: string}> = [
        { c: revenueAreaCanvas.current, name: `revenue-trend-${region}-${timeframe}.png` },
        { c: propertyTypeCanvas.current, name: `property-type-${region}-${timeframe}.png` },
        { c: activePropsCanvas.current, name: `active-properties-${region}-${timeframe}.png` },
        { c: invoiceDonutCanvas.current, name: `invoice-status-${region}-${timeframe}.png` },
      ];
      canvases.forEach(({c, name}) => {
        if (!c) return;
        const url = c.toDataURL('image/png');
        downloadDataUrl(url, name);
      });
    } catch (e) {
      console.error('PNG export failed', e);
    } finally {
      setExportMenuOpen(false);
    }
  }

  function exportAllCSV() {
    try {
      // Unified CSV: single table with a 'section' column and common metric columns.
      const header = ['section','label','revenue_tzs','active_properties','count'];
      const rows: string[][] = [header];

      // Revenue Trend rows
      const labels = (Array.isArray(revenueSeries?.labels) && revenueSeries.labels.length) ? revenueSeries.labels : (Array.isArray(activePropsSeries?.labels) ? activePropsSeries.labels : []);
      (labels || []).forEach((lab, i) => {
        rows.push([
          'Revenue Trend',
          String(lab),
          String((revenueSeries.data && revenueSeries.data[i]) ?? ''),
          String((activePropsSeries.data && activePropsSeries.data[i]) ?? ''),
          ''
        ]);
      });

      // Property Type rows
      const typeLabels = (Array.isArray(revenueByType?.labels) && revenueByType.labels.length) ? revenueByType.labels : (Array.isArray(activePropsBreakdown?.labels) ? activePropsBreakdown.labels : []);
      (typeLabels || []).forEach((t, i) => {
        rows.push([
          'Property Type Performance',
          String(t),
          String((revenueByType.data && revenueByType.data[i]) ?? ''),
          String((activePropsBreakdown.data && activePropsBreakdown.data[i]) ?? ''),
          ''
        ]);
      });

      // Invoice rows
      Object.entries(invoiceStatusCounts || {}).forEach(([label, count]) => {
        rows.push(['Invoice Status', String(label), '', '', String(count ?? '')]);
      });

      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `general-reports-${region}-${timeframe}-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV export failed', e);
    } finally {
      setExportMenuOpen(false);
    }
  }

  function exportAllPDF() {
    try {
      const canvases: Array<{c: HTMLCanvasElement | null; title: string}> = [
        { c: revenueAreaCanvas.current, title: 'Revenue Trend' },
        { c: propertyTypeCanvas.current, title: 'Revenue by Property Type' },
        { c: activePropsCanvas.current, title: 'Active Properties Trend' },
        { c: invoiceDonutCanvas.current, title: 'Invoice Status Distribution' },
      ];
      const imgs = canvases.map(({c, title}) => ({ title, dataUrl: c ? c.toDataURL('image/png') : null }));

      // Open a new window with images and trigger print (user can save as PDF)
      const w = window.open('', '_blank');
      if (!w) {
        alert('Unable to open export window - please allow popups');
        return;
      }
      const htmlParts: string[] = ['<html><head><title>General Reports Export</title></head><body>'];
      htmlParts.push(`<h1>General Reports - ${escapeHtml(region)} - ${escapeHtml(timeframe)}</h1>`);
      imgs.forEach(im => {
        htmlParts.push(`<h2 style="font-family: sans-serif;">${escapeHtml(im.title)}</h2>`);
        if (im.dataUrl) htmlParts.push(`<img src="${escapeAttr(im.dataUrl)}" style="max-width:100%;height:auto;margin-bottom:24px;border:1px solid #ddd;"/>`);
        else htmlParts.push('<p style="font-family: sans-serif;color:#666;">(chart not available)</p>');
      });
      htmlParts.push('</body></html>');
      w.document.write(htmlParts.join(''));
      w.document.close();
      // Give the new window a moment to render then print
      setTimeout(() => { w.focus(); w.print(); }, 500);
    } catch (e) {
      console.error('PDF export failed', e);
    } finally {
      setExportMenuOpen(false);
    }
  }

  // Choose regions from shared list
  // Use numeric code (e.g. "11") as id — matches what the DB stores in property.regionId
  const regionOptions = [{ id: 'ALL', name: 'All Regions' }, ...REGIONS.map(r => ({ id: r.code ?? r.id, name: r.name }))];

  // State for API-driven datasets
  const [revenueSeries, setRevenueSeries] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });
  const [activePropsSeries, setActivePropsSeries] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });
  const [revenueByType, setRevenueByType] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });
  const [activePropsBreakdown, setActivePropsBreakdown] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] });
  const [invoiceStatusCounts, setInvoiceStatusCounts] = useState<Record<string, number>>({});

  function timeframeToRange(tf: string) {
    const to = new Date();
    let from = new Date();
    if (tf === '24h') from = new Date(Date.now() - 24 * 3600 * 1000);
    if (tf === '7d') from = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    if (tf === '30d') from = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    if (tf === '12m') from = new Date(Date.now() - 365 * 24 * 3600 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  // Fetch from API when region/timeframe/group change
  useEffect(() => {
    const { from, to } = timeframeToRange(timeframe as string);
    const base = '';
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const qs = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&region=${encodeURIComponent(region)}`;

        const safeJsonParse = async (response: Response) => {
          if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
          }
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Expected JSON but got ${contentType}: ${text.substring(0, 100)}`);
          }
          return response.json();
        };

        const [rev, ap, rbt, apb, invs] = await Promise.all([
          fetch(`${base}/admin/stats/revenue-series${qs}`, { credentials: 'include' }).then(safeJsonParse),
          fetch(`${base}/admin/stats/active-properties-series${qs}`, { credentials: 'include' }).then(safeJsonParse),
          fetch(`${base}/admin/stats/revenue-by-type${qs}`, { credentials: 'include' }).then(safeJsonParse),
          fetch(`${base}/admin/stats/active-properties-breakdown?groupBy=${encodeURIComponent(groupBy)}&region=${encodeURIComponent(region)}`, { credentials: 'include' }).then(safeJsonParse),
          fetch(`${base}/admin/stats/invoice-status?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { credentials: 'include' }).then(safeJsonParse),
        ]);

        setRevenueSeries(rev || { labels: [], data: [] });
        setActivePropsSeries(ap || { labels: [], data: [] });
        setRevenueByType(rbt || { labels: [], data: [] });
        setActivePropsBreakdown(apb || { labels: [], data: [] });
        setInvoiceStatusCounts(invs || {});
      } catch (err: any) {
        console.error('Failed to load reports', err);
        setError(err?.message || 'Failed to load report data');
        setRevenueSeries({ labels: [], data: [] });
        setActivePropsSeries({ labels: [], data: [] });
        setRevenueByType({ labels: [], data: [] });
        setActivePropsBreakdown({ labels: [], data: [] });
        setInvoiceStatusCounts({});
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [region, timeframe, groupBy]);

  // ── Derived chart data ────────────────────────────────────────────────────
  const trendLabels = revenueSeries.labels.length ? revenueSeries.labels : activePropsSeries.labels;

  // Revenue area chart (smooth gradient line)
  const revenueAreaData = {
    labels: trendLabels,
    datasets: [{
      label: 'Revenue (TZS)',
      data: revenueSeries.data || [],
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.12)',
      fill: true,
      tension: 0.45,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: '#6366f1',
      borderWidth: 2.5,
    }],
  } as any;

  // Active properties smooth line
  const activePropsData = {
    labels: trendLabels,
    datasets: [{
      label: 'Active Properties',
      data: activePropsSeries.data || [],
      borderColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,0.10)',
      fill: true,
      tension: 0.45,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: '#10b981',
      borderWidth: 2.5,
    }],
  } as any;

  // Property type bar chart (horizontal for readability)
  const propTypeLabels = revenueByType.labels.length ? revenueByType.labels : activePropsBreakdown.labels;
  const propertyTypeData = {
    labels: propTypeLabels,
    datasets: [
      {
        label: 'Revenue (TZS)',
        data: revenueByType.data || [],
        backgroundColor: propTypeLabels.map((_, i) => [
          'rgba(99,102,241,0.80)', 'rgba(16,185,129,0.80)', 'rgba(245,158,11,0.80)',
          'rgba(239,68,68,0.80)', 'rgba(14,165,233,0.80)', 'rgba(168,85,247,0.80)',
        ][i % 6]),
        borderRadius: 6,
        yAxisID: 'y',
      },
      {
        label: 'Active Properties',
        data: activePropsBreakdown.data || [],
        backgroundColor: 'rgba(0,0,0,0)',
        borderColor: '#f59e0b',
        borderWidth: 2,
        type: 'line' as any,
        tension: 0.3,
        pointRadius: 5,
        pointBackgroundColor: '#f59e0b',
        yAxisID: 'y1',
      },
    ],
  } as any;

  // Invoice donut
  const invoiceLabels = Object.keys(invoiceStatusCounts || {});
  const invoiceValues = invoiceLabels.map(l => invoiceStatusCounts[l] ?? 0);
  const INVOICE_COLORS: Record<string, string> = {
    PAID: '#10b981', APPROVED: '#6366f1', RECEIVED: '#14b8a6',
    REQUESTED: '#f59e0b', REJECTED: '#ef4444', PENDING: '#94a3b8',
  };
  const invoiceDonutData = {
    labels: invoiceLabels,
    datasets: [{
      data: invoiceValues,
      backgroundColor: invoiceLabels.map(l => INVOICE_COLORS[l] ?? '#94a3b8'),
      borderWidth: 0,
      hoverOffset: 8,
    }],
  } as any;

  // Invoice bar (horizontal)
  const invoiceBarData = {
    labels: invoiceLabels,
    datasets: [{
      label: 'Count',
      data: invoiceValues,
      backgroundColor: invoiceLabels.map(l => INVOICE_COLORS[l] ?? '#94a3b8'),
      borderRadius: 6,
    }],
  } as any;

  // KPI totals
  const totalInvoices = invoiceValues.reduce((s, v) => s + v, 0);
  const paidInvoices = invoiceStatusCounts['PAID'] ?? 0;
  const conversionRate = totalInvoices ? Math.round((paidInvoices / totalInvoices) * 100) : 0;

  // Shared chart option helpers
  const lineOpts = (_ytitle: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: { legend: { display: false }, tooltip: TOOLTIP_STYLE },
    scales: {
      x: { ...AXIS_STYLE },
      y: {
        ...AXIS_STYLE,
        beginAtZero: true,
        title: { display: false },
        ticks: { ...AXIS_STYLE.ticks, callback: (v: any) => fmtK(Number(v)) },
      },
    },
  });

  return (
    <div id="general-reports-page" className="page-content">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

        {/* ── Header bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">General Reports</h2>
            <p className="text-xs text-slate-400 mt-0.5">{fmtTFLabel(timeframe)} · {regionOptions.find(r => r.id === region)?.name ?? region}</p>
          </div>

          {/* Tab toggle */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 gap-1">
            {(['financial', 'invoices'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                {tab === 'financial' ? 'Financial' : 'Invoices'}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Region */}
            <select value={region} onChange={e => setRegion(e.target.value)}
              className="h-8 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {regionOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>

            {/* Timeframe pills */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden">
              {(['24h','7d','30d','12m'] as const).map(tf => (
                <button key={tf} onClick={() => setTimeframe(tf)}
                  className={`h-8 px-3 text-xs font-semibold border-r border-slate-200 last:border-0 transition-colors ${timeframe === tf ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {tf}
                </button>
              ))}
            </div>

            {/* Group pills (Financial only) */}
            {activeTab === 'financial' && (
              <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden">
                {([['propertyType','By Type'],['region','By Region']] as const).map(([v, label]) => (
                  <button key={v} onClick={() => setGroupBy(v)}
                    className={`h-8 px-3 text-xs font-semibold border-r border-slate-200 last:border-0 transition-colors ${groupBy === v ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Export */}
            <div className="relative" ref={exportMenuRef}>
              <button onMouseDown={e => e.preventDefault()} onClick={() => setExportMenuOpen(o => !o)}
                className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors">
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl border border-slate-200 shadow-lg z-20 overflow-hidden">
                  {([['CSV', exportAllCSV], ['PNGs', exportAllPNGs], ['PDF', exportAllPDF]] as [string, () => void][]).map(([label, fn]) => (
                    <button key={label} onMouseDown={e => e.preventDefault()} onClick={() => fn()}
                      className="block w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      Export {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {loading && <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />}
          </div>
        </div>

        {/* ── Error banner ───────────────────────────────────────────────── */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="p-6 space-y-6">

          {/* ── FINANCIAL TAB ──────────────────────────────────────────── */}
          {activeTab === 'financial' && (
            <>
              {/* Revenue area chart — full width */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm font-bold text-slate-800">Revenue Trend</div>
                    <div className="text-xs text-slate-400 mt-0.5">{fmtTFLabel(timeframe)}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-indigo-500 font-semibold bg-indigo-50 px-3 py-1 rounded-full">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 inline-block" /> TZS
                  </div>
                </div>
                <div style={{ height: 260 }}>
                  <Chart type="line" height={260} data={revenueAreaData} options={lineOpts('Revenue')} onCanvas={c => { revenueAreaCanvas.current = c; }} />
                </div>
              </div>

              {/* Property type + Active properties side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Property type bar+line */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm font-bold text-slate-800">{groupBy === 'propertyType' ? 'Revenue by Property Type' : 'Revenue by Region'}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Revenue bars · Properties line</div>
                    </div>
                  </div>
                  <div style={{ height: 260 }}>
                    <Chart type="bar" height={260} data={propertyTypeData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                          legend: { position: 'bottom', labels: { font: { size: 11 }, color: '#64748b', boxWidth: 12, padding: 14 } },
                          tooltip: TOOLTIP_STYLE,
                        },
                        scales: {
                          x: { ...AXIS_STYLE },
                          y: { ...AXIS_STYLE, title: { display: false }, ticks: { ...AXIS_STYLE.ticks, callback: (v: any) => fmtK(Number(v)) } },
                          y1: { ...AXIS_STYLE, position: 'right', grid: { drawOnChartArea: false }, title: { display: false }, ticks: { ...AXIS_STYLE.ticks, callback: (v: any) => String(v) } },
                        },
                      }}
                      onCanvas={c => { propertyTypeCanvas.current = c; }} />
                  </div>
                </div>

                {/* Active properties area */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm font-bold text-slate-800">Active Properties</div>
                      <div className="text-xs text-slate-400 mt-0.5">{fmtTFLabel(timeframe)}</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Count
                    </div>
                  </div>
                  <div style={{ height: 260 }}>
                    <Chart type="line" height={260} data={activePropsData}
                      options={{ ...lineOpts('Properties'), scales: { ...lineOpts('Properties').scales, y: { ...lineOpts('Properties').scales.y, ticks: { ...AXIS_STYLE.ticks, callback: (v: any) => String(Math.round(Number(v))) } } } }}
                      onCanvas={c => { activePropsCanvas.current = c; }} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── INVOICES TAB ───────────────────────────────────────────── */}
          {activeTab === 'invoices' && (
            <>
              {/* KPI tiles */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Invoices', value: totalInvoices, color: 'text-slate-800', bg: 'bg-slate-50' },
                  { label: 'Paid', value: invoiceStatusCounts['PAID'] ?? 0, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                  { label: 'Approved', value: invoiceStatusCounts['APPROVED'] ?? 0, color: 'text-indigo-700', bg: 'bg-indigo-50' },
                  { label: 'Rejected', value: invoiceStatusCounts['REJECTED'] ?? 0, color: 'text-red-700', bg: 'bg-red-50' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`rounded-2xl border border-slate-100 ${bg} p-5 shadow-sm`}>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-1">{label}</div>
                    <div className={`text-3xl font-extrabold ${color}`}>{loading ? '…' : value}</div>
                    {label === 'Paid' && totalInvoices > 0 && (
                      <div className="mt-2">
                        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${conversionRate}%` }} />
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">{conversionRate}% payment rate</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Donut */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="text-sm font-bold text-slate-800 mb-1">Status Distribution</div>
                  <div className="text-xs text-slate-400 mb-4">{fmtTFLabel(timeframe)}</div>
                  <div style={{ height: 280 }}>
                    <Chart type="doughnut" height={280} data={invoiceDonutData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '62%',
                        plugins: {
                          legend: { position: 'bottom', labels: { font: { size: 11 }, color: '#64748b', boxWidth: 12, padding: 16 } },
                          tooltip: TOOLTIP_STYLE,
                        },
                      }}
                      onCanvas={c => { invoiceDonutCanvas.current = c; }} />
                  </div>
                </div>

                {/* Horizontal bar breakdown */}
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="text-sm font-bold text-slate-800 mb-1">Invoice Counts by Status</div>
                  <div className="text-xs text-slate-400 mb-4">Absolute volume per status</div>
                  <div style={{ height: 280 }}>
                    <Chart type="bar" height={280} data={invoiceBarData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y' as const,
                        plugins: { legend: { display: false }, tooltip: TOOLTIP_STYLE },
                        scales: {
                          x: { ...AXIS_STYLE, beginAtZero: true, ticks: { ...AXIS_STYLE.ticks, callback: (v: any) => String(v) } },
                          y: { ...AXIS_STYLE },
                        },
                      }}
                      onCanvas={c => { invoiceBarCanvas.current = c; }} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

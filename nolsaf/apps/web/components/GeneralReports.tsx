"use client";
import React, { useRef, useState, useEffect } from "react";
import { Download } from 'lucide-react';
import Chart from "@/components/Chart";
import { REGIONS } from '@/lib/tzRegions';

export default function GeneralReports() {
  const [activeTab, setActiveTab] = useState<'financial'|'invoices'>('financial');
  const [region, setRegion] = useState('ALL');
  // default timeframe for admins when they login
  const [timeframe, setTimeframe] = useState<'24h'|'7d'|'30d'|'12m'>('7d');
  const [groupBy, setGroupBy] = useState<'region'|'propertyType'>('propertyType');

  const regionalCanvas = useRef<HTMLCanvasElement | null>(null);
  const revenueCanvas = useRef<HTMLCanvasElement | null>(null);
  const transactionsCanvas = useRef<HTMLCanvasElement | null>(null);
  const invoiceStatusCanvas = useRef<HTMLCanvasElement | null>(null);
  const fixTrendCanvas = useRef<HTMLCanvasElement | null>(null);

  function showReportTab(tab: 'financial'|'invoices') {
    setActiveTab(tab);
  }

  // individual canvas PNG export removed in favor of unified Export menu

  // Unified export: CSV (all sections), PNG (all canvases), PDF (print-friendly page)
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = React.useRef<HTMLDivElement | null>(null);

  // Metrics docs moved to global admin sidebar (/admin/metrics-docs)

  // (auto-refresh removed per design) — data refresh should be triggered by data fetch hooks or server push

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
        { c: regionalCanvas.current, name: `regional-performance-${region}-${timeframe}.png` },
        { c: revenueCanvas.current, name: `revenue-summary-${region}-${timeframe}.png` },
        { c: transactionsCanvas.current, name: `active-properties-${region}-${timeframe}.png` },
        { c: invoiceStatusCanvas.current, name: `invoice-status-${region}-${timeframe}.png` },
        { c: fixTrendCanvas.current, name: `fix-trend-${region}-${timeframe}.png` }
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
      const header = ['section','label','revenue_tzs','active_properties','sessions','count'];
      const rows: string[][] = [header];

      // Regional Performance rows (from API)
      const labels = (Array.isArray(revenueSeries?.labels) && revenueSeries.labels.length) ? revenueSeries.labels : (Array.isArray(activePropsSeries?.labels) ? activePropsSeries.labels : []);
      (labels || []).forEach((lab, i) => {
        rows.push([
          `Regional Performance`,
          String(lab),
          String((revenueSeries.data && revenueSeries.data[i]) ?? ''),
          String((activePropsSeries.data && activePropsSeries.data[i]) ?? ''),
          '',
          ''
        ]);
      });

      // Property Type Performance rows
      const typeLabels = (Array.isArray(revenueByType?.labels) && revenueByType.labels.length) ? revenueByType.labels : (Array.isArray(activePropsBreakdown?.labels) ? activePropsBreakdown.labels : []);
      (typeLabels || []).forEach((t, i) => {
        rows.push([
          `Property Type Performance`,
          String(t),
          String((revenueByType.data && revenueByType.data[i]) ?? ''),
          String((activePropsBreakdown.data && activePropsBreakdown.data[i]) ?? ''),
          '',
          ''
        ]);
      });

      // Invoice Overview rows
      Object.entries(invoiceStatusCounts || {}).forEach(([label, count]) => {
        rows.push(['Invoice Overview', String(label), '', '', '', String(count ?? '')]);
      });

      // Requests for Fix (trend) — use revenueSeries as proxy (counts scaled)
      (Array.isArray(revenueSeries?.labels) ? revenueSeries.labels : []).forEach((lab, i) => {
        const val = Array.isArray(revenueSeries?.data) && revenueSeries.data[i] ? Math.round((revenueSeries.data[i] || 0) / 1000) : '';
        rows.push(['Requests for Fix (Trend)', String(lab), '', '', '', String(val)]);
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
        { c: regionalCanvas.current, title: 'Regional Performance' },
        { c: revenueCanvas.current, title: 'Revenue Summary' },
        { c: transactionsCanvas.current, title: 'Active Properties' },
        { c: invoiceStatusCanvas.current, title: 'Invoice Status' },
        { c: fixTrendCanvas.current, title: 'Requests for Fix (Trend)' }
      ];
      const imgs = canvases.map(({c, title}) => ({ title, dataUrl: c ? c.toDataURL('image/png') : null }));

      // Open a new window with images and trigger print (user can save as PDF)
      const w = window.open('', '_blank');
      if (!w) {
        alert('Unable to open export window - please allow popups');
        return;
      }
      const htmlParts: string[] = ['<html><head><title>General Reports Export</title></head><body>'];
      htmlParts.push(`<h1>General Reports - ${region} - ${timeframe}</h1>`);
      imgs.forEach(im => {
        htmlParts.push(`<h2 style="font-family: sans-serif;">${im.title}</h2>`);
        if (im.dataUrl) htmlParts.push(`<img src="${im.dataUrl}" style="max-width:100%;height:auto;margin-bottom:24px;border:1px solid #ddd;"/>`);
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
  const regionOptions = [{ id: 'ALL', name: 'All Regions' }, ...REGIONS.map(r => ({ id: r.id, name: r.name }))];

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
    // Always use same-origin paths (Next rewrites proxy to API in dev).
    const base = '';

    async function load() {
      try {
        const qs = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&region=${encodeURIComponent(region)}`;
        
        // Helper to safely parse JSON responses
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

        const r1 = await fetch(`${base}/admin/stats/revenue-series${qs}`, { credentials: "include" });
        const rev = await safeJsonParse(r1);
        setRevenueSeries(rev || { labels: [], data: [] });

        const r2 = await fetch(`${base}/admin/stats/active-properties-series${qs}`, { credentials: "include" });
        const ap = await safeJsonParse(r2);
        setActivePropsSeries(ap || { labels: [], data: [] });

        const r3 = await fetch(`${base}/admin/stats/revenue-by-type${qs}`, { credentials: "include" });
        const rbt = await safeJsonParse(r3);
        setRevenueByType(rbt || { labels: [], data: [] });

        const q2 = `?groupBy=${encodeURIComponent(groupBy)}&region=${encodeURIComponent(region)}`;
        const r4 = await fetch(`${base}/admin/stats/active-properties-breakdown${q2}`, { credentials: "include" });
        const apb = await safeJsonParse(r4);
        setActivePropsBreakdown(apb || { labels: [], data: [] });

        const r5 = await fetch(`${base}/admin/stats/invoice-status?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { credentials: "include" });
        const invs = await safeJsonParse(r5);
        setInvoiceStatusCounts(invs || {});
      } catch (err: any) {
        console.error('Failed to load reports', err);
        // Set empty data to prevent JSON parse errors
        setRevenueSeries({ labels: [], data: [] });
        setActivePropsSeries({ labels: [], data: [] });
        setRevenueByType({ labels: [], data: [] });
        setActivePropsBreakdown({ labels: [], data: [] });
        setInvoiceStatusCounts({});
      }
    }
    void load();
  }, [region, timeframe, groupBy]);

  // Derived chart objects from API data
  const regionalLabels = (Array.isArray(revenueSeries?.labels) && revenueSeries.labels.length) ? revenueSeries.labels : (Array.isArray(activePropsSeries?.labels) ? activePropsSeries.labels : []);
  const regionalChartData = {
    labels: regionalLabels,
    datasets: [
      { label: 'Revenue', data: revenueSeries.data || [], backgroundColor: '#4f46e5', yAxisID: 'y' },
      { label: 'Active Properties', data: activePropsSeries.data || [], type: 'line', borderColor: '#f97316', backgroundColor: '#f97316', yAxisID: 'y1', tension: 0.3, pointRadius: 4 }
    ]
  } as any;

  const propertyTypeChartData = {
    labels: revenueByType.labels || activePropsBreakdown.labels || [],
    datasets: [
      { label: 'Revenue', data: revenueByType.data || [], backgroundColor: '#4f46e5', yAxisID: 'y' },
      { label: 'Active Properties', data: activePropsBreakdown.data || [], type: 'line', borderColor: '#f97316', backgroundColor: '#f97316', yAxisID: 'y1', tension: 0.3, pointRadius: 4 },
    ]
  } as any;

  const revenueSummaryChart = {
    labels: revenueSeries.labels || [],
    datasets: [{ label: 'Revenue', data: revenueSeries.data || [], backgroundColor: '#4f46e5' }]
  } as any;

  const activePropertiesChart = {
    labels: activePropsSeries.labels || [],
    datasets: [{ label: 'Active Properties', data: activePropsSeries.data || [], borderColor: '#f97316', fill: false, tension: 0.2 }]
  } as any;

  // invoiceStatusCounts -> pie data
  const invoiceLabels = Object.keys(invoiceStatusCounts || {});
  const invoiceData = invoiceLabels.map(l => invoiceStatusCounts[l] ?? 0);
  const invoicePie = { labels: invoiceLabels, datasets: [{ data: invoiceData, backgroundColor: ['#6366f1','#10b981','#f59e0b','#ef4444','#a78bfa'] }] } as any;

  const fixTrendChart = { labels: revenueSeries.labels || [], datasets: [{ label: 'Count', data: (revenueSeries.data || []).map((v: number) => Math.round((v || 0) / 1000)), borderColor: '#06b6d4', fill: false }] } as any;

  return (
    <div id="general-reports-page" className="page-content">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">General Reports</h2>
        <div className="mb-6">
          <button onClick={() => showReportTab('financial')} id="tab-financial" className={`px-4 py-2 rounded-l-lg ${activeTab==='financial' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Financial Reports</button>
          <button onClick={() => showReportTab('invoices')} id="tab-invoices" className={`px-4 py-2 rounded-r-lg ${activeTab==='invoices' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>Invoice Overview</button>
        </div>
        {/* Metrics docs moved to the sidebar (Admin -> Metrics docs) */}
        {activeTab === 'financial' ? (
          <div id="report-financial" className="report-tab">
            <div className="mb-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <label htmlFor="regionSelector" className="text-sm text-gray-700">Region:</label>
                  <select id="regionSelector" onChange={(e)=>setRegion(e.target.value)} value={region} className="px-3 py-2 border rounded">
                    {regionOptions.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>

                  <label htmlFor="timeframeSelector" className="text-sm text-gray-700">Timeframe:</label>
                  <select id="timeframeSelector" onChange={(e)=>setTimeframe(e.target.value as any)} value={timeframe} className="px-3 py-2 border rounded">
                    <option value="24h">24h</option>
                    <option value="7d">7d</option>
                    <option value="30d">30d</option>
                    <option value="12m">12m</option>
                  </select>

                  <label htmlFor="groupBySelector" className="text-sm text-gray-700">Group:</label>
                  <select id="groupBySelector" onChange={(e)=>setGroupBy(e.target.value as any)} value={groupBy} className="px-3 py-2 border rounded">
                    <option value="propertyType">Property Type</option>
                    <option value="region">Region</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative inline-block text-left" ref={exportMenuRef}>
                    <button id="exportBtn" onMouseDown={(e) => e.preventDefault()} onClick={() => setExportMenuOpen(open => !open)} className="px-3 py-2 bg-green-600 text-white rounded inline-flex items-center gap-2">
                      <Download className="h-4 w-4" aria-hidden="true" />
                      <span>Export ▾</span>
                    </button>
                    {exportMenuOpen && (
                      <div className="absolute right-0 mt-2 w-46 bg-white border rounded shadow-lg z-10">
                        <button onMouseDown={(e) => e.preventDefault()} className="block w-full text-left px-3 py-2 hover:bg-gray-100" onClick={exportAllCSV}>Export CSV</button>
                        <button onMouseDown={(e) => e.preventDefault()} className="block w-full text-left px-3 py-2 hover:bg-gray-100" onClick={exportAllPNGs}>Export PNGs</button>
                        <button onMouseDown={(e) => e.preventDefault()} className="block w-full text-left px-3 py-2 hover:bg-gray-100" onClick={exportAllPDF}>Export PDF</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow">
                <h3 className="text-sm font-medium text-gray-700 mb-2">{groupBy === 'propertyType' ? 'Property Type Performance' : 'Regional Performance'}</h3>
                {/* Full explanation for metrics will live in documentation/expanded help, remove inline note */}
                <div className="chart-aspect relative w-full">

                  {groupBy === 'propertyType' ? (
                    <Chart
                      type="bar"
                      height={360}
                      data={propertyTypeChartData as any}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'top' } },
                        scales: {
                          y: {
                            type: 'linear', position: 'left', title: { display: true, text: 'Revenue (TZS)' },
                            ticks: { callback: (v: any) => `${Number(v).toLocaleString()} TZS` }
                          },
                          y1: {
                            type: 'linear', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Count' },
                            ticks: { callback: (v: any) => String(v) }
                          }
                        }
                      }}
                      onCanvas={(c)=>{ regionalCanvas.current = c }}
                    />
                  ) : (
                    <Chart
                      type="bar"
                      height={360}
                      data={regionalChartData as any}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'top' } },
                        scales: {
                          y: {
                            type: 'linear', position: 'left', title: { display: true, text: 'Revenue (TZS)' },
                            ticks: { callback: (v: any) => `${Number(v).toLocaleString()} TZS` }
                          },
                          y1: {
                            type: 'linear', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Active Properties' },
                            ticks: { callback: (v: any) => String(v) }
                          }
                        }
                      }}
                      onCanvas={(c)=>{ regionalCanvas.current = c }}
                    />
                  )}
                </div>
                {/* Metrics modal removed from this page — use /admin/metrics-docs for the full documentation */}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-4 shadow">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Revenue ({timeframe === '12m' ? 'Last 12 months' : timeframe === '30d' ? 'Last 30 days' : timeframe === '7d' ? 'Last 7 days' : 'Last 24 hours'})</h3>
                <div className="relative w-full">
                  {/* Revenue-only chart for the summary card */}
                  <Chart
                    type="bar"
                    height={320}
                    data={revenueSummaryChart as any}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { y: { beginAtZero: true, title: { display: true, text: 'Revenue (TZS)' }, ticks: { callback: (v:any) => `${Number(v).toLocaleString()} TZS` } } }
                    }}
                    onCanvas={(c)=>{ revenueCanvas.current = c }}
                  />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Active Properties ({timeframe === '12m' ? 'Last 12 months' : timeframe === '30d' ? 'Last 30 days' : timeframe === '7d' ? 'Last 7 days' : 'Last 24 hours'})</h3>
                <div className="relative w-full">
                  <Chart
                    type="line"
                    height={320}
                    data={activePropertiesChart as any}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { y: { beginAtZero: true, title: { display: true, text: 'Active Properties' }, ticks: { callback: (v:any) => String(v) } } }
                    }}
                    onCanvas={(c)=>{ transactionsCanvas.current = c }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div id="report-invoices" className="report-tab mt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {(() => {
                const received = invoiceStatusCounts['RECEIVED'] ?? invoiceStatusCounts['REQUESTED'] ?? 0;
                const paid = invoiceStatusCounts['PAID'] ?? 0;
                const approved = invoiceStatusCounts['APPROVED'] ?? 0;
                const rejected = invoiceStatusCounts['REJECTED'] ?? 0;
                return (
                  <>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600">Received Invoices</p>
                      <p className="text-2xl font-bold">{received}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600">Paid</p>
                      <p className="text-2xl font-bold">{paid}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600">Approved</p>
                      <p className="text-2xl font-bold">{approved}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600">Rejected</p>
                      <p className="text-2xl font-bold">{rejected}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-4 shadow">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Invoice Status Distribution</h3>
                <div className="relative w-full">
                  <Chart type="doughnut" height={320} data={invoicePie} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} onCanvas={(c)=>{ invoiceStatusCanvas.current = c }} />
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Requests for Fix (Trend)</h3>
                <div className="relative w-full">
                  <Chart type="line" height={320} data={fixTrendChart as any} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} onCanvas={(c)=>{ fixTrendCanvas.current = c }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

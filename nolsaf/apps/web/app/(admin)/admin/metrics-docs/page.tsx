"use client";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Home, Wallet, Calendar } from 'lucide-react';

export default function MetricsDocsPage() {
  const [propsCount, setPropsCount] = useState<number | null>(null);
  const [grossAmount, setGrossAmount] = useState<number | null>(null);
  const [bookingsCount, setBookingsCount] = useState<number | null>(null);
  const [last7BookingsCount, setLast7BookingsCount] = useState<number | null>(null);
  const [propsByType, setPropsByType] = useState<Array<{ label: string; value: number }>>([]);
  const [revenueByType, setRevenueByType] = useState<Array<{ label: string; value: number }>>([]);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    const a = axios.create({ baseURL: base });
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) a.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    (async () => {
      try {
        const ov = await a.get('/admin/stats/overview');
        const data = ov?.data ?? {};
        setPropsCount(data.propertiesCount ?? null);
        setGrossAmount(data.grossAmount ?? null);
      } catch (e) {
        // ignore
      }

      try {
        const b = await a.get('/admin/bookings', { params: { page: 1, pageSize: 1 } });
        setBookingsCount(b?.data?.total ?? null);
      } catch (e) {
        // ignore
      }

      // last-7-days bookings (use bookings counts endpoint)
      try {
        const today = new Date();
        const end = today.toISOString().slice(0, 10);
        const startDate = new Date();
        startDate.setDate(today.getDate() - 6);
        const start = startDate.toISOString().slice(0, 10);
        const res = await a.get('/admin/bookings/counts', { params: { start, end } });
        const payload = res?.data ?? {};
        const sum = Object.values(payload).reduce((s: number, v: any) => s + (Number(v?.total ?? 0)), 0);
        setLast7BookingsCount(Number.isFinite(sum) ? sum : null);
      } catch (e) {
        // ignore
      }

      // breakdown: active properties by type
      try {
        const r = await a.get('/admin/stats/active-properties-breakdown', { params: { groupBy: 'propertyType' } });
        const body = r?.data ?? {};
        if (Array.isArray(body.labels) && Array.isArray(body.data)) {
          setPropsByType(body.labels.map((lab: string, i: number) => ({ label: lab, value: Number(body.data[i] ?? 0) })));
        }
      } catch (e) {}

      // revenue by type
      try {
        const r2 = await a.get('/admin/stats/revenue-by-type');
        const body = r2?.data ?? {};
        if (Array.isArray(body.labels) && Array.isArray(body.data)) {
          setRevenueByType(body.labels.map((lab: string, i: number) => ({ label: lab, value: Number(body.data[i] ?? 0) })));
        }
      } catch (e) {}
    })();
  }, []);

  return (
    <div className="page-content">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-full bg-slate-50 p-3 inline-flex items-center justify-center">
            <BarChart className="h-6 w-6 text-slate-700" aria-hidden />
          </div>
          <h1 className="mt-3 text-2xl font-semibold">Metrics documentation</h1>
          <p className="mt-2 text-sm text-gray-600 max-w-prose">Reference for dashboard metrics, definitions, and data-sources. Use this page to document how each metric is calculated, its refresh cadence, and any caveats for interpretation.</p>

          {/* summary cards */}
          <div className="mt-4 w-full flex justify-center">
              <div className="flex gap-3 flex-wrap justify-center">
              <div className="p-3 bg-white border rounded-lg text-center min-w-[160px] flex items-center gap-3">
                <div className="rounded-full bg-blue-50 p-2 inline-flex items-center justify-center">
                  <Home className="h-5 w-5 text-blue-600" />
                </div>
                  <div>
                    <div className="text-xs text-gray-500">Active Properties</div>
                    <div className="text-lg font-semibold mt-1">{propsCount ?? '—'}</div>
                  </div>
              </div>
              <div className="p-3 bg-white border rounded-lg text-center min-w-[160px] flex items-center gap-3">
                <div className="rounded-full bg-emerald-50 p-2 inline-flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                </div>
                  <div>
                    <div className="text-xs text-gray-500">Revenue (TZS)</div>
                    <div className="text-lg font-semibold mt-1">{grossAmount != null ? new Intl.NumberFormat().format(grossAmount) : '—'}</div>
                  </div>
              </div>
              <div className="p-3 bg-white border rounded-lg text-center min-w-[160px] flex items-center gap-3">
                <div className="rounded-full bg-slate-50 p-2 inline-flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-slate-700" />
                </div>
                  <div>
                    <div className="text-xs text-gray-500">Bookings</div>
                    <div className="text-lg font-semibold mt-1">{bookingsCount ?? '—'}</div>
                    <div className="text-xs text-gray-400 mt-1">Last 7 days: <span className="font-medium">{last7BookingsCount ?? '—'}</span></div>
                  </div>
              </div>
            </div>
          </div>

        </div>

  {/* data wiring: overview + bookings count fetched client-side */}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 text-base text-gray-800">
            <h3 className="font-semibold text-lg">Overview (header data)</h3>
            <div className="mt-2 space-y-1 text-sm text-gray-700">
              <div>Region: <span className="font-medium">All</span></div>
              <div>Timeframe: <span className="font-medium">7d</span></div>
              <div>Group by: <span className="font-medium">Property Type</span></div>
            </div>

            <div className="mt-4 space-y-4 text-sm text-gray-700">
              <div>
                <h4 className="font-medium text-base">Active Properties</h4>
                <p className="mt-1 text-sm text-gray-600">Approved and currently listed properties. This counts properties that are visible/available on the platform (not individual bookings).</p>
              </div>
              <div>
                <h4 className="font-medium text-base">Revenue (TZS)</h4>
                <p className="mt-1 text-sm text-gray-600">Total value of bookings attributed to properties in the selected region/timeframe. Values are shown in Tanzanian Shillings (TZS).</p>
              </div>
            </div>
          </div>
          <div className="md:col-span-1 text-sm text-gray-700">
            <h4 className="font-semibold text-base">Sidebar documentation</h4>
            <p className="text-sm text-gray-700 mt-2">Expanded reference for each dashboard item, with quick formulas, the primary data sources, how often the metric is updated, and who to contact when numbers look wrong.</p>

            <div className="mt-3">
              <h5 className="text-base font-medium">Metric formulas</h5>
              <div className="text-sm text-gray-700 mt-2 space-y-2">
                <div>
                  <strong>Active Properties</strong>
                  <div>Definition: Number of properties currently visible/listed on the platform.</div>
                  <div className="mt-1">Formula: <code>COUNT(*) FROM properties WHERE status = &apos;APPROVED&apos;</code></div>
                </div>
                <div>
                  <strong>Revenue (TZS)</strong>
                  <div className="mt-1">Definition: Sum of booking/invoice totals attributed to properties in the selected period.</div>
                  <div className="mt-1">Formula: <code>SUM(invoice.total) WHERE status IN (&apos;APPROVED&apos;,&apos;PAID&apos;) AND (paidAt OR issuedAt) BETWEEN &lt;from&gt; AND &lt;to&gt;</code></div>
                </div>
                <div>
                  <strong>Bookings</strong>
                  <div className="mt-1">Definition: Number of booking records overlapping the selected date range.</div>
                  <div className="mt-1">Formula: <code>COUNT(*) FROM bookings WHERE checkIn &lt;= &lt;end&gt; AND checkOut &gt; &lt;start&gt;</code></div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <h5 className="text-base font-medium">Primary data sources</h5>
              <div className="text-sm text-gray-700 mt-2">
                The dashboard aggregates values from these canonical sources:
                <ul className="list-disc ml-4 mt-2">
                  <li><code>properties</code> table / <code>GET /admin/properties</code> — property metadata and status</li>
                  <li><code>invoices</code> table / <code>GET /admin/invoices</code> and <code>/admin/revenue/invoices</code> — billing and payout records</li>
                  <li><code>bookings</code> table / <code>GET /admin/bookings</code> — reservations and check-in/out dates</li>
                  <li>Computed series and aggregates via <code>GET /admin/stats/*</code> (revenue-series, active-properties-series, overview)</li>
                </ul>
              </div>
            </div>

            <div className="mt-4">
              <h5 className="text-base font-medium">Update cadence & freshness</h5>
              <div className="text-sm text-gray-700 mt-2 space-y-1">
                <div>• Real-time events: critical invoice/booking state changes emit socket events (e.g. <code>admin:invoice:paid</code>) which trigger client refreshes.</div>
                <div>• Aggregates/series: revenue and active-properties series are computed on request and may be cached; expect near-real-time values for recent transactions, and nightly batch recalculation for longer windows.</div>
                <div>• Note: if you depend on exact financial reconciliation use the receipts/paidAt fields (PAID) rather than provisional APPROVED totals.</div>
              </div>
            </div>

            <div className="mt-4">
              <h5 className="text-sm font-medium">Properties by type</h5>
              <div className="text-sm text-gray-700 mt-2 space-y-2">
                {propsByType.length === 0 ? (
                  <div className="text-sm text-gray-500">No breakdown available</div>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {propsByType.map((p) => (
                      <div key={p.label} className="px-2 py-1 bg-slate-50 text-slate-700 rounded-full text-sm border">
                        {p.label}: <span className="font-medium">{p.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <h5 className="text-sm font-medium">Revenue by type</h5>
              <div className="text-sm text-gray-700 mt-2 space-y-2">
                {revenueByType.length === 0 ? (
                  <div className="text-sm text-gray-500">No revenue breakdown available</div>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {revenueByType.map((r) => (
                      <div key={r.label} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm border">
                        {r.label}: <span className="font-medium">{new Intl.NumberFormat().format(r.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <h5 className="text-sm font-medium">Contact & discrepancy process</h5>
              <div className="text-sm text-gray-700 mt-2 space-y-1">
                <div>If numbers look incorrect:</div>
                <ol className="list-decimal ml-4">
                  <li>Check the raw endpoints listed above for matching rows.</li>
                  <li>Verify timestamps (paidAt vs issuedAt) and filtering date ranges used in the query.</li>
                  <li>Check recent socket events or background worker logs for failed jobs.</li>
                  <li>Contact finance@your-org.example or the data-team Slack channel #data-ops with the affected metric, time range, and a short description.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

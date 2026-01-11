"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Briefcase, Truck, Users, BarChart2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAdminHomeKpis, useAdminMonitoring, useAdminRecentActivities, useAdminSearch } from "./adminHomeHooks";

const Chart = dynamic(() => import("../../../../components/Chart"), { ssr: false });

type RevenueChartDataset = {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  tension: number;
  borderWidth: number;
  pointRadius: number;
};

type RevenueChartData = {
  labels: string[];
  datasets: [RevenueChartDataset, RevenueChartDataset];
};

export default function AdminHomePage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const revenueRef = useRef<HTMLDivElement | null>(null);
  const [hoursWindow, setHoursWindow] = useState<number>(24);
  const [rangeType, setRangeType] = useState<'hours' | 'months' | 'properties'>('hours');
  const [monthsWindow, setMonthsWindow] = useState<number>(1);
  const propertiesCount = 5;
  const [chartData, setChartData] = useState<RevenueChartData | null>(null);
  const [revenueOpen, setRevenueOpen] = useState<boolean>(false);
  const { query, setQuery, suggestions, selected, onKeyDown } = useAdminSearch((href) => router.push(href));
  const { monitoring } = useAdminMonitoring();
  const { recentActivities } = useAdminRecentActivities();
  const { driversPending, usersNew, revenueDelta, paymentsWaiting } = useAdminHomeKpis();
  

  function ClientTime({ iso }: { iso?: string | null }) {
    const [label, setLabel] = useState<string | null>(null);
    useEffect(() => {
      if (!iso) return;
      try {
        setLabel(new Date(iso).toLocaleString());
      } catch (e) {
        setLabel(iso || null);
      }
    }, [iso]);
    if (!label) return <span className="text-xs text-gray-400">&nbsp;</span>;
    return <span className="text-xs text-gray-400 whitespace-nowrap">{label}</span>;
  }

  useEffect(() => {
    // Intentionally do not auto-close the revenue panel on outside clicks or Escape.
    // The panel should be closed only via the on-page Close button to avoid accidental dismissal.
    return;
  }, [revenueOpen]);

  // Search + metrics polling are handled by hooks (no UI changes).

  // Auto-fetch/generate chart data whenever the selected hours range changes
  // Auto-generate chart data for Hours/Months/Properties whenever selection changes
  useEffect(() => {
    if (!revenueOpen) return;
    // set zero-filled placeholders immediately, then fetch real data to replace
    (async () => {
      try {
        // build placeholder labels and zero arrays
        const now = new Date();
        let placeholderLabels: string[] = [];
        if (rangeType === 'properties') {
          placeholderLabels = Array.from({ length: propertiesCount }).map((_, i) => `Property ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? i : ''}`);
        } else if (rangeType === 'hours') {
          placeholderLabels = Array.from({ length: hoursWindow }).map((_, i) => {
            const d = new Date(now.getTime() - (hoursWindow - 1 - i) * 60 * 60 * 1000);
            return `${String(d.getHours()).padStart(2, '0')}:00`;
          });
        } else {
          placeholderLabels = Array.from({ length: monthsWindow }).map((_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (monthsWindow - 1 - i), 1);
            return d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
          });
        }
        const zeros = placeholderLabels.map(() => 0);
        setChartData({
          labels: placeholderLabels,
          datasets: [
            {
              label: 'Commission',
              data: zeros,
              borderColor: 'rgba(2,102,94,0.95)',
              backgroundColor: 'rgba(2,102,94,0.06)',
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0,
            },
            {
              label: 'Subscription',
              data: zeros.slice(),
              borderColor: 'rgba(34,197,94,0.9)',
              backgroundColor: 'rgba(34,197,94,0.04)',
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0,
            },
          ],
        });

      } catch (err) {
        // ignore placeholder build errors — we'll still attempt fetch below
      }

      // fetch real data from backend series endpoint
      try {
        if (rangeType === 'properties') {
          const res = await fetch(`/api/admin/revenue/properties?top=${encodeURIComponent(String(propertiesCount))}`);
          if (!res.ok) throw new Error('no properties');
          const json = await res.json();
          const labels = Array.isArray(json) ? json.map((it: any) => it.name ?? it.title ?? `Property ${it.id ?? ''}`) : [];
          const commission = Array.isArray(json) ? json.map((it: any) => Number(it.commission ?? it.commission_total ?? it.commissionAmount ?? 0)) : [];
          const subscription = Array.isArray(json) ? json.map((it: any) => Number(it.subscription ?? it.subscription_total ?? it.subscriptionAmount ?? 0)) : [];
          setChartData({
            labels,
            datasets: [
              {
                label: 'Commission',
                data: commission,
                borderColor: 'rgba(2,102,94,0.95)',
                backgroundColor: 'rgba(2,102,94,0.06)',
                tension: 0.2,
                borderWidth: 2,
                pointRadius: 3,
              },
              {
                label: 'Subscription',
                data: subscription,
                borderColor: 'rgba(34,197,94,0.9)',
                backgroundColor: 'rgba(34,197,94,0.04)',
                tension: 0.2,
                borderWidth: 2,
                pointRadius: 3,
              },
            ],
          });
          return;
        }

        // build from/to for series endpoint
        const now = new Date();
        let from: string | undefined;
        let interval: string = 'day';
        if (rangeType === 'hours') {
          interval = 'hour';
          const fromDate = new Date(now.getTime() - (hoursWindow - 1) * 60 * 60 * 1000);
          from = fromDate.toISOString();
        } else if (rangeType === 'months') {
          interval = 'month';
          const fromDate = new Date(now.getFullYear(), now.getMonth() - (monthsWindow - 1), 1);
          from = fromDate.toISOString();
        }

        const q = new URLSearchParams();
        if (from) q.set('from', from);
        q.set('to', new Date().toISOString());
        q.set('interval', interval);

        const res = await fetch(`/api/admin/revenue/series?${q.toString()}`);
        if (!res.ok) throw new Error('no series');
        const rows = await res.json();
        // rows: [{ label, commission, subscription }, ...]
        const labels = Array.isArray(rows) ? rows.map((r: any) => String(r.label)) : [];
        const commission = Array.isArray(rows) ? rows.map((r: any) => Number(r.commission ?? 0)) : [];
        const subscription = Array.isArray(rows) ? rows.map((r: any) => Number(r.subscription ?? 0)) : [];
        setChartData({
          labels,
          datasets: [
            {
              label: 'Commission',
              data: commission,
              borderColor: 'rgba(2,102,94,0.95)',
              backgroundColor: 'rgba(2,102,94,0.06)',
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0,
            },
            {
              label: 'Subscription',
              data: subscription,
              borderColor: 'rgba(34,197,94,0.9)',
              backgroundColor: 'rgba(34,197,94,0.04)',
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0,
            },
          ],
        });
      } catch (e) {
        // If fetching fails we keep the zero placeholders set above.
      }
    })();
  }, [hoursWindow, monthsWindow, propertiesCount, rangeType, revenueOpen]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <header className="mb-8 bg-white/60 backdrop-blur-sm p-6 rounded-lg shadow-sm text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#02665e]">Admin-Home Page</h1>
          <p className="mt-2 text-lg text-gray-600 blink">Overview and quick access to Owners, Drivers and Users dashboards.</p>
          <div className="mt-4 flex justify-center" ref={containerRef}>
            <label htmlFor="admin-search" className="sr-only">Search Admin</label>
            <div className="relative w-full max-w-2xl">
              <input
                id="admin-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search owners, drivers, users, bookings..."
                className="w-full pl-4 pr-4 py-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                aria-autocomplete="list"
                aria-controls="admin-search-list"
              />

              {suggestions.length > 0 && (
                <ul id="admin-search-list" role="listbox" aria-label="Search results" className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-auto">
                  {suggestions.map((item, idx) => {
                    const label = item.label || item.name || String(item);
                    const href = item.href || item.url || `/admin/search?query=${encodeURIComponent(label)}`;
                    const isSel = idx === selected;
                    return (
                      <li
                        key={idx}
                        role="option"
                        aria-selected={isSel}
                        onMouseDown={(e) => { e.preventDefault(); router.push(href); }}
                        className={`px-3 py-2 cursor-pointer hover:bg-gray-50 ${isSel ? 'bg-gray-100' : ''}`}
                      >
                        <div className="text-sm font-medium text-gray-900">{label}</div>
                        {item.type && <div className="text-xs text-gray-500">{item.type}</div>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          <style>{`
            @keyframes blinkPulse { 
              0%, 100% { opacity: 1; }
              50% { opacity: 0.6; }
            }
            .blink { animation: blinkPulse 1s ease-in-out infinite; }
            @media (prefers-reduced-motion: reduce) { .blink { animation: none; } }
          `}</style>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 lg:mb-12">
          <Link href="/admin/owners" className="block p-5 pl-6 relative rounded-lg hover:shadow-md bg-white transition no-underline">
            <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md bg-emerald-400" aria-hidden />
            <span className="absolute left-0 right-0 top-0 h-1 rounded-t-md bg-emerald-400" aria-hidden />
            <div className="flex items-start gap-4">
              <Briefcase className="h-6 w-6 text-emerald-600 mt-1" />
              <div>
                  <div className="font-semibold text-gray-900">Owners</div>
                  <div className="text-sm text-gray-600">Properties to approve • <span className="text-red-600 font-medium">{monitoring ? monitoring.pendingApprovals : 0}</span></div>
              </div>
            </div>
          </Link>

          <Link href="/admin/drivers" className="block p-5 pl-6 relative rounded-lg hover:shadow-md bg-white transition no-underline">
            <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md bg-orange-400" aria-hidden />
            <span className="absolute left-0 right-0 top-0 h-1 rounded-t-md bg-orange-400" aria-hidden />
            <div className="flex items-start gap-4">
              <Truck className="h-6 w-6 text-amber-600 mt-1" />
              <div>
                <div className="font-semibold text-gray-900">Drivers</div>
                <div className="text-sm text-gray-600">Trips pending reconciliation • <span className="text-red-600 font-medium">{driversPending ?? 0}</span></div>
              </div>
            </div>
          </Link>

          <div ref={revenueRef} className="block p-5 pl-6 relative rounded-lg hover:shadow-md bg-white transition no-underline">
            <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md bg-sky-400" aria-hidden />
            <span className="absolute left-0 right-0 top-0 h-1 rounded-t-md bg-sky-400" aria-hidden />
            <div
              role="button"
              tabIndex={0}
              onClick={() => setRevenueOpen(true)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setRevenueOpen(true); }}
              className="flex items-start gap-4"
            >
              <BarChart2 className="h-7 w-7 text-sky-600 mt-1" />
              <div>
                <div className="font-semibold text-gray-900">NoLSAF Revenue</div>
                <div className="text-sm text-gray-600">Today vs yesterday • <span className="text-red-600 font-medium">{revenueDelta ?? '0%'}</span></div>
              </div>
            </div>
          </div>

          <Link href="/admin/users" className="block p-5 pl-6 relative rounded-lg hover:shadow-md bg-white transition no-underline">
            <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md bg-green-400" aria-hidden></span>
            <span className="absolute left-0 right-0 top-0 h-1 rounded-t-md bg-green-400" aria-hidden />
            <div className="flex items-start gap-4">
              <Users className="h-6 w-6 text-emerald-600 mt-1" />
              <div>
                <div className="font-semibold text-gray-900">Users</div>
                <div className="text-sm text-gray-600">New signups • <span className="text-red-600 font-medium">{usersNew ?? 0}</span></div>
              </div>
            </div>
          </Link>
        </section>

        

        {revenueOpen && (
          <div className="mb-8 lg:mb-16 p-4 rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Range</label>
                <div className="inline-flex rounded-md bg-gray-50 p-1 border">
                  <button
                    type="button"
                    onClick={() => setRangeType('hours')}
                    className={`px-3 py-1 rounded-full text-sm border ${rangeType === 'hours' ? 'bg-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-white'}`}
                  >
                    Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => setRangeType('months')}
                    className={`mx-1 px-3 py-1 rounded-full text-sm border ${rangeType === 'months' ? 'bg-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-white'}`}
                  >
                    Months
                  </button>
                  <button
                    type="button"
                    onClick={() => setRangeType('properties')}
                    className={`px-3 py-1 rounded-full text-sm border ${rangeType === 'properties' ? 'bg-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-white'}`}
                  >
                    Properties
                  </button>
                </div>
              </div>

              <div>
                {rangeType === 'hours' && (
                  <select title="Hours range" aria-label="Hours range" className="border rounded px-2 py-1" value={hoursWindow} onChange={(e) => setHoursWindow(Number(e.target.value))}>
                    <option value={6}>Last 6 hours</option>
                    <option value={12}>Last 12 hours</option>
                    <option value={24}>Last 24 hours</option>
                    <option value={48}>Last 48 hours</option>
                  </select>
                )}

                {rangeType === 'months' && (
                  <select title="Months range" aria-label="Months range" className="border rounded px-2 py-1" value={monthsWindow} onChange={(e) => setMonthsWindow(Number(e.target.value))}>
                    <option value={1}>Last 1 month</option>
                    <option value={3}>Last 3 months</option>
                    <option value={6}>Last 6 months</option>
                    <option value={9}>Last 9 months</option>
                    <option value={12}>Last 12 months</option>
                  </select>
                )}

                {rangeType === 'properties' && null}
              </div>
            </div>

            {/* totals + chart driven by chartData (populated from backend series/properties endpoints) */}
            {chartData === null && (
              <div className="py-8 text-center text-sm text-gray-500">Loading revenue data…</div>
            )}

            {chartData !== null && (
              (() => {
                const commissionArr = chartData.datasets[0].data;
                const subscriptionArr = chartData.datasets[1].data;
                const totalCommission = commissionArr.reduce((s, v) => s + Number(v || 0), 0);
                const totalSubscription = subscriptionArr.reduce((s, v) => s + Number(v || 0), 0);
                const totalCombined = totalCommission + totalSubscription;
                const hasPoints = (chartData?.labels?.length || 0) > 0;
                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      <div className="p-3 rounded border bg-emerald-50">
                        <div className="text-xs text-gray-600">Total Commission</div>
                        <div className="text-lg font-semibold">Tsh {totalCommission.toLocaleString()}</div>
                      </div>
                      <div className="p-3 rounded border bg-emerald-50">
                        <div className="text-xs text-gray-600">Total Subscription</div>
                        <div className="text-lg font-semibold">Tsh {totalSubscription.toLocaleString()}</div>
                      </div>
                      <div className="p-3 rounded border bg-emerald-100">
                        <div className="text-xs text-gray-600">Total Revenue</div>
                        <div className="text-lg font-semibold">Tsh {totalCombined.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="h-64">
                      {hasPoints ? (
                        <Chart
                          type="line"
                          data={chartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: { mode: 'index', intersect: false },
                            scales: {
                              y: {
                                ticks: {
                                  callback: (value: any) => {
                                    try { const n = Number(value); return rangeType === 'properties' && !Number.isNaN(n) ? `Tsh ${n.toLocaleString()}` : String(value); } catch { return String(value); }
                                  }
                                }
                              },
                              x: {
                                ticks: { autoSkip: rangeType !== 'properties', maxRotation: 45, minRotation: 0 }
                              }
                            }
                          }}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm text-gray-500">No revenue data for the selected range.</div>
                      )}
                    </div>
                  </>
                );
              })()
            )}
          </div>
        )}

        {revenueOpen && (
          <div className="mt-2 mb-8 lg:mb-16 flex justify-end">
            <button type="button" onClick={() => setRevenueOpen(false)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">Close</button>
          </div>
        )}

        <div className="flex flex-col">
          <section className="lg:order-last mt-4 mb-6 lg:mt-6">
            <h2 className="text-lg font-semibold mb-3">Monitoring</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded border border-gray-200 bg-white">
                <div className="text-sm text-gray-500">Active sessions</div>
                <div className="text-2xl font-semibold">{monitoring ? monitoring.activeSessions : '—'}</div>
              </div>

              <div className="col-span-1 sm:col-span-2 grid grid-cols-3 gap-3">
                <button onClick={() => router.push('/admin/properties/previews')} className="p-3 rounded border border-gray-200 bg-white text-left">
                  <div className="text-sm text-gray-500">Pending approvals</div>
                  <div className="text-lg font-semibold text-red-600">{monitoring ? monitoring.pendingApprovals : '—'}</div>
                </button>

                <button onClick={() => router.push('/admin/payments')} className="p-3 rounded border border-gray-200 bg-white text-left">
                  <div className="text-sm text-gray-500">Payments</div>
                  <div className="text-lg font-semibold text-red-600">{paymentsWaiting ?? '—'}</div>
                </button>

                <button onClick={() => router.push('/admin/bookings')} className="p-3 rounded border border-gray-200 bg-white text-left">
                  <div className="text-sm text-gray-500">Bookings</div>
                  <div className="text-lg font-semibold text-red-600">{monitoring ? monitoring.bookings : '—'}</div>
                </button>
              </div>
            </div>
          </section>

          <section className="mb-6 mt-4 lg:mt-6 lg:order-first">
            <h2 className="text-lg font-semibold mb-3">Recent Activities</h2>
            <div className="space-y-2">
              {(() => {
                const loading = recentActivities === null;
                const hasItems = Array.isArray(recentActivities) && recentActivities.length > 0;
                

                if (loading) {
                  // show skeleton with 5 rows
                  return (
                    <ul className="divide-y divide-gray-100 rounded border border-gray-100 bg-white p-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <li key={i} className="py-3 px-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <div className="h-3 bg-gray-200 rounded w-36 animate-pulse mb-2" />
                              <div className="h-2 bg-gray-200 rounded w-48 animate-pulse" />
                            </div>
                            <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
                          </div>
                        </li>
                      ))}
                    </ul>
                  );
                }

                if (!hasItems) {
                  return <div className="text-sm text-gray-500">No recent activities</div>;
                }
                return (
                  <ul className="divide-y divide-gray-100 rounded border border-gray-100 bg-white p-2">
                    {recentActivities!.map((a: any) => {
                        // details can be stringified JSON or an object
                        let detailsText = '';
                        try {
                          if (typeof a.details === 'string') {
                            const parsed = JSON.parse(a.details);
                            if (parsed && typeof parsed === 'object') {
                              if (parsed.propertyId) detailsText = `Property ${parsed.propertyId} — ${parsed.status ?? parsed.result ?? ''}`;
                              else if (parsed.bookingId) detailsText = `Booking ${parsed.bookingId} — ${parsed.status ?? ''}`;
                              else detailsText = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(', ');
                            } else {
                              detailsText = String(parsed);
                            }
                          } else if (a.details && typeof a.details === 'object') {
                            const d = a.details;
                            if (d.propertyId) detailsText = `Property ${d.propertyId} — ${d.status ?? d.result ?? ''}`;
                            else if (d.bookingId) detailsText = `Booking ${d.bookingId} — ${d.status ?? ''}`;
                            else detailsText = Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', ');
                          } else {
                            detailsText = String(a.details ?? '');
                          }
                        } catch (e) {
                          detailsText = String(a.details ?? '');
                        }
                        return (
                          <li key={a.id} className="py-2 px-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{String(a.action).replace(/_/g, ' ')}</div>
                                <div className="text-xs text-gray-600">{detailsText}</div>
                              </div>
                              <ClientTime iso={a.createdAt} />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                );
              })()}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

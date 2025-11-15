"use client";
import { History as HistoryIcon, Search as SearchIcon } from "lucide-react";
import { useCallback, useEffect, useState, useRef, type KeyboardEvent } from "react";
import axios from "axios";

type AuditRow = {
  id: number;
  adminId: number;
  targetUserId?: number | null;
  action: string;
  details?: string | null;
  createdAt: string;
};

export default function ReportsPage(){
  const [q, setQ] = useState("");
  // system logs are filtered by default
  const [fullRows, setFullRows] = useState<AuditRow[]>([]);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  
  const [items, setItems] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const filtersButtonRef = useRef<HTMLButtonElement | null>(null);
  

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (q) params.q = q;
      
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      const url = `${base.replace(/\/$/, '')}/api/admin/audits`;
  const r = await axios.get<AuditRow[]>(url, { params });
  let rows = r.data || [];
  setFullRows(rows);
      // By default hide obvious system/internal logs to keep History focused.
      // We intentionally keep security-related events (otp, sms, login/logout)
      // visible so admins can audit authentication activity.
      {
        const blacklist = [
          'cron', 'job', 'worker', 'internal', 'cache', 'redis', 'health', 'heartbeat'
        ];
        rows = rows.filter(row => {
          if (!row.action) return true;
          const a = String(row.action).toLowerCase();
          return !blacklist.some(b => a.includes(b));
        });
      }
      // apply action filter client-side
      if (actionFilter) {
        rows = rows.filter(rw => String(rw.action || '').toLowerCase() === actionFilter.toLowerCase());
      }
      // apply date range client-side if present
      if (fromDate) {
        const fd = new Date(fromDate);
        rows = rows.filter(rw => new Date(rw.createdAt) >= fd);
      }
      if (toDate) {
        const td = new Date(toDate);
        // include the whole day by setting to end of day
        td.setHours(23,59,59,999);
        rows = rows.filter(rw => new Date(rw.createdAt) <= td);
      }
      setItems(rows);
      // action options computed from fullRows when rendering
    } catch (e) {
      // swallow
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [q, actionFilter, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  // autofocus the search input on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // close mobile filters panel when clicking outside
  useEffect(() => {
    if (!showFiltersMobile) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (!filtersRef.current?.contains(t) && !filtersButtonRef.current?.contains(t)) {
        setShowFiltersMobile(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [showFiltersMobile]);

  // load summary cards
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || "";
        const r = await axios.get(`${base.replace(/\/$/, '')}/api/admin/reports`);
        if (!mounted) return;
        setSummary(r.data || null);
      } catch (e) {
        console.warn('Failed to load reports summary', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  

  return (
    <div className="p-6">
      <div className="text-center mb-6">
        <div className="inline-flex flex-col items-center group">
          <div className="rounded-full bg-blue-50 p-3 inline-flex items-center justify-center">
              <HistoryIcon className="h-6 w-6 text-blue-600" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold mt-2">History</h1>
        </div>
      </div>

      <div className="space-y-4">
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-2">
            <div className="border rounded p-3 bg-white">
              <div className="text-sm text-gray-500">Invoices paid (month)</div>
              <div className="text-xl font-semibold">{summary.invoices?.month?.count ?? 0}</div>
              <div className="text-sm text-gray-600">{(summary.invoices?.month?.sum ?? 0).toLocaleString()} TZS</div>
            </div>
            <div className="border rounded p-3 bg-white">
              <div className="text-sm text-gray-500">Revenue (month)</div>
              <div className="text-xl font-semibold">{Number(summary.revenue?.month ?? 0).toLocaleString()}</div>
              <div className="text-sm text-gray-600">received</div>
            </div>
            <div className="border rounded p-3 bg-white">
              <div className="text-sm text-gray-500">Properties approved (month)</div>
              <div className="text-xl font-semibold">{summary.properties?.month ?? 0}</div>
              <div className="text-sm text-gray-600">new approvals</div>
            </div>
            <div className="border rounded p-3 bg-white">
              <div className="text-sm text-gray-500">New owners (month)</div>
              <div className="text-xl font-semibold">{summary.owners?.month ?? 0}</div>
              <div className="text-sm text-gray-600">registered</div>
            </div>
            <div className="border rounded p-3 bg-white">
              <div className="text-sm text-gray-500">Bookings (month)</div>
              <div className="text-xl font-semibold">{summary.bookings?.month ?? 0}</div>
              <div className="text-sm text-gray-600">check-ins</div>
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-center gap-3 relative">
          {/* Filters — visible on all sizes (stacked on mobile) */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select aria-label="Filter by action" className="border rounded-xl px-3 py-2 w-full sm:w-auto" value={actionFilter ?? ''} onChange={(e)=>setActionFilter(e.target.value || null)}>
              <option value="">All actions</option>
              {Array.from(new Set(fullRows.map(x=>String(x.action||'').trim()).filter(Boolean))).map(a=> (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <input aria-label="From date" type="date" className="border rounded-xl px-3 py-2 w-full sm:w-auto" value={fromDate ?? ''} onChange={(e)=>setFromDate(e.target.value || null)} />
            <input aria-label="To date" type="date" className="border rounded-xl px-3 py-2 w-full sm:w-auto" value={toDate ?? ''} onChange={(e)=>setToDate(e.target.value || null)} />
          </div>

          {/* Mobile filters overflow menu (optional) */}
          <div className="sm:hidden relative">
            <button ref={filtersButtonRef} type="button" className="border rounded-xl px-3 py-2" onClick={() => setShowFiltersMobile(s => !s)} aria-expanded={showFiltersMobile ? 'true' : 'false'} aria-controls="mobile-filters">
              Filters
            </button>
            {showFiltersMobile && (
              <div id="mobile-filters" ref={filtersRef} className="absolute left-0 mt-2 w-64 bg-white border rounded p-3 shadow-lg z-50">
                <select aria-label="Filter by action" className="border rounded px-2 py-1 w-full mb-2" value={actionFilter ?? ''} onChange={(e)=>setActionFilter(e.target.value || null)}>
                  <option value="">All actions</option>
                  {Array.from(new Set(fullRows.map(x=>String(x.action||'').trim()).filter(Boolean))).map(a=> (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <input aria-label="From date" type="date" className="border rounded px-2 py-1 w-full mb-2" value={fromDate ?? ''} onChange={(e)=>setFromDate(e.target.value || null)} />
                <input aria-label="To date" type="date" className="border rounded px-2 py-1 w-full" value={toDate ?? ''} onChange={(e)=>setToDate(e.target.value || null)} />
              </div>
            )}
          </div>

          <div className="ml-auto w-full max-w-sm">
            <label className="relative block">
              <input
                ref={searchRef}
                className="w-full border rounded-xl px-3 py-2 pl-10"
                placeholder="Search action or details"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); load(); } }}
                aria-label="Search history"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon className="h-4 w-4" aria-hidden />
              </span>
            </label>
          </div>
        </div>

        <div className="rounded border bg-white p-4">
          <div className="text-sm text-gray-600 mb-2">Showing {items.length} records {loading ? '(loading...)' : ''}</div>

          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="border rounded-lg p-3 bg-white shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="text-sm text-gray-600">{new Date(it.createdAt).toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Admin #{it.adminId}</div>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <div className="text-sm font-medium">{it.action}</div>
                  <div className="text-xs text-gray-500">Target: {it.targetUserId ?? '-'}</div>
                </div>
                <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap"><pre className="whitespace-pre-wrap text-sm m-0">{typeof it.details === 'string' ? it.details : JSON.stringify(it.details)}</pre></div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-sm text-gray-600">No history records</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

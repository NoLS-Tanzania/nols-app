"use client";
import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import axios from "axios";
type RevenueFilters = { status?: string; [key: string]: any };

function RevenueFilter({
  statusFixed,
  onChange,
}: {
  statusFixed?: string;
  onChange: (f: RevenueFilters) => void;
}) {
  // Ensure the fixed status is applied to the parent filter state on mount/change.
  useEffect(() => {
    if (statusFixed) onChange({ status: statusFixed });
  }, [statusFixed, onChange]);

  // Minimal/no-op UI placeholder (original UI can be restored from the real component).
  return null;
}
// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export default function Paid() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [minWaitElapsed, setMinWaitElapsed] = useState(false);
  const [filters, setFilters] = useState<RevenueFilters>({ status: "PAID" });

  useEffect(() => {
  let mounted = true;
  const timer = setTimeout(() => setMinWaitElapsed(true), 3000);
    setLoading(true);
    api
      .get<{ items: any[] }>("/api/owner/revenue/invoices", { params: filters })
      .then((r) => { if (!mounted) return; setItems(r.data.items || []); })
      .catch((err) => { if (!mounted) return; console.error("Failed to load invoices", err); setItems([]); })
      .finally(() => { if (!mounted) return; setLoading(false); });

    return () => { mounted = false; clearTimeout(timer); };
  }, [filters]);

  return (
    <div className="space-y-4">
      <RevenueFilter statusFixed="PAID" onChange={setFilters} />

      {/* Loading / empty: show icon only (no duplicate blue badge text) */}
      {loading && !minWaitElapsed ? (
        <div className="min-h-[180px] flex flex-col items-center justify-center text-center">
          <span aria-hidden className="dot-spinner mb-2" aria-live="polite">
            <span className="dot dot-blue" />
            <span className="dot dot-black" />
            <span className="dot dot-yellow" />
            <span className="dot dot-green" />
          </span>
          <div className="mb-2">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-50 border border-blue-100">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="text-sm opacity-60 mt-2">Checking for paid invoices…</div>
        </div>
      ) : (
        items.length === 0 && (
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-blue-50 border border-blue-100">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        )
      )}

      <h1 className="text-2xl font-semibold text-center mt-3">Paid</h1>

      <div className="grid gap-3">
        {items.map((inv) => (
          <div key={inv.id} className="bg-white border rounded-2xl p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">{inv.invoiceNumber} • {inv.booking?.property?.title}</div>
              <span className="text-xs px-2 py-1 rounded border bg-green-100 text-green-700 border-green-300">PAID</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2 text-sm">
              <div>Gross: <b>TZS {inv.total}</b></div>
              <div>Commission: <b>{inv.commissionPercent}%</b></div>
              <div>Net Paid: <b>TZS {inv.netPayable}</b></div>
              <div>Receipt: <b>{inv.receiptNumber ?? "-"}</b></div>
            </div>
            <div className="flex gap-2 mt-3">
              <a href={`/owner/revenue/receipts/${inv.id}`} className="px-3 py-1 rounded-xl bg-brand-primary text-white">View Receipt</a>
              <a href={`/owner/invoices/${inv.id}`} className="px-3 py-1 rounded-xl border">View Invoice</a>
            </div>
          </div>
        ))}
        {items.length===0 && !loading && (
          <div className="text-xl opacity-70 text-center py-12">No paid invoices yet.</div>
        )}
      </div>
    </div>
  );
}

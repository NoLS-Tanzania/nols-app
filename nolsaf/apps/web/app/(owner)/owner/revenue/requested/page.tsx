"use client";
import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import axios from "axios";

type RevenueFilters = { status?: string; [key: string]: any };

// RevenueFilter removed — unused when Requested page shows only submitted items by default

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export default function Requested() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [minWaitElapsed, setMinWaitElapsed] = useState(false);
  const [filters] = useState<RevenueFilters>({ status: "SUBMITTED" });

  useEffect(() => {
  let mounted = true;
  const timer = setTimeout(() => setMinWaitElapsed(true), 3000);
    setLoading(true);
    api
      .get<{ items: any[] }>("/owner/revenue/invoices", { params: filters })
      .then((r) => { if (!mounted) return; setItems(r.data.items || []); })
      .catch((err) => {
        if (!mounted) return; console.error("Failed to load invoices", err); setItems([]);
      })
      .finally(() => { if (!mounted) return; setLoading(false); });

    return () => { mounted = false; clearTimeout(timer); };
  }, [filters]);

  return (
    <div className="space-y-4">
      {/* When there are no requested invoices show a blue icon at the top */}
      {loading && !minWaitElapsed ? (
        <div className="min-h-[180px] flex flex-col items-center justify-center text-center">
          <span aria-hidden className="dot-spinner mb-2" aria-live="polite">
            <span className="dot dot-blue" />
            <span className="dot dot-black" />
            <span className="dot dot-yellow" />
            <span className="dot dot-green" />
          </span>
          {/* show icon only while loading to avoid duplicate text */}
          <div className="mb-2">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-50 border border-blue-100">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="text-sm opacity-60 mt-2">Checking for requested invoices…</div>
        </div>
      ) : (
        items.length === 0 && (
          <div className="flex justify-center mb-4">
            {/* show icon only when empty instead of the blue badge text */}
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-blue-50 border border-blue-100">
              <Wallet className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        )
      )}

      <h1 className="text-2xl font-semibold text-center mt-3">Requested</h1>
      <div className="grid gap-3">
        {items.map((inv) => (
          <Card key={inv.id} inv={inv} chip="Submitted" chipColor="bg-yellow-100 text-yellow-700 border-yellow-300" />
        ))}
        {items.length===0 && !loading && (
          <div className="text-xl opacity-70 text-center py-12">No requested invoices.</div>
        )}
      </div>
    </div>
  );
}
function Card({ inv, chip, chipColor }:{inv:any;chip:string;chipColor:string}) {
  return (
    <div className="bg-white border rounded-2xl p-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{inv.invoiceNumber} • {inv.booking?.property?.title}</div>
        <span className={`text-xs px-2 py-1 rounded border ${chipColor}`}>{chip}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
        <div>Gross: <b>TZS {inv.total}</b></div>
        <div>Commission: <b>{inv.commissionPercent}%</b></div>
        <div>Net: <b>TZS {inv.netPayable}</b></div>
      </div>
      <div className="flex gap-2 mt-3">
        <a href={`/owner/invoices/${inv.id}`} className="px-3 py-1 rounded-xl border">View</a>
        <a href={`/owner/bookings/checked-in/${inv.bookingId}`} className="px-3 py-1 rounded-xl border">Booking</a>
      </div>
    </div>
  );
}

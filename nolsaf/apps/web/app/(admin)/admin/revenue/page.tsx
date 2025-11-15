"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Wallet, Calendar } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import axios from "axios";
import { io, Socket } from "socket.io-client";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });
function authify() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
}

type InvoiceRow = {
  id: number;
  invoiceNumber: string | null;
  receiptNumber: string | null;
  status: string;
  issuedAt: string; // ISO
  total: number;
  commissionPercent: number;
  commissionAmount: number;
  taxPercent: number;
  netPayable: number;
  booking: { id: number; property: { id: number; title: string } };
};

export default function AdminRevenue() {
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [date, setDate] = useState<string | string[]>("");
  const [pickerAnim, setPickerAnim] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // keep legacy from/to in sync with the DatePicker selection
  useEffect(() => {
    if (!date) return;
    if (Array.isArray(date)) {
      setFrom(date[0] || "");
      setTo(date[1] || "");
    } else {
      setFrom(date as string);
      setTo(date as string);
    }
  }, [date]);

  // autofocus search input on load
  useEffect(() => {
    try {
      searchRef.current?.focus();
    } catch (e) {
      // ignore if not available
    }
  }, []);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  async function load() {
    setLoading(true);
    try {
      authify();
      // If "New" is selected we treat it as REQUESTED + VERIFIED (combine both)
      if (status === "REQUESTED") {
        const [r1, r2] = await Promise.all([
          api.get<{ items: InvoiceRow[] }>("/admin/revenue/invoices", {
            params: { status: "REQUESTED", from: from || undefined, to: to || undefined, q: q || undefined, page: 1, pageSize: 50 },
          }),
          api.get<{ items: InvoiceRow[] }>("/admin/revenue/invoices", {
            params: { status: "VERIFIED", from: from || undefined, to: to || undefined, q: q || undefined, page: 1, pageSize: 50 },
          }),
        ]);

        // merge and dedupe by id
        const map = new Map<number, InvoiceRow>();
        (r1.data.items || []).forEach((it) => map.set(it.id, it));
        (r2.data.items || []).forEach((it) => map.set(it.id, it));
        setItems(Array.from(map.values()));
      } else {
        const r = await api.get<{ items: InvoiceRow[] }>("/admin/revenue/invoices", {
          params: { status: status || undefined, from: from || undefined, to: to || undefined, q: q || undefined, page: 1, pageSize: 50 },
        });
        setItems(r.data.items);
      }
    } catch (e) {
      // ignore fetch errors for now
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  // reusable counts fetch (used on mount, when date range changes, and when invoices update via socket)
  const fetchCounts = useMemo(() => {
    return async function () {
      try {
        authify();
        const statuses = ["", "REQUESTED", "VERIFIED", "APPROVED", "PAID", "REJECTED"];
        const map: Record<string, number> = {};

        // helper to fetch total for a given status
        const getTotal = async (s: string) => {
          if (s === "") {
            const r = await api.get("/admin/invoices", { params: { from: from || undefined, to: to || undefined, page: 1, pageSize: 1 } });
            return (r?.data?.total ?? (Array.isArray(r?.data?.items) ? r.data.items.length : 0)) as number;
          }

          if (s === "REQUESTED") {
            // New = REQUESTED + VERIFIED
            const [a, b] = await Promise.all([
              api.get("/admin/invoices", { params: { status: "REQUESTED", from: from || undefined, to: to || undefined, page: 1, pageSize: 1 } }),
              api.get("/admin/invoices", { params: { status: "VERIFIED", from: from || undefined, to: to || undefined, page: 1, pageSize: 1 } }),
            ]);
            const ta = (a?.data?.total ?? (Array.isArray(a?.data?.items) ? a.data.items.length : 0)) as number;
            const tb = (b?.data?.total ?? (Array.isArray(b?.data?.items) ? b.data.items.length : 0)) as number;
            return ta + tb;
          }

          const r = await api.get("/admin/invoices", { params: { status: s || undefined, from: from || undefined, to: to || undefined, page: 1, pageSize: 1 } });
          return (r?.data?.total ?? (Array.isArray(r?.data?.items) ? r.data.items.length : 0)) as number;
        };

        for (const s of statuses) {
          try {
            map[s || ''] = await getTotal(s);
          } catch (e) {
            map[s || ''] = 0;
          }
        }

        setCounts(map);
      } catch (e) {
        // ignore failures
      }
    };
  }, [from, to]);

  // initial auth + first load
  useEffect(() => {
    authify();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload on filter change
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, from, to]);

  // Fetch counts for each status so we can show badges on the filter pills (best-effort)
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // 🔌 Socket.io: refresh when an invoice is marked PAID by webhook/admin action
  useEffect(() => {
    const url =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "";
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const s: Socket = io(url, { transports: ['websocket'], auth: token ? { token } : undefined });

    const refresh = () => {
      load();
      fetchCounts();
    };

    s.on("admin:invoice:paid", refresh);
    s.on("admin:invoice:status", refresh);

    return () => {
      s.off("admin:invoice:paid", refresh);
      s.off("admin:invoice:status", refresh);
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sumNet = useMemo(
    () => items.reduce((s, i) => s + Number(i.netPayable || 0), 0),
    [items]
  );

  const emptyMessage = useMemo(() => {
    if (status === "") return "No invoices.";
    if (status === "REQUESTED") return "No new invoices.";
    const map: Record<string, string> = {
      VERIFIED: "No verified invoices.",
      APPROVED: "No approved invoices.",
      PAID: "No paid invoices.",
      REJECTED: "No rejected invoices.",
    };
    return map[status] ?? "No invoices.";
  }, [status]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col items-center text-center">
        <div className="rounded-full bg-blue-50 p-3 inline-flex items-center justify-center">
          <Wallet className="h-6 w-6 text-blue-600" aria-hidden />
        </div>
        <h1 className="mt-3 text-2xl font-semibold">Revenue (Invoices &amp; Payouts)</h1>
        <div className="mt-2 w-full max-w-3xl flex flex-col sm:flex-row items-center sm:items-center justify-between gap-3">
          <p className="text-sm text-gray-500 m-0">Invoices, payouts and exports</p>
          <div className="flex items-center">
            <div className="relative w-full max-w-md">
              <div className="border rounded-full bg-white shadow-sm relative">
                <input
                  ref={searchRef}
                  className="w-full pl-4 pr-4 py-2 rounded-full outline-none text-sm"
                  placeholder="Search # / receipt / property"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Search invoices"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); load(); } }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export removed per request (will be placed later) */}

    <div className="w-full flex justify-center">
    <div className="inline-flex items-center gap-2 flex-wrap justify-center" role="group" aria-label="Invoice status filters">
          {[
            ["", "All"],
            ["REQUESTED", "New"],
            ["VERIFIED", "Verified"],
            ["APPROVED", "Approved"],
            ["PAID", "Paid"],
            ["REJECTED", "Rejected"],
          ].map(([val, label]) => {
            const v = val as string;
            const isActive = status === v || (v === "" && status === "");
            // color mapping for each status
            const colorMap: Record<string, { active: string; inactive: string; badge: string }> = {
              '': { active: 'bg-gray-100 border-gray-300 text-gray-800', inactive: 'bg-white hover:bg-gray-50', badge: 'bg-gray-100 text-gray-800' },
              REQUESTED: { active: 'bg-blue-50 border-blue-300 text-blue-700', inactive: 'bg-white hover:bg-blue-50', badge: 'bg-blue-100 text-blue-800' },
              VERIFIED: { active: 'bg-amber-50 border-amber-300 text-amber-700', inactive: 'bg-white hover:bg-amber-50', badge: 'bg-amber-100 text-amber-800' },
              APPROVED: { active: 'bg-emerald-50 border-emerald-300 text-emerald-700', inactive: 'bg-white hover:bg-emerald-50', badge: 'bg-emerald-100 text-emerald-800' },
              PAID: { active: 'bg-teal-50 border-teal-300 text-teal-700', inactive: 'bg-white hover:bg-teal-50', badge: 'bg-teal-100 text-teal-800' },
              REJECTED: { active: 'bg-red-50 border-red-300 text-red-700', inactive: 'bg-white hover:bg-red-50', badge: 'bg-red-100 text-red-800' },
            } as const;

            const colors = colorMap[v as keyof typeof colorMap] ?? colorMap[''];

            const btnClass = `px-3 py-1 rounded-full border text-sm flex items-center gap-2 ${isActive ? colors.active : colors.inactive}`;
            const badgeClass = `ml-2 text-xs px-2 py-0.5 rounded-full ${colors.badge}`;

            return (
              <button
                key={String(val) || "all"}
                type="button"
                onClick={() => { setStatus(v); setTimeout(() => load(), 0); }}
                
                className={btnClass}
              >
                <span>{String(label)}</span>
                <span className={badgeClass}>{counts[v || ''] ?? 0}</span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Open date picker"
            title="Pick date range"
            onClick={() => {
              setPickerAnim(true);
              window.setTimeout(() => setPickerAnim(false), 350);
              setPickerOpen((v) => !v);
            }}
            className={"px-3 py-1 rounded-full border text-sm flex items-center justify-center text-gray-700 bg-white " + (pickerAnim ? 'ring-2 ring-blue-100' : 'hover:bg-gray-50') + " group relative"}
          >
            <Calendar className="h-4 w-4" />
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Pick date
            </span>
          </button>
          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
              <div className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <DatePicker
                  selected={date || undefined}
                  onSelect={(s) => {
                    setDate(s as string | string[]);
                  }}
                  onClose={() => setPickerOpen(false)}
                />
              </div>
            </>
          )}
        </div>

        
      </div>

      <div className="text-sm opacity-70">
        Total Net (shown): <b>{new Intl.NumberFormat().format(sumNet)} TZS</b>
      </div>

      {loading && <div>Loading…</div>}
      {!loading && items.length === 0 && (
        <div className="text-sm opacity-70">{emptyMessage}</div>
      )}

      <div className="grid gap-3">
        {items.map((inv) => (
          <div
            key={inv.id}
            className="border rounded-xl p-3 bg-white flex items-center justify-between gap-3"
          >
            <div className="min-w-[260px]">
              <div className="font-medium">
                {inv.invoiceNumber ?? `#${inv.id}`} • {inv.booking.property.title}
              </div>
              <div className="text-xs opacity-70">
                {new Date(inv.issuedAt).toLocaleString()}
              </div>
              <div className="text-xs opacity-70">
                Receipt: {inv.receiptNumber ?? "-"}
              </div>
            </div>
            <div className="text-xs">Gross: {fmt(inv.total)}</div>
            <div className="text-xs">
              Comm: {Number(inv.commissionPercent)}% ({fmt(inv.commissionAmount)})
            </div>
            <div className="text-xs">Tax: {Number(inv.taxPercent)}%</div>
            <div className="text-xs px-2 py-1 rounded border">{inv.status}</div>
            <div className="text-xs">
              Net: <b>{fmt(inv.netPayable)}</b>
            </div>
            <div className="flex items-center gap-2">
              <a
                className="px-3 py-1 rounded bg-emerald-600 text-white"
                href={`/admin/revenue/${inv.id}`}
              >
                Open
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmt(n: any) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "TZS" }).format(
    Number(n || 0)
  );
}

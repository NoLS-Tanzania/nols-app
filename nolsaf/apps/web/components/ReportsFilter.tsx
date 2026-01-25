"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Building2, Download, ChevronDown } from "lucide-react";
import DatePickerField from "./DatePickerField";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export type ReportsFilters = {
  from: string;
  to: string;
  propertyId?: number | null;
  groupBy: "day" | "week" | "month";
};

function formatDate(d: Date) { return d.toISOString().slice(0,10); }
function firstOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }

export default function ReportsFilter({ onChange }: { onChange: (f: ReportsFilters)=>void }) {
  const today = new Date();
  const [props, setProps] = useState<any[]>([]);
  const [filters, setFilters] = useState<ReportsFilters>({
    from: formatDate(firstOfMonth(today)),
    to: formatDate(today),
    propertyId: null,
    groupBy: "day",
  });

  useEffect(() => {
    api.get<{ items: any[] }>("/owner/properties/mine", { params: { status: "APPROVED", pageSize: 100 } })
      .then(r => setProps(Array.isArray((r.data as any)?.items) ? (r.data as any).items : []))
      .catch(() => setProps([]));
  }, []);

  useEffect(() => { onChange(filters); }, [filters, onChange]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="w-full overflow-x-auto overscroll-x-contain">
        <div className="min-w-[880px] flex items-center justify-between gap-3">
          <div className="flex items-stretch gap-3">
            <DatePickerField
              label="From date"
              value={filters.from}
              max={filters.to}
              onChange={(nextIso) => setFilters((f) => ({ ...f, from: nextIso }))}
            />
            <DatePickerField
              label="To date"
              value={filters.to}
              min={filters.from}
              onChange={(nextIso) => setFilters((f) => ({ ...f, to: nextIso }))}
            />

            <label className="relative">
              <span className="sr-only">Property</span>
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden />
              <select
                className="h-12 w-[260px] pl-10 pr-9 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand appearance-none"
                title="Property"
                aria-label="Property"
                value={filters.propertyId ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, propertyId: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">All properties</option>
                {props.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-stretch gap-3">
            <div
              className="inline-flex h-12 rounded-xl border border-brand/25 bg-white overflow-hidden shadow-sm"
              role="group"
              aria-label="Group by"
            >
              {([
                { key: "day", label: "Day" },
                { key: "week", label: "Week" },
                { key: "month", label: "Month" },
              ] as const).map((g, idx, arr) => {
                const active = filters.groupBy === g.key;
                const isLast = idx === arr.length - 1;
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, groupBy: g.key }))}
                    className={
                      "h-full px-5 text-sm font-semibold whitespace-nowrap transition active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 " +
                      (active ? "bg-brand text-white" : "bg-white text-slate-700 hover:bg-brand/5") +
                      (isLast ? "" : " border-r border-brand/25")
                    }
                    aria-pressed={active}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>

            <a
              className="no-underline inline-flex items-center justify-center h-12 w-12 rounded-xl border border-brand/25 bg-brand text-white shadow-sm hover:brightness-95 active:scale-[0.99] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
              href={`/api/owner/revenue/invoices.csv?date_from=${filters.from}&date_to=${filters.to}${filters.propertyId ? `&propertyId=${filters.propertyId}` : ""}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Export CSV"
              title="Export CSV"
            >
              <Download className="h-5 w-5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

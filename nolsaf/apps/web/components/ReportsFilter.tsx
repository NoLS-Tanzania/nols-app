"use client";
import { useEffect, useState } from "react";
import axios from "axios";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

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
    const token = localStorage.getItem("token");
    if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    api.get<{ items: any[] }>("/owner/properties/mine", { params: { status: "APPROVED", pageSize: 100 } })
      .then(r => setProps(Array.isArray((r.data as any)?.items) ? (r.data as any).items : []))
      .catch(() => setProps([]));
  }, []);

  useEffect(() => { onChange(filters); }, [filters, onChange]);

  return (
    <div className="bg-white border rounded-2xl p-3 grid md:grid-cols-[1fr_1fr_1fr_auto] gap-3">
      <div className="flex gap-2">
        <input type="date" className="border rounded-xl px-3 py-2 w-full sm:w-auto" title="From date" aria-label="From date"
          value={filters.from} onChange={e => setFilters(f=>({...f, from: e.target.value}))}/>
        <input type="date" className="border rounded-xl px-3 py-2 w-full sm:w-auto" title="To date" aria-label="To date"
          value={filters.to} onChange={e => setFilters(f=>({...f, to: e.target.value}))}/>
      </div>
      <select className="border rounded-xl px-3 py-2 w-full sm:w-auto" title="Property" aria-label="Property"
        value={filters.propertyId ?? ""} onChange={e=>setFilters(f=>({...f, propertyId: e.target.value?Number(e.target.value):null}))}>
        <option value="">All properties</option>
        {props.map(p=> <option key={p.id} value={p.id}>{p.title}</option>)}
      </select>
      <select className="border rounded-xl px-3 py-2 w-full sm:w-auto" title="Group by" aria-label="Group by"
        value={filters.groupBy} onChange={e=>setFilters(f=>({...f, groupBy: e.target.value as any}))}>
        <option value="day">Group: Day</option>
        <option value="week">Group: Week</option>
        <option value="month">Group: Month</option>
      </select>
      <div className="flex items-center justify-end">
        <a
          className="px-3 py-2 rounded-xl border"
          href={`/api/owner/revenue/invoices.csv?date_from=${filters.from}&date_to=${filters.to}${filters.propertyId?`&propertyId=${filters.propertyId}`:""}`}
          target="_blank"
        >Export CSV</a>
      </div>
    </div>
  );
}

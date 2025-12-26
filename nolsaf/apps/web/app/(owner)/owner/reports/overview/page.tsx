"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import ReportsFilter, { ReportsFilters } from "@/components/ReportsFilter";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";

// Use same-origin requests to leverage Next.js rewrites and avoid CORS
const api = axios.create({ baseURL: "", withCredentials: true });

export default function Overview() {
  const [filters, setFilters] = useState<ReportsFilters | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!filters) return;
    api.get("/api/owner/reports/overview", { params: filters }).then(r => setData(r.data)).catch(()=>setData(null));
  }, [filters]);

  return (
    <div className="space-y-4">
  <ReportsFilter onChange={setFilters} />

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi title="Gross Revenue" value={`TZS ${fmt(data.kpis.gross)}`} />
            <Kpi title="Net Revenue" value={`TZS ${fmt(data.kpis.net)}`} />
            <Kpi title="Bookings" value={data.kpis.bookings} />
            <Kpi title="Nights" value={data.kpis.nights} />
            <Kpi title="ADR" value={`TZS ${fmt(data.kpis.adr)}`} />
            <Kpi title="Occupancy (est.)" value="—" />
          </div>

          {/* Revenue vs Net line */}
          <div className="bg-white border rounded-2xl p-3">
            <div className="text-sm font-medium mb-2">Revenue vs Net</div>
            <div className="w-full h-64">
              <ResponsiveContainer>
                <LineChart data={data.series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="key" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="gross" name="Gross" />
                  <Line type="monotone" dataKey="net" name="Net" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bookings by Status */}
          <div className="bg-white border rounded-2xl p-3">
            <div className="text-sm font-medium mb-2">Bookings by Status</div>
            <div className="w-full h-64">
              <ResponsiveContainer>
                <BarChart data={data.status}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top properties */}
          <div className="bg-white border rounded-2xl p-3">
            <div className="text-sm font-medium mb-2">Top Properties by Net</div>
            <ul className="text-sm">
              {data.topProperties.map((p:any)=>(
                <li key={p.propertyId} className="flex justify-between py-1">
                  <span>{p.title}</span><b>TZS {fmt(p.net)}</b>
                </li>
              ))}
              {data.topProperties.length===0 && <li className="opacity-70">No data</li>}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
function Kpi({ title, value }: { title: string; value: any }) {
  return (
    <div className="bg-white border rounded-2xl p-3">
      <div className="text-xs opacity-70">{title}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
function fmt(n:number){ return Math.round(n).toLocaleString(); }

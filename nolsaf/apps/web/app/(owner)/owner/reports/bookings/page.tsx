"use client";
import { useEffect, useState } from "react";
import axios from "axios";
type ReportsFilters = { [key: string]: any };
function ReportsFilter({ onChange }: { onChange: (f: ReportsFilters | null) => void }) {
  // Minimal stub: invoke onChange once on mount; replace with real UI when available.
  useEffect(() => { onChange(null); }, [onChange]);
  return null;
}
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export default function Bookings() {
  const [filters, setFilters] = useState<ReportsFilters | null>(null);
  const [data, setData] = useState<any>(null);
  useEffect(()=>{ const t=localStorage.getItem("token"); if(t) api.defaults.headers.common["Authorization"]=`Bearer ${t}`;},[]);
  useEffect(()=>{ if(!filters) return; api.get("/owner/reports/bookings",{params:filters}).then(r=>setData(r.data));},[filters]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reports — Bookings</h1>
      <ReportsFilter onChange={setFilters} />

      {data && (
        <>
          <div className="bg-white border rounded-2xl p-3">
            <div className="text-sm font-medium mb-2">Bookings Over Time</div>
            <div className="w-full h-64">
              <ResponsiveContainer>
                <LineChart data={data.series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="key" />
                  <YAxis allowDecimals={false}/>
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" name="Bookings" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-3">
            <div className="text-sm font-medium mb-2">Status Mix</div>
            <div className="w-full h-64">
              <ResponsiveContainer>
                <BarChart data={data.stacked}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="key" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  {/* Recharts stacks any unknown keys; list a few typical statuses */}
                  <Bar dataKey="PENDING" stackId="a" name="Pending" />
                  <Bar dataKey="CONFIRMED" stackId="a" name="Confirmed" />
                  <Bar dataKey="CHECKED_IN" stackId="a" name="Checked-in" />
                  <Bar dataKey="CANCELLED" stackId="a" name="Cancelled" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

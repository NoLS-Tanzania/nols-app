"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import ReportsFilter, { ReportsFilters } from "../../../../../components/ReportsFilter";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export default function Occupancy() {
  const [filters, setFilters] = useState<ReportsFilters | null>(null);
  const [data, setData] = useState<any>(null);
  useEffect(()=>{ if(!filters) return; api.get("/api/owner/reports/occupancy",{params:filters}).then(r=>setData(r.data));},[filters]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reports — Occupancy</h1>
      <ReportsFilter onChange={setFilters} />

      {data && (
        <>
          <div className="bg-white border rounded-2xl p-3">
            <div className="text-sm font-medium mb-2">Occupancy % Over Time</div>
            <div className="w-full h-64">
              <ResponsiveContainer>
                <LineChart data={data.heat}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis unit="%" domain={[0,100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="occupancy" name="Occupancy" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-3">
            <div className="text-sm font-medium mb-2">Net Revenue by Property</div>
            <div className="w-full h-64">
              <ResponsiveContainer>
                <BarChart data={data.byProperty}>
                  <XAxis dataKey="title" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="net" name="Net" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import ReportsFilter, { ReportsFilters } from "@/components/ReportsFilter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export default function Customers() {
  const [filters, setFilters] = useState<ReportsFilters | null>(null);
  const [data, setData] = useState<any>(null);
  useEffect(()=>{ const t=localStorage.getItem("token"); if(t) api.defaults.headers.common["Authorization"]=`Bearer ${t}`;},[]);
  useEffect(()=>{ if(!filters) return; api.get("/owner/reports/customers",{params:filters}).then(r=>setData(r.data));},[filters]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reports — Customers</h1>
      <ReportsFilter onChange={setFilters} />

      {data && (
        <>
          <div className="bg-white border rounded-2xl p-3">
            <div className="text-sm font-medium mb-2">Guests by Nationality</div>
            <div className="w-full h-64">
              <ResponsiveContainer>
                <BarChart data={data.byNationality}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nationality" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Guests" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-3 overflow-x-auto">
            <div className="text-sm font-medium mb-2">Top Customers</div>
            <table className="w-full text-sm">
              <thead><tr className="[&>th]:text-left [&>th]:py-2"><th>Name</th><th>Stays</th><th>Spend (TZS)</th></tr></thead>
              <tbody>
                {data.topCustomers.map((c:any)=>(
                  <tr key={c.name} className="border-t">
                    <td>{c.name}</td><td>{c.stays}</td><td>{Number(c.spend).toLocaleString()}</td>
                  </tr>
                ))}
                {data.topCustomers.length===0 && <tr><td className="py-2 opacity-70" colSpan={3}>No data</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import TableRow from "@/components/TableRow";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";

type ReportsFilters = {
  startDate?: string;
  endDate?: string;
  propertyId?: string;
};

const ReportsFilter = ({ onChangeAction }: { onChangeAction: (f: ReportsFilters | null) => void }) => {
  // Minimal placeholder filter component — replace with your actual component
  return (
    <div className="mb-4">
      <button
        onClick={() => onChangeAction(null)}
        className="px-3 py-1 bg-gray-100 rounded"
      >
        Clear filters
      </button>
    </div>
  );
};

const api = axios.create({ baseURL: "", withCredentials: true });

export default function Revenue() {
  const [filters, setFilters] = useState<ReportsFilters | null>(null);
  const [data, setData] = useState<any>(null);
  useEffect(()=>{ if(!filters) return; api.get("/api/owner/reports/revenue",{params:filters}).then(r=>setData(r.data));},[filters]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reports — Revenue</h1>
      <ReportsFilter onChangeAction={setFilters} />

      {data && (
        <>
          <div className="bg-white border rounded-2xl p-3">
            <div className="text-sm font-medium mb-2">Gross / Net / Commission</div>
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
                  <Line type="monotone" dataKey="commission" name="Commission" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-3">
            <div className="text-sm font-medium mb-2">By Property (Net)</div>
            <div className="w-full h-64">
              <ResponsiveContainer>
                <BarChart data={data.byProperty}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="title" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="net" name="Net" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border rounded-2xl p-3 overflow-x-auto">
            <div className="text-sm font-medium mb-2">Invoices</div>
            <table className="w-full text-sm">
              <thead><tr className="[&>th]:text-left [&>th]:py-2">
                <th>Date</th><th>Invoice</th><th>Property</th><th>Gross</th><th>Comm %</th><th>Comm</th><th>Net</th><th>Status</th>
              </tr></thead>
              <tbody>
                {data.table.map((r:any)=>(
                  <TableRow key={r.id} className="border-t">
                    <td>{new Date(r.issuedAt).toLocaleDateString()}</td>
                    <td>{r.invoiceNumber}</td>
                    <td>{r.property}</td>
                    <td>TZS {fmt(r.gross)}</td>
                    <td>{r.commissionPercent}%</td>
                    <td>TZS {fmt(r.commissionAmount)}</td>
                    <td>TZS {fmt(r.net)}</td>
                    <td>{r.status}</td>
                  </TableRow>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
function fmt(n:number){ return Math.round(Number(n)).toLocaleString(); }

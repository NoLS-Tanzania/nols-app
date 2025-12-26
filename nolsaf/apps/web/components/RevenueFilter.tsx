"use client";
import { useEffect, useState } from "react";
import axios from "axios";

const api = axios.create({ baseURL: "", withCredentials: true });

export type RevenueFilters = {
  status?: string;
  propertyId?: number | null;
  date_from?: string | null;
  date_to?: string | null;
};

export default function RevenueFilter({
  statusFixed,
  onChange,
  showStatus = false,
}: {
  statusFixed?: string;                 // if page is a specific tab (e.g., PAID)
  onChange: (f: RevenueFilters) => void;
  showStatus?: boolean;                 // show status dropdown if desired
}) {
  const [properties, setProperties] = useState<any[]>([]);
  const [filters, setFilters] = useState<RevenueFilters>({
    status: statusFixed,
    propertyId: null,
    date_from: null,
    date_to: null,
  });

  useEffect(() => {
    api.get<any[]>("/api/owner/properties/mine").then(r => setProperties(r.data)).catch(() => setProperties([]));
  }, []);

  useEffect(() => {
    onChange(filters);
  }, [filters, onChange]);

  const csvDownload = async () => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.propertyId) params.set("propertyId", String(filters.propertyId));
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);

    // Use cookie session and trigger download
    const resp = await fetch(`/api/owner/revenue/invoices.csv?${params.toString()}`, {
      credentials: "include",
    });
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nolsaf-revenue.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border rounded-2xl p-3 grid md:grid-cols-[1fr_1fr_1fr_auto] gap-3">
      {showStatus && !statusFixed && (
        <select
          aria-label="Filter by status"
          className="border rounded-xl px-3 py-2"
          value={filters.status ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
        >
          <option value="">All statuses</option>
          <option>SUBMITTED</option>
          <option>APPROVED</option>
          <option>PROCESSING</option>
          <option>PAID</option>
          <option>REJECTED</option>
        </select>
      )}
      <select
        aria-label="Filter by property"
        className="border rounded-xl px-3 py-2"
        value={filters.propertyId ?? ""}
        onChange={(e) =>
          setFilters((f) => ({ ...f, propertyId: e.target.value ? Number(e.target.value) : null }))
        }
      >
        <option value="">All properties</option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <input
          type="date"
          title="Filter start date"
          aria-label="Filter start date"
          className="border rounded-xl px-3 py-2 w-full"
          value={filters.date_from ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value || null }))}
        />
        <input
          type="date"
          title="Filter end date"
          aria-label="Filter end date"
          className="border rounded-xl px-3 py-2 w-full"
          value={filters.date_to ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value || null }))}
        />
      </div>

      <div className="flex items-center justify-end">
        <button onClick={csvDownload} className="px-3 py-2 rounded-xl border">
          Export CSV
        </button>
      </div>
    </div>
  );
}

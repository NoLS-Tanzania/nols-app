"use client";
import React, { useEffect, useState } from "react";

type Audit = {
  id: number;
  adminId?: number | null;
  targetUserId?: number | null;
  action: string;
  details: any;
  createdAt: string;
};

export default function AuditLogPage() {
  const [data, setData] = useState<Audit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // API base (use NEXT_PUBLIC_API_URL in dev or fallback to localhost:4000)
  const apiBase = (process.env.NEXT_PUBLIC_API_URL as string) ?? "http://localhost:4000";

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL as string) ?? "http://localhost:4000";
        const url = `${base.replace(/\/$/, '')}/api/admin/audits`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();
        if (mounted) setData(json);
      } catch (err: any) {
        if (mounted) setError(err?.message ?? String(err));
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (error) return <div className="p-4">Failed to load audits: {error}</div>;
  if (!data) return <div className="p-4">Loading…</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Audit Log</h2>
        <a href={`${apiBase.replace(/\/$/, '')}/api/admin/audits?format=csv`} className="btn btn-primary">Export CSV</a>
      </div>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Admin</th>
              <th className="px-3 py-2 text-left">Action</th>
              <th className="px-3 py-2 text-left">Target</th>
              <th className="px-3 py-2 text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-3 py-2">{new Date(a.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{a.adminId}</td>
                <td className="px-3 py-2">{a.action}</td>
                <td className="px-3 py-2">{a.targetUserId ?? '-'}</td>
                <td className="px-3 py-2"><pre className="whitespace-pre-wrap max-w-xl">{JSON.stringify(a.details)}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

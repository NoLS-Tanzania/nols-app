"use client";
import React, { useEffect, useState } from "react";
import AdminPageHeader from "@/components/AdminPageHeader";
import TableRow from "@/components/TableRow";
import { ShieldCheck, Download } from "lucide-react";

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

  const apiBase = '';

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const url = `${apiBase.replace(/\/$/, '')}/api/admin/audits`;
        const res = await fetch(url, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const json = await res.json();
          if (mounted) setData(json);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err: any) {
        if (mounted) setError(err?.message ?? String(err));
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (error) return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <ShieldCheck className="h-8 w-8 text-gray-400 mb-3" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Audit Log
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            View immutable audit trails of important system actions
          </p>
        </div>
      </div>
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        Failed to load audits: {error}
      </div>
    </div>
  );

  if (!data) return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <ShieldCheck className="h-8 w-8 text-gray-400 mb-3" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Audit Log
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            View immutable audit trails of important system actions
          </p>
        </div>
      </div>
      <div className="p-4">Loading…</div>
    </div>
  );

  const exportUrl = typeof window === 'undefined'
    ? `${apiBase.replace(/\/$/, '')}/api/admin/audits?format=csv`
    : `/api/admin/audits?format=csv`;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <ShieldCheck className="h-8 w-8 text-gray-400 mb-3" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Audit Log
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            View immutable audit trails of important system actions
          </p>
        </div>
        <div className="flex justify-center">
          <a 
            href={exportUrl} 
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg hover:border-[#02665e] active:border-[#02665e] transition-all duration-200 font-medium text-sm no-underline text-gray-700 hover:text-[#02665e] active:text-[#02665e] touch-manipulation"
            download
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <TableRow hover={false}>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    No audit logs found
                  </td>
                </TableRow>
              ) : (
                data.map((a) => (
                  <TableRow key={a.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {a.adminId ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                        {a.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {a.targetUserId ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <pre className="whitespace-pre-wrap max-w-xl text-xs font-mono bg-gray-50 p-2 rounded">
                        {JSON.stringify(a.details, null, 2)}
                      </pre>
                    </td>
                  </TableRow>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

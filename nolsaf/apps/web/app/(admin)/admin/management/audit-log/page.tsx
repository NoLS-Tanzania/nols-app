"use client";
import { useEffect, useState } from "react";
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

  const exportUrl = `/api/admin/audits?format=csv`;

  function coerceAudits(json: any): Audit[] {
    // New API shape: { ok: true, data: { items: Audit[] } }
    if (json && typeof json === "object") {
      const dataNode = (json as any).data;
      if (Array.isArray(dataNode)) return dataNode as Audit[];
      if (dataNode && typeof dataNode === "object") {
        if (Array.isArray((dataNode as any).items)) return (dataNode as any).items as Audit[];
        if (Array.isArray((dataNode as any).audits)) return (dataNode as any).audits as Audit[];
      }

      // Older shapes
      if (Array.isArray((json as any).items)) return (json as any).items as Audit[];
      if (Array.isArray((json as any).audits)) return (json as any).audits as Audit[];
    }

    // Legacy: API returns an array directly
    if (Array.isArray(json)) return json as Audit[];
    return [];
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/audits", {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const json = await res.json();
          const audits = coerceAudits(json);

          if (mounted) setData(audits);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err: any) {
        if (mounted) setError(err?.message ?? String(err));
      }
    })();
    return () => { mounted = false; };
  }, []);

  const Header = () => (
    <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[#02665e]/10 p-3 ring-1 ring-[#02665e]/15">
            <ShieldCheck className="h-6 w-6 text-[#02665e]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Audit Log</h1>
            <p className="mt-0.5 text-sm text-slate-600">
              View immutable audit trails of important system actions
            </p>
          </div>
        </div>

        <a
          href={exportUrl}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/70 bg-white/60 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-black/[0.03] transition-all duration-200 no-underline hover:no-underline focus:no-underline hover:bg-white hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[#02665e]/10"
          download
        >
          <Download className="h-4 w-4 text-slate-700" />
          <span>Export CSV</span>
        </a>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="min-h-full w-full bg-[radial-gradient(1200px_circle_at_30%_-10%,rgba(2,102,94,0.10),transparent_55%),radial-gradient(900px_circle_at_90%_0%,rgba(15,23,42,0.05),transparent_55%)] px-4 py-5 sm:px-6 sm:py-6">
        <div className="space-y-4">
          <Header />
          <div className="rounded-2xl border border-rose-200/70 bg-rose-50/70 p-4 text-sm text-rose-700 shadow-sm ring-1 ring-black/[0.03]">
            Failed to load audits: {error}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-full w-full bg-[radial-gradient(1200px_circle_at_30%_-10%,rgba(2,102,94,0.10),transparent_55%),radial-gradient(900px_circle_at_90%_0%,rgba(15,23,42,0.05),transparent_55%)] px-4 py-5 sm:px-6 sm:py-6">
        <div className="space-y-4">
          <Header />
          <div className="text-sm text-slate-600">Loading…</div>
        </div>
      </div>
    );
  }

  const audits = Array.isArray(data) ? data : [];

  return (
    <div className="min-h-full w-full bg-[radial-gradient(1200px_circle_at_30%_-10%,rgba(2,102,94,0.10),transparent_55%),radial-gradient(900px_circle_at_90%_0%,rgba(15,23,42,0.05),transparent_55%)] px-4 py-5 sm:px-6 sm:py-6">
      <div className="space-y-4">
        <Header />

        <div className="rounded-2xl border border-slate-200/70 bg-white/70 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/70">
              <thead className="bg-slate-50/70">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Time</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Admin</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Action</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Target</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white/60 divide-y divide-slate-200/70">
              {audits.length === 0 ? (
                <TableRow hover={false}>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <div className="mx-auto max-w-sm">
                      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900/[0.03] ring-1 ring-black/[0.03]">
                        <ShieldCheck className="h-5 w-5 text-slate-500" />
                      </div>
                      <div className="text-sm font-semibold text-slate-900">No audit logs found</div>
                      <div className="mt-1 text-xs text-slate-600">Actions will appear here as admins make changes.</div>
                    </div>
                  </td>
                </TableRow>
              ) : (
                audits.map((a) => (
                  <TableRow key={a.id}>
                    <td className="px-4 py-2.5 text-sm text-slate-900 whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-700">
                      {a.adminId ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-700">
                      <span className="inline-flex items-center rounded-lg border border-slate-200/70 bg-white/70 px-2 py-1 text-xs font-semibold text-slate-900 ring-1 ring-black/[0.03]">
                        {a.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-700">
                      {a.targetUserId ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-700">
                      <pre className="whitespace-pre-wrap max-w-xl max-h-24 overflow-auto text-[11px] leading-snug font-mono bg-slate-50/70 p-2 rounded-lg border border-slate-200/70">
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
    </div>
  );
}

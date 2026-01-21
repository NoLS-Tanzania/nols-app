"use client";

import { use, useEffect, useMemo, useState } from "react";
import TableRow from "@/components/TableRow";
import { ShieldCheck } from "lucide-react";

type AdminAudit = {
  id: number;
  adminId: number;
  targetUserId: number | null;
  action: string;
  details: any;
  createdAt: string;
};

function asObj(v: any): Record<string, any> | null {
  if (!v) return null;
  if (typeof v === "object") return v as Record<string, any>;
  return null;
}

export default function DriverAssignmentAuditPage({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId: driverIdParam } = use(params);
  const driverId = useMemo(() => Number(driverIdParam), [driverIdParam]);
  const [items, setItems] = useState<AdminAudit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(driverId) || driverId <= 0) {
      setError("Invalid driver id");
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setError(null);
        setItems(null);

        const url = `/api/admin/audits?targetId=${encodeURIComponent(String(driverId))}&action=${encodeURIComponent(
          "TRANSPORT_ASSIGN_DRIVER"
        )}&page=1&pageSize=200&sortBy=createdAt&sortDir=desc`;

        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

        const json = await res.json();
        const list: AdminAudit[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.data?.items)
            ? json.data.items
            : Array.isArray(json?.data)
              ? json.data
              : Array.isArray(json?.items)
                ? json.items
                : [];

        if (mounted) setItems(list);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? String(e));
      }
    })();

    return () => {
      mounted = false;
    };
  }, [driverId]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-col items-center text-center">
          <ShieldCheck className="h-8 w-8 text-gray-400 mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Driver Assignment Audit</h1>
          <p className="text-sm text-gray-500 mt-1">Driver #{Number.isFinite(driverId) ? driverId : "—"} • TRANSPORT_ASSIGN_DRIVER</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Failed to load: {error}</div>
      ) : !items ? (
        <div className="p-4 text-sm text-gray-500">Loading…</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">When</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Booking</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Claim</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">By (adminId)</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 ? (
                  <TableRow hover={false}>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                      No assignment audits found for this driver.
                    </td>
                  </TableRow>
                ) : (
                  items.map((a) => {
                    const d = asObj(a.details);
                    const bookingId = d?.bookingId ?? null;
                    const claimId = d?.claimId ?? null;
                    const reason = (typeof d?.reason === "string" ? d.reason : "") || "—";

                    return (
                      <TableRow key={a.id}>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{bookingId ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{claimId ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{a.adminId}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="max-w-xl whitespace-pre-wrap">{reason}</div>
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs font-semibold text-gray-500">Raw JSON</summary>
                            <pre className="mt-2 whitespace-pre-wrap text-xs font-mono bg-gray-50 p-2 rounded max-w-3xl">
                              {JSON.stringify(a.details, null, 2)}
                            </pre>
                          </details>
                        </td>
                      </TableRow>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

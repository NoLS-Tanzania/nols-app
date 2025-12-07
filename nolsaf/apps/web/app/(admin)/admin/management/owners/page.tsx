"use client";
import React, { useEffect, useMemo, useState } from 'react';
import TableRow from "@/components/TableRow";
import { Building2, Download, Eye, DollarSign, CheckCircle } from "lucide-react";

type Owner = {
  id: number;
  name: string;
  email: string;
  propertiesCount?: number;
  region?: string | null;
  district?: string | null;
  status?: 'active' | 'suspended' | 'pending' | 'closed' | string;
};

type PayoutPreview = {
  gross: number;
  commissionPercent: number;
  taxPercent: number;
  net: number;
  rows: Array<{ bookingId: number; amount: number }>
};

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Owner | null>(null);
  const [preview, setPreview] = useState<PayoutPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [granting, setGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        // Call real API (no client-side mocks)
        const base = typeof window === 'undefined'
          ? (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000")
          : '';
        const url = `${base.replace(/\/$/, '')}/api/admin/owners?page=1&limit=50`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const json = await res.json();
          if (mounted) setOwners(json.items ?? json);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err: any) {
        if (mounted) {
          console.error('Failed to load owners', err);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const openOwner = (o: Owner) => { setSelected(o); setPreview(null); };
  const closeOwner = () => { setSelected(null); setPreview(null); };

  const handlePreview = async (ownerId: number) => {
    setPreviewLoading(true);
    setError(null);
    try {
      const base = typeof window === 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000")
        : '';
      const res = await fetch(`${base.replace(/\/$/, '')}/api/admin/owners/${ownerId}/payouts/preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setPreview(json);
    } catch (err: any) {
      // fallback mock preview
      setPreview({ gross: 100000, commissionPercent: 10, taxPercent: 18, net: 82000, rows: [{ bookingId: 123, amount: 100000 }] });
      setError(typeof err === 'string' ? err : (err?.message ?? String(err)));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGrant = async (ownerId: number) => {
    if (!confirm('Grant payout to owner? This will be recorded in audit logs.')) return;
    setGranting(true);
    try {
      const base = typeof window === 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000")
        : '';
      const res = await fetch(`${base.replace(/\/$/, '')}/api/admin/owners/${ownerId}/payouts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (!res.ok) throw new Error(`${res.status}`);
      // optimistic UI: close drawer and refresh owners
      closeOwner();
      // refresh owners list
      setLoading(true);
      const r2 = await fetch(`${base.replace(/\/$/, '')}/api/admin/owners?page=1&limit=50`);
      const json2 = await r2.json();
      setOwners(json2.items ?? json2);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setGranting(false);
      setLoading(false);
    }
  };

  const rows = useMemo(() => owners ?? [], [owners]);

  function getStatusBadgeClass(status: string) {
    const statusLower = (status ?? '').toLowerCase();
    if (statusLower.includes('active')) {
      return "inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium";
    }
    if (statusLower.includes('pending') || statusLower.includes('new')) {
      return "inline-flex items-center px-2 py-1 rounded-md bg-yellow-50 text-yellow-700 text-xs font-medium";
    }
    if (statusLower.includes('suspend') || statusLower.includes('close') || statusLower.includes('cancel')) {
      return "inline-flex items-center px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium";
    }
    return "inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-gray-700 text-xs font-medium";
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <Building2 className="h-8 w-8 text-gray-400 mb-3" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Owners
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage property owners and their information
          </p>
        </div>
        <div className="flex justify-center mt-4">
          <button 
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:border-[#02665e] hover:text-[#02665e] transition-all duration-200 font-medium text-sm"
            onClick={() => alert('Export owners - implement server side export')}
          >
            <Download className="h-4 w-4" />
            Export owners
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">No. of Properties</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <TableRow hover={false}>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    Loading…
                  </td>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow hover={false}>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    No owners found
                  </td>
                </TableRow>
              ) : (
                rows.map((o) => (
                  <TableRow key={o.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {o.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {o.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-center">
                      {o.propertiesCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {o.region ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {o.district ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={getStatusBadgeClass(o.status ?? '')}>
                        {o.status ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2 justify-center flex-wrap">
                        <button 
                          className="px-3 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:border-blue-500 hover:text-blue-600 transition-all duration-200 active:border-blue-500 active:text-blue-600 touch-manipulation flex items-center gap-1"
                          onClick={() => openOwner(o)}
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                        <button 
                          className="px-3 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:border-purple-500 hover:text-purple-600 transition-all duration-200 active:border-purple-500 active:text-purple-600 touch-manipulation flex items-center gap-1"
                          onClick={() => handlePreview(o.id)}
                        >
                          <DollarSign className="h-3 w-3" />
                          Preview Payout
                        </button>
                        <button 
                          className="px-3 py-1 text-xs font-medium text-[#02665e] border border-[#02665e] rounded hover:bg-[#02665e] hover:text-white transition-all duration-200 active:bg-[#02665e] active:text-white touch-manipulation flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleGrant(o.id)} 
                          disabled={granting}
                        >
                          <CheckCircle className="h-3 w-3" />
                          Grant Payout
                        </button>
                      </div>
                    </td>
                  </TableRow>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Owner drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-end p-4">
          <div className="bg-white w-full md:w-2/5 h-full md:h-auto rounded shadow-lg p-6 overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <button className="btn btn-ghost" onClick={closeOwner}>Close</button>
            </div>
            <div className="mb-4">
              <div><strong>Email</strong>: {selected.email}</div>
              <div><strong>Properties</strong>: {selected.propertiesCount ?? 0}</div>
              <div><strong>Region</strong>: {selected.region ?? '—'}</div>
              <div><strong>District</strong>: {selected.district ?? '—'}</div>
              <div><strong>Status</strong>: {selected.status ?? '—'}</div>
            </div>

            <div className="mb-4">
              <h3 className="font-medium">Bookings</h3>
              <p className="text-sm text-gray-600">Recent bookings and amounts will be listed here (requires API).</p>
            </div>

            <div className="mb-4">
              <h3 className="font-medium">Payout preview</h3>
              <div className="mt-2">
                {previewLoading && <div>Calculating preview…</div>}
                {preview && (
                  <div>
                    <div>Gross: {(preview.gross/100).toFixed(2)}</div>
                    <div>Commission: {preview.commissionPercent}%</div>
                    <div>Tax: {preview.taxPercent}%</div>
                    <div>Net: {(preview.net/100).toFixed(2)}</div>
                    <div className="mt-2">
                      <button className="btn btn-primary mr-2" onClick={() => handleGrant(selected.id)} disabled={granting}>Grant Payout</button>
                    </div>
                  </div>
                )}
                {!preview && <div className="text-sm text-gray-600">Click &quot;Preview Payout&quot; in the table to compute payout.</div>}
              </div>
            </div>

            <div className="text-red-600">{error}</div>
          </div>
        </div>
      )}
    </div>
  );
}
 

"use client";
import React, { useEffect, useMemo, useState } from 'react';

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
    (async () => {
      try {
        // Call real API (no client-side mocks)
        const base = (process.env.NEXT_PUBLIC_API_URL as string) ?? 'http://localhost:4000';
        const res = await fetch(`${base.replace(/\/$/, '')}/api/admin/owners?page=1&limit=50`, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (mounted) setOwners(json.items ?? json);
      } catch (err: any) {
        if (mounted) {
          console.error('Failed to load owners', err);
          setError(typeof err === 'string' ? err : (err?.message ?? String(err)));
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
      const base = (process.env.NEXT_PUBLIC_API_URL as string) ?? 'http://localhost:4000';
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
      const base = (process.env.NEXT_PUBLIC_API_URL as string) ?? 'http://localhost:4000';
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Owners</h1>
        <div>
          <button className="btn btn-secondary mr-2" disabled>Import owners</button>
          <button className="btn btn-primary" onClick={() => alert('Export owners - implement server side export')}>
            Export owners
          </button>
        </div>
      </div>

      <div className="bg-white border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left border-r border-gray-300 last:border-r-0">Name</th>
              <th className="px-3 py-2 text-left border-r border-gray-300 last:border-r-0">Email</th>
              <th className="px-3 py-2 text-center border-r border-gray-300 last:border-r-0">No. of Properties</th>
              <th className="px-3 py-2 text-left border-r border-gray-300 last:border-r-0">Region</th>
              <th className="px-3 py-2 text-left border-r border-gray-300 last:border-r-0">District</th>
              <th className="px-3 py-2 text-left border-r border-gray-300 last:border-r-0">Status</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="p-4">Loading…</td></tr>
            )}
            {!loading && rows.map((o) => (
              <tr key={o.id} className="border-t odd:bg-white even:bg-gray-50">
                <td className="px-3 py-2 border-r border-gray-300 last:border-r-0">{o.name}</td>
                <td className="px-3 py-2 border-r border-gray-300 last:border-r-0">{o.email}</td>
                  <td className="px-3 py-2 text-center border-r border-gray-300 last:border-r-0">{o.propertiesCount ?? 0}</td>
                  <td className="px-3 py-2 border-r border-gray-300 last:border-r-0">{o.region ?? '—'}</td>
                  <td className="px-3 py-2 border-r border-gray-300 last:border-r-0">{o.district ?? '—'}</td>
                  <td className="px-3 py-2 border-r border-gray-300 last:border-r-0">{o.status ?? '—'}</td>
                  <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button className="btn btn-link" onClick={() => openOwner(o)}>View</button>
                      <button className="btn btn-sm" onClick={() => handlePreview(o.id)}>Preview Payout</button>
                      <button className="btn btn-danger" onClick={() => handleGrant(o.id)} disabled={granting}>Grant Payout</button>
                  </div>
                </td>
              </tr>
            ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="p-4">No owners found</td></tr>
              )}
          </tbody>
        </table>
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
 

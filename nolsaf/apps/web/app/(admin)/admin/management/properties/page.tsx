"use client";
import React, { useEffect, useState } from 'react';
import TableRow from "@/components/TableRow";
import { FileText, Eye, Edit } from "lucide-react";

type ApprovedProperty = {
  id: number;
  title: string;
  type?: string | null;
  regionName?: string | null;
  owner?: { id: number; name?: string | null } | null;
  updatedAt?: string; // used as approved timestamp
};

export default function PropertiesModeration() {
  const apiBase = typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000")
    : '';
  const [items, setItems] = useState<ApprovedProperty[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ApprovedProperty | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        // Only show APPROVED properties in management
        const url = `${apiBase.replace(/\/$/, '')}/api/admin/properties?status=APPROVED&page=1&pageSize=200`;
        const r = await fetch(url);
        if (!r.ok) throw new Error('fetch failed');
        const contentType = r.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const j = await r.json();
          if (!mounted) return;
          setItems(j.items?.map((it: any) => ({
            id: it.id,
            title: it.title,
            type: it.type,
            regionName: it.regionName,
            owner: it.owner,
            updatedAt: it.updatedAt,
          })) ?? []);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (e) {
        console.error('fetch approved properties', e);
        setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [apiBase]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <FileText className="h-8 w-8 text-gray-400 mb-3" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Properties Moderation Queue
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            View and manage approved properties
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved At</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <TableRow hover={false}>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    Loading…
                  </td>
                </TableRow>
              ) : items && items.length === 0 ? (
                <TableRow hover={false}>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    No approved properties found
                  </td>
                </TableRow>
              ) : (
                items?.map(i => (
                  <TableRow key={i.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {i.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {i.owner?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {i.type ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {i.regionName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {i.updatedAt ? (
                        <>
                          {new Date(i.updatedAt).toLocaleDateString()}
                          <br />
                          <span className="text-xs text-gray-500">
                            {new Date(i.updatedAt).toLocaleTimeString()}
                          </span>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2 justify-center flex-wrap">
                        <button 
                          className="px-3 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:border-blue-500 hover:text-blue-600 transition-all duration-200 active:border-blue-500 active:text-blue-600 touch-manipulation flex items-center gap-1"
                          onClick={() => { setSelected(i); setEditing(false); }}
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                        <button 
                          className="px-3 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:border-purple-500 hover:text-purple-600 transition-all duration-200 active:border-purple-500 active:text-purple-600 touch-manipulation flex items-center gap-1"
                          onClick={() => { setSelected(i); setEditing(true); }}
                        >
                          <Edit className="h-3 w-3" />
                          Edit
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

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Property details</h2>
            <PropertyDetails id={selected.id} editable={editing} onClose={() => setSelected(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

function ImageModeration({ propertyId }: { propertyId: number }) {
  const [images, setImages] = React.useState<any[] | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch(`${apiBase}/api/admin/properties/${propertyId}/images`, { credentials: 'include' });
        if (!r.ok) throw new Error('Failed');
        const j = await r.json();
        if (mounted) setImages(j.items || []);
      } catch (e) {
        console.log('image list fetch failed', e);
        setImages([]);
      }
    })();
    return () => { mounted = false; };
  }, [propertyId, apiBase]);

  async function moderate(imageId: number, status: string) {
    try {
      const r = await fetch(`${apiBase}/api/admin/properties/images/${imageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!r.ok) throw new Error('Failed');
      const j = await r.json();
      setImages((cur) => cur ? cur.map(i => i.id === imageId ? j.image : i) : cur);
    } catch (e) {
      alert('Action failed');
    }
  }

  async function processImage(imageId: number) {
    try {
      const r = await fetch(`${apiBase}/api/admin/properties/images/${imageId}/process`, { method: 'POST' });
      if (!r.ok) throw new Error('Failed');
      alert('Processing requested');
    } catch (e) {
      alert('Process request failed');
    }
  }

  if (!images) return <div className="mt-4">Loading images…</div>;
  if (images.length === 0) return <div className="mt-4 text-sm text-gray-500">No images</div>;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium mb-2">Images</h3>
      <div className="grid grid-cols-3 gap-3">
        {images.map((img) => (
          <div key={img.id} className="border rounded p-2">
            <div className="h-40 bg-gray-100 mb-2 flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumbnailUrl ?? img.url} alt="img" className="object-cover w-full h-full" />
            </div>
            <div className="text-xs mb-2">Status: {img.status}</div>
            <div className="flex gap-2">
              <button className="btn btn-xs" onClick={() => moderate(img.id, 'READY')}>Approve</button>
              <button className="btn btn-xs btn-ghost" onClick={() => moderate(img.id, 'REJECTED')}>Reject</button>
              <button className="btn btn-xs btn-outline" onClick={() => processImage(img.id)}>Process</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PropertyDetails({ id, editable, onClose }: { id: number; editable: boolean; onClose: () => void }) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  const [data, setData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<{ title?: string; type?: string; regionName?: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`${apiBase}/api/admin/properties/${id}`, { credentials: 'include' });
        if (!r.ok) throw new Error('fetch failed');
        const j = await r.json();
        if (!mounted) return;
        setData(j.property ?? j.item ?? j);
        setForm({ title: j.property?.title ?? j.title, type: j.property?.type ?? j.type, regionName: j.property?.regionName ?? j.regionName });
      } catch (e) {
        console.error('fetch property', e);
        setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [apiBase, id]);

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const r = await fetch(`${apiBase}/api/admin/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        throw new Error(text || 'save failed');
      }
      alert('Saved');
      onClose();
    } catch (e: any) {
      console.error('save failed', e);
      alert('Save failed. The backend endpoint may not be implemented in dev. See console for details.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading…</div>;
  if (!data) return <div className="text-sm text-gray-500">Property not found</div>;

  return (
    <div>
      <div className="mb-4">
        <label className="block text-sm text-gray-600" htmlFor="title">Title</label>
        {editable ? (
          <input id="title" className="input w-full" value={form?.title ?? ''} onChange={(e) => setForm(f => ({ ...(f ?? {}), title: e.target.value }))} />
        ) : (
          <div className="text-base">{data.title}</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600" htmlFor="type">Type</label>
          {editable ? (
            <input id="type" className="input w-full" value={form?.type ?? ''} onChange={(e) => setForm(f => ({ ...(f ?? {}), type: e.target.value }))} />
          ) : (
            <div className="text-sm">{data.type ?? '—'}</div>
          )}
        </div>
        <div>
          <label className="block text-sm text-gray-600" htmlFor="regionName">Region</label>
          {editable ? (
            <input id="regionName" className="input w-full" value={form?.regionName ?? ''} onChange={(e) => setForm(f => ({ ...(f ?? {}), regionName: e.target.value }))} />
          ) : (
            <div className="text-sm">{data.regionName ?? '—'}</div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm text-gray-600">Owner</label>
        <div className="text-sm">{data.owner?.name ?? '—'}</div>
      </div>

      <div className="mt-4">
        <label className="block text-sm text-gray-600">Approved at</label>
        <div className="text-sm">{data.updatedAt ? new Date(data.updatedAt).toLocaleString() : '—'}</div>
      </div>

      {!editable && <ImageModeration propertyId={id} />}

      <div className="flex justify-end gap-2 mt-6">
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
        {editable ? (
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        ) : null}
      </div>
    </div>
  );
}

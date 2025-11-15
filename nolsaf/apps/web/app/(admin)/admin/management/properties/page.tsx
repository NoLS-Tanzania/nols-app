"use client";
import React, { useEffect, useState } from 'react';

type ApprovedProperty = {
  id: number;
  title: string;
  type?: string | null;
  regionName?: string | null;
  owner?: { id: number; name?: string | null } | null;
  updatedAt?: string; // used as approved timestamp
};

export default function PropertiesModeration() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
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
        const r = await fetch(`${apiBase}/api/admin/properties?status=APPROVED&page=1&pageSize=200`);
        if (!r.ok) throw new Error('fetch failed');
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Properties moderation queue</h1>
      </div>

      <div className="bg-white border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Owner</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Region</th>
              <th className="px-3 py-2 text-left">Approved At</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="p-4">Loading…</td></tr>}
            {!loading && items?.map(i => (
              <tr key={i.id} className="border-t">
                <td className="px-3 py-2">{i.title}</td>
                <td className="px-3 py-2">{i.owner?.name ?? '—'}</td>
                <td className="px-3 py-2">{i.type ?? '—'}</td>
                <td className="px-3 py-2">{i.regionName ?? '—'}</td>
                <td className="px-3 py-2">{i.updatedAt ? new Date(i.updatedAt).toLocaleString() : '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button className="btn btn-sm" onClick={() => { setSelected(i); setEditing(false); }}>View</button>
                    <button className="btn btn-ghost" onClick={() => { setSelected(i); setEditing(true); }}>Edit</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items?.length === 0 && <tr><td colSpan={6} className="p-4">No approved properties found</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded p-6 w-full max-w-2xl">
            <h2 className="text-lg font-semibold mb-4">Property details</h2>
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

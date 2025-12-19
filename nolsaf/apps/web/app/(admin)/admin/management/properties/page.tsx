"use client";
import React, { useEffect, useState } from 'react';
import TableRow from "@/components/TableRow";
import { FileText, Eye } from "lucide-react";
import PropertyPreview from "@/components/PropertyPreview";

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
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

  const loadProperties = React.useCallback(async () => {
    setLoading(true);
      try {
      // Only show APPROVED properties in management (same as public view)
        const url = `${apiBase.replace(/\/$/, '')}/api/admin/properties?status=APPROVED&page=1&pageSize=200`;
      const r = await fetch(url, { credentials: 'include' });
        if (!r.ok) throw new Error('fetch failed');
        const contentType = r.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const j = await r.json();
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
      setLoading(false);
      }
  }, [apiBase]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  // If a property is selected, show PropertyPreview (replaces the list view)
  if (selectedPropertyId) {
    return (
      <PropertyPreview
        propertyId={selectedPropertyId}
        mode="admin"
        onClose={() => {
          setSelectedPropertyId(null);
          // Refresh the list when closing to show newly approved properties
          loadProperties();
        }}
        onApproved={() => {
          // Refresh the list when a property is approved
          loadProperties();
        }}
        onUpdated={() => {
          // Refresh the list when a property is updated
          loadProperties();
        }}
      />
    );
  }

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
                          onClick={() => setSelectedPropertyId(i.id)}
                        >
                          <Eye className="h-3 w-3" />
                          View
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
    </div>
  );
}

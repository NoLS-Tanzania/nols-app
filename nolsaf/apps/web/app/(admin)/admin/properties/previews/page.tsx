"use client";

import { useState, useEffect } from "react";
import PropertyPreview from "@/components/PropertyPreview";
import { ArrowLeft, Loader2, ScanEye } from "lucide-react";
import axios from "axios";
import Image from "next/image";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || "" });

function authify() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
}

type Property = {
  id: number;
  title: string;
  status: string;
  type: string | null;
  photos?: string[];
  regionName?: string | null;
  district?: string | null;
  owner?: { id: number; name?: string | null; email?: string | null } | null;
  basePrice?: number | null;
  currency?: string;
};

export default function PropertyPreviewsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");

  useEffect(() => {
    loadProperties();
  }, [statusFilter]);

  async function loadProperties() {
    try {
      setLoading(true);
      authify();
      const response = await api.get("/admin/properties", {
        params: { page: 1, pageSize: 50, status: statusFilter },
      });
      setProperties(response.data.items || []);
    } catch (err: any) {
      console.error("Failed to load properties:", err);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }

  if (selectedPropertyId) {
    return (
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => {
                setSelectedPropertyId(null);
                loadProperties();
              }}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Property Previews</span>
            </button>
          </div>
        </div>
        <PropertyPreview
          propertyId={selectedPropertyId}
          mode="admin"
          onApproved={() => {
            setSelectedPropertyId(null);
            loadProperties();
          }}
          onRejected={() => {
            setSelectedPropertyId(null);
            loadProperties();
          }}
          onUpdated={() => {
            loadProperties();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <div className="flex flex-col items-center justify-center mb-3">
            <ScanEye className="h-10 w-10 text-[#02665e] mb-3" />
            <h1 className="text-3xl font-bold text-gray-900">Property Previews</h1>
          </div>
          <p className="text-gray-600 mb-4">Review and manage property listings with full preview</p>
        </div>

        {/* Status Filter */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <label className="text-sm text-gray-700 font-medium">Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="DRAFT">Draft</option>
            <option value="NEEDS_FIXES">Needs Fixes</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="ALL">All</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <span className="ml-3 text-gray-600">Loading properties...</span>
          </div>
        ) : properties.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No properties available for preview</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <button
                key={property.id}
                onClick={() => setSelectedPropertyId(property.id)}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 text-left group"
              >
                {property.photos && property.photos.length > 0 ? (
                  <div className="relative h-48 w-full">
                    <Image
                      src={property.photos[0]}
                      alt={property.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="text-white font-semibold text-lg line-clamp-1">{property.title}</div>
                      <div className="text-white/90 text-sm mt-1">
                        {property.regionName && `${property.regionName}`}
                        {property.district && `, ${property.district}`}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase">{property.type || "Property"}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      property.status === "PENDING" ? "bg-amber-100 text-amber-800" :
                      property.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" :
                      property.status === "REJECTED" ? "bg-red-100 text-red-800" :
                      property.status === "DRAFT" ? "bg-gray-100 text-gray-800" :
                      property.status === "NEEDS_FIXES" ? "bg-orange-100 text-orange-800" :
                      property.status === "SUSPENDED" ? "bg-indigo-100 text-indigo-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {property.status}
                    </span>
                  </div>
                  {property.basePrice && (
                    <div className="text-lg font-bold text-gray-900 mt-2">
                      {new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: property.currency || "TZS",
                      }).format(property.basePrice)}
                      <span className="text-sm font-normal text-gray-500"> / night</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3 text-sm text-emerald-600 font-medium">
                    <ScanEye className="h-4 w-4" />
                    <span>View Full Preview</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

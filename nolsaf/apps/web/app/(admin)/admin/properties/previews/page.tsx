"use client";

import { useState, useEffect } from "react";
import PropertyPreview from "@/components/PropertyPreview";
import { Loader2, ScanEye, MapPin, Star } from "lucide-react";
import axios from "axios";
import Image from "next/image";
import { 
  getPropertyCommission, 
  calculatePriceWithCommission 
} from "@/lib/priceUtils";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

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
  hotelStar?: string | null;
  services?: any; // Can contain commissionPercent and discountRules
  location?: {
    regionName?: string | null;
    district?: string | null;
    city?: string | null;
  } | null;
};

export default function PropertyPreviewsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [systemCommission, setSystemCommission] = useState<number>(0);

  // Load system commission settings
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await api.get("/admin/settings");
        if (mounted && response.data?.commissionPercent !== undefined) {
          const commission = Number(response.data.commissionPercent);
          setSystemCommission(isNaN(commission) ? 0 : commission);
        }
      } catch (e) {
        // Silently fail - will use 0 as default
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    loadProperties();
  }, [statusFilter]);

  async function loadProperties() {
    try {
      setLoading(true);
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
        onUpdated={async () => {
          // Reload properties to show updated prices
          await loadProperties();
          // Also reload system commission in case it changed
          try {
            const response = await api.get("/admin/settings");
            if (response.data?.commissionPercent !== undefined) {
              const commission = Number(response.data.commissionPercent);
              setSystemCommission(isNaN(commission) ? 0 : commission);
            }
          } catch (e) {
            // Silently fail
          }
          }}
        />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {properties.map((property) => {
              const locationParts = [
                property.location?.city,
                property.location?.district || property.district,
                property.location?.regionName || property.regionName,
              ].filter(Boolean);
              const location = locationParts.join(", ") || "—";
              
              const hotelStarLabels: Record<string, string> = {
                "basic": "1★",
                "simple": "2★",
                "moderate": "3★",
                "high": "4★",
                "luxury": "5★",
              };
              const starLabel = property.hotelStar ? hotelStarLabels[property.hotelStar] || null : null;

              return (
              <button
                key={property.id}
                onClick={() => setSelectedPropertyId(property.id)}
                  className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow text-left"
                >
                  {/* Title (above image) */}
                  <div className="px-4 pt-4">
                    <div className="text-base font-bold text-slate-900 truncate">{property.title}</div>
                  </div>

                  {/* Image */}
                  <div className="px-4 mt-3">
                    <div className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden" style={{ border: 'none' }}>
                {property.photos && property.photos.length > 0 ? (
                    <Image
                      src={property.photos[0]}
                          alt=""
                      fill
                          sizes="(min-width: 1280px) 33vw, (min-width: 1024px) 50vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-200 rounded-2xl"
                    />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl">
                          <span className="text-slate-400 text-sm">No image</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-black/0 to-transparent rounded-2xl pointer-events-none" />
                      </div>
                    </div>

                  {/* Below image: location, type/status, price, and action */}
                  <div className="p-4">
                    <div className="flex flex-col gap-3">
                      {/* Location */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{location}</span>
                      </div>

                      {/* Type and Status */}
                      <div className="flex items-center justify-between gap-2">
                        {starLabel && property.type === "HOTEL" ? (
                          <div className="flex items-center gap-0.5">
                            {starLabel.split("").map((char, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  char === "★" ? "fill-amber-400 text-amber-400" : "text-slate-400"
                                }`}
                              />
                            ))}
                  </div>
                ) : (
                          <span className="text-xs font-medium text-slate-500 uppercase">
                            {property.type || "Property"}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
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

                      {/* Price */}
                      {property.basePrice && (() => {
                        const commission = getPropertyCommission(property, systemCommission);
                        const finalPrice = calculatePriceWithCommission(property.basePrice, commission);
                        return (
                          <div className="flex items-baseline gap-1">
                            <div className="text-sm font-bold text-slate-900">
                      {new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: property.currency || "TZS",
                                maximumFractionDigits: 0,
                              }).format(finalPrice)}
                            </div>
                            <div className="text-[11px] text-slate-500">per night</div>
                    </div>
                        );
                      })()}

                      {/* View Full Preview */}
                      <div className="mt-2">
                        <div className="inline-flex items-center gap-2 w-full justify-center rounded-xl bg-[#02665e] text-white py-2.5 text-sm font-semibold transition-colors group-hover:bg-[#014e47]">
                    <ScanEye className="h-4 w-4" />
                    <span>View Full Preview</span>
                        </div>
                      </div>
                  </div>
                </div>
              </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

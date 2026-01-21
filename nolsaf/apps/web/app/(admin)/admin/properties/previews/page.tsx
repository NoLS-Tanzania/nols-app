"use client";

import { useState, useEffect, useCallback } from "react";
import PropertyPreview from "@/components/PropertyPreview";
import { Loader2, ScanEye, MapPin, Star, Search, X, Filter } from "lucide-react";
import axios from "axios";
import Image from "next/image";
import { 
  getPropertyCommission, 
  calculatePriceWithCommission 
} from "@/lib/priceUtils";
import { REGIONS } from "@/lib/tzRegions";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

type Property = {
  id: number;
  title: string;
  status: string;
  type: string | null;
  photos?: unknown;
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

function isSafeNextImageSrc(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("/")) return true;
  if (v.startsWith("http://") || v.startsWith("https://")) return true;
  return false;
}

function canUseNextImageForSrc(src: string): boolean {
  if (src.startsWith("/")) return true;

  if (!src.startsWith("http://") && !src.startsWith("https://")) return false;
  try {
    const url = new URL(src);
    const host = url.hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (host === "res.cloudinary.com") return true;
    if (host === "img.youtube.com") return true;
    if (host === "api.mapbox.com") return true;
    if (host.endsWith(".mapbox.com")) return true;
    return false;
  } catch {
    return false;
  }
}

export default function PropertyPreviewsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [systemCommission, setSystemCommission] = useState<number>(0);
  const [counts, setCounts] = useState<Record<string, number>>({
    DRAFT: 0,
    PENDING: 0,
    APPROVED: 0,
    NEEDS_FIXES: 0,
    REJECTED: 0,
    SUSPENDED: 0,
    ALL: 0,
  });

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [regionFilter, setRegionFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [ownerFilter, setOwnerFilter] = useState<string>("");
  const [owners, setOwners] = useState<Array<{ id: number; name: string | null; email: string }>>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);

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

  const loadOwners = useCallback(async () => {
    try {
      setLoadingOwners(true);
      const response = await api.get("/admin/owners", {
        params: { page: 1, pageSize: 100, status: "ACTIVE" },
      });
      setOwners(response.data.items || []);
    } catch (err) {
      console.error("Failed to load owners:", err);
      setOwners([]);
    } finally {
      setLoadingOwners(false);
    }
  }, []);

  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, pageSize: 50 };
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.q = searchQuery.trim();
      }
      if (regionFilter && regionFilter !== "") {
        // Find the region by ID (slug) and send the name for filtering
        const selectedRegion = REGIONS.find(r => r.id === regionFilter);
        if (selectedRegion) {
          params.regionName = selectedRegion.name;
        }
      }
      if (typeFilter && typeFilter !== "") {
        params.type = typeFilter;
      }
      if (ownerFilter && ownerFilter !== "") {
        params.ownerId = Number(ownerFilter);
      }
      const response = await api.get("/api/admin/properties", { params });
      console.log('[PropertyPreviews] API Response:', {
        statusFilter,
        params,
        itemsCount: response.data?.items?.length || 0,
        total: response.data?.total || 0,
        firstItem: response.data?.items?.[0] || null,
      });
      setProperties(response.data.items || []);
    } catch (err: any) {
      console.error("Failed to load properties:", err);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, regionFilter, typeFilter, ownerFilter]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  // Load owners for filter dropdown
  useEffect(() => {
    if (showAdvancedFilters && owners.length === 0) {
      loadOwners();
    }
  }, [showAdvancedFilters, owners.length, loadOwners]);

  // Fetch counts for each status
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<Record<string, number>>('/api/admin/properties/counts');
        console.log('[PropertyPreviews] Counts response:', r.data);
        if (r?.data) {
          setCounts((prev) => {
            const newCounts = { ...prev, ...r.data };
            // Calculate ALL count
            newCounts.ALL = Object.values(newCounts).reduce((sum, count) => {
              if (typeof count === 'number' && count > 0) {
                return sum + count;
              }
              return sum;
            }, 0);
            return newCounts;
          });
        }
      } catch (e: any) {
        console.error('[PropertyPreviews] Failed to load counts:', e);
        console.error('[PropertyPreviews] Error response:', e.response?.data);
        // ignore if backend doesn't expose counts
      }
    })();
  }, []);

  const clearFilters = () => {
    setSearchQuery("");
    setRegionFilter("");
    setTypeFilter("");
    setOwnerFilter("");
  };

  const hasActiveFilters = searchQuery.trim() || regionFilter || typeFilter || ownerFilter;

  const badgeClasses = (v: string) => {
    switch (v) {
      case "APPROVED":
        return "bg-emerald-100 text-emerald-700";
      case "PENDING":
        return "bg-amber-100 text-amber-700";
      case "NEEDS_FIXES":
        return "bg-orange-100 text-orange-700";
      case "REJECTED":
        return "bg-rose-100 text-rose-700";
      case "SUSPENDED":
        return "bg-violet-100 text-violet-700";
      case "DRAFT":
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

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

        {/* Search and Filters Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-6">
          {/* Search Bar with Advanced Filters Button */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center justify-center p-2 border-2 border-gray-200 rounded-lg bg-white hover:bg-gray-50 hover:border-[#02665e] hover:text-[#02665e] transition-all duration-200 flex-shrink-0"
              title="Advanced Filters"
            >
              <Filter className="h-5 w-5 text-gray-700" />
            </button>
            <div className="relative flex-1 max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                className="w-full pl-10 pr-10 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none text-sm bg-white text-gray-900 placeholder:text-gray-400"
                placeholder="Search by title, region, or district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-[#02665e] hover:text-white hover:bg-[#02665e] font-medium border border-[#02665e] rounded-lg transition-all duration-200 flex-shrink-0"
              >
                Clear
              </button>
            )}
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 mt-4">
              {/* Region Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region
                </label>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none"
                >
                  <option value="">All Regions</option>
                  {REGIONS.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none"
                >
                  <option value="">All Types</option>
                  <option value="HOTEL">Hotel</option>
                  <option value="APARTMENT">Apartment</option>
                  <option value="HOUSE">House</option>
                  <option value="VILLA">Villa</option>
                  <option value="RESORT">Resort</option>
                  <option value="LODGE">Lodge</option>
                  <option value="GUESTHOUSE">Guesthouse</option>
                  <option value="HOSTEL">Hostel</option>
                  <option value="CABIN">Cabin</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Owner Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner
                </label>
                <select
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  disabled={loadingOwners}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingOwners ? "Loading..." : "All Owners"}
                  </option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name || owner.email || `Owner #${owner.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          {[
            { label: "All", value: "ALL" },
            { label: "Pending", value: "PENDING" },
            { label: "Approved", value: "APPROVED" },
            { label: "Draft", value: "DRAFT" },
            { label: "Need Fixes", value: "NEEDS_FIXES" },
            { label: "Rejected", value: "REJECTED" },
            { label: "Suspended", value: "SUSPENDED" },
          ].map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatusFilter(s.value)}
              className={`group relative px-3.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all duration-200 ease-in-out ${
                statusFilter === s.value
                  ? 'bg-[#02665e] text-white border-[#02665e] shadow-md font-semibold'
                  : 'bg-white hover:bg-gray-50 hover:border-gray-400 border-gray-300 text-gray-600 hover:shadow-sm'
              }`}
            >
              <span>{s.label}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all duration-200 ${
                statusFilter === s.value
                  ? 'bg-white/20 text-white'
                  : badgeClasses(s.value)
              }`}>
                {counts[s.value] ?? 0}
              </span>
            </button>
          ))}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6 gap-5">
            {properties.map((property) => {
              const locationParts = [
                property.location?.city,
                property.location?.district || property.district,
                property.location?.regionName || property.regionName,
              ].filter(Boolean);
              const location = locationParts.join(", ") || "—";

              const primaryPhoto = (() => {
                if (Array.isArray(property.photos)) {
                  return property.photos.find(isSafeNextImageSrc) ?? null;
                }
                if (isSafeNextImageSrc(property.photos)) return property.photos;
                return null;
              })();
              
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
                {primaryPhoto ? (
                    canUseNextImageForSrc(primaryPhoto) ? (
                      <Image
                        src={primaryPhoto}
                        alt=""
                        fill
                        sizes="(min-width: 1536px) 16vw, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-200 rounded-2xl"
                      />
                    ) : (
                      <img
                        src={primaryPhoto}
                        alt=""
                        className="object-cover group-hover:scale-105 transition-transform duration-200 rounded-2xl"
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
                      />
                    )
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

                      {/* Full Preview */}
                      <div className="mt-2">
                        <div className="inline-flex items-center gap-2 w-full justify-center rounded-xl bg-[#02665e] text-white py-2.5 text-sm font-semibold transition-colors group-hover:bg-[#014e47]">
                    <ScanEye className="h-4 w-4" />
                    <span>Full Preview</span>
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

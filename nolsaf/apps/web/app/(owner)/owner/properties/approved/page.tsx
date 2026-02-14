"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import PropertyPreview from "@/components/PropertyPreview";
import { 
  MapPin, 
  Star, 
  Loader2, 
  CheckCircle, 
  Eye,
  MessageSquare,
  ImageIcon
} from "lucide-react";
import { 
  getPropertyCommission, 
  calculatePriceWithCommission 
} from "@/lib/priceUtils";
import VerifiedIcon from "@/components/VerifiedIcon";

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
  city?: string | null;
  ward?: string | null;
  basePrice?: number | null;
  currency?: string;
  hotelStar?: string | null;
  services?: any;
  slug?: string;
  tourismSiteId?: number | null;
  parkPlacement?: "INSIDE" | "NEARBY" | null;
  tourismSite?: {
    id: number;
    slug: string;
    name: string;
    country: string;
  } | null;
};

type ReviewsData = {
  averageRating: number;
  totalReviews: number;
  reviews?: any[];
};

function fmtMoney(amount: number | null | undefined, currency?: string | null) {
  if (amount == null || !Number.isFinite(Number(amount))) return "—";
  const cur = currency || "TZS";
  try {
    return new Intl.NumberFormat(undefined, { 
      style: "currency", 
      currency: cur, 
      maximumFractionDigits: 0 
    }).format(Number(amount));
  } catch {
    return `${cur} ${Number(amount).toLocaleString()}`;
  }
}

function buildPropertySlug(title: string, id: number): string {
  const base = String(title || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base ? `${base}-${id}` : String(id);
}

export default function ApprovedProps() {
  const [list, setList] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [reviewsMap, setReviewsMap] = useState<Record<number, ReviewsData>>({});
  const [systemCommission, setSystemCommission] = useState<number>(0);
  const loadingReviewsRef = useRef<Record<number, boolean>>({});

  function normalizeItems(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }

  // Load system commission settings
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await api.get("/api/admin/settings");
        const settings = response.data?.data ?? response.data;
        if (mounted && settings?.commissionPercent !== undefined) {
          const commission = Number(settings.commissionPercent);
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

  const loadReviewsForProperty = useCallback(async (propertyId: number) => {
    // Prevent duplicate concurrent fetches using a ref to track loading per property
    if (loadingReviewsRef.current[propertyId]) return;
    loadingReviewsRef.current[propertyId] = true;
    
    try {
      const response = await api.get(`/api/property-reviews/${propertyId}`);
      const data = response.data;
      
      setReviewsMap(prev => ({
        ...prev,
        [propertyId]: {
          averageRating: data.averageRating || 0,
          totalReviews: data.totalReviews || 0,
          reviews: data.reviews || [],
        },
      }));
    } catch (err) {
      // Silently fail - reviews are optional
      setReviewsMap(prev => ({
        ...prev,
        [propertyId]: {
          averageRating: 0,
          totalReviews: 0,
          reviews: [],
        },
      }));
    } finally {
      loadingReviewsRef.current[propertyId] = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const timer = setTimeout(() => {
      if (!mounted) return;
    api.get<any>("/api/owner/properties/mine", { params: { status: "APPROVED" } })
      .then(r => {
        if (!mounted) return;
        const properties = normalizeItems(r.data);
          
          // Add slugs to properties
          const propertiesWithSlugs = properties.map((p: any) => ({
            ...p,
            slug: buildPropertySlug(p.title, p.id),
          }));
          
          setList(propertiesWithSlugs);
          
          // Load reviews for all properties
          propertiesWithSlugs.forEach((property: Property) => {
            loadReviewsForProperty(property.id);
          });
      })
      .catch(() => {
        if (!mounted) return;
        setList([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [loadReviewsForProperty]);

  // If a property is selected, show PropertyPreview
  if (selectedPropertyId) {
    return (
      <PropertyPreview
        propertyId={selectedPropertyId}
        mode="owner"
        onUpdated={() => {
          // Reload properties after update
          api.get<any>("/api/owner/properties/mine", { params: { status: "APPROVED" } })
            .then(r => {
              const properties = normalizeItems(r.data);
              const propertiesWithSlugs = properties.map((p: any) => ({
                ...p,
                slug: buildPropertySlug(p.title, p.id),
              }));
              setList(propertiesWithSlugs);
            })
            .catch(() => {});
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-[260px] flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Approved Properties</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">Loading your approved properties…</p>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="min-h-[260px] flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
          <CheckCircle className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Approved Properties</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">No approved properties yet.</p>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl">Once your properties are approved, they will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
          <CheckCircle className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Approved Properties</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">
          View and manage your approved properties. See reviews and interactions from guests.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {list.map((property) => {
          const locationParts = [
            property.city,
            property.ward,
            property.district,
            property.regionName,
          ].filter(Boolean);
          const location = locationParts.join(", ") || "—";
          
          const primaryImage = property.photos && Array.isArray(property.photos) && property.photos.length > 0
            ? property.photos[0]
            : null;

          const hotelStarLabels: Record<string, string> = {
            "basic": "1★",
            "simple": "2★",
            "moderate": "3★",
            "high": "4★",
            "luxury": "5★",
          };
          const starLabel = property.hotelStar ? hotelStarLabels[property.hotelStar] || null : null;

          const reviews = reviewsMap[property.id] || { averageRating: 0, totalReviews: 0, reviews: [] };
          const hasReviews = reviews.totalReviews > 0;

          // Calculate final price with commission
          const finalPrice = property.basePrice 
            ? calculatePriceWithCommission(property.basePrice, getPropertyCommission(property, systemCommission))
            : null;
          const price = fmtMoney(finalPrice, property.currency);

          return (
            <div
              key={property.id}
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200"
            >
              {/* Title (above image) */}
              <div className="px-4 pt-4">
                <div className="text-base font-bold text-slate-900 truncate">{property.title}</div>
              </div>

              {/* Image */}
              <div className="px-4 mt-3">
                <div className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden">
                  {primaryImage ? (
                    <Image
                      src={primaryImage}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                  
                  {/* Verification badge */}
                  <div className="absolute top-2 right-2">
                    <VerifiedIcon />
                  </div>

                  {/* Status badge overlay */}
                  <div className="absolute bottom-2 left-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      APPROVED
                    </span>
                  </div>
                </div>
              </div>

              {/* Below image: location, type/status, price, reviews, and action */}
              <div className="p-4">
                <div className="flex flex-col gap-3">
                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{location}</span>
          </div>

                  {/* Park / Tourism Site */}
                  {property.tourismSite?.name ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-slate-600 truncate">
                        <span className="font-medium text-slate-700">Park:</span> {property.tourismSite.name}
                      </div>
                      {property.parkPlacement ? (
                        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border border-slate-200 bg-slate-50 text-slate-700">
                          {property.parkPlacement === "INSIDE" ? "Inside" : "Nearby"}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Type and Star Rating */}
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
                  </div>

                  {/* Reviews */}
                  {hasReviews && (
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-slate-900">{reviews.averageRating.toFixed(1)}</span>
                      </div>
                      <span className="text-slate-600">
                        ({reviews.totalReviews} {reviews.totalReviews === 1 ? 'review' : 'reviews'})
                      </span>
                      {reviews.reviews && reviews.reviews.length > 0 && (
                        <div className="flex items-center gap-1 text-slate-500 ml-auto">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{reviews.reviews.length} {reviews.reviews.length === 1 ? 'comment' : 'comments'}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price */}
                  {property.basePrice && (
                    <div className="flex items-baseline gap-1">
                      <div className="text-sm font-bold text-[#02665e]">
                        {price}
                      </div>
                      <div className="text-[11px] text-slate-500">per night</div>
                    </div>
                  )}

                  {/* View Full Preview Button */}
                  <button
                    onClick={() => setSelectedPropertyId(property.id)}
                    className="mt-2 inline-flex items-center justify-center gap-2 w-full rounded-xl bg-[#02665e] text-white py-2.5 text-sm font-semibold transition-colors hover:bg-[#014e47] group-hover:bg-[#014e47]"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Full Preview</span>
                  </button>

                  {/* Public View Link */}
                  {property.slug && (
                    <Link
                      href={`/public/properties/${property.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-center text-[#02665e] hover:text-[#014e47] no-underline"
                    >
                      View as public sees it →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import Image from "next/image";
import { Heart, Share2, MapPin, ArrowLeft, ImageIcon, Loader2, Calendar } from "lucide-react";
import VerifiedIcon from "../../../components/VerifiedIcon";

const api = axios.create({ baseURL: "", withCredentials: true });

type SavedProperty = {
  id: number;
  slug: string;
  title: string;
  location: string;
  primaryImage: string | null;
  basePrice: number | null;
  currency: string | null;
  savedAt: string;
  sharedAt?: string | null;
};

export default function SavedPropertiesPage() {
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [sharedProperties, setSharedProperties] = useState<SavedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"saved" | "shared">("saved");

  useEffect(() => {
    loadSavedProperties();
  }, []);

  const loadSavedProperties = async () => {
    try {
      setLoading(true);
      const [savedRes, sharedRes] = await Promise.all([
        api.get("/api/customer/saved-properties").catch(() => ({ data: { ok: true, items: [], total: 0 } })),
        api.get("/api/customer/saved-properties/shared").catch(() => ({ data: { ok: true, items: [], total: 0 } })),
      ]);
      
      setSavedProperties(savedRes.data?.items || savedRes.data?.data?.items || []);
      setSharedProperties(sharedRes.data?.items || sharedRes.data?.data?.items || []);
    } catch (err) {
      console.error("Failed to load saved properties", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (propertyId: number) => {
    try {
      await api.delete(`/api/customer/saved-properties/${propertyId}`);
      setSavedProperties((prev) => prev.filter((p) => p.id !== propertyId));
    } catch (err) {
      console.error("Failed to unsave property", err);
      alert("Failed to remove property from saved list");
    }
  };

  const formatPrice = (price: number | null, currency: string | null) => {
    if (!price) return "Price on request";
    const formatted = new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency: currency || "TZS",
      minimumFractionDigits: 0,
    }).format(price);
    // Remove currency symbol if it's duplicated (some locales add it)
    return formatted.replace(/TZS\s*TZS/, "TZS").replace(/TSh\s*TSh/, "TSh");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#02665e] transition-all duration-200 mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
          Back to Account
        </Link>
        <div className="space-y-2 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">Saved & Shared Properties</h1>
          <p className="text-sm sm:text-base text-slate-600">Manage your favorite properties and shared listings</p>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex gap-3 mb-8 p-1 bg-slate-50 rounded-xl border border-slate-200 w-fit mx-auto">
        <button
          onClick={() => setActiveTab("saved")}
          className={`relative px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ease-in-out ${
            activeTab === "saved"
              ? "bg-white text-[#02665e] shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <Heart className={`w-4 h-4 transition-all duration-200 ${activeTab === "saved" ? "fill-current" : ""}`} />
            <span>Saved</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              activeTab === "saved" 
                ? "bg-[#02665e]/10 text-[#02665e]" 
                : "bg-slate-200 text-slate-600"
            }`}>
              {savedProperties.length}
            </span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab("shared")}
          className={`relative px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ease-in-out ${
            activeTab === "shared"
              ? "bg-white text-[#02665e] shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 transition-all duration-200" />
            <span>Shared</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              activeTab === "shared" 
                ? "bg-[#02665e]/10 text-[#02665e]" 
                : "bg-slate-200 text-slate-600"
            }`}>
              {sharedProperties.length}
            </span>
          </div>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#02665e] animate-spin mb-4" />
          <p className="text-sm text-slate-600">Loading your properties...</p>
        </div>
      ) : activeTab === "saved" ? (
        savedProperties.length === 0 ? (
          <div className="text-center py-16 sm:py-20 px-6 rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 mb-6">
              <Heart className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No saved properties yet</h3>
            <p className="text-sm sm:text-base text-slate-600 mb-8 max-w-md mx-auto">
              Start exploring and save properties you like! They'll appear here for easy access.
            </p>
            <Link
              href="/public/properties"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#02665e] text-white font-semibold rounded-xl hover:bg-[#014e47] shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
            >
              Browse Properties
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {savedProperties.map((property) => {
              const PhotoPlaceholder = () => (
                <div className="absolute inset-0">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(2,102,94,0.18),transparent_55%),radial-gradient(circle_at_75%_85%,rgba(2,132,199,0.12),transparent_55%),linear-gradient(135deg,#f8fafc,#e2e8f0)]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-black/0 to-white/35" />
                  <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700">
                    <div className="h-12 w-12 rounded-2xl bg-white/85 border border-slate-200 shadow-sm flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-slate-500" aria-hidden />
                    </div>
                    <div className="mt-2 text-sm font-semibold">Photo preview</div>
                    <div className="text-xs text-slate-500">Approved photos will appear here</div>
                  </div>
                </div>
              );

              return (
                <div
                  key={property.id}
                  className="group relative"
                >
                  <Link
                    href={`/public/properties/${property.slug}`}
                    className="no-underline text-slate-900"
                    aria-label={`View ${property.title}`}
                  >
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                      {/* Title (above image) */}
                      <div className="px-4 pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-base font-bold text-slate-900 truncate flex-1 min-w-0">
                            {property.title}
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleUnsave(property.id);
                            }}
                            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-600 transition-all duration-200"
                            title="Remove from saved"
                            aria-label="Remove from saved"
                          >
                            <Heart className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                      </div>

                      {/* Image */}
                      <div className="px-4 mt-3">
                        <div className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden">
                          {property.primaryImage ? (
                            <Image
                              src={property.primaryImage}
                              alt=""
                              fill
                              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                              className="object-cover"
                            />
                          ) : (
                            <PhotoPlaceholder />
                          )}

                          {/* Verification badge (top-right) */}
                          <VerifiedIcon />
                        </div>
                      </div>

                      {/* Below image: location then price */}
                      <div className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate">{property.location || "—"}</span>
                            </div>
                          </div>
                          <div className="sm:text-right flex-shrink-0">
                            {property.basePrice ? (
                              <>
                                <div className="text-sm font-bold text-slate-900">
                                  {formatPrice(property.basePrice, property.currency)}
                                </div>
                                <div className="text-[11px] text-slate-500">per night</div>
                              </>
                            ) : (
                              <div className="text-sm font-bold text-slate-500">Price on request</div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4">
                          <span className="inline-flex items-center justify-center w-full rounded-xl bg-[#02665e] text-white py-2.5 text-sm font-semibold transition-colors group-hover:bg-[#014e47]">
                            View details
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )
      ) : (
        sharedProperties.length === 0 ? (
          <div className="text-center py-16 sm:py-20 px-6 rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 mb-6">
              <Share2 className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No shared properties yet</h3>
            <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto">
              Properties you share with others will appear here for easy reference.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {sharedProperties.map((property) => {
              const PhotoPlaceholder = () => (
                <div className="absolute inset-0">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(2,102,94,0.18),transparent_55%),radial-gradient(circle_at_75%_85%,rgba(2,132,199,0.12),transparent_55%),linear-gradient(135deg,#f8fafc,#e2e8f0)]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-black/0 to-white/35" />
                  <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700">
                    <div className="h-12 w-12 rounded-2xl bg-white/85 border border-slate-200 shadow-sm flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-slate-500" aria-hidden />
                    </div>
                    <div className="mt-2 text-sm font-semibold">Photo preview</div>
                    <div className="text-xs text-slate-500">Approved photos will appear here</div>
                  </div>
                </div>
              );

              return (
                <div
                  key={property.id}
                  className="group relative"
                >
                  <Link
                    href={`/public/properties/${property.slug}`}
                    className="no-underline text-slate-900"
                    aria-label={`View ${property.title}`}
                  >
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                      {/* Title (above image) */}
                      <div className="px-4 pt-4">
                        <div className="text-base font-bold text-slate-900 truncate">
                          {property.title}
                        </div>
                      </div>

                      {/* Image */}
                      <div className="px-4 mt-3">
                        <div className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden">
                          {property.primaryImage ? (
                            <Image
                              src={property.primaryImage}
                              alt=""
                              fill
                              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                              className="object-cover"
                            />
                          ) : (
                            <PhotoPlaceholder />
                          )}

                          {/* Verification badge (top-right) */}
                          <VerifiedIcon />
                        </div>
                      </div>

                      {/* Below image: location then price */}
                      <div className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate">{property.location || "—"}</span>
                            </div>
                          </div>
                          <div className="sm:text-right flex-shrink-0">
                            {property.basePrice ? (
                              <>
                                <div className="text-sm font-bold text-slate-900">
                                  {formatPrice(property.basePrice, property.currency)}
                                </div>
                                <div className="text-[11px] text-slate-500">per night</div>
                              </>
                            ) : (
                              <div className="text-sm font-bold text-slate-500">Price on request</div>
                            )}
                          </div>
                        </div>

                        <div className="mt-4">
                          <span className="inline-flex items-center justify-center w-full rounded-xl bg-[#02665e] text-white py-2.5 text-sm font-semibold transition-colors group-hover:bg-[#014e47]">
                            View details
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}


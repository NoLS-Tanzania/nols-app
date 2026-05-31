"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, CheckCircle2, ExternalLink, MapPin, Package, Phone, TrendingUp } from "lucide-react";
import { slugifyProfile } from "@/lib/profileSlug";

export type PublicTourPackageItem = {
  id?: string;
  name?: string;
  title?: string;
  destination?: string;
  category?: string;
  pricePerPerson?: string | number;
  price?: string | number;
  currency?: string;
  status?: string;
};

export type PublicTourOperatorProfile = {
  companyName?: string;
  physicalLocation?: string;
  businessAddress?: string;
  operatingRegions?: string[];
  contactPhone?: string;
  companyLogoUrl?: string;
  gallery?: string[];
  classifiedPhotos?: Record<string, string[]>;
  services?: string[];
  addOns?: string[];
  tourismTypes?: string[];
  specializations?: string[];
  packageItems?: PublicTourPackageItem[];
  commissionPercent?: string | number;
  tripConfidence?: {
    score?: number;
    averageRating?: number;
    totalRatings?: number;
    completedTimelines?: number;
    completedTravellers?: number;
    topFeeling?: string | null;
    recentWindowDays?: number;
    allTime?: {
      totalRatings?: number;
      completedTimelines?: number;
      completedTravellers?: number;
    };
  };
};

function toFiniteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function PublicTourOperatorCard({
  agentId,
  profile,
  packages,
  commissionPercent,
}: {
  agentId: number;
  profile: PublicTourOperatorProfile;
  packages: PublicTourPackageItem[];
  commissionPercent?: number;
}) {
  const numericAgentId = Number(agentId);
  const hasValidAgentId = Number.isFinite(numericAgentId) && numericAgentId > 0;
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.offsetWidth);
    setActiveIndex(index);
  }
  const classified = profile.classifiedPhotos || {};
  const photos = [
    ...(classified.attractions || []),
    ...(classified.proof || []),
    ...(classified.office || []),
    ...(classified.vehicles || []),
    ...(profile.gallery || []),
  ]
    .filter(Boolean)
    .slice(0, 6);
  const services = [
    ...(profile.services || []),
    ...(profile.addOns || []),
    ...(profile.tourismTypes || []),
    ...(profile.specializations || []),
  ].filter((item, index, arr) => item && arr.indexOf(item) === index);

  const profileCommission = toFiniteNumber((profile as any)?.commissionPercent);
  const effectiveCommissionPercent = Math.max(0, profileCommission ?? toFiniteNumber(commissionPercent) ?? 0);

  const lowest = packages
    .map((pkg) => ({
      basePrice: Number(pkg.pricePerPerson || pkg.price || 0),
      currency: String(pkg.currency || "USD").toUpperCase(),
    }))
    .filter((item) => Number.isFinite(item.basePrice) && item.basePrice > 0)
    .map((item) => ({
      currency: item.currency,
      price: item.basePrice * (1 + effectiveCommissionPercent / 100),
    }))
    .sort((a, b) => a.price - b.price)[0];
  const location = profile.physicalLocation || profile.businessAddress || profile.operatingRegions?.[0] || "Location not set";
  const companyName = profile.companyName || "Approved Tour Operator";
  const profileSlug = slugifyProfile(companyName, numericAgentId);
  const reviewHref = hasValidAgentId ? `/public/tour-packages/operators/${numericAgentId}/submitted-profile/${profileSlug}` : "/public/tour-packages";
  const confidence = profile.tripConfidence;
  const confidenceScore = Number(confidence?.score || 0);
  const hasConfidence = confidenceScore > 0 && Number(confidence?.totalRatings || 0) > 0;

  return (
    <article className="min-w-0">
      <h3 className="mb-3 truncate text-lg font-black text-slate-950 sm:text-xl">{companyName}</h3>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.09)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_52px_rgba(2,102,94,0.16)]">

        {/* ── Photo area ── */}
        <div className="relative overflow-hidden bg-slate-100">
          {photos.length > 0 ? (
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex h-52 snap-x snap-mandatory overflow-x-auto"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {photos.map((url, index) => (
                <div key={`${url}-${index}`} className="group relative h-52 w-full flex-none snap-start overflow-hidden bg-slate-100">
                  <Image src={url} alt={`${companyName} photo ${index + 1}`} fill sizes="(max-width: 768px) 100vw, 420px" className="object-cover transition-transform duration-500 ease-out group-hover:scale-110" unoptimized />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-52 items-center justify-center" style={{ background: "linear-gradient(135deg, #02665e 0%, #0b6f68 100%)" }}>
              <Building2 className="h-16 w-16 text-white/30" aria-hidden />
            </div>
          )}

          {/* Verified badge — top left */}
          <div className="absolute left-2.5 top-2.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              Verified
            </span>
          </div>

          {photos.length > 1 ? (
            <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5">
              {photos.map((_, index) => (
                <span
                  key={index}
                  className={`h-1 w-4 rounded-sm transition-all duration-300 ${
                    index === activeIndex
                      ? "bg-white"
                      : "bg-white/45"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* ── Body ── */}
        <div className="px-4 pt-3.5 pb-3">
          {/* Location + Price row */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[#02665e]/25 bg-[#02665e]/5 px-3 py-2.5 ring-1 ring-[#02665e]/10">
            <div className="flex min-w-0 items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#02665e]" aria-hidden />
              <span className="truncate">{location}</span>
            </div>
            {lowest ? (
              <div className="flex shrink-0 items-baseline gap-0.5">
                <span className="text-xl font-black leading-none text-[#02665e]">
                  {lowest.currency} {Math.round(lowest.price).toLocaleString()}
                </span>
                <span className="ml-0.5 text-[10px] text-slate-400">/ person</span>
              </div>
            ) : profile.contactPhone ? (
              <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#02665e]">
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {profile.contactPhone}
              </div>
            ) : null}
          </div>

          <div className="my-3 h-px bg-slate-100" />

          {hasConfidence ? (
            <div className="mb-3 rounded-xl border border-[#02665e]/20 bg-[#02665e]/7 bg-[linear-gradient(135deg,rgba(2,102,94,0.10)_12.5%,transparent_12.5%,transparent_50%,rgba(2,102,94,0.10)_50%,rgba(2,102,94,0.10)_62.5%,transparent_62.5%,transparent_100%)] bg-[length:18px_18px] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex min-w-0 items-center gap-1.5 text-xs font-bold text-[#02665e]">
                  <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">Trip Confidence</span>
                </div>
                <span className="shrink-0 rounded-full bg-[#02665e] px-2 py-0.5 text-xs font-black text-white">
                  {confidenceScore}%
                </span>
              </div>
              <div className="mt-1 text-[11px] font-medium leading-5 text-slate-600">
                Recent {Number(confidence?.averageRating || 0).toFixed(1)}/5 from {confidence?.totalRatings || 0} event ratings
                {confidence?.topFeeling ? ` - ${confidence.topFeeling}` : ""}
              </div>
            </div>
          ) : null}

          {/* Service chips */}
          {services.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {services.slice(0, 4).map((service) => (
                <span key={service} className="flex items-center gap-1.5 rounded-lg border border-[#02665e]/15 bg-[#02665e]/6 px-2.5 py-1.5 text-[11px] font-medium text-[#02665e]">
                  <CheckCircle2 className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                  <span className="truncate">{service}</span>
                </span>
              ))}
              {services.length > 4 && (
                <span className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-400">
                  +{services.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Packages count */}
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <Package className="h-3.5 w-3.5 shrink-0 text-[#02665e]" aria-hidden />
            <span>{packages.length} tour package{packages.length === 1 ? "" : "s"} available</span>
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          {hasValidAgentId ? (
            <Link
              href={reviewHref}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white no-underline transition-all duration-200 hover:shadow-lg hover:shadow-[#02665e]/30"
              style={{ background: "linear-gradient(135deg, #02665e 0%, #028a7e 100%)" }}
            >
              Preview &amp; Book
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          ) : (
            <span className="flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-400">
              Profile unavailable
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

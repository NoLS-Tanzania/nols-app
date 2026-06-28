"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, MapPin, Package, Phone, TrendingUp } from "lucide-react";

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

export default function SubmittedTourProfileCard({
  profile,
  reviewHref,
  reviewStatus,
  commissionPercent,
  titleLabel = "Submitted card preview",
  showViewButton = true,
}: {
  profile: Record<string, any>;
  reviewHref: string;
  reviewStatus?: string;
  commissionPercent?: number | null;
  titleLabel?: string;
  showViewButton?: boolean;
}) {
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const companyName = String(profile.companyName || "Submitted tour profile");
  const classified = profile.classifiedPhotos && typeof profile.classifiedPhotos === "object" ? (profile.classifiedPhotos as Record<string, unknown>) : {};
  const photos = [...stringList(classified.attractions), ...stringList(classified.proof), ...stringList(classified.office), ...stringList(classified.vehicles)].slice(0, 6);
  const services = [...stringList(profile.services), ...stringList(profile.addOns), ...stringList(profile.tourismTypes)].filter((item, index, arr) => item && arr.indexOf(item) === index);
  const packages = Array.isArray(profile.packageItems) ? profile.packageItems : [];
  const packagePrices = packages
    .map((pkg: any) => ({ currency: String(pkg?.currency || "USD"), basePrice: Number(pkg?.pricePerPerson || pkg?.price || 0) }))
    .filter((pkg) => Number.isFinite(pkg.basePrice) && pkg.basePrice > 0)
    .sort((a, b) => a.basePrice - b.basePrice);
  const lowestBase = packagePrices[0] || null;
  const profileCommission = Number(
    profile?.commissionPercent ??
      (profile?.services && typeof profile.services === "object" ? (profile.services as any).commissionPercent : undefined)
  );
  const localCommissionRaw = Number((Number.isFinite(profileCommission) ? profileCommission : undefined) ?? commissionPercent ?? 0);
  const effectiveCommissionPercent = Number.isFinite(localCommissionRaw) && localCommissionRaw > 0 ? localCommissionRaw : 0;
  const lowest = lowestBase
    ? {
        currency: lowestBase.currency,
        price: Math.round(lowestBase.basePrice * (1 + effectiveCommissionPercent / 100)),
      }
    : null;
  const contactPhone = String(profile.contactPhone || "").trim();
  const location = String(profile.physicalLocation || profile.businessAddress || stringList(profile.operatingRegions)[0] || "Location not set");
  const localReviewState = String(reviewStatus || profile.reviewStatus || (profile.review && (profile.review as Record<string, unknown>).status) || "").toUpperCase();
  const isVerified = localReviewState === "APPROVED";
  const confidence = profile.tripConfidence && typeof profile.tripConfidence === "object" ? profile.tripConfidence as Record<string, any> : null;
  const confidenceScore = Number(confidence?.score || 0);
  const hasConfidence = confidenceScore > 0 && Number(confidence?.totalRatings || 0) > 0;

  const goToPhoto = (nextIndex: number) => {
    const el = trackRef.current;
    if (!el || photos.length === 0) return;
    const clamped = Math.max(0, Math.min(nextIndex, photos.length - 1));
    el.scrollTo({ left: clamped * el.offsetWidth, behavior: "smooth" });
    setCurrentPhoto(clamped);
  };

  const onPhotoScroll = () => {
    const el = trackRef.current;
    if (!el || el.offsetWidth <= 0) return;
    setCurrentPhoto(Math.round(el.scrollLeft / el.offsetWidth));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{titleLabel}</div>
          <h3 className="mt-1 min-w-0 truncate text-xl font-black text-slate-950">{companyName}</h3>
        </div>
      </div>

      <div className="max-w-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="relative mx-3 mt-3 overflow-hidden rounded-xl bg-slate-100">
          {photos.length === 0 ? (
            <div className="flex h-52 items-center justify-center bg-gradient-to-br from-[#02665e] via-emerald-600 to-teal-400">
              <Building2 className="h-16 w-16 text-white/30" />
            </div>
          ) : (
            <>
              <div
                ref={trackRef}
                onScroll={onPhotoScroll}
                className="flex h-52 snap-x snap-mandatory overflow-x-auto"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
              >
                {photos.map((url, index) => (
                  <div key={index} className="relative h-52 w-full flex-none snap-start bg-slate-200">
                    <Image src={url} alt={`${companyName} photo ${index + 1}`} fill sizes="420px" className="object-cover" unoptimized />
                  </div>
                ))}
              </div>

              {photos.length > 1 && currentPhoto > 0 ? (
                <button
                  type="button"
                  onClick={() => goToPhoto(currentPhoto - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/60"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
              ) : null}

              {photos.length > 1 && currentPhoto < photos.length - 1 ? (
                <button
                  type="button"
                  onClick={() => goToPhoto(currentPhoto + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/60"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              ) : null}

              {photos.length > 1 ? (
                <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1">
                  {photos.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => goToPhoto(index)}
                      aria-label={`Photo ${index + 1}`}
                      className={`h-1.5 rounded-full transition-all duration-200 ${index === currentPhoto ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
                    />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="px-4 pb-4 pt-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3 w-3 shrink-0 text-[#02665e]" aria-hidden />
              <span className="truncate">{location}</span>
            </div>
            {lowest ? (
              <div className="flex shrink-0 items-baseline gap-0.5">
                <span className="text-sm font-bold text-[#02665e]">{lowest.currency} {lowest.price.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400">/ person</span>
              </div>
            ) : contactPhone ? (
              <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#02665e]">
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {contactPhone}
              </div>
            ) : null}
          </div>

          <div className="my-3 h-px bg-slate-100" />

          {hasConfidence ? (
            <div className="mb-3 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm ring-1 ring-emerald-50">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#02665e] text-sm font-black text-white shadow-sm">
                  {confidenceScore}%
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-950">
                    <TrendingUp className="h-3.5 w-3.5 shrink-0 text-[#02665e]" aria-hidden />
                    <span className="truncate">Trip confidence</span>
                  </div>
                  <div className="mt-1 text-[11px] font-medium leading-5 text-slate-500">
                    {Number(confidence?.averageRating || 0).toFixed(1)}/5 from {confidence?.totalRatings || 0} recent event ratings
                  </div>
                </div>
              </div>
              {confidence?.topFeeling ? (
                <div className="mt-2 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-[#02665e]">
                  Guest signal: {confidence.topFeeling}
                </div>
              ) : null}
            </div>
          ) : null}

          {services.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
              {services.slice(0, 4).map((service) => (
                <span key={service} className="truncate rounded-md border border-[#02665e]/20 bg-[#02665e]/5 px-2.5 py-1 text-[11px] font-medium text-[#02665e]">
                  {service}
                </span>
              ))}
              {services.length > 4 ? (
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">+{services.length - 4} more</span>
              ) : null}
            </div>
          ) : null}

          {packages.length > 0 ? (
            <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-400">
              <div className="flex min-w-0 items-center gap-1.5">
                <Package className="h-3 w-3 shrink-0 text-[#02665e]" aria-hidden />
                <span className="truncate">{packages.length} tour package{packages.length === 1 ? "" : "s"} available</span>
              </div>
              {isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  Verified
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {showViewButton ? (
          <div className="px-4 pb-4">
            <Link href={reviewHref} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#02665e] py-2.5 text-xs font-bold text-white no-underline transition hover:bg-[#024d47]">
              View full profile
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

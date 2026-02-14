"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin, ImageIcon } from "lucide-react";

import VerifiedIcon from "./VerifiedIcon";
import { getPropertyCommission, calculatePriceWithCommission } from "../lib/priceUtils";

export type PublicApprovedPropertyCardData = {
  id?: number;
  slug: string;
  title: string;
  location: string;
  primaryImage: string | null;
  basePrice: number | null;
  currency: string | null;
  services?: any;
};

function fmtMoney(amount: number | null | undefined, currency?: string | null) {
  if (amount == null || !Number.isFinite(Number(amount))) return "—";
  const cur = currency || "TZS";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(Number(amount));
  } catch {
    return `${cur} ${Number(amount).toLocaleString()}`;
  }
}

export default function PublicApprovedPropertyCard({
  p,
  systemCommission = 0,
}: {
  p: PublicApprovedPropertyCardData;
  systemCommission?: number;
}) {
  const href = `/public/properties/${p.slug}`;

  // Calculate final price with commission
  const finalPrice = p.basePrice
    ? calculatePriceWithCommission(p.basePrice, getPropertyCommission(p, systemCommission))
    : null;
  const price = fmtMoney(finalPrice, p.currency);

  const PhotoPlaceholder = () => (
    <div className="absolute inset-0">
      {/* Soft “photo-like” background so you can preview layout before Cloudinary */}
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
    <Link href={href} className="group no-underline text-slate-900" aria-label={`View ${p.title}`}>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
        {/* Title (above image) */}
        <div className="px-4 pt-4">
          <div className="text-base font-bold text-slate-900 truncate">{p.title}</div>
        </div>

        {/* Image */}
        <div className="px-4 mt-3">
          <div className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden">
            {p.primaryImage ? (
              <Image
                src={p.primaryImage}
                alt=""
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            ) : (
              <PhotoPlaceholder />
            )}

            {/* Only overlay inside the picture: verification badge (top-right) */}
            <VerifiedIcon />
          </div>
        </div>

        {/* Below image: location then price (stack on mobile) */}
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{p.location || "—"}</span>
              </div>
            </div>
            <div className="sm:text-right flex-shrink-0">
              <div className="text-sm font-bold text-slate-900">{price}</div>
              <div className="text-[11px] text-slate-500">per night</div>
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
  );
}

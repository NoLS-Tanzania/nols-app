"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Package,
  Phone,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import LogoSpinner from "@/components/LogoSpinner";

const api = apiClient;

type PackageItem = {
  id: string;
  name: string;
  destination: string;
  duration: string;
  pricePerPerson: string;
  currency: string;
  mode: string;
  included: string[];
  excluded: string[];
  notes: string;
};

type OperatorProfile = {
  companyName: string;
  companyLogoUrl: string;
  physicalLocation: string;
  yearsInOperation?: number;
  teamSize?: number;
  languages?: string;
  contactPhone: string;
  description: string;
  services: string[];
  serviceClassification?: Record<string, string[]>;
  specializations: string[];
  packageItems: PackageItem[];
  classifiedPhotos: Record<string, string[]>;
};

function PhotoSlider({ photos }: { photos: string[] }) {
  const [current, setCurrent] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const goTo = (idx: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.offsetWidth, behavior: "smooth" });
    setCurrent(idx);
  };

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setCurrent(Math.round(el.scrollLeft / el.offsetWidth));
  };

  if (photos.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center bg-gradient-to-br from-[#02665e] via-emerald-600 to-teal-400">
        <Building2 className="h-16 w-16 text-white/30" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        {photos.map((url, i) => (
          <div key={i} className="relative h-52 w-full flex-none snap-start bg-slate-200">
            <Image src={url} alt={`Photo ${i + 1}`} fill sizes="360px" className="object-cover" priority={i === 0} unoptimized />
          </div>
        ))}
      </div>

      {photos.length > 1 && current > 0 && (
        <button
          onClick={() => goTo(current - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/60"
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {photos.length > 1 && current < photos.length - 1 && (
        <button
          onClick={() => goTo(current + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/60"
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {photos.length > 1 && (
        <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Photo ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-200 ${i === current ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OperatorCardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<OperatorProfile | null>(null);

  const fetchProfile = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      // _t param busts the browser HTTP cache so we always get fresh data after a save
      const res = await api.get("/api/agent/me", { params: { _t: Date.now() } });
      const agent = (res as any)?.data?.agent ?? null;
      const raw = agent?.operatorProfile ?? null;
      if (raw && typeof raw === "object") {
        const toStringArr = (v: unknown) =>
          Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
        const yearsInOperation = Number((raw as any).yearsInOperation);
        const teamSize = Number((raw as any).teamSize);
        const sanitized: OperatorProfile = {
          ...(raw as any),
          services: toStringArr((raw as any).services),
          yearsInOperation: Number.isFinite(yearsInOperation) ? yearsInOperation : undefined,
          teamSize: Number.isFinite(teamSize) ? teamSize : undefined,
          languages: typeof (raw as any).languages === "string" ? (raw as any).languages : "",
          specializations: toStringArr((raw as any).specializations),
          serviceClassification:
            raw && typeof (raw as any).serviceClassification === "object"
              ? Object.entries((raw as any).serviceClassification).reduce((acc, [k, v]) => {
                  acc[String(k)] = toStringArr(v);
                  return acc;
                }, {} as Record<string, string[]>)
              : {},
          addOns: toStringArr((raw as any).addOns),
          tourismTypes: toStringArr((raw as any).tourismTypes),
          operatingRegions: toStringArr((raw as any).operatingRegions),
          tools: toStringArr((raw as any).tools),
          packageItems: Array.isArray((raw as any).packageItems)
            ? (raw as any).packageItems.map((pkg: any) => ({
                ...pkg,
                included: toStringArr(pkg.included),
                excluded: toStringArr(pkg.excluded),
              }))
            : [],
          classifiedPhotos:
            raw && typeof (raw as any).classifiedPhotos === "object"
              ? (raw as any).classifiedPhotos
              : {},
        };
        setProfile(sanitized);
      }
    } catch {
      if (!isBackground) setError("Failed to load operator profile.");
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    // Refetch whenever the user navigates back to this tab/page so edits from
    // the profile editor are reflected immediately without a full page reload.
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchProfile(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LogoSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm font-semibold text-rose-600">{error}</p>
        <Link href="/account/agent/profile" className="mt-4 inline-block text-sm font-bold text-emerald-700">
          Back to profile editor
        </Link>
      </div>
    );
  }

  const p = profile;

  // Build photo list: attractions first, then proof, office, vehicles
  const photos = [
    ...(p?.classifiedPhotos?.["attractions"] ?? []),
    ...(p?.classifiedPhotos?.["proof"] ?? []),
    ...(p?.classifiedPhotos?.["office"] ?? []),
    ...(p?.classifiedPhotos?.["vehicles"] ?? []),
  ].slice(0, 6);

  // Lowest starting price across packages
  const lowestPackage = (p?.packageItems ?? [])
    .filter((pkg) => pkg.pricePerPerson && Number(pkg.pricePerPerson) > 0)
    .sort((a, b) => Number(a.pricePerPerson) - Number(b.pricePerPerson))[0] ?? null;

  const logoUrl = p?.companyLogoUrl || (p?.classifiedPhotos?.["logo"] ?? [])[0] || null;
  const serviceGroups = Object.entries(p?.serviceClassification ?? {}).filter(([, list]) => list.length > 0);
  const classifiedServices = new Set(serviceGroups.flatMap(([, list]) => list));
  const uncategorizedServices = (p?.services ?? []).filter((svc) => !classifiedServices.has(svc));

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/account/agent"
            className="inline-flex items-center justify-center rounded-full p-1.5 text-slate-500 no-underline transition hover:bg-slate-100 hover:text-[#02665e]"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Operator card preview</span>
          <div className="w-8" />{/* spacer to keep title centered */}
        </div>
      </div>

      {/* Card grid — 1 col mobile, 4 col large */}
      <div className="px-4 py-10">
        {/* Company name — above the card, outside */}
        <p className="mb-3 truncate text-lg font-bold text-slate-900">
          {p?.companyName || "Your company name"}
        </p>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Photo slider */}
          <div className="relative mx-3 mt-3 overflow-hidden rounded-xl">
            <PhotoSlider photos={photos} />
          </div>

          {/* Card body */}
          <div className="px-4 pb-4 pt-3">
            {/* Location + Price row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1 text-sm text-slate-500">
                <MapPin className="h-3 w-3 shrink-0 text-[#02665e]" aria-hidden />
                <span className="truncate">{p?.physicalLocation || "Location not set"}</span>
              </div>
              {lowestPackage && (
                <div className="flex shrink-0 items-baseline gap-0.5">
                  <span className="text-sm font-bold text-[#02665e]">
                    {lowestPackage.currency} {Number(lowestPackage.pricePerPerson).toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400">/ person</span>
                </div>
              )}
              {!lowestPackage && p?.contactPhone && (
                <div className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#02665e]">
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  {p.contactPhone}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="my-3 h-px bg-slate-100" />

            {/* Profile highlights */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Years</div>
                <div className="mt-1 text-sm font-extrabold text-slate-900 leading-none">
                  {typeof p?.yearsInOperation === "number" ? `${p.yearsInOperation}+` : "—"}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Team</div>
                <div className="mt-1 text-sm font-extrabold text-slate-900 leading-none">
                  {typeof p?.teamSize === "number" ? p.teamSize : "—"}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Languages</div>
                <div className="mt-1 truncate text-sm font-extrabold text-slate-900 leading-none">
                  {p?.languages?.trim() ? p.languages : "—"}
                </div>
              </div>
            </div>

            {/* Compact summary */}
            {(p?.specializations?.length ?? 0) > 0 || (p?.services?.length ?? 0) > 0 || serviceGroups.length > 0 ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  <span>Specialties</span>
                  <span>
                    {(p?.specializations?.length ?? 0) + (p?.services?.length ?? 0)} items
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p?.specializations?.[0] && (
                    <span className="rounded-md border border-[#02665e]/20 bg-[#02665e]/5 px-2.5 py-1 text-[11px] font-medium text-[#02665e]">
                      {p.specializations[0]}
                    </span>
                  )}
                  {p?.specializations?.[1] && (
                    <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700">
                      {p.specializations[1]}
                    </span>
                  )}
                  {(p?.specializations?.length ?? 0) > 2 && (
                    <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                      +{(p?.specializations?.length ?? 0) - 2}
                    </span>
                  )}
                  {serviceGroups.length > 0 && (
                    <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
                      {serviceGroups.length} service groups
                    </span>
                  )}
                </div>
              </div>
            ) : null}

            {/* Packages */}
            {(p?.packageItems?.length ?? 0) > 0 && (
              <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <Package className="h-3 w-3 text-[#02665e]" aria-hidden />
                {p?.packageItems?.length} tour package{(p?.packageItems?.length ?? 0) !== 1 ? "s" : ""} available
              </div>
            )}
          </div>

          {/* CTA footer */}
          <div className="px-4 pb-4">
            <Link
              href="/account/agent/profile/preview"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#02665e] py-2.5 text-sm font-bold text-white no-underline transition hover:bg-[#024d47]"
            >
              View full profile
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          </div>
        </div>{/* end grid */}

        {/* Logo badge below card */}
        {logoUrl && (
          <div className="mt-5 flex flex-col items-center gap-2">
            <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-white shadow-md ring-2 ring-[#02665e]/20">
              <Image src={logoUrl} alt="Company logo" fill sizes="56px" className="object-cover" />
            </div>
            <span className="text-sm font-semibold text-slate-500">{p?.companyName}</span>
          </div>
        )}

        <p className="mt-4 text-sm text-slate-400">
          This is how your operator card appears to customers browsing the platform.
        </p>
      </div>
    </div>
  );
}

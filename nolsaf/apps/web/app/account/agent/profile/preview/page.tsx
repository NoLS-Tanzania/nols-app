"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarClock,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Flame,
  Globe2,
  Landmark,
  Mail,
  MapPin,
  Mountain,
  Package,
  Percent,
  Phone,
  PlusCircle,
  Save,
  Settings,
  ShieldCheck,
  Tag,
  Users,
  Wrench,
  Lock,
  X,
  XCircle,
  Zap,
  Gauge,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import LogoSpinner from "@/components/LogoSpinner";

const api = apiClient;

type OperatorProfile = {
  companyName: string;
  companyLogoUrl: string;
  businessAddress: string;
  physicalLocation: string;
  operatingRegions: string[];
  contactPhone: string;
  contactEmail: string;
  whatsapp: string;
  description: string;
  tourismTypes: string[];
  tools: string[];
  vehicles: VehicleAsset[];
  services: string[];
  addOns: string[];
  seasonalPricing: string;
  packages: string;
  packageItems: PackageItem[];
  seasonalPrices: SeasonalPrice[];
  capacityNotes: string;
  maxTripsPerDay: string;
  minimumBookingNotice: string;
  guidesAvailable: string;
  peakSeasonAvailability: string;
  blockedPeriods: string;
  gallery: string[];
  classifiedPhotos: Record<string, string[]>;
};

type VehicleAsset = {
  id: string;
  type: string;
  quantity: string;
  seatsPerVehicle: string;
  registrationNumber: string;
  ownedBy: string;
  serviceMode: string;
  notes: string;
};

type ItineraryDay = {
  id: string;
  day: number;
  title: string;
  description: string;
};

type PackageItem = {
  id: string;
  name: string;
  description: string;
  destination: string;
  category: string;
  duration: string;
  minPax: string;
  maxPax: string;
  pricePerPerson: string;
  currency: string;
  mode: string;
  accommodation: string;
  mealPlan: string;
  difficulty: string;
  meetingPoint: string;
  included: string[];
  excluded: string[];
  itinerary: ItineraryDay[];
  notes: string;
};

type SeasonalPrice = {
  id: string;
  seasonName: string;
  startMonth: string;
  endMonth: string;
  pricePerPerson: string;
  currency: string;
  notes: string;
};

type SubmittedProfileAuditItem = {
  id: number;
  action: string;
  details: any;
  createdAt: string;
  adminId?: number;
  targetUserId?: number | null;
};

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-4">
      <span className="text-emerald-600">{icon}</span>
      <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">{title}</h2>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function StatItem({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center py-3 px-1 text-center">
      <span className="text-xl font-extrabold text-[#02665e] sm:text-2xl leading-none">{value}</span>
      <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-[#606363]">{label}</span>
    </div>
  );
}

function PhotoCarousel({ urls, category }: { urls: string[]; category: string }) {
  const [current, setCurrent] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const label =
    category === "vehicles" ? "Vehicles" :
    category === "team" ? "Our team" :
    category === "office" ? "Office & location" :
    category === "attractions" ? "Attractions" :
    category === "proof" ? "Proof photos" :
    category;

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

  if (!urls.length) return null;

  return (
    <div>
      <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{label}</p>
      <div className="relative overflow-hidden rounded-xl">
        {/* Scroll track */}
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        >
          {urls.map((url, i) => (
            <div key={i} className="relative aspect-[4/3] w-full flex-none snap-start bg-slate-100">
              <Image
                src={url}
                alt={`${label} ${i + 1}`}
                fill
                sizes="(max-width:1024px) 100vw, 66vw"
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>

        {/* Prev arrow */}
        {urls.length > 1 && current > 0 && (
          <button
            onClick={() => goTo(current - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/60"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Next arrow */}
        {urls.length > 1 && current < urls.length - 1 && (
          <button
            onClick={() => goTo(current + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/60"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Counter */}
        {urls.length > 1 && (
          <div className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
            {current + 1}/{urls.length}
          </div>
        )}
      </div>

      {/* Dot indicators */}
      {urls.length > 1 && (
        <div className="mt-2 flex justify-center gap-1">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Photo ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-200 ${i === current ? "w-4 bg-emerald-600" : "w-1.5 bg-slate-300"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HeroBanner({ photos }: { photos: string[] }) {
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
    return <div className="h-32 sm:h-52 bg-gradient-to-br from-emerald-800 via-emerald-600 to-teal-500" />;
  }

  return (
    <div className="relative overflow-hidden">
      {/* Scroll track */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        {photos.map((url, i) => (
          <div key={i} className="relative h-44 sm:h-56 w-full flex-none snap-start bg-slate-100">
            <Image src={url} alt="Cover" fill sizes="100vw" className="object-cover" priority={i === 0} unoptimized />
          </div>
        ))}
      </div>

      {/* Prev arrow */}
      {photos.length > 1 && current > 0 && (
        <button
          onClick={() => goTo(current - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/60"
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Next arrow */}
      {photos.length > 1 && current < photos.length - 1 && (
        <button
          onClick={() => goTo(current + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center rounded-full bg-black/40 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/60"
          aria-label="Next photo"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Photo counter */}
      {photos.length > 1 && (
        <div className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
          {current + 1}/{photos.length}
        </div>
      )}

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to photo ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-200 ${i === current ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OperatorProfilePreviewScreen({ adminAgentId: adminAgentIdProp }: { adminAgentId?: number } = {}) {
  const searchParams = useSearchParams();
  const adminAgentIdRaw = String(searchParams.get("adminAgentId") || "").trim();
  const adminAgentIdFromQuery = Number(adminAgentIdRaw);
  const adminAgentId = Number.isFinite(Number(adminAgentIdProp)) && Number(adminAgentIdProp) > 0
    ? Number(adminAgentIdProp)
    : adminAgentIdFromQuery;
  const isAdminPreview = Number.isFinite(adminAgentId) && adminAgentId > 0;
  const backHref = isAdminPreview ? `/admin/agents/${adminAgentId}?tab=profile` : "/account/agent/profile";
  const backLabel = isAdminPreview ? "Back to submitted profile review" : "Back to profile editor";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string>("SUBMITTED");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [suspendConfirmOpen, setSuspendConfirmOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [reviewToast, setReviewToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [adminTargetUserId, setAdminTargetUserId] = useState<number | null>(null);
  const [commissionPercent, setCommissionPercent] = useState<number>(15);
  const [systemCommission, setSystemCommission] = useState<number>(15);
  const [commissionDraft, setCommissionDraft] = useState<string>("15");
  const [useSystemCommission, setUseSystemCommission] = useState<boolean>(true);
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [commissionModalTab, setCommissionModalTab] = useState<"pricing" | "discounts">("pricing");
  const [submittedProfileAudit, setSubmittedProfileAudit] = useState<SubmittedProfileAuditItem[]>([]);
  const [submittedProfileAuditLoading, setSubmittedProfileAuditLoading] = useState(false);
  const [submittedProfileAuditError, setSubmittedProfileAuditError] = useState<string | null>(null);
  const [submittedProfileAuditReloadTick, setSubmittedProfileAuditReloadTick] = useState(0);
  const [_totalPhotos, setTotalPhotos] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = isAdminPreview
          ? await api.get(`/api/admin/agents/${adminAgentId}`)
          : await api.get("/api/agent/me");
        if (isAdminPreview) {
          const settingsRes = await api.get("/api/admin/settings");
          const settings = (settingsRes as any)?.data ?? {};
          const loadedPct = Number(settings?.agentCommissionPercent ?? settings?.commissionPercent ?? 15);
          const safePct = Number.isFinite(loadedPct) ? loadedPct : 15;
          setSystemCommission(safePct);
          setCommissionPercent(safePct);
          setCommissionDraft(String(safePct));
          setUseSystemCommission(true);
        }
        const payload = (res as any)?.data;
        const agent = payload?.agent ?? payload?.data ?? payload ?? null;
        const raw = agent?.operatorProfile ?? null;
        const resolvedTargetUserId = Number(agent?.user?.id ?? agent?.userId ?? 0);
        setAdminTargetUserId(Number.isFinite(resolvedTargetUserId) && resolvedTargetUserId > 0 ? resolvedTargetUserId : null);
        setAgentStatus(agent?.status ?? null);
        const nextReviewStatus = String((raw as any)?.reviewStatus || (raw as any)?.review?.status || "SUBMITTED").toUpperCase();
        setReviewStatus(nextReviewStatus);
        if (raw && typeof raw === "object") {
          const toStringArr = (v: unknown) =>
            Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
          const sanitized: OperatorProfile = {
            ...(raw as any),
            services: toStringArr((raw as any).services),
            addOns: toStringArr((raw as any).addOns),
            tourismTypes: toStringArr((raw as any).tourismTypes),
            operatingRegions: toStringArr((raw as any).operatingRegions),
            tools: toStringArr((raw as any).tools),
            gallery: toStringArr((raw as any).gallery),
            packageItems: Array.isArray((raw as any).packageItems)
              ? (raw as any).packageItems.map((pkg: any) => ({
                  ...pkg,
                  description: pkg.description ?? "",
                  category: pkg.category ?? "",
                  minPax: pkg.minPax ?? "",
                  maxPax: pkg.maxPax ?? "",
                  accommodation: pkg.accommodation ?? "",
                  mealPlan: pkg.mealPlan ?? "",
                  difficulty: pkg.difficulty ?? "",
                  meetingPoint: pkg.meetingPoint ?? "",
                  included: toStringArr(pkg.included),
                  excluded: toStringArr(pkg.excluded),
                  itinerary: Array.isArray(pkg.itinerary) ? pkg.itinerary : [],
                }))
              : [],
            vehicles: Array.isArray((raw as any).vehicles) ? (raw as any).vehicles : [],
            seasonalPrices: Array.isArray((raw as any).seasonalPrices) ? (raw as any).seasonalPrices : [],
          };
          setProfile(sanitized);
          const photos = Object.values(sanitized.classifiedPhotos ?? {}).reduce(
            (sum: number, arr: unknown) => sum + (Array.isArray(arr) ? arr.length : 0),
            0
          );
          setTotalPhotos(photos);
        }
      } catch {
        setError(isAdminPreview ? "Failed to load submitted operator profile." : "Failed to load operator profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdminPreview, adminAgentId]);

  useEffect(() => {
    if (!isAdminPreview || !Number.isFinite(adminTargetUserId) || Number(adminTargetUserId) <= 0) {
      setSubmittedProfileAudit([]);
      setSubmittedProfileAuditError(null);
      setSubmittedProfileAuditLoading(false);
      return;
    }

    let cancelled = false;

    const loadSubmittedProfileAudit = async () => {
      try {
        setSubmittedProfileAuditLoading(true);
        setSubmittedProfileAuditError(null);
        const res = await api.get("/api/admin/audits", {
          params: {
            targetId: adminTargetUserId,
            page: 1,
            pageSize: 50,
            sortBy: "createdAt",
            sortDir: "desc",
          },
        });

        const payload = (res as any)?.data ?? {};
        const data = payload?.data ?? payload;
        const rawItems = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload)
              ? payload
              : [];

        const relevant = rawItems
          .filter((item: any) => {
            const action = String(item?.action || "").toUpperCase();
            const detailsText = JSON.stringify(item?.details || {}).toUpperCase();
            return (
              action.includes("PROFILE") ||
              action.includes("OPERATOR") ||
              action.includes("SUBMIT") ||
              action.includes("REVIEW") ||
              action.includes("APPROVE") ||
              action.includes("REJECT") ||
              action.includes("ADD_NOTE") ||
              action.includes("COMMISSION") ||
              detailsText.includes("OPERATORPROFILE") ||
              detailsText.includes("REVIEWSTATUS") ||
              detailsText.includes("PACKAGES") ||
              detailsText.includes("COMMISSION")
            );
          })
          .slice(0, 20)
          .map((item: any) => ({
            id: Number(item?.id || 0),
            action: String(item?.action || "UPDATE"),
            details: item?.details ?? null,
            createdAt: String(item?.createdAt || ""),
            adminId: Number.isFinite(Number(item?.adminId)) ? Number(item.adminId) : undefined,
            targetUserId: Number.isFinite(Number(item?.targetUserId)) ? Number(item.targetUserId) : null,
          }));

        if (!cancelled) setSubmittedProfileAudit(relevant);
      } catch {
        if (!cancelled) {
          setSubmittedProfileAudit([]);
          setSubmittedProfileAuditError("Failed to load submitted profile audit trail.");
        }
      } finally {
        if (!cancelled) setSubmittedProfileAuditLoading(false);
      }
    };

    void loadSubmittedProfileAudit();
    return () => {
      cancelled = true;
    };
  }, [isAdminPreview, adminTargetUserId, reviewStatus, submittedProfileAuditReloadTick]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LogoSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-sm font-semibold text-rose-600">{error}</p>
        <Link href={backHref} className="mt-4 inline-block text-sm font-bold text-emerald-700">
          {backLabel}
        </Link>
      </div>
    );
  }

  const p = profile;
  const logoPhotos = p?.classifiedPhotos?.["logo"] ?? [];
  const logoUrl = p?.companyLogoUrl || logoPhotos[0] || null;

  const bannerPhotos = [
    ...(p?.classifiedPhotos?.["attractions"] ?? []),
    ...(p?.classifiedPhotos?.["proof"] ?? []),
    ...(p?.classifiedPhotos?.["office"] ?? []),
  ].slice(0, 4);

  const galleryCategories = Object.entries(p?.classifiedPhotos ?? {}).filter(
    ([k, urls]) => k !== "logo" && urls.length > 0
  );

  const hasServices = (p?.services?.length ?? 0) > 0 || (p?.addOns?.length ?? 0) > 0;
  const hasCapacity =
    !!p?.maxTripsPerDay || !!p?.minimumBookingNotice || !!p?.guidesAvailable || !!p?.peakSeasonAvailability;

  const packagePriceRows = (p?.packageItems ?? [])
    .map((pkg, index) => {
      const price = Number(pkg?.pricePerPerson ?? 0);
      const currency = String(pkg?.currency || "USD");
      const title = String(pkg?.name || pkg?.destination || "Shared package");
      return { id: String(pkg?.id || index), price, currency, title };
    })
    .filter((row) => Number.isFinite(row.price) && row.price > 0);
  const effectiveCommissionForModal = Math.max(
    0,
    Math.min(100, useSystemCommission ? Number(systemCommission || 0) : Number(commissionDraft || 0)),
  );
  const shouldShowCommissionAdjustedPrice = isAdminPreview;
  const displayCommissionRate = Math.max(0, Number(commissionPercent || 0)) / 100;
  const formatDisplayedPrice = (rawPrice: unknown) => {
    const base = Number(rawPrice);
    if (!Number.isFinite(base)) return String(rawPrice ?? "");
    const adjusted = shouldShowCommissionAdjustedPrice ? base * (1 + displayCommissionRate) : base;
    const rounded = Math.round(adjusted * 100) / 100;
    return Number.isInteger(rounded)
      ? rounded.toLocaleString()
      : rounded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const reviewBadgeClass =
    reviewStatus === "APPROVED"
      ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
      : reviewStatus === "REJECTED"
        ? "bg-red-50 border border-red-200 text-red-700"
        : "bg-amber-50 border border-amber-200 text-amber-700";

  const formatAuditAction = (action: string) =>
    String(action || "UPDATE")
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const formatAuditTime = (iso: string) => {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return "Unknown time";
    return dt.toLocaleString();
  };

  const getAuditDetail = (details: any) => {
    if (typeof details === "string" && details.trim()) return details;
    if (!details || typeof details !== "object") return "Profile activity recorded.";
    if (typeof details?.reason === "string" && details.reason.trim()) return `Reason: ${details.reason.trim()}`;
    if (typeof details?.status === "string" && details.status.trim()) return `Status: ${details.status.trim()}`;
    if (typeof details?.message === "string" && details.message.trim()) return details.message.trim();
    return "Profile activity recorded.";
  };

  const suspendReasonOptions = [
    "Policy violation detected in submitted profile content.",
    "Repeated non-compliance with admin review requirements.",
    "Fraud risk or suspicious activity pending investigation.",
  ];

  async function reviewFromPreview(
    nextStatus: "APPROVED" | "REJECTED",
    options?: { skipConfirm?: boolean },
  ) {
    if (!isAdminPreview || !Number.isFinite(adminAgentId) || adminAgentId <= 0) return;

    let reason = "";
    if (nextStatus === "REJECTED") {
      reason = String(window.prompt("Please enter rejection reason for the submitted profile:", "") || "").trim();
      if (!reason) {
        alert("Rejection reason is required.");
        return;
      }
    }

    if (!options?.skipConfirm) {
      const confirmed = window.confirm(
        nextStatus === "APPROVED"
          ? "Approve this submitted operator profile?"
          : "Reject this submitted operator profile?",
      );
      if (!confirmed) return;
    }

    try {
      setReviewLoading(true);
      await api.patch(`/api/admin/agents/${adminAgentId}/profile-review`, {
        status: nextStatus,
        reason: reason || null,
      });
      setReviewStatus(nextStatus);
      setReviewToast({
        kind: "success",
        text: nextStatus === "APPROVED" ? "Profile approved." : "Profile rejected.",
      });
      window.setTimeout(() => setReviewToast(null), 2800);
      setSubmittedProfileAuditReloadTick((n) => n + 1);
    } catch (e: any) {
      setReviewToast({ kind: "error", text: e?.response?.data?.error || e?.message || "Failed to update profile review status" });
      window.setTimeout(() => setReviewToast(null), 3200);
    } finally {
      setReviewLoading(false);
    }
  }

  async function suspendFromPreview() {
    if (!isAdminPreview || !Number.isFinite(adminAgentId) || adminAgentId <= 0) return;
    const reason = suspendReason.trim();
    if (reason.length < 10) {
      setReviewToast({ kind: "error", text: "Suspension reason must be at least 10 characters." });
      window.setTimeout(() => setReviewToast(null), 3200);
      return;
    }

    try {
      setSuspendLoading(true);
      await api.post(`/api/admin/agents/${adminAgentId}/suspend`, { reason });
      setAgentStatus("SUSPENDED");
      setSuspendConfirmOpen(false);
      setSuspendReason("");
      setReviewToast({ kind: "success", text: "Agent suspended successfully." });
      window.setTimeout(() => setReviewToast(null), 2800);
      setSubmittedProfileAuditReloadTick((n) => n + 1);
    } catch (e: any) {
      setReviewToast({ kind: "error", text: e?.response?.data?.error || e?.message || "Failed to suspend agent." });
      window.setTimeout(() => setReviewToast(null), 3200);
    } finally {
      setSuspendLoading(false);
    }
  }

  async function saveCommissionFromModal() {
    if (!isAdminPreview) return;
    const next = useSystemCommission ? Number(systemCommission) : Number(commissionDraft);
    if (!Number.isFinite(next) || next < 0 || next > 100) {
      alert("Commission must be a number between 0 and 100.");
      return;
    }
    // Apply only for this submitted-profile review context. System default remains unchanged.
    const prev = Number(commissionPercent);
    setCommissionPercent(next);
    setCommissionModalOpen(false);

    if (Number.isFinite(adminAgentId) && adminAgentId > 0 && Math.abs(prev - next) > 0.0001) {
      try {
        const noteText = useSystemCommission
          ? `Commission reverted to system default (${systemCommission}%) for submitted profile pricing review.`
          : `Commission override set to ${next}% (system default ${systemCommission}%) for submitted profile pricing review.`;
        await api.post(`/api/admin/agents/${adminAgentId}/notes`, { text: noteText });
      } catch {
        // Non-blocking: pricing change can still apply in preview even if note creation fails.
      }
      setSubmittedProfileAuditReloadTick((n) => n + 1);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* -- Sticky topbar -- */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href={backHref}
            aria-label={backLabel}
            className={
              isAdminPreview
                ? "inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-emerald-700"
                : "inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-emerald-700"
            }
          >
            <ArrowLeft className="h-4 w-4" />
            {!isAdminPreview ? <span className="hidden sm:inline">{backLabel}</span> : null}
            {!isAdminPreview ? <span className="sm:hidden">Back</span> : null}
          </Link>
          {!isAdminPreview ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="hidden sm:inline">Preview how customers will see this profile</span>
              <span className="sm:hidden">Preview mode</span>
            </div>
          ) : <div />}
        </div>
      </div>

      {reviewToast ? (
        <div className="fixed right-4 top-20 z-[70] w-[min(420px,calc(100vw-2rem))] rounded-xl border bg-white p-3.5 shadow-xl">
          <div className="flex items-start gap-2.5">
            <span className={`mt-0.5 h-2.5 w-2.5 rounded-full ${reviewToast.kind === "success" ? "bg-emerald-500" : "bg-rose-500"}`} />
            <div>
              <p className={`text-sm font-bold ${reviewToast.kind === "success" ? "text-emerald-700" : "text-rose-700"}`}>
                {reviewToast.kind === "success" ? "Update complete" : "Action failed"}
              </p>
              <p className="mt-0.5 text-sm text-slate-700">{reviewToast.text}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        {isAdminPreview ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${reviewBadgeClass}`}>
              {reviewStatus}
            </span>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCommissionDraft(String(commissionPercent));
                  setUseSystemCommission(Math.abs(Number(commissionPercent) - Number(systemCommission)) < 0.0001);
                  setCommissionModalTab("pricing");
                  setCommissionModalOpen(true);
                }}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Edit
              </button>
              {reviewStatus === "APPROVED" ? (
                <button
                  type="button"
                  onClick={() => setSuspendConfirmOpen(true)}
                  disabled={suspendLoading || agentStatus === "SUSPENDED"}
                  className="inline-flex min-w-[132px] items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {agentStatus === "SUSPENDED" ? "Suspended" : suspendLoading ? "Suspending..." : "Suspend"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void reviewFromPreview("REJECTED")}
                    disabled={reviewLoading}
                    className="inline-flex min-w-[108px] items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => setApproveConfirmOpen(true)}
                    disabled={reviewLoading}
                    className="inline-flex min-w-[132px] items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {reviewLoading ? "Saving..." : "Approve"}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}

        {isAdminPreview && approveConfirmOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => {
              if (!reviewLoading) setApproveConfirmOpen(false);
            }}
          >
            <div
              className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-900">Confirm Approval</h3>
              <p className="mt-2 text-sm text-slate-600">
                Are you sure you want to approve this submitted profile?
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApproveConfirmOpen(false)}
                  disabled={reviewLoading}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApproveConfirmOpen(false);
                    void reviewFromPreview("APPROVED", { skipConfirm: true });
                  }}
                  disabled={reviewLoading}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-emerald-200 bg-[#02665e] px-4 text-sm font-semibold text-white hover:bg-[#02554e] disabled:opacity-50"
                >
                  {reviewLoading ? "Approving..." : "Yes, Approve"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isAdminPreview && suspendConfirmOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => {
              if (!suspendLoading) setSuspendConfirmOpen(false);
            }}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-slate-900">Are you sure?</h3>
              <p className="mt-2 text-sm text-slate-600">Are you sure you want to suspend this profile?</p>
              <div className="mt-4 mx-auto w-full max-w-md">
                <label className="mb-2 block text-xs font-semibold text-slate-600">Select suspension reason</label>
                <div className="space-y-2">
                  {suspendReasonOptions.map((reason) => (
                    <label
                      key={reason}
                      className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
                    >
                      <input
                        type="radio"
                        name="suspend-reason"
                        value={reason}
                        checked={suspendReason === reason}
                        onChange={(e) => setSuspendReason(e.target.value)}
                        className="mt-0.5 h-4 w-4 text-[#02665e]"
                      />
                      <span className="text-sm text-slate-700">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSuspendConfirmOpen(false)}
                  disabled={suspendLoading}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void suspendFromPreview()}
                  disabled={suspendLoading || !suspendReason.trim()}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {suspendLoading ? "Suspending..." : "Yes, Suspend"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isAdminPreview && commissionModalOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setCommissionModalOpen(false)}
          >
            <div
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex-1 min-w-0 pr-3">
                  <h2 className="text-xl font-bold text-slate-900">Edit NoLSAF Commission</h2>
                  <p className="text-sm text-slate-600 mt-0.5 truncate">{p?.companyName || "Submitted operator"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCommissionModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-all duration-200"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>

              <div className="flex items-center justify-center border-b border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1.5 max-w-fit">
                  <button
                    type="button"
                    onClick={() => setCommissionModalTab("pricing")}
                    className={`relative flex items-center justify-center gap-2 px-6 py-2.5 font-medium transition-all duration-200 whitespace-nowrap rounded-lg ${
                      commissionModalTab === "pricing"
                        ? "bg-[#02665e] text-white"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    <DollarSign className={`h-4 w-4 ${commissionModalTab === "pricing" ? "text-white" : "text-slate-500"}`} />
                    <span className={`text-sm ${commissionModalTab === "pricing" ? "font-semibold" : "font-medium"}`}>Pricing & Commission</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommissionModalTab("discounts")}
                    className={`relative flex items-center justify-center gap-2 px-6 py-2.5 font-medium transition-all duration-200 whitespace-nowrap rounded-lg ${
                      commissionModalTab === "discounts"
                        ? "bg-[#02665e] text-white"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    <Percent className={`h-4 w-4 ${commissionModalTab === "discounts" ? "text-white" : "text-slate-500"}`} />
                    <span className={`text-sm ${commissionModalTab === "discounts" ? "font-semibold" : "font-medium"}`}>Discounts & Bonuses</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-5 bg-slate-50">
                {commissionModalTab === "pricing" ? (
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <h3 className="text-base font-semibold text-slate-900 mb-1">Package Price Impact Preview</h3>
                      <p className="text-xs text-slate-500 mb-3">All submitted package base prices with commission-adjusted final prices.</p>
                      {packagePriceRows.length > 0 ? (
                        <div className="space-y-2 pr-1">
                          {packagePriceRows.map((row) => {
                            const commissionRate = effectiveCommissionForModal / 100;
                            const commissionAdded = Math.round((row.price * commissionRate) * 100) / 100;
                            const finalWithCommission = Math.round((row.price + commissionAdded) * 100) / 100;
                            return (
                              <div key={row.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <div>
                                  <div className="text-sm font-semibold text-slate-900 truncate" title={row.title}>{row.title}</div>
                                </div>

                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="flex flex-col">
                                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
                                      Owner&apos;s Original Price
                                      <span title="Locked - cannot be edited" aria-label="Locked - cannot be edited">
                                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                                      </span>
                                    </label>
                                    <div className="px-4 py-3 bg-slate-100 border border-slate-200 rounded-lg">
                                      <div className="text-base font-semibold text-slate-700">
                                        {row.currency} {row.price.toLocaleString()}
                                      </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1.5">Price submitted by operator</p>
                                  </div>

                                  <div className="flex flex-col">
                                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                                      Final Price (with {effectiveCommissionForModal}% NoLSAF commission)
                                    </label>
                                    <div className="px-4 py-3 bg-white border-2 border-[#02665e]/20 rounded-lg">
                                      <div className="text-base font-bold text-[#02665e] mb-1.5">
                                        {row.currency} {finalWithCommission.toLocaleString()}
                                      </div>
                                      <div className="text-xs text-slate-600 pt-2 border-t border-slate-200">
                                        <span className="font-medium text-slate-700">Commission:</span>{" "}
                                        <span className="text-[#02665e] font-semibold">
                                          {row.currency} {commissionAdded.toLocaleString()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600">No package base prices found in this submitted profile.</p>
                      )}
                    </div>

                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-4 border border-slate-200 hover:border-[#02665e]/20 transition-all duration-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-1.5 rounded-lg bg-[#02665e]/10">
                          <Settings className="h-4 w-4 text-[#02665e]" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">Commission Rate</h3>
                          <div className="text-sm text-slate-500 mt-0.5">Global NoLSAF commission applied across agent payouts.</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/60 transition-colors">
                          <input
                            type="radio"
                            checked={useSystemCommission}
                            onChange={() => setUseSystemCommission(true)}
                            className="w-4 h-4 text-[#02665e] flex-shrink-0"
                            aria-label="Use system default commission"
                            title="Use system default commission"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-slate-900">Use System Default</div>
                            <div className="text-xs text-slate-600">
                              Commission: {systemCommission}% (from Management Settings)
                            </div>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/60 transition-colors">
                          <input
                            type="radio"
                            checked={!useSystemCommission}
                            onChange={() => setUseSystemCommission(false)}
                            className="w-4 h-4 text-[#02665e] flex-shrink-0"
                            aria-label="Override commission"
                            title="Override commission"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-slate-900 mb-2">Override Commission</div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={commissionDraft}
                                onChange={(e) => setCommissionDraft(e.target.value)}
                                disabled={useSystemCommission}
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-24 px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100 disabled:text-slate-500 focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-all"
                                placeholder="0.0"
                              />
                              <span className="text-sm text-slate-600">%</span>
                            </div>
                          </div>
                        </label>

                        <div className="px-3 pt-1 text-xs text-slate-500">Current effective value: {commissionPercent}%</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="text-base font-bold text-slate-900">Discounts & Bonuses</div>
                    <p className="mt-2 text-sm text-slate-600">
                      Bonus and discount controls are managed centrally in Admin Settings.
                    </p>
                    <div className="mt-4">
                      <Link
                        href="/admin/management/settings"
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 no-underline hover:bg-slate-50"
                      >
                        Open Full Admin Settings
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 bg-white p-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCommissionModalOpen(false)}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveCommissionFromModal}
                  disabled={commissionModalTab !== "pricing"}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-[#02665e] px-4 text-sm font-semibold text-white hover:bg-[#02554e] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* -- Hero card -- */}
        <Card className="overflow-hidden">
          <HeroBanner photos={bannerPhotos} />

          {/* Branded info panel */}
          <div
            className="relative overflow-hidden px-4 pb-6 pt-0 sm:px-6"
            style={{ background: "linear-gradient(135deg, #013d38 0%, #02665e 45%, #025a52 100%)" }}
          >
            {/* ── Dot grid — right 75%, fading left ── */}
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-3/4"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.55) 1.5px, transparent 1.5px)",
                backgroundSize: "22px 22px",
                maskImage: "linear-gradient(to left, rgba(0,0,0,0.9) 0%, transparent 80%)",
                WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.9) 0%, transparent 80%)",
              }}
            />

            {/* ── Diagonal accent lines ── */}
            <svg
              className="pointer-events-none absolute right-[10%] top-0 h-full opacity-60"
              width="130"
              viewBox="0 0 130 170"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden
            >
              <line x1="130" y1="8"  x2="30"  y2="120" stroke="#606363" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="110" y1="2"  x2="10"  y2="114" stroke="#606363" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="90"  y1="0"  x2="0"   y2="100" stroke="#606363" strokeWidth="1"   strokeLinecap="round" opacity="0.55" />
            </svg>

            {/* ── Shimmer top edge ── */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            {/* ── Bottom vignette ── */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/25 to-transparent" />

            {/* ── Glass info card — logo + name + contact ── */}
            <div className="relative mt-4 rounded-2xl border border-white/[0.15] bg-white/[0.08] p-4 backdrop-blur-sm shadow-inner">
              <div className="flex items-center gap-4">
                {/* Logo — prominent, with glow ring */}
                <div className="relative shrink-0">
                  {/* Outer glow ring */}
                  <div className="absolute inset-0 rounded-2xl bg-white/20 blur-md scale-110" />
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-2xl border-2 border-white/60 bg-white shadow-2xl">
                    {logoUrl ? (
                      <Image src={logoUrl} alt="Logo" fill sizes="80px" className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#02665e]/20">
                        <Building2 className="h-8 w-8 text-white/50" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Name + badge + contact */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-extrabold text-white drop-shadow sm:text-xl leading-tight">
                      {p?.companyName || <span className="font-normal italic text-white/40">Company name not set</span>}
                    </h1>
                    {agentStatus === "ACTIVE" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/[0.12] px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
                        <BadgeCheck className="h-3.5 w-3.5" /> Verified
                      </span>
                    )}
                  </div>

                  <div className="my-2 h-px w-10 bg-white/30 rounded-full" />

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/65">
                    {p?.physicalLocation && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-white/50 shrink-0" /> {p.physicalLocation}
                      </span>
                    )}
                    {p?.contactPhone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-white/50 shrink-0" /> {p.contactPhone}
                      </span>
                    )}
                    {p?.contactEmail && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-white/50 shrink-0" /> {p.contactEmail}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Tourism pills — fixed 4-column grid ── */}
            {(p?.tourismTypes?.length ?? 0) > 0 && (
              <div className="relative mt-4 grid grid-cols-4 gap-1.5 lg:grid-cols-8">
                {p!.tourismTypes.map((t, i) => (
                  <span
                    key={t}
                    className={`truncate rounded-full border px-3 py-1 text-center text-[11px] font-semibold backdrop-blur-sm transition ${
                      i === 0
                        ? "border-white/40 bg-white/[0.18] text-white"
                        : "border-white/15 bg-transparent text-white/65 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* -- Stats strip -- */}
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex divide-x divide-slate-100">
            <StatItem value={p?.tourismTypes?.length ?? 0} label="Tour types" />
            <StatItem value={p?.vehicles?.length ?? 0} label="Vehicles" />
            <StatItem value={p?.packageItems?.length ?? 0} label="Packages" />
            <StatItem value={p?.tools?.length ?? 0} label="Tools" />
          </div>
        </div>

        {/* -- Main grid: stacked on mobile, 2+1 on desktop -- */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3 lg:items-start">

          {/* About */}
            {p?.description && (
              <div className="relative overflow-hidden rounded-2xl shadow-lg order-1 lg:col-span-2" style={{ background: "linear-gradient(135deg, #0a2825 0%, #02665e 55%, #0d3b36 100%)" }}>
                {/* Dot grid */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                    maskImage: "linear-gradient(to bottom right, transparent 20%, rgba(0,0,0,0.6) 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom right, transparent 20%, rgba(0,0,0,0.6) 100%)",
                  }}
                />
                {/* Top shimmer */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                {/* Bottom-right glow blob */}
                <div className="pointer-events-none absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-[#606363]/20 blur-3xl" />

                <div className="relative p-5">
                  {/* Header */}
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <h2 className="text-xs font-extrabold uppercase tracking-widest text-white/60">About this operator</h2>
                  </div>
                  <p className="text-sm leading-7 text-white/80 whitespace-pre-line">{p.description}</p>
                </div>
              </div>
            )}

            {/* Fleet */}
            {(p?.vehicles?.length ?? 0) > 0 && (
              <Card className="overflow-hidden order-5 lg:col-span-2">

                {/* ── Hero header banner ── */}
                <div className="relative overflow-hidden" style={{ background: "linear-gradient(120deg, #02665e 0%, #034d47 60%, #606363 100%)" }}>
                  {/* Dot grid */}
                  <div className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1.5px, transparent 1.5px)",
                      backgroundSize: "20px 20px",
                      maskImage: "linear-gradient(to left, rgba(0,0,0,0.8) 0%, transparent 70%)",
                      WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.8) 0%, transparent 70%)",
                    }}
                  />
                  {/* Giant faint Car watermark */}
                  <div className="pointer-events-none absolute -right-6 -bottom-4 opacity-[0.12]">
                    <Car className="h-32 w-32 text-white" />
                  </div>
                  {/* Shimmer */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                  <div className="relative flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/20">
                        <Car className="h-5 w-5 text-white" />
                      </span>
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/50">Fleet overview</p>
                        <p className="text-base font-extrabold text-white leading-tight">Vehicles &amp; Transport</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-2xl font-extrabold text-white leading-none">{p!.vehicles.length}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                        {p!.vehicles.length === 1 ? "vehicle" : "vehicles"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Vehicle list ── */}
                <div className="divide-y divide-slate-100">
                  {p!.vehicles.map((v, idx) => (
                    <div key={v.id} className="group relative flex items-stretch gap-0 transition-colors hover:bg-[#02665e]/[0.03]">
                      {/* Left accent bar */}
                      <div className="w-1 shrink-0 bg-gradient-to-b from-[#02665e]/40 to-[#606363]/20 group-hover:from-[#02665e] group-hover:to-[#606363]/60 transition-colors" />

                      <div className="flex flex-1 items-start gap-4 px-4 py-4 sm:px-5">
                        {/* Index badge */}
                        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-2xl border border-[#02665e]/15 bg-[#02665e]/5">
                          <Car className="h-4 w-4 text-[#02665e]" />
                          <span className="text-[9px] font-extrabold text-[#02665e]/60 leading-none mt-0.5">#{idx + 1}</span>
                        </div>

                        {/* Main info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-extrabold text-slate-900">{v.type || "Vehicle"}</span>
                            <span className="rounded-full bg-[#02665e] px-3 py-0.5 text-xs font-extrabold text-white shadow-sm">
                              ×{v.quantity || 1}
                            </span>
                          </div>

                          {/* Stat chips row */}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {v.seatsPerVehicle && (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                <Users className="h-3 w-3 text-[#02665e]" /> {v.seatsPerVehicle} seats
                              </span>
                            )}
                            {v.serviceMode && (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                <Globe2 className="h-3 w-3 text-[#02665e]" /> {v.serviceMode}
                              </span>
                            )}
                            {v.ownedBy && (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                <ShieldCheck className="h-3 w-3 text-[#606363]" /> {v.ownedBy}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vehicle photos */}
                {(p?.classifiedPhotos?.["vehicles"] ?? []).length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                    <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Fleet photos</p>
                    <PhotoCarousel urls={p!.classifiedPhotos["vehicles"]} category="vehicles" />
                  </div>
                )}
              </Card>
            )}

            {/* Services & Add-ons */}
            {hasServices && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm order-7 lg:col-span-2">

                {/* ── Services block ── */}
                {(p?.services?.length ?? 0) > 0 && (
                  <div>
                    {/* Sub-header */}
                    <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#02665e]/10 ring-1 ring-[#02665e]/20">
                        <Zap className="h-4 w-4 text-[#02665e]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">What we offer</p>
                        <p className="text-sm font-bold leading-tight text-slate-800">Services</p>
                      </div>
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#02665e]/10 text-xs font-bold text-[#02665e] ring-1 ring-[#02665e]/20">
                        {p!.services.length}
                      </span>
                    </div>
                    {/* 2-col chip grid */}
                    <div className="grid grid-cols-2 gap-2 p-3">
                      {p!.services.map((s) => (
                        <div
                          key={s}
                          className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 transition-colors hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-[#02665e]" />
                          <span className="min-w-0 truncate text-xs font-semibold text-slate-700">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Add-ons block ── */}
                {(p?.addOns?.length ?? 0) > 0 && (
                  <div className="border-t border-slate-100">
                    {/* Sub-header */}
                    <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-200">
                        <PlusCircle className="h-4 w-4 text-amber-600" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">Optional extras</p>
                        <p className="text-sm font-bold leading-tight text-slate-800">Add-ons</p>
                      </div>
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-50 text-xs font-bold text-amber-600 ring-1 ring-amber-200">
                        {p!.addOns.length}
                      </span>
                    </div>
                    {/* 2-col chip grid */}
                    <div className="grid grid-cols-2 gap-2 p-3">
                      {p!.addOns.map((a) => (
                        <div
                          key={a}
                          className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2 transition-colors hover:bg-amber-50"
                        >
                          <PlusCircle className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                          <span className="min-w-0 truncate text-xs font-semibold text-slate-700">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Tour packages */}
            {(p?.packageItems?.length ?? 0) > 0 && (
              <div className="space-y-4 order-3 lg:col-span-2">
                {/* Section label */}
                <div className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#02665e]/10 ring-1 ring-[#02665e]/15">
                      <Package className="h-4 w-4 text-[#02665e]" />
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">What&apos;s available</p>
                      <p className="text-base font-black leading-tight text-slate-900">Tour Packages</p>
                    </div>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#02665e] text-xs font-black text-white shadow-sm">
                    {p!.packageItems.length}
                  </span>
                </div>

                {/* Individual package cards */}
                {p!.packageItems.map((pkg, idx) => (
                  <div key={pkg.id} className="space-y-3">
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                      {/* Summary */}
                      <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-600 ring-1 ring-slate-200">
                          <Package className="h-3 w-3 text-[#02665e]" />
                          Package {idx + 1}
                        </span>
                        {pkg.category && (
                          <span className="inline-flex items-center rounded-full bg-[#02665e]/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#02665e] ring-1 ring-[#02665e]/15">
                            {pkg.category}
                          </span>
                        )}
                        {pkg.difficulty && (
                          (() => {
                            const difficultyHelp =
                              pkg.difficulty === "Easy"
                                ? "Suitable for most travellers with light activity and easy movement."
                                : pkg.difficulty === "Moderate"
                                  ? "Requires some fitness, longer travel time, or uneven terrain."
                                  : pkg.difficulty === "Challenging"
                                    ? "Requires good fitness and may include long days, steep areas, or demanding conditions."
                                    : "For experienced travellers only. May include high effort, rough terrain, or more demanding conditions.";

                            return (
                              <span
                                title={difficultyHelp}
                                aria-label={`${pkg.difficulty}: ${difficultyHelp}`}
                                className={`inline-flex cursor-help items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] ring-1 ${
                                  pkg.difficulty === "Easy" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" :
                                  pkg.difficulty === "Moderate" ? "bg-amber-50 text-amber-700 ring-amber-200" :
                                  pkg.difficulty === "Challenging" ? "bg-orange-50 text-orange-700 ring-orange-200" :
                                  "bg-rose-50 text-rose-700 ring-rose-200"
                                }`}
                              >
                                {pkg.difficulty === "Easy" ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                ) : pkg.difficulty === "Moderate" ? (
                                  <Gauge className="h-3.5 w-3.5 shrink-0" />
                                ) : pkg.difficulty === "Challenging" ? (
                                  <Mountain className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <Flame className="h-3.5 w-3.5 shrink-0" />
                                )}
                                {pkg.difficulty}
                              </span>
                            );
                          })()
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-2xl font-black leading-tight text-slate-950 sm:text-[28px]">{pkg.name}</p>
                        {pkg.destination && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <MapPin className="h-4 w-4 shrink-0 text-[#02665e]" />
                            <span className="text-sm font-semibold">{pkg.destination}</span>
                          </div>
                        )}
                      </div>

                      {pkg.description && (
                        <p className="max-w-3xl text-sm leading-7 text-slate-600">{pkg.description}</p>
                      )}

                      {pkg.notes && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Operator note</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{pkg.notes}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                        {pkg.duration && (
                          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <CalendarClock className="h-4 w-4 text-[#02665e]" />
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Duration</p>
                              <p className="text-sm font-semibold text-slate-800">{pkg.duration}{/^\d+$/.test(String(pkg.duration)) ? " days" : ""}</p>
                            </div>
                          </div>
                        )}
                        {pkg.mode && (
                          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <Car className="h-4 w-4 text-[#02665e]" />
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Travel mode</p>
                              <p className="text-sm font-semibold text-slate-800">{pkg.mode}</p>
                            </div>
                          </div>
                        )}
                        {(pkg.minPax || pkg.maxPax) && (
                          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <Users className="h-4 w-4 text-[#02665e]" />
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Group size</p>
                              <p className="text-sm font-semibold text-slate-800">{pkg.minPax && pkg.maxPax ? `${pkg.minPax}–${pkg.maxPax} pax` : pkg.minPax ? `Min ${pkg.minPax} pax` : `Max ${pkg.maxPax} pax`}</p>
                            </div>
                          </div>
                        )}
                        {pkg.accommodation && (
                          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <Landmark className="h-4 w-4 text-[#02665e]" />
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Accommodation</p>
                              <p className="text-sm font-semibold text-slate-800">{pkg.accommodation}</p>
                            </div>
                          </div>
                        )}
                        {pkg.mealPlan && (
                          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <Zap className="h-4 w-4 text-[#02665e]" />
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Meal plan</p>
                              <p className="text-sm font-semibold text-slate-800">{pkg.mealPlan}</p>
                            </div>
                          </div>
                        )}
                        {pkg.meetingPoint && (
                          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2 xl:col-span-3">
                            <MapPin className="h-4 w-4 text-[#02665e]" />
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Meeting / departure point</p>
                              <p className="text-sm font-semibold text-slate-800">{pkg.meetingPoint}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {pkg.pricePerPerson && (
                        <div className="grid grid-cols-2 items-center gap-4 rounded-3xl border border-[#02665e]/15 bg-gradient-to-r from-[#f3fbfa] to-white px-5 py-5">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Starting from</p>
                            <p className="mt-1 text-3xl font-black leading-none text-slate-950">
                              {pkg.currency}&nbsp;{formatDisplayedPrice(pkg.pricePerPerson)}
                            </p>
                          </div>
                          <div className="flex justify-end">
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#02665e] px-3 py-1.5 text-xs font-bold text-white">
                              <Users className="h-3.5 w-3.5" />
                              per person
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                      {/* ── BODY ── */}
                      <div className="divide-y divide-slate-100 border-t border-slate-100 bg-white">

                      {/* Included + Excluded side-by-side when both exist */}
                      {((pkg.included?.length ?? 0) > 0 || (pkg.excluded?.length ?? 0) > 0) && (
                        <div className={`grid gap-0 divide-slate-100 ${
                          (pkg.included?.length ?? 0) > 0 && (pkg.excluded?.length ?? 0) > 0
                            ? "grid-cols-2 divide-x"
                            : "grid-cols-1"
                        }`}>

                          {/* Included */}
                          {(pkg.included?.length ?? 0) > 0 && (
                            <div className="px-4 py-4">
                              <p className="mb-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#02665e]">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Included
                              </p>
                              <ul className="space-y-1.5">
                                {pkg.included.map((item, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#02665e]" />
                                    <span className="text-xs font-medium leading-tight text-slate-700">{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Excluded */}
                          {(pkg.excluded?.length ?? 0) > 0 && (
                            <div className="px-4 py-4">
                              <p className="mb-3 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-rose-500">
                                <XCircle className="h-3.5 w-3.5" />
                                Not Included
                              </p>
                              <ul className="space-y-1.5">
                                {pkg.excluded.map((item, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                                    <span className="text-xs font-medium leading-tight text-slate-500">{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Meeting point */}
                      {pkg.meetingPoint && (
                        <div className="px-5 py-3 border-t border-slate-100">
                          <p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Meeting / departure point</p>
                          <div className="flex items-start gap-1.5">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#02665e]" />
                            <span className="text-xs font-medium text-slate-700">{pkg.meetingPoint}</span>
                          </div>
                        </div>
                      )}

                      {/* Day-by-day itinerary */}
                      {(pkg.itinerary?.length ?? 0) > 0 && (
                        <div className="px-5 py-4 border-t border-slate-100">
                          <p className="mb-3 text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Day-by-day itinerary</p>
                          <ol className="space-y-3">
                            {pkg.itinerary.map((day) => (
                              <li key={day.id} className="flex gap-3">
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#02665e] text-[9px] font-black text-white">{day.day}</span>
                                <div className="min-w-0">
                                  {day.title && <p className="text-xs font-bold text-slate-800">{day.title}</p>}
                                  {day.description && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{day.description}</p>}
                                </div>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* CTA footer */}
                      <div
                        className="mx-4 mb-4 flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-gradient-to-r from-[#f7fbfa] to-white px-5 py-3.5 shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-[#02665e]" />
                          <span className="text-xs font-semibold text-slate-500">Confirmed on booking</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {p?.contactPhone && (
                            <a
                              href={`tel:${p.contactPhone}`}
                              className="no-underline inline-flex items-center gap-1.5 rounded-full bg-[#02665e] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#025a52] transition-colors"
                            >
                              <Phone className="h-3 w-3" />
                              Book Now
                            </a>
                          )}
                        </div>
                      </div>
                      </div>
                    </div>

                    {idx < p!.packageItems.length - 1 && (
                      <div className="flex justify-center py-1">
                        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
                          <span className="h-2 w-2 rounded-full bg-[#02665e]" />
                          <ChevronRight className="h-3 w-3 rotate-90 text-slate-400" />
                          <span className="h-2 w-2 rounded-full bg-slate-200" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Photo gallery — all categories except logo & vehicles (shown with fleet) */}
            {galleryCategories.filter(([k]) => k !== "vehicles").length > 0 && (
              <Card className="p-5 order-9 lg:col-span-2">
                <SectionHeading icon={<Users className="h-4 w-4" />} title="Gallery" />
                <div className="space-y-5">
                  {galleryCategories
                    .filter(([k]) => k !== "vehicles")
                    .map(([key, urls]) => (
                      <PhotoCarousel key={key} urls={urls} category={key} />
                    ))}
                </div>
              </Card>
            )}

            {/* Parks & Sites */}
            {(p?.operatingRegions?.length ?? 0) > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm order-8 lg:col-start-3">
                {/* Header strip */}
                <div className="relative flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
                  {/* Content row */}
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#02665e]/10 ring-1 ring-[#02665e]/20">
                    <Landmark className="h-4 w-4 text-[#02665e]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">Destinations</p>
                    <p className="text-sm font-bold leading-tight text-slate-800">Parks &amp; Sites</p>
                  </div>
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#02665e]/10 text-xs font-bold text-[#02665e] ring-1 ring-[#02665e]/20">
                    {p!.operatingRegions.length}
                  </span>
                </div>
                {/* Chips body */}
                <div className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    {p!.operatingRegions.map((r) => (
                      <span
                        key={r}
                        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                      >
                        <MapPin className="h-3 w-3 flex-shrink-0 text-emerald-600" />
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tools & assets */}
            {(p?.tools?.length ?? 0) > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm order-10 lg:col-start-3">
                {/* Header */}
                <div className="relative flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#02665e]/10 ring-1 ring-[#02665e]/20">
                    <Wrench className="h-4 w-4 text-[#02665e]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">Equipment &amp; support</p>
                    <p className="text-sm font-bold leading-tight text-slate-800">Tools &amp; Assets</p>
                  </div>
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#02665e]/10 text-xs font-bold text-[#02665e] ring-1 ring-[#02665e]/20">
                    {p!.tools.length}
                  </span>
                </div>
                {/* Tool items — 2-col grid on small, single col on md+ */}
                <div className="grid grid-cols-2 md:grid-cols-1 divide-slate-50 p-2 gap-1 md:gap-0 md:p-0 md:divide-y">
                  {p!.tools.map((t, i) => (
                    <div key={t} className="group flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50/80 md:rounded-none md:px-4">
                      {/* Index badge */}
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#02665e]/8 text-[10px] font-bold text-[#02665e]/70 ring-1 ring-[#02665e]/15">
                        {i + 1}
                      </span>
                      {/* Accent dot */}
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#02665e]/40 group-hover:bg-[#02665e] transition-colors" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 group-hover:text-slate-900">{t}</span>
                      {/* Checkmark — only visible on md+ (single col) */}
                      <CheckCircle2 className="hidden md:block h-3.5 w-3.5 flex-shrink-0 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Availability */}
            {hasCapacity && (
              <div
                className="relative overflow-hidden rounded-2xl shadow-lg order-4 lg:col-start-3"
                style={{ background: "linear-gradient(135deg, #0a2825 0%, #02665e 55%, #0d3b36 100%)" }}
              >
                {/* Dot grid */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                    maskImage: "linear-gradient(to bottom-left, rgba(0,0,0,0.6) 0%, transparent 60%)",
                    WebkitMaskImage: "linear-gradient(to bottom-left, rgba(0,0,0,0.6) 0%, transparent 60%)",
                  }}
                />
                {/* Shimmer top edge */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                {/* Large watermark icon */}
                <CalendarClock className="pointer-events-none absolute -bottom-3 right-2 h-24 w-24 text-white opacity-[0.05]" />

                {/* Header */}
                <div className="relative flex items-center gap-3 border-b border-white/10 px-4 py-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                    <CalendarClock className="h-4 w-4 text-white" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/50">Schedule &amp; capacity</p>
                    <p className="text-sm font-bold leading-tight text-white">What&apos;s Available</p>
                  </div>
                  {/* Live pulse badge */}
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-2.5 py-1 ring-1 ring-emerald-400/30">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-300">Live</span>
                  </span>
                </div>

                {/* 2×2 metric tiles */}
                <div className="relative grid grid-cols-2 gap-2 p-3">
                  {p?.maxTripsPerDay && (
                    <div className="flex flex-col gap-2 rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/20 ring-1 ring-amber-400/30">
                        <Zap className="h-3.5 w-3.5 text-amber-300" />
                      </span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Daily Capacity</p>
                        <p className="mt-0.5 text-2xl font-black leading-none text-white">{p.maxTripsPerDay}</p>
                        <p className="mt-1 text-[10px] leading-tight text-white/30">tours per day max</p>
                      </div>
                    </div>
                  )}
                  {p?.minimumBookingNotice && (
                    <div className="flex flex-col gap-2 rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-400/20 ring-1 ring-sky-400/30">
                        <CalendarClock className="h-3.5 w-3.5 text-sky-300" />
                      </span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Advance Notice</p>
                        <p className="mt-0.5 text-lg font-black leading-tight text-white">{p.minimumBookingNotice}</p>
                        <p className="mt-1 text-[10px] leading-tight text-white/30">required to book</p>
                      </div>
                    </div>
                  )}
                  {p?.guidesAvailable && (
                    <div className="flex flex-col gap-2 rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-400/20 ring-1 ring-violet-400/30">
                        <Users className="h-3.5 w-3.5 text-violet-300" />
                      </span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Field Guides</p>
                        <p className="mt-0.5 text-2xl font-black leading-none text-white">{p.guidesAvailable}</p>
                        <p className="mt-1 text-[10px] leading-tight text-white/30">trained professionals</p>
                      </div>
                    </div>
                  )}
                  {p?.peakSeasonAvailability && (
                    <div className="flex flex-col gap-2 rounded-xl bg-emerald-400/15 p-3 ring-1 ring-emerald-400/25">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/20 ring-1 ring-emerald-400/30">
                        <Globe2 className="h-3.5 w-3.5 text-emerald-300" />
                      </span>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/60">Peak Season</p>
                        <p className="mt-0.5 text-sm font-black leading-tight text-emerald-200">{p.peakSeasonAvailability}</p>
                        <p className="mt-1 text-[10px] leading-tight text-emerald-300/40">high demand window</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer disclaimer */}
                <div className="relative border-t border-white/10 px-4 py-2.5">
                  <p className="text-center text-[10px] text-white/25">Availability confirmed at time of booking</p>
                </div>
              </div>
            )}

            {/* Seasonal pricing */}
            {(p?.seasonalPrices?.length ?? 0) > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm order-6 lg:col-start-3">
                {/* Header */}
                <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#02665e]/10 ring-1 ring-[#02665e]/20">
                    <Tag className="h-4 w-4 text-[#02665e]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">Per person rates</p>
                    <p className="text-sm font-bold leading-tight text-slate-800">Seasonal Pricing</p>
                  </div>
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#02665e]/10 text-xs font-bold text-[#02665e] ring-1 ring-[#02665e]/20">
                    {p!.seasonalPrices.length}
                  </span>
                </div>
                {/* Season cards */}
                <div className="space-y-2 p-3">
                  {p!.seasonalPrices.map((sp) => {
                    const nameLC = sp.seasonName?.toLowerCase() ?? "";
                    const isHigh = nameLC.includes("high") || nameLC.includes("peak");
                    const isMid  = nameLC.includes("mid") || nameLC.includes("shoulder");
                    // high = warm amber/orange, mid = sky blue, low = cool slate-green
                    const palette = isHigh
                      ? { card: "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200", badge: "bg-amber-500 text-white", price: "text-amber-700", period: "text-amber-600/70", label: "HIGH", labelBg: "bg-amber-100 text-amber-700" }
                      : isMid
                      ? { card: "bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200", badge: "bg-sky-500 text-white", price: "text-sky-700", period: "text-sky-600/70", label: "MID", labelBg: "bg-sky-100 text-sky-700" }
                      : { card: "bg-gradient-to-br from-slate-50 to-teal-50/40 border-slate-200", badge: "bg-[#02665e] text-white", price: "text-[#02665e]", period: "text-slate-400", label: "LOW", labelBg: "bg-emerald-100 text-emerald-700" };
                    return (
                      <div key={sp.id} className={`relative overflow-hidden rounded-xl border p-3.5 ${palette.card}`}>
                        {/* Season label badge top-right */}
                        <span className={`absolute right-3 top-3 rounded-md px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest ${palette.labelBg}`}>
                          {palette.label}
                        </span>
                        {/* Season name + period */}
                        <div className="pr-12">
                          <p className="text-sm font-extrabold text-slate-900">{sp.seasonName}</p>
                          <p className={`mt-0.5 text-xs font-medium ${palette.period}`}>{sp.startMonth} – {sp.endMonth}</p>
                        </div>
                        {/* Price row */}
                        <div className="mt-2.5 flex items-end gap-2">
                          <span className={`text-xl font-extrabold leading-none ${palette.price}`}>
                            {sp.currency} {formatDisplayedPrice(sp.pricePerPerson)}
                          </span>
                          <span className="mb-0.5 text-xs font-medium text-slate-400">/person</span>
                        </div>
                        {sp.notes && (
                          <p className="mt-1.5 text-xs text-slate-500 italic">{sp.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Team photos */}
            {(p?.classifiedPhotos?.["team"] ?? []).length > 0 && (
              <Card className="p-5 order-11 lg:col-start-3">
                <SectionHeading icon={<Users className="h-4 w-4" />} title="Our team" />
                <PhotoCarousel urls={p!.classifiedPhotos["team"] ?? []} category="team" />
              </Card>
            )}

            {isAdminPreview && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm order-11 lg:col-span-2">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#02665e]/10 ring-1 ring-[#02665e]/20">
                      <CalendarClock className="h-4 w-4 text-[#02665e]" />
                    </span>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">Submitted profile tracking</p>
                      <p className="text-sm font-bold leading-tight text-slate-800">Audit Timeline</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubmittedProfileAuditReloadTick((n) => n + 1)}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Refresh
                  </button>
                </div>

                <div className="px-4 py-3">
                  {submittedProfileAuditLoading ? (
                    <div className="text-sm text-slate-500">Loading submitted profile audit trail...</div>
                  ) : submittedProfileAuditError ? (
                    <div className="text-sm text-rose-600">{submittedProfileAuditError}</div>
                  ) : submittedProfileAudit.length === 0 ? (
                    <div className="text-sm text-slate-500">No submitted profile activity found yet.</div>
                  ) : (
                    <ul className="space-y-2">
                      {submittedProfileAudit.map((item) => (
                        <li key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                              {formatAuditAction(item.action)}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500">{formatAuditTime(item.createdAt)}</span>
                          </div>
                          <p className="mt-1.5 text-xs text-slate-600">{getAuditDetail(item.details)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
        </div>

        {/* Footer note */}
        {!isAdminPreview ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-4 text-center text-xs text-slate-500">
            This is a preview of how this operator profile will appear to customers.{" "}
            <Link href={backHref} className="font-bold text-emerald-700 hover:text-emerald-800">
              Go to profile editor
            </Link>{" "}
            to update any details.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function OperatorProfilePreviewPage() {
  return <OperatorProfilePreviewScreen />;
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import PropertyPreview from "@/components/PropertyPreview";
import {
  Hourglass,
  AlertCircle,
  Ban,
  MapPin,
  ImageIcon,
  Eye,
  Bell,
  PenLine,
  ArrowRight,
  CheckCircle,
  Circle,
  Clock,
} from "lucide-react";

const api = axios.create({ baseURL: "", withCredentials: true, responseType: "json" });

function fmtMoney(amount: number | null | undefined, currency?: string | null) {
  if (amount == null || !Number.isFinite(Number(amount))) return "—";
  const cur = currency || "TZS";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return `${cur} ${Number(amount).toLocaleString()}`;
  }
}

function getRejectionReasons(property: any): string[] {
  if (!property.rejectionReasons) return [];
  try {
    if (typeof property.rejectionReasons === "string") {
      const parsed = JSON.parse(property.rejectionReasons);
      return Array.isArray(parsed) ? parsed : [parsed];
    }
    return Array.isArray(property.rejectionReasons) ? property.rejectionReasons : [];
  } catch {
    return [];
  }
}

/**
 * Infers which of 4 listing sections the owner has completed.
 * Returns stepsCompleted[4] and the index of the next incomplete step.
 */
function getDraftProgress(p: any): { stepsCompleted: boolean[]; nextStep: number } {
  const hasBasics = !!(p.title && p.latitude && p.longitude);
  const hasRooms = !!(
    (Array.isArray(p.rooms) && p.rooms.length > 0) ||
    (Array.isArray(p.roomsSpec) && p.roomsSpec.length > 0) ||
    p.basePrice != null
  );
  const hasAmenities = !!(Array.isArray(p.services) && p.services.length > 0);
  const hasPhotos = !!(Array.isArray(p.photos) && p.photos.length > 0);
  const stepsCompleted = [hasBasics, hasRooms, hasAmenities, hasPhotos];
  const nextStep = stepsCompleted.findIndex((c) => !c);
  return { stepsCompleted, nextStep: nextStep === -1 ? 4 : nextStep };
}

function PropertyImage({ src }: { src: string | null }) {
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        fill
        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover group-hover:scale-105 transition-transform duration-200"
      />
    );
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <ImageIcon className="w-8 h-8 text-slate-400" />
    </div>
  );
}

function LocationRow({ p }: { p: any }) {
  const parts = [p.city, p.ward, p.district, p.regionName].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-600">
      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{parts.join(", ")}</span>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-slate-200" />
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">
        {title}
      </h2>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

// ── DRAFT CARD ──────────────────────────────────────────────────────────────────────
function DraftCard({ p, onPreview }: { p: any; onPreview: (id: number) => void }) {
  const router = useRouter();
  const { stepsCompleted, nextStep } = getDraftProgress(p);
  const primaryImage = Array.isArray(p.photos) && p.photos.length > 0 ? p.photos[0] : null;
  const stepLabels = ["Basics", "Rooms", "Amenities", "Photos"];
  const totalDone = stepsCompleted.filter(Boolean).length;

  return (
    <div className="group bg-white rounded-2xl border-2 border-dashed border-slate-300 shadow-sm hover:shadow-md hover:border-slate-400 transition-all duration-200">
      <div className="px-4 pt-4">
        <div className="text-base font-bold text-slate-900 truncate">{p.title || "Untitled Draft"}</div>
      </div>

      <div className="px-4 mt-3">
        <div className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden">
          <PropertyImage src={primaryImage} />
          <div className="absolute bottom-2 left-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-white backdrop-blur-sm">
              <PenLine className="w-3 h-3 mr-1" />
              Draft
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <LocationRow p={p} />
        {p.type && (
          <span className="text-xs font-medium text-slate-500 uppercase">{p.type}</span>
        )}

        {/* Step progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Progress</span>
            <span className="text-xs text-slate-500">{totalDone} of 4 sections</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                {stepsCompleted[i] ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Circle
                    className={`w-4 h-4 ${i === nextStep ? "text-amber-500" : "text-slate-300"}`}
                  />
                )}
                <span
                  className={`text-[10px] text-center leading-tight ${
                    stepsCompleted[i]
                      ? "text-emerald-700 font-medium"
                      : i === nextStep
                      ? "text-amber-700 font-medium"
                      : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-300"
              style={{ width: `${(totalDone / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Primary CTA: Continue editing */}
        <button
          onClick={() => router.push(`/owner/properties/add?id=${p.id}`)}
          className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-[#02665e] text-white py-2.5 text-sm font-semibold transition-colors hover:bg-[#014e47]"
        >
          <PenLine className="h-4 w-4" />
          <span>Continue editing</span>
          <ArrowRight className="h-4 w-4 ml-auto" />
        </button>

        {/* Secondary: preview (only if has at least a title) */}
        {p.title && (
          <button
            onClick={() => onPreview(p.id)}
            className="inline-flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 bg-white text-slate-700 py-2 text-sm font-medium transition-colors hover:bg-slate-50"
          >
            <Eye className="h-4 w-4" />
            <span>Preview draft</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── PENDING CARD ────────────────────────────────────────────────────────────────────
function PendingCard({ p, onPreview }: { p: any; onPreview: (id: number) => void }) {
  const primaryImage = Array.isArray(p.photos) && p.photos.length > 0 ? p.photos[0] : null;
  return (
    <div className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="px-4 pt-4">
        <div className="text-base font-bold text-slate-900 truncate">{p.title || "Untitled Property"}</div>
      </div>

      <div className="px-4 mt-3">
        <div className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden">
          <PropertyImage src={primaryImage} />
          <div className="absolute bottom-2 left-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <Hourglass className="w-3 h-3 mr-1" />
              Under Review
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <LocationRow p={p} />
        {p.type && (
          <span className="text-xs font-medium text-slate-500 uppercase">{p.type}</span>
        )}
        {p.basePrice && (
          <div className="flex items-baseline gap-1">
            <div className="text-sm font-bold text-[#02665e]">{fmtMoney(p.basePrice, p.currency)}</div>
            <div className="text-[11px] text-slate-500">per night</div>
          </div>
        )}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-snug">
            Submitted for review. Our team will check your listing shortly — you will be notified once approved.
          </p>
        </div>
        <button
          onClick={() => onPreview(p.id)}
          className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-[#02665e] text-white py-2.5 text-sm font-semibold transition-colors hover:bg-[#014e47]"
        >
          <Eye className="h-4 w-4" />
          <span>View Submission</span>
        </button>
      </div>
    </div>
  );
}

// ── ACTION REQUIRED CARD (suspended / pending-with-fixes) ────────────────────────────────────────
function ActionRequiredCard({ p, onPreview }: { p: any; onPreview: (id: number) => void }) {
  const router = useRouter();
  const isSuspended = p.status === "SUSPENDED";
  const primaryImage = Array.isArray(p.photos) && p.photos.length > 0 ? p.photos[0] : null;
  const rejectionReasons = getRejectionReasons(p);
  const suspensionReason: string | null = p.suspensionReason ?? null;

  return (
    <div className="space-y-3">
      <div className="group bg-white rounded-2xl border border-red-200 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="px-4 pt-4">
          <div className="text-base font-bold text-slate-900 truncate">{p.title || "Untitled Property"}</div>
        </div>

        <div className="px-4 mt-3">
          <div className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden">
            <PropertyImage src={primaryImage} />
            <div className="absolute bottom-2 left-2">
              {isSuspended ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                  <Ban className="w-3 h-3 mr-1" />
                  Suspended
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Fixes Required
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <LocationRow p={p} />
          {p.type && (
            <span className="text-xs font-medium text-slate-500 uppercase">{p.type}</span>
          )}
          {p.basePrice && (
            <div className="flex items-baseline gap-1">
              <div className="text-sm font-bold text-[#02665e]">{fmtMoney(p.basePrice, p.currency)}</div>
              <div className="text-[11px] text-slate-500">per night</div>
            </div>
          )}

          {/* Rejection / fix reasons */}
          {rejectionReasons.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-red-800">Fixes Required</span>
              </div>
              <div className="space-y-1">
                {rejectionReasons.map((reason: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-1.5 text-xs text-red-700">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Primary CTA: Edit & Fix / Resubmit */}
          <button
            onClick={() => router.push(`/owner/properties/add?id=${p.id}`)}
            className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-red-600 text-white py-2.5 text-sm font-semibold transition-colors hover:bg-red-700"
          >
            <PenLine className="h-4 w-4" />
            <span>Edit &amp; {isSuspended ? "Resubmit" : "Fix"}</span>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </button>

          <button
            onClick={() => onPreview(p.id)}
            className="inline-flex items-center justify-center gap-2 w-full rounded-xl border border-slate-200 bg-white text-slate-700 py-2 text-sm font-medium transition-colors hover:bg-slate-50"
          >
            <Eye className="h-4 w-4" />
            <span>View Preview</span>
          </button>
        </div>
      </div>

      {/* Suspension notice below card (always shown for SUSPENDED) */}
      {isSuspended && (
        <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 border border-orange-200/60 rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Bell className="w-[18px] h-[18px] text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-orange-900 tracking-wide uppercase">Suspension Notice</span>
                <div className="h-px flex-1 bg-gradient-to-r from-orange-300/50 to-transparent" />
              </div>
              <p className="text-sm text-orange-800/90 leading-relaxed whitespace-pre-wrap font-medium">
                {suspensionReason ||
                  "This property has been temporarily suspended and removed from public view. Please check your notifications for details and steps to resolve it."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PAGE ────────────────────────────────────────────────────────────────────────────
export default function PendingProps() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [suspended, setSuspended] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [minWaitElapsed, setMinWaitElapsed] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => setMinWaitElapsed(true), 5000);

    Promise.all([
      api.get("/api/owner/properties/mine", { params: { status: "DRAFT", pageSize: 50 } }),
      api.get("/api/owner/properties/mine", { params: { status: "PENDING", pageSize: 50 } }),
      api.get("/api/owner/properties/mine", { params: { status: "SUSPENDED", pageSize: 50 } }),
    ])
      .then(([draftRes, pendingRes, suspendedRes]) => {
        if (!mounted) return;
        setDrafts((draftRes.data as any)?.items ?? []);
        setPending((pendingRes.data as any)?.items ?? []);
        setSuspended((suspendedRes.data as any)?.items ?? []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            "Failed to load properties",
        );
        setDrafts([]);
        setPending([]);
        setSuspended([]);
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; clearTimeout(timer); };
  }, []);

  function handleUpdated() {
    Promise.all([
      api.get("/api/owner/properties/mine", { params: { status: "DRAFT", pageSize: 50 } }),
      api.get("/api/owner/properties/mine", { params: { status: "PENDING", pageSize: 50 } }),
      api.get("/api/owner/properties/mine", { params: { status: "SUSPENDED", pageSize: 50 } }),
    ])
      .then(([draftRes, pendingRes, suspendedRes]) => {
        setDrafts((draftRes.data as any)?.items ?? []);
        setPending((pendingRes.data as any)?.items ?? []);
        setSuspended((suspendedRes.data as any)?.items ?? []);
      })
      .catch(() => {});
  }

  // ── Loading
  if (loading && !minWaitElapsed) {
    return (
      <div className="min-h-[260px] flex flex-col items-center justify-center text-center">
        <span aria-hidden className="dot-spinner mb-2" aria-live="polite">
          <span className="dot dot-blue" />
          <span className="dot dot-black" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </span>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">My Listings</h1>
        <div className="text-sm text-slate-600 mt-2">Loading your properties…</div>
      </div>
    );
  }

  // ── Error
  if (error) {
    return (
      <div className="min-h-[260px] flex flex-col items-center justify-center text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-2" />
        <h1 className="text-2xl font-semibold">Error Loading Properties</h1>
        <div className="text-sm text-red-600 mt-2">{error}</div>
        <button
          onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
          className="mt-4 px-4 py-2 bg-[#02665e] text-white rounded-lg hover:bg-[#014e47] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Split pending into clean vs needs-fixes
  const pendingClean = pending.filter((p) => getRejectionReasons(p).length === 0);
  const pendingNeedsFixes = pending.filter((p) => getRejectionReasons(p).length > 0);
  const allNeedsAttention = [...pendingNeedsFixes, ...suspended];
  const total = drafts.length + pending.length + suspended.length;

  // ── Empty
  if (total === 0) {
    return (
      <div className="min-h-[260px] flex flex-col items-center justify-center text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white/70 shadow-sm ring-1 ring-black/5">
          <Hourglass className="h-6 w-6 text-emerald-600" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">My Listings</h1>
        <p className="text-sm text-slate-600 mt-2">No drafts, pending reviews, or suspended properties right now.</p>
      </div>
    );
  }

  // ── Preview modal
  if (selectedPropertyId) {
    return (
      <PropertyPreview
        propertyId={selectedPropertyId}
        mode="owner"
        onUpdated={handleUpdated}
      />
    );
  }

  const summaryParts = [
    drafts.length > 0 && `${drafts.length} draft${drafts.length > 1 ? "s" : ""}`,
    pendingClean.length > 0 && `${pendingClean.length} under review`,
    allNeedsAttention.length > 0 && `${allNeedsAttention.length} needing attention`,
  ].filter(Boolean) as string[];

  // ── Main
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col items-center justify-center text-center">
        <div className="mb-2 inline-flex items-center justify-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/70 shadow-sm ring-1 ring-black/5">
            <Hourglass className="h-5 w-5 text-emerald-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">My Listings</h1>
        </div>
        {summaryParts.length > 0 && (
          <p className="text-sm text-slate-600">{summaryParts.join(" · ")}</p>
        )}
      </div>

      {/* ── Incomplete Drafts */}
      {drafts.length > 0 && (
        <section>
          <SectionHeader title="Incomplete Drafts" />
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {drafts.map((p) => (
              <DraftCard key={p.id} p={p} onPreview={setSelectedPropertyId} />
            ))}
          </div>
        </section>
      )}

      {/* ── Submitted — Under Review */}
      {pendingClean.length > 0 && (
        <section>
          <SectionHeader title="Submitted — Under Review" />
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {pendingClean.map((p) => (
              <PendingCard key={p.id} p={p} onPreview={setSelectedPropertyId} />
            ))}
          </div>
        </section>
      )}

      {/* ── Needs Attention */}
      {allNeedsAttention.length > 0 && (
        <section>
          <SectionHeader title="Needs Attention" />
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {allNeedsAttention.map((p) => (
              <ActionRequiredCard key={p.id} p={p} onPreview={setSelectedPropertyId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import PropertyPreview from "@/components/PropertyPreview";
import { Hourglass, AlertCircle, Ban, MapPin, ImageIcon, Eye, Bell } from "lucide-react";
// Use same-origin requests + secure httpOnly cookie session
const api = axios.create({ baseURL: "", withCredentials: true, responseType: "json" });

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

export default function PendingProps() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [minWaitElapsed, setMinWaitElapsed] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
  const timer = setTimeout(() => setMinWaitElapsed(true), 5000);

    // Fetch PENDING, SUSPENDED, and DRAFT so users can find saved drafts and suspended properties here
    Promise.all([
      api.get<{ items: any[] }>("/api/owner/properties/mine", { params: { status: "PENDING", pageSize: 50 } }),
      api.get<{ items: any[] }>("/api/owner/properties/mine", { params: { status: "SUSPENDED", pageSize: 50 } }),
      api.get<{ items: any[] }>("/api/owner/properties/mine", { params: { status: "DRAFT", pageSize: 50 } }),
    ])
      .then(([pending, suspended, draft]) => {
        if (!mounted) return;
        const pendingItems = Array.isArray((pending.data as any)?.items) ? (pending.data as any).items : [];
        const suspendedItems = Array.isArray((suspended.data as any)?.items) ? (suspended.data as any).items : [];
        const draftItems = Array.isArray((draft.data as any)?.items) ? (draft.data as any).items : [];
        
        console.log("Pending properties loaded:", {
          pending: pendingItems.length,
          suspended: suspendedItems.length,
          draft: draftItems.length,
          total: pendingItems.length + suspendedItems.length + draftItems.length,
        });
        
        setList([...pendingItems, ...suspendedItems, ...draftItems]);
      })
      .catch((err) => {
        if (!mounted) return;
        // Gracefully handle non-JSON or network errors
        const errorMessage = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to load properties";
        const status = err?.response?.status;
        console.error("Failed to load owner properties:", {
          message: errorMessage,
          status,
          fullError: err
        });
        setError(errorMessage);
        setList([]);
      })
      .finally(() => { if (!mounted) return; setLoading(false); });

    return () => { mounted = false; clearTimeout(timer); };
  }, []);

  // Empty state: centered icon above the title with supporting copy
  if (loading && !minWaitElapsed) {
    return (
      <div className="min-h-[260px] flex flex-col items-center justify-center text-center">
        <span aria-hidden className="dot-spinner mb-2" aria-live="polite">
          <span className="dot dot-blue" />
          <span className="dot dot-black" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </span>
        <h1 className="text-2xl font-semibold">Pending</h1>
        <div className="text-sm opacity-60 mt-2">Checking for pending properties…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[260px] flex flex-col items-center justify-center text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-2" />
        <h1 className="text-2xl font-semibold">Error Loading Properties</h1>
        <div className="text-sm opacity-90 mt-2 text-red-600">{error}</div>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            window.location.reload();
          }}
          className="mt-4 px-4 py-2 bg-[#02665e] text-white rounded-lg hover:bg-[#014e47] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="min-h-[260px] flex flex-col items-center justify-center text-center">
        <Hourglass className="h-12 w-12 text-blue-500 mb-2" />
        <h1 className="text-2xl font-semibold">Pending</h1>
        <div className="text-sm opacity-90 mt-2">Includes awaiting approval, suspended properties & requested fixes.</div>
        <div className="text-sm opacity-90 mt-2">Nothing pending.</div>
      </div>
    );
  }

  const getRejectionReasons = (property: any): string[] => {
    if (!property.rejectionReasons) return [];
    try {
      if (typeof property.rejectionReasons === 'string') {
        const parsed = JSON.parse(property.rejectionReasons);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
      return Array.isArray(property.rejectionReasons) ? property.rejectionReasons : [];
    } catch {
      return [];
    }
  };

  // If a property is selected, show PropertyPreview
  if (selectedPropertyId) {
    return (
      <PropertyPreview
        propertyId={selectedPropertyId}
        mode="owner"
        onUpdated={() => {
          // Reload properties after update
          Promise.all([
            api.get<{ items: any[] }>("/api/owner/properties/mine", { params: { status: "PENDING", pageSize: 50 } }),
            api.get<{ items: any[] }>("/api/owner/properties/mine", { params: { status: "SUSPENDED", pageSize: 50 } }),
            api.get<{ items: any[] }>("/api/owner/properties/mine", { params: { status: "DRAFT", pageSize: 50 } }),
          ])
            .then(([pending, suspended, draft]) => {
              const pendingItems = Array.isArray((pending.data as any)?.items) ? (pending.data as any).items : [];
              const suspendedItems = Array.isArray((suspended.data as any)?.items) ? (suspended.data as any).items : [];
              const draftItems = Array.isArray((draft.data as any)?.items) ? (draft.data as any).items : [];
              setList([...pendingItems, ...suspendedItems, ...draftItems]);
            })
            .catch(() => {});
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Hourglass className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-semibold">Pending</h1>
        </div>
        <p className="text-sm opacity-70">Includes awaiting approval, suspended properties & requested fixes.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {list.map(p => {
          const rejectionReasons = getRejectionReasons(p);
          const needsFixes = rejectionReasons.length > 0;
          
          const locationParts = [
            p.city,
            p.ward,
            p.district,
            p.regionName,
          ].filter(Boolean);
          const location = locationParts.join(", ") || "—";
          
          const primaryImage = p.photos && Array.isArray(p.photos) && p.photos.length > 0
            ? p.photos[0]
            : null;

          // Check if property is suspended (either SUSPENDED status or PENDING with suspension reason)
          const isSuspended = p.status === "SUSPENDED" || (p.status === "PENDING" && p.suspensionReason);
          const suspensionReason = p.suspensionReason || null;
          
          // Always show notification for SUSPENDED status
          const shouldShowNotification = p.status === "SUSPENDED" || isSuspended;
          
          return (
            <div key={p.id} className="space-y-3">
            <div
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200"
            >
              {/* Title (above image) */}
              <div className="px-4 pt-4">
                <div className="text-base font-bold text-slate-900 truncate">{p.title || "Untitled Property"}</div>
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

                  {/* Status badge overlay */}
                  <div className="absolute bottom-2 left-2">
                    {p.status === "SUSPENDED" && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                        <Ban className="w-3 h-3 mr-1" />
                        SUSPENDED
                      </span>
                    )}
                    {p.status === "PENDING" && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        <Hourglass className="w-3 h-3 mr-1" />
                        PENDING
                      </span>
                    )}
                    {p.status === "DRAFT" && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                        DRAFT
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Below image: location, type, suspension message, fixes required, and action */}
              <div className="p-4">
                <div className="flex flex-col gap-3">
                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{location}</span>
                  </div>

                  {/* Type */}
                  <span className="text-xs font-medium text-slate-500 uppercase">
                    {p.type || "Property"}
                  </span>

                  {/* Price */}
                  {p.basePrice && (
                    <div className="flex items-baseline gap-1">
                      <div className="text-sm font-bold text-[#02665e]">
                        {fmtMoney(p.basePrice, p.currency)}
                      </div>
                      <div className="text-[11px] text-slate-500">per night</div>
                    </div>
                  )}

                  {/* Fixes Required */}
                  {needsFixes && (
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

                  {/* View Full Preview Button */}
                  <button
                    onClick={() => setSelectedPropertyId(p.id)}
                    className="mt-2 inline-flex items-center justify-center gap-2 w-full rounded-xl bg-[#02665e] text-white py-2.5 text-sm font-semibold transition-colors hover:bg-[#014e47] group-hover:bg-[#014e47]"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Full Preview</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Suspension Notification - Separate Independent Card Below */}
            {shouldShowNotification && (
              <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 border border-orange-200/60 rounded-xl p-4 shadow-sm backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="relative">
                      <div className="absolute inset-0 bg-orange-400/20 rounded-full blur-sm"></div>
                      <Bell className="relative w-[18px] h-[18px] text-orange-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-orange-900 tracking-wide uppercase">Suspension Notice</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-orange-300/50 to-transparent"></div>
                    </div>
                    <p className="text-sm text-orange-800/90 leading-relaxed whitespace-pre-wrap font-medium">
                      {suspensionReason || "This property has been temporarily suspended and removed from public view. Please check your notifications for details about the suspension and steps to resolve it."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { Building2, CheckCircle2, ChevronDown, HelpCircle, Home, Landmark, LayoutGrid, MapPin, AlertCircle, Pencil, X } from "lucide-react";
import { PropertyLocationMap, type PropertyLocationDetectionMeta } from "./PropertyLocationMap";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AddPropertySection } from "./AddPropertySection";
import { StepFooter } from "./StepFooter";
import { StepHeader } from "./StepHeader";

type TouchedBasics = {
  title?: boolean;
  type?: boolean;
  buildingType?: boolean;
  totalFloors?: boolean;
  district?: boolean;
  ward?: boolean;
  street?: boolean;
  zip?: boolean;
};

export type BasicsStepProps = {
  isVisible: boolean;
  currentStep: number;
  goToPreviousStep: () => void;
  goToNextStep: () => void;

  title: string;
  setTitle: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  otherType: string;
  setOtherType: (v: string) => void;
  hotelStar: string;
  setHotelStar: (v: string) => void;

  buildingType: string;
  setBuildingType: (v: string) => void;
  totalFloors: number | "";
  setTotalFloors: Dispatch<SetStateAction<number | "">>;

  touchedBasics: TouchedBasics;
  setTouchedBasics: (updater: (prev: TouchedBasics) => TouchedBasics) => void;

  PROPERTY_TYPES: readonly string[];
  PROPERTY_TYPE_ICONS: Record<string, any>;
  PROPERTY_TYPE_STYLES: Record<string, any>;
  HOTEL_STAR_OPTIONS: Array<{ value: string; label: string }>;

  regionId: string;
  setRegionId: (v: string) => void;
  district: string;
  setDistrict: (v: string) => void;
  ward: string;
  setWard: (v: string) => void;
  street: string;
  setStreet: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  zip: string;
  setZip: (v: string) => void;
  selectedWardPostcode: string | null;

  latitude: number | "";
  setLatitude: Dispatch<SetStateAction<number | "">>;
  longitude: number | "";
  setLongitude: Dispatch<SetStateAction<number | "">>;

  districts: string[];
  wards: string[];
  streets: string[];
  REGIONS: Array<{ id: string; name: string }>;

  tourismSiteId?: number | "";
  setTourismSiteId?: Dispatch<SetStateAction<number | "">>;
  parkPlacement?: "" | "INSIDE" | "NEARBY";
  setParkPlacement?: Dispatch<SetStateAction<"" | "INSIDE" | "NEARBY">>;
};

type TourismSiteOption = {
  // Be tolerant in case an API/DB layer serializes ids as strings.
  id: number | string;
  slug: string;
  name: string;
  country: string;
};

export const BasicsStep = forwardRef<HTMLElement, BasicsStepProps>(function BasicsStep(
  props,
  forwardedRef
) {
  const {
    isVisible,
    currentStep,
    goToPreviousStep,
    goToNextStep,

  title,
  setTitle,
  type,
  setType,
  otherType,
  setOtherType,
  hotelStar,
  setHotelStar,

  buildingType,
  setBuildingType,
  totalFloors,
  setTotalFloors,

  touchedBasics,
  setTouchedBasics,

  PROPERTY_TYPES,
  PROPERTY_TYPE_ICONS,
  PROPERTY_TYPE_STYLES,
  HOTEL_STAR_OPTIONS,

  regionId,
  setRegionId,
  district,
  setDistrict,
  ward,
  setWard,
  street,
  setStreet,
  city,
  setCity,
  zip,
  setZip,
  selectedWardPostcode,

  latitude,
  setLatitude,
  longitude,
  setLongitude,

  districts,
  wards,
  streets,
  REGIONS,

  tourismSiteId,
  setTourismSiteId,
  parkPlacement,
  setParkPlacement,
} = props;

const tourismSiteIdValue = tourismSiteId ?? "";
const setTourismSiteIdValue = useMemo(
  () => setTourismSiteId ?? ((() => {}) as Dispatch<SetStateAction<number | "">>),
  [setTourismSiteId]
);
const parkPlacementValue = parkPlacement ?? "";
const setParkPlacementValue = useMemo(
  () => setParkPlacement ?? ((() => {}) as Dispatch<SetStateAction<"" | "INSIDE" | "NEARBY">>),
  [setParkPlacement]
);

const [tourismSites, setTourismSites] = useState<TourismSiteOption[]>([]);
const [tourismSitesLoading, setTourismSitesLoading] = useState(false);
const [tourismSitesError, setTourismSitesError] = useState<string | null>(null);

const [parkPickerOpen, setParkPickerOpen] = useState(false);
const [parkQuery, setParkQuery] = useState("");
const parkPickerRef = useRef<HTMLDivElement | null>(null);
const parkInputRef = useRef<HTMLInputElement | null>(null);

const [isEditingPark, setIsEditingPark] = useState(false);
const [isEditingPlacement, setIsEditingPlacement] = useState(false);

// Local fallback for display/enablement in case parent state updates are delayed.
const [localTourismSiteId, setLocalTourismSiteId] = useState<number | "">("");
const [localParkPlacement, setLocalParkPlacement] = useState<"" | "INSIDE" | "NEARBY">("");

const effectiveTourismSiteIdValue = useMemo(() => {
  return tourismSiteIdValue === "" ? localTourismSiteId : tourismSiteIdValue;
}, [localTourismSiteId, tourismSiteIdValue]);

const effectiveParkPlacementValue = useMemo(() => {
  return parkPlacementValue === "" ? localParkPlacement : parkPlacementValue;
}, [localParkPlacement, parkPlacementValue]);

useEffect(() => {
  // Sync local from parent when parent has a concrete value (e.g., editing an existing property).
  if (tourismSiteIdValue === "") return;
  setLocalTourismSiteId(tourismSiteIdValue);
}, [tourismSiteIdValue]);

useEffect(() => {
  // Sync local from parent when parent has a concrete value (e.g., editing an existing property).
  if (parkPlacementValue === "") return;
  setLocalParkPlacement(parkPlacementValue);
}, [parkPlacementValue]);

useEffect(() => {
  // Push local selection up if parent is still empty.
  if (localTourismSiteId === "") return;
  if (tourismSiteIdValue !== "") return;
  setTourismSiteIdValue(localTourismSiteId);
}, [localTourismSiteId, setTourismSiteIdValue, tourismSiteIdValue]);

useEffect(() => {
  // Push local selection up if parent is still empty.
  if (localParkPlacement === "") return;
  if (parkPlacementValue !== "") return;
  setParkPlacementValue(localParkPlacement);
}, [localParkPlacement, parkPlacementValue, setParkPlacementValue]);

const tourismCountry = useMemo(() => {
  // Current add-property location UX is Tanzania-based (REGIONS list).
  // Only allow park selection after a region is chosen to prevent mismatches.
  if (!regionId) return null;
  return "Tanzania";
}, [regionId]);

const MAJOR_TOURISM_SLUGS = useMemo(
  () =>
    new Set<string>([
      // Tanzania (seeded)
      "serengeti-national-park",
      "ngorongoro-crater",
      "tarangire-national-park",
      // Kenya (seeded)
      "maasai-mara",
      // Uganda (seeded)
      "bwindi-impenetrable",
    ]),
  []
);

const selectedTourismSite = useMemo(() => {
  if (effectiveTourismSiteIdValue === "") return null;
  const id = Number(effectiveTourismSiteIdValue);
  if (!Number.isFinite(id) || id <= 0) return null;
  return tourismSites.find((s) => Number(s.id) === id) ?? null;
}, [tourismSites, effectiveTourismSiteIdValue]);

const parkIsLocked = !!selectedTourismSite && !isEditingPark;
const placementIsLocked = effectiveTourismSiteIdValue !== "" && !!effectiveParkPlacementValue && !isEditingPlacement;

const orderedTourismSites = useMemo(() => {
  const sites = Array.isArray(tourismSites) ? tourismSites : [];
  return [...sites].sort((a, b) => {
    const aMajor = MAJOR_TOURISM_SLUGS.has(a.slug) ? 1 : 0;
    const bMajor = MAJOR_TOURISM_SLUGS.has(b.slug) ? 1 : 0;
    if (aMajor !== bMajor) return bMajor - aMajor;
    return a.name.localeCompare(b.name);
  });
}, [tourismSites, MAJOR_TOURISM_SLUGS]);

const filteredTourismSites = useMemo(() => {
  const q = parkQuery.trim().toLowerCase();
  if (!q) return orderedTourismSites;
  return orderedTourismSites.filter((s) => {
    const name = String(s.name || "").toLowerCase();
    const country = String(s.country || "").toLowerCase();
    return name.includes(q) || country.includes(q);
  });
}, [orderedTourismSites, parkQuery]);

useEffect(() => {
  function onDocMouseDown(e: MouseEvent) {
    if (!parkPickerOpen) return;
    const el = parkPickerRef.current;
    if (!el) return;
    if (e.target instanceof Node && !el.contains(e.target)) {
      setParkPickerOpen(false);
      setParkQuery("");
    }
  }
  document.addEventListener("mousedown", onDocMouseDown);
  return () => document.removeEventListener("mousedown", onDocMouseDown);
}, [parkPickerOpen]);

useEffect(() => {
  // When leaving edit mode, ensure the picker closes.
  if (isEditingPark) return;
  setParkPickerOpen(false);
  setParkQuery("");
}, [isEditingPark]);

useEffect(() => {
  let cancelled = false;
  const controller = new AbortController();

  async function loadTourismSites() {
    if (!tourismCountry) {
      setTourismSites([]);
      setTourismSitesError(null);
      setTourismSitesLoading(false);
      return;
    }

    try {
      setTourismSitesLoading(true);
      setTourismSitesError(null);

      const resp = await fetch(`/api/public/tourism-sites?country=${encodeURIComponent(tourismCountry)}`, {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!resp.ok) {
        throw new Error(`Failed to load tourism sites (${resp.status})`);
      }
      const data = (await resp.json()) as { items?: TourismSiteOption[] };
      const items = Array.isArray(data?.items) ? data.items : [];
      const normalized = items
        .map((s) => ({ ...s, id: Number((s as any)?.id) }))
        .filter((s) => Number.isFinite(s.id) && s.id > 0);

      if (!cancelled) setTourismSites(normalized);
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error("Failed to load tourism sites", e);
      if (!cancelled) setTourismSitesError(String(e?.message || "Failed to load tourism sites"));
    } finally {
      if (!cancelled) setTourismSitesLoading(false);
    }
  }

  loadTourismSites();
  return () => {
    cancelled = true;
    controller.abort();
  };
}, [tourismCountry]);

useEffect(() => {
  // If location is cleared OR selected park doesn't match the current country context, clear it.
  if (effectiveTourismSiteIdValue === "") return;

  if (!tourismCountry) {
    setTourismSiteIdValue("");
    setLocalTourismSiteId("");
    setParkPlacementValue("");
    setLocalParkPlacement("");
    setParkPickerOpen(false);
    setParkQuery("");
    setIsEditingPark(false);
    setIsEditingPlacement(false);
    return;
  }

  if (selectedTourismSite && selectedTourismSite.country !== tourismCountry) {
    setTourismSiteIdValue("");
    setLocalTourismSiteId("");
    setParkPlacementValue("");
    setLocalParkPlacement("");
    setParkPickerOpen(false);
    setParkQuery("");
    setIsEditingPark(false);
    setIsEditingPlacement(false);
  }
}, [tourismCountry, effectiveTourismSiteIdValue, selectedTourismSite, setParkPlacementValue, setTourismSiteIdValue]);

const [typePickerOpen, setTypePickerOpen] = useState(false);

const handleSectionRef = useCallback(
  (node: HTMLElement | null) => {
    if (!forwardedRef) return;

    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else {
      (forwardedRef as MutableRefObject<HTMLElement | null>).current = node;
    }
  },
  [forwardedRef]
);

  const typeOk = !!type;
  const showTypeExtras = type === "Other" || type === "Hotel";
  const collapseTypes = typeOk && !typePickerOpen;
  const visibleTypes = useMemo(() => {
    if (collapseTypes) return [type];
    return [...PROPERTY_TYPES];
  }, [PROPERTY_TYPES, collapseTypes, type]);

  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  const handleLocationDetected = useCallback((lat: number, lng: number, meta?: PropertyLocationDetectionMeta) => {
    setLatitude(lat);
    setLongitude(lng);
    setLocationAccuracy(meta?.accuracy ?? null);
  }, [setLatitude, setLongitude]);

  return (
    <AddPropertySection
      as="section"
      sectionRef={handleSectionRef}
      isVisible={isVisible}
      className="add-property-section-premium"
    >
      {isVisible && (
        <div id="propertyBasicsInner" className="w-full">
          <StepHeader
            step={1}
            title="Basic details"
            description="Start with the essentials guests care about first: property type, official address, and exact map position."
          />
          <div className="pt-4">

          <div className="space-y-6 w-full">
            <div className="relative">
              {/* Header */}
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <label className="block text-sm font-semibold text-white" id="propertyTypeLabel">
                    Property Type <span className="text-red-300">*</span>
                  </label>
                  <p className="mt-1 text-[13px] text-white/60">Select the category that best matches the guest experience you want to present.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {typeOk ? (
                    <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                      Selected: <span className="ml-1 text-emerald-300">{type}</span>
                    </div>
                  ) : null}
                  {collapseTypes ? (
                    <button
                      type="button"
                      onClick={() => setTypePickerOpen(true)}
                      className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      Change
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Type cards */}
              <div
                role="radiogroup"
                aria-labelledby="propertyTypeLabel"
                className={`grid gap-3 w-full ${collapseTypes ? "grid-cols-1 max-w-xs" : "grid-cols-2 md:grid-cols-4"}`}
              >
                {visibleTypes.map((pt) => {
                  const selected = type === pt;
                  const labelText = pt === "Other" ? "Specify if none of the above" : `Typical ${pt.toLowerCase()}`;
                  const IconComponent = PROPERTY_TYPE_ICONS[pt] || HelpCircle;

                  return (
                    <label
                      key={pt}
                      className={`group relative overflow-hidden rounded-xl border cursor-pointer transition-all duration-200 ${
                        selected
                          ? "border-emerald-300 bg-white shadow-lg"
                          : "border-white/15 bg-white/10 hover:bg-white/15 hover:border-white/25"
                      }`}
                    >
                      <input
                        type="radio"
                        name="propertyType"
                        value={pt}
                        checked={selected}
                        onChange={() => {
                          if (PROPERTY_TYPES.includes(pt)) {
                            setType(pt);
                            setTypePickerOpen(false);
                            setTouchedBasics((t) => ({ ...t, type: true }));
                          }
                        }}
                        className="sr-only"
                      />
                      <div className="flex flex-col gap-3 p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${
                            selected
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-white/15 text-white/70 group-hover:bg-white/20"
                          }`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          {selected ? (
                            <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-700">Selected</span>
                          ) : null}
                        </div>
                        <div>
                          <div className={`text-[13px] font-semibold ${selected ? "text-slate-900" : "text-white"}`}>
                            {pt}
                          </div>
                          <div className={`mt-0.5 text-[11px] leading-relaxed line-clamp-2 ${selected ? "text-slate-500" : "text-white/50"}`}>
                            {labelText}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {touchedBasics.type && !type && (
                <div id="typeError" className="text-xs text-red-300 mt-3 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Please select a property type.
                </div>
              )}
            </div>


              {/* Property name appears AFTER type is selected */}
              {typeOk ? (
                <div className="space-y-6 w-full max-w-4xl">
                  <div className="relative rounded-2xl border border-white/10 p-6 shadow-lg" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px), #02665e", backgroundSize: "18px 18px" }}>
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                        <Pencil className="h-[18px] w-[18px] text-white" />
                      </div>
                      <div>
                        <h3 className="text-[15px] font-semibold text-white leading-tight">Property Information</h3>
                        <p className="text-[13px] text-white/70 mt-0.5">Enter your property name and any additional details</p>
                      </div>
                    </div>
                    <div className="h-px bg-white/15 -mx-6 mb-6" />
                    {/* Name + related type fields */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
                      <div className={showTypeExtras ? "w-full" : "w-full lg:col-span-2"}>
                        <div className="flex flex-col space-y-2">
                          <label htmlFor="propertyName" className="block text-[13px] font-medium text-white/90">
                            Property Name <span className="text-red-300">*</span>
                          </label>
                          <input
                            id="propertyName"
                            aria-describedby={touchedBasics.title && title.trim().length < 3 ? "nameError" : undefined}
                            value={title}
                            onChange={(e) => {
                              // Security: Sanitize input - limit length and prevent XSS
                              const sanitized = e.target.value.slice(0, 200).replace(/[<>]/g, "");
                              setTitle(sanitized);
                            }}
                            onBlur={() => setTouchedBasics((t) => ({ ...t, title: true }))}
                            type="text"
                            placeholder='e.g. "Serena Hotel"'
                            maxLength={200}
                            className={`w-full h-12 px-4 text-sm rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 ${
                              touchedBasics.title && title.trim().length < 3
                                ? "border-red-400/60 bg-white text-slate-900 focus:ring-red-200/30 focus:border-red-400"
                                : "border-white/20 bg-white/95 text-slate-900 placeholder-slate-400 hover:border-white/40 focus:ring-white/20 focus:border-white/50"
                            }`}
                            aria-required={true}
                          />
                          {touchedBasics.title && title.trim().length < 3 && (
                            <p id="nameError" className="text-xs text-red-300 mt-1.5 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Please enter at least 3 characters
                            </p>
                          )}
                        </div>
                      </div>

                      {showTypeExtras ? (
                        <div className="w-full">
                          {type === "Other" && (
                            <div className="w-full">
                              <label className="block text-[13px] font-medium text-white/90 mb-2">
                                Specify property type <span className="text-red-300">*</span>
                              </label>
                              <input
                                value={otherType}
                                onChange={(e) => {
                                  // Security: Sanitize input
                                  const sanitized = e.target.value.slice(0, 100).replace(/[<>]/g, "");
                                  setOtherType(sanitized);
                                }}
                                maxLength={100}
                                className="w-full h-12 px-4 text-sm text-slate-900 placeholder-slate-400 bg-white/95 border border-white/20 rounded-xl transition-all duration-150 hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/50"
                                placeholder="Please specify"
                              />
                            </div>
                          )}

                          {type === "Hotel" && (
                            <div className="flex flex-col space-y-2 w-full">
                              <label htmlFor="hotelStarRating" className="text-[13px] font-medium text-white/90">
                                Hotel Star Rating <span className="text-red-300">*</span>
                              </label>
                              <div className="relative">
                                <select
                                  id="hotelStarRating"
                                  title="Hotel Star Rating"
                                  aria-required={true}
                                  value={hotelStar}
                                  onChange={(e) => {
                                    // Security: Validate value is from allowed options
                                    const validValue = HOTEL_STAR_OPTIONS.find(o => o.value === e.target.value)?.value || "";
                                    if (validValue) setHotelStar(validValue);
                                  }}
                                  className="w-full h-12 pl-4 pr-10 text-sm text-slate-900 bg-white/95 border border-white/20 rounded-xl transition-all duration-150 hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/50 appearance-none cursor-pointer"
                                >
                                  {HOTEL_STAR_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                  <ChevronDown className="h-4 w-4" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="relative rounded-2xl border border-white/10 p-6 shadow-lg" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px), #02665e", backgroundSize: "18px 18px" }}>
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                        <Building2 className="h-[18px] w-[18px] text-white" />
                      </div>
                      <div>
                        <label className="block text-[15px] font-semibold text-white leading-tight" id="buildingLayoutLabel">
                          Building Layout <span className="text-red-300">*</span>
                        </label>
                        <p className="text-[13px] text-white/70 mt-0.5">
                          This helps us visualize where rooms are located (floors / separate units).
                        </p>
                      </div>
                    </div>
                    <div className="h-px bg-white/15 -mx-6 mb-6" />

                    <div
                      role="radiogroup"
                      aria-labelledby="buildingLayoutLabel"
                      className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full"
                    >
                      {[
                        {
                          value: "single_storey",
                          title: "Single storey",
                          desc: "All rooms on the ground floor.",
                          Icon: Home,
                          gradient: "from-sky-50 via-white to-blue-50",
                          selectedGradient: "from-sky-100 via-white to-blue-100",
                          border: "border-sky-200",
                          selectedBorder: "border-sky-400",
                          iconBg: "bg-sky-100",
                          iconBgHover: "group-hover:bg-sky-200",
                          iconColor: "text-sky-600",
                          titleColor: "text-sky-700",
                          dot: "bg-sky-500",
                          shadow: "shadow-sky-200/60",
                        },
                        {
                          value: "multi_storey",
                          title: "Multi storey",
                          desc: "Rooms spread across multiple floors.",
                          Icon: Building2,
                          gradient: "from-violet-50 via-white to-purple-50",
                          selectedGradient: "from-violet-100 via-white to-purple-100",
                          border: "border-violet-200",
                          selectedBorder: "border-violet-400",
                          iconBg: "bg-violet-100",
                          iconBgHover: "group-hover:bg-violet-200",
                          iconColor: "text-violet-600",
                          titleColor: "text-violet-700",
                          dot: "bg-violet-500",
                          shadow: "shadow-violet-200/60",
                        },
                        {
                          value: "separate_units",
                          title: "Separate units",
                          desc: "Scattered blocks or bungalows.",
                          Icon: LayoutGrid,
                          gradient: "from-amber-50 via-white to-orange-50",
                          selectedGradient: "from-amber-100 via-white to-orange-100",
                          border: "border-amber-200",
                          selectedBorder: "border-amber-400",
                          iconBg: "bg-amber-100",
                          iconBgHover: "group-hover:bg-amber-200",
                          iconColor: "text-amber-600",
                          titleColor: "text-amber-700",
                          dot: "bg-amber-500",
                          shadow: "shadow-amber-200/60",
                        },
                      ].map(({ value, title: t, desc: d, Icon, gradient, selectedGradient, border, selectedBorder, iconBg, iconBgHover, iconColor, titleColor, dot, shadow }) => {
                        const selected = buildingType === value;
                        return (
                          <label
                            key={value}
                            className={`group relative bg-gradient-to-br ${selected ? selectedGradient : gradient} p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                              selected
                                ? `${selectedBorder} shadow-sm ring-1 ring-offset-0 ${shadow}`
                                : `${border} hover:shadow-sm hover:${shadow}`
                            }`}
                          >
                            <input
                              type="radio"
                              name="buildingType"
                              value={value}
                              checked={selected}
                              onChange={() => {
                                const allowedValues = ["single_storey", "multi_storey", "separate_units"];
                                if (allowedValues.includes(value)) {
                                  setBuildingType(value);
                                  setTouchedBasics((tb) => ({ ...tb, buildingType: true }));
                                  if (value === "single_storey") setTotalFloors(1);
                                  if (value === "separate_units") setTotalFloors("");
                                  if (value === "multi_storey") setTotalFloors((prev) => (Number(prev) >= 2 ? prev : ""));
                                }
                              }}
                              className="sr-only"
                            />
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${iconBg} ${iconBgHover}`}>
                                <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className={`font-semibold text-[13px] ${selected ? titleColor : "text-slate-800"} transition-colors duration-200`}>{t}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{d}</div>
                              </div>
                            </div>
                            {selected && (
                              <div className={`absolute top-3 right-3 w-2.5 h-2.5 ${dot} rounded-full ring-2 ring-white shadow-sm`} />
                            )}
                          </label>
                        );
                      })}
                    </div>

                    {touchedBasics.buildingType && !buildingType ? (
                      <p className="text-xs text-red-300 mt-3 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Please select a building layout.
                      </p>
                    ) : null}

                    {buildingType === "multi_storey" ? (
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-500">Floors</span>
                        <input
                          id="totalFloors"
                          type="number"
                          min={2}
                          max={100}
                          value={totalFloors as any}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") { setTotalFloors(""); return; }
                            const num = parseInt(val, 10);
                            if (!isNaN(num) && num >= 2 && num <= 100) setTotalFloors(num);
                          }}
                          onBlur={() => setTouchedBasics((tb) => ({ ...tb, totalFloors: true }))}
                          placeholder="2"
                          className={`w-16 h-8 px-2 text-xs text-center rounded-md border transition-all focus:outline-none focus:ring-1 ${
                            touchedBasics.totalFloors && (!Number(totalFloors) || Number(totalFloors) < 2)
                              ? "border-red-400 bg-red-50 text-gray-900 focus:ring-red-300"
                              : "border-gray-300 bg-white text-gray-900 hover:border-gray-400 focus:ring-emerald-500/30 focus:border-emerald-500"
                          }`}
                        />
                        {touchedBasics.totalFloors && (!Number(totalFloors) || Number(totalFloors) < 2) ? (
                          <span className="text-[10px] text-red-500">min 2</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Property Location */}
            <div className="add-property-location-module">
              <div className="add-property-location-hero">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white shadow-sm">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="inline-flex items-center rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">Address foundation</span>
                    <h2 className="mt-3 text-xl font-semibold text-white mb-1">
                      Property Location <span className="text-red-300">*</span>
                    </h2>
                    <p className="text-sm text-white/70">Enter the address details for this property.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Region / District / Ward / Street */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/70">Region <span className="text-red-300">*</span></label>
                    <div className="relative">
                      <select
                        title="Region"
                        value={regionId}
                        onChange={(e) => { setRegionId(e.target.value); setDistrict(""); setWard(""); }}
                        className={`w-full h-10 pl-3 pr-8 text-[13px] rounded-lg border appearance-none cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 ${
                          regionId
                            ? "bg-white text-slate-900 border-emerald-300 focus:ring-emerald-200"
                            : "bg-white/95 text-slate-900 border-white/25 hover:border-white/40 focus:ring-white/20"
                        }`}
                        aria-required={true}
                      >
                        <option value="">Select</option>
                        {REGIONS.map((r: { id: string; name: string }) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/70">District <span className="text-red-300">*</span></label>
                    <div className="relative">
                      <select
                        title="District"
                        value={district}
                        onChange={(e) => { setDistrict(e.target.value); setWard(""); setStreet(""); setZip(""); }}
                        onBlur={() => setTouchedBasics((t) => ({ ...t, district: true }))}
                        disabled={!regionId}
                        className={`w-full h-10 pl-3 pr-8 text-[13px] rounded-lg border appearance-none transition-all duration-150 focus:outline-none focus:ring-2 ${
                          !regionId ? "bg-white/50 text-slate-400 border-white/10 cursor-not-allowed"
                            : district ? "bg-white text-slate-900 border-emerald-300 cursor-pointer focus:ring-emerald-200"
                            : "bg-white/95 text-slate-900 border-white/25 cursor-pointer hover:border-white/40 focus:ring-white/20"
                        }`}
                        aria-required={true}
                        aria-describedby={touchedBasics.district && !district ? "districtError" : undefined}
                      >
                        <option value="">{regionId ? "Select" : "\u2014"}</option>
                        {districts.map((d: string) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-slate-400" />
                    </div>
                    {touchedBasics.district && !district ? <p id="districtError" className="text-[10px] text-red-300 mt-1">Required</p> : null}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/70">Ward <span className="text-red-300">*</span></label>
                    <div className="relative">
                      <select
                        title="Ward"
                        value={ward}
                        onChange={(e) => { setWard(e.target.value); setStreet(""); setZip(""); }}
                        onBlur={() => setTouchedBasics((t) => ({ ...t, ward: true }))}
                        disabled={!district}
                        className={`w-full h-10 pl-3 pr-8 text-[13px] rounded-lg border appearance-none transition-all duration-150 focus:outline-none focus:ring-2 ${
                          !district ? "bg-white/50 text-slate-400 border-white/10 cursor-not-allowed"
                            : ward ? "bg-white text-slate-900 border-emerald-300 cursor-pointer focus:ring-emerald-200"
                            : "bg-white/95 text-slate-900 border-white/25 cursor-pointer hover:border-white/40 focus:ring-white/20"
                        }`}
                        aria-required={true}
                        aria-describedby={touchedBasics.ward && !ward ? "wardError" : undefined}
                      >
                        <option value="">{district ? "Select" : "\u2014"}</option>
                        {wards.map((w: string) => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-slate-400" />
                    </div>
                    {touchedBasics.ward && !ward ? <p id="wardError" className="text-[10px] text-red-300 mt-1">Required</p> : null}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/70">Street <span className="text-red-300">*</span></label>
                    <div className="relative">
                      <select
                        title="Street"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        onBlur={() => setTouchedBasics((t) => ({ ...t, street: true }))}
                        disabled={!ward}
                        className={`w-full h-10 pl-3 pr-8 text-[13px] rounded-lg border appearance-none transition-all duration-150 focus:outline-none focus:ring-2 ${
                          !ward ? "bg-white/50 text-slate-400 border-white/10 cursor-not-allowed"
                            : street ? "bg-white text-slate-900 border-emerald-300 cursor-pointer focus:ring-emerald-200"
                            : "bg-white/95 text-slate-900 border-white/25 cursor-pointer hover:border-white/40 focus:ring-white/20"
                        }`}
                        aria-required={true}
                      >
                        <option value="">{ward ? "Select" : "\u2014"}</option>
                        {streets.map((s: string) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-slate-400" />
                    </div>
                    {touchedBasics.street && !street ? <p id="streetErrorAdmin" className="text-[10px] text-red-300 mt-1">Required</p> : null}
                  </div>
                </div>

                {/* City + Zip */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/70">City <span className="text-white/40 normal-case tracking-normal text-[10px]">optional</span></label>
                    <input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={`w-full h-10 px-3 text-[13px] rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 ${
                        city.trim()
                          ? "bg-white text-slate-900 border-emerald-300 focus:ring-emerald-200"
                          : "bg-white/95 text-slate-900 border-white/25 placeholder-slate-400 hover:border-white/40 focus:ring-white/20"
                      }`}
                      placeholder="Enter city"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/70">Zip {selectedWardPostcode ? <span className="text-red-300">*</span> : <span className="text-white/40 normal-case tracking-normal text-[10px]">optional</span>}</label>
                    <input
                      id="zip"
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      onBlur={() => setTouchedBasics((t) => ({ ...t, zip: true }))}
                      readOnly={!!selectedWardPostcode}
                      className={`w-full h-10 px-3 text-[13px] rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 ${
                        selectedWardPostcode
                          ? "bg-emerald-50 text-slate-700 border-emerald-300 cursor-not-allowed"
                          : zip.trim()
                            ? "bg-white text-slate-900 border-emerald-300 focus:ring-emerald-200"
                            : "bg-white/95 text-slate-900 border-white/25 placeholder-slate-400 hover:border-white/40 focus:ring-white/20"
                      }`}
                      placeholder={selectedWardPostcode ? "Auto-filled" : "Enter postcode"}
                      aria-required={!!selectedWardPostcode}
                    />
                    {touchedBasics.zip && selectedWardPostcode && (!zip || zip.trim().length === 0) ? <p id="zipError" className="text-[10px] text-red-300 mt-1">Required</p> : null}
                    {selectedWardPostcode && zip ? <p className="text-[10px] text-emerald-300 mt-1">Auto-filled from ward</p> : null}
                  </div>
                </div>
              </div>


              <div className="mt-6 add-property-location-submodule">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <Landmark className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight text-white">Park / Tourism Site</h3>
                    <p className="text-xs text-white/60">Is your property inside or near a national park or reserve? If not, leave it blank.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Tourism site / Park */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/70">Tourism site / Park</label>
                    <div ref={parkPickerRef} className="relative">
                      <input
                        ref={parkInputRef}
                        value={parkPickerOpen ? parkQuery : selectedTourismSite?.name ?? ""}
                        onFocus={() => {
                          if (tourismSitesLoading || !tourismCountry) return;
                          setParkPickerOpen(true);
                          setParkQuery(selectedTourismSite?.name ?? "");
                        }}
                        onChange={(e) => {
                          setParkQuery(e.target.value);
                          if (!tourismSitesLoading && tourismCountry) setParkPickerOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setParkPickerOpen(false);
                            setParkQuery("");
                          }
                        }}
                        placeholder={
                          !tourismCountry
                            ? "Set location first"
                            : tourismSitesLoading
                              ? "Loading\u2026"
                              : "Search or skip"
                        }
                        className={`w-full h-10 pl-3 pr-16 text-[13px] rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 ${
                          !tourismCountry || tourismSitesLoading
                            ? "bg-white/50 text-slate-400 border-white/10 cursor-not-allowed"
                            : selectedTourismSite
                              ? "bg-white text-slate-900 border-emerald-300 focus:ring-emerald-200"
                              : "bg-white/95 text-slate-900 border-white/25 placeholder-slate-400 hover:border-white/40 focus:ring-white/20"
                        }`}
                        role="combobox"
                        aria-haspopup="listbox"
                        aria-expanded={parkPickerOpen}
                        aria-controls="parkListbox"
                        disabled={tourismSitesLoading || !tourismCountry}
                        title="Tourism site"
                      />

                      {selectedTourismSite ? (
                        <button
                          type="button"
                          onClick={() => {
                            setTourismSiteIdValue("");
                            setLocalTourismSiteId("");
                            setParkPlacementValue("");
                            setLocalParkPlacement("");
                            setParkPickerOpen(false);
                            setParkQuery("");
                            setIsEditingPark(false);
                            setIsEditingPlacement(false);
                            window.setTimeout(() => parkInputRef.current?.focus(), 0);
                          }}
                          className="absolute right-8 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-6 w-6 rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          title="Clear park"
                          aria-label="Clear park"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      ) : null}

                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 z-10">
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${parkPickerOpen ? "rotate-180" : ""}`} />
                      </div>

                      {parkPickerOpen ? (
                        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-200/50 ring-1 ring-black/5">
                          <div id="parkListbox" role="listbox" className="max-h-60 overflow-auto py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setTourismSiteIdValue("");
                                setLocalTourismSiteId("");
                                setParkPlacementValue("");
                                setLocalParkPlacement("");
                                setParkPickerOpen(false);
                                setParkQuery("");
                                setIsEditingPark(false);
                                setIsEditingPlacement(false);
                              }}
                              className="w-full text-left px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50"
                              role="option"
                              aria-selected={effectiveTourismSiteIdValue === ""}
                            >
                              Not linked to a park
                            </button>

                            {tourismSitesLoading ? (
                              <div className="px-3 py-2 text-[13px] text-slate-500">Loading parks{"\u2026"}</div>
                            ) : null}

                            {!tourismSitesLoading && filteredTourismSites.length === 0 ? (
                              <div className="px-3 py-2 text-[13px] text-slate-500">No parks found.</div>
                            ) : null}

                            {!tourismSitesLoading
                              ? filteredTourismSites.map((s) => {
                                  const selected =
                                    effectiveTourismSiteIdValue !== "" &&
                                    Number(effectiveTourismSiteIdValue) === Number(s.id);
                                  const isMajor = MAJOR_TOURISM_SLUGS.has(s.slug);
                                  return (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => {
                                        const nextId = Number(s.id);
                                        setLocalTourismSiteId(nextId);
                                        setTourismSiteIdValue(nextId);
                                        setParkPickerOpen(false);
                                        setParkQuery("");
                                        setIsEditingPark(false);
                                        setIsEditingPlacement(false);
                                      }}
                                      className={`w-full text-left px-3 py-2 text-[13px] transition-colors hover:bg-slate-50 ${selected ? "bg-emerald-50" : ""}`}
                                      role="option"
                                      aria-selected={selected}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="truncate text-slate-900">
                                            {s.name}{" "}
                                            {isMajor ? (
                                              <span className="ml-1 text-[10px] font-semibold text-emerald-700">Major</span>
                                            ) : null}
                                          </div>
                                          <div className="truncate text-[10px] text-slate-500">{s.country}</div>
                                        </div>
                                        {selected ? (
                                          <span className="text-[10px] font-semibold text-emerald-700">Selected</span>
                                        ) : null}
                                      </div>
                                    </button>
                                  );
                                })
                              : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {tourismSitesError ? <p className="text-[10px] text-red-300 mt-1">{tourismSitesError}</p> : null}
                  </div>

                  {/* Placement */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/70">Placement</label>
                    <div className="relative">
                      <select
                        value={effectiveParkPlacementValue}
                        onChange={(e) => {
                          const next = String(e.target.value || "") as "" | "INSIDE" | "NEARBY";
                          setLocalParkPlacement(next);
                          setParkPlacementValue(next);
                          if (effectiveTourismSiteIdValue !== "" && next) setIsEditingPlacement(false);
                        }}
                        disabled={effectiveTourismSiteIdValue === ""}
                        className={`w-full h-10 pl-3 pr-8 text-[13px] rounded-lg border appearance-none transition-all duration-150 focus:outline-none focus:ring-2 ${
                          effectiveTourismSiteIdValue === ""
                            ? "bg-white/50 text-slate-400 border-white/10 cursor-not-allowed"
                            : effectiveParkPlacementValue
                              ? "bg-white text-slate-900 border-emerald-300 cursor-pointer focus:ring-emerald-200"
                              : "bg-white/95 text-slate-900 border-white/25 cursor-pointer hover:border-white/40 focus:ring-white/20"
                        }`}
                        aria-label="Park placement"
                      >
                        <option value="" disabled>Select placement</option>
                        <option value="INSIDE">Inside the park</option>
                        <option value="NEARBY">Nearby the park</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-slate-400" />
                    </div>
                  </div>
                </div>


              </div>

              {/* Location — drag-to-pin map */}
              {(() => {
                const locationDetected = typeof latitude === "number" && Number.isFinite(latitude) && typeof longitude === "number" && Number.isFinite(longitude) && locationAccuracy !== null && locationAccuracy <= 100;
                return (
                  <div className="mt-6">
                    <PropertyLocationMap
                      latitude={typeof latitude === "number" && Number.isFinite(latitude) ? latitude : NaN}
                      longitude={typeof longitude === "number" && Number.isFinite(longitude) ? longitude : NaN}
                      onLocationDetected={handleLocationDetected}
                    />

                    {locationDetected ? (
                      <div className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-emerald-800">Location locked</p>
                            <p className="text-[11px] text-emerald-600 truncate">
                              {typeof latitude === "number" ? latitude.toFixed(6) : ""}, {typeof longitude === "number" ? longitude.toFixed(6) : ""}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setLatitude("");
                            setLongitude("");
                            setLocationAccuracy(null);
                          }}
                          className="shrink-0 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          Reset
                        </button>
                      </div>
                    ) : (
                      <details className="mt-4 group">
                        <summary className="cursor-pointer select-none list-none text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1">
                          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                          Edit coordinates manually
                        </summary>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col space-y-1.5">
                            <label htmlFor="latitude" className="block text-xs font-medium text-slate-700">Latitude</label>
                            <input
                              id="latitude"
                              type="number"
                              step="any"
                              value={latitude as any}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === "") return setLatitude("");
                                const n = e.target.valueAsNumber;
                                setLatitude(Number.isFinite(n) ? n : "");
                              }}
                              className="w-full h-11 px-3 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              placeholder="e.g. -6.827000"
                            />
                          </div>
                          <div className="flex flex-col space-y-1.5">
                            <label htmlFor="longitude" className="block text-xs font-medium text-slate-700">Longitude</label>
                            <input
                              id="longitude"
                              type="number"
                              step="any"
                              value={longitude as any}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === "") return setLongitude("");
                                const n = e.target.valueAsNumber;
                                setLongitude(Number.isFinite(n) ? n : "");
                              }}
                              className="w-full h-11 px-3 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              placeholder="e.g. 39.267500"
                            />
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                );
              })()}



            </div>
          </div>

          <StepFooter
            onPrev={goToPreviousStep}
            onNext={goToNextStep}
            prevDisabled={currentStep <= 0}
            nextDisabled={currentStep >= 5}
          />
        </div>
      )}
    </AddPropertySection>
  );
});

BasicsStep.displayName = "BasicsStep";



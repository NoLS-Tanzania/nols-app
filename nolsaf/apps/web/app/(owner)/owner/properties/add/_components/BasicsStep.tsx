"use client";

import type { ComponentType, Dispatch, MutableRefObject, SetStateAction } from "react";
import { AlertTriangle, Building2, CheckCircle2, ChevronDown, HelpCircle, Home, LayoutGrid, MapPin, AlertCircle, Pencil, X } from "lucide-react";
import { forwardRef, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";

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

  locationTrackingEnabled: boolean;
  locationLoading: boolean;
  handleLocationToggle: (enabled: boolean) => void;
  onLocationDetected?: (lat: number, lng: number, meta?: { source?: "gps" | "pin"; accuracy?: number | null }) => void;

  tourismSiteId?: number | "";
  setTourismSiteId?: Dispatch<SetStateAction<number | "">>;
  parkPlacement?: "" | "INSIDE" | "NEARBY";
  setParkPlacement?: Dispatch<SetStateAction<"" | "INSIDE" | "NEARBY">>;

  PropertyLocationMap: ComponentType<{
    latitude: number;
    longitude: number;
    postcode: string | null;
    onLocationDetected: (lat: number, lng: number, meta?: { source?: "gps" | "pin"; accuracy?: number | null }) => void;
  }>;
  /** Warning message when the map pin region doesn't match the selected Region */
  locationMismatchWarning?: string | null;
  /** True while the reverse-geocoding consistency check is in-flight */
  checkingPinLocation?: boolean;
  locationSource?: "gps" | "pin" | null;
  locationAccuracyMeters?: number | null;
  detectedAddress?: string | null;
  detectedRegion?: string | null;
  detectedDistrict?: string | null;
  detectedWard?: string | null;
  detectedPostcode?: string | null;
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

  locationTrackingEnabled,
  locationLoading,
  handleLocationToggle,
  onLocationDetected,

  tourismSiteId,
  setTourismSiteId,
  parkPlacement,
  setParkPlacement,

PropertyLocationMap,
  locationMismatchWarning,
  checkingPinLocation,
  locationSource,
  locationAccuracyMeters,
  detectedAddress,
  detectedRegion,
  detectedDistrict,
  detectedWard,
  detectedPostcode,
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

useEffect(() => {
  // Once a park is selected, keep placement in a valid state.
  if (effectiveTourismSiteIdValue === "") return;
  if (effectiveParkPlacementValue) return;
  setLocalParkPlacement("NEARBY");
  setParkPlacementValue("NEARBY");
}, [effectiveTourismSiteIdValue, effectiveParkPlacementValue, setParkPlacementValue]);

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

const nameOk = title.trim().length >= 3;
  const typeOk = !!type;
  const showTypeExtras = type === "Other" || type === "Hotel";
  const collapseTypes = typeOk && nameOk && !typePickerOpen;
  const visibleTypes = useMemo(() => {
    if (collapseTypes) return [type];
    return [...PROPERTY_TYPES];
  }, [PROPERTY_TYPES, collapseTypes, type]);

  // Calculate completion status
  const basicsCompleted = useMemo(() => {
    const hasName = nameOk;
    const hasType = typeOk;
    const hasBuildingType = !!buildingType;
    const hasFloors = buildingType === "single_storey" || buildingType === "separate_units" || (buildingType === "multi_storey" && Number(totalFloors) >= 2);
    const hasLocation = !!regionId && !!district && !!ward && !!street;
    const hasExtras = !showTypeExtras || (type === "Other" ? otherType.trim().length > 0 : type === "Hotel" ? !!hotelStar : true);
    
    return hasName && hasType && hasBuildingType && hasFloors && hasLocation && hasExtras;
  }, [nameOk, typeOk, buildingType, totalFloors, regionId, district, ward, street, showTypeExtras, otherType, hotelStar, type]);

  const completionCount = useMemo(() => {
    let count = 0;
    if (nameOk) count++;
    if (typeOk) count++;
    if (buildingType) count++;
    if (buildingType === "single_storey" || buildingType === "separate_units" || (buildingType === "multi_storey" && Number(totalFloors) >= 2)) count++;
    if (regionId && district && ward && street) count++;
    if (!showTypeExtras || (type === "Other" ? otherType.trim().length > 0 : type === "Hotel" ? !!hotelStar : true)) count++;
    return count;
  }, [nameOk, typeOk, buildingType, totalFloors, regionId, district, ward, street, showTypeExtras, otherType, hotelStar, type]);

  const totalFields = 6;
  const completionPercent = Math.round((completionCount / totalFields) * 100);

  return (
    <AddPropertySection
      as="section"
      sectionRef={handleSectionRef}
      isVisible={isVisible}
      className="add-property-section-premium"
    >
      {isVisible && (
        <div id="propertyBasicsInner" className="w-full">
          <div className="add-property-section-hero">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <span className="add-property-kicker">Premium Listing Setup</span>
                <div className="mt-4">
                  <StepHeader
                    step={1}
                    title="Basic details"
                    description="Shape the first impression with a strong property identity, precise location, and structured listing data."
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <span className="add-property-metric-chip">{completionPercent}% ready</span>
                <span className="add-property-metric-chip">Step 1 of 6</span>
              </div>
            </div>
          </div>
          <div className="pt-4">
            <div className="add-property-status-premium mb-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl font-bold text-base transition-all duration-300 ${
                  basicsCompleted
                    ? "bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-200/50"
                    : "bg-amber-100 text-amber-700 shadow-sm shadow-amber-200/50"
                }`}>
                  {completionCount}/{totalFields}
                  </div>
                  <div className="text-sm text-gray-700">
                    <div className="font-semibold text-slate-900">Basic details</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-gray-600">
                      {basicsCompleted ? (
                        <span className="flex items-center gap-1 font-bold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Complete and ready for the next step
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-bold text-amber-600">
                          <AlertCircle className="w-3.5 h-3.5" /> {totalFields - completionCount} required items remaining
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    All fields required <span className="text-red-500">*</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    Exact location verification enabled
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <span>Section progress</span>
                  <span>{completionPercent}%</span>
                </div>
                <div className="add-property-progress-track">
                  <div className="add-property-progress-fill" style={{ width: `${completionPercent}%` }} />
                </div>
              </div>
            </div>

          <div className="space-y-6 w-full">
            <div className="add-property-panel-premium">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900" id="propertyTypeLabel">
                    Property Type <span className="text-red-500">*</span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500">Select the category that best matches the guest experience you want to present.</p>
                </div>
                {typeOk ? (
                  <div className="hidden sm:inline-flex items-center rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm shadow-slate-200/40">
                    Chosen type: <span className="ml-1 text-emerald-700">{type}</span>
                  </div>
                ) : null}
                {collapseTypes ? (
                  <button
                    type="button"
                    onClick={() => setTypePickerOpen(true)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    Change
                  </button>
                ) : null}
              </div>

              <div
                role="radiogroup"
                aria-labelledby="propertyTypeLabel"
                className={`grid gap-3 w-full ${collapseTypes ? "grid-cols-1 sm:grid-cols-1 md:grid-cols-1 max-w-sm" : "grid-cols-2 sm:grid-cols-2 md:grid-cols-4"}`}
              >
                {visibleTypes.map((pt) => {
                  const selected = type === pt;
                  const labelText = pt === "Other" ? "Specify if none of the above" : `Typical ${pt.toLowerCase()}`;
                  const IconComponent = PROPERTY_TYPE_ICONS[pt] || HelpCircle;
                  const tone = PROPERTY_TYPE_STYLES[pt] || PROPERTY_TYPE_STYLES.Other || {
                    border: "border-slate-400",
                    text: "text-slate-700",
                    bg: "from-white to-slate-50",
                  };

                  return (
                    <label
                      key={pt}
                      className={`group relative overflow-hidden rounded-2xl border cursor-pointer transition-all duration-300 ${
                        selected
                          ? `${tone.border} bg-gradient-to-br ${tone.bg} shadow-lg shadow-slate-200/50 ring-1 ring-black/5`
                          : "border-slate-200/80 bg-white/88 shadow-sm shadow-slate-200/35 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
                      }`}
                    >
                      <input
                        type="radio"
                        name="propertyType"
                        value={pt}
                        checked={selected}
                        onChange={() => {
                          // Security: Sanitize input - only allow values from PROPERTY_TYPES
                          if (PROPERTY_TYPES.includes(pt)) {
                            setType(pt);
                            setTypePickerOpen(false);
                            setTouchedBasics((t) => ({ ...t, type: true }));
                          }
                        }}
                        className="sr-only"
                      />
                      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${selected ? "from-[#02665e] via-emerald-400 to-transparent" : "from-slate-200 via-slate-100 to-transparent"}`} />
                      <div className="flex h-full flex-col justify-between gap-4 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${
                          selected
                            ? `bg-white/80 ${tone.text} shadow-sm shadow-white/60`
                            : "bg-slate-100 text-slate-600 group-hover:bg-slate-50"
                        }`}>
                          <IconComponent
                            className={`h-5 w-5 transition-colors duration-300 ${
                              selected ? tone.text : "text-slate-600"
                            }`}
                          />
                        </div>
                          <div className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-all ${
                            selected
                              ? "border-white/60 bg-white/75 text-slate-700"
                              : "border-slate-200 bg-slate-50 text-slate-500"
                          }`}>
                            {selected ? "Selected" : "Type"}
                          </div>
                        </div>
                        <div>
                          <div className={`text-[15px] font-semibold transition-colors duration-300 ${selected ? tone.text : "text-slate-900"}`}>
                            {pt}
                          </div>
                          <div className={`mt-1 text-xs leading-relaxed transition-colors line-clamp-2 ${selected ? "text-slate-700" : "text-slate-500"}`}>
                            {labelText}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {touchedBasics.type && !type && (
                <div id="typeError" className="text-xs text-red-600 mt-3 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Please select a property type.
                </div>
              )}
            </div>

              {/* Property name appears AFTER type is selected */}
              {typeOk ? (
                <div className="space-y-6 w-full max-w-4xl">
                  <div className="add-property-panel-premium">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">Property Information</h3>
                      <p className="text-xs text-gray-500">Enter your property name and any additional details</p>
                    </div>
                    {/* Name + related type fields */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                      <div className={showTypeExtras ? "w-full" : "w-full lg:col-span-2"}>
                        <div className="flex flex-col space-y-2">
                          <label htmlFor="propertyName" className="block text-sm font-semibold text-gray-900">
                            Property Name <span className="text-red-500">*</span>
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
                            className={`w-full h-11 px-4 text-sm rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 ${
                              touchedBasics.title && title.trim().length < 3
                                ? "border-red-400 bg-red-50 text-gray-900 focus:ring-red-200 focus:border-red-500"
                                : "border-gray-300 bg-white text-gray-900 placeholder-gray-400 hover:border-gray-400 focus:ring-emerald-500/20 focus:border-emerald-500"
                            }`}
                            aria-required={true}
                          />
                          {touchedBasics.title && title.trim().length < 3 && (
                            <p id="nameError" className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
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
                              <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Specify property type <span className="text-red-500">*</span>
                              </label>
                              <input
                                value={otherType}
                                onChange={(e) => {
                                  // Security: Sanitize input
                                  const sanitized = e.target.value.slice(0, 100).replace(/[<>]/g, "");
                                  setOtherType(sanitized);
                                }}
                                maxLength={100}
                                className="w-full h-11 px-4 text-sm text-gray-900 placeholder-gray-400 bg-white border-2 border-gray-300 rounded-xl transition-all duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                placeholder="Please specify"
                              />
                            </div>
                          )}

                          {type === "Hotel" && (
                            <div className="flex flex-col space-y-2 w-full">
                              <label htmlFor="hotelStarRating" className="text-sm font-semibold text-gray-900">
                                Hotel Star Rating <span className="text-red-500">*</span>
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
                                  className="w-full h-11 pl-4 pr-10 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-xl transition-all duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none cursor-pointer"
                                >
                                  {HOTEL_STAR_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                  <ChevronDown className="h-4 w-4" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="add-property-panel-premium">
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-900" id="buildingLayoutLabel">
                        Building Layout <span className="text-red-500">*</span>
                      </label>
                      <p className="mt-1 text-xs text-gray-500">
                        This helps us visualize where rooms are located (floors / separate units).
                      </p>
                    </div>

                    <div
                      role="radiogroup"
                      aria-labelledby="buildingLayoutLabel"
                      className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full"
                    >
                      {[
                        {
                          value: "single_storey",
                          title: "Single storey",
                          desc: "All rooms are on the ground floor.",
                          Icon: Home,
                        },
                        {
                          value: "multi_storey",
                          title: "Multi‑storey",
                          desc: "Rooms can be on different floors.",
                          Icon: Building2,
                        },
                        {
                          value: "separate_units",
                          title: "Separate units",
                          desc: "Rooms are in scattered blocks/bungalows.",
                          Icon: LayoutGrid,
                        },
                      ].map(({ value, title: t, desc: d, Icon }) => {
                        const selected = buildingType === value;
                        return (
                          <label
                            key={value}
                            className={`group relative bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                              selected
                                ? "border-emerald-500 shadow-md shadow-emerald-500/20"
                                : "border-gray-200 hover:border-emerald-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="buildingType"
                              value={value}
                              checked={selected}
                              onChange={() => {
                                // Security: Validate value is from allowed options
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
                              <div
                                className={`mt-0.5 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                                  selected ? "bg-emerald-100 group-hover:bg-emerald-200 group-hover:scale-110" : "bg-gray-100 group-hover:bg-emerald-100"
                                }`}
                              >
                                <Icon className={`w-5 h-5 transition-colors duration-300 ${selected ? "text-emerald-600" : "text-gray-600"}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className={`font-semibold text-sm transition-colors duration-300 ${selected ? "text-emerald-700" : "text-gray-900"}`}>{t}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{d}</div>
                              </div>
                            </div>
                            {selected && (
                              <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse border-2 border-white" />
                            )}
                          </label>
                        );
                      })}
                    </div>

                    {touchedBasics.buildingType && !buildingType ? (
                      <p className="text-xs text-red-600 mt-3 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Please select a building layout.
                      </p>
                    ) : null}

                    {buildingType === "multi_storey" ? (
                      <div className="mt-4 max-w-sm">
                        <label htmlFor="totalFloors" className="block text-sm font-semibold text-gray-900 mb-2">
                          Total Floors <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="totalFloors"
                          type="number"
                          min={2}
                          max={100}
                          value={totalFloors as any}
                          onChange={(e) => {
                            // Security: Validate and sanitize numeric input
                            const val = e.target.value;
                            if (val === "") {
                              setTotalFloors("");
                              return;
                            }
                            const num = parseInt(val, 10);
                            if (!isNaN(num) && num >= 2 && num <= 100) {
                              setTotalFloors(num);
                            }
                          }}
                          onBlur={() => setTouchedBasics((tb) => ({ ...tb, totalFloors: true }))}
                          placeholder="e.g. 5"
                          className={`w-full h-11 px-4 text-sm rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 ${
                            touchedBasics.totalFloors && (!Number(totalFloors) || Number(totalFloors) < 2)
                              ? "border-red-400 bg-red-50 text-gray-900 focus:ring-red-200 focus:border-red-500"
                              : "border-gray-300 bg-white text-gray-900 placeholder-gray-400 hover:border-gray-400 focus:ring-emerald-500/20 focus:border-emerald-500"
                          }`}
                        />
                        {touchedBasics.totalFloors && (!Number(totalFloors) || Number(totalFloors) < 2) ? (
                          <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Please enter at least 2 floors.
                          </p>
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
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-300/40">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="add-property-kicker">Address foundation</span>
                      <h2 className="mt-3 text-xl font-semibold text-slate-900 mb-1">
                        Property Location <span className="text-rose-600">*</span>
                      </h2>
                      <p className="max-w-2xl text-sm leading-relaxed text-slate-600">Build the official address in the right order so the property pin, postcode, and destination discovery stay consistent across the listing.</p>
                    </div>
                  </div>
                  <div className="add-property-location-workflow">
                    <span className="add-property-location-step"><span className="add-property-location-step-index">1</span> Region</span>
                    <span className="add-property-location-step"><span className="add-property-location-step-index">2</span> District</span>
                    <span className="add-property-location-step"><span className="add-property-location-step-index">3</span> Ward and street</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col space-y-2">
                  <div className={[
                    "add-property-field-card",
                    regionId ? "add-property-field-card-valid" : "",
                  ].join(" ")}>
                    <div className="add-property-field-card-head">
                      <div>
                        <div className="add-property-field-card-label">Region <span className="text-rose-600">*</span></div>
                        <div className="add-property-field-card-value">{regionId ? (REGIONS.find((region) => region.id === regionId)?.name ?? regionId) : "Choose property region"}</div>
                      </div>
                      <span className={`add-property-field-badge ${regionId ? "add-property-field-badge-valid" : "add-property-field-badge-disabled"}`}>
                        {regionId ? "set" : "required"}
                      </span>
                    </div>
                    <select
                      title="Region"
                      value={regionId}
                      onChange={(e) => {
                        setRegionId(e.target.value);
                        setDistrict("");
                        setWard("");
                      }}
                      className={["add-property-field-control", "h-12 cursor-pointer appearance-none px-4 pr-10"].join(" ")}
                      aria-required={true}
                    >
                      <option value="">Select region</option>
                      {REGIONS.map((r: { id: string; name: string }) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 z-10">
                      <ChevronDown className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <div
                    className={`add-property-field-card ${
                      touchedBasics.district && !district
                        ? "add-property-field-card-error"
                        : !regionId
                          ? "add-property-field-card-disabled"
                          : district
                            ? "add-property-field-card-valid"
                            : ""
                    }`}
                  >
                    <div className="add-property-field-card-head">
                      <div>
                        <div className="add-property-field-card-label">District <span className="text-rose-600">*</span></div>
                        <div className="add-property-field-card-value">{district || (regionId ? "Choose district" : "Unlock after region")}</div>
                      </div>
                      <span className={`add-property-field-badge ${
                        touchedBasics.district && !district
                          ? "add-property-field-badge-error"
                          : !regionId
                            ? "add-property-field-badge-disabled"
                            : district
                              ? "add-property-field-badge-valid"
                              : "add-property-field-badge-disabled"
                      }`}>
                        {touchedBasics.district && !district ? "fix" : !regionId ? "locked" : district ? "set" : "required"}
                      </span>
                    </div>
                    <select
                      title="District"
                      value={district}
                      onChange={(e) => {
                        setDistrict(e.target.value);
                        setWard("");
                        setStreet("");
                        setZip("");
                      }}
                      onBlur={() => setTouchedBasics((t) => ({ ...t, district: true }))}
                      disabled={!regionId}
                      className={`add-property-field-control appearance-none h-12 cursor-pointer px-4 pr-10 ${
                        touchedBasics.district && !district
                          ? "text-slate-900 focus:ring-rose-200 focus:border-rose-500"
                          : !regionId
                            ? "text-slate-400 cursor-not-allowed"
                            : "text-slate-900 focus:ring-emerald-500/20 focus:border-emerald-500"
                      }`}
                      aria-required={true}
                      aria-describedby={touchedBasics.district && !district ? "districtError" : undefined}
                    >
                      <option value="">{regionId ? "Select district" : "Select region first"}</option>
                      {districts.map((d: string) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <div
                      className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 ${
                        !regionId ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      <ChevronDown className="h-5 w-5" />
                    </div>
                  </div>
                  {touchedBasics.district && !district && (
                    <p id="districtError" className="text-xs text-rose-600 mt-0.5">
                      Please select a district
                    </p>
                  )}
                </div>

                <div className="flex flex-col space-y-2">
                  <div
                    className={`add-property-field-card ${
                      touchedBasics.ward && !ward
                        ? "add-property-field-card-error"
                        : !district
                          ? "add-property-field-card-disabled"
                          : ward
                            ? "add-property-field-card-valid"
                            : ""
                    }`}
                  >
                    <div className="add-property-field-card-head">
                      <div>
                        <div className="add-property-field-card-label">Ward <span className="text-rose-600">*</span></div>
                        <div className="add-property-field-card-value">{ward || (district ? "Choose ward" : "Unlock after district")}</div>
                      </div>
                      <span className={`add-property-field-badge ${
                        touchedBasics.ward && !ward
                          ? "add-property-field-badge-error"
                          : !district
                            ? "add-property-field-badge-disabled"
                            : ward
                              ? "add-property-field-badge-valid"
                              : "add-property-field-badge-disabled"
                      }`}>
                        {touchedBasics.ward && !ward ? "fix" : !district ? "locked" : ward ? "set" : "required"}
                      </span>
                    </div>
                    <select
                      title="Ward"
                      value={ward}
                      onChange={(e) => {
                        setWard(e.target.value);
                        setStreet("");
                        setZip("");
                      }}
                      onBlur={() => setTouchedBasics((t) => ({ ...t, ward: true }))}
                      disabled={!district}
                      className={`add-property-field-control appearance-none h-12 cursor-pointer px-4 pr-10 ${
                        touchedBasics.ward && !ward
                          ? "text-slate-900 focus:ring-rose-200 focus:border-rose-500"
                          : !district
                            ? "text-slate-400 cursor-not-allowed"
                            : "text-slate-900 focus:ring-emerald-500/20 focus:border-emerald-500"
                      }`}
                      aria-required={true}
                      aria-describedby={touchedBasics.ward && !ward ? "wardError" : undefined}
                    >
                      <option value="">{district ? "Select ward" : "Select district first"}</option>
                      {wards.map((w: string) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                    <div
                      className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 ${
                        !district ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      <ChevronDown className="h-5 w-5" />
                    </div>
                  </div>
                  {touchedBasics.ward && !ward && (
                    <p id="wardError" className="text-xs text-rose-600 mt-0.5">
                      Please select a ward
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex min-w-0 flex-col space-y-2">
                  <div
                    className={`add-property-field-card ${
                      touchedBasics.street && !street
                        ? "add-property-field-card-error"
                        : !ward
                          ? "add-property-field-card-disabled"
                          : street
                            ? "add-property-field-card-valid"
                            : ""
                    }`}
                  >
                    <div className="add-property-field-card-head">
                      <div>
                        <div className="add-property-field-card-label">Street address <span className="text-rose-600">*</span></div>
                        <div className="add-property-field-card-value">{street || (ward ? "Choose street" : "Unlock after ward")}</div>
                      </div>
                      <span className={`add-property-field-badge ${
                        touchedBasics.street && !street
                          ? "add-property-field-badge-error"
                          : !ward
                            ? "add-property-field-badge-disabled"
                            : street
                              ? "add-property-field-badge-valid"
                              : "add-property-field-badge-disabled"
                      }`}>
                        {touchedBasics.street && !street ? "fix" : !ward ? "locked" : street ? "set" : "required"}
                      </span>
                    </div>
                    <select
                      id="streetAddress"
                      title="Street"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      onBlur={() => setTouchedBasics((t) => ({ ...t, street: true }))}
                      disabled={!ward}
                      className={`add-property-field-control min-w-0 appearance-none h-12 cursor-pointer px-4 pr-10 ${
                        touchedBasics.street && !street
                          ? "text-slate-900 focus:ring-rose-200 focus:border-rose-500"
                          : !ward
                            ? "text-slate-400 cursor-not-allowed"
                            : "text-slate-900 focus:ring-emerald-500/20 focus:border-emerald-500"
                      }`}
                      aria-required={true}
                      aria-describedby={touchedBasics.street && !street ? "streetError" : undefined}
                    >
                      <option value="">{ward ? "Select street" : "Select ward first"}</option>
                      {streets.map((s: string) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <div
                      className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 ${
                        !ward ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      <ChevronDown className="h-5 w-5" />
                    </div>
                  </div>
                  {touchedBasics.street && !street && (
                    <p id="streetError" className="text-xs text-rose-600 mt-0.5">
                      Please select a street
                    </p>
                  )}
                </div>
                <div className="flex min-w-0 flex-col space-y-2">
                  <div className={["add-property-field-card", city.trim() ? "add-property-field-card-valid" : ""].join(" ")}>
                    <div className="add-property-field-card-head">
                      <div>
                        <div className="add-property-field-card-label">City <span className="text-slate-400 normal-case tracking-normal">optional</span></div>
                        <div className="add-property-field-card-value">{city.trim() || "Add a city name"}</div>
                      </div>
                      <span className={`add-property-field-badge ${city.trim() ? "add-property-field-badge-valid" : "add-property-field-badge-disabled"}`}>
                        {city.trim() ? "set" : "optional"}
                      </span>
                    </div>
                    <input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="add-property-field-control h-12 px-4 placeholder-slate-400"
                      placeholder="City"
                    />
                  </div>
                </div>
                <div className="flex min-w-0 flex-col space-y-2">
                  <div
                    className={`add-property-field-card ${
                      touchedBasics.zip && selectedWardPostcode && (!zip || zip.trim().length === 0)
                        ? "add-property-field-card-error"
                        : selectedWardPostcode
                          ? "add-property-field-card-valid"
                          : zip.trim()
                            ? "add-property-field-card-valid"
                            : ""
                    }`}
                  >
                    <div className="add-property-field-card-head">
                      <div>
                        <div className="add-property-field-card-label">Zip code {selectedWardPostcode ? <span className="text-rose-600">*</span> : <span className="text-slate-400 normal-case tracking-normal">optional</span>}</div>
                        <div className="add-property-field-card-value">{zip.trim() || (selectedWardPostcode ? "Auto-filled by selected ward" : "Add postcode if available")}</div>
                      </div>
                      <span className={`add-property-field-badge ${
                        touchedBasics.zip && selectedWardPostcode && (!zip || zip.trim().length === 0)
                          ? "add-property-field-badge-error"
                          : (selectedWardPostcode || zip.trim())
                            ? "add-property-field-badge-valid"
                            : "add-property-field-badge-disabled"
                      }`}>
                        {touchedBasics.zip && selectedWardPostcode && (!zip || zip.trim().length === 0) ? "fix" : (selectedWardPostcode || zip.trim()) ? "set" : "optional"}
                      </span>
                    </div>
                    <input
                      id="zip"
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      onBlur={() => setTouchedBasics((t) => ({ ...t, zip: true }))}
                      readOnly={!!selectedWardPostcode}
                      className={`add-property-field-control min-w-0 h-12 px-4 ${
                        touchedBasics.zip && selectedWardPostcode && (!zip || zip.trim().length === 0)
                          ? "text-slate-900 focus:ring-rose-200 focus:border-rose-500"
                          : selectedWardPostcode
                            ? "text-slate-700 cursor-not-allowed"
                            : "text-slate-900 placeholder-slate-400 focus:ring-emerald-500/20 focus:border-emerald-500"
                      }`}
                      placeholder={
                        selectedWardPostcode ? "Auto-filled from ward" : "Zip code (enter manually if not auto-filled)"
                      }
                      aria-required={!!selectedWardPostcode}
                      aria-describedby={
                        touchedBasics.zip && selectedWardPostcode && (!zip || zip.trim().length === 0) ? "zipError" : undefined
                      }
                    />
                  </div>
                  {touchedBasics.zip && selectedWardPostcode && (!zip || zip.trim().length === 0) && (
                    <p id="zipError" className="text-xs text-rose-600 mt-0.5">
                      Zip code is required
                    </p>
                  )}
                  {selectedWardPostcode && zip && (
                    <p className="add-property-field-note-success mt-0.5">Auto-filled from selected ward</p>
                  )}
                  {!selectedWardPostcode && ward && (
                    <p className="add-property-field-note-warning mt-0.5">
                      Postcode not available for this ward - please enter manually
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 add-property-location-submodule">
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0">
                    <span className="add-property-kicker">Destination discovery</span>
                    <h3 className="mt-3 text-lg font-semibold text-slate-900 mb-1">Park / Tourism Site</h3>
                    <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
                      Link the property to a known destination only if it is genuinely inside or near that park, so travelers discover it in the right context.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="add-property-metric-chip">Optional</span>
                    <span className="add-property-metric-chip">Improves destination visibility</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                  <div className="md:col-span-7 flex flex-col space-y-2">
                    <div className={[
                      "add-property-field-card",
                      selectedTourismSite ? "add-property-field-card-valid" : !tourismCountry ? "add-property-field-card-disabled" : "",
                    ].join(" ")}>
                      <div className="add-property-field-card-head">
                        <div>
                          <div className="add-property-field-card-label">Tourism site / Park</div>
                          <div className="add-property-field-card-value">
                            {selectedTourismSite?.name || (!tourismCountry ? "Unlock after location setup" : "Not linked to a park")}
                          </div>
                        </div>
                        <span className={`add-property-field-badge ${selectedTourismSite ? "add-property-field-badge-valid" : !tourismCountry ? "add-property-field-badge-disabled" : "add-property-field-badge-disabled"}`}>
                          {selectedTourismSite ? "linked" : !tourismCountry ? "locked" : "optional"}
                        </span>
                      </div>

                      {parkIsLocked ? (
                        <div className="add-property-field-shell add-property-field-shell-valid w-full h-12 px-4 text-sm inline-flex items-center justify-between gap-3">
                          <div className="min-w-0 truncate font-semibold text-slate-900 inline-flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span className="truncate">
                              {selectedTourismSite?.name}
                              {selectedTourismSite?.country ? (
                                <span className="ml-2 font-medium text-slate-500">({selectedTourismSite.country})</span>
                              ) : null}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingPark(true);
                              setIsEditingPlacement(true);
                              window.setTimeout(() => {
                                if (tourismSitesLoading || !tourismCountry) return;
                                setParkPickerOpen(true);
                                setParkQuery(selectedTourismSite?.name ?? "");
                                parkInputRef.current?.focus();
                              }, 0);
                            }}
                            className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-xl border border-transparent bg-transparent text-emerald-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            aria-label="Edit park"
                            title="Edit"
                          >
                              <Pencil className="h-4 w-4 text-emerald-600" />
                          </button>
                        </div>
                      ) : (
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
                                ? "Select location first (region/district/ward)"
                                : tourismSitesLoading
                                  ? "Loading parks…"
                                  : "Search or keep this unlinked"
                            }
                            className="add-property-field-control h-12 border border-slate-300 bg-white pl-4 pr-24 hover:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
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
                              className="absolute right-10 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                              title="Clear park"
                              aria-label="Clear park"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          ) : null}

                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 z-10">
                          <ChevronDown className={["h-5 w-5 transition-transform duration-200", parkPickerOpen ? "rotate-180" : ""].join(" ")} />
                        </div>

                          {parkPickerOpen ? (
                            <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 ring-1 ring-black/5">
                              <div id="parkListbox" role="listbox" className="max-h-72 overflow-auto py-1">
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
                                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                  role="option"
                                  aria-selected={effectiveTourismSiteIdValue === ""}
                                >
                                  Not linked to a park
                                </button>

                                {tourismSitesLoading ? (
                                  <div className="px-3 py-2 text-sm text-slate-500">Loading parks…</div>
                                ) : null}

                                {!tourismSitesLoading && filteredTourismSites.length === 0 ? (
                                  <div className="px-3 py-2 text-sm text-slate-500">No parks found.</div>
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
                                            if (!effectiveParkPlacementValue) {
                                              setLocalParkPlacement("NEARBY");
                                              setParkPlacementValue("NEARBY");
                                            }
                                            setParkPickerOpen(false);
                                            setParkQuery("");
                                            setIsEditingPark(false);
                                            setIsEditingPlacement(false);
                                          }}
                                          className={[
                                            "w-full text-left px-3 py-2 text-sm transition-colors hover:bg-slate-50",
                                            selected ? "bg-emerald-50" : "",
                                          ].join(" ")}
                                          role="option"
                                          aria-selected={selected}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                              <div className="truncate text-slate-900">
                                                {s.name}{" "}
                                                {isMajor ? (
                                                  <span className="ml-1 text-[11px] font-semibold text-emerald-700">Major</span>
                                                ) : null}
                                              </div>
                                              <div className="truncate text-[11px] text-slate-500">{s.country}</div>
                                            </div>
                                            {selected ? (
                                              <span className="text-[11px] font-semibold text-emerald-700">Selected</span>
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
                      )}
                      {tourismSitesError ? (
                        <p className="text-xs text-rose-600">{tourismSitesError}</p>
                      ) : !tourismCountry ? (
                        <p className="add-property-field-note">Finish the address above first, then destination options will load automatically.</p>
                      ) : tourismSitesLoading ? (
                        <p className="add-property-field-note">Loading parks…</p>
                      ) : selectedTourismSite ? (
                        <p className="add-property-field-note-success">Linked to a discoverable destination for park-based browsing.</p>
                      ) : (
                        <p className="add-property-field-note">Leave this blank if the property is not marketed relative to a park or tourism site.</p>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-5 flex flex-col space-y-2">
                    <div className={[
                      "add-property-field-card",
                      effectiveTourismSiteIdValue === "" ? "add-property-field-card-disabled" : effectiveParkPlacementValue ? "add-property-field-card-valid" : "",
                    ].join(" ")}>
                      <div className="add-property-field-card-head">
                        <div>
                          <div className="add-property-field-card-label">Placement</div>
                          <div className="add-property-field-card-value">
                            {effectiveTourismSiteIdValue === ""
                              ? "Select a park to unlock placement"
                              : effectiveParkPlacementValue === "INSIDE"
                                ? "Inside the selected destination"
                                : effectiveParkPlacementValue === "NEARBY"
                                  ? "Near the selected destination"
                                  : "Choose how the property relates to the park"}
                          </div>
                        </div>
                        <span className={`add-property-field-badge ${effectiveTourismSiteIdValue === "" ? "add-property-field-badge-disabled" : effectiveParkPlacementValue ? "add-property-field-badge-valid" : "add-property-field-badge-disabled"}`}>
                          {effectiveTourismSiteIdValue === "" ? "locked" : effectiveParkPlacementValue ? "set" : "required"}
                        </span>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-sm shadow-slate-200/30">
                      {placementIsLocked ? (
                        <div className="h-10 w-full rounded-xl border border-slate-200 bg-white inline-flex items-center justify-between gap-2 px-3 text-sm font-semibold text-slate-900 shadow-sm shadow-slate-200/20">
                          <span className="inline-flex items-center justify-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            {effectiveParkPlacementValue === "INSIDE" ? "Inside" : "Nearby"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditingPlacement(true)}
                            className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-xl border border-transparent bg-transparent text-emerald-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            aria-label="Edit placement"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4 text-emerald-600" />
                          </button>
                        </div>
                      ) : (
                        <select
                          value={effectiveParkPlacementValue}
                          onChange={(e) => {
                            const next = String(e.target.value || "") as "" | "INSIDE" | "NEARBY";
                            setLocalParkPlacement(next);
                            setParkPlacementValue(next);
                            if (effectiveTourismSiteIdValue !== "" && next) setIsEditingPlacement(false);
                          }}
                          disabled={effectiveTourismSiteIdValue === ""}
                          className={[
                            "w-full h-10 px-3 text-sm font-semibold rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500",
                            effectiveTourismSiteIdValue === ""
                              ? "cursor-not-allowed bg-slate-50 text-slate-400 border border-slate-200"
                              : "bg-white text-slate-900 border border-slate-200 hover:border-slate-300",
                          ].join(" ")}
                          aria-label="Park placement"
                        >
                          <option value="" disabled>
                            Select placement
                          </option>
                          <option value="INSIDE">Inside</option>
                          <option value="NEARBY">Nearby</option>
                        </select>
                      )}
                      </div>

                      <p className="add-property-field-note mt-2">
                        {effectiveTourismSiteIdValue === ""
                          ? "Pick a destination on the left first."
                          : "Choose where the property sits relative to the selected park so the listing appears in the right context."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Latitude and Longitude */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="latitude" className="block text-sm font-medium text-slate-700">
                    Latitude <span className="text-xs text-slate-400 font-normal">(optional)</span>
                  </label>
                  <div
                    className={[
                      "rounded-xl border shadow-sm transition-colors",
                      typeof latitude === "number" && Number.isFinite(latitude)
                        ? "border-transparent bg-slate-50"
                        : "border-slate-200 bg-white",
                    ].join(" ")}
                  >
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
                      className="w-full h-12 px-4 text-sm text-slate-900 placeholder-slate-400 rounded-xl bg-transparent border border-transparent shadow-none transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="Auto-detected from location"
                    />
                  </div>
                </div>
                <div className="flex flex-col space-y-2">
                  <label htmlFor="longitude" className="block text-sm font-medium text-slate-700">
                    Longitude <span className="text-xs text-slate-400 font-normal">(optional)</span>
                  </label>
                  <div
                    className={[
                      "rounded-xl border shadow-sm transition-colors",
                      typeof longitude === "number" && Number.isFinite(longitude)
                        ? "border-transparent bg-slate-50"
                        : "border-slate-200 bg-white",
                    ].join(" ")}
                  >
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
                      className="w-full h-12 px-4 text-sm text-slate-900 placeholder-slate-400 rounded-xl bg-transparent border border-transparent shadow-none transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="Auto-detected from location"
                    />
                  </div>
                </div>
              </div>

              {/* Location Tracking Toggle Switch */}
              <div className="mt-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div
                        className={`absolute inset-0 rounded-full ${
                          locationTrackingEnabled
                            ? "bg-[#02665e]/10 animate-ping [animation-duration:3s] [animation-iteration-count:infinite]"
                            : ""
                        }`}
                      />
                      <div
                        className={`relative p-1.5 rounded-full transition-colors duration-200 ${
                          locationTrackingEnabled ? "bg-[#02665e]/5" : "bg-gray-100"
                        }`}
                      >
                        {locationLoading ? (
                          <div className="w-4 h-4 border-2 border-[#02665e]/30 border-t-[#02665e] rounded-full animate-spin" />
                        ) : (
                          <MapPin
                            className={`w-4 h-4 transition-colors duration-200 ${
                              locationTrackingEnabled ? "text-[#02665e]" : "text-gray-400"
                            }`}
                            strokeWidth={2}
                          />
                        )}
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="locationToggle"
                        className="text-sm font-medium text-gray-900 cursor-pointer transition-colors hover:text-[#02665e]"
                      >
                        Enable location tracking
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">Automatically detect your current location using GPS</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    id="locationToggle"
                    role="switch"
                    aria-checked={locationTrackingEnabled}
                    onClick={() => handleLocationToggle(!locationTrackingEnabled)}
                    disabled={locationLoading}
                    className={`
                      relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
                      ${locationTrackingEnabled ? "bg-[#02665e]" : "bg-gray-300 hover:bg-gray-400"}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out
                        ${locationTrackingEnabled ? "translate-x-6" : "translate-x-1"}
                        ${locationLoading ? "opacity-70" : ""}
                      `}
                    >
                      {locationLoading && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-2.5 h-2.5 border-2 border-[#02665e]/30 border-t-[#02665e] rounded-full animate-spin" />
                        </div>
                      )}
                    </span>
                  </button>
                </div>
                {locationTrackingEnabled && latitude && longitude && (
                  <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Live detection active: {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
                  </p>
                )}
              </div>

              <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-lg shadow-slate-200/40 ring-1 ring-black/5">
                  <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,250,252,0.92))] px-5 py-4 sm:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="add-property-kicker">Location intelligence</span>
                          <span className="add-property-metric-chip">{locationSource === "gps" ? "GPS source" : "Pin source"}</span>
                          {typeof locationAccuracyMeters === "number" && Number.isFinite(locationAccuracyMeters) ? (
                            <span className="add-property-metric-chip">Accuracy {Math.round(locationAccuracyMeters)} m</span>
                          ) : null}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-gray-900">Property Location Map</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                          Keep this area clean and use the map itself to place the property exactly where the building sits.
                        </p>
                      </div>
                      <div className="text-xs text-slate-500 sm:text-right">
                        <div className="font-mono text-slate-700">
                          {latitude && longitude
                            ? `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`
                            : "Coordinates not set yet"}
                        </div>
                        {(zip || selectedWardPostcode) ? (
                          <div className="mt-1">Postcode {zip || selectedWardPostcode}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-3 sm:p-4">
                    <PropertyLocationMap
                      latitude={typeof latitude === "number" ? latitude : 0}
                      longitude={typeof longitude === "number" ? longitude : 0}
                      postcode={zip || selectedWardPostcode || null}
                      onLocationDetected={(lat, lng, meta) => {
                        if (onLocationDetected) {
                          onLocationDetected(lat, lng, meta);
                          return;
                        }
                        startTransition(() => {
                          setLatitude(lat);
                          setLongitude(lng);
                        });
                      }}
                    />
                  </div>

                  <div className="px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="add-property-location-stat">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Detected address</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">
                        {detectedAddress || "Move the pin or enable GPS to confirm the exact address."}
                      </div>
                    </div>
                    <div className="add-property-location-stat">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Detected admin area</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">
                        {[detectedWard, detectedDistrict, detectedRegion].filter(Boolean).join(", ") || "Waiting for location confirmation"}
                      </div>
                      {(detectedPostcode || zip || selectedWardPostcode) ? (
                        <div className="mt-1 text-xs text-slate-500">
                          Postcode: {detectedPostcode || zip || selectedWardPostcode}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Reverse-geocoding consistency check feedback */}
                  {checkingPinLocation && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
                      Verifying pin location against selected region, district, and ward…
                    </div>
                  )}
                  {!checkingPinLocation && !locationMismatchWarning && detectedAddress && (
                    <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" aria-hidden />
                      <div className="min-w-0">
                        <p className="font-semibold mb-0.5">Location confirmed</p>
                        <p className="leading-snug">The detected address and selected admin area are aligned.</p>
                      </div>
                    </div>
                  )}
                  {!checkingPinLocation && locationMismatchWarning && (
                    <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" aria-hidden />
                      <div className="min-w-0">
                        <p className="font-semibold mb-0.5">Pin location mismatch</p>
                        <p className="leading-snug">{locationMismatchWarning}</p>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
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



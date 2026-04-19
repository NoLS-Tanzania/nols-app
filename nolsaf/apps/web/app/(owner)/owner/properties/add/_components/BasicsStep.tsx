"use client";

import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { Building2, CheckCircle2, ChevronDown, HelpCircle, Home, Landmark, LayoutGrid, MapPin, AlertCircle, Pencil, X } from "lucide-react";
import { PropertyLocationMap } from "./PropertyLocationMap";
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

const nameOk = title.trim().length >= 3;
  const typeOk = !!type;
  const showTypeExtras = type === "Other" || type === "Hotel";
  const collapseTypes = typeOk && nameOk && !typePickerOpen;
  const visibleTypes = useMemo(() => {
    if (collapseTypes) return [type];
    return [...PROPERTY_TYPES];
  }, [PROPERTY_TYPES, collapseTypes, type]);

  const handleLocationDetected = useCallback((lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
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
            <div className="add-property-panel-premium">
              <div className="add-property-workblock-header">
                <div>
                  <label className="block text-sm font-semibold text-gray-900" id="propertyTypeLabel">
                    Property Type <span className="text-red-500">*</span>
                  </label>
                  <p className="mt-1 text-sm text-gray-500">Select the category that best matches the guest experience you want to present.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                {typeOk ? (
                  <div className="hidden sm:inline-flex items-center rounded-full border border-[#30363d] bg-[#1c2128] px-3 py-1.5 text-xs font-semibold text-[#e6edf3]">
                    Selected: <span className="ml-1 text-emerald-400">{type}</span>
                  </div>
                ) : null}
                {collapseTypes ? (
                  <button
                    type="button"
                    onClick={() => setTypePickerOpen(true)}
                    className="rounded-xl border border-[#30363d] bg-[#1c2128] px-4 py-2 text-sm font-semibold text-emerald-400 transition hover:border-emerald-500/50 hover:bg-[rgba(2,102,94,0.12)]"
                  >
                    Change
                  </button>
                ) : null}
                </div>
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
                          ? `${tone.border} bg-gradient-to-br ${tone.bg} shadow-lg shadow-black/40 ring-1 ring-white/10`
                          : "border-[#30363d] bg-[#1c2128] shadow-md shadow-black/30 hover:-translate-y-1 hover:border-[#484f58] hover:shadow-xl"
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
                      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${selected ? "from-[#02665e] via-emerald-400 to-transparent" : "from-[#30363d] via-[#262c36] to-transparent"}`} />
                      <div className="flex h-full flex-col justify-between gap-4 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${
                          selected
                            ? `bg-white/80 ${tone.text} shadow-sm shadow-white/60`
                            : "bg-[#21262d] text-[#8b949e] group-hover:bg-[#262c36]"
                        }`}>
                          <IconComponent
                            className={`h-5 w-5 transition-colors duration-300 ${
                              selected ? tone.text : "text-[#8b949e]"
                            }`}
                          />
                        </div>
                          <div className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-all ${
                            selected
                              ? "border-white/25 bg-white/15 text-white"
                              : "border-[#30363d] bg-[#161b22] text-[#6e7681]"
                          }`}>
                            {selected ? "Selected" : "Type"}
                          </div>
                        </div>
                        <div>
                          <div className={`text-[15px] font-semibold transition-colors duration-300 ${selected ? tone.text : "text-[#e6edf3]"}`}>
                            {pt}
                          </div>
                          <div className={`mt-1 text-xs leading-relaxed transition-colors line-clamp-2 ${selected ? "text-[#c9d1d9]" : "text-[#8b949e]"}`}>
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
                            className={`group relative bg-gradient-to-br ${selected ? selectedGradient : gradient} p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 ${
                              selected
                                ? `${selectedBorder} shadow-md ${shadow}`
                                : `${border} hover:shadow-md hover:${shadow}`
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
                              <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${iconBg} ${iconBgHover} group-hover:scale-110`}>
                                <Icon className={`w-5 h-5 ${iconColor}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className={`font-semibold text-sm ${selected ? titleColor : "text-gray-900"} transition-colors duration-200`}>{t}</div>
                                <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{d}</div>
                              </div>
                            </div>
                            {selected && (
                              <div className={`absolute top-2.5 right-2.5 w-2 h-2 ${dot} rounded-full border-2 border-white shadow-sm`} />
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
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm shadow-slate-200/30">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="add-property-kicker">Address foundation</span>
                    <h2 className="mt-3 text-xl font-semibold text-slate-900 mb-1">
                      Property Location <span className="text-rose-600">*</span>
                    </h2>
                    <p className="text-sm text-slate-600">Enter the address details for this property.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="add-property-address-group">
                  <div className="add-property-address-group-header">
                    <div className="min-w-0">
                      <div className="add-property-address-group-kicker">Administrative path</div>
                      <h3 className="add-property-address-group-title md:hidden">Choose region, district, ward, and street</h3>
                      <h3 className="add-property-address-group-title hidden md:block">Choose region, district, and ward</h3>
                    </div>
                  </div>

                  <div className="add-property-address-grid add-property-address-grid-admin">
                    <div className={["add-property-address-card", regionId ? "add-property-address-card-done" : "add-property-address-card-active"].join(" ")}>
                      <div className="add-property-address-card-head">
                        <div className="min-w-0">
                          <div className="add-property-address-card-label">Region <span className="text-rose-600">*</span></div>
                        </div>
                      </div>
                      <div className="add-property-address-card-control relative">
                        <select
                          title="Region"
                          value={regionId}
                          onChange={(e) => {
                            setRegionId(e.target.value);
                            setDistrict("");
                            setWard("");
                          }}
                          className="add-property-field-control h-12 cursor-pointer appearance-none px-4 pr-10"
                          aria-required={true}
                        >
                          <option value="">Select region</option>
                          {REGIONS.map((r: { id: string; name: string }) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronDown className="h-5 w-5" />
                        </div>
                      </div>
                    </div>

                    <div className={[
                      "add-property-address-card",
                      touchedBasics.district && !district
                        ? "add-property-address-card-error"
                        : !regionId
                          ? "add-property-address-card-locked"
                          : district
                            ? "add-property-address-card-done"
                            : "add-property-address-card-active",
                    ].join(" ")}>
                      <div className="add-property-address-card-head">
                        <div className="min-w-0">
                          <div className="add-property-address-card-label">District <span className="text-rose-600">*</span></div>
                        </div>
                      </div>
                      <div className="add-property-address-card-control relative">
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
                            !regionId ? "text-slate-400 cursor-not-allowed" : "text-slate-900"
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
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronDown className="h-5 w-5" />
                        </div>
                      </div>
                      {touchedBasics.district && !district ? <p id="districtError" className="add-property-address-card-note text-rose-600">Choose a district to continue.</p> : null}
                    </div>

                    <div className={[
                      "add-property-address-card",
                      touchedBasics.ward && !ward
                        ? "add-property-address-card-error"
                        : !district
                          ? "add-property-address-card-locked"
                          : ward
                            ? "add-property-address-card-done"
                            : "add-property-address-card-active",
                    ].join(" ")}>
                      <div className="add-property-address-card-head">
                        <div className="min-w-0">
                          <div className="add-property-address-card-label">Ward <span className="text-rose-600">*</span></div>
                        </div>
                      </div>
                      <div className="add-property-address-card-control relative">
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
                            !district ? "text-slate-400 cursor-not-allowed" : "text-slate-900"
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
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronDown className="h-5 w-5" />
                        </div>
                      </div>
                      {touchedBasics.ward && !ward ? <p id="wardError" className="add-property-address-card-note text-rose-600">Choose a ward to continue.</p> : null}
                    </div>

                    {/* Small screens: keep Street alongside Ward */}
                    <div
                      className={[
                        "add-property-address-card md:hidden",
                        touchedBasics.street && !street
                          ? "add-property-address-card-error"
                          : !ward
                            ? "add-property-address-card-locked"
                            : street
                              ? "add-property-address-card-done"
                              : "add-property-address-card-active",
                      ].join(" ")}
                    >
                      <div className="add-property-address-card-head">
                        <div className="min-w-0">
                          <div className="add-property-address-card-label">Street address <span className="text-rose-600">*</span></div>
                        </div>
                      </div>
                      <div className="add-property-address-card-control relative">
                        <select
                          title="Street"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          onBlur={() => setTouchedBasics((t) => ({ ...t, street: true }))}
                          disabled={!ward}
                          className={`add-property-field-control min-w-0 appearance-none h-12 cursor-pointer px-4 pr-10 ${
                            !ward ? "text-slate-400 cursor-not-allowed" : "text-slate-900"
                          }`}
                          aria-required={true}
                          aria-describedby={touchedBasics.street && !street ? "streetErrorAdmin" : undefined}
                        >
                          <option value="">{ward ? "Select street" : "Select ward first"}</option>
                          {streets.map((s: string) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronDown className="h-5 w-5" />
                        </div>
                      </div>
                      {touchedBasics.street && !street ? <p id="streetErrorAdmin" className="add-property-address-card-note text-rose-600">Choose a street before continuing.</p> : null}
                    </div>
                  </div>
                </div>

                <div className="add-property-address-group">
                  <div className="add-property-address-group-header">
                    <div className="min-w-0">
                      <div className="add-property-address-group-kicker">Street details</div>
                      <h3 className="add-property-address-group-title md:hidden">Add city and postcode</h3>
                      <h3 className="add-property-address-group-title hidden md:block">Add street, city, and postcode</h3>
                    </div>
                  </div>

                  <div className="add-property-address-grid add-property-address-grid-detail">
                    {/* Desktop/tablet: original layout keeps Street in this section */}
                    <div
                      className={[
                        "add-property-address-card hidden md:block",
                        touchedBasics.street && !street
                          ? "add-property-address-card-error"
                          : !ward
                            ? "add-property-address-card-locked"
                            : street
                              ? "add-property-address-card-done"
                              : "add-property-address-card-active",
                      ].join(" ")}
                    >
                      <div className="add-property-address-card-head">
                        <div className="min-w-0">
                          <div className="add-property-address-card-label">Street address <span className="text-rose-600">*</span></div>
                        </div>
                      </div>
                      <div className="add-property-address-card-control relative">
                        <select
                          title="Street"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          onBlur={() => setTouchedBasics((t) => ({ ...t, street: true }))}
                          disabled={!ward}
                          className={`add-property-field-control min-w-0 appearance-none h-12 cursor-pointer px-4 pr-10 ${
                            !ward ? "text-slate-400 cursor-not-allowed" : "text-slate-900"
                          }`}
                          aria-required={true}
                          aria-describedby={touchedBasics.street && !street ? "streetErrorDetail" : undefined}
                        >
                          <option value="">{ward ? "Select street" : "Select ward first"}</option>
                          {streets.map((s: string) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronDown className="h-5 w-5" />
                        </div>
                      </div>
                      {touchedBasics.street && !street ? <p id="streetErrorDetail" className="add-property-address-card-note text-rose-600">Choose a street before continuing.</p> : null}
                    </div>

                    <div className={["add-property-address-card", city.trim() ? "add-property-address-card-done" : "add-property-address-card-active"].join(" ")}>
                      <div className="add-property-address-card-head">
                        <div className="min-w-0">
                          <div className="add-property-address-card-label">City <span className="text-slate-400 normal-case tracking-normal">optional</span></div>
                        </div>
                      </div>
                      <div className="add-property-address-card-control relative">
                        <input
                          id="city"
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="add-property-field-control h-12 px-4 placeholder-slate-400"
                          placeholder="Enter city"
                        />
                      </div>
                    </div>

                    <div className={[
                      "add-property-address-card",
                      touchedBasics.zip && selectedWardPostcode && (!zip || zip.trim().length === 0)
                        ? "add-property-address-card-error"
                        : (selectedWardPostcode || zip.trim())
                          ? "add-property-address-card-done"
                          : "add-property-address-card-active",
                    ].join(" ")}>
                      <div className="add-property-address-card-head">
                        <div className="min-w-0">
                          <div className="add-property-address-card-label">Zip code {selectedWardPostcode ? <span className="text-rose-600">*</span> : <span className="text-slate-400 normal-case tracking-normal">optional</span>}</div>
                        </div>
                      </div>
                      <div className={["add-property-address-card-control", selectedWardPostcode ? "add-property-address-card-control-readonly" : ""].join(" ")}>
                        <input
                          id="zip"
                          type="text"
                          value={zip}
                          onChange={(e) => setZip(e.target.value)}
                          onBlur={() => setTouchedBasics((t) => ({ ...t, zip: true }))}
                          readOnly={!!selectedWardPostcode}
                          className={`add-property-field-control min-w-0 h-12 px-4 ${selectedWardPostcode ? "text-slate-700 cursor-not-allowed" : "text-slate-900 placeholder-slate-400"}`}
                          placeholder={selectedWardPostcode ? "Auto-filled from ward" : "Enter postcode"}
                          aria-required={!!selectedWardPostcode}
                          aria-describedby={touchedBasics.zip && selectedWardPostcode && (!zip || zip.trim().length === 0) ? "zipError" : undefined}
                        />
                      </div>
                      {touchedBasics.zip && selectedWardPostcode && (!zip || zip.trim().length === 0) ? <p id="zipError" className="add-property-address-card-note text-rose-600">Zip code is required here.</p> : null}
                      {selectedWardPostcode && zip ? <p className="add-property-address-card-note text-emerald-700">Auto-filled from the selected ward.</p> : null}
                      {!selectedWardPostcode && ward ? <p className="add-property-address-card-note text-amber-700">No postcode was supplied by the ward, so enter it manually.</p> : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 add-property-location-submodule">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#02665e]/10">
                    <Landmark className="h-4 w-4 text-[#02665e]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight text-slate-900">Park / Tourism Site</h3>
                    <p className="text-xs text-slate-500">Optional link a nearby destination if relevant.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col space-y-2">
                    <div className={[
                      "add-property-field-card",
                      selectedTourismSite ? "add-property-field-card-valid" : !tourismCountry ? "add-property-field-card-disabled" : "",
                    ].join(" ")}>
                      <label className="mb-2 block text-xs font-semibold text-slate-500">Tourism site / Park</label>

                      {parkIsLocked ? (
                        <div className="add-property-field-shell add-property-field-shell-valid w-full h-12 px-4 text-sm inline-flex items-center justify-between gap-3">
                          <div className="min-w-0 truncate font-semibold text-slate-100 inline-flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span className="truncate">
                              {selectedTourismSite?.name}
                              {selectedTourismSite?.country ? (
                                <span className="ml-2 font-medium text-slate-400">({selectedTourismSite.country})</span>
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
                            className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-xl border border-transparent bg-transparent text-emerald-600 transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            aria-label="Edit park"
                            title="Edit"
                          >
                              <Pencil className="h-4 w-4 text-emerald-600" />
                          </button>
                        </div>
                      ) : (
                        <div
                          ref={parkPickerRef}
                          className={[
                            "add-property-field-shell w-full",
                            tourismSitesLoading || !tourismCountry ? "add-property-field-shell-disabled" : "",
                          ].join(" ")}
                        >
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
                                ? "Set your location first"
                                : tourismSitesLoading
                                  ? "Loading…"
                                  : "Search or skip"
                            }
                            className="add-property-field-control h-12 pl-4 pr-24 disabled:text-slate-400 disabled:cursor-not-allowed"
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
                            <div className="add-property-park-dropdown absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 ring-1 ring-black/5">
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
                      {tourismSitesError ? <p className="text-xs text-rose-600">{tourismSitesError}</p> : null}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <div className={[
                      "add-property-field-card",
                      effectiveTourismSiteIdValue === "" ? "add-property-field-card-disabled" : effectiveParkPlacementValue ? "add-property-field-card-valid" : "",
                    ].join(" ")}>
                      <label className="mb-2 block text-xs font-semibold text-slate-500">Placement</label>

                      {placementIsLocked ? (
                        <div className="add-property-field-shell add-property-field-shell-valid w-full h-10 px-3 text-sm inline-flex items-center justify-between gap-2 font-semibold">
                          <span className="inline-flex items-center justify-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            {effectiveParkPlacementValue === "INSIDE" ? "Inside" : "Nearby"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditingPlacement(true)}
                            className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-xl border border-transparent bg-transparent text-emerald-600 transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            aria-label="Edit placement"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4 text-emerald-600" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className={[
                            "add-property-field-shell w-full",
                            effectiveTourismSiteIdValue === "" ? "add-property-field-shell-disabled" : "",
                          ].join(" ")}
                        >
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
                              "add-property-field-control h-10 px-3 text-sm font-semibold",
                              effectiveTourismSiteIdValue === "" ? "cursor-not-allowed" : "",
                            ].join(" ")}
                            aria-label="Park placement"
                          >
                            <option value="" disabled>
                              Select placement
                            </option>
                            <option value="INSIDE">Inside</option>
                            <option value="NEARBY">Nearby</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Location — drag-to-pin map (Google Maps business listing style) */}
              <div className="mt-6">
                <PropertyLocationMap
                  latitude={typeof latitude === "number" && Number.isFinite(latitude) ? latitude : NaN}
                  longitude={typeof longitude === "number" && Number.isFinite(longitude) ? longitude : NaN}
                  onLocationDetected={handleLocationDetected}
                />

                {/* Advanced: manual coordinate inputs */}
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



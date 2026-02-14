"use client";

import type { ComponentType, Dispatch, MutableRefObject, SetStateAction } from "react";
import { Building2, CheckCircle2, ChevronDown, HelpCircle, Home, LayoutGrid, MapPin, AlertCircle, Navigation2, Pencil, X } from "lucide-react";
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

  locationTrackingEnabled: boolean;
  locationLoading: boolean;
  handleLocationToggle: (enabled: boolean) => void;

  tourismSiteId?: number | "";
  setTourismSiteId?: Dispatch<SetStateAction<number | "">>;
  parkPlacement?: "" | "INSIDE" | "NEARBY";
  setParkPlacement?: Dispatch<SetStateAction<"" | "INSIDE" | "NEARBY">>;

  PropertyLocationMap: ComponentType<{
    latitude: number;
    longitude: number;
    postcode: string | null;
    onLocationDetected: (lat: number, lng: number) => void;
  }>;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  tourismSiteId,
  setTourismSiteId,
  parkPlacement,
  setParkPlacement,

PropertyLocationMap,
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

  return (
    <AddPropertySection
      as="section"
      sectionRef={handleSectionRef}
      isVisible={isVisible}
      className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm"
    >
      {isVisible && (
        <div id="propertyBasicsInner" className="w-full">
          <StepHeader
            step={1}
            title="Basic details"
            description="Name your property, choose the type, and set the exact location."
          />
          <div className="pt-4">
            {/* Status Card - Modern Design */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white px-4 sm:px-5 py-4 shadow-sm mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base transition-all duration-300 ${
                  basicsCompleted
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {completionCount}/{totalFields}
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">Basic details</span>
                  <span className="text-gray-500 mx-1">·</span>
                  <span className="text-gray-600">
                    {basicsCompleted ? (
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                      </span>
                    ) : (
                      <span className="font-bold text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {totalFields - completionCount} remaining
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/50">
                <div className="text-xs font-semibold text-emerald-700">
                  All fields required <span className="text-red-500">*</span>
                </div>
              </div>
            </div>

          <div className="space-y-6 w-full">
            {/* Property Type Selection - Modern Card Design */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900" id="propertyTypeLabel">
                    Property Type <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Select the type of property you&apos;re listing</p>
                </div>
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

                  return (
                    <label
                      key={pt}
                      className={`group relative bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                        selected
                          ? "border-emerald-500 shadow-md shadow-emerald-500/20"
                          : "border-gray-200 hover:border-emerald-300"
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
                      <div className="flex items-center justify-center">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 mr-3 ${
                          selected
                            ? "bg-emerald-100 group-hover:bg-emerald-200 group-hover:scale-110"
                            : "bg-gray-100 group-hover:bg-emerald-100"
                        }`}>
                          <IconComponent
                            className={`w-5 h-5 transition-colors duration-300 ${
                              selected ? "text-emerald-600" : "text-gray-600"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-semibold transition-colors duration-300 ${
                            selected ? "text-emerald-700" : "text-gray-900"
                          }`}>
                            {pt}
                          </div>
                          <div className={`text-xs transition-colors line-clamp-2 ${
                            selected ? "text-emerald-600" : "text-gray-500"
                          }`}>
                            {labelText}
                          </div>
                        </div>
                      </div>
                      {selected && (
                        <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse border-2 border-white" />
                      )}
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
                  {/* Property Name & Type Extras - Modern Card Design */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
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

                  {/* Building layout - Modern Card Design */}
                  <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
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
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 sm:p-6 shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:shadow-md">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-1">
                  Property Location <span className="text-rose-600">*</span>
                </h2>
                <p className="text-xs text-slate-600">Provide the location details for your property</p>
              </div>

              {/* Region, District, Ward - Uniform Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Region */}
                <div className="flex flex-col space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Region <span className="text-rose-600">*</span>
                  </label>
                  <div
                    className={[
                      "relative rounded-xl shadow-sm transition-colors",
                      regionId ? "border border-transparent bg-slate-50" : "border border-slate-200 bg-white",
                    ].join(" ")}
                  >
                    {regionId ? (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600 z-10">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    ) : null}
                    <select
                      title="Region"
                      value={regionId}
                      onChange={(e) => {
                        setRegionId(e.target.value);
                        setDistrict("");
                        setWard("");
                      }}
                      className={[
                        "appearance-none w-full h-12 pl-10 pr-10 text-sm text-slate-900 rounded-xl bg-transparent border border-transparent shadow-none",
                        "transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer",
                      ].join(" ")}
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

                {/* District */}
                <div className="flex flex-col space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    District <span className="text-rose-600">*</span>
                  </label>
                  <div
                    className={`relative rounded-xl shadow-sm transition-colors ${
                      touchedBasics.district && !district
                        ? "border-2 border-rose-400 bg-rose-50"
                        : !regionId
                          ? "border border-slate-200 bg-slate-50"
                          : district
                            ? "border border-transparent bg-slate-50"
                            : "border border-slate-200 bg-white"
                    }`}
                  >
                    {district ? (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600 z-10">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    ) : null}
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
                      className={`appearance-none w-full h-12 pl-10 pr-10 text-sm rounded-xl shadow-none bg-transparent border border-transparent transition-colors focus:outline-none focus:ring-2 cursor-pointer ${
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

                {/* Ward */}
                <div className="flex flex-col space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Ward <span className="text-rose-600">*</span>
                  </label>
                  <div
                    className={`relative rounded-xl shadow-sm transition-colors ${
                      touchedBasics.ward && !ward
                        ? "border-2 border-rose-400 bg-rose-50"
                        : !district
                          ? "border border-slate-200 bg-slate-50"
                          : ward
                            ? "border border-transparent bg-slate-50"
                            : "border border-slate-200 bg-white"
                    }`}
                  >
                    {ward ? (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600 z-10">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    ) : null}
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
                      className={`appearance-none w-full h-12 pl-10 pr-10 text-sm rounded-xl shadow-none bg-transparent border border-transparent transition-colors focus:outline-none focus:ring-2 cursor-pointer ${
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

              {/* Street Address, City, Zip Code - Uniform Grid Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex min-w-0 flex-col space-y-2">
                  <label htmlFor="streetAddress" className="block text-sm font-medium text-slate-700">
                    Street Address <span className="text-rose-600">*</span>
                  </label>
                  <div
                    className={`relative rounded-xl shadow-sm transition-colors ${
                      touchedBasics.street && !street
                        ? "border-2 border-rose-400 bg-rose-50"
                        : !ward
                          ? "border border-slate-200 bg-slate-50"
                          : street
                            ? "border border-transparent bg-slate-50"
                            : "border border-slate-200 bg-white"
                    }`}
                  >
                    {street ? (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600 z-10">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    ) : null}
                    <select
                      id="streetAddress"
                      title="Street"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      onBlur={() => setTouchedBasics((t) => ({ ...t, street: true }))}
                      disabled={!ward}
                      className={`min-w-0 appearance-none w-full h-12 pl-10 pr-10 text-sm rounded-xl shadow-none bg-transparent border border-transparent transition-colors focus:outline-none focus:ring-2 cursor-pointer ${
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
                  <label htmlFor="city" className="block text-sm font-medium text-slate-700">
                    City <span className="text-xs text-slate-400 font-normal">(optional)</span>
                  </label>
                  <div
                    className={[
                      "rounded-xl border shadow-sm transition-colors",
                      city.trim() ? "border-transparent bg-slate-50" : "border-slate-200 bg-white",
                    ].join(" ")}
                  >
                    <input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="min-w-0 w-full h-12 px-4 text-sm text-slate-900 placeholder-slate-400 rounded-xl bg-transparent border border-transparent shadow-none transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="City"
                    />
                  </div>
                </div>
                <div className="flex min-w-0 flex-col space-y-2">
                  <label htmlFor="zip" className="block text-sm font-medium text-slate-700">
                    Zip Code{" "}
                    {selectedWardPostcode ? (
                      <span className="text-rose-600">*</span>
                    ) : (
                      <span className="text-xs text-slate-400 font-normal">(optional)</span>
                    )}
                  </label>
                  <div
                    className={`rounded-xl shadow-sm transition-colors ${
                      touchedBasics.zip && selectedWardPostcode && (!zip || zip.trim().length === 0)
                        ? "border-2 border-rose-400 bg-rose-50"
                        : selectedWardPostcode
                          ? "border border-transparent bg-slate-50"
                          : zip.trim()
                            ? "border border-transparent bg-slate-50"
                            : "border border-slate-200 bg-white"
                    }`}
                  >
                    <input
                      id="zip"
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      onBlur={() => setTouchedBasics((t) => ({ ...t, zip: true }))}
                      readOnly={!!selectedWardPostcode}
                      className={`min-w-0 w-full h-12 px-4 text-sm rounded-xl shadow-none bg-transparent border border-transparent transition-colors focus:outline-none focus:ring-2 ${
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
                    <p className="text-xs text-emerald-600 mt-0.5">Auto-filled from selected ward</p>
                  )}
                  {!selectedWardPostcode && ward && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      Postcode not available for this ward - please enter manually
                    </p>
                  )}
                </div>
              </div>

              {/* Park / Tourism Site (Optional) */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white/70 p-5 sm:p-6 shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:shadow-md">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">Park / Tourism Site</h3>
                    <p className="text-xs text-slate-600">
                      If your property is inside or near a park, link it here so travelers can find it under that destination.
                    </p>
                  </div>
                  <span className="shrink-0 inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    Optional
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                  <div className="md:col-span-7 flex flex-col space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-slate-700">Tourism site / Park</label>
                    </div>

                    {parkIsLocked ? (
                      <div className="w-full h-12 px-4 text-sm rounded-xl border border-slate-300 bg-slate-50 shadow-sm inline-flex items-center justify-between gap-3">
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
                          className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-lg border border-transparent bg-transparent text-emerald-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                                : "Not linked to a park"
                          }
                          className="w-full h-12 pl-4 pr-24 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl shadow-sm transition-all duration-200 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
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
                            className="absolute right-10 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                          <div className="absolute z-30 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 overflow-hidden">
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
                      <p className="text-xs text-slate-500">Set your location first to load parks.</p>
                    ) : tourismSitesLoading ? (
                      <p className="text-xs text-slate-500">Loading parks…</p>
                    ) : null}
                  </div>

                  <div className="md:col-span-5 flex flex-col space-y-2">
                    <div className="flex items-end justify-between gap-3">
                      <label className="block text-sm font-medium text-slate-700">Placement</label>
                      {effectiveTourismSiteIdValue === "" ? (
                        <span className="text-[11px] font-medium text-slate-500">Select a park to enable</span>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white/70 shadow-sm p-2">
                      {placementIsLocked ? (
                        <div className="h-10 rounded-lg border border-slate-200 bg-white inline-flex items-center justify-between gap-2 w-full px-3 text-sm font-semibold text-slate-900">
                          <span className="inline-flex items-center justify-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            {effectiveParkPlacementValue === "INSIDE" ? "Inside" : "Nearby"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditingPlacement(true)}
                            className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border border-transparent bg-transparent text-emerald-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                            "w-full h-10 px-3 text-sm font-semibold rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500",
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

                    <p className="text-xs text-slate-600">Choose where the property is relative to the selected park.</p>
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
                    Location detected: {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
                  </p>
                )}
              </div>

              {/* Map Display - Modern Icon-Based Card Design */}
              <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Navigation2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 mb-1">Property Location Map</h3>
                      <p className="text-xs text-gray-500">
                        Exact coordinates:{" "}
                        {latitude && longitude ? (
                          <span className="font-mono text-gray-700">{Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}</span>
                        ) : (
                          <span className="font-medium text-gray-500">Not set yet</span>
                        )}
                      </p>
                      {zip || selectedWardPostcode ? (
                        <p className="text-xs text-gray-500 mt-1">
                          Postcode: <span className="font-semibold text-gray-700">{zip || selectedWardPostcode}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <PropertyLocationMap
                      latitude={typeof latitude === "number" ? latitude : 0}
                      longitude={typeof longitude === "number" ? longitude : 0}
                      postcode={zip || selectedWardPostcode || null}
                      onLocationDetected={(lat, lng) => {
                        setLatitude(lat);
                        setLongitude(lng);
                      }}
                    />
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



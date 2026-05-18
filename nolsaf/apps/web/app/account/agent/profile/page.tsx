"use client";

import { Children, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Camera,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  ImagePlus,
  Loader2,
  MapPin,
  PackagePlus,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Users,
  Wrench,
  X,
} from "lucide-react";
import LogoSpinner from "@/components/LogoSpinner";
import {
  getServiceOptionsForTypes,
  TOOLS_ASSETS_OPTIONS,
  TOURISM_TYPES,
} from "@/components/careers/partnershipProfile";
import apiClient from "@/lib/apiClient";
import { REGIONS } from "@/lib/tzRegions";

const api = apiClient;

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
  reviewStatus?: string;
  reviewReason?: string | null;
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
  [key: string]: any;
};

type AgentMe = {
  ok: boolean;
  agent?: {
    id: number;
    status?: string | null;
    level?: string | null;
    operatorProfile?: Partial<OperatorProfile> | null;
    user?: { name?: string | null; fullName?: string | null; email?: string | null; phone?: string | null };
  };
};

type CloudinarySig = {
  timestamp: number;
  signature: string;
  folder: string;
  cloudName: string;
  apiKey: string;
};

const emptyProfile: OperatorProfile = {
  companyName: "",
  companyLogoUrl: "",
  businessAddress: "",
  physicalLocation: "",
  operatingRegions: [],
  contactPhone: "",
  contactEmail: "",
  whatsapp: "",
  description: "",
  tourismTypes: [],
  tools: [],
  vehicles: [],
  services: [],
  addOns: [],
  seasonalPricing: "",
  packages: "",
  packageItems: [],
  seasonalPrices: [],
  capacityNotes: "",
  maxTripsPerDay: "",
  minimumBookingNotice: "",
  guidesAvailable: "",
  peakSeasonAvailability: "",
  blockedPeriods: "",
  gallery: [],
  classifiedPhotos: {},
};

const tourismTypes = TOURISM_TYPES;

const toolOptions = TOOLS_ASSETS_OPTIONS;

const serviceOptions = getServiceOptionsForTypes(TOURISM_TYPES);

const addOnOptions = [
  "Balloon safari",
  "Photography guide",
  "Private chef",
  "Luxury picnic",
  "Child seat",
  "Extra luggage support",
  "SIM card support",
  "Travel insurance support",
];

const vehicleTypes = [
  "Safari 4x4 Land Cruiser",
  "Safari van",
  "Private SUV",
  "Minibus",
  "Coaster bus",
  "Boat transfer",
];

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const peakSeasonOptions = [
  "Available",
  "Limited availability",
  "Available on request",
  "Not available",
];

const maxPhotoBytes = 2 * 1024 * 1024;
const acceptedPhotoTypes = ["image/jpeg", "image/png", "image/webp"];
const photoHelpText = "JPG, PNG, or WEBP. Max 2MB per photo.";

const photoCategories = [
  { key: "logo", title: "Logo", text: "Company mark shown on customer profile." },
  { key: "vehicles", title: "Vehicles", text: "Fleet photos customers can inspect." },
  { key: "team", title: "Team", text: "Guides, drivers, and support staff." },
  { key: "office", title: "Office", text: "Physical office or meeting location." },
  { key: "attractions", title: "Attractions", text: "Real destinations and trip moments." },
  { key: "proof", title: "Proof", text: "Permits, awards, quality proof, or certificates." },
] as const;

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}

function addUniqueItem(items: string[], value: string) {
  const clean = value.trim();
  if (!clean) return items;
  return items.includes(clean) ? items : [...items, clean];
}

function profileFrom(raw: Partial<OperatorProfile> | null | undefined, agent?: AgentMe["agent"]): OperatorProfile {
  return {
    ...emptyProfile,
    ...(raw ?? {}),
    contactEmail: raw?.contactEmail ?? agent?.user?.email ?? "",
    contactPhone: raw?.contactPhone ?? agent?.user?.phone ?? "",
    operatingRegions: strings(raw?.operatingRegions),
    tourismTypes: strings(raw?.tourismTypes),
    tools: strings(raw?.tools),
    services: strings(raw?.services),
    addOns: strings(raw?.addOns),
    gallery: strings(raw?.gallery),
    vehicles: Array.isArray(raw?.vehicles) ? raw.vehicles : [],
    packageItems: Array.isArray(raw?.packageItems)
      ? raw.packageItems.map((pkg) => ({
          ...pkg,
          description: (pkg as any)?.description ?? "",
          category: (pkg as any)?.category ?? "",
          minPax: (pkg as any)?.minPax ?? "",
          maxPax: (pkg as any)?.maxPax ?? "",
          accommodation: (pkg as any)?.accommodation ?? "",
          mealPlan: (pkg as any)?.mealPlan ?? "",
          difficulty: (pkg as any)?.difficulty ?? "",
          meetingPoint: (pkg as any)?.meetingPoint ?? "",
          included: strings((pkg as any)?.included),
          excluded: strings((pkg as any)?.excluded),
          itinerary: Array.isArray((pkg as any)?.itinerary) ? (pkg as any).itinerary : [],
        }))
      : [],
    seasonalPrices: Array.isArray(raw?.seasonalPrices) ? raw.seasonalPrices : [],
    classifiedPhotos: raw?.classifiedPhotos && typeof raw.classifiedPhotos === "object" ? raw.classifiedPhotos : {},
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="block text-xs text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`mt-1.5 box-border block w-full max-w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-200 ${props.className ?? ""}`}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`mt-1.5 box-border block min-h-[104px] w-full max-w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-200 ${props.className ?? ""}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select
        {...props}
        className={`mt-1.5 box-border block w-full max-w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-50 disabled:text-slate-400 ${props.className ?? ""}`}
      />
    </span>
  );
}

function Section({
  icon,
  title,
  text,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative mx-auto box-border w-full max-w-[860px] overflow-hidden rounded-lg border border-slate-300 bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.08)] ring-1 ring-inset ring-white sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black leading-tight text-slate-950 sm:text-xl">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
        </div>
      </div>
      {children}
      <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-100 to-transparent" aria-hidden />
    </section>
  );
}

function FieldGrid({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid w-full max-w-[828px] grid-cols-1 gap-3 overflow-hidden md:grid-cols-2 ${className}`}>
      {Children.map(children, (child) => (
        <div className="min-w-0">
          {child}
        </div>
      ))}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex min-h-10 min-w-0 items-center justify-between gap-2 rounded-lg border px-3.5 py-2 text-left text-sm font-normal leading-5 transition ${
        active
          ? "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
          : "border-slate-200 bg-white text-slate-700 shadow-[0_1px_0_rgba(15,23,42,0.03)] hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span className="truncate">{label}</span>
      {active ? <Check className="h-4 w-4 shrink-0 text-emerald-700" /> : null}
    </button>
  );
}

function SelectedPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="grid min-h-10 grid-cols-[1fr_32px] items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
      <span className="truncate px-3.5 py-2">{label}</span>
      <button type="button" onClick={onRemove} className="m-1 flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent p-0 text-slate-500 shadow-none ring-0 outline-none hover:bg-slate-100" aria-label={`Remove ${label}`}>
        <X className="h-4 w-4" />
      </button>
    </span>
  );
}

export default function AgentOperatorProfileEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentMe["agent"] | null>(null);
  const [profile, setProfile] = useState<OperatorProfile>(emptyProfile);
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [customTool, setCustomTool] = useState("");
  const [customService, setCustomService] = useState("");
  const [customAddOn, setCustomAddOn] = useState("");
  const [includedDrafts, setIncludedDrafts] = useState<Record<string, string>>({});
  const [excludedDrafts, setExcludedDrafts] = useState<Record<string, string>>({});
  const [itineraryDrafts, setItineraryDrafts] = useState<Record<string, { title: string; description: string }>>({});
  const [photoSlideIndex, setPhotoSlideIndex] = useState<Record<string, number>>({});
  const touchStartXRef = useRef<Record<string, number | null>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/agent/me", { params: { _t: Date.now() } });
        if (!alive) return;
        const nextAgent = (res.data as AgentMe)?.agent ?? null;
        setAgent(nextAgent);
        setProfile(profileFrom(nextAgent?.operatorProfile, nextAgent ?? undefined));
      } catch (e: any) {
        if (alive) setError(e?.response?.data?.message || "Unable to load operator profile.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const selectedRegion = REGIONS.find((r) => r.name === region);

  const readiness = useMemo(() => {
    const checks = [
      profile.companyName,
      profile.contactEmail,
      profile.contactPhone,
      profile.businessAddress,
      profile.physicalLocation,
      profile.operatingRegions.length,
      profile.tourismTypes.length,
      profile.services.length,
      profile.vehicles.length || profile.tools.length,
      profile.packageItems.length || profile.seasonalPrices.length,
      Object.values(profile.classifiedPhotos).some((items) => Array.isArray(items) && items.length > 0),
      profile.description,
      profile.guidesAvailable || profile.minimumBookingNotice || profile.maxTripsPerDay,
    ];
    const done = checks.filter(Boolean).length;
    return { done, total: checks.length, pct: Math.round((done / checks.length) * 100) };
  }, [profile]);

  function update<K extends keyof OperatorProfile>(key: K, value: OperatorProfile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  function toggle(key: "tourismTypes" | "tools" | "services" | "addOns", value: string) {
    setProfile((p) => {
      const list = p[key];
      return { ...p, [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] };
    });
  }

  function addCustom(key: "tools" | "services" | "addOns", value: string, clear: (v: string) => void) {
    const clean = value.trim();
    if (!clean) return;
    setProfile((p) => ({ ...p, [key]: p[key].includes(clean) ? p[key] : [...p[key], clean] }));
    clear("");
  }

  function addArea() {
    if (!region || !district) return;
    const label = `${region} / ${district}`;
    update("operatingRegions", profile.operatingRegions.includes(label) ? profile.operatingRegions : [...profile.operatingRegions, label]);
    setDistrict("");
  }

  function addVehicle() {
    update("vehicles", [
      ...profile.vehicles,
      {
        id: id(),
        type: "Safari 4x4 Land Cruiser",
        quantity: "",
        seatsPerVehicle: "",
        registrationNumber: "",
        ownedBy: "",
        serviceMode: "Private",
        notes: "",
      },
    ]);
  }

  function patchVehicle(vehicleId: string, patch: Partial<VehicleAsset>) {
    update("vehicles", profile.vehicles.map((v) => (v.id === vehicleId ? { ...v, ...patch } : v)));
  }

  function addPackage() {
    update("packageItems", [
      ...profile.packageItems,
      {
        id: id(),
        name: "",
        description: "",
        destination: "",
        category: "",
        duration: "",
        minPax: "",
        maxPax: "",
        pricePerPerson: "",
        currency: "USD",
        mode: "Private",
        accommodation: "",
        mealPlan: "",
        difficulty: "",
        meetingPoint: "",
        included: [],
        excluded: [],
        itinerary: [],
        notes: "",
      },
    ]);
  }

  function patchPackage(packageId: string, patch: Partial<PackageItem>) {
    update("packageItems", profile.packageItems.map((p) => (p.id === packageId ? { ...p, ...patch } : p)));
  }

  function addPackageListItem(packageId: string, key: "included" | "excluded") {
    const draftMap = key === "included" ? includedDrafts : excludedDrafts;
    const value = draftMap[packageId] ?? "";
    const clean = value.trim();
    if (!clean) return;

    update(
      "packageItems",
      profile.packageItems.map((pkg) =>
        pkg.id === packageId ? { ...pkg, [key]: addUniqueItem(pkg[key], clean) } : pkg,
      ),
    );

    if (key === "included") {
      setIncludedDrafts((drafts) => ({ ...drafts, [packageId]: "" }));
    } else {
      setExcludedDrafts((drafts) => ({ ...drafts, [packageId]: "" }));
    }
  }

  function removePackageListItem(packageId: string, key: "included" | "excluded", item: string) {
    update(
      "packageItems",
      profile.packageItems.map((pkg) =>
        pkg.id === packageId ? { ...pkg, [key]: pkg[key].filter((x) => x !== item) } : pkg,
      ),
    );
  }

  function addItineraryDay(packageId: string) {
    const draft = itineraryDrafts[packageId] ?? { title: "", description: "" };
    const cleanTitle = draft.title.trim();
    const cleanDesc = draft.description.trim();
    if (!cleanTitle && !cleanDesc) return;
    const pkg = profile.packageItems.find((p) => p.id === packageId);
    if (!pkg) return;
    const nextDay = (pkg.itinerary.length > 0 ? Math.max(...pkg.itinerary.map((d) => d.day)) : 0) + 1;
    const newDay: ItineraryDay = { id: id(), day: nextDay, title: cleanTitle, description: cleanDesc };
    update("packageItems", profile.packageItems.map((p) =>
      p.id === packageId ? { ...p, itinerary: [...p.itinerary, newDay] } : p,
    ));
    setItineraryDrafts((d) => ({ ...d, [packageId]: { title: "", description: "" } }));
  }

  function patchItineraryDay(packageId: string, dayId: string, patch: Partial<ItineraryDay>) {
    update("packageItems", profile.packageItems.map((p) =>
      p.id === packageId
        ? { ...p, itinerary: p.itinerary.map((d) => (d.id === dayId ? { ...d, ...patch } : d)) }
        : p,
    ));
  }

  function removeItineraryDay(packageId: string, dayId: string) {
    update("packageItems", profile.packageItems.map((p) =>
      p.id === packageId
        ? { ...p, itinerary: p.itinerary.filter((d) => d.id !== dayId).map((d, i) => ({ ...d, day: i + 1 })) }
        : p,
    ));
  }

  function addSeason() {
    update("seasonalPrices", [
      ...profile.seasonalPrices,
      { id: id(), seasonName: "", startMonth: "", endMonth: "", pricePerPerson: "", currency: "USD", notes: "" },
    ]);
  }

  function patchSeason(seasonId: string, patch: Partial<SeasonalPrice>) {
    update("seasonalPrices", profile.seasonalPrices.map((p) => (p.id === seasonId ? { ...p, ...patch } : p)));
  }

  async function uploadToCloudinary(file: File, category: string) {
    const sig = await api.get(`/api/uploads/cloudinary/sign?folder=${encodeURIComponent(`agent-operator/${category}`)}`);
    const sigData = sig.data as CloudinarySig;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("timestamp", String(sigData.timestamp));
    fd.append("api_key", sigData.apiKey);
    fd.append("signature", sigData.signature);
    fd.append("folder", sigData.folder);
    fd.append("overwrite", "true");
    const resp = await axios.post(`https://api.cloudinary.com/v1_1/${sigData.cloudName}/auto/upload`, fd);
    return (resp.data as { secure_url: string }).secure_url;
  }

  async function uploadPhotos(category: string, files: FileList | null) {
    if (!files?.length) return;
    try {
      setUploading(category);
      setError(null);
      const selectedFiles = Array.from(files);
      if (category === "logo" && selectedFiles.length > 1) {
        setError("Logo allows only one photo. Please upload a single image.");
        return;
      }
      const invalidType = selectedFiles.find((file) => !acceptedPhotoTypes.includes(file.type));
      if (invalidType) {
        setError("Only JPG, PNG, or WEBP photos are allowed.");
        return;
      }
      const tooLarge = selectedFiles.find((file) => file.size > maxPhotoBytes);
      if (tooLarge) {
        setError("Each photo must be 2MB or smaller.");
        return;
      }
      const urls: string[] = [];
      for (const file of selectedFiles) urls.push(await uploadToCloudinary(file, category));
      setProfile((p) => {
        const existing = p.classifiedPhotos[category] ?? [];
        const nextCategoryUrls = category === "logo" ? (urls[0] ? [urls[0]] : existing) : [...existing, ...urls];
        const galleryWithoutOldLogo =
          category === "logo"
            ? p.gallery.filter((x) => !existing.includes(x))
            : p.gallery;
        const classifiedPhotos = { ...p.classifiedPhotos, [category]: nextCategoryUrls };
        return {
          ...p,
          companyLogoUrl: category === "logo" && urls[0] ? urls[0] : p.companyLogoUrl,
          gallery: [...galleryWithoutOldLogo, ...urls],
          classifiedPhotos,
        };
      });
    } catch (e: any) {
      setError(e?.response?.data?.message || "Photo upload failed.");
    } finally {
      setUploading(null);
      const input = fileRefs.current[category];
      if (input) input.value = "";
    }
  }

  async function save() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const res = await api.patch("/api/agent/operator-profile", profile);
      setProfile(profileFrom((res.data as AgentMe).agent?.operatorProfile, agent ?? undefined));
      setSuccess("Operator profile saved.");
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.error || "Unable to save operator profile.");
    } finally {
      setSaving(false);
    }
  }

  async function submitForReview() {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      const res = await api.post("/api/agent/operator-profile/submit");
      const nextAgent = (res.data as AgentMe)?.agent ?? null;
      if (nextAgent?.operatorProfile) {
        setProfile(profileFrom(nextAgent.operatorProfile, agent ?? undefined));
      }
      setSuccess("Operator profile submitted to admin for review.");
    } catch (e: any) {
      const missing = e?.response?.data?.missing;
      const missingText = Array.isArray(missing) && missing.length > 0 ? ` Missing: ${missing.join(", ")}.` : "";
      setError((e?.response?.data?.message || e?.response?.data?.error || "Unable to submit operator profile.") + missingText);
    } finally {
      setSubmitting(false);
    }
  }

  function goToPhoto(categoryKey: string, total: number, direction: -1 | 1) {
    if (total <= 1) return;
    setPhotoSlideIndex((prev) => {
      const current = Math.min(Math.max(prev[categoryKey] ?? 0, 0), total - 1);
      return { ...prev, [categoryKey]: (current + direction + total) % total };
    });
  }

  function onPhotoTouchStart(categoryKey: string, clientX: number) {
    touchStartXRef.current[categoryKey] = clientX;
  }

  function onPhotoTouchEnd(categoryKey: string, total: number, clientX: number) {
    const startX = touchStartXRef.current[categoryKey];
    touchStartXRef.current[categoryKey] = null;
    if (startX == null || total <= 1) return;

    const delta = clientX - startX;
    const threshold = 30;
    if (Math.abs(delta) < threshold) return;

    if (delta < 0) {
      goToPhoto(categoryKey, total, 1);
    } else {
      goToPhoto(categoryKey, total, -1);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <LogoSpinner size="xl" />
      </div>
    );
  }

  const reviewStatus = String(profile.reviewStatus || profile.review?.status || "DRAFT").toUpperCase();
  const reviewReason = String(profile.reviewReason || profile.review?.reason || "").trim();
  const reviewBadge =
    reviewStatus === "APPROVED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : reviewStatus === "CHANGES_REQUESTED"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : reviewStatus === "REJECTED"
          ? "border-red-200 bg-red-50 text-red-700"
          : ["SUBMITTED", "RESUBMITTED"].includes(reviewStatus)
            ? "border-sky-200 bg-sky-50 text-sky-700"
            : "border-slate-200 bg-slate-50 text-slate-700";
  const canSubmit = readiness.pct === 100 && !["SUBMITTED", "RESUBMITTED"].includes(reviewStatus);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl py-6 sm:px-6 lg:px-8">
        <Link href="/account/agent" aria-label="Back to agent dashboard" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 no-underline hover:bg-white hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#063f3b] p-5 text-white shadow-[0_18px_45px_rgba(2,32,29,0.18)] sm:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(15,118,110,0.58),rgba(8,47,73,0.34)_48%,rgba(2,102,94,0.18))]" aria-hidden />
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/10" aria-hidden />
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent" aria-hidden />
            <div className="relative flex flex-col gap-6 lg:min-h-[250px] lg:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-cyan-50 shadow-inner sm:flex">
                  <Building2 className="h-8 w-8" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-cyan-100">Company marketplace setup</p>
                  <h1 className="mt-2 text-3xl font-black tracking-normal text-white sm:text-4xl">Operator Profile</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-cyan-50/85 sm:text-base sm:leading-7">Build the company identity, coverage, packages, fleet, and photos customers review before choosing a tour operator.</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-cyan-100/80">Coverage</p>
                    <p className="mt-1 text-lg font-black text-white">{profile.operatingRegions.length}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-cyan-100/80">Packages</p>
                    <p className="mt-1 text-lg font-black text-white">{profile.packageItems.length}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-cyan-100/80">Photos</p>
                    <p className="mt-1 text-lg font-black text-white">{profile.gallery.length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2 sm:w-64 sm:grid-cols-1">
                  <Link href="/account/agent/profile/preview" className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white px-3 text-sm font-black text-slate-900 no-underline shadow-sm hover:bg-cyan-50">
                    <Eye className="h-4 w-4" />
                  <span className="truncate">Full preview</span>
                  </Link>
                  <Link href="/account/agent/card" className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-black text-white no-underline shadow-sm hover:bg-white/15">
                    <Eye className="h-4 w-4" />
                  <span className="truncate">Marketplace card</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Readiness</p>
                <p className="mt-2 text-4xl font-black text-slate-950">{readiness.pct}%</p>
              </div>
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full p-2 text-sm font-black text-slate-950 shadow-inner"
                style={{ background: `conic-gradient(#059669 ${readiness.pct * 3.6}deg, #e2e8f0 0deg)` }}
              >
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
                  {readiness.done}/{readiness.total}
                </div>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${readiness.pct}%` }} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">Complete identity, services, pricing, tools, and photos before booking visibility.</p>
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Admin review</p>
              <div className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${reviewBadge}`}>
                {reviewStatus.replace(/_/g, " ")}
              </div>
              {reviewReason ? <p className="mt-2 text-xs leading-5 text-slate-600">{reviewReason}</p> : null}
            </div>
          </aside>
        </div>

        {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}
        {success ? <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{success}</div> : null}

        <div className="mt-5 space-y-5">
          <Section icon={<Building2 className="h-5 w-5" />} title="Company Identity" text="Business details customers see before selecting an operator.">
            <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Profile name</p>
                <p className="mt-1 truncate text-sm font-black text-slate-950">{profile.companyName || "Not set"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Contact route</p>
                <p className="mt-1 truncate text-sm font-black text-slate-950">{profile.contactPhone || profile.whatsapp || "Not set"}</p>
              </div>
            </div>

            <div className="grid w-full max-w-[828px] grid-cols-2 gap-2 overflow-hidden sm:gap-3">
              <Field label="Company / operator name">
                <Input value={profile.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="India Camel" />
              </Field>
              <Field label="Contact email">
                <Input value={profile.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} placeholder="bookings@example.com" />
              </Field>
              <Field label="Contact phone">
                <Input value={profile.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} placeholder="+255..." />
              </Field>
              <Field label="WhatsApp">
                <Input value={profile.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="+255..." />
              </Field>
              <Field label="Business address">
                <Input value={profile.businessAddress} onChange={(e) => update("businessAddress", e.target.value)} placeholder="Registered business address" />
              </Field>
              <Field label="Physical location">
                <Input value={profile.physicalLocation} onChange={(e) => update("physicalLocation", e.target.value)} placeholder="Office, landmark, town, or coordinates" />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Short company description">
                <Textarea value={profile.description} onChange={(e) => update("description", e.target.value)} placeholder="Briefly explain your operator style, experience, and service promise." />
              </Field>
            </div>
          </Section>

          <Section icon={<MapPin className="h-5 w-5" />} title="Area Of Operation" text="Select the regions and districts where the operator can serve trips.">
            <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-3 sm:p-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
                <Field label="Region">
                  <Select value={region} onChange={(e) => { setRegion(e.target.value); setDistrict(""); }}>
                    <option value="">Select region</option>
                    {REGIONS.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                  </Select>
                </Field>
                <Field label="District">
                  <Select value={district} onChange={(e) => setDistrict(e.target.value)} disabled={!selectedRegion}>
                    <option value="">Select district</option>
                    {selectedRegion?.districts.map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </Field>
                <button type="button" onClick={addArea} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-black text-white shadow-sm hover:bg-emerald-800">
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Coverage list</p>
                  <p className="mt-0.5 text-xs text-slate-500">{profile.operatingRegions.length} area{profile.operatingRegions.length === 1 ? "" : "s"} selected</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">{profile.operatingRegions.length}</span>
              </div>
              {profile.operatingRegions.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {profile.operatingRegions.map((area) => (
                    <SelectedPill key={area} label={area} onRemove={() => update("operatingRegions", profile.operatingRegions.filter((x) => x !== area))} />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-5 text-center text-sm font-semibold text-slate-500">
                  No operating areas selected yet.
                </div>
              )}
            </div>
          </Section>

          <Section icon={<ShieldCheck className="h-5 w-5" />} title="Tourism Types Served" text="Choose every trip category this operator can support.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {tourismTypes.map((item) => (
                <Chip key={item} label={item} active={profile.tourismTypes.includes(item)} onClick={() => toggle("tourismTypes", item)} />
              ))}
            </div>
          </Section>

          <Section icon={<Wrench className="h-5 w-5" />} title="Tools And Assets" text="Define field tools and fleet details without confusing count, seats, or ownership.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {toolOptions.map((item) => (
                <Chip key={item} label={item} active={profile.tools.includes(item)} onClick={() => toggle("tools", item)} />
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input value={customTool} onChange={(e) => setCustomTool(e.target.value)} placeholder="Add another tool or asset" />
              <button type="button" onClick={() => addCustom("tools", customTool, setCustomTool)} className="mt-1 rounded-md border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">Add</button>
            </div>
            {profile.tools.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {profile.tools.map((tool) => <SelectedPill key={tool} label={tool} onRemove={() => update("tools", profile.tools.filter((x) => x !== tool))} />)}
              </div>
            ) : null}

            <div className="mt-7 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-black text-slate-950">Vehicle inventory</h3>
              <button type="button" onClick={addVehicle} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-black text-white sm:justify-start">
                <Car className="h-4 w-4" />
                Add vehicle
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {profile.vehicles.map((vehicle, index) => (
                <div key={vehicle.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-950">Vehicle {index + 1}</p>
                    <button type="button" onClick={() => update("vehicles", profile.vehicles.filter((v) => v.id !== vehicle.id))} className="text-slate-500 hover:text-red-600" aria-label="Remove vehicle">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <FieldGrid>
                    <Field label="Vehicle type">
                      <Select value={vehicle.type} onChange={(e) => patchVehicle(vehicle.id, { type: e.target.value })}>
                        {vehicleTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                      </Select>
                    </Field>
                    <Field label="Number of vehicles">
                      <Input type="number" min="0" value={vehicle.quantity} onChange={(e) => patchVehicle(vehicle.id, { quantity: e.target.value })} placeholder="e.g. 2" />
                    </Field>
                    <Field label="Seats per vehicle">
                      <Input type="number" min="0" value={vehicle.seatsPerVehicle} onChange={(e) => patchVehicle(vehicle.id, { seatsPerVehicle: e.target.value })} placeholder="e.g. 6" />
                    </Field>
                    <Field label="Registration number">
                      <Input value={vehicle.registrationNumber} onChange={(e) => patchVehicle(vehicle.id, { registrationNumber: e.target.value })} placeholder="T 123 ABC" />
                    </Field>
                    <Field label="Owned by">
                      <Select value={vehicle.ownedBy} onChange={(e) => patchVehicle(vehicle.id, { ownedBy: e.target.value })}>
                        <option value="">Select ownership</option>
                        <option value="Company owned">Company owned</option>
                        <option value="Partner owned">Partner owned</option>
                        <option value="Rented on demand">Rented on demand</option>
                      </Select>
                    </Field>
                    <Field label="Service mode">
                      <Select value={vehicle.serviceMode} onChange={(e) => patchVehicle(vehicle.id, { serviceMode: e.target.value })}>
                        <option value="Private">Private</option>
                        <option value="Shared">Shared</option>
                        <option value="Private and shared">Private and shared</option>
                      </Select>
                    </Field>
                  </FieldGrid>
                  <div className="mt-3">
                    <Field label="Vehicle notes">
                      <Textarea value={vehicle.notes} onChange={(e) => patchVehicle(vehicle.id, { notes: e.target.value })} placeholder="Pop-up roof, charging ports, luggage space, cooler box, or limits." />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section icon={<Users className="h-5 w-5" />} title="Operating Capacity" text="Make availability and execution capacity clear before customers book.">
            <FieldGrid>
              <Field label="Max trips per day">
                <Input type="number" min="0" value={profile.maxTripsPerDay} onChange={(e) => update("maxTripsPerDay", e.target.value)} placeholder="e.g. 3" />
              </Field>
              <Field label="Guides available">
                <Input type="number" min="0" value={profile.guidesAvailable} onChange={(e) => update("guidesAvailable", e.target.value)} placeholder="e.g. 5" />
              </Field>
              <Field label="Minimum booking notice">
                <Input value={profile.minimumBookingNotice} onChange={(e) => update("minimumBookingNotice", e.target.value)} placeholder="e.g. 48 hours" />
              </Field>
              <Field label="Peak season availability">
                <Select value={profile.peakSeasonAvailability} onChange={(e) => update("peakSeasonAvailability", e.target.value)}>
                  <option value="">Select availability</option>
                  {peakSeasonOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </Select>
              </Field>
            </FieldGrid>
            <FieldGrid className="mt-3">
              <Field label="Blocked periods">
                <Textarea value={profile.blockedPeriods} onChange={(e) => update("blockedPeriods", e.target.value)} placeholder="Periods when bookings should not be accepted." />
              </Field>
              <Field label="Capacity notes">
                <Textarea value={profile.capacityNotes} onChange={(e) => update("capacityNotes", e.target.value)} placeholder="Large group capacity, field team notes, or operational conditions." />
              </Field>
            </FieldGrid>
          </Section>

          <Section icon={<BriefcaseBusiness className="h-5 w-5" />} title="Services, Packages, And Pricing" text="Select your services, then add package details and pricing.">
            <p className="mb-3 text-sm text-slate-600">Choose the services your agency offers.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {serviceOptions.map((item) => (
                <Chip key={item} label={item} active={profile.services.includes(item)} onClick={() => toggle("services", item)} />
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input value={customService} onChange={(e) => setCustomService(e.target.value)} placeholder="Add another service" />
              <button type="button" onClick={() => addCustom("services", customService, setCustomService)} className="mt-1 rounded-md border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">Add</button>
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.07)]">
              <div className="relative overflow-hidden bg-gradient-to-br from-white via-emerald-50/45 to-cyan-50/60 px-4 py-4 sm:px-5">
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#02665e]">Commercial package studio</p>
                    <h3 className="mt-1 text-xl font-black text-slate-950">Tour Packages</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Build the offers customers will compare, trust, and book.</p>
                  </div>
                  <button type="button" onClick={addPackage} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#02665e] px-4 text-sm font-black text-white shadow-sm hover:bg-[#01544d]">
                    <PackagePlus className="h-4 w-4" />
                    Add package
                  </button>
                </div>
                <div className="relative mt-4 grid grid-cols-1 gap-2 min-[430px]:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-wide text-[#02665e]">Packages</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{profile.packageItems.length}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-wide text-[#02665e]">Seasons</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{profile.seasonalPrices.length}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-wide text-[#02665e]">Add-ons</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{profile.addOns.length}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 bg-slate-50/70 p-3 sm:p-4">
                {profile.packageItems.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-emerald-300 bg-white p-5 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                      <PackagePlus className="h-7 w-7" />
                    </span>
                    <p className="mt-3 text-base font-black text-slate-950">No commercial package yet</p>
                    <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">Start with the package that has the strongest booking potential. Price, route, capacity, inclusions, and itinerary will appear here.</p>
                    <button type="button" onClick={addPackage} className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-black text-white shadow-sm hover:bg-emerald-800">
                  <PackagePlus className="h-4 w-4" />
                      Create first package
                    </button>
                  </div>
                )}
              {profile.packageItems.map((pkg, index) => (
                <div key={pkg.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="bg-gradient-to-r from-slate-950 via-[#064e46] to-[#0f766e] px-4 py-4 text-white sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-cyan-100">Package {index + 1}</p>
                        <h4 className="mt-1 truncate text-lg font-black text-white">{pkg.name || "Untitled package"}</h4>
                        <p className="mt-1 truncate text-xs font-semibold text-cyan-50/75">{pkg.destination || "Destination not set"}</p>
                      </div>
                      <button type="button" onClick={() => update("packageItems", profile.packageItems.filter((p) => p.id !== pkg.id))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white hover:bg-red-500/80" aria-label="Remove package">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-wide text-cyan-100/80">Price</p>
                        <p className="mt-1 truncate text-sm font-black text-white">{pkg.pricePerPerson ? `${pkg.currency} ${pkg.pricePerPerson}` : "Not set"}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-wide text-cyan-100/80">Duration</p>
                        <p className="mt-1 truncate text-sm font-black text-white">{pkg.duration || "Not set"}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-wide text-cyan-100/80">Mode</p>
                        <p className="mt-1 truncate text-sm font-black text-white">{pkg.mode || "Not set"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-5 p-4 sm:p-5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                      <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Package identity</p>
                    <FieldGrid>
                    <Field label="Package name"><Input value={pkg.name} onChange={(e) => patchPackage(pkg.id, { name: e.target.value })} placeholder="Serengeti classic safari" /></Field>
                    <Field label="Destination"><Input value={pkg.destination} onChange={(e) => patchPackage(pkg.id, { destination: e.target.value })} placeholder="Serengeti, Ngorongoro" /></Field>
                  </FieldGrid>
                  <div className="mt-3">
                    <Field label="Short description">
                      <Textarea value={pkg.description} onChange={(e) => patchPackage(pkg.id, { description: e.target.value })} placeholder="A brief marketing overview of this package that customers will see first." />
                    </Field>
                  </div>
                    </div>

                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 sm:p-4">
                      <p className="mb-3 text-xs font-black uppercase tracking-wide text-emerald-700">Commercial terms</p>
                  <FieldGrid className="mt-3">
                    <Field label="Tour category">
                      <Select value={pkg.category} onChange={(e) => patchPackage(pkg.id, { category: e.target.value })}>
                        <option value="">Select category</option>
                        <option>Safari</option>
                        <option>Beach &amp; Island</option>
                        <option>Cultural &amp; Heritage</option>
                        <option>Mountain &amp; Hiking</option>
                        <option>Adventure</option>
                        <option>Birdwatching</option>
                        <option>City Tour</option>
                        <option>Fishing</option>
                        <option>Photography</option>
                        <option>Other</option>
                      </Select>
                    </Field>
                    <Field label="Difficulty">
                      <Select value={pkg.difficulty} onChange={(e) => patchPackage(pkg.id, { difficulty: e.target.value })}>
                        <option value="">Select difficulty</option>
                        <option>Easy</option>
                        <option>Moderate</option>
                        <option>Challenging</option>
                        <option>Extreme</option>
                      </Select>
                    </Field>
                    <Field label="Duration"><Input value={pkg.duration} onChange={(e) => patchPackage(pkg.id, { duration: e.target.value })} placeholder="3 days / 2 nights" /></Field>
                    <Field label="Mode"><Select value={pkg.mode} onChange={(e) => patchPackage(pkg.id, { mode: e.target.value })}><option>Private</option><option>Shared</option><option>Private and shared</option></Select></Field>
                    <Field label="Min group size (pax)"><Input type="number" min="1" value={pkg.minPax} onChange={(e) => patchPackage(pkg.id, { minPax: e.target.value })} placeholder="1" /></Field>
                    <Field label="Max group size (pax)"><Input type="number" min="1" value={pkg.maxPax} onChange={(e) => patchPackage(pkg.id, { maxPax: e.target.value })} placeholder="12" /></Field>
                    <Field label="Price per person"><Input type="number" min="0" value={pkg.pricePerPerson} onChange={(e) => patchPackage(pkg.id, { pricePerPerson: e.target.value })} placeholder="450" /></Field>
                    <Field label="Currency"><Select value={pkg.currency} onChange={(e) => patchPackage(pkg.id, { currency: e.target.value })}><option>USD</option><option>TZS</option><option>EUR</option></Select></Field>
                    <Field label="Accommodation">
                      <Select value={pkg.accommodation} onChange={(e) => patchPackage(pkg.id, { accommodation: e.target.value })}>
                        <option value="">Select accommodation</option>
                        <option>Camping / Tented camp</option>
                        <option>Budget hotel</option>
                        <option>Mid-range hotel</option>
                        <option>Luxury lodge</option>
                        <option>Mixed (budget &amp; mid-range)</option>
                        <option>Mixed (mid-range &amp; luxury)</option>
                        <option>Not included</option>
                      </Select>
                    </Field>
                    <Field label="Meal plan">
                      <Select value={pkg.mealPlan} onChange={(e) => patchPackage(pkg.id, { mealPlan: e.target.value })}>
                        <option value="">Select meal plan</option>
                        <option>None (self-catered)</option>
                        <option>Breakfast only</option>
                        <option>Half board (B&amp;D)</option>
                        <option>Full board (B, L &amp; D)</option>
                        <option>All-inclusive</option>
                      </Select>
                    </Field>
                  </FieldGrid>
                  <div className="mt-3">
                    <Field label="Meeting / departure point"><Input value={pkg.meetingPoint} onChange={(e) => patchPackage(pkg.id, { meetingPoint: e.target.value })} placeholder="Arusha town centre or hotel pick-up" /></Field>
                  </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                      <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Value promise</p>
                  <FieldGrid className="mt-3">
                    <Field label="Included">
                      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <Input
                          value={includedDrafts[pkg.id] ?? ""}
                          onChange={(e) => setIncludedDrafts((drafts) => ({ ...drafts, [pkg.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addPackageListItem(pkg.id, "included");
                            }
                          }}
                          placeholder="Guide"
                        />
                        <button
                          type="button"
                          onClick={() => addPackageListItem(pkg.id, "included")}
                          className="mt-1 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                        >
                          Add
                        </button>
                      </div>
                      {pkg.included.length > 0 ? (
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {pkg.included.map((item) => (
                            <SelectedPill key={item} label={item} onRemove={() => removePackageListItem(pkg.id, "included", item)} />
                          ))}
                        </div>
                      ) : null}
                    </Field>
                    <Field label="Not included">
                      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <Input
                          value={excludedDrafts[pkg.id] ?? ""}
                          onChange={(e) => setExcludedDrafts((drafts) => ({ ...drafts, [pkg.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addPackageListItem(pkg.id, "excluded");
                            }
                          }}
                          placeholder="Flights"
                        />
                        <button
                          type="button"
                          onClick={() => addPackageListItem(pkg.id, "excluded")}
                          className="mt-1 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                        >
                          Add
                        </button>
                      </div>
                      {pkg.excluded.length > 0 ? (
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {pkg.excluded.map((item) => (
                            <SelectedPill key={item} label={item} onRemove={() => removePackageListItem(pkg.id, "excluded", item)} />
                          ))}
                        </div>
                      ) : null}
                    </Field>
                  </FieldGrid>
                  <div className="mt-3">
                    <Field label="Package notes">
                      <Textarea value={pkg.notes} onChange={(e) => patchPackage(pkg.id, { notes: e.target.value })} placeholder="Booking conditions, route notes, or extra customer guidance." />
                    </Field>
                  </div>
                    </div>

                  {/* Day-by-day itinerary */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">Day-by-day itinerary</p>
                    </div>
                    {pkg.itinerary.length > 0 && (
                      <div className="mb-3 space-y-3">
                        {pkg.itinerary.map((day) => (
                          <div key={day.id} className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[10px] font-black text-white">{day.day}</span>
                              <Input
                                className="flex-1"
                                value={day.title}
                                onChange={(e) => patchItineraryDay(pkg.id, day.id, { title: e.target.value })}
                                placeholder={`Day ${day.day} title, e.g. Arrive Arusha`}
                              />
                              <button type="button" onClick={() => removeItineraryDay(pkg.id, day.id)} className="shrink-0 text-slate-400 hover:text-red-600" aria-label="Remove day">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <Textarea
                              value={day.description}
                              onChange={(e) => patchItineraryDay(pkg.id, day.id, { description: e.target.value })}
                              placeholder="Describe the activities, meals, accommodation, and travel for this day."
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3">
                      <Input
                        value={itineraryDrafts[pkg.id]?.title ?? ""}
                        onChange={(e) => setItineraryDrafts((d) => ({ ...d, [pkg.id]: { ...(d[pkg.id] ?? { title: "", description: "" }), title: e.target.value } }))}
                        placeholder={`Day ${pkg.itinerary.length + 1} title, e.g. Game drive in Serengeti`}
                      />
                      <Textarea
                        value={itineraryDrafts[pkg.id]?.description ?? ""}
                        onChange={(e) => setItineraryDrafts((d) => ({ ...d, [pkg.id]: { ...(d[pkg.id] ?? { title: "", description: "" }), description: e.target.value } }))}
                        placeholder="Activities, route, meals, and overnight stay for this day…"
                      />
                      <button
                        type="button"
                        onClick={() => addItineraryDay(pkg.id)}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add day {pkg.itinerary.length + 1}
                      </button>
                    </div>
                  </div>
                  </div>
                </div>
              ))}
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-black text-slate-950">Seasonal pricing</h3>
              <button type="button" onClick={addSeason} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-black text-slate-800 sm:justify-start">
                <Plus className="h-4 w-4" />
                Add season
              </button>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {profile.seasonalPrices.map((season) => (
                <div key={season.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex justify-end">
                    <button type="button" onClick={() => update("seasonalPrices", profile.seasonalPrices.filter((p) => p.id !== season.id))} className="text-slate-500 hover:text-red-600" aria-label="Remove season">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <FieldGrid className="gap-y-4">
                    <Field label="Season name"><Input value={season.seasonName} onChange={(e) => patchSeason(season.id, { seasonName: e.target.value })} placeholder="High season" /></Field>
                    <Field label="Price per person"><Input type="number" min="0" value={season.pricePerPerson} onChange={(e) => patchSeason(season.id, { pricePerPerson: e.target.value })} placeholder="650" /></Field>
                    <Field label="Start month">
                      <Select value={season.startMonth} onChange={(e) => patchSeason(season.id, { startMonth: e.target.value })}>
                        <option value="">Select month</option>
                        {months.map((month) => <option key={month} value={month}>{month}</option>)}
                      </Select>
                    </Field>
                    <Field label="End month">
                      <Select value={season.endMonth} onChange={(e) => patchSeason(season.id, { endMonth: e.target.value })}>
                        <option value="">Select month</option>
                        {months.map((month) => <option key={month} value={month}>{month}</option>)}
                      </Select>
                    </Field>
                    <Field label="Currency"><Select value={season.currency} onChange={(e) => patchSeason(season.id, { currency: e.target.value })}><option>USD</option><option>TZS</option><option>EUR</option></Select></Field>
                    <Field label="Notes"><Input value={season.notes} onChange={(e) => patchSeason(season.id, { notes: e.target.value })} placeholder="Migration window, holiday rate, or low season" /></Field>
                  </FieldGrid>
                </div>
              ))}
            </div>

            <div className="mt-7 border-t border-slate-100 pt-5">
              <h3 className="text-base font-black text-slate-950">Add-ons</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {addOnOptions.map((item) => (
                  <Chip key={item} label={item} active={profile.addOns.includes(item)} onClick={() => toggle("addOns", item)} />
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <Input value={customAddOn} onChange={(e) => setCustomAddOn(e.target.value)} placeholder="Add another add-on" />
                <button type="button" onClick={() => addCustom("addOns", customAddOn, setCustomAddOn)} className="mt-1 rounded-md border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">Add</button>
              </div>
            </div>
          </Section>

          <Section icon={<Camera className="h-5 w-5" />} title="Gallery" text="Upload photos by category so every image appears in the correct customer-facing area.">
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              {photoHelpText}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {photoCategories.map((cat) => {
                const urls = profile.classifiedPhotos[cat.key] ?? [];
                const activeIndex = urls.length > 0 ? Math.min(Math.max(photoSlideIndex[cat.key] ?? 0, 0), urls.length - 1) : 0;
                const activeUrl = urls[activeIndex] ?? "";
                return (
                  <div key={cat.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black text-slate-950">{cat.title}</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{cat.text}</p>
                      </div>
                      <button type="button" onClick={() => fileRefs.current[cat.key]?.click()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:text-emerald-700" aria-label={`Upload ${cat.title}`}>
                        {uploading === cat.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                      </button>
                    </div>
                    <input ref={(node) => { fileRefs.current[cat.key] = node; }} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple={cat.key !== "logo"} className="hidden" onChange={(e) => uploadPhotos(cat.key, e.target.files)} />
                    {urls.length > 0 ? (
                      <div className="mt-4">
                        <div className="relative overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                          <div
                            className="relative h-40 touch-pan-y sm:h-44"
                            onTouchStart={(e) => onPhotoTouchStart(cat.key, e.changedTouches[0]?.clientX ?? 0)}
                            onTouchEnd={(e) => onPhotoTouchEnd(cat.key, urls.length, e.changedTouches[0]?.clientX ?? 0)}
                          >
                            {cat.key === "logo" ? (
                              <div className="flex h-full w-full items-center justify-center p-4">
                                <div className="h-28 w-28 overflow-hidden rounded-full bg-white ring-1 ring-slate-200 sm:h-32 sm:w-32">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={activeUrl} alt={`${cat.title} ${activeIndex + 1}`} className="h-full w-full object-contain p-2" />
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={activeUrl} alt={`${cat.title} ${activeIndex + 1}`} className="h-full w-full object-cover" />
                              </>
                            )}
                          </div>
                          <span className="absolute left-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white">
                            {activeIndex + 1} / {urls.length}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setProfile((p) => {
                                const nextUrls = urls.filter((x) => x !== activeUrl);
                                return {
                                  ...p,
                                  companyLogoUrl: p.companyLogoUrl === activeUrl ? "" : p.companyLogoUrl,
                                  gallery: p.gallery.filter((x) => x !== activeUrl),
                                  classifiedPhotos: { ...p.classifiedPhotos, [cat.key]: nextUrls },
                                };
                              });
                              setPhotoSlideIndex((prev) => ({
                                ...prev,
                                [cat.key]: Math.max(0, Math.min(prev[cat.key] ?? activeIndex, urls.length - 2)),
                              }));
                            }}
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-700 shadow"
                            aria-label="Remove photo"
                          >
                            <X className="h-4 w-4" />
                          </button>

                          {urls.length > 1 ? (
                            <>
                              <button
                                type="button"
                                onClick={() => goToPhoto(cat.key, urls.length, -1)}
                                className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white"
                                aria-label="Previous photo"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => goToPhoto(cat.key, urls.length, 1)}
                                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white"
                                aria-label="Next photo"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </>
                          ) : null}
                        </div>

                        {urls.length > 1 ? (
                          <>
                            <div className="mt-2 text-center text-[11px] font-medium text-slate-500">
                              {urls.length} photo{urls.length === 1 ? "" : "s"} uploaded
                            </div>
                            <div className="mt-1 flex justify-center gap-1.5" aria-label={`${urls.length} uploaded photos`}>
                              {urls.map((_, idx) => (
                                <button
                                  key={`${cat.key}-dot-${idx}`}
                                  type="button"
                                  onClick={() => setPhotoSlideIndex((prev) => ({ ...prev, [cat.key]: idx }))}
                                  className={idx === activeIndex ? "h-1.5 w-4 rounded-full bg-emerald-600" : "h-1.5 w-4 rounded-full bg-slate-300"}
                                  aria-label={`Go to photo ${idx + 1}`}
                                />
                              ))}
                            </div>
                          </>
                        ) : null}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileRefs.current[cat.key]?.click()}
                        className="mt-4 flex h-28 w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-500 hover:border-emerald-300 hover:bg-emerald-50/40 hover:text-emerald-800"
                      >
                        <ImagePlus className="mb-2 h-5 w-5" />
                        Upload {cat.title.toLowerCase()}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        </div>

        <div className="sticky bottom-0 mt-6 border-t border-slate-200 bg-slate-50/90 py-4 backdrop-blur">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center text-sm font-semibold text-slate-500 sm:text-left">
              Save keeps a draft. Submit sends the profile card and packages to admin for review. Documents are reviewed separately in My Documents.
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={save} disabled={saving || submitting} className="inline-flex h-10 items-center justify-center gap-2 self-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-black text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:px-5 sm:text-sm sm:self-auto">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save draft
              </button>
              <button type="button" onClick={submitForReview} disabled={submitting || saving || !canSubmit} className="inline-flex h-10 items-center justify-center gap-2 self-center rounded-lg bg-emerald-700 px-4 text-xs font-black text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:px-5 sm:text-sm sm:self-auto">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Submit for review
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

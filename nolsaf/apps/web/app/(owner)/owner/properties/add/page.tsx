"use client";
import type { ReactNode } from "react";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { twMerge } from "tailwind-merge";
import { Plus, Home, Building, Building2, TreePine, Hotel, HelpCircle, Car, Shield, Bus, Bed, BedDouble, BedSingle, CheckCircle2, AlertCircle, MapPin, Users, X, ArrowRight, ImageIcon, Loader2, Hospital, Pill, Plane, Fuel, Route, Building as BuildingIcon, Lock, ExternalLink, Edit2, Clock, Bell } from "lucide-react";
import axios from "axios";
import { REGIONS, REGION_BY_ID } from "@/lib/tzRegions";
import { REGIONS_FULL_DATA } from "@/lib/tzRegionsFull";
import { TotalsStep } from "./_components/TotalsStep";
import { PhotosStep } from "./_components/PhotosStep";
import { RoomsStep } from "./_components/RoomsStep";
import { ServicesStep } from "./_components/ServicesStep";
import { ReviewStep } from "./_components/ReviewStep";
import { BasicsStep } from "./_components/BasicsStep";
import { ResumeDraftScreen } from "./_components/ResumeDraftScreen";
import "@/styles/add-property.css";

const api = axios.create({ baseURL: "", withCredentials: true });
function authify() {
  if (typeof window === "undefined") return;

  // Most of the app uses a Bearer token (often stored in localStorage).
  // The Cloudinary signature endpoint is protected by requireAuth, so we must attach it.
  const lsToken =
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("nolsaf_token") ||
    window.localStorage.getItem("__Host-nolsaf_token");

  if (lsToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${lsToken}`;
    return;
  }

  // Fallback: non-httpOnly cookie (if present)
  const m = String(document.cookie || "").match(/(?:^|;\s*)(?:nolsaf_token|__Host-nolsaf_token)=([^;]+)/);
  const cookieToken = m?.[1] ? decodeURIComponent(m[1]) : "";
  if (cookieToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${cookieToken}`;
  }
}

type BedKey = "twin" | "full" | "queen" | "king";
const PROPERTY_TYPES = ["Villa","Apartment","Hotel","Lodge","Condo","Guest House","Bungalow","Cabin","Homestay","Townhouse","House","Other"] as const;

// Icon mapping for property types
const PROPERTY_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Villa": Building2,
  "Apartment": Building,
  "Hotel": Hotel,
  "Lodge": TreePine,
  "Condo": Building2,
  "Guest House": Home,
  "Bungalow": Home,
  "Cabin": TreePine,
  "Homestay": Home,
  "Townhouse": Building2,
  "House": Home,
  "Other": HelpCircle,
};

// Border and color mapping for property types
const PROPERTY_TYPE_STYLES: Record<string, { border: string; leftBorder: string; text: string; bg: string; hoverBorder: string }> = {
  "Villa": { border: "border-blue-500", leftBorder: "border-l-blue-500", text: "text-blue-600", bg: "from-white to-blue-50", hoverBorder: "hover:border-blue-400" },
  "Apartment": { border: "border-purple-500", leftBorder: "border-l-purple-500", text: "text-purple-600", bg: "from-white to-purple-50", hoverBorder: "hover:border-purple-400" },
  "Hotel": { border: "border-amber-500", leftBorder: "border-l-amber-500", text: "text-amber-600", bg: "from-white to-amber-50", hoverBorder: "hover:border-amber-400" },
  "Lodge": { border: "border-green-500", leftBorder: "border-l-green-500", text: "text-green-600", bg: "from-white to-green-50", hoverBorder: "hover:border-green-400" },
  "Condo": { border: "border-indigo-500", leftBorder: "border-l-indigo-500", text: "text-indigo-600", bg: "from-white to-indigo-50", hoverBorder: "hover:border-indigo-400" },
  "Guest House": { border: "border-pink-500", leftBorder: "border-l-pink-500", text: "text-pink-600", bg: "from-white to-pink-50", hoverBorder: "hover:border-pink-400" },
  "Bungalow": { border: "border-orange-500", leftBorder: "border-l-orange-500", text: "text-orange-600", bg: "from-white to-orange-50", hoverBorder: "hover:border-orange-400" },
  "Cabin": { border: "border-emerald-500", leftBorder: "border-l-emerald-500", text: "text-emerald-600", bg: "from-white to-emerald-50", hoverBorder: "hover:border-emerald-400" },
  "Homestay": { border: "border-rose-500", leftBorder: "border-l-rose-500", text: "text-rose-600", bg: "from-white to-rose-50", hoverBorder: "hover:border-rose-400" },
  "Townhouse": { border: "border-cyan-500", leftBorder: "border-l-cyan-500", text: "text-cyan-600", bg: "from-white to-cyan-50", hoverBorder: "hover:border-cyan-400" },
  "House": { border: "border-teal-500", leftBorder: "border-l-teal-500", text: "text-teal-600", bg: "from-white to-teal-50", hoverBorder: "hover:border-teal-400" },
  "Other": { border: "border-gray-500", leftBorder: "border-l-gray-500", text: "text-gray-600", bg: "from-white to-gray-50", hoverBorder: "hover:border-gray-400" },
};
const HOTEL_STAR_OPTIONS = [
  { value: "", label: "Select rating" },
  { value: "basic", label: "Basic accommodations" },
  { value: "simple", label: "Simple and affordable" },
  { value: "moderate", label: "Moderate quality" },
  { value: "high", label: "High-end comfort" },
  { value: "luxury", label: "Luxury and exceptional service" },
];

const BED_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "twin": BedSingle,
  "full": BedDouble,
  "queen": Bed,
  "king": BedDouble,
};

/** Facilities config */
const FACILITY_TYPES = [
  "Hospital",
  "Pharmacy",
  "Polyclinic",
  "Clinic",
  "Police station",
  "Airport",
  "Bus station",
  "Petrol station",
  "Conference center",
  "Stadium",
  "Main road",
] as const;
const REACH_MODES = ["Walking","Boda","Public Transport","Car/Taxi"] as const;
type FacilityType = typeof FACILITY_TYPES[number];
type ReachMode = typeof REACH_MODES[number];

// Facility type to placeholder examples mapping
const FACILITY_PLACEHOLDERS: Record<FacilityType, string> = {
  "Hospital": "e.g. Aga Khan Hospital",
  "Pharmacy": "e.g. Medipharm Pharmacy",
  "Polyclinic": "e.g. City Polyclinic",
  "Clinic": "e.g. Community Health Clinic",
  "Police station": "e.g. Central Police Station",
  "Airport": "e.g. Julius Nyerere International Airport",
  "Bus station": "e.g. Ubungo Bus Terminal",
  "Petrol station": "e.g. Total Petrol Station",
  "Conference center": "e.g. Mlimani City Conference Center",
  "Stadium": "e.g. Benjamin Mkapa Stadium",
  "Main road": "e.g. Bagamoyo Road",
};

// Facility types that require ownership selection
const FACILITIES_WITH_OWNERSHIP: FacilityType[] = ["Hospital", "Pharmacy", "Polyclinic", "Clinic"];

// Helper function to check if facility type requires ownership
const requiresOwnership = (type: FacilityType): boolean => {
  return FACILITIES_WITH_OWNERSHIP.includes(type);
};

/* Utility functions - moved up for use in components */
function LabelSmall({children, className=""}:{children:ReactNode; className?:string}) {
  return <label className={`block text-xs text-gray-600 ${className}`}>{children}</label>;
}

function numOrEmpty(v: string|number){ if (v === "" || v == null) return ""; const n = Number(v); return Number.isFinite(n) ? n : ""; }
function numOrNull(v: any){ return v==="" || v==null ? null : Number(v); }
function splitComma(s:string){ return s.split(",").map(x=>x.trim()).filter(Boolean); }
function inferBasePrice(rooms: any[]){ 
  const prices = rooms.map(r => {
    // Try multiple possible field names for price
    const price = r.pricePerNight || r.price || 0;
    const numPrice = Number(price);
    return numPrice > 0 ? numPrice : 0;
  }).filter(n => n > 0); 
  const result = prices.length ? Math.min(...prices) : null;
  // Debug logging
  console.log('[inferBasePrice]', { 
    roomsCount: rooms.length, 
    rooms: rooms.map(r => ({ pricePerNight: r.pricePerNight, price: r.price })), 
    prices, 
    result 
  });
  return result;
}
function toServerType(t: string){
  const map: Record<string, string> = { "Guest House":"GUEST_HOUSE", "Townhouse":"TOWNHOUSE", "Other":"OTHER" };
  const up = t.toUpperCase().replace(/\s+/g,"_");
  return (map[t] ?? up);
}
function cryptoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

type NearbyFacility = {
  id: string;
  type: FacilityType;
  name: string;
  ownership: "Public/Government" | "Private" | "";
  distanceKm: number | "";
  reachableBy: ReachMode[];
  url?: string;
};

/** Facilities mini-components - FacilityRow defined after type */
// Small inline SVGs for walking and motorbike when lucide doesn't expose those icons in this package version
function WalkingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M13.5 5.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 13s1-1 3-1 3 2 4 3 1 3 1 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 20s1-4 4-5 4-1 4-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 12l2-3 3 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MotorbikeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M3 13h3l3-5h4l2 3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="6" cy="18" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 13l1-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Map reach modes to icons (use available lucide icons where possible).
const REACH_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Walking": WalkingIcon,
  "Boda": MotorbikeIcon,
  "Public Transport": Bus,
  "Car/Taxi": Car,
};

/** Facilities mini-components - FacilityRow */
function FacilityRow({
  facility, onChange, onRemove
}:{ facility: NearbyFacility; onChange:(f:NearbyFacility)=>void; onRemove:()=>void }) {
  const [isEditing, setIsEditing] = useState(false);
  
  // allow multiple selection: toggle presence in array
  const toggleMode = (m: ReachMode) => {
    const current = facility.reachableBy || [];
    const next = current.includes(m) ? current.filter(x => x !== m) : [...current, m];
    onChange({ ...facility, reachableBy: next });
  };

  // Get context-aware placeholder based on selected type
  const namePlaceholder = FACILITY_PLACEHOLDERS[facility.type] || "e.g. Facility name";
  
  // Get facility icon based on type (matching public view)
  const getFacilityIcon = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("hospital") || t.includes("clinic") || t.includes("pharmacy") || t.includes("polyclinic")) {
      return { Icon: Hospital, color: "text-rose-600", bgColor: "bg-rose-50" };
    }
    if (t.includes("petrol") || t.includes("fuel") || t.includes("gas")) {
      return { Icon: Fuel, color: "text-orange-600", bgColor: "bg-orange-50" };
    }
    if (t.includes("airport")) {
      return { Icon: Plane, color: "text-blue-600", bgColor: "bg-blue-50" };
    }
    if (t.includes("bus") || t.includes("station")) {
      return { Icon: Bus, color: "text-amber-700", bgColor: "bg-amber-50" };
    }
    if (t.includes("road") || t.includes("main road")) {
      return { Icon: Route, color: "text-slate-700", bgColor: "bg-slate-50" };
    }
    if (t.includes("police")) {
      return { Icon: Shield, color: "text-indigo-600", bgColor: "bg-indigo-50" };
    }
    if (t.includes("conference") || t.includes("center") || t.includes("centre")) {
      return { Icon: MapPin, color: "text-emerald-600", bgColor: "bg-emerald-50" };
    }
    return { Icon: MapPin, color: "text-[#02665e]", bgColor: "bg-[#02665e]/10" };
  };
  
  const facilityIcon = getFacilityIcon(facility.type || "");
  const Icon = facilityIcon.Icon;
  
  // Check if facility is complete (has type and name)
  const isComplete = facility.type && facility.name && facility.name.trim().length > 0;
  
  // Validation states
  const [touched, setTouched] = useState<{ name?: boolean; url?: boolean; distance?: boolean }>({});
  const nameError = touched.name && (!facility.name || facility.name.trim().length < 2) ? "Name must be at least 2 characters" : "";
  const urlError = touched.url && facility.url && !/^https?:\/\/.+/.test(facility.url) ? "Please enter a valid URL (starting with http:// or https://)" : "";
  const distanceError = touched.distance && typeof facility.distanceKm === 'number' && facility.distanceKm < 0 ? "Distance cannot be negative" : "";

  // Show compact card view when complete, or editing mode
  if (isComplete && !isEditing) {
    return (
      <div 
        className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:border-[#02665e]/30 hover:shadow-lg hover:shadow-[#02665e]/5 hover:-translate-y-0.5"
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${facilityIcon.bgColor} flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
            <Icon className={`h-6 w-6 ${facilityIcon.color} transition-transform duration-300 group-hover:scale-110`} />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Name */}
            {facility.name && (
              <div className="font-bold text-slate-900 text-base leading-snug tracking-tight">{facility.name}</div>
            )}
            
            {/* Tags Row */}
            <div className="flex flex-wrap items-center gap-2">
              {facility.type && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100/80 shadow-sm">
                  {facility.type}
                </span>
              )}
              {facility.ownership && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/80 shadow-sm">
                  {facility.ownership}
                </span>
              )}
            </div>
            
            {/* Distance & Link Row */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {typeof facility.distanceKm === 'number' && (
                <div className="inline-flex items-center gap-1.5 text-slate-700 font-semibold">
                  <MapPin className="h-4 w-4 text-rose-500 flex-shrink-0" />
                  <span>{facility.distanceKm} km</span>
                </div>
              )}
              {facility.url && (
                <a 
                  href={facility.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1.5 text-[#02665e] hover:text-[#014e47] font-semibold transition-all duration-200 hover:underline underline-offset-2"
                >
                  <ExternalLink className="h-4 w-4 flex-shrink-0" />
                  <span>Link</span>
                </a>
              )}
            </div>
            
            {/* Transportation */}
            {Array.isArray(facility.reachableBy) && facility.reachableBy.length > 0 && (
              <div className="pt-2.5 border-t border-slate-100/80">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">Reachable by:</span>
                  {facility.reachableBy.map((mode: string, mIdx: number) => {
                    const ModeIcon = REACH_ICONS[mode as string];
                    return (
                      <span 
                        key={mIdx} 
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200/60 shadow-sm transition-colors duration-200 group-hover:border-slate-300"
                      >
                        {ModeIcon && <ModeIcon className="h-3.5 w-3.5" />}
                        {mode}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="p-1.5 rounded-lg bg-white/80 hover:bg-white border border-slate-200 hover:border-emerald-300 text-slate-600 hover:text-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md"
            title="Edit facility"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-lg bg-white/80 hover:bg-red-50 border border-slate-200 hover:border-red-300 text-slate-600 hover:text-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
            title="Remove facility"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Subtle accent line on hover */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#02665e]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    );
  }

  // Editing mode - show all fields
  return (
    <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-sm">
      {/* Header with edit/close button */}
      {isComplete && (
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-700">Editing: {facility.name}</span>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
            title="Close editing"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="space-y-5">
        {/* Type selection - Only show when no type selected or editing */}
        {(!facility.type || isEditing) && (
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
            <LabelSmall className="font-semibold text-gray-900 text-sm mb-3 block">Facility Type</LabelSmall>
            
            {/* Medical Facilities */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Hospital className="w-4 h-4 text-rose-600" />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Medical</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {["Hospital", "Pharmacy", "Polyclinic", "Clinic"].map(t => {
                  const sel = facility.type === t;
                  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
                    "Hospital": Hospital,
                    "Pharmacy": Pill,
                    "Polyclinic": Hospital,
                    "Clinic": Hospital,
                  };
                  const TypeIcon = icons[t] || Building2;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        const updatedFacility: NearbyFacility = { 
                          ...facility, 
                          type: t as FacilityType,
                          ownership: requiresOwnership(t as FacilityType) ? facility.ownership : ""
                        };
                        onChange(updatedFacility);
                      }}
                      className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                        sel
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <TypeIcon className="w-3.5 h-3.5" />
                      <span>{t}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transportation */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Transportation</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {["Airport", "Bus station", "Petrol station", "Main road"].map(t => {
                  const sel = facility.type === t;
                  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
                    "Airport": Plane,
                    "Bus station": Bus,
                    "Petrol station": Fuel,
                    "Main road": Route,
                  };
                  const TypeIcon = icons[t] || MapPin;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        const updatedFacility: NearbyFacility = { 
                          ...facility, 
                          type: t as FacilityType,
                          ownership: requiresOwnership(t as FacilityType) ? facility.ownership : ""
                        };
                        onChange(updatedFacility);
                      }}
                      className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                        sel
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <TypeIcon className="w-3.5 h-3.5" />
                      <span>{t}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Public Services & Venues */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Public Services & Venues</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {["Police station", "Conference center", "Stadium"].map(t => {
                  const sel = facility.type === t;
                  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
                    "Police station": Shield,
                    "Conference center": BuildingIcon,
                    "Stadium": Building2,
                  };
                  const TypeIcon = icons[t] || MapPin;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        const updatedFacility: NearbyFacility = { 
                          ...facility, 
                          type: t as FacilityType,
                          ownership: requiresOwnership(t as FacilityType) ? facility.ownership : ""
                        };
                        onChange(updatedFacility);
                      }}
                      className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                        sel
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-500'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <TypeIcon className="w-3.5 h-3.5" />
                      <span>{t}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Ownership - Only show when required */}
        {requiresOwnership(facility.type) && (
          <div className="bg-blue-50/50 rounded-xl p-4 border-2 border-blue-200">
            <LabelSmall className="font-semibold text-gray-900 text-sm mb-3 block">Ownership Type</LabelSmall>
            <div className="grid grid-cols-2 gap-2.5 max-w-md">
              {["Public/Government", "Private"].map(o => {
                const sel = facility.ownership === o;
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => onChange({ ...facility, ownership: o as any })}
                    className={`text-xs font-semibold px-4 py-2.5 rounded-xl border-2 transition-all text-center ${
                      sel
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Name, Distance, URL */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <LabelSmall className="font-semibold text-gray-900 text-xs">Name <span className="text-red-500">*</span></LabelSmall>
            <input
              title="Facility name"
              placeholder={namePlaceholder}
              value={facility.name}
              onChange={e => {
                onChange({ ...facility, name: e.target.value });
                setTouched(prev => ({ ...prev, name: true }));
              }}
              onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
              className={`w-full h-11 px-4 border-2 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                nameError 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                  : 'border-gray-300 focus:ring-emerald-500/20 focus:border-emerald-500'
              }`}
            />
            {nameError && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                {nameError}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <LabelSmall className="font-semibold text-gray-900 text-xs">Distance (km)</LabelSmall>
            <input
              title="Distance (km)"
              placeholder="2.5"
              value={facility.distanceKm as any}
              onChange={e => {
                onChange({ ...facility, distanceKm: numOrEmpty(e.target.value) });
                setTouched(prev => ({ ...prev, distance: true }));
              }}
              onBlur={() => setTouched(prev => ({ ...prev, distance: true }))}
              type="number" 
              step="0.1"
              min="0"
              className={`w-full h-11 px-4 border-2 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                distanceError 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                  : 'border-gray-300 focus:ring-emerald-500/20 focus:border-emerald-500'
              }`}
            />
            {distanceError && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                {distanceError}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <LabelSmall className="font-semibold text-gray-900 text-xs">More info (URL)</LabelSmall>
            <input
              title="More info (URL)"
              placeholder="https://example.com"
              value={facility.url ?? ""}
              onChange={e => {
                onChange({ ...facility, url: e.target.value });
                setTouched(prev => ({ ...prev, url: true }));
              }}
              onBlur={() => setTouched(prev => ({ ...prev, url: true }))}
              type="url"
              className={`w-full h-11 px-4 border-2 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                urlError 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                  : 'border-gray-300 focus:ring-emerald-500/20 focus:border-emerald-500'
              }`}
            />
            {urlError && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                {urlError}
              </p>
            )}
            {!urlError && facility.url && (
              <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                <CheckCircle2 className="h-3 w-3" />
                Valid URL format
              </p>
            )}
          </div>
        </div>

        {/* Reachable by */}
        <div className="pt-4 border-t border-gray-200">
          <LabelSmall className="font-semibold text-gray-900 text-sm mb-3 block">Reachable by</LabelSmall>
          <div className="grid grid-cols-2 gap-2.5"> 
            {REACH_MODES.map(m => {
              const sel = facility.reachableBy.includes(m as ReachMode);
              const ModeIcon = REACH_ICONS[m as string];
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMode(m as ReachMode)}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                    sel 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-500' 
                      : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  {ModeIcon && <ModeIcon className="h-4 w-4" />}
                  <span>{m}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
          {isComplete && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
            >
              Done
            </button>
          )}
          <button 
            type="button" 
            onClick={onRemove} 
            className="px-4 py-2 rounded-xl border-2 border-red-200 text-red-700 font-semibold hover:bg-red-50 hover:border-red-300 transition-all"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_WRAPPER_CLASS = "add-property-view" as const;
const PAGE_BACKGROUND_CLASS = "add-property-background" as const;
const PAGE_LAYOUT_CLASS = "add-property-layout" as const;
const PAGE_SHELL_CLASS = "add-property-shell" as const;
const STEPPER_WRAPPER_CLASS = "add-property-stepper" as const;
const SNAPSHOT_CARD_CLASS = "add-property-snapshot" as const;
const SNAPSHOT_CARD_DESKTOP = "add-property-snapshot-hover" as const;
const SNAPSHOT_STAT_CLASS = "add-property-snapshot-stat" as const;
const SNAPSHOT_BADGE_CLASS = "inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700" as const;
const SNAPSHOT_HIGHLIGHT_CLASS = "inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-600" as const;
const SNAPSHOT_ALERT_CLASS = "flex items-center gap-2 text-sm text-amber-600" as const;
const SNAPSHOT_PROGRESS_WRAPPER = "add-property-photo-progress" as const;
const SIDEBAR_CARD_CLASS = "add-property-sidebar-card" as const;
type RoomEntry = {
  roomType: string;
  beds: Record<BedKey, number>;
  roomsCount: number;
  /** Optional floor/location metadata used by visualization */
  floors?: number[];
  /** For multi-storey buildings: rooms count per floor (key = floor index; 0 = Ground) */
  floorDistribution?: Record<number, number>;
  smoking: "yes" | "no";
  bathPrivate: "yes" | "no";
  bathItems: string[];
  towelColor: string;
  otherAmenities: string[];
  roomDescription: string;
  roomImages: string[];
  pricePerNight: number;
};
type ServicesState = {
  parking: "no"|"free"|"paid";
  parkingPrice: number | "";
  breakfastIncluded: boolean;
  breakfastAvailable: boolean;
  restaurant: boolean;
  bar: boolean;
  pool: boolean;
  sauna: boolean;
  laundry: boolean;
  roomService: boolean;
  security24: boolean;
  firstAid: boolean;
  fireExtinguisher: boolean;
  onSiteShop: boolean;
  nearbyMall: boolean;
  socialHall: boolean;
  sportsGames: boolean;
  gym: boolean;
  distanceHospital: number | "";
  nearPetrolStation?: boolean;
  petrolStationName?: string;
  petrolStationDistance?: number | "";
  nearBusStation?: boolean;
  busStationName?: string;
  busStationDistance?: number | "";
};

// Helper function to normalize names for matching (handles special chars, case, whitespace)
function normalizeName(name: string): string {
  return name.toLowerCase()
    .replace(/[''""]/g, "'") // Normalize different quote types
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

// Helper function to create region slug from name
function createRegionSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Property Location Map Component - Uses exact coordinates and postcode
function PropertyLocationMap({ 
  latitude, 
  longitude, 
  postcode,
  onLocationDetected
}: { 
  latitude: number; 
  longitude: number; 
  postcode?: string | null;
  onLocationDetected?: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const markerRef = useRef<any | null>(null);
  const popupRef = useRef<any | null>(null);
  const centerMarkerRef = useRef<HTMLDivElement | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const hasAutoDetectedRef = useRef(false);

  // Function to detect user's current location
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        
        console.log('📍 Location detected:', { latitude: lat, longitude: lng, accuracy: position.coords.accuracy });
        
        // Update parent component if callback provided
        if (onLocationDetected) {
          onLocationDetected(lat, lng);
        }
        
        // Center map on detected location
        // The center pin marker will automatically show the location
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 17,
            duration: 1500,
            essential: true
          });
        }
        
        setIsDetectingLocation(false);
      },
      (error) => {
        setIsDetectingLocation(false);
        let errorMsg = 'Failed to get your location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location access denied. Please enable location permissions.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information unavailable.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out.';
        }
        setLocationError(errorMsg);
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [onLocationDetected]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const containerEl = containerRef.current;
    if (!containerEl) return;
    let cancelled = false;

    // Check if coordinates are default/unset - if so, try auto-detection once
    const hasDefaultCoords = (!Number.isFinite(latitude) || !Number.isFinite(longitude)) ||
                             (latitude === 0 && longitude === 0) ||
                             (Math.abs(latitude) < 0.001 && Math.abs(longitude) < 0.001);

    // Auto-detect location on first load if coordinates are not set
    if (hasDefaultCoords && !hasAutoDetectedRef.current && navigator.geolocation) {
      hasAutoDetectedRef.current = true;
      // Small delay to ensure map container is ready
      setTimeout(() => {
        detectLocation();
      }, 500);
      return; // Don't initialize map yet, wait for location
    }

    // Validate coordinates are valid numbers
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      console.warn('Invalid coordinates:', { latitude, longitude });
      return;
    }

    // Ensure coordinates are within valid ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      console.warn('Coordinates out of range:', { latitude, longitude });
      return;
    }

    const token =
      (process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string) ||
      (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string) ||
      (window as any).__MAPBOX_TOKEN ||
      '';

    if (!token) {
      console.warn('Mapbox token not found');
      return;
    }

    let map: any = null;
    (async () => {
      try {
        const mod = await import('mapbox-gl');
        if (cancelled) return;
        const mapboxgl = (mod as any).default ?? mod;
        mapboxgl.accessToken = token;

        // Clean up existing map if any
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }

        // Use EXACT coordinates - no rounding
        // IMPORTANT: Mapbox uses [longitude, latitude] format
        const exactLng = Number(longitude);
        const exactLat = Number(latitude);

        // Log coordinates for debugging
        console.log('Map initialization with coordinates:', {
          latitude: exactLat,
          longitude: exactLng,
          postcode: postcode || 'not provided',
          format: '[longitude, latitude]'
        });

        // If the component unmounted or container got detached, don't initialize.
        if (!containerEl.isConnected) return;

        map = new mapboxgl.Map({
          container: containerEl,
          style: 'mapbox://styles/mapbox/light-v10',
          center: [exactLng, exactLat], // [longitude, latitude] - Mapbox format
          zoom: 17, // Higher zoom for very precise location
          interactive: true,
        });

        mapRef.current = map;

        // Wait for map to load before adding controls and marker
        map.on('load', () => {
          // Add navigation controls
          map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

          // Add "Locate Me" button control
          const locateButton = document.createElement('button');
          locateButton.className = 'mapboxgl-ctrl-icon mapboxgl-ctrl-locate';
          locateButton.type = 'button';
          locateButton.setAttribute('aria-label', 'Locate me');
          locateButton.setAttribute('title', 'Locate me');
          locateButton.style.cssText = `
            width: 30px;
            height: 30px;
            background-color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 0 2px rgba(0,0,0,0.1);
            transition: all 0.2s;
          `;
          
          // Add locate icon (using SVG)
          const locateIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          locateIcon.setAttribute('width', '18');
          locateIcon.setAttribute('height', '18');
          locateIcon.setAttribute('viewBox', '0 0 24 24');
          locateIcon.setAttribute('fill', 'none');
          locateIcon.setAttribute('stroke', isDetectingLocation ? '#10b981' : '#02665e');
          locateIcon.setAttribute('stroke-width', '2');
          locateIcon.setAttribute('stroke-linecap', 'round');
          locateIcon.setAttribute('stroke-linejoin', 'round');
          
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', '12');
          circle.setAttribute('cy', '12');
          circle.setAttribute('r', '10');
          
          const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          dot.setAttribute('cx', '12');
          dot.setAttribute('cy', '12');
          dot.setAttribute('r', '3');
          
          locateIcon.appendChild(circle);
          locateIcon.appendChild(dot);
          locateButton.appendChild(locateIcon);
          
          locateButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            detectLocation();
          });
          
          locateButton.addEventListener('mouseenter', () => {
            locateButton.style.backgroundColor = '#f0f9ff';
            locateButton.style.boxShadow = '0 0 0 2px rgba(2,102,94,0.2)';
          });
          
          locateButton.addEventListener('mouseleave', () => {
            locateButton.style.backgroundColor = '#fff';
            locateButton.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.1)';
          });
          
          // Create control container
          const locateControl = document.createElement('div');
          locateControl.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
          locateControl.appendChild(locateButton);
          locateControl.style.cssText = 'margin: 10px;';
          
          // Add to map (top-right, below navigation controls)
          const topRight = map.getContainer().querySelector('.mapboxgl-ctrl-top-right');
          if (topRight) {
            topRight.appendChild(locateControl);
          }

          // Add center pin marker (fixed at center of map viewport)
          const centerMarkerContainer = document.createElement('div');
          centerMarkerContainer.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -100%);
            z-index: 1000;
            pointer-events: none;
            width: 40px;
            height: 50px;
            display: flex;
            align-items: flex-end;
            justify-content: center;
          `;
          
          const centerPin = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          centerPin.setAttribute('width', '40');
          centerPin.setAttribute('height', '50');
          centerPin.setAttribute('viewBox', '0 0 24 24');
          centerPin.setAttribute('fill', 'none');
          centerPin.style.display = 'block';
          
          // Create pin shape (teardrop/pin icon like MapPin from Lucide)
          // The pin point is at y=22 (bottom of viewBox), so we position it at the bottom
          const pinPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          pinPath.setAttribute('d', 'M20 10c0 4.418-8 12-8 12s-8-7.582-8-12a8 8 0 1 1 16 0z');
          pinPath.setAttribute('fill', '#3b82f6'); // Blue color like the image
          pinPath.setAttribute('stroke', '#fff');
          pinPath.setAttribute('stroke-width', '1.5');
          
          // White circle in center of pin
          const whiteCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          whiteCircle.setAttribute('cx', '12');
          whiteCircle.setAttribute('cy', '10');
          whiteCircle.setAttribute('r', '4');
          whiteCircle.setAttribute('fill', '#fff');
          
          centerPin.appendChild(pinPath);
          centerPin.appendChild(whiteCircle);
          centerMarkerContainer.appendChild(centerPin);
          
          // Add to map container
          const mapContainer = map.getContainer();
          mapContainer.style.position = 'relative';
          mapContainer.appendChild(centerMarkerContainer);
          centerMarkerRef.current = centerMarkerContainer;
          
          // Update coordinates when map center changes
          const updateCenterCoordinates = () => {
            if (!map) return;
            const center = map.getCenter();
            const centerLat = center.lat;
            const centerLng = center.lng;

            // Update parent component with center coordinates
            if (onLocationDetected) {
              onLocationDetected(centerLat, centerLng);
            }
          };
          
          // Listen to map move events to update coordinates
          map.on('moveend', updateCenterCoordinates);
          map.on('dragend', updateCenterCoordinates);

          // If postcode is provided, try to geocode it and verify/adjust location
          if (postcode) {
            // First, try to geocode the postcode to get coordinates
            fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(postcode)}.json?access_token=${token}&country=TZ&types=postcode`)
              .then(res => res.json())
              .then(data => {
                if (data.features && data.features.length > 0) {
                  const postcodeCoords = data.features[0].center; // [lng, lat]
                  const distance = Math.sqrt(
                    Math.pow(postcodeCoords[0] - exactLng, 2) + 
                    Math.pow(postcodeCoords[1] - exactLat, 2)
                  ) * 111; // Approximate km
                  
                  // If coordinates are far from postcode center, log warning
                  if (distance > 5) {
                    console.warn('Location may be inaccurate: coordinates are far from postcode center');
                  }
                }
              })
              .catch(() => {});

            // Also do reverse geocoding to verify address
            fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${exactLng},${exactLat}.json?access_token=${token}&types=postcode,address`)
              .then(res => res.json())
              .then(data => {
                if (data.features && data.features.length > 0) {
                  // const feature = data.features[0];
                  // const context = feature.context || [];
                  // const postcodeFromApi = context.find((c: any) => c.id?.startsWith('postcode'))?.text;
                  
                  // Postcode mismatch detected but not logged to avoid console noise
                }
              })
              .catch(() => {});
          }
        });

        // Add mapbox CSS if not already added
        if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
          const link = document.createElement('link');
          link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
          link.rel = 'stylesheet';
          document.head.appendChild(link);
        }
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    })();

    return () => {
      cancelled = true;
      if (centerMarkerRef.current) {
        try {
          centerMarkerRef.current.remove();
        } catch (e) {
          // ignore
        }
        centerMarkerRef.current = null;
      }
      if (popupRef.current) {
        try {
          popupRef.current.remove();
        } catch (e) {
          // ignore
        }
        popupRef.current = null;
      }
      if (markerRef.current) {
        try {
          markerRef.current.remove();
        } catch (e) {
          // ignore
        }
        markerRef.current = null;
      }
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          // ignore
        }
        mapRef.current = null;
      }
    };
  // detectLocation is memoized; keeping deps accurate avoids stale closures.
  }, [latitude, longitude, postcode, detectLocation, onLocationDetected, isDetectingLocation]);

  return (
    <div className="w-full">
      <div className="relative">
      <div 
        ref={containerRef} 
        className="w-full h-64 sm:h-80 min-h-64 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm bg-gray-50"
      />
        {/* Loading overlay when detecting location */}
        {isDetectingLocation && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-[#02665e] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-[#02665e]">Detecting your location...</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Location info and error messages */}
      <div className="mt-2 space-y-1">
        <div className="text-xs text-gray-600 flex items-center gap-2">
        <MapPin className="w-3.5 h-3.5 text-[#02665e]" />
          <span>
            {Number.isFinite(latitude) && Number.isFinite(longitude) 
              ? `Location: ${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`
              : 'No location set. Click "Locate Me" button on map to detect your location.'}
          </span>
        {postcode && <span className="text-[#02665e] font-medium">• Postcode: {postcode}</span>}
        </div>
        
        {locationError && (
          <div className="text-xs text-rose-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{locationError}</span>
          </div>
        )}
        
        {!isDetectingLocation && Number.isFinite(latitude) && Number.isFinite(longitude) && (
          <div className="text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Location detected successfully</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AddProperty() {
  useEffect(()=>{ authify(); },[]);

  const [propertyId, setPropertyId] = useState<number|null>(null);
  const [loadingProperty, setLoadingProperty] = useState(false);
  
  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const DRAFT_STORAGE_KEY = 'property_draft';
  const [showResumeDraft, setShowResumeDraft] = useState(false);
  const [localDraft, setLocalDraft] = useState<any | null>(null);
  const [serverDrafts, setServerDrafts] = useState<Array<{ id: number; title?: string; updatedAt?: string }>>([]);
  const [showSubmissionSuccess, setShowSubmissionSuccess] = useState(false);

  // Load existing property if ID is provided in query params
  useEffect(() => {
    const loadProperty = async () => {
      if (typeof window === 'undefined') return;
      
      const urlParams = new URLSearchParams(window.location.search);
      const idParam = urlParams.get('id');
      
      if (idParam && !propertyId) {
        const id = parseInt(idParam, 10);
        if (!isNaN(id)) {
          setLoadingProperty(true);
          try {
            const response = await api.get(`/api/owner/properties/${id}`);
            const property = response.data;
            
            if (property) {
              setPropertyId(property.id);
              
              // Load basic info
              if (property.title) setTitle(property.title);
              if (property.type) setType(property.type);
              if (property.hotelStar) setHotelStar(property.hotelStar);
              if (property.buildingType) setBuildingType(property.buildingType);
              if (typeof property.totalFloors === "number") setTotalFloors(property.totalFloors);
              if (property.regionId) setRegionId(property.regionId);
              if (property.district) setDistrict(property.district);
              if (property.ward) setWard(property.ward);
              if (property.street) setStreet(property.street);
              if (property.zip) setZip(property.zip);
              if (property.latitude) setLatitude(property.latitude.toString());
              if (property.longitude) setLongitude(property.longitude.toString());
              if (property.description) setDesc(property.description);
              if (property.totalBedrooms) setTotalBedrooms(property.totalBedrooms);
              if (property.totalBathrooms) setTotalBathrooms(property.totalBathrooms);
              if (property.maxGuests) setMaxGuests(property.maxGuests);

              // Load house rules (for public display: check-in/out, pets, smoking, etc.)
              if (property.houseRules) {
                try {
                  const hr =
                    typeof property.houseRules === "string"
                      ? JSON.parse(property.houseRules)
                      : property.houseRules;
                  if (hr && typeof hr === "object" && !Array.isArray(hr)) {
                    const hrObj = typeof hr === "object" && hr !== null ? hr : {};
                    setHouseRules((prev) => {
                      const prevObj = typeof prev === "object" && prev !== null ? prev : {
                        checkInFrom: "",
                        checkInTo: "",
                        checkOutFrom: "",
                        checkOutTo: "",
                        petsAllowed: null,
                        petsNote: "",
                        smokingNotAllowed: null,
                        other: "",
                      };
                      return {
                        ...prevObj,
                      // If backend stores a single string like "14:00 – 22:00", keep it in the "from" field.
                        checkInFrom: String((hrObj as any).checkIn || prevObj.checkInFrom || ""),
                        checkOutFrom: String((hrObj as any).checkOut || prevObj.checkOutFrom || ""),
                      petsAllowed:
                          typeof (hrObj as any).pets === "boolean" ? (hrObj as any).pets : prevObj.petsAllowed,
                        petsNote: String((hrObj as any).petsNote || prevObj.petsNote || ""),
                      // In public UI, houseRules.smoking is treated as "Smoking Not Allowed" when true.
                      smokingNotAllowed:
                          typeof (hrObj as any).smoking === "boolean"
                            ? (hrObj as any).smoking
                            : prevObj.smokingNotAllowed,
                        other: String((hrObj as any).other || prevObj.other || ""),
                      };
                    });
                  }
                } catch (e) {
                  console.error("Error parsing houseRules:", e);
                }
              }
              
              // Load photos
              if (property.images && Array.isArray(property.images)) {
                const imageUrls = property.images.map((img: any) => img.url || img).filter(Boolean);
                setPhotos(imageUrls);
              }
              
              // Load rooms
              if (property.roomsSpec) {
                try {
                  const rooms = typeof property.roomsSpec === 'string' 
                    ? JSON.parse(property.roomsSpec) 
                    : property.roomsSpec;
                  if (Array.isArray(rooms)) {
                    setDefinedRooms(rooms);
                  }
                } catch (e) {
                  console.error("Error parsing roomsSpec:", e);
                }
              }
              
              // Load services
              if (property.services) {
                try {
                  const services = typeof property.services === 'string' 
                    ? JSON.parse(property.services) 
                    : property.services;
                  if (services) {
                    setServices({
                      parking: services.parking || "no",
                      parkingPrice: services.parkingPrice || "",
                      breakfastIncluded: services.breakfastIncluded || false,
                      breakfastAvailable: services.breakfastAvailable || false,
                      restaurant: services.restaurant || false,
                      bar: services.bar || false,
                      pool: services.pool || false,
                      sauna: services.sauna || false,
                      laundry: services.laundry || false,
                      roomService: services.roomService || false,
                      security24: services.security24 || false,
                      firstAid: services.firstAid || false,
                      fireExtinguisher: services.fireExtinguisher || false,
                      onSiteShop: services.onSiteShop || false,
                      nearbyMall: services.nearbyMall || false,
                      socialHall: services.socialHall || false,
                      sportsGames: services.sportsGames || false,
                      gym: services.gym || false,
                      distanceHospital: services.distanceHospital || "",
                    });
                  }
                } catch (e) {
                  console.error("Error parsing services:", e);
                }
              }
              
              // Load nearby facilities
              if (property.services) {
                try {
                  const services = typeof property.services === 'string' 
                    ? JSON.parse(property.services) 
                    : property.services;
                  if (services && services.nearbyFacilities && Array.isArray(services.nearbyFacilities)) {
                    setNearbyFacilities(services.nearbyFacilities);
                  }
                } catch (e) {
                  console.error("Error parsing nearbyFacilities:", e);
                }
              }
            }
          } catch (error) {
            console.error("Error loading property:", error);
            alert("Failed to load property. You can still create a new one.");
          } finally {
            setLoadingProperty(false);
          }
        }
      }
    };
    
    loadProperty();
  }, [propertyId]);

  // collapses — only the active step is expanded to keep focus.
  // By default show only the first step; others are hidden until navigated.
  const [showBasics, setShowBasics] = useState(true);
  const [showRooms, setShowRooms] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showTotals, setShowTotals] = useState(false);

  // basics / location
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("");
  const [otherType, setOtherType] = useState<string>("");
  const isHotel = type === "Hotel";
  // default empty so placeholder "Select rating" is shown until user selects
  const [hotelStar, setHotelStar] = useState("");

  // ✅ Region/district now sourced from helper
  const [regionId, setRegionId] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [ward, setWard] = useState<string>("");
  const regionName = useMemo(() => REGION_BY_ID[regionId]?.name ?? "", [regionId]);
  
  // Get districts from REGIONS_FULL_DATA to ensure all regions work consistently
  const districts = useMemo(() => {
    if (!regionId) return [];
    
    // Find the region in full data
    const regionData = REGIONS_FULL_DATA.find((r: any) => {
      const regionSlug = createRegionSlug(r.name);
      return regionSlug === regionId;
    });
    
    if (!regionData || !regionData.districts) {
      return [];
    }
    
    // Return district names
    return regionData.districts.map((d: any) => d.name);
  }, [regionId]);
  
  const wards = useMemo(() => {
    // Get wards from REGIONS_FULL_DATA using actual Tanzania locations database
    if (!regionId || !district) return [];
    
    // Find the region in full data
    const regionData = REGIONS_FULL_DATA.find((r: any) => {
      const regionSlug = createRegionSlug(r.name);
      return regionSlug === regionId;
    });
    
    if (!regionData) {
      return [];
    }
    
    // Find the district using normalized matching
    const districtData = regionData.districts?.find((d: any) => 
      normalizeName(d.name) === normalizeName(district)
    );
    
    if (!districtData || !districtData.wards) {
      return [];
    }
    
    // Return ward names
    return districtData.wards.map((w: any) => w.name);
  }, [regionId, district]);

  // Get ward postcode when ward is selected
  const selectedWardPostcode = useMemo(() => {
    if (!regionId || !district || !ward) return null;
    
    // Try to find region - check both slug matching and direct name matching
    let regionData = REGIONS_FULL_DATA.find((r: any) => {
      const regionSlug = createRegionSlug(r.name);
      return regionSlug === regionId;
    });
    
    // Fallback: try direct name match (case-insensitive)
    if (!regionData) {
      regionData = REGIONS_FULL_DATA.find((r: any) => 
        normalizeName(r.name) === normalizeName(regionId) || 
        r.name.toUpperCase() === regionId.toUpperCase()
      );
    }
    
    if (!regionData) {
      return null;
    }
    
    const districtData = regionData.districts?.find((d: any) => 
      normalizeName(d.name) === normalizeName(district)
    );
    
    if (!districtData || !districtData.wards) {
      return null;
    }
    
    const wardData = districtData.wards.find((w: any) => 
      normalizeName(w.name) === normalizeName(ward)
    );
    
    if (!wardData) {
      return null;
    }
    
    // Get postcode - prefer postcode field, fallback to code; normalize to string|null
    const rawPostcode = wardData.postcode ?? wardData.code ?? null;
    const postcodeStr = rawPostcode && String(rawPostcode).trim() !== "" ? String(rawPostcode).trim() : null;
    return postcodeStr;
  }, [regionId, district, ward]);

  // Get streets for the selected ward
  const streets = useMemo(() => {
    if (!regionId || !district || !ward) return [];
    
    const regionData = REGIONS_FULL_DATA.find((r: any) => {
      const regionSlug = createRegionSlug(r.name);
      return regionSlug === regionId;
    });
    
    if (!regionData) return [];
    
    const districtData = regionData.districts?.find((d: any) => 
      normalizeName(d.name) === normalizeName(district)
    );
    
    if (!districtData || !districtData.wards) return [];
    
    const wardData = districtData.wards.find((w: any) => 
      normalizeName(w.name) === normalizeName(ward)
    );
    
    return wardData?.streets || [];
  }, [regionId, district, ward]);

  const [street, setStreet] = useState("");
  const [apartment] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  // Building layout (used for visualization + room placement)
  const [buildingType, setBuildingType] = useState<string>("");
  const [totalFloors, setTotalFloors] = useState<number | "">("");
  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationTrackingEnabled, setLocationTrackingEnabled] = useState(false);
  const [freeCancellation, setFreeCancellation] = useState<boolean>(false);
  const [paymentModes, setPaymentModes] = useState<string[]>([]);

  // Auto-fill zip code when ward is selected (if postcode is available)
  // Always update zip when ward changes to ensure it's synced with the selected ward
  useEffect(() => {
    if (selectedWardPostcode) {
      setZip(selectedWardPostcode);
    } else if (ward && !selectedWardPostcode) {
      // Clear zip if ward is selected but has no postcode
      setZip("");
    } else if (!ward) {
      // Clear zip when ward is cleared
      setZip("");
    }
  }, [selectedWardPostcode, ward]);

  // Auto-detect if location is already available
  useEffect(() => {
    if (latitude && longitude) {
      setLocationTrackingEnabled(true);
    }
  }, [latitude, longitude]);

  // Handle location tracking toggle
  const handleLocationToggle = (enabled: boolean) => {
    setLocationTrackingEnabled(enabled);
    
    if (enabled) {
      // Request location when toggled on
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        setLocationTrackingEnabled(false);
        return;
      }
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Ensure correct coordinate order: latitude, longitude
          const lat = parseFloat(position.coords.latitude.toFixed(6));
          const lng = parseFloat(position.coords.longitude.toFixed(6));
          
          setLatitude(lat);
          setLongitude(lng);
          setLocationLoading(false);
        },
        (error) => {
          setLocationLoading(false);
          setLocationTrackingEnabled(false);
          if (error.code === error.PERMISSION_DENIED) {
            alert("Location access denied. Please enable location permissions in your browser settings.");
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            alert("Location information unavailable. Please try again or enter coordinates manually.");
          } else {
            alert("An error occurred while getting your location. Please try again or enter coordinates manually.");
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      // Clear coordinates when toggled off
      setLatitude("");
      setLongitude("");
    }
  };

  // overall counts + description
  const [totalBedrooms, setTotalBedrooms] = useState<number | "">("");
  const [totalBathrooms, setTotalBathrooms] = useState<number | "">("");
  const [maxGuests, setMaxGuests] = useState<number | "">("");
  const [desc, setDesc] = useState("");
  const [acceptGroupBooking, setAcceptGroupBooking] = useState<boolean>(false);
  const [houseRules, setHouseRules] = useState<string | {
    checkInFrom: string;
    checkInTo: string;
    checkOutFrom: string;
    checkOutTo: string;
    petsAllowed: boolean | null;
    petsNote: string;
    smokingNotAllowed: boolean | null; // aligns with public property UI (true => Not Allowed)
    other: string;
  }>({
    checkInFrom: "",
    checkInTo: "",
    checkOutFrom: "",
    checkOutTo: "",
    petsAllowed: null,
    petsNote: "",
    smokingNotAllowed: null,
    other: "",
  });

  // property photos (controlled here)
  const [photos, setPhotos] = useState<string[]>([]);
  const [photosSaved, setPhotosSaved] = useState<boolean[]>([]);
  const [photosUploading, setPhotosUploading] = useState<boolean[]>([]);
  const photosRef = useRef<string[]>([]);
  useEffect(()=>{ photosRef.current = photos; }, [photos]);
  
  // Refs for progress bars to avoid inline styles
  const photosProgressBarRef = useRef<HTMLDivElement>(null);
  const stepProgressBarRef = useRef<HTMLDivElement>(null);

  // room-type mini form
  const [roomType, setRoomType] = useState("Single");
  const [beds, setBeds] = useState<Record<BedKey, number>>({ twin: 0, full: 0, queen: 0, king: 0 });
  const [roomsCount, setRoomsCount] = useState<number | "">("");
  // Room placement (only used when buildingType === "multi_storey")
  const [roomFloors, setRoomFloors] = useState<number[]>([]);
  const [roomFloorDistribution, setRoomFloorDistribution] = useState<Record<number, number>>({});
  const [smoking, setSmoking] = useState<"yes"|"no">("yes");
  const [bathPrivate, setBathPrivate] = useState<"yes"|"no">("yes");
  const [bathItems, setBathItems] = useState<string[]>([]);
  const [towelColor, setTowelColor] = useState("");
  const [otherAmenities, setOtherAmenities] = useState<string[]>([]);
  const [otherAmenitiesText, setOtherAmenitiesText] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomImages, setRoomImages] = useState<string[]>([]);
  const [roomImageSaved, setRoomImageSaved] = useState<boolean[]>([]);
  const [roomImageUploading, setRoomImageUploading] = useState<boolean[]>([]);
  const roomImagesRef = useRef<string[]>([]);
  useEffect(()=>{ roomImagesRef.current = roomImages; }, [roomImages]);
  // const roomImageInput = useRef<HTMLInputElement>(null);
  const [pricePerNight, setPricePerNight] = useState<number | "">("");
  const [definedRooms, setDefinedRooms] = useState<RoomEntry[]>([]);

  // Totals: auto-fill bedrooms from the saved room types (roomsCount per type).
  const autoTotalBedrooms = useMemo(() => {
    return (definedRooms || []).reduce((sum, r: any) => {
      const n = Number(r?.roomsCount);
      return sum + (Number.isFinite(n) ? Math.max(0, n) : 0);
    }, 0);
  }, [definedRooms]);

  useEffect(() => {
    setTotalBedrooms((prev) => (prev === autoTotalBedrooms ? prev : autoTotalBedrooms));
  }, [autoTotalBedrooms]);

  // Auto-calculate maxGuests from total beds across all room types
  const autoMaxGuests = useMemo(() => {
    const totalBeds = (definedRooms || []).reduce((sum, r: any) => {
      const roomsCount = Number(r?.roomsCount) || 0;
      const beds = r?.beds || {};
      const bedsPerRoom = (Number(beds?.twin) || 0) + (Number(beds?.full) || 0) + (Number(beds?.queen) || 0) + (Number(beds?.king) || 0);
      return sum + (bedsPerRoom * roomsCount);
    }, 0);
    // Ensure at least 1 guest (backend requirement: > 0)
    return Math.max(1, totalBeds);
  }, [definedRooms]);

  useEffect(() => {
    // Only auto-fill if user hasn't manually set a value (empty or 0)
    if (maxGuests === "" || maxGuests === 0) {
      setMaxGuests(autoMaxGuests);
    }
  }, [autoMaxGuests, maxGuests]);

  // Reset room placement state when building layout changes away from multi-storey
  useEffect(() => {
    if (buildingType !== "multi_storey") {
      setRoomFloors([]);
      setRoomFloorDistribution({});
    }
  }, [buildingType]);

  // services (added nearbyFacilities)
  const [services, setServices] = useState<ServicesState>({
    parking: "no",
    parkingPrice: "",
    breakfastIncluded: false, breakfastAvailable: false,
    restaurant: false, bar: false,
    pool: false, sauna: false,
    laundry: false, roomService: false,
    security24: false, firstAid: false, fireExtinguisher: false,
    onSiteShop: false, nearbyMall: false,
    socialHall: false, sportsGames: false,
    gym: false,
    distanceHospital: "", // legacy; can keep for compatibility
  });
  const [nearbyFacilities, setNearbyFacilities] = useState<NearbyFacility[]>([]);

  // helpers
  const changeBed = (k: BedKey, d: number)=> setBeds(b=>({ ...b, [k]: Math.max(0, (b[k]??0)+d) }));
  const toggleStr = (arr: string[], setArr:(v:string[])=>void, v: string)=> {
    const s = new Set(arr); s.has(v) ? s.delete(v) : s.add(v); setArr(Array.from(s));
  };

  // Inline validation state for Basics
  const [touchedBasics, setTouchedBasics] = useState<Record<string, boolean>>({});
  const [announcement, setAnnouncement] = useState<string>("");

  // Stepper refs + progress overlay (declared early so autosave can include step position)
  const stepperContainerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const progressHeight = 0;
  const [currentStep, setCurrentStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0])); // Start with step 0 visited
  
  // Auto-save to localStorage (debounced) - defined after all state variables
  const autoSaveDraft = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      try {
        const draftData = {
          title, type, otherType, hotelStar,
          buildingType,
          totalFloors,
          regionId, district, ward, street, city, zip,
          latitude: typeof latitude === 'number' ? latitude : '',
          longitude: typeof longitude === 'number' ? longitude : '',
          desc, totalBedrooms, totalBathrooms, maxGuests,
          houseRules,
          photos, definedRooms, services, nearbyFacilities,
          roomType, beds, roomsCount, smoking, bathPrivate,
          roomFloors,
          roomFloorDistribution,
          acceptGroupBooking, freeCancellation, paymentModes,
          currentStep,
          visitedSteps: Array.from(visitedSteps),
          timestamp: new Date().toISOString(),
        };
        
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
        setAutoSaveStatus('saved');
        
        // Reset status after 2 seconds
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      }
    }, 2000); // Debounce: save 2 seconds after last change
  }, [
    title, type, otherType, hotelStar,
    buildingType, totalFloors,
    regionId, district, ward, street, city, zip,
    latitude, longitude, desc, totalBedrooms, totalBathrooms, maxGuests,
    photos, definedRooms, services, nearbyFacilities,
    roomType, beds, roomsCount, smoking, bathPrivate, roomFloors, roomFloorDistribution,
    acceptGroupBooking, freeCancellation, paymentModes,
    houseRules,
    currentStep, visitedSteps,
  ]);
  
  // Trigger auto-save on form changes (and step changes so we can resume where user reached)
  useEffect(() => {
    // Don't auto-save if loading existing property
    if (loadingProperty) return;
    
    // Don't auto-save empty forms
    if (!title && !regionId && photos.length === 0 && !type && !buildingType) return;
    
    setAutoSaveStatus('saving');
    autoSaveDraft();
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [autoSaveDraft, loadingProperty, title, type, buildingType, totalFloors, regionId, photos.length, currentStep]);
  
  // Resume experience (no browser confirm): show a clean resume screen instead.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (propertyId || loadingProperty) return; // Skip if loading existing property

    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get("id");
    if (idParam) return; // editing a server draft
    
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        const draftAge = new Date().getTime() - new Date(draft.timestamp).getTime();
        const daysOld = draftAge / (1000 * 60 * 60 * 24);
        
        // Only restore if draft is less than 7 days old
        if (daysOld < 7) {
          setLocalDraft(draft);
          setShowResumeDraft(true);
        } else {
          // Clear old drafts
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }, [propertyId, loadingProperty]);

  // Fetch server drafts to show in the resume screen
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (propertyId || loadingProperty) return;
    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get("id");
    if (idParam) return;

    (async () => {
      try {
        const r = await api.get("/api/owner/properties/mine", { params: { status: "DRAFT", pageSize: 5 } });
        const items = ((r.data as any)?.items ?? []) as any[];
        const normalized = Array.isArray(items)
          ? items
              .map((it) => ({
                id: Number(it?.id),
                title: it?.title ?? it?.name ?? "",
                updatedAt: it?.updatedAt ?? it?.updated_at ?? it?.timestamp ?? it?.lastEdited ?? "",
              }))
              .filter((x) => Number.isFinite(x.id) && x.id > 0)
          : [];
        setServerDrafts(normalized);
        if (normalized.length > 0) setShowResumeDraft(true);
      } catch {
        // ignore (resume screen can still show local draft)
      }
    })();
  }, [propertyId, loadingProperty]);
  
  // Clear draft on successful submission
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setAutoSaveStatus('idle');
  }, []);

  const validateBasics = () => {
    const missing: string[] = [];
    if (title.trim().length < 3) missing.push('Property name');
    if (!type) missing.push('Property type');
    if (!buildingType) missing.push('Building layout');
    if (buildingType === "multi_storey") {
      const floorsNum = Number(totalFloors);
      if (!floorsNum || floorsNum < 2) missing.push('Total floors (min 2)');
    }
    if (!regionId) missing.push('Region');
    if (!district) missing.push('District');
    if (!ward) missing.push('Ward');
    if (street.trim().length === 0) missing.push('Street address');
    // Only require zip code if a postcode is available (some regions don't have postcodes in source data)
    // If selectedWardPostcode exists, zip must be filled; otherwise it's optional
    if (selectedWardPostcode && (!zip || zip.trim().length === 0)) {
      missing.push('Zip code');
    }

    if (missing.length) {
      // mark fields as touched so inline errors appear
      const touchedFields: Record<string, boolean> = { title: true, type: true, buildingType: true, regionId: true, district: true, ward: true, street: true };
      if (selectedWardPostcode) touchedFields.zip = true;
      if (buildingType === "multi_storey") touchedFields.totalFloors = true;
      setTouchedBasics((t) => ({ ...t, ...touchedFields }));
      setAnnouncement(`Please complete: ${missing.join(', ')}.`);
      return false;
    }
    return true;
  };


  const goToNextStep = () => {
    if (currentStep < 5) {
      if (currentStep === 0) {
        const ok = validateBasics();
        if (!ok) return;
      }
      const nextStep = currentStep + 1;
      setVisitedSteps(prev => new Set([...prev, nextStep]));
      setCurrentStep(nextStep);
      scrollToStep(nextStep);
    }
  };

  
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      scrollToStep(prevStep);
    }
  };

  const scrollToStep = (i: number, skipValidation = false) => {
    setCurrentStep(i);
    // Mark step as visited
    setVisitedSteps(prev => new Set([...prev, i]));
    // Prevent navigating away from Basics if required fields are missing unless skipped
    if (i > 0 && !skipValidation) {
      const ok = validateBasics();
      if (!ok) {
        setCurrentStep(0);
        return;
      }
    }
    // Open only the target step
    setShowBasics(i === 0);
    setShowRooms(i === 1);
    setShowServices(i === 2);
    setShowTotals(i === 3);
    setShowPhotos(i === 4);
    setShowReview(i === 5);
    // Announce opened step for screen readers
    const stepNames = ['Basic details','Room & Bathroom','Services','Totals & Description','Property Photos','Review & Submit'];
    setAnnouncement(`Opened ${stepNames[i]}`);

    // small timeout to allow expand animation / layout before scrolling
    setTimeout(() => {
      const el = sectionRefs.current[i];
      if (el && 'scrollIntoView' in el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // Update current step when sections change
  useEffect(() => {
    if (showBasics) setCurrentStep(0);
    else if (showRooms) setCurrentStep(1);
    else if (showServices) setCurrentStep(2);
    else if (showTotals) setCurrentStep(3);
    else if (showPhotos) setCurrentStep(4);
    else if (showReview) setCurrentStep(5);
  }, [showBasics, showRooms, showServices, showTotals, showPhotos, showReview]);

  type CloudinarySig = {
    timestamp: number;
    apiKey: string;
    signature: string;
    folder: string;
    cloudName: string;
  };

  async function uploadToCloudinary(file: File, folder: string) {
    // Use relative path in browser to leverage Next.js rewrites and avoid CORS
    const sig = await api.get(`/uploads/cloudinary/sign?folder=${encodeURIComponent(folder)}`);
    const fd = new FormData();
    fd.append("file", file);
    const sigData = sig.data as CloudinarySig;
    fd.append("timestamp", String(sigData.timestamp));
    fd.append("api_key", sigData.apiKey);
    fd.append("signature", sigData.signature);
    fd.append("folder", sigData.folder);
    const resp = await axios.post(`https://api.cloudinary.com/v1_1/${sigData.cloudName}/auto/upload`, fd);
    return (resp.data as { secure_url: string }).secure_url;
  }

  // PhotosStep handles file uploads internally, so pickPropertyPhotos is not needed

  const onPickRoomImages = async (files: FileList | null) => {
    if (!files) return;
    const chosen = Array.from(files).slice(0, 6);
    const localBlobs = chosen.map(f => URL.createObjectURL(f));
    setRoomImages(prev => [...prev, ...localBlobs]);
    setRoomImageSaved(prev => [...prev, ...Array(localBlobs.length).fill(false)]);
    setRoomImageUploading(prev => [...prev, ...Array(localBlobs.length).fill(true)]);

    chosen.forEach((file, i) => {
      const blobUrl = localBlobs[i];
      uploadToCloudinary(file, "properties/rooms").then(url => {
        setRoomImages(prev => {
          const idx = prev.indexOf(blobUrl);
          if (idx === -1) return prev;
          const copy = [...prev];
          copy[idx] = url;
          return copy;
        });
        setRoomImageUploading(prev => {
          const idxNow = roomImagesRef.current.indexOf(blobUrl);
          if (idxNow === -1) return prev;
          const copy = [...prev];
          copy[idxNow] = false;
          return copy;
        });
      }).catch(err => {
        console.error("Room image upload failed", err);
      }).finally(() => {
        try { URL.revokeObjectURL(blobUrl); } catch {}
      });
    });
  };

  const addRoomType = () => {
    const errs: string[] = [];
    if (!roomsCount || Number(roomsCount) <= 0) errs.push("Rooms count is required.");
    if (roomImages.length === 0) errs.push("At least one room image is required.");
    if (buildingType === "multi_storey") {
      if (roomFloors.length === 0) errs.push("Select at least one floor for this room type.");
      const total = roomFloors.reduce((sum, f) => sum + (roomFloorDistribution[f] || 0), 0);
      if (Number(roomsCount) > 0 && total !== Number(roomsCount)) {
        errs.push("Floor distribution must add up to the total number of rooms.");
      }
    }
    if (errs.length) { alert(errs.join("\n")); return; }

    const entry: RoomEntry = {
      roomType, beds, roomsCount: Number(roomsCount),
      ...(buildingType === "multi_storey"
        ? { floors: roomFloors, floorDistribution: roomFloorDistribution }
        : buildingType === "single_storey"
          ? { floors: [0], floorDistribution: { 0: Number(roomsCount) } }
          : {}),
      smoking, bathPrivate, bathItems, towelColor,
      otherAmenities: Array.from(new Set([...otherAmenities, ...splitComma(otherAmenitiesText)])),
      roomDescription, roomImages, pricePerNight: Number(pricePerNight || 0)
    };
    setDefinedRooms(list => [...list, entry]);

    // reset mini
    setBeds({ twin:0, full:0, queen:0, king:0 });
    setRoomsCount(""); setSmoking("yes"); setBathPrivate("yes");
    setRoomFloors([]); setRoomFloorDistribution({});
    setBathItems([]); setTowelColor(""); setOtherAmenities([]);
    setOtherAmenitiesText(""); setRoomDescription(""); setRoomImages([]);
    setPricePerNight("");
  };

  const payload = () => {
    // Map hotelStar string values to numbers for backend validation
    const hotelStarMap: Record<string, number | null> = {
      "": null,
      "basic": 1,
      "simple": 2,
      "moderate": 3,
      "high": 4,
      "luxury": 5,
    };
    
    // Send regionId - prefer numeric code if available, otherwise use slug (string)
    // Database stores regionId as VARCHAR(50), so both formats work
    const regionData = REGION_BY_ID[regionId];
    const regionCode = regionData?.code ? Number(regionData.code) : undefined;
    
    const fmtWindow = (from: string, to: string) => {
      const f = String(from || "").trim();
      const t = String(to || "").trim();
      if (f && t) return `${f} – ${t}`;
      if (f) return `From ${f}`;
      if (t) return `Until ${t}`;
      return "";
    };

    const houseRulesObj = (() => {
      const hr = typeof houseRules === "object" && houseRules !== null ? houseRules : {
        checkInFrom: "",
        checkInTo: "",
        checkOutFrom: "",
        checkOutTo: "",
        petsAllowed: null,
        petsNote: "",
        smokingNotAllowed: null,
        other: "",
      };
      const checkIn = fmtWindow(hr.checkInFrom || "", hr.checkInTo || "");
      const checkOut = fmtWindow(hr.checkOutFrom || "", hr.checkOutTo || "");

      const out: any = {};
      if (checkIn) out.checkIn = checkIn;
      if (checkOut) out.checkOut = checkOut;
      if (typeof hr.petsAllowed === "boolean") out.pets = hr.petsAllowed;
      if (hr.petsNote && typeof hr.petsNote === "string" && hr.petsNote.trim()) out.petsNote = hr.petsNote.trim();
      // In public UI, houseRules.smoking === true means "Smoking Not Allowed"
      if (typeof hr.smokingNotAllowed === "boolean") out.smoking = hr.smokingNotAllowed;
      if (hr.other && typeof hr.other === "string" && hr.other.trim()) out.other = hr.other.trim();

      return Object.keys(out).length ? out : null;
    })();

    return {
      title,
      type: toServerType(type),
      buildingType: buildingType || null,
      totalFloors:
        buildingType === "multi_storey"
          ? (Number(totalFloors) >= 2 ? Number(totalFloors) : null)
          : buildingType === "single_storey"
            ? 1
            : null,
      description: desc || null,
      // location - send numeric code if available (for regions with codes), otherwise send slug
      ...(regionId ? { regionId: regionCode || regionId } : {}),
      regionName: regionName || undefined,
      district: district || undefined,
      ward: ward || null,
      street: street || null,
      apartment: apartment || null,
      city: city || undefined,
      zip: zip || undefined,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,

      photos,

      // hotelStar must be a number (1-5) or null, not a string
      hotelStar: isHotel && hotelStar && hotelStar !== "" ? (hotelStarMap[hotelStar] ?? null) : null,

      roomsSpec: definedRooms,

      totalBedrooms: numOrNull(totalBedrooms),
      totalBathrooms: totalBathrooms === "" || totalBathrooms == null ? 0 : Number(totalBathrooms),
      maxGuests: maxGuests === "" || maxGuests == null || Number(maxGuests) <= 0 ? Math.max(1, autoMaxGuests) : Number(maxGuests),
      houseRules: houseRulesObj,

      // Backend expects services as JSON: can be array of strings OR object with nearbyFacilities
      // Send as object to preserve full nearbyFacilities data (name, distance, etc.) AND all service properties
      services: (() => {
        const servicesObj: any = {
          // Include all service properties so they can be displayed in admin view
          // Only include properties that have been explicitly set (not default/empty values)
          ...(services.parking && services.parking !== 'no' ? { parking: services.parking } : {}),
          ...(services.parking === 'paid' && services.parkingPrice ? { parkingPrice: services.parkingPrice } : {}),
          ...(services.breakfastIncluded ? { breakfastIncluded: true } : {}),
          ...(services.breakfastAvailable ? { breakfastAvailable: true } : {}),
          ...(services.restaurant ? { restaurant: true } : {}),
          ...(services.bar ? { bar: true } : {}),
          ...(services.pool ? { pool: true } : {}),
          ...(services.sauna ? { sauna: true } : {}),
          ...(services.laundry ? { laundry: true } : {}),
          ...(services.roomService ? { roomService: true } : {}),
          ...(services.security24 ? { security24: true } : {}),
          ...(services.firstAid ? { firstAid: true } : {}),
          ...(services.fireExtinguisher ? { fireExtinguisher: true } : {}),
          ...(services.onSiteShop ? { onSiteShop: true } : {}),
          ...(services.nearbyMall ? { nearbyMall: true } : {}),
          ...(services.socialHall ? { socialHall: true } : {}),
          ...(services.sportsGames ? { sportsGames: true } : {}),
          ...(services.gym ? { gym: true } : {}),
        // Service tags array for filtering/searching
        tags: Array.from(
          new Set<string>([
            ...servicesToArray(services),
            ...nearbyFacilitiesToServiceTags(nearbyFacilities),
            ...(freeCancellation ? ["Free cancellation"] : []),
            ...(acceptGroupBooking ? ["Group stay"] : []),
            ...paymentModes.map((m) => `Payment: ${m}`),
          ])
        ),
        };
        
        // Full nearbyFacilities array with all details (name, distance, type, etc.)
        if (nearbyFacilities.length > 0) {
          servicesObj.nearbyFacilities = nearbyFacilities;
        }
        
        return servicesObj;
      })(),

      basePrice: inferBasePrice(definedRooms),
      currency: "TZS",
    };
  };

  function nearbyFacilitiesToServiceTags(list: NearbyFacility[]): string[] {
    const map: Record<string, string> = {
      Hospital: "Near hospital",
      Pharmacy: "Near pharmacy",
      Polyclinic: "Near polyclinic",
      Clinic: "Near clinic",
      "Police station": "Near police station",
      Airport: "Near airport",
      "Bus station": "Near bus station",
      "Petrol station": "Near petrol station",
      "Main road": "Near main road",
    };
    const tags = new Set<string>();
    for (const f of list || []) {
      const t = map[String((f as any)?.type || "")];
      if (t) tags.add(t);
    }
    return Array.from(tags);
  }

  function servicesToArray(s: ServicesState): string[] {
    const out: string[] = [];
    if (s.parking === "free") out.push("Free parking");
    if (s.parking === "paid") out.push(`Paid parking (${numOrEmpty(s.parkingPrice)} TZS)`);
    if (s.breakfastIncluded) out.push("Breakfast included");
    if (s.breakfastAvailable) out.push("Breakfast available");
    if (s.restaurant) out.push("Restaurant");
    if (s.bar) out.push("Bar");
    if (s.pool) out.push("Pool");
    if (s.sauna) out.push("Sauna");
    if (s.laundry) out.push("Laundry");
    if (s.roomService) out.push("Room service");
    if (s.security24) out.push("24h security");
    if (s.firstAid) out.push("First aid");
    if (s.fireExtinguisher) out.push("Fire extinguisher");
    if (s.onSiteShop) out.push("On-site shop");
    if (s.nearbyMall) out.push("Nearby mall");
    if (s.socialHall) out.push("Social hall");
    if (s.sportsGames) out.push("Sports & games");
    if (s.gym) out.push("Gym");
    if (numOrEmpty(s.distanceHospital)) {
      out.push("Near hospital");
      out.push(`Hospital distance ${numOrEmpty(s.distanceHospital)} km`);
    }
    return out.filter(Boolean);
  }

  const completeEnough =
    title.trim().length >= 3 &&
    !!regionId &&
    !!district &&
    photos.length >= 3 &&
    definedRooms.length >= 1 &&
    // if this is a Hotel, ensure a star rating was chosen
    (!isHotel || (typeof hotelStar === "string" && hotelStar !== ""));


  async function submitForReview() {
    if (!completeEnough) {
      const missing = [
        !(title.trim().length >= 3) ? "name" : null,
        !regionId ? "location" : null,
        !(photos.length >= 3) ? "≥3 photos" : null,
        !(definedRooms.length >= 1) ? "≥1 room type" : null,
        (isHotel && (!hotelStar || hotelStar === "")) ? "hotel star rating" : null,
      ].filter(Boolean);
      alert("Please complete: " + missing.join(", ") + ".");
      return;
    }
    try {
      const confirmed = window.confirm("Are you sure you're submitting this for review? You won't be able to edit while it's pending.");
      if (!confirmed) return;
      // Determine the property ID - use existing or create new
      let id: number | null = null;
      let createResponse: any = null;
      
      if (propertyId) {
        // Update existing property
        console.log(`Updating existing property ${propertyId}...`);
        await api.put(`/api/owner/properties/${propertyId}`, payload());
        id = propertyId;
      } else {
        // Create new property - use ID directly from response (don't rely on state update)
        console.log("Creating new property...");
        createResponse = await api.post("/api/owner/properties", payload());
        id = (createResponse.data as { id: number })?.id;
        if (id) {
          setPropertyId(id);
          console.log(`Property created with ID: ${id}`);
        } else {
          // Fallback: try to fetch the latest draft
          console.log("No ID in create response, trying to fetch latest draft...");
          const fetchedId = await refetchLatestId();
          if (fetchedId) {
            id = fetchedId;
            setPropertyId(fetchedId);
            console.log(`Fetched property ID: ${id}`);
          }
        }
      }
      
      if (!id || !Number.isFinite(id)) {
        console.error("Could not determine property ID. Create response:", createResponse?.data);
        alert("Error: Could not determine property ID. Please try again.");
        return;
      }

      console.log(`Submitting property ${id} for review...`);
      const resp = await api.post(`/api/owner/properties/${id}/submit`);
      // Accept 200 OK with body or 204 No Content
      if (resp.status === 200 || resp.status === 204) {
        console.log(`Property ${id} submitted successfully. Response:`, resp.data);
        clearDraft(); // Clear draft on successful submission
        setShowSubmissionSuccess(true);
      } else {
        console.error("Unexpected response status:", resp.status, resp.data);
        alert("Unexpected response: " + resp.status);
      }
    } catch (e:any) {
      const data = e?.response?.data;
      const url = e?.config?.url || "unknown";
      const method = e?.config?.method?.toUpperCase() || "unknown";
      const status = e?.response?.status;
      const err = data?.error ?? data ?? e?.message ?? "Submit failed";
      const errorMsg = typeof err === "string" ? err : JSON.stringify(err, null, 2);
      console.error(`Submit failed: ${method} ${url}`, { status, error: err, fullError: e });
      alert(`Submit failed (${status || "network error"}): ${errorMsg}\n\nURL: ${method} ${url}`);
    }
  }

  async function refetchLatestId(): Promise<number | undefined> {
    const r = await api.get("/api/owner/properties/mine", { params: { status: "DRAFT", pageSize: 1 } });
    const items = (r.data as any)?.items;
    return Array.isArray(items) ? items[0]?.id : undefined;
  }

  /* UI below */

  const restoreLocalDraft = () => {
    const draft = localDraft;
    if (!draft) return;
    // Apply values
    if (draft.title) setTitle(draft.title);
    if (draft.type) setType(draft.type);
    if (draft.otherType) setOtherType(draft.otherType);
    if (draft.hotelStar) setHotelStar(draft.hotelStar);
    if (draft.buildingType) setBuildingType(draft.buildingType);
    if (draft.totalFloors !== undefined && draft.totalFloors !== null && draft.totalFloors !== "") {
      const n = typeof draft.totalFloors === "number" ? draft.totalFloors : parseFloat(draft.totalFloors);
      setTotalFloors(Number.isFinite(n) ? n : "");
    }
    if (draft.roomType) setRoomType(draft.roomType);
    if (draft.beds) setBeds(draft.beds);
    if (draft.roomsCount !== undefined) setRoomsCount(draft.roomsCount);
    if (draft.smoking) setSmoking(draft.smoking);
    if (draft.bathPrivate) setBathPrivate(draft.bathPrivate);
    if (Array.isArray(draft.roomFloors)) setRoomFloors(draft.roomFloors);
    if (draft.roomFloorDistribution && typeof draft.roomFloorDistribution === "object") setRoomFloorDistribution(draft.roomFloorDistribution);
    if (draft.regionId) setRegionId(draft.regionId);
    if (draft.district) setDistrict(draft.district);
    if (draft.ward) setWard(draft.ward);
    if (draft.street) setStreet(draft.street);
    if (draft.city) setCity(draft.city);
    if (draft.zip) setZip(draft.zip);
    if (draft.latitude) setLatitude(typeof draft.latitude === "number" ? draft.latitude : parseFloat(draft.latitude) || "");
    if (draft.longitude) setLongitude(typeof draft.longitude === "number" ? draft.longitude : parseFloat(draft.longitude) || "");
    if (draft.desc) setDesc(draft.desc);
    if (draft.totalBedrooms) setTotalBedrooms(draft.totalBedrooms);
    if (draft.totalBathrooms) setTotalBathrooms(draft.totalBathrooms);
    if (draft.maxGuests) setMaxGuests(draft.maxGuests);
    if (draft.houseRules && typeof draft.houseRules === "object" && draft.houseRules !== null && !Array.isArray(draft.houseRules)) {
      setHouseRules((prev) => {
        const prevObj = typeof prev === "object" && prev !== null ? prev : {
          checkInFrom: "",
          checkInTo: "",
          checkOutFrom: "",
          checkOutTo: "",
          petsAllowed: null,
          petsNote: "",
          smokingNotAllowed: null,
          other: "",
        };
        return { ...prevObj, ...(draft.houseRules as Record<string, any>) };
      });
    }
    if (draft.photos && Array.isArray(draft.photos)) setPhotos(draft.photos);
    if (draft.definedRooms && Array.isArray(draft.definedRooms)) setDefinedRooms(draft.definedRooms);
    if (draft.services) setServices(draft.services);
    if (draft.nearbyFacilities && Array.isArray(draft.nearbyFacilities)) setNearbyFacilities(draft.nearbyFacilities);
    if (draft.acceptGroupBooking !== undefined) setAcceptGroupBooking(draft.acceptGroupBooking);
    if (draft.freeCancellation !== undefined) setFreeCancellation(draft.freeCancellation);
    if (draft.paymentModes && Array.isArray(draft.paymentModes)) setPaymentModes(draft.paymentModes);

    const step = typeof draft.currentStep === "number" ? Math.max(0, Math.min(5, draft.currentStep)) : 0;
    const visited = Array.isArray(draft.visitedSteps)
      ? new Set<number>(draft.visitedSteps.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n)))
      : new Set<number>(Array.from({ length: step + 1 }, (_, i) => i));
    setVisitedSteps(visited);
    setShowResumeDraft(false);

    // flip into the last step smoothly; skip validation (draft may already be partially filled)
    setTimeout(() => scrollToStep(step, true), 50);
  };

  const continueServerDraft = useCallback((id: number) => {
    if (typeof window === "undefined") return;
    window.location.href = `/owner/properties/add?id=${id}`;
  }, []);

  const startNewListing = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    window.location.href = "/owner/properties/add";
  }, []);

  const stepTitles = ["Basic details", "Room & bathroom", "Services", "Totals & description", "Property photos", "Review & submit"] as const;

  const servicesCompleted = useMemo(() => {
    const s: any = services || {};
    const anyNearby = (nearbyFacilities?.length ?? 0) > 0;

    // If parking is set to paid, require a valid price to consider the step complete.
    const parkingPaidOk = s.parking !== "paid" || Number(s.parkingPrice) > 0;

    const anyOnProperty =
      s.parking !== "no" ||
      !!s.breakfastIncluded ||
      !!s.breakfastAvailable ||
      !!s.restaurant ||
      !!s.bar ||
      !!s.pool ||
      !!s.sauna ||
      !!s.laundry ||
      !!s.roomService ||
      !!s.security24 ||
      !!s.firstAid ||
      !!s.fireExtinguisher ||
      !!s.onSiteShop ||
      !!s.nearbyMall ||
      !!s.socialHall ||
      !!s.sportsGames ||
      !!s.gym;

    return (anyNearby || anyOnProperty) && parkingPaidOk;
  }, [services, nearbyFacilities]);

  // Check if Totals step is completed
  const totalsCompleted = useMemo(() => {
    const bathroomsOk = typeof totalBathrooms === "number" && totalBathrooms > 0;
    const guestsOk = typeof maxGuests === "number" && maxGuests > 0;
    // Description is optional but nice to have
    return bathroomsOk && guestsOk;
  }, [totalBathrooms, maxGuests]);

  if (loadingProperty) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center">
        <div className="dot-spinner mb-4">
          <span className="dot dot-blue" />
          <span className="dot dot-black" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Loading property...</h2>
        <p className="text-sm text-gray-600 mt-2">Please wait while we load your property details.</p>
      </div>
    );
  }

  if (showResumeDraft) {
    return (
      <ResumeDraftScreen
        localDraft={localDraft}
        serverDrafts={serverDrafts}
        stepTitles={stepTitles}
        onContinueLocal={restoreLocalDraft}
        onContinueServer={continueServerDraft}
        onStartNew={startNewListing}
        onDismiss={() => setShowResumeDraft(false)}
      />
    );
  }

  const currentStepTitle = stepTitles[currentStep] || "Add property";
  const stepProgressPct = Math.round(((currentStep + 1) / stepTitles.length) * 100);

  const stepsMeta = [
    { index: 0, title: "Basic details", completed: title.trim().length >= 3 && !!regionId && !!district },
    { index: 1, title: "Rooms", completed: definedRooms.length >= 1 },
    { index: 2, title: "Services", completed: servicesCompleted },
    { index: 3, title: "Totals", completed: totalsCompleted },
    { index: 4, title: "Photos", completed: photos.length >= 3 },
    { index: 5, title: "Review", completed: false },
  ] as const;

  const completedStepsCount = stepsMeta.filter((s) => s.completed).length;
  const locationSummary = [street, ward, district, REGION_BY_ID[regionId]?.name]
    .filter((segment) => !!segment && String(segment).trim().length > 0)
    .join(", ") || "Location pending";
  const nextStepTitle = stepTitles[currentStep + 1] || null;
  const totalDefinedRooms = definedRooms.reduce((sum, room) => sum + (Number(room?.roomsCount) || 0), 0);
  const totalBedsAcrossRooms = definedRooms.reduce((sum, room) => {
    const counts = room?.beds || {};
    const perRoomBeds = (Number(counts?.twin) || 0) + (Number(counts?.full) || 0) + (Number(counts?.queen) || 0) + (Number(counts?.king) || 0);
    return sum + perRoomBeds * (Number(room?.roomsCount) || 0);
  }, 0);
  const amenityHighlights = servicesToArray(services).slice(0, 6);
  const photosProgressPct = photos.length === 0 ? 0 : Math.min(100, Math.round((Math.min(photos.length, 5) / 5) * 100));
  const propertyHeroTitle = title.trim().length > 0 ? title.trim() : "Create your next stay";
  const photosNeeded = Math.max(0, 5 - photos.length);
  const hasHotelStar = !isHotel || (typeof hotelStar === "string" && hotelStar !== "");
  const snapshotStats = [
    { label: "Room types", value: totalDefinedRooms, hint: "configured" },
    { label: "Beds ready", value: totalBedsAcrossRooms, hint: "sleeping spots" },
    { label: "Photos", value: photos.length, hint: "uploaded" },
  ] as const;
  const helpfulReminders = [
    photosNeeded > 0 ? `${photosNeeded} more photo${photosNeeded === 1 ? "" : "s"} recommended for a standout gallery.` : "Add descriptive captions to your best shots to boost conversions.",
    !hasHotelStar ? "Select a hotel star rating so travellers understand your comfort level." : null,
    definedRooms.length === 0 ? "Capture at least one room type to unlock the review step." : "Double-check room prices and capacity before submitting.",
  ].filter(Boolean) as string[];

  const renderListingSnapshot = (variant: "mobile" | "desktop") => (
    <section className={twMerge(SNAPSHOT_CARD_CLASS, variant === "desktop" && SNAPSHOT_CARD_DESKTOP)}>
      <div className="relative overflow-hidden rounded-3xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-100/20 via-white to-sky-100/25" aria-hidden />
        <div className="relative z-10 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Listing snapshot</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">{propertyHeroTitle}</h2>
              <p className="mt-1 text-sm text-slate-600">{locationSummary}</p>
            </div>
            <span className={SNAPSHOT_BADGE_CLASS}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              {completedStepsCount}/{stepTitles.length} steps
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {snapshotStats.map((stat) => (
              <div key={stat.label} className={SNAPSHOT_STAT_CLASS}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.hint}</p>
              </div>
            ))}
          </div>

          <div className={twMerge("mt-5", SNAPSHOT_PROGRESS_WRAPPER)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Photo progress</p>
                <p className="text-xs text-slate-500">{photosNeeded > 0 ? `${photosNeeded} more recommended` : "Looks great"}</p>
              </div>
              <span className="text-sm font-semibold text-emerald-700">{photosProgressPct}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div ref={photosProgressBarRef} className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500" />
            </div>
          </div>

          {amenityHighlights.length > 0 ? (
            <div className="mt-5">
              <p className="text-sm font-semibold text-slate-800">Highlights</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {amenityHighlights.map((tag) => (
                  <span key={tag} className={SNAPSHOT_HIGHLIGHT_CLASS}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <span>{locationSummary}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users className="h-4 w-4 text-sky-600" />
              <span>{autoMaxGuests} guests capacity</span>
            </div>
            {hasHotelStar ? null : (
              <div className={SNAPSHOT_ALERT_CLASS}>
                <AlertCircle className="h-4 w-4" />
                <span>Select hotel star rating to stand out.</span>
              </div>
            )}
            {nextStepTitle ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                <span>Next: {nextStepTitle}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );


  return (
    <div id="addPropertyView" className={PAGE_WRAPPER_CLASS}>
      <div className={PAGE_BACKGROUND_CLASS} aria-hidden>
        <div className="absolute -top-24 left-1/2 h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute top-0 right-0 h-[360px] w-[360px] translate-x-1/3 rounded-full bg-sky-200/25 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[320px] w-[320px] -translate-x-1/4 translate-y-1/3 rounded-full bg-emerald-100/20 blur-3xl" />
      </div>
      <div aria-live="polite" className="sr-only" role="status">{announcement}</div>
      <div className={PAGE_LAYOUT_CLASS}>
        <div className={PAGE_SHELL_CLASS}>
          <section className={STEPPER_WRAPPER_CLASS}>
            <div className="w-full relative" ref={stepperContainerRef} data-progress={progressHeight}>
              <header className="relative overflow-hidden border-b border-slate-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4 sm:px-6 py-6 sm:py-8">
                <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                  <div className="absolute -top-12 right-0 h-40 w-40 translate-x-1/3 rounded-full bg-emerald-200/35 blur-2xl" />
                  <div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-1/4 translate-y-1/4 rounded-full bg-sky-200/30 blur-2xl" />
                </div>
                <div className="relative z-10 flex flex-col gap-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          <Plus className="h-4 w-4" />
                          Listing builder
                        </span>
                        {autoSaveStatus !== "idle" ? (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                              autoSaveStatus === "saving"
                                ? "border-sky-200 bg-sky-50 text-sky-700"
                                : autoSaveStatus === "saved"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-rose-200 bg-rose-50 text-rose-700"
                            }`}
                          >
                            {autoSaveStatus === "saving" ? (
                              <>
                                <span className="h-3 w-3 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
                                Saving
                              </>
                            ) : autoSaveStatus === "saved" ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Saved
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3.5 w-3.5" />
                                Save failed
                              </>
                            )}
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Add property</p>
                        <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">{currentStepTitle}</h1>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                          <span>
                            Step <span className="font-semibold text-slate-800">{currentStep + 1}</span> of <span className="font-semibold text-slate-800">{stepTitles.length}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            {completedStepsCount} completed
                          </span>
                          <span className="flex items-center gap-1">
                            {visitedSteps.size} visited
                          </span>
                          {nextStepTitle ? (
                            <span className="flex items-center gap-1 text-emerald-700">
                              <ArrowRight className="h-3.5 w-3.5" />
                              Next: {nextStepTitle}
                            </span>
                          ) : null}
                          <span className="flex items-center gap-1 text-slate-600">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {stepProgressPct}% journey
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                    </div>
                  </div>
                  <div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/60 shadow-inner">
                      <div
                        ref={stepProgressBarRef}
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-sky-500"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-3 py-1">
                        <Home className="h-3.5 w-3.5 text-emerald-600" />
                        {totalDefinedRooms} rooms set
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-3 py-1">
                        <Bed className="h-3.5 w-3.5 text-sky-600" />
                        {totalBedsAcrossRooms} beds mapped
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-3 py-1">
                        <ImageIcon className="h-3.5 w-3.5 text-amber-600" />
                        {photos.length} photos added
                      </span>
                    </div>
                  </div>
                  <nav className="mt-2 overflow-x-auto pt-1" aria-label="Steps">
                    <ol className="flex min-w-full items-stretch gap-2 pb-1">
                      {stepsMeta.map((s, idx) => {
                        const isActive = currentStep === s.index;
                        const isPast = currentStep > s.index;
                        const isVisited = visitedSteps.has(s.index);
                        const isCompleted = s.completed && isPast;
                        const canJump = isVisited || s.index === currentStep;
                        return (
                          <li key={s.index} className="flex items-center">
                            <button
                              type="button"
                              disabled={!canJump}
                              onClick={() => scrollToStep(s.index)}
                              className={`group flex min-w-[180px] items-center gap-3 rounded-2xl border px-3 py-2 text-left transition ${
                                isActive
                                  ? "border-emerald-400 bg-white shadow-md shadow-emerald-100/40"
                                  : canJump
                                    ? "border-slate-200 bg-white/80 hover:border-emerald-300 hover:bg-white"
                                    : "cursor-not-allowed border-slate-200 bg-white/60 opacity-50"
                              }`}
                              aria-current={isActive ? "step" : undefined}
                            >
                              <span
                                className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${
                                  isActive
                                    ? "border-emerald-500 bg-emerald-500 text-white"
                                    : isCompleted
                                      ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                                      : isPast
                                        ? "border-slate-200 bg-slate-100 text-slate-700"
                                        : "border-slate-200 bg-white text-slate-600"
                                }`}
                              >
                                {isCompleted ? "✓" : s.index + 1}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-slate-900 truncate">{s.title}</span>
                                <span className="block text-xs text-slate-600">
                                  {isCompleted ? "Completed" : isActive ? "In progress" : isVisited ? "Visited" : "Pending"}
                                </span>
                              </span>
                            </button>
                            {idx < stepsMeta.length - 1 ? (
                              <span className="mx-2 hidden h-px w-8 bg-slate-200 sm:inline-block" aria-hidden />
                            ) : null}
                          </li>
                        );
                      })}
                    </ol>
                  </nav>
                </div>
              </header>
              <div className="p-4 sm:p-6 md:p-8">
                <div className="mb-6 lg:hidden">{renderListingSnapshot("mobile")}</div>
                {showReview && (
                  <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-5 py-4 shadow-sm mb-6">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">Ready to submit?</h3>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          Please review all sections carefully. Once submitted, your property will be reviewed by our team. You&apos;ll be notified once the review is complete.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <main className="relative mt-6">
                  <div className="relative w-full space-y-4">
        {/* BASICS */}
        <BasicsStep
          isVisible={showBasics}
          ref={(el) => {
            sectionRefs.current[0] = el;
          }}
          currentStep={currentStep}
          goToPreviousStep={goToPreviousStep}
          goToNextStep={goToNextStep}
          title={title}
          setTitle={setTitle}
          type={type}
          setType={setType}
          otherType={otherType}
          setOtherType={setOtherType}
          hotelStar={hotelStar}
          setHotelStar={setHotelStar}
          buildingType={buildingType}
          setBuildingType={setBuildingType}
          totalFloors={totalFloors}
          setTotalFloors={setTotalFloors}
          touchedBasics={touchedBasics}
          setTouchedBasics={setTouchedBasics}
          PROPERTY_TYPES={PROPERTY_TYPES}
          PROPERTY_TYPE_ICONS={PROPERTY_TYPE_ICONS}
          PROPERTY_TYPE_STYLES={PROPERTY_TYPE_STYLES}
          HOTEL_STAR_OPTIONS={HOTEL_STAR_OPTIONS}
          regionId={regionId}
          setRegionId={setRegionId}
          district={district}
          setDistrict={setDistrict}
          ward={ward}
          setWard={setWard}
          street={street}
          setStreet={setStreet}
          city={city}
          setCity={setCity}
          zip={zip}
          setZip={setZip}
          selectedWardPostcode={selectedWardPostcode}
          latitude={latitude}
          setLatitude={setLatitude}
          longitude={longitude}
          setLongitude={setLongitude}
          districts={districts}
          wards={wards}
          streets={streets}
          REGIONS={REGIONS}
          locationTrackingEnabled={locationTrackingEnabled}
          locationLoading={locationLoading}
          handleLocationToggle={handleLocationToggle}
          PropertyLocationMap={PropertyLocationMap}
        />

        {/* ROOM TYPES */}
        <RoomsStep
          isVisible={showRooms}
          sectionRef={(el) => {
            sectionRefs.current[1] = el;
          }}
          currentStep={currentStep}
          goToPreviousStep={goToPreviousStep}
          goToNextStep={goToNextStep}
          buildingType={buildingType}
          totalFloors={totalFloors}
          roomType={roomType}
          setRoomType={setRoomType}
          beds={beds as any}
          changeBed={changeBed as any}
          roomsCount={roomsCount}
          setRoomsCount={setRoomsCount}
          roomFloors={roomFloors}
          setRoomFloors={setRoomFloors}
          roomFloorDistribution={roomFloorDistribution}
          setRoomFloorDistribution={setRoomFloorDistribution}
          smoking={smoking}
          setSmoking={setSmoking}
          bathPrivate={bathPrivate}
          setBathPrivate={setBathPrivate}
          bathItems={bathItems}
          setBathItems={setBathItems}
          towelColor={towelColor}
          setTowelColor={setTowelColor}
          otherAmenities={otherAmenities}
          setOtherAmenities={setOtherAmenities}
          otherAmenitiesText={otherAmenitiesText}
          setOtherAmenitiesText={setOtherAmenitiesText}
          roomDescription={roomDescription}
          setRoomDescription={setRoomDescription}
          roomImages={roomImages}
          onPickRoomImages={onPickRoomImages}
          setRoomImages={setRoomImages}
          roomImageSaved={roomImageSaved}
          setRoomImageSaved={setRoomImageSaved}
          roomImageUploading={roomImageUploading}
          setRoomImageUploading={setRoomImageUploading}
          pricePerNight={pricePerNight}
          setPricePerNight={setPricePerNight}
          addRoomType={addRoomType}
          definedRooms={definedRooms}
          setDefinedRooms={setDefinedRooms}
          numOrEmpty={numOrEmpty}
          toggleStr={toggleStr as any}
          BED_ICONS={BED_ICONS as any}
        />

        {/* SERVICES */}
        <ServicesStep
          isVisible={showServices}
          sectionRef={(el) => {
            sectionRefs.current[2] = el;
          }}
          currentStep={currentStep}
          goToPreviousStep={goToPreviousStep}
          goToNextStep={goToNextStep}
          services={services as any}
          setServices={setServices as any}
          numOrEmpty={numOrEmpty}
          nearbyFacilities={nearbyFacilities as any}
          setNearbyFacilities={setNearbyFacilities as any}
          AddFacilityInline={AddFacilityInline as any}
          FacilityRow={FacilityRow as any}
          servicesCompleted={servicesCompleted}
        />

        {/* totals + description */}
        <TotalsStep
          isVisible={showTotals}
          sectionRef={(el) => {
            sectionRefs.current[3] = el;
          }}
          totalBedrooms={totalBedrooms}
          totalBathrooms={totalBathrooms}
          setTotalBathrooms={setTotalBathrooms}
          maxGuests={maxGuests}
          setMaxGuests={setMaxGuests}
          desc={desc}
          setDesc={setDesc}
          acceptGroupBooking={acceptGroupBooking}
          setAcceptGroupBooking={setAcceptGroupBooking}
          houseRules={houseRules as any}
          setHouseRules={setHouseRules as any}
          goToPreviousStep={goToPreviousStep}
          goToNextStep={goToNextStep}
          currentStep={currentStep}
        />

        {/* PROPERTY PHOTOS */}
        <PhotosStep
          isVisible={showPhotos}
          photos={photos}
          photosSaved={photosSaved}
          photosUploading={photosUploading}
          setPhotos={setPhotos}
          setPhotosSaved={setPhotosSaved}
          setPhotosUploading={setPhotosUploading}
          goToPreviousStep={goToPreviousStep}
          goToNextStep={goToNextStep}
          currentStep={currentStep}
        />

        {/* REVIEW */}
        <ReviewStep
          isVisible={showReview}
          sectionRef={(el) => {
            sectionRefs.current[5] = el;
          }}
          goToPreviousStep={goToPreviousStep}
          submitForReview={submitForReview}
          submitDisabled={!completeEnough}
          stepsMeta={stepsMeta}
          completeEnough={completeEnough}
          onStepClick={(stepIndex) => {
            scrollToStep(stepIndex, true);
          }}
          reviewData={{
            title: title || "",
            type: type || "",
            location: {
              district: district || undefined,
              regionName: regionName || undefined,
              street: street || undefined,
              city: city || undefined,
            },
            rooms: definedRooms.map((r) => ({
              roomType: r.roomType,
              roomsCount: r.roomsCount,
              pricePerNight: r.pricePerNight,
              floorDistribution: r.floorDistribution || undefined,
            })),
            buildingType: buildingType || "",
            totalFloors: totalFloors || "",
            currency: "TZS",
          }}
        />
                  </div>
                </main>
              </div>
            </div>
          </section>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              {renderListingSnapshot("desktop")}
              <section className={SIDEBAR_CARD_CLASS}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Helpful reminders</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  {helpfulReminders.map((tip) => (
                    <li key={tip} className="flex items-start gap-2 rounded-2xl border border-slate-200/70 bg-white/80 px-3 py-2 shadow-sm shadow-emerald-100/30">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-emerald-50 to-sky-50 px-4 py-3 text-sm text-slate-700">
                  Review all sections carefully before submitting for approval.
                </div>
              </section>
              <section className={SIDEBAR_CARD_CLASS}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Make it memorable</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Add nearby experiences, highlight check-in guidance, and mention perks like free breakfast or transport to delight future guests.
                </p>
              </section>
            </div>
          </aside>
        </div>
      </div>

      {/* Submission Success Modal */}
      {showSubmissionSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSubmissionSuccess(false);
              // Add a small delay to ensure the database update is complete, then navigate with cache-busting
              setTimeout(() => {
                window.location.href = `/owner/properties/pending?refresh=${Date.now()}`;
              }, 300);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-300">
            {/* Success Icon */}
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Submitted for Review!
            </h2>

            {/* Message */}
            <div className="space-y-4 mt-6">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <Clock className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-900 mb-1">Review Timeline</p>
                  <p className="text-sm text-emerald-700">
                    Your property will be reviewed by our team within <strong>3-5 business days</strong>. You&apos;ll receive a notification once the review is complete.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">What Happens Next?</p>
                  <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li>Our team will verify all property details</li>
                    <li>We&apos;ll check photos and room specifications</li>
                    <li>You&apos;ll be notified via email when approved</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  You can view your property status in the <strong>Pending Properties</strong> section.
                </p>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => {
                setShowSubmissionSuccess(false);
                // Add a small delay to ensure the database update is complete, then navigate with cache-busting
                setTimeout(() => {
                  window.location.href = `/owner/properties/pending?refresh=${Date.now()}`;
                }, 300);
              }}
              className="w-full mt-6 px-6 py-3 bg-[#02665e] text-white font-semibold rounded-xl hover:bg-[#014e47] transition-colors shadow-sm hover:shadow-md"
            >
              View Pending Properties
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



/** Facilities mini-components */
function AddFacilityInline({ onAdd, existingFacilities = [] }:{ onAdd:(f:NearbyFacility)=>void; existingFacilities?: NearbyFacility[] }) {
  const [type, setType] = useState<FacilityType | "">("");
  const [name, setName] = useState("");
  const [ownership, setOwnership] = useState<"Public/Government"|"Private"|"">("");
  const [distanceKm, setDistanceKm] = useState<number | "">("");
  const [reachableBy, setReachableBy] = useState<ReachMode[]>([]);
  const [url, setUrl] = useState("");

  // Track which facility types are already added
  const addedTypes = new Set(existingFacilities.map(f => f.type));
  const isTypeLocked = (t: FacilityType) => addedTypes.has(t);
  const hasSelection = type !== "";

  // allow multiple selection: toggle presence in array
  const toggleMode = (m: ReachMode) =>
    setReachableBy(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const canAdd = name.trim().length >= 2 && type !== "";
  
  // Validation states
  const [touched, setTouched] = useState<{ name?: boolean; url?: boolean; distance?: boolean }>({});
  const nameError = touched.name && (!name || name.trim().length < 2) ? "Name must be at least 2 characters" : "";
  const urlError = touched.url && url && !/^https?:\/\/.+/.test(url) ? "Please enter a valid URL (starting with http:// or https://)" : "";
  const distanceError = touched.distance && typeof distanceKm === 'number' && distanceKm < 0 ? "Distance cannot be negative" : "";

  const add = () => {
    if (!canAdd || !type) {
      setTouched({ name: true, url: !!url, distance: typeof distanceKm === 'number' });
      return;
    }
    onAdd({
      id: cryptoId(),
      type: type as FacilityType, name, ownership,
      distanceKm,
      reachableBy,
      url: url || undefined,
    });
    // reset
    setType("" as FacilityType | ""); setName(""); setOwnership(""); setDistanceKm(""); setReachableBy([]); setUrl("");
    setTouched({});
  };

  const cancel = () => {
    setType("" as FacilityType | ""); setName(""); setOwnership(""); setDistanceKm(""); setReachableBy([]); setUrl("");
  };

  // Get context-aware placeholder based on selected type
  const namePlaceholder = type ? (FACILITY_PLACEHOLDERS[type as FacilityType] || "e.g. Facility name") : "e.g. Facility name";

  return (
    <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="space-y-5">
        {/* Type section - Modern Card Design with Categories */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 sm:p-6 border-2 border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-teal-600" />
            </div>
            <LabelSmall className="font-semibold text-gray-900 text-sm">Facility Type</LabelSmall>
          </div>
          
          {/* Organized by Categories */}
          <div className="space-y-5">
            {/* Medical Facilities */}
            {(!hasSelection || (hasSelection && ["Hospital", "Pharmacy", "Polyclinic", "Clinic"].includes(type as FacilityType))) && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                    <Hospital className="w-4 h-4 text-rose-600" />
                  </div>
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Medical</span>
                </div>
                <div role="radiogroup" aria-label="Medical facilities" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {["Hospital", "Pharmacy", "Polyclinic", "Clinic"].map(t => {
              const sel = type === t;
                    const locked = isTypeLocked(t as FacilityType);
                    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
                      "Hospital": Hospital,
                      "Pharmacy": Pill,
                      "Polyclinic": Hospital,
                      "Clinic": Hospital,
                    };
                    const Icon = icons[t] || Building2;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                        disabled={locked && !sel}
                  onClick={() => {
                          if (locked && !sel) return;
                          setType(t as FacilityType);
                    setName("");
                    setOwnership("");
                  }}
                        className={`group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all duration-300 ease-out ${
                          locked && !sel
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                            : sel
                            ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 border-emerald-500 shadow-md shadow-emerald-500/20 scale-105'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 transition-colors duration-300 ${sel ? 'text-emerald-600' : locked && !sel ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className="text-xs font-semibold">{t}</span>
                        {sel && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                        )}
                        {locked && !sel && (
                          <div className="absolute top-1 right-1 flex items-center gap-0.5">
                            <Lock className="w-3 h-3 text-amber-500" />
                          </div>
                        )}
                </button>
              );
            })}
          </div>
        </div>
            )}

            {/* Transportation */}
            {(!hasSelection || (hasSelection && ["Airport", "Bus station", "Petrol station", "Main road"].includes(type as FacilityType))) && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Car className="w-4 h-4 text-blue-600" />
              </div>
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Transportation</span>
            </div>
                <div role="radiogroup" aria-label="Transportation facilities" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {["Airport", "Bus station", "Petrol station", "Main road"].map(t => {
                    const sel = type === t;
                    const locked = isTypeLocked(t as FacilityType);
                    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
                      "Airport": Plane,
                      "Bus station": Bus,
                      "Petrol station": Fuel,
                      "Main road": Route,
                    };
                    const Icon = icons[t] || MapPin;
                return (
                  <button
                        key={t}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                        disabled={locked && !sel}
                        onClick={() => {
                          if (locked && !sel) return;
                          setType(t as FacilityType);
                          setName("");
                          setOwnership("");
                        }}
                        className={`group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all duration-300 ease-out ${
                          locked && !sel
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                            : sel
                            ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 border-emerald-500 shadow-md shadow-emerald-500/20 scale-105'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 transition-colors duration-300 ${sel ? 'text-emerald-600' : locked && !sel ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className="text-xs font-semibold">{t}</span>
                        {sel && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                        )}
                        {locked && !sel && (
                          <div className="absolute top-1 right-1 flex items-center gap-0.5">
                            <Lock className="w-3 h-3 text-amber-500" />
                          </div>
                        )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

            {/* Public Services & Venues */}
            {(!hasSelection || (hasSelection && ["Police station", "Conference center", "Stadium"].includes(type as FacilityType))) && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-indigo-600" />
          </div>
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Public Services & Venues</span>
          </div>
                <div role="radiogroup" aria-label="Public services and venues" className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {["Police station", "Conference center", "Stadium"].map(t => {
                    const sel = type === t;
                    const locked = isTypeLocked(t as FacilityType);
                    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
                      "Police station": Shield,
                      "Conference center": BuildingIcon,
                      "Stadium": Building2,
                    };
                    const Icon = icons[t] || MapPin;
            return (
              <button
                        key={t}
                type="button"
                        role="radio"
                aria-checked={sel}
                        disabled={locked && !sel}
                        onClick={() => {
                          if (locked && !sel) return;
                          setType(t as FacilityType);
                          setName("");
                          setOwnership("");
                        }}
                        className={`group relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all duration-300 ease-out ${
                          locked && !sel
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                            : sel
                            ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 border-emerald-500 shadow-md shadow-emerald-500/20 scale-105'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 transition-colors duration-300 ${sel ? 'text-emerald-600' : locked && !sel ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className="text-xs font-semibold">{t}</span>
                        {sel && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                        )}
                        {locked && !sel && (
                          <div className="absolute top-1 right-1 flex items-center gap-0.5">
                            <Lock className="w-3 h-3 text-amber-500" />
                          </div>
                        )}
              </button>
            );
          })}
        </div>
      </div>
            )}
      </div>
          
          {/* Cancel button when type is selected */}
          {hasSelection && (
            <div className="mt-4 flex items-center justify-end">
                <button
                  type="button"
                onClick={cancel}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                Cancel Selection
                </button>
          </div>
          )}
        </div>
        
        {/* Ownership section - Modern Card Design - Only show for Hospital, Pharmacy, Polyclinic, and Clinic */}
        {hasSelection && requiresOwnership(type as FacilityType) && (
          <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-xl p-5 sm:p-6 border-2 border-blue-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <LabelSmall className="font-semibold text-gray-900 text-sm">Ownership Type</LabelSmall>
            </div>
            <div role="radiogroup" aria-label="Ownership" className="grid grid-cols-2 gap-2.5 max-w-md">
              {["Public/Government", "Private"].map(o => {
                const sel = ownership === o;
                return (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    onClick={() => setOwnership(o as any)}
                    className={`group relative text-xs font-semibold px-4 py-2.5 rounded-xl border-2 transition-all duration-300 ease-out text-center ${
                      sel
                        ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 border-emerald-500 shadow-md shadow-emerald-500/20 scale-105'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm'
                    }`}
                  >
                    {o}
                    {sel && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Name, Distance, and More info row - Modern Design - Only show when type is selected */}
        {hasSelection && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Name field */}
          <div className="space-y-2">
            <LabelSmall className="font-semibold text-gray-900 text-xs">Name <span className="text-red-500">*</span></LabelSmall>
            <input
              value={name}
              onChange={e => {
                setName(e.target.value);
                setTouched(prev => ({ ...prev, name: true }));
              }}
              onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
              className={`w-full h-11 px-4 border-2 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                nameError 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                  : 'border-gray-300 focus:ring-emerald-500/20 focus:border-emerald-500'
              }`}
              placeholder={namePlaceholder}
            />
            {nameError && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                {nameError}
              </p>
            )}
          </div>
          
          {/* Distance field */}
          <div className="space-y-2">
            <LabelSmall className="font-semibold text-gray-900 text-xs">Distance (km)</LabelSmall>
            <input
              value={distanceKm as any}
              onChange={e => {
                setDistanceKm(numOrEmpty(e.target.value));
                setTouched(prev => ({ ...prev, distance: true }));
              }}
              onBlur={() => setTouched(prev => ({ ...prev, distance: true }))}
              type="number" 
              step="0.1"
              min="0"
              className={`w-full h-11 px-4 border-2 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                distanceError 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                  : 'border-gray-300 focus:ring-emerald-500/20 focus:border-emerald-500'
              }`}
              placeholder="2.5"
            />
            {distanceError && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                {distanceError}
              </p>
            )}
          </div>
          
          {/* More info field */}
          <div className="space-y-2">
            <LabelSmall className="font-semibold text-gray-900 text-xs">More info (URL)</LabelSmall>
            <input
              value={url}
              onChange={e => {
                setUrl(e.target.value);
                setTouched(prev => ({ ...prev, url: true }));
              }}
              onBlur={() => setTouched(prev => ({ ...prev, url: true }))}
              type="url"
              className={`w-full h-11 px-4 border-2 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                urlError 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                  : 'border-gray-300 focus:ring-emerald-500/20 focus:border-emerald-500'
              }`}
              placeholder="https://example.com"
            />
            {urlError && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                {urlError}
              </p>
            )}
            {!urlError && url && (
              <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                <CheckCircle2 className="h-3 w-3" />
                Valid URL format
              </p>
            )}
          </div>
        </div>
        )}

      {hasSelection && (
      <div className="mt-6 pt-6 border-t border-gray-200">
        <LabelSmall className="font-semibold text-gray-900 text-sm mb-3">Reachable by</LabelSmall>
        <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="Reachable by">
          {REACH_MODES.map(m => {
            const sel = reachableBy.includes(m);
            const Icon = REACH_ICONS[m as string];
            return (
              <button
                key={m}
                type="button"
                role="checkbox"
                aria-checked={sel}
                onClick={() => toggleMode(m)}
                className={`group relative w-full text-xs font-semibold px-3 py-2.5 rounded-xl border-2 flex items-center justify-center gap-2 transition-all duration-300 ${
                  sel 
                    ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 border-emerald-500 shadow-md shadow-emerald-500/20' 
                    : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm'
                }`}
              >
                {Icon ? <Icon className={`h-4 w-4 flex-shrink-0 transition-colors duration-300 ${sel ? 'text-emerald-600' : 'text-gray-500'}`} aria-hidden /> : null}
                <span className="truncate">{m}</span>
                {sel && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {hasSelection && (
      <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end gap-3">
        <button 
          type="button" 
          onClick={cancel}
          className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={add}
          disabled={!canAdd}
          className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            canAdd 
              ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg active:scale-95" 
              : "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300"
          }`}
        >
          Add facility
        </button>
        {!canAdd && touched.name && (
          <p className="text-xs text-red-600 flex items-center gap-1 mt-2">
            <AlertCircle className="h-3 w-3" />
            Please fill in all required fields correctly
          </p>
        )}
      </div>
      )}
      </div>
    </div>
  );
}

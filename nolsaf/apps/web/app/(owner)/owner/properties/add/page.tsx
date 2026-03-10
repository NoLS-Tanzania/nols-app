"use client";
import type { ReactNode } from "react";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { twMerge } from "tailwind-merge";
import { Plus, Eye, Home, Building, Building2, TreePine, Hotel, HelpCircle, Car, Shield, Bus, Bed, BedDouble, BedSingle, CheckCircle2, AlertCircle, MapPin, Users, X, ArrowRight, ImageIcon, Loader2, Hospital, Pill, Plane, Fuel, Route, Building as BuildingIcon, Lock, ExternalLink, Edit2, Clock, Bell } from "lucide-react";
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
  "Villa":       { border: "border-blue-400",    leftBorder: "border-l-blue-400",    text: "text-blue-400",    bg: "from-[#1c2128] to-blue-900/30",    hoverBorder: "hover:border-blue-400" },
  "Apartment":   { border: "border-purple-400",  leftBorder: "border-l-purple-400",  text: "text-purple-400",  bg: "from-[#1c2128] to-purple-900/30",  hoverBorder: "hover:border-purple-400" },
  "Hotel":       { border: "border-amber-400",   leftBorder: "border-l-amber-400",   text: "text-amber-400",   bg: "from-[#1c2128] to-amber-900/30",   hoverBorder: "hover:border-amber-400" },
  "Lodge":       { border: "border-green-400",   leftBorder: "border-l-green-400",   text: "text-green-400",   bg: "from-[#1c2128] to-green-900/30",   hoverBorder: "hover:border-green-400" },
  "Condo":       { border: "border-indigo-400",  leftBorder: "border-l-indigo-400",  text: "text-indigo-400",  bg: "from-[#1c2128] to-indigo-900/30",  hoverBorder: "hover:border-indigo-400" },
  "Guest House": { border: "border-pink-400",    leftBorder: "border-l-pink-400",    text: "text-pink-400",    bg: "from-[#1c2128] to-pink-900/30",    hoverBorder: "hover:border-pink-400" },
  "Bungalow":    { border: "border-orange-400",  leftBorder: "border-l-orange-400",  text: "text-orange-400",  bg: "from-[#1c2128] to-orange-900/30",  hoverBorder: "hover:border-orange-400" },
  "Cabin":       { border: "border-emerald-400", leftBorder: "border-l-emerald-400", text: "text-emerald-400", bg: "from-[#1c2128] to-emerald-900/30", hoverBorder: "hover:border-emerald-400" },
  "Homestay":    { border: "border-rose-400",    leftBorder: "border-l-rose-400",    text: "text-rose-400",    bg: "from-[#1c2128] to-rose-900/30",    hoverBorder: "hover:border-rose-400" },
  "Townhouse":   { border: "border-cyan-400",    leftBorder: "border-l-cyan-400",    text: "text-cyan-400",    bg: "from-[#1c2128] to-cyan-900/30",    hoverBorder: "hover:border-cyan-400" },
  "House":       { border: "border-teal-400",    leftBorder: "border-l-teal-400",    text: "text-teal-400",    bg: "from-[#1c2128] to-teal-900/30",    hoverBorder: "hover:border-teal-400" },
  "Other":       { border: "border-slate-400",   leftBorder: "border-l-slate-400",   text: "text-slate-400",   bg: "from-[#1c2128] to-slate-800/40",   hoverBorder: "hover:border-slate-400" },
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
type FacilityType =
  | "Hospital"
  | "Pharmacy"
  | "Polyclinic"
  | "Clinic"
  | "Police station"
  | "Airport"
  | "Bus station"
  | "Petrol station"
  | "Conference center"
  | "Stadium"
  | "Main road";
const REACH_MODES = ["Walking","Boda","Public Transport","Car/Taxi"] as const;
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

const MAX_ACCEPTABLE_DETECTION_ACCURACY_M = 1500;

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
  const [runtimeToken, setRuntimeToken] = useState('');
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const watchTimeoutRef = useRef<number | null>(null);
  const lastEmitRef = useRef<{ lat: number; lng: number; accuracy: number; t: number } | null>(null);
  const lastAccuracyUiRef = useRef<{ accuracy: number; t: number } | null>(null);
  const isMountedRef = useRef(true);
  const onLocationDetectedRef = useRef(onLocationDetected);
  useEffect(() => { onLocationDetectedRef.current = onLocationDetected; });
  const hasAutoDetectedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (watchTimeoutRef.current !== null) {
        clearTimeout(watchTimeoutRef.current);
        watchTimeoutRef.current = null;
      }
      if (watchIdRef.current !== null) {
        try {
          navigator.geolocation?.clearWatch(watchIdRef.current);
        } catch {
          // ignore
        }
        watchIdRef.current = null;
      }
    };
  }, []);

  // Fetch the Mapbox token at runtime. NEXT_PUBLIC_* vars are baked at
  // build time, so a freshly-set env var on the host won't appear until
  // a rebuild. This API route reads process.env server-side at request time.
  useEffect(() => {
    fetch('/config/map-token')
      .then(r => r.json())
      .then(d => { if (d.token) setRuntimeToken(d.token); })
      .catch(() => {});
  }, []);

  // Detect location using watchPosition for progressive GPS accuracy
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    // Stop any previous watch + timer
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (watchTimeoutRef.current !== null) {
      clearTimeout(watchTimeoutRef.current);
      watchTimeoutRef.current = null;
    }

    lastEmitRef.current = null;
    lastAccuracyUiRef.current = null;

    setIsDetectingLocation(true);
    setLocationError(null);
    setLocationAccuracy(null);

    // Auto-stop after 60 s. If we still can't reach <=50 m,
    // do NOT commit an imprecise location.
    watchTimeoutRef.current = window.setTimeout(() => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      const lastAcc = lastAccuracyUiRef.current?.accuracy;
      if (isMountedRef.current) {
        setIsDetectingLocation(false);
        if (typeof lastAcc === 'number' && Number.isFinite(lastAcc) && lastAcc > 50) {
          setLocationError(`GPS accuracy is still ±${lastAcc}m. Please wait for ≤50m, then try again (or drag the map to pin your exact building).`);
        } else {
          setLocationError('Unable to get a precise GPS fix. Please try again (or drag the map to pin your exact building).');
        }
      }

      watchTimeoutRef.current = null;
    }, 60000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        const accuracy = position.coords.accuracy;
        const accuracyRounded = Math.round(accuracy);
        const now = Date.now();

        // Update the accuracy UI, but throttle it to avoid excessive re-renders.
        const lastUi = lastAccuracyUiRef.current;
        const shouldUpdateAccuracyUi =
          !lastUi ||
          now - lastUi.t >= 600 ||
          Math.abs(accuracyRounded - lastUi.accuracy) >= 15;
        if (shouldUpdateAccuracyUi) {
          lastAccuracyUiRef.current = { accuracy: accuracyRounded, t: now };
          if (isMountedRef.current) setLocationAccuracy(accuracyRounded);
        }

        // Strict mode: only accept/save a fix once accuracy is <= 50 m.
        // This prevents pinning a coarse cell-tower/IP location (e.g., ±212 m).
        if (accuracy > 50) return;

        // Commit coordinates
        if (onLocationDetectedRef.current) {
          onLocationDetectedRef.current(lat, lng);
        }

        // Re-center map once (final)
        if (mapRef.current) {
          const targetZoom = accuracy > 2000 ? 11 : accuracy > 500 ? 13 : accuracy > 100 ? 15 : 17;
          mapRef.current.easeTo({
            center: [lng, lat],
            zoom: targetZoom,
            duration: 900,
            essential: true,
          });
        }

        // Stop watchers
        if (watchTimeoutRef.current !== null) {
          clearTimeout(watchTimeoutRef.current);
          watchTimeoutRef.current = null;
        }
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        if (isMountedRef.current) setIsDetectingLocation(false);

      },
      (error) => {
        if (watchTimeoutRef.current !== null) {
          clearTimeout(watchTimeoutRef.current);
          watchTimeoutRef.current = null;
        }
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        if (isMountedRef.current) setIsDetectingLocation(false);

        let errorMsg = 'Failed to get your location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location access denied. Please enable location permissions in your browser.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location unavailable. Try on mobile with GPS enabled.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'GPS timed out. Drag the map manually to your property.';
        }
        if (isMountedRef.current) setLocationError(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 5000,
      }
    );
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const containerEl = containerRef.current;
    if (!containerEl) return;
    let cancelled = false;

    // Check if coordinates are default/unset - if so, try auto-detection once
    const hasDefaultCoords = (!Number.isFinite(latitude) || !Number.isFinite(longitude)) ||
                             (latitude === 0 && longitude === 0) ||
                             (Math.abs(latitude) < 0.001 && Math.abs(longitude) < 0.001);

    // Auto-detect on first load only — GPS callback drives the re-render with real coords
    if (hasDefaultCoords && !hasAutoDetectedRef.current) {
      hasAutoDetectedRef.current = true;
      if (navigator.geolocation) {
        setTimeout(() => { detectLocation(); }, 300);
      }
      // Don't initialize map at [0,0] — wait for real GPS coords from parent
      return;
    }

    // GPS was already attempted but came back empty or failed — don't show a [0,0] ocean map
    if (hasDefaultCoords) {
      return;
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
      runtimeToken ||
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
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [exactLng, exactLat],
          zoom: 17,
          interactive: true,
          dragRotate: false,   // no 3-D tilt — keeps map flat for property pinning
          pitchWithRotate: false,
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
          locateIcon.setAttribute('stroke', '#02665e');
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
          pinPath.setAttribute('fill', '#ef4444'); // Red - standard GPS pin colour
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
            if (onLocationDetectedRef.current) {
              onLocationDetectedRef.current(centerLat, centerLng);
            }
          };
          
          // Listen to map move events to update coordinates
          map.on('moveend', updateCenterCoordinates);
          map.on('dragend', updateCenterCoordinates);

          // If postcode is provided, try to geocode it and verify/adjust location
          if (postcode) {
            // First, try to geocode the postcode to get coordinates
            fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(postcode)}.json?access_token=${token}&types=postcode,place`)
              .then(res => res.json())
              .then(data => {
                if (data.features && data.features.length > 0) {
                  const postcodeCoords = data.features[0].center; // [lng, lat]
                  const distance = Math.sqrt(
                    Math.pow(postcodeCoords[0] - exactLng, 2) + 
                    Math.pow(postcodeCoords[1] - exactLat, 2)
                  ) * 111; // Approximate km
                  
                  // Postcode distance check — gap >5 km is common in Tanzania
                  // (admin postcode areas are large); GPS coords are correct.
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

        // CSS already loaded globally via styles/globals.css @import
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
  // isDetectingLocation intentionally excluded from deps — it is UI-only state
  // and must NOT trigger a full map re-init every time GPS starts/stops.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, postcode, detectLocation, runtimeToken]);

  return (
    <div className="w-full">
      <div className="relative">
      <div 
        ref={containerRef} 
        className="w-full h-80 sm:h-[440px] min-h-[320px] rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm bg-gray-50"
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
      <div className="mt-2 space-y-1.5">

        {/* Detecting — show live accuracy progress */}
        {isDetectingLocation && (
          <div className="flex items-center gap-2 text-xs text-[#02665e] font-medium">
            <div className="w-3.5 h-3.5 border-2 border-[#02665e] border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <span>
              {locationAccuracy !== null
                ? `Refining GPS… accuracy ±${locationAccuracy} m`
                : 'Requesting GPS signal…'}
            </span>
          </div>
        )}

        {/* Coordinates + accuracy badge once we have a fix */}
        {!isDetectingLocation && Number.isFinite(latitude) && Number.isFinite(longitude) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Location pinned
              {locationAccuracy !== null && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                  ±{locationAccuracy} m
                </span>
              )}
            </span>
            <span className="text-gray-400">{Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}</span>
          </div>
        )}

        {/* Drag hint */}
        {Number.isFinite(latitude) && Number.isFinite(longitude) && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span>Drag the map to fine-tune the pin to your exact building</span>
          </div>
        )}

        {/* No location yet */}
        {!isDetectingLocation && !Number.isFinite(latitude) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5 text-[#02665e]" />
            <span>Tap the <span className="font-semibold text-[#02665e]">locate button</span> on the map to auto-detect your location</span>
          </div>
        )}

        {/* Error */}
        {locationError && (
          <div className="text-xs text-rose-600 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{locationError}</span>
          </div>
        )}

        {postcode && (
          <div className="text-xs text-slate-500">Postcode: <span className="text-[#02665e] font-medium">{postcode}</span></div>
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
  const checkAbortRef = useRef<AbortController | null>(null);
  const DRAFT_STORAGE_KEY = 'property_draft';
  const [showResumeDraft, setShowResumeDraft] = useState(false);
  const [localDraft, setLocalDraft] = useState<any | null>(null);
  const [serverDrafts, setServerDrafts] = useState<Array<{ id: number; title?: string; updatedAt?: string }>>([]);
  
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
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
  // pin/region consistency
  const [pinRegionMismatch, setPinRegionMismatch] = useState<string | null>(null);
  const [checkingPinLocation, setCheckingPinLocation] = useState(false);
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
    const s = new Set(arr);
    if (s.has(v)) s.delete(v);
    else s.add(v);
    setArr(Array.from(s));
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
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      missing.push('Exact location pin (drag the map)');
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


  // ── Reverse-geocoding pin-vs-region consistency check ─────────────────────
  // Called whenever the owner moves the map pin.  Calls Mapbox reverse-
  // geocoding and compares the returned region name to the selected regionId.
  // A mismatch sets a warning banner and also blocks final submission.
  async function checkPinConsistency(lat: number, lng: number): Promise<void> {
    if (!regionId) { setPinRegionMismatch(null); return; }

    // Cancel any previous in-flight request to avoid stale results
    if (checkAbortRef.current) checkAbortRef.current.abort();
    const controller = new AbortController();
    checkAbortRef.current = controller;

    const token =
      (process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string) ||
      (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string) ||
      '';
    if (!token) return;

    setCheckingPinLocation(true);
    setPinRegionMismatch(null);

    try {
      // Ask for "region" and "place" types so we get the administrative region back
      const url =
        'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
        lng + ',' + lat +
        '.json?types=region,place&limit=1&access_token=' + token;
      const resp = await fetch(url, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!resp.ok) { setCheckingPinLocation(false); return; }

      const data = await resp.json();
      const feature = data.features?.[0];
      if (!feature) { setCheckingPinLocation(false); return; }

      const contexts: Array<{ id: string; text: string }> = feature.context || [];
      // Collect all text labels (feature + all parent contexts)
      const allTexts: string[] = [
        feature.text || '',
        ...contexts.map((ctx: any) => String(ctx.text || '')),
      ];
      const combinedLower = allTexts.join(' ').toLowerCase();

      // Normalise selected regionId for word-level comparison
      // "DAR-ES-SALAAM" → ["dar", "es", "salaam"]; "ARUSHA" → ["arusha"]
      const selectedWords: string[] = regionId
        .toLowerCase()
        .replace(/-/g, ' ')
        .split(/\s+/)
        .filter((w: string) => w.length > 1);

      const mismatch =
        selectedWords.length > 0 &&
        !selectedWords.every((w: string) => combinedLower.includes(w));

      if (mismatch) {
        // Pick the most descriptive Mapbox label to show in the inline warning
        const regionCtxText: string =
          contexts.find((ctx) => ctx.id?.startsWith('region'))?.text ||
          contexts.find((ctx) => ctx.id?.startsWith('place'))?.text ||
          feature.text ||
          'an unknown area';
        // Pretty-format the selected region (e.g. "Dar Es Salaam")
        const selectedLabel: string = (regionName || regionId.replace(/-/g, ' '))
          .toLowerCase()
          .replace(/\b\w/g, (ch: string) => ch.toUpperCase());
        setPinRegionMismatch(
          'Your pin appears to be in "' + regionCtxText +
          '" \u2014 you selected region "' + selectedLabel + '". ' +
          'Please move the pin to match your selected region, or update your Region selection.'
        );
      } else {
        setPinRegionMismatch(null);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // cancelled — ignore
      setPinRegionMismatch(null); // network failure — fail open (do not block)
    } finally {
      if (!controller.signal.aborted) setCheckingPinLocation(false);
    }
  }

  // Re-run whenever the pin or the selected Region changes
  useEffect(() => {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      setPinRegionMismatch(null);
      return;
    }
    if (latitude === 0 && longitude === 0) { setPinRegionMismatch(null); return; }
    // checkPinConsistency reads regionId + regionName from its closure;
    // those are listed in deps so the effect re-runs when region selection changes.
    checkPinConsistency(latitude, longitude);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, regionId]);

  const goToNextStep = () => {
    if (currentStep < 5) {
      if (currentStep === 0) {
        const ok = validateBasics();
        if (!ok) return;
      }
      if (currentStep === 1 && definedRooms.length < 1) {
        alert('Please add at least one room type before continuing.');
        return;
      }
      if (currentStep === 2 && !servicesCompleted) {
        alert('Please complete the Services section before continuing.');
        return;
      }
      if (currentStep === 3 && !totalsCompleted) {
        alert('Please complete the Totals & Description section before continuing.');
        return;
      }
      if (currentStep === 4 && photos.length < 3) {
        alert(`Please add at least 3 photos (${photos.length}/3 added).`);
        return;
      }
      const nextStep = currentStep + 1;
      setVisitedSteps(prev => new Set([...prev, nextStep]));
      setCurrentStep(nextStep);
      scrollToStep(nextStep, true);
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
    // Validate the current step before any forward jump
    if (!skipValidation && i > currentStep) {
      if (currentStep === 0) {
        const ok = validateBasics();
        if (!ok) return;
      } else if (currentStep === 1 && definedRooms.length < 1) {
        alert('Please add at least one room type before continuing.');
        return;
      } else if (currentStep === 2 && !servicesCompleted) {
        alert('Please complete the Services section before continuing.');
        return;
      } else if (currentStep === 3 && !totalsCompleted) {
        alert('Please complete the Totals & Description section before continuing.');
        return;
      } else if (currentStep === 4 && photos.length < 3) {
        alert(`Please add at least 3 photos (${photos.length}/3 added).`);
        return;
      }
    }
    // Mark step as visited
    setVisitedSteps(prev => new Set([...prev, i]));
    setCurrentStep(i);
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
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    photos.length >= 3 &&
    definedRooms.length >= 1 &&
    // if this is a Hotel, ensure a star rating was chosen
    (!isHotel || (typeof hotelStar === "string" && hotelStar !== ""));


  function submitForReview() {
    if (!completeEnough) {
      const missing = [
        !(title.trim().length >= 3) ? "name" : null,
        !regionId ? "location" : null,
        (typeof latitude !== 'number' || typeof longitude !== 'number') ? "exact location pin" : null,
        !(photos.length >= 3) ? "≥3 photos" : null,
        !(definedRooms.length >= 1) ? "≥1 room type" : null,
        (isHotel && (!hotelStar || hotelStar === "")) ? "hotel star rating" : null,
      ].filter(Boolean);
      alert("Please complete: " + missing.join(", ") + ".");
      return;
    }
    if (pinRegionMismatch && typeof latitude === "number" && typeof longitude === "number") {
      alert(
        "Your map pin does not match the selected region.\n\n" +
        pinRegionMismatch + "\n\n" +
        "Please move the pin to your property's exact location before submitting."
      );
      scrollToStep(0);
      return;
    }
    setShowSubmitConfirm(true);
  }

  async function executeSubmit() {
    setShowSubmitConfirm(false);
    try {
      let id: number | null = null;
      let createResponse: any = null;
      if (propertyId) {
        await api.put(`/api/owner/properties/${propertyId}`, payload());
        id = propertyId;
      } else {
        createResponse = await api.post("/api/owner/properties", payload());
        id = (createResponse.data as { id: number })?.id;
        if (id) {
          setPropertyId(id);
        } else {
          const fetchedId = await refetchLatestId();
          if (fetchedId) { id = fetchedId; setPropertyId(fetchedId); }
        }
      }
      if (!id || !Number.isFinite(id)) {
        alert("Error: Could not determine property ID. Please try again.");
        return;
      }
      const resp = await api.post(`/api/owner/properties/${id}/submit`);
      if (resp.status === 200 || resp.status === 204) {
        clearDraft();
        setShowSubmissionSuccess(true);
      } else {
        alert("Unexpected response: " + resp.status);
      }
    } catch (e:any) {
      const data = e?.response?.data;
      const url = e?.config?.url || "unknown";
      const method = e?.config?.method?.toUpperCase() || "unknown";
      const status = e?.response?.status;
      const err = data?.error ?? data ?? e?.message ?? "Submit failed";
      const errorMsg = typeof err === "string" ? err : JSON.stringify(err, null, 2);
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
    { index: 0, title: "Basic details", completed: title.trim().length >= 3 && !!regionId && !!district && typeof latitude === 'number' && typeof longitude === 'number' },
    { index: 1, title: "Rooms", completed: definedRooms.length >= 1 },
    { index: 2, title: "Services", completed: servicesCompleted },
    { index: 3, title: "Totals", completed: totalsCompleted },
    { index: 4, title: "Photos", completed: photos.length >= 3 },
    { index: 5, title: "Review", completed: false },
  ] as const;

  const completedStepsCount = stepsMeta.filter((s) => s.completed).length;
  const nextStepTitle = stepTitles[currentStep + 1] || null;
  const totalDefinedRooms = definedRooms.reduce((sum, room) => sum + (Number(room?.roomsCount) || 0), 0);
  const totalBedsAcrossRooms = definedRooms.reduce((sum, room) => {
    const counts = room?.beds || {};
    const perRoomBeds = (Number(counts?.twin) || 0) + (Number(counts?.full) || 0) + (Number(counts?.queen) || 0) + (Number(counts?.king) || 0);
    return sum + perRoomBeds * (Number(room?.roomsCount) || 0);
  }, 0);
  const photosNeeded = Math.max(0, 5 - photos.length);
  const hasHotelStar = !isHotel || (typeof hotelStar === "string" && hotelStar !== "");


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
              <header className="add-property-stepper-header">
                <div style={{ pointerEvents: "none", position: "absolute", inset: 0, overflow: "hidden" }} aria-hidden>
                  <div style={{ position: "absolute", top: "-3rem", right: 0, height: "13rem", width: "13rem", transform: "translateX(33%)", borderRadius: "9999px", background: "rgba(255,255,255,0.04)", filter: "blur(40px)" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, height: "10rem", width: "10rem", transform: "translate(-25%, 25%)", borderRadius: "9999px", background: "rgba(0,0,0,0.08)", filter: "blur(40px)" }} />
                </div>
                <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <span className="ap-badge">
                          <Plus style={{ width: "1rem", height: "1rem" }} />
                          Listing builder
                        </span>
                        {autoSaveStatus !== "idle" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", borderRadius: "9999px", border: "1px solid", padding: "0.25rem 0.625rem", fontSize: "0.6875rem", fontWeight: 500, borderColor: autoSaveStatus === "saving" ? "rgba(255,255,255,0.2)" : autoSaveStatus === "saved" ? "rgba(110,231,183,0.4)" : "rgba(252,165,165,0.4)", background: autoSaveStatus === "saving" ? "rgba(255,255,255,0.1)" : autoSaveStatus === "saved" ? "rgba(110,231,183,0.12)" : "rgba(252,165,165,0.12)", color: autoSaveStatus === "saving" ? "rgba(255,255,255,0.9)" : autoSaveStatus === "saved" ? "#6ee7b7" : "#fca5a5" }}>
                            {autoSaveStatus === "saving" ? (<><span style={{ width: "0.75rem", height: "0.75rem", border: "2px solid rgba(255,255,255,0.5)", borderTopColor: "transparent", borderRadius: "9999px", display: "inline-block", animation: "spin 0.7s linear infinite" }} />Saving</>) : autoSaveStatus === "saved" ? (<><CheckCircle2 style={{ width: "0.875rem", height: "0.875rem" }} /> Saved</>) : (<><AlertCircle style={{ width: "0.875rem", height: "0.875rem" }} /> Save failed</>)}
                          </span>
                        ) : null}
                      </div>
                      <p className="ap-label">Add property</p>
                      <h1 className="ap-title">{currentStepTitle}</h1>
                      <div className="ap-meta">
                        <span>Step <span className="ap-meta-hi">{currentStep + 1}</span> of <span className="ap-meta-hi">{stepTitles.length}</span></span>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><CheckCircle2 style={{ width: "0.875rem", height: "0.875rem", color: "#6ee7b7" }} />{completedStepsCount} completed</span>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><Eye style={{ width: "0.875rem", height: "0.875rem", color: "rgba(255,255,255,0.4)" }} />{visitedSteps.size} visited</span>
                        {nextStepTitle ? (<span className="ap-meta-accent" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><ArrowRight style={{ width: "0.875rem", height: "0.875rem" }} />Next: {nextStepTitle}</span>) : null}
                        <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><span className="dot-spinner dot-sm" aria-hidden><span className="dot dot-blue" /><span className="dot dot-black" /><span className="dot dot-yellow" /><span className="dot dot-green" /></span>{stepProgressPct}% journey</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                      {(() => { const r = 28; const circ = +(2 * Math.PI * r).toFixed(2); const offset = +(circ - (stepProgressPct / 100) * circ).toFixed(2); return (
                        <svg width="76" height="76" viewBox="0 0 76 76">
                          <circle cx="38" cy="38" r="28" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
                          <circle cx="38" cy="38" r="28" fill="none" stroke="#6ee7b7" strokeWidth="5" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transform: "rotate(-90deg)", transformOrigin: "38px 38px", transition: "stroke-dashoffset 0.5s ease" }} />
                          <text x="38" y="35" textAnchor="middle" fontSize="12" fontWeight="700" fill="rgba(255,255,255,0.6)" letterSpacing="1">%</text>
                          <text x="38" y="50" textAnchor="middle" fontSize="16" fontWeight="800" fill="white">{stepProgressPct}</text>
                        </svg>
                      ); })()}
                      {title.trim().length >= 3 ? (<button type="button" onClick={() => setShowLivePreview(true)} aria-label="Live preview" title="Live preview" style={{ display: "inline-flex", height: "1.75rem", width: "1.75rem", alignItems: "center", justifyContent: "center", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", color: "#ffffff", cursor: "pointer" }}><Eye style={{ width: "0.875rem", height: "0.875rem" }} aria-hidden /></button>) : null}
                    </div>
                  </div>
                  <div>
                    <div className="ap-progress-track">
                      <div className="ap-progress-fill" style={{ width: `${stepProgressPct}%` }} />
                    </div>
                    <div style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
                      <span className="ap-chip"><Home style={{ width: "0.875rem", height: "0.875rem", color: "#6ee7b7" }} />{totalDefinedRooms} rooms set</span>
                      <span className="ap-chip"><Bed style={{ width: "0.875rem", height: "0.875rem", color: "#7dd3fc" }} />{totalBedsAcrossRooms} beds mapped</span>
                      <span className="ap-chip"><ImageIcon style={{ width: "0.875rem", height: "0.875rem", color: "#fcd34d" }} />{photos.length} photos added</span>
                    </div>
                  </div>
                  <svg aria-hidden="true" viewBox="0 0 400 28" preserveAspectRatio="none" style={{ width: "100%", height: "1.75rem", display: "block", opacity: 0.18 }}><polyline points="0,22 40,14 80,20 120,8 160,18 200,4 240,16 280,10 320,20 360,6 400,18" fill="none" stroke="white" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" /><polyline points="0,26 40,20 80,24 120,16 160,23 200,12 240,21 280,17 320,24 360,14 400,23" fill="none" stroke="white" strokeWidth="0.75" strokeLinejoin="round" strokeLinecap="round" /></svg>
                  <nav style={{ overflowX: "auto" }} aria-label="Steps">
                    <ol style={{ display: "flex", minWidth: "100%", alignItems: "stretch", gap: "0.5rem", paddingBottom: "0.25rem" }}>
                      {stepsMeta.map((s, idx) => {
                        const isActive = currentStep === s.index;
                        const isPast = currentStep > s.index;
                        const isVisited = visitedSteps.has(s.index);
                        const isCompleted = s.completed && isPast;
                        const canJump = isVisited || s.index === currentStep;
                        return (
                          <li key={s.index} style={{ display: "flex", alignItems: "center" }}>
                            <button type="button" disabled={!canJump} onClick={() => scrollToStep(s.index)} className={`ap-step-pill${isActive ? " is-active" : ""}`} aria-current={isActive ? "step" : undefined}>
                              <span className={`ap-step-circle${isActive ? " is-active" : isCompleted ? " is-completed" : ""}`}>{isCompleted ? "✓" : s.index + 1}</span>
                              <span style={{ minWidth: 0, flex: 1 }}>
                                <span className="ap-step-name">{s.title}</span>
                                <span className="ap-step-status">{isCompleted ? "Completed" : isActive ? "In progress" : isVisited ? "Visited" : "Pending"}</span>
                              </span>
                            </button>
                            {idx < stepsMeta.length - 1 ? <span className="ap-step-sep" aria-hidden /> : null}
                          </li>
                        );
                      })}
                    </ol>
                  </nav>
                </div>
              </header>
              <div className="p-4 sm:p-6 md:p-8">
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

      {/* Custom submission confirmation modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSubmitConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#02665e] to-emerald-600 px-6 pt-6 pb-5 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 mb-3">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
              </div>
              <h2 className="text-base font-bold leading-tight">Submit for review?</h2>
              <p className="mt-1 text-sm text-emerald-100">You won&apos;t be able to edit while it&apos;s pending approval.</p>
            </div>
            {/* Body */}
            <div className="px-6 py-4 text-sm text-slate-600 space-y-2">
              <div className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                <span>Our team will verify your property details</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                <span>You&apos;ll be notified by email once approved</span>
              </div>
            </div>
            {/* Actions */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSubmit}
                className="flex-1 rounded-xl bg-[#02665e] py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#014e47]"
              >
                Yes, submit
              </button>
            </div>
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



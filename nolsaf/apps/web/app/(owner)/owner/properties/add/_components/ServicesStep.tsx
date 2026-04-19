"use client";

import { useMemo } from "react";
import {
  Bandage,
  Beer,
  Building2,
  Car,
  Coffee,
  Dumbbell,
  FireExtinguisher,
  Gamepad,
  MapPin,
  Package,
  PartyPopper,
  Shield,
  ShoppingBag,
  Store,
  Thermometer,
  Waves,
  WashingMachine,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { AddPropertySection } from "./AddPropertySection";
import { StepFooter } from "./StepFooter";

function IconOr({ Icon, className }: { Icon: any; className?: string }) {
  if (!Icon) return <span className={className} aria-hidden />;
  return <Icon className={className} />;
}

// Service tooltips for better UX
const SERVICE_TOOLTIPS: Record<string, string> = {
  parking: "Select parking availability. If paid, enter the daily rate.",
  breakfastIncluded: "Breakfast is included in the room price",
  breakfastAvailable: "Breakfast is available for an additional charge",
  restaurant: "On-site restaurant available for guests",
  bar: "Bar or lounge area available for guests",
  pool: "Swimming pool available on the property",
  sauna: "Sauna or steam room available",
  laundry: "Laundry service available for guests",
  roomService: "Room service available for food and other requests",
  security24: "24/7 security personnel on-site",
  firstAid: "First aid kit or medical assistance available",
  fireExtinguisher: "Fire extinguishers and fire safety equipment available",
  onSiteShop: "Shop or convenience store on the property",
  nearbyMall: "Shopping mall nearby the property",
  socialHall: "Social hall or event space available",
  sportsGames: "Sports facilities or game room available",
  gym: "Gym or fitness center available on-site",
};

export function ServicesStep({
  isVisible,
  sectionRef,
  currentStep,
  goToPreviousStep,
  goToNextStep,
  services,
  setServices,
  numOrEmpty,
  nearbyFacilities,
  setNearbyFacilities,
  AddFacilityInline,
  FacilityRow,
  servicesCompleted,
}: {
  isVisible: boolean;
  sectionRef: (el: HTMLElement | null) => void;
  currentStep: number;
  goToPreviousStep: () => void;
  goToNextStep: () => void;
  services: any;
  setServices: (updater: (prev: any) => any) => void;
  numOrEmpty: (v: any) => number | "";
  nearbyFacilities: any[];
  setNearbyFacilities: (updater: (prev: any[]) => any[]) => void;
  AddFacilityInline: React.ComponentType<{ onAdd: (f: any) => void; existingFacilities?: any[] }>;
  FacilityRow: React.ComponentType<{ facility: any; onChange: (f: any) => void; onRemove: () => void }>;
  servicesCompleted: boolean;
}) {
  // Calculate selected services count
  const selectedServicesCount = useMemo(() => {
    const s: any = services || {};
    let count = 0;
    if (s.parking && s.parking !== "no") count++;
    if (s.breakfastIncluded) count++;
    if (s.breakfastAvailable) count++;
    if (s.restaurant) count++;
    if (s.bar) count++;
    if (s.pool) count++;
    if (s.sauna) count++;
    if (s.laundry) count++;
    if (s.roomService) count++;
    if (s.security24) count++;
    if (s.firstAid) count++;
    if (s.fireExtinguisher) count++;
    if (s.onSiteShop) count++;
    if (s.nearbyMall) count++;
    if (s.socialHall) count++;
    if (s.sportsGames) count++;
    if (s.gym) count++;
    return count;
  }, [services]);

  return (
    <AddPropertySection
      as="section"
      sectionRef={sectionRef}
      isVisible={isVisible}
      className="add-property-section-premium rounded-[32px] p-4 sm:p-6"
    >
      {isVisible && (
        <div className="w-full">
          {/* ── Premium Header Card ── */}
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#013d38] via-[#014e47] to-[#02665e] p-6 sm:p-8 shadow-2xl shadow-black/20">
            {/* Decorative dot grid */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
            {/* Decorative gradient orb */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative z-10">
              {/* Step badge row */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white font-bold text-[#02665e] text-sm shadow-lg shadow-black/15">
                  3
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-white/25 via-sky-300/20 to-transparent" />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-300 animate-pulse" />
                  Step 3 of 5
                </span>
              </div>

              {/* Title */}
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                Services & <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-emerald-300">Facilities</span>
              </h2>

              {/* Description with accent border */}
              <div className="flex items-start gap-3 mt-3">
                <div className="mt-1 h-10 w-1 flex-shrink-0 rounded-full bg-gradient-to-b from-sky-400 to-emerald-400" />
                <p className="text-sm leading-relaxed text-white/70">
                  Select the services and amenities available at your property. Highlight what makes your place special for guests — from parking to dining, wellness to safety.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-6 pt-4">
            {/* Completion Status Indicator - Modern Card Design */}
            {/* ── Status Bar ── */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#013d38] to-[#014e47] px-5 py-4 shadow-md">
              <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
              <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold transition-all duration-300 ${
                    servicesCompleted
                      ? "bg-white text-[#02665e] shadow-lg shadow-black/15"
                      : "bg-white/15 text-white/70"
                  }`}>
                    {selectedServicesCount}
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-white">Services selected</span>
                    <span className="text-xs text-gray-500">
                      {servicesCompleted ? (
                        <span className="flex items-center gap-1 font-semibold text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> All set — looking great
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-medium text-white/40">
                          <AlertCircle className="w-3 h-3 text-amber-400" /> Select at least one service
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold ${
                  servicesCompleted
                    ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
                    : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                }`}>
                  {servicesCompleted ? (
                    <><CheckCircle2 className="w-3.5 h-3.5" /> Ready</>
                  ) : (
                    <><AlertCircle className="w-3.5 h-3.5" /> Optional</>
                  )}
                </div>
              </div>
            </div>



          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
              {/* ── Transportation & Parking ── */}
              <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-[#02665e] to-[#02665e]/70" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#02665e]/10">
                    <Car className="w-4.5 h-4.5 text-[#02665e]" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Transportation & Parking</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { v: "no" as const, label: "No Parking", icon: "🚫" },
                    { v: "free" as const, label: "Free Parking", icon: "🅿️" },
                    { v: "paid" as const, label: "Paid Parking", icon: "💳" },
                  ]).map(({ v, label, icon }) => {
                    const sel = services.parking === v;
                    return (
                      <label
                        key={v}
                        className={`group relative flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          sel
                            ? "border-[#02665e] bg-[#02665e]/5 shadow-sm"
                            : "border-gray-300 bg-gray-50 hover:border-[#02665e]/40 hover:bg-[#02665e]/[0.03]"
                        }`}
                      >
                        <input type="radio" name="parking" checked={sel} onChange={() => setServices((s: any) => ({ ...s, parking: v }))} className="sr-only" />
                        <span className="text-lg flex-shrink-0">{icon}</span>
                        <span className={`text-xs font-semibold ${sel ? "text-[#02665e]" : "text-gray-700"}`}>{label}</span>
                        {sel && <div className="absolute top-2 right-2 w-2 h-2 bg-[#02665e] rounded-full" />}
                      </label>
                    );
                  })}
                </div>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    services.parking === "paid" ? "max-h-28 opacity-100 mt-4" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50/50">
                    <label className="text-xs font-semibold text-gray-700 whitespace-nowrap">Daily Price (TZS)</label>
                    <input
                      value={services.parkingPrice as any}
                      onChange={(e) => setServices((s: any) => ({ ...s, parkingPrice: numOrEmpty(e.target.value) }))}
                      type="number"
                      step="1"
                      min="0"
                      className="flex-1 h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e]"
                      placeholder="e.g. 5000"
                    />
                  </div>
                </div>
              </div>

              {/* ── Dining & Food ── */}
              <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-blue-500 to-blue-400" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                    <Coffee className="w-4.5 h-4.5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Dining & Food</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5">
                    <h4 className="text-xs font-bold text-gray-600 mb-2.5 flex items-center gap-2">
                      Breakfast
                      <div className="group relative">
                        <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-40 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          Included: Free with room. Available: Extra charge
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </h4>
                    <div className="grid grid-cols-2 gap-2.5">
                      <label
                        className={`group relative flex items-center gap-2.5 p-2.5 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          services.breakfastIncluded ? "border-[#02665e] bg-[#02665e]/5" : "border-gray-300 bg-gray-50 hover:border-[#02665e]/40 hover:bg-[#02665e]/[0.03]"
                        }`}
                        title={SERVICE_TOOLTIPS.breakfastIncluded}
                      >
                        <input type="checkbox" checked={services.breakfastIncluded} onChange={(e) => setServices((s: any) => ({ ...s, breakfastIncluded: e.target.checked }))} className="sr-only" />
                        <span className="text-base">🍳</span>
                        <span className={`text-xs font-semibold ${services.breakfastIncluded ? "text-[#02665e]" : "text-gray-600"}`}>Included</span>
                        {services.breakfastIncluded && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#02665e] rounded-full" />}
                      </label>
                      <label
                        className={`group relative flex items-center gap-2.5 p-2.5 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          services.breakfastAvailable ? "border-[#02665e] bg-[#02665e]/5" : "border-gray-300 bg-gray-50 hover:border-[#02665e]/40 hover:bg-[#02665e]/[0.03]"
                        }`}
                        title={SERVICE_TOOLTIPS.breakfastAvailable}
                      >
                        <input type="checkbox" checked={services.breakfastAvailable} onChange={(e) => setServices((s: any) => ({ ...s, breakfastAvailable: e.target.checked }))} className="sr-only" />
                        <span className="text-base">💰</span>
                        <span className={`text-xs font-semibold ${services.breakfastAvailable ? "text-[#02665e]" : "text-gray-600"}`}>Extra charge</span>
                        {services.breakfastAvailable && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#02665e] rounded-full" />}
                      </label>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3.5">
                    <h4 className="text-xs font-bold text-gray-600 mb-2.5">Restaurant & Bar</h4>
                    <div className="grid grid-cols-2 gap-2.5">
                      <label
                        className={`group relative flex items-center gap-2.5 p-2.5 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          services.restaurant ? "border-[#02665e] bg-[#02665e]/5" : "border-gray-300 bg-gray-50 hover:border-[#02665e]/40 hover:bg-[#02665e]/[0.03]"
                        }`}
                        title={SERVICE_TOOLTIPS.restaurant}
                      >
                        <input type="checkbox" checked={services.restaurant} onChange={(e) => setServices((s: any) => ({ ...s, restaurant: e.target.checked }))} className="sr-only" />
                        <span className="text-base">🍽️</span>
                        <span className={`text-xs font-semibold ${services.restaurant ? "text-[#02665e]" : "text-gray-600"}`}>Restaurant</span>
                        {services.restaurant && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#02665e] rounded-full" />}
                      </label>
                      <label
                        className={`group relative flex items-center gap-2.5 p-2.5 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          services.bar ? "border-[#02665e] bg-[#02665e]/5" : "border-gray-300 bg-gray-50 hover:border-[#02665e]/40 hover:bg-[#02665e]/[0.03]"
                        }`}
                        title={SERVICE_TOOLTIPS.bar}
                      >
                        <input type="checkbox" checked={services.bar} onChange={(e) => setServices((s: any) => ({ ...s, bar: e.target.checked }))} className="sr-only" />
                        <span className="text-base">🍸</span>
                        <span className={`text-xs font-semibold ${services.bar ? "text-[#02665e]" : "text-gray-600"}`}>Bar</span>
                        {services.bar && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#02665e] rounded-full" />}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Wellness & Leisure ── */}
              <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-[#02665e]" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#02665e]/10">
                    <Waves className="w-4.5 h-4.5 text-[#02665e]" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Wellness & Leisure</h3>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <label
                    className={`group relative flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      services.pool ? "border-[#02665e] bg-[#02665e]/5" : "border-gray-300 bg-gray-50 hover:border-[#02665e]/40 hover:bg-[#02665e]/[0.03]"
                    }`}
                    title={SERVICE_TOOLTIPS.pool}
                  >
                    <input type="checkbox" checked={services.pool} onChange={(e) => setServices((s: any) => ({ ...s, pool: e.target.checked }))} className="sr-only" />
                    <span className="text-lg">🏊</span>
                    <span className={`text-xs font-semibold ${services.pool ? "text-[#02665e]" : "text-gray-700"}`}>Swimming Pool</span>
                    {services.pool && <div className="absolute top-2 right-2 w-2 h-2 bg-[#02665e] rounded-full" />}
                  </label>
                  <label
                    className={`group relative flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      services.sauna ? "border-[#02665e] bg-[#02665e]/5" : "border-gray-300 bg-gray-50 hover:border-[#02665e]/40 hover:bg-[#02665e]/[0.03]"
                    }`}
                    title={SERVICE_TOOLTIPS.sauna}
                  >
                    <input type="checkbox" checked={services.sauna} onChange={(e) => setServices((s: any) => ({ ...s, sauna: e.target.checked }))} className="sr-only" />
                    <span className="text-lg">🧖</span>
                    <span className={`text-xs font-semibold ${services.sauna ? "text-[#02665e]" : "text-gray-700"}`}>Sauna / Spa</span>
                    {services.sauna && <div className="absolute top-2 right-2 w-2 h-2 bg-[#02665e] rounded-full" />}
                  </label>
                </div>
              </div>

              {/* ── Housekeeping ── */}
              <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-blue-500" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                    <WashingMachine className="w-4.5 h-4.5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Housekeeping</h3>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <label
                    className={`group relative flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      services.laundry ? "border-[#02665e] bg-[#02665e]/5" : "border-gray-300 bg-gray-50 hover:border-[#02665e]/40 hover:bg-[#02665e]/[0.03]"
                    }`}
                    title={SERVICE_TOOLTIPS.laundry}
                  >
                    <input type="checkbox" checked={services.laundry} onChange={(e) => setServices((s: any) => ({ ...s, laundry: e.target.checked }))} className="sr-only" />
                    <span className="text-lg">👔</span>
                    <span className={`text-xs font-semibold ${services.laundry ? "text-[#02665e]" : "text-gray-700"}`}>Laundry</span>
                    {services.laundry && <div className="absolute top-2 right-2 w-2 h-2 bg-[#02665e] rounded-full" />}
                  </label>
                  <label
                    className={`group relative flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      services.roomService ? "border-[#02665e] bg-[#02665e]/5" : "border-gray-300 bg-gray-50 hover:border-[#02665e]/40 hover:bg-[#02665e]/[0.03]"
                    }`}
                    title={SERVICE_TOOLTIPS.roomService}
                  >
                    <input type="checkbox" checked={services.roomService} onChange={(e) => setServices((s: any) => ({ ...s, roomService: e.target.checked }))} className="sr-only" />
                    <span className="text-lg">🛎️</span>
                    <span className={`text-xs font-semibold ${services.roomService ? "text-[#02665e]" : "text-gray-700"}`}>Room Service</span>
                    {services.roomService && <div className="absolute top-2 right-2 w-2 h-2 bg-[#02665e] rounded-full" />}
                  </label>
                </div>
              </div>

              {/* ── Safety & Security ── */}
              <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-[#02665e] to-blue-500" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#02665e]/10">
                    <Shield className="w-4.5 h-4.5 text-[#02665e]" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Safety & Security</h3>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { key: "security24", label: "24h Guard", emoji: "🛡️" },
                    { key: "firstAid", label: "First Aid", emoji: "🩹" },
                    { key: "fireExtinguisher", label: "Fire Ext.", emoji: "🧯" },
                  ].map(({ key, label, emoji }) => {
                    const sel = !!services[key];
                    return (
                      <label
                        key={key}
                        className={`group relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          sel ? "border-[#02665e] bg-[#02665e]/5" : "border-gray-300 bg-gray-50 hover:border-[#02665e]/40 hover:bg-[#02665e]/[0.03]"
                        }`}
                        title={SERVICE_TOOLTIPS[key] || `${label} available`}
                      >
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={(e) => {
                            const allowedKeys = ["security24", "firstAid", "fireExtinguisher"];
                            if (allowedKeys.includes(key)) {
                              setServices((s: any) => ({ ...s, [key]: e.target.checked }));
                            }
                          }}
                          className="sr-only"
                        />
                        <span className="text-lg">{emoji}</span>
                        <span className={`text-[11px] font-semibold text-center ${sel ? "text-[#02665e]" : "text-gray-700"}`}>{label}</span>
                        {sel && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#02665e] rounded-full" />}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ── Shopping ── */}
              <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-blue-400" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                    <ShoppingBag className="w-4.5 h-4.5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Shopping</h3>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <label
                    className={`group relative flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      services.onSiteShop ? "border-[#02665e] bg-[#02665e]/5" : "border-gray-300 bg-gray-50 hover:border-[#02665e]/40 hover:bg-[#02665e]/[0.03]"
                    }`}
                    title={SERVICE_TOOLTIPS.onSiteShop}
                  >
                    <input type="checkbox" checked={services.onSiteShop} onChange={(e) => setServices((s: any) => ({ ...s, onSiteShop: e.target.checked }))} className="sr-only" />
                    <span className="text-lg">🛍️</span>
                    <span className={`text-xs font-semibold ${services.onSiteShop ? "text-[#02665e]" : "text-gray-700"}`}>On-site Shop</span>
                    {services.onSiteShop && <div className="absolute top-2 right-2 w-2 h-2 bg-[#02665e] rounded-full" />}
                  </label>
                  <label
                    className={`group relative flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      services.nearbyMall ? "border-[#02665e] bg-[#02665e]/5" : "border-gray-300 bg-gray-50 hover:border-[#02665e]/40 hover:bg-[#02665e]/[0.03]"
                    }`}
                    title={SERVICE_TOOLTIPS.nearbyMall}
                  >
                    <input type="checkbox" checked={services.nearbyMall} onChange={(e) => setServices((s: any) => ({ ...s, nearbyMall: e.target.checked }))} className="sr-only" />
                    <span className="text-lg">🏬</span>
                    <span className={`text-xs font-semibold ${services.nearbyMall ? "text-[#02665e]" : "text-gray-700"}`}>Nearby Mall</span>
                    {services.nearbyMall && <div className="absolute top-2 right-2 w-2 h-2 bg-[#02665e] rounded-full" />}
                  </label>
                </div>
              </div>

              {/* ── Events & Recreation ── */}
              <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-[#02665e]/80" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#02665e]/10">
                    <PartyPopper className="w-4.5 h-4.5 text-[#02665e]" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Events & Recreation</h3>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <label
                    className={`group relative flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      services.socialHall ? "border-[#02665e] bg-[#02665e]/5" : "border-gray-300 bg-gray-50 hover:border-[#02665e]/40 hover:bg-[#02665e]/[0.03]"
                    }`}
                    title={SERVICE_TOOLTIPS.socialHall}
                  >
                    <input type="checkbox" checked={services.socialHall} onChange={(e) => setServices((s: any) => ({ ...s, socialHall: e.target.checked }))} className="sr-only" />
                    <span className="text-lg">🎉</span>
                    <span className={`text-xs font-semibold ${services.socialHall ? "text-[#02665e]" : "text-gray-700"}`}>Social Hall</span>
                    {services.socialHall && <div className="absolute top-2 right-2 w-2 h-2 bg-[#02665e] rounded-full" />}
                  </label>
                  <label
                    className={`group relative flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      services.sportsGames ? "border-[#02665e] bg-[#02665e]/5" : "border-gray-300 bg-gray-50 hover:border-[#02665e]/40 hover:bg-[#02665e]/[0.03]"
                    }`}
                    title={SERVICE_TOOLTIPS.sportsGames}
                  >
                    <input type="checkbox" checked={services.sportsGames} onChange={(e) => setServices((s: any) => ({ ...s, sportsGames: e.target.checked }))} className="sr-only" />
                    <span className="text-lg">⚽</span>
                    <span className={`text-xs font-semibold ${services.sportsGames ? "text-[#02665e]" : "text-gray-700"}`}>Sports</span>
                    {services.sportsGames && <div className="absolute top-2 right-2 w-2 h-2 bg-[#02665e] rounded-full" />}
                  </label>
                </div>
              </div>

              {/* ── Fitness ── */}
              <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-blue-500" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                    <Dumbbell className="w-4.5 h-4.5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Fitness</h3>
                </div>
                <label
                  className={`group relative flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    services.gym ? "border-[#02665e] bg-[#02665e]/5" : "border-gray-300 bg-gray-50 hover:border-[#02665e]/40 hover:bg-[#02665e]/[0.03]"
                  }`}
                  title={SERVICE_TOOLTIPS.gym}
                >
                  <input type="checkbox" checked={services.gym} onChange={(e) => setServices((s: any) => ({ ...s, gym: e.target.checked }))} className="sr-only" />
                  <span className="text-lg">🏋️</span>
                  <div>
                    <span className={`text-xs font-semibold ${services.gym ? "text-[#02665e]" : "text-gray-700"}`}>Gym / Fitness Center</span>
                    <p className="text-[10px] text-gray-400 mt-0.5">Weights, cardio & workout equipment</p>
                  </div>
                  {services.gym && <div className="absolute top-2 right-2 w-2 h-2 bg-[#02665e] rounded-full" />}
                </label>
              </div>

              {/* ── Nearby Services ── */}
              <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-[#02665e] to-blue-500" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#02665e]/10">
                    <Building2 className="w-4.5 h-4.5 text-[#02665e]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Nearby Services</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">Add facilities and services near your property</p>
                  </div>
                </div>

                <AddFacilityInline 
                  onAdd={(f: any) => setNearbyFacilities((list) => [...list, f])} 
                  existingFacilities={nearbyFacilities}
                />

                <div className="mt-4 space-y-2.5">
                  {nearbyFacilities.length === 0 && (
                    <div className="py-6 px-4 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <div className="flex flex-col items-center gap-2">
                        <MapPin className="w-5 h-5 text-gray-400" />
                        <p className="text-xs font-medium text-gray-500">No nearby facilities added yet</p>
                        <p className="text-[10px] text-gray-400">Select a facility type above to get started</p>
                      </div>
                    </div>
                  )}

                  {nearbyFacilities.map((f: any, idx: number) => (
                    <FacilityRow
                      key={f?.id ?? idx}
                      facility={f}
                      onChange={(updated: any) =>
                        setNearbyFacilities((list) => list.map((x, i) => (i === idx ? updated : x)))
                      }
                      onRemove={() => setNearbyFacilities((list) => list.filter((_, i) => i !== idx))}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

      {isVisible && (
        <StepFooter
          onPrev={goToPreviousStep}
          onNext={goToNextStep}
          prevDisabled={currentStep <= 0}
          nextDisabled={currentStep >= 5}
        />
      )}
    </AddPropertySection>
  );
}



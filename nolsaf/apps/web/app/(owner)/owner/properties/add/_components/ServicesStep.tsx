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
import { StepHeader } from "./StepHeader";

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
      className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm"
    >
      {isVisible && (
        <div className="w-full">
          <StepHeader
            step={3}
            title="Services & facilities"
            description="Select services and amenities available at your property and nearby facilities."
          />
          <div className="pt-4 space-y-6">
            {/* Completion Status Indicator - Modern Card Design */}
            <div className="rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white px-4 sm:px-5 py-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base transition-all duration-300 ${
                    servicesCompleted
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {selectedServicesCount}
                  </div>
                  <div className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">Services selected</span>
                    <span className="text-gray-500 mx-1">·</span>
                    <span className="text-gray-600">
                      {servicesCompleted ? (
                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Step complete
                        </span>
                      ) : (
                        <span className="font-bold text-amber-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Select at least one service
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                  servicesCompleted
                    ? "bg-emerald-50 border-emerald-200/50"
                    : "bg-amber-50 border-amber-200/50"
                }`}>
                  {servicesCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  )}
                  <div className={`text-xs font-semibold ${
                    servicesCompleted ? "text-emerald-700" : "text-amber-700"
                  }`}>
                    {servicesCompleted ? "Ready" : "Optional"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Services & Facilities Available
              </h2>
              <p className="text-xs text-gray-500">Select the services and amenities available at your property</p>
            </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Transportation & Parking - Grouped */}
              <div className="lg:col-span-2 rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/30 to-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Car className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      Transportation & Parking
                      <div className="group relative">
                        <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {SERVICE_TOOLTIPS.parking}
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </h3>
                    <p className="text-xs text-gray-500">Parking availability and options</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {(["no", "free", "paid"] as const).map((v) => (
                    <label
                      key={v}
                      className={`group relative flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold cursor-pointer transition-all duration-300 ${
                        services.parking === v
                          ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 shadow-md shadow-emerald-500/20"
                          : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"
                      }`}
                    >
                      <input
                        type="radio"
                        name="parking"
                        checked={services.parking === v}
                        onChange={() => setServices((s: any) => ({ ...s, parking: v }))}
                        className="sr-only"
                      />
                      <Car className={`w-3.5 h-3.5 mr-1.5 transition-colors duration-300 ${
                        services.parking === v ? "text-emerald-600" : "text-gray-500"
                      }`} />
                      <span>{v === "no" ? "No" : v === "free" ? "Free" : "Paid"}</span>
                      {services.parking === v && (
                        <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                      )}
                    </label>
                  ))}
                </div>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    services.parking === "paid" ? "max-h-24 opacity-100 mt-4" : "max-h-0 opacity-0"
                  }`}
                >
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Daily Price (TZS)</label>
                  <input
                    value={services.parkingPrice as any}
                    onChange={(e) => setServices((s: any) => ({ ...s, parkingPrice: numOrEmpty(e.target.value) }))}
                    type="number"
                    step="1"
                    min="0"
                    className="w-full h-12 rounded-xl border-2 border-gray-300 bg-white px-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 hover:border-gray-400"
                    placeholder="e.g. 5000"
                  />
                </div>
              </div>

              {/* Dining & Food Services - Grouped */}
              <div className="lg:col-span-2 rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50/30 to-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Coffee className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">Dining & Food Services</h3>
                    <p className="text-xs text-gray-500">Breakfast, restaurant, and bar options</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Breakfast */}
                  <div className="rounded-lg border border-orange-100 bg-white p-4">
                    <h4 className="text-xs font-semibold text-gray-900 mb-3 flex items-center gap-2">
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
                        className={`group relative flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold cursor-pointer transition-all duration-300 ${
                          services.breakfastIncluded
                            ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 shadow-md shadow-emerald-500/20"
                            : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"
                        }`}
                        title={SERVICE_TOOLTIPS.breakfastIncluded}
                      >
                        <input
                          type="checkbox"
                          checked={services.breakfastIncluded}
                          onChange={(e) => setServices((s: any) => ({ ...s, breakfastIncluded: e.target.checked }))}
                          className="sr-only"
                        />
                        <Coffee className={`w-3.5 h-3.5 mr-1.5 transition-colors duration-300 ${
                          services.breakfastIncluded ? "text-emerald-600" : "text-gray-500"
                        }`} />
                        <span>Included</span>
                        {services.breakfastIncluded && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                        )}
                      </label>
                      <label
                        className={`group relative flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold cursor-pointer transition-all duration-300 ${
                          services.breakfastAvailable
                            ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 shadow-md shadow-emerald-500/20"
                            : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"
                        }`}
                        title={SERVICE_TOOLTIPS.breakfastAvailable}
                      >
                        <input
                          type="checkbox"
                          checked={services.breakfastAvailable}
                          onChange={(e) => setServices((s: any) => ({ ...s, breakfastAvailable: e.target.checked }))}
                          className="sr-only"
                        />
                        <Coffee className={`w-3.5 h-3.5 mr-1.5 transition-colors duration-300 ${
                          services.breakfastAvailable ? "text-emerald-600" : "text-gray-500"
                        }`} />
                        <span>Extra</span>
                        {services.breakfastAvailable && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                        )}
                      </label>
                    </div>
                  </div>
                  {/* Restaurant & Bar */}
                  <div className="rounded-lg border border-orange-100 bg-white p-4">
                    <h4 className="text-xs font-semibold text-gray-900 mb-3">Restaurant & Bar</h4>
                    <div className="grid grid-cols-2 gap-2.5">
                      <label
                        className={`group relative flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold cursor-pointer transition-all duration-300 ${
                          services.restaurant
                            ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 shadow-md shadow-emerald-500/20"
                            : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"
                        }`}
                        title={SERVICE_TOOLTIPS.restaurant}
                      >
                        <input
                          type="checkbox"
                          checked={services.restaurant}
                          onChange={(e) => setServices((s: any) => ({ ...s, restaurant: e.target.checked }))}
                          className="sr-only"
                        />
                        <Coffee className={`w-3.5 h-3.5 mr-1.5 transition-colors duration-300 ${
                          services.restaurant ? "text-emerald-600" : "text-gray-500"
                        }`} />
                        <span>Restaurant</span>
                        {services.restaurant && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                        )}
                      </label>
                      <label
                        className={`group relative flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold cursor-pointer transition-all duration-300 ${
                          services.bar
                            ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 shadow-md shadow-emerald-500/20"
                            : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"
                        }`}
                        title={SERVICE_TOOLTIPS.bar}
                      >
                        <input
                          type="checkbox"
                          checked={services.bar}
                          onChange={(e) => setServices((s: any) => ({ ...s, bar: e.target.checked }))}
                          className="sr-only"
                        />
                        <Beer className={`w-3.5 h-3.5 mr-1.5 transition-colors duration-300 ${
                          services.bar ? "text-emerald-600" : "text-gray-500"
                        }`} />
                        <span>Bar</span>
                        {services.bar && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wellness & Leisure - Modern Card Design */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                    <Waves className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      Wellness & Leisure
                      <div className="group relative">
                        <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          Relaxation and recreational facilities for guests
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    </h3>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <label
                    className={`group relative flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold cursor-pointer transition-all duration-300 ${
                      services.pool
                        ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 shadow-md shadow-emerald-500/20"
                        : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"
                    }`}
                    title={SERVICE_TOOLTIPS.pool}
                  >
                    <input type="checkbox" checked={services.pool} onChange={(e) => setServices((s: any) => ({ ...s, pool: e.target.checked }))} className="sr-only" />
                    <Waves className={`w-3.5 h-3.5 mr-1.5 transition-colors duration-300 ${
                      services.pool ? "text-emerald-600" : "text-gray-500"
                    }`} />
                    <span>Pool</span>
                    {services.pool && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                    )}
                  </label>
                  <label
                    className={`group relative flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold cursor-pointer transition-all duration-300 ${
                      services.sauna
                        ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 shadow-md shadow-emerald-500/20"
                        : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"
                    }`}
                    title={SERVICE_TOOLTIPS.sauna}
                  >
                    <input type="checkbox" checked={services.sauna} onChange={(e) => setServices((s: any) => ({ ...s, sauna: e.target.checked }))} className="sr-only" />
                    <Thermometer className={`w-3.5 h-3.5 mr-1.5 transition-colors duration-300 ${
                      services.sauna ? "text-emerald-600" : "text-gray-500"
                    }`} />
                    <span>Sauna</span>
                    {services.sauna && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                    )}
                  </label>
                </div>
              </div>

              {/* Housekeeping & Services - Modern Card Design */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <WashingMachine className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">Housekeeping & Services</h3>
                    <p className="text-xs text-gray-500">Laundry and room service options</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <label
                    className={`group relative flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold cursor-pointer transition-all duration-300 ${
                      services.laundry
                        ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 shadow-md shadow-emerald-500/20"
                        : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"
                    }`}
                    title={SERVICE_TOOLTIPS.laundry}
                  >
                    <input type="checkbox" checked={services.laundry} onChange={(e) => setServices((s: any) => ({ ...s, laundry: e.target.checked }))} className="sr-only" />
                    <IconOr Icon={WashingMachine} className={`w-3.5 h-3.5 mr-1.5 transition-colors duration-300 ${
                      services.laundry ? "text-emerald-600" : "text-gray-500"
                    }`} />
                    <span>Laundry</span>
                    {services.laundry && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                    )}
                  </label>
                  <label
                    className={`group relative flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold cursor-pointer transition-all duration-300 ${
                      services.roomService
                        ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 shadow-md shadow-emerald-500/20"
                        : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"
                    }`}
                    title={SERVICE_TOOLTIPS.roomService}
                  >
                    <input type="checkbox" checked={services.roomService} onChange={(e) => setServices((s: any) => ({ ...s, roomService: e.target.checked }))} className="sr-only" />
                    <IconOr Icon={Package} className={`w-3.5 h-3.5 mr-1.5 transition-colors duration-300 ${
                      services.roomService ? "text-emerald-600" : "text-gray-500"
                    }`} />
                    <span>Room Service</span>
                    {services.roomService && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                    )}
                  </label>
                </div>
              </div>

              {/* Safety & Security - Modern Card Design */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">Safety & Security</h3>
                    <p className="text-xs text-gray-500">Security and safety equipment</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { key: "security24", label: "Security", Icon: Shield },
                    { key: "firstAid", label: "First Aid", Icon: Bandage },
                    { key: "fireExtinguisher", label: "Fire Ext.", Icon: FireExtinguisher },
                  ].map(({ key, label, Icon }) => {
                    const sel = !!services[key];
                    return (
                      <label
                        key={key}
                        className={`group relative flex flex-col items-center justify-center h-16 w-full rounded-xl border-2 text-[10px] font-semibold cursor-pointer transition-all duration-300 ${
                          sel
                            ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 shadow-md shadow-emerald-500/20"
                            : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"
                        }`}
                        title={SERVICE_TOOLTIPS[key] || `${label} available`}
                      >
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={(e) => {
                            // Security: Validate key is from allowed list
                            const allowedKeys = ["security24", "firstAid", "fireExtinguisher"];
                            if (allowedKeys.includes(key)) {
                              setServices((s: any) => ({ ...s, [key]: e.target.checked }));
                            }
                          }}
                          className="sr-only"
                        />
                        <IconOr Icon={Icon} className={`w-4 h-4 mb-1 transition-colors duration-300 ${
                          sel ? "text-emerald-600" : "text-gray-500"
                        }`} />
                        <span className="text-center leading-tight">{label}</span>
                        {sel && (
                          <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Shopping & Retail - Modern Card Design */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-pink-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">Shopping & Retail</h3>
                    <p className="text-xs text-gray-500">On-site or nearby shopping options</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <label
                    className={`group relative flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold cursor-pointer transition-all duration-300 ${
                      services.onSiteShop
                        ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 shadow-md shadow-emerald-500/20"
                        : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"
                    }`}
                    title={SERVICE_TOOLTIPS.onSiteShop}
                  >
                    <input type="checkbox" checked={services.onSiteShop} onChange={(e) => setServices((s: any) => ({ ...s, onSiteShop: e.target.checked }))} className="sr-only" />
                    <IconOr Icon={ShoppingBag} className={`w-3.5 h-3.5 mr-1.5 transition-colors duration-300 ${
                      services.onSiteShop ? "text-emerald-600" : "text-gray-500"
                    }`} />
                    <span>On-site</span>
                    {services.onSiteShop && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                    )}
                  </label>
                  <label
                    className={`group relative flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold cursor-pointer transition-all duration-300 ${
                      services.nearbyMall
                        ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 shadow-md shadow-emerald-500/20"
                        : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"
                    }`}
                    title={SERVICE_TOOLTIPS.nearbyMall}
                  >
                    <input type="checkbox" checked={services.nearbyMall} onChange={(e) => setServices((s: any) => ({ ...s, nearbyMall: e.target.checked }))} className="sr-only" />
                    <IconOr Icon={Store} className={`w-3.5 h-3.5 mr-1.5 transition-colors duration-300 ${
                      services.nearbyMall ? "text-emerald-600" : "text-gray-500"
                    }`} />
                    <span>Mall</span>
                    {services.nearbyMall && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                    )}
                  </label>
                </div>
              </div>

              {/* Events & Recreation - Modern Card Design */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <PartyPopper className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">Events & Recreation</h3>
                    <p className="text-xs text-gray-500">Event spaces and recreational activities</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <label
                    className={`group relative flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold cursor-pointer transition-all duration-300 ${
                      services.socialHall
                        ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 shadow-md shadow-emerald-500/20"
                        : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"
                    }`}
                    title={SERVICE_TOOLTIPS.socialHall}
                  >
                    <input type="checkbox" checked={services.socialHall} onChange={(e) => setServices((s: any) => ({ ...s, socialHall: e.target.checked }))} className="sr-only" />
                    <IconOr Icon={PartyPopper} className={`w-3.5 h-3.5 mr-1.5 transition-colors duration-300 ${
                      services.socialHall ? "text-emerald-600" : "text-gray-500"
                    }`} />
                    <span>Social Hall</span>
                    {services.socialHall && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                    )}
                  </label>
                  <label
                    className={`group relative flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold cursor-pointer transition-all duration-300 ${
                      services.sportsGames
                        ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 shadow-md shadow-emerald-500/20"
                        : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"
                    }`}
                    title={SERVICE_TOOLTIPS.sportsGames}
                  >
                    <input type="checkbox" checked={services.sportsGames} onChange={(e) => setServices((s: any) => ({ ...s, sportsGames: e.target.checked }))} className="sr-only" />
                    <IconOr Icon={Gamepad} className={`w-3.5 h-3.5 mr-1.5 transition-colors duration-300 ${
                      services.sportsGames ? "text-emerald-600" : "text-gray-500"
                    }`} />
                    <span>Sports</span>
                    {services.sportsGames && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                    )}
                  </label>
                </div>
              </div>

              {/* Fitness & Wellness - Modern Card Design */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">Fitness & Wellness</h3>
                    <p className="text-xs text-gray-500">Gym and fitness facilities</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  <label
                    className={`group relative flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold cursor-pointer transition-all duration-300 ${
                      services.gym
                        ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-700 shadow-md shadow-emerald-500/20"
                        : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-sm"
                    }`}
                    title={SERVICE_TOOLTIPS.gym}
                  >
                    <input type="checkbox" checked={services.gym} onChange={(e) => setServices((s: any) => ({ ...s, gym: e.target.checked }))} className="sr-only" />
                    <IconOr Icon={Dumbbell} className={`w-3.5 h-3.5 mr-1.5 transition-colors duration-300 ${
                      services.gym ? "text-emerald-600" : "text-gray-500"
                    }`} />
                    <span>Gym / Fitness Center</span>
                    {services.gym && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse border border-white" />
                    )}
                  </label>
                </div>
              </div>

              {/* Line Separator */}
              <div className="lg:col-span-2 my-8">
                <div className="border-t-2 border-gray-300"></div>
              </div>

              {/* Nearby Services - Modern Card Design with Distinct Styling */}
              <div className="lg:col-span-2 rounded-xl border-2 border-teal-200 bg-gradient-to-br from-teal-50/30 to-white p-5 sm:p-6 shadow-md transition-all duration-300 hover:shadow-lg">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center shadow-sm">
                    <Building2 className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Nearby Services</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Add facilities and services near your property</p>
                  </div>
                </div>

                {/* Inline add form */}
                <AddFacilityInline 
                  onAdd={(f: any) => setNearbyFacilities((list) => [...list, f])} 
                  existingFacilities={nearbyFacilities}
                />

                {/* List */}
                <div className="mt-5 space-y-3">
                  {nearbyFacilities.length === 0 && (
                    <div className="py-8 px-6 text-center bg-gradient-to-br from-slate-50 to-white rounded-xl border-2 border-dashed border-slate-200">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700 mb-1">No nearby facilities added yet</p>
                          <p className="text-xs text-slate-500 max-w-md">
                            Help guests discover nearby services like hospitals, airports, or bus stations. 
                            Select a facility type above to get started.
                          </p>
                        </div>
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



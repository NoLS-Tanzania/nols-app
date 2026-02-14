"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { 
  CalendarDays, 
  Loader2, 
  AlertCircle,
  ChevronRight,
  MapPin,
  Building2,
  BedDouble,
  Layers,
  Sparkles,
} from "lucide-react";

const api = axios.create({ baseURL: "", withCredentials: true });

type Property = {
  id: number;
  title: string;
  photos?: string[];
  regionName?: string | null;
  district?: string | null;
  city?: string | null;
  type?: string | null;
  status: string;
  roomsSpec?: any;
  layout?: any;
  totalFloors?: number | null;
  buildingType?: string | null;
};

type FloorInfo = {
  floorNumber: number;
  floorLabel: string;
  roomTypes: Array<{
    roomType: string;
    roomsCount: number;
    beds?: any;
  }>;
  totalRooms: number;
};

type SummaryPeriod = "today" | "week" | "month";

type AvailabilitySummary = {
  totalRooms: number;
  totalBookedRooms: number;
  totalBlockedRooms: number;
  totalAvailableRooms: number;
  overallAvailabilityPercentage: number;
};

type PeriodRange = { startDate: string; endDate: string };

function toIsoDateTime(d: Date): string {
  return d.toISOString();
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // days since Monday
  x.setDate(x.getDate() - diff);
  return x;
}

function startOfMonth(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function addMonths(d: Date, months: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

// Helper to get floor label
function getFloorLabel(floorNum: number): string {
  if (floorNum === 0) return "Ground Floor";
  const mod100 = floorNum % 100;
  const mod10 = floorNum % 10;
  const suffix = mod100 >= 11 && mod100 <= 13 ? "th" : mod10 === 1 ? "st" : mod10 === 2 ? "nd" : mod10 === 3 ? "rd" : "th";
  return `${floorNum}${suffix} Floor`;
}

// Extract building structure from roomsSpec
function extractBuildingStructure(property: Property): FloorInfo[] {
  const floors: FloorInfo[] = [];
  
  if (!property.roomsSpec) {
    // Fallback: create a single floor with all rooms
    return [{
      floorNumber: 0,
      floorLabel: "Ground Floor",
      roomTypes: [],
      totalRooms: 0,
    }];
  }

  const roomsSpec = Array.isArray(property.roomsSpec) ? property.roomsSpec : [];
  const isMultiStorey = property.buildingType === "multi_storey";
  const totalFloors = property.totalFloors || 1;

  // Group rooms by floor
  const floorMap = new Map<number, Map<string, { roomType: string; roomsCount: number; beds?: any }>>();

  roomsSpec.forEach((room: any) => {
    const roomType = String(room?.roomType || room?.name || "Room").trim();
    const roomsCount = Number(room?.roomsCount || room?.count || 0);
    
    if (roomsCount === 0) return;

    // Parse floor distribution
    let floorDistribution: Record<number, number> = {};
    if (isMultiStorey && room.floorDistribution) {
      if (typeof room.floorDistribution === "string") {
        try {
          floorDistribution = JSON.parse(room.floorDistribution);
        } catch {
          floorDistribution = {};
        }
      } else if (typeof room.floorDistribution === "object" && room.floorDistribution !== null) {
        floorDistribution = room.floorDistribution;
      }
    }

    // If no floor distribution, default to ground floor (0)
    const floorsToUse = Object.keys(floorDistribution).length > 0 
      ? Object.keys(floorDistribution).map(Number)
      : [0];

    floorsToUse.forEach((floorNum) => {
      const countOnFloor = floorDistribution[floorNum] || roomsCount;
      
      if (!floorMap.has(floorNum)) {
        floorMap.set(floorNum, new Map());
      }
      
      const roomTypeMap = floorMap.get(floorNum)!;
      const existing = roomTypeMap.get(roomType);
      
      if (existing) {
        existing.roomsCount += countOnFloor;
      } else {
        roomTypeMap.set(roomType, {
          roomType,
          roomsCount: countOnFloor,
          beds: room.beds,
        });
      }
    });
  });

  // Convert to FloorInfo array
  const floorNumbers = Array.from(floorMap.keys()).sort((a, b) => a - b);
  
  if (floorNumbers.length === 0) {
    // No floor data, create default
    return [{
      floorNumber: 0,
      floorLabel: "Ground Floor",
      roomTypes: roomsSpec.map((r: any) => ({
        roomType: String(r?.roomType || r?.name || "Room"),
        roomsCount: Number(r?.roomsCount || r?.count || 0),
        beds: r?.beds,
      })).filter((rt: any) => rt.roomsCount > 0),
      totalRooms: roomsSpec.reduce((sum: number, r: any) => sum + Number(r?.roomsCount || r?.count || 0), 0),
    }];
  }

  floorNumbers.forEach((floorNum) => {
    const roomTypeMap = floorMap.get(floorNum)!;
    const roomTypes = Array.from(roomTypeMap.values());
    const totalRooms = roomTypes.reduce((sum, rt) => sum + rt.roomsCount, 0);

    floors.push({
      floorNumber: floorNum,
      floorLabel: getFloorLabel(floorNum),
      roomTypes,
      totalRooms,
    });
  });

  return floors;
}

export default function PropertyAvailabilitySelectionPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ranges = useMemo<Record<SummaryPeriod, PeriodRange>>(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeekMonday(now);
    const monthStart = startOfMonth(now);

    return {
      today: { startDate: toIsoDateTime(todayStart), endDate: toIsoDateTime(addDays(todayStart, 1)) },
      week: { startDate: toIsoDateTime(weekStart), endDate: toIsoDateTime(addDays(weekStart, 7)) },
      month: { startDate: toIsoDateTime(monthStart), endDate: toIsoDateTime(addMonths(monthStart, 1)) },
    };
  }, []);

  const [availabilityByPropertyId, setAvailabilityByPropertyId] = useState<
    Record<number, Partial<Record<SummaryPeriod, AvailabilitySummary>>>
  >({});
  const [availabilityLoadingByPropertyId, setAvailabilityLoadingByPropertyId] = useState<
    Record<number, Partial<Record<SummaryPeriod, boolean>>>
  >({});

  useEffect(() => {
    let mounted = true;

      api.get<any>("/api/owner/properties/mine", { params: { status: "APPROVED" } })
      .then((r) => {
        if (!mounted) return;
        const data = r.data;
        const propertiesList = Array.isArray(data) ? data : (data?.items || []);
        setProperties(propertiesList);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.error || "Failed to load properties");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch lightweight availability summaries for Today / This Week / This Month.
  useEffect(() => {
    if (!properties.length) return;

    let cancelled = false;

    const periods: SummaryPeriod[] = ["today", "week", "month"];

    const fetchOne = async (propertyId: number, period: SummaryPeriod) => {
      setAvailabilityLoadingByPropertyId((prev) => ({
        ...prev,
        [propertyId]: { ...prev[propertyId], [period]: true },
      }));
      try {
        const r = await api.get<any>("/api/owner/availability/summary", {
          params: { propertyId, ...ranges[period] },
        });
        const s = r?.data?.summary;
        if (!s || cancelled) return;
        setAvailabilityByPropertyId((prev) => ({
          ...prev,
          [propertyId]: { ...prev[propertyId], [period]: s },
        }));
      } catch {
        // ignore - card will show placeholder values
      } finally {
        if (!cancelled) {
          setAvailabilityLoadingByPropertyId((prev) => ({
            ...prev,
            [propertyId]: { ...prev[propertyId], [period]: false },
          }));
        }
      }
    };

    for (const p of properties) {
      for (const period of periods) fetchOne(p.id, period);
    }

    return () => {
      cancelled = true;
    };
  }, [properties, ranges]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between mb-10">
            <div>
              <div className="h-4 w-44 rounded-full bg-slate-200/70 animate-pulse" />
              <div className="mt-3 h-9 w-72 rounded-xl bg-slate-200/70 animate-pulse" />
              <div className="mt-3 h-4 w-64 rounded-full bg-slate-200/60 animate-pulse" />
            </div>
            <div className="h-10 w-28 rounded-xl bg-slate-200/70 animate-pulse" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-3xl border border-slate-200 bg-white/70 shadow-sm overflow-hidden">
                <div className="h-28 bg-gradient-to-r from-slate-100 to-slate-50" />
                <div className="p-6">
                  <div className="h-5 w-56 rounded bg-slate-200/70 animate-pulse" />
                  <div className="mt-3 h-4 w-72 rounded bg-slate-200/60 animate-pulse" />
                  <div className="mt-6 space-y-3">
                    <div className="h-20 rounded-2xl bg-slate-100 border border-slate-200" />
                    <div className="h-20 rounded-2xl bg-slate-100 border border-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-center justify-center gap-3 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading your approved properties…</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
        <div className="max-w-xl mx-auto px-4 py-16">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-8">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mb-5">
              <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">Couldn’t load properties</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <div className="mt-6 flex items-center gap-3">
              <Link
                href="/owner/properties/approved"
                className="no-underline inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                <span>Back to Properties</span>
              </Link>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
        <div className="max-w-xl mx-auto px-4 py-16">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
              <CalendarDays className="w-6 h-6 text-emerald-600" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">No approved properties yet</h1>
            <p className="mt-2 text-sm text-slate-600">
              You need at least one approved property before you can manage room availability.
            </p>
            <div className="mt-6">
              <Link
                href="/owner/properties/add"
                className="no-underline inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Add New Property</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50/60 to-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-72 w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-200/25 via-sky-200/20 to-purple-200/20 blur-3xl" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-10">
          <nav className="mb-6 flex items-center justify-between">
            <Link
              href="/owner/properties/approved"
              className="no-underline inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              <span>Properties</span>
            </Link>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
              {properties.length} {properties.length === 1 ? "property" : "properties"}
            </span>
          </nav>
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center shadow-sm ring-1 ring-black/5">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Room Availability</h1>
              <p className="mt-1 text-sm text-slate-600">Manage room availability for your properties</p>
            </div>
          </div>
        </div>

        {/* Properties Grid - Premium Clean Design */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {properties.map((property) => {
            const buildingStructure = extractBuildingStructure(property);
            const location = [property.city, property.district, property.regionName]
              .filter(Boolean)
              .join(", ") || "Location not specified";
            
            const totalRooms = buildingStructure.reduce((sum, floor) => sum + floor.totalRooms, 0);
            const cover = Array.isArray(property.photos) && property.photos.length > 0 ? property.photos[0] : null;

            const availability = availabilityByPropertyId[property.id];
            const loading = availabilityLoadingByPropertyId[property.id];

            const fmt = (value: number | undefined, isLoading?: boolean) => {
              if (typeof value === "number") return value;
              if (isLoading) return "…";
              return "—";
            };

            const bookedToday = availability?.today?.totalBookedRooms;
            const bookedWeek = availability?.week?.totalBookedRooms;
            const bookedMonth = availability?.month?.totalBookedRooms;
            const blockedToday = availability?.today?.totalBlockedRooms;
            const blockedWeek = availability?.week?.totalBlockedRooms;
            const blockedMonth = availability?.month?.totalBlockedRooms;

            const Stat = ({ label, value }: { label: string; value: string }) => (
              <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] ring-1 ring-black/5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
                <div className="mt-1 text-base font-semibold text-slate-900">{value}</div>
              </div>
            );

            return (
              <Link
                key={property.id}
                href={`/owner/properties/${property.id}/availability/manage`}
                className="no-underline group block"
              >
                <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:border-emerald-200 transition-all duration-300 overflow-hidden">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-emerald-200/20 blur-3xl" />
                  </div>

                  {/* Cover */}
                  <div className="relative h-28">
                    {cover ? (
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${cover})` }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-white to-slate-50" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
                    <div className="absolute left-6 bottom-4 right-6 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-2xl bg-white/80 backdrop-blur border border-white/60 shadow-sm flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-slate-700" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                            {property.title}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-xs text-slate-600 truncate">{location}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100/80 text-emerald-800 rounded-full border border-emerald-200/70 shadow-sm">
                          {property.status}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/80 backdrop-blur px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-800 shadow-sm">
                          <BedDouble className="w-3.5 h-3.5 text-slate-600" aria-hidden />
                          <span>{totalRooms}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content (compact premium summary) */}
                  <div className="px-6 pb-6 pt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                        <Layers className="w-4 h-4 text-emerald-600" />
                      </div>
                      <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">At a glance</h4>
                      <span className="ml-auto text-[11px] font-semibold text-slate-500">Today · Week · Month</span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Stat label="Floors" value={String(buildingStructure.length)} />
                      <Stat label="Rooms" value={String(totalRooms)} />
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/70 overflow-hidden">
                      <div className="grid grid-cols-4 gap-2 px-3 py-2 border-b border-slate-200/60 bg-gradient-to-r from-slate-50 to-white text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <span className="text-left"> </span>
                        <span className="text-right">Today</span>
                        <span className="text-right">Week</span>
                        <span className="text-right">Month</span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 px-3 py-2 text-sm">
                        <span className="text-xs font-semibold text-slate-700">NoLSAF booked</span>
                        <span className="text-right font-semibold text-emerald-700 tabular-nums">{fmt(bookedToday, loading?.today)}</span>
                        <span className="text-right font-semibold text-emerald-700 tabular-nums">{fmt(bookedWeek, loading?.week)}</span>
                        <span className="text-right font-semibold text-emerald-700 tabular-nums">{fmt(bookedMonth, loading?.month)}</span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 px-3 py-2 border-t border-slate-200/50 text-sm">
                        <span className="text-xs font-semibold text-slate-700">Outside blocked</span>
                        <span className="text-right font-semibold text-slate-800 tabular-nums">{fmt(blockedToday, loading?.today)}</span>
                        <span className="text-right font-semibold text-slate-800 tabular-nums">{fmt(blockedWeek, loading?.week)}</span>
                        <span className="text-right font-semibold text-slate-800 tabular-nums">{fmt(blockedMonth, loading?.month)}</span>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">Tip:</span> Keep calendars accurate.
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 group-hover:text-emerald-800 transition-colors">
                        <span>Manage</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>

                  {/* old layout retained below removed */}

                  {/* Property Title Bar */}
                  <div className="hidden px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                          {property.title}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-500 truncate">{location}</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 rounded-md flex-shrink-0">
                        {property.status}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
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
  const [expandedFloors, setExpandedFloors] = useState<Record<number, boolean>>({});

  const toggleFloors = (propertyId: number) => {
    setExpandedFloors((prev) => ({ ...prev, [propertyId]: !prev[propertyId] }));
  };

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
            const isExpanded = !!expandedFloors[property.id];
            const floorsToRender = isExpanded ? buildingStructure : buildingStructure.slice(0, 3);
            const hiddenFloorsCount = Math.max(0, buildingStructure.length - floorsToRender.length);

            const renderTypesCompact = (floor: FloorInfo) => {
              const items = floor.roomTypes
                .filter((t) => t.roomsCount > 0)
                .map((t) => `${t.roomType}(${t.roomsCount})`);
              if (items.length <= 3) return items.join(" • ");
              return `${items.slice(0, 3).join(" • ")} • +${items.length - 3} more`;
            };

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
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100/80 text-emerald-800 rounded-full border border-emerald-200/70 shadow-sm flex-shrink-0">
                        {property.status}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 pb-6 pt-4">
                    <div className="flex items-center justify-between gap-3 mb-5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                          <Layers className="w-4 h-4 text-emerald-600" />
                        </div>
                        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Building structure</h4>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold">
                          {buildingStructure.length} {buildingStructure.length === 1 ? "floor" : "floors"}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold">
                          {totalRooms} {totalRooms === 1 ? "room" : "rooms"}
                        </span>
                      </div>
                    </div>

                    {/* Floors */}
                    {buildingStructure.length > 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)] overflow-hidden">
                        <div>
                          {floorsToRender.map((floor, idx) => (
                            <div
                              key={floor.floorNumber}
                              className={`px-4 py-3 hover:bg-emerald-50/40 transition-colors ${
                                idx === 0 ? "" : "border-t border-slate-200"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                                  <span className="font-semibold text-sm">
                                    {floor.floorNumber === 0 ? "G" : floor.floorNumber}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-3">
                                    <h5 className="text-sm font-semibold text-slate-900 truncate">{floor.floorLabel}</h5>
                                    <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                                      {floor.totalRooms} {floor.totalRooms === 1 ? "room" : "rooms"}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-xs text-slate-500 truncate">
                                    {floor.roomTypes.length} {floor.roomTypes.length === 1 ? "type" : "types"}
                                    {floor.roomTypes.length > 0 ? ` • ${renderTypesCompact(floor)}` : ""}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {buildingStructure.length > 3 && (
                          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleFloors(property.id);
                              }}
                              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-emerald-700 transition-colors"
                            >
                              <span>{isExpanded ? "Show fewer floors" : `Show all floors (+${hiddenFloorsCount})`}</span>
                              <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? "-rotate-90" : "rotate-90"}`} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                        <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 font-medium">No structure defined</p>
                        <p className="text-xs text-slate-500 mt-1">Add rooms/floors to start managing availability.</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-6 flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">Tip:</span> Keep calendars accurate to reduce cancellations.
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

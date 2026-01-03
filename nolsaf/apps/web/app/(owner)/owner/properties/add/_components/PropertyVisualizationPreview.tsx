"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Building2, MapPin, ChevronUp, ChevronDown, BedDouble, Home, Layers, Grid3x3 } from "lucide-react";

interface Room {
  roomType: string;
  roomsCount: number;
  floor?: number | string;
  floorDistribution?: Record<number, number>;
  floors?: number[];
}

interface PropertyVisualizationPreviewProps {
  title: string;
  buildingType: string;
  totalFloors: number | "";
  rooms: Room[];
  onFloorSelect?: (floor: number) => void;
  onRoomTypeClick?: (args: { roomType: string; floor: number; view: "structure" | "plan" }) => void;
  /** Visual style for the top header area */
  headerVariant?: "compact" | "hero";
  /** Whether to render the internal header (useful when embedded under another section header) */
  showHeader?: boolean;
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function getFloorName(floorNum: number): string {
  if (floorNum === 0) return "Ground";
  return `${floorNum}${getOrdinal(floorNum)}`;
}

function stableThemeIndex(input: string, mod = 8): number {
  // Simple deterministic hash (fast, stable across renders)
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % mod;
}

// Distribute rooms across floors based on building type and floor distribution
function distributeRoomsToFloors(
  rooms: Room[],
  totalFloors: number,
  buildingType: string
): Record<number, Room[]> {
  const floors: Record<number, Room[]> = {};
  
  // Initialize floors
  for (let i = 0; i <= totalFloors; i++) {
    floors[i] = [];
  }

  // If single story, put everything on ground floor
  // Support both spellings used across the app: single_story and single_storey
  if (buildingType === "single_story" || buildingType === "single_storey" || totalFloors === 0) {
    rooms.forEach((room) => {
      floors[0].push({ ...room, floor: 0 });
    });
    return floors;
  }

  // Distribute rooms based on floorDistribution or evenly
  rooms.forEach((room) => {
    if (room.floorDistribution && Object.keys(room.floorDistribution).length > 0) {
      // Use provided distribution
      Object.entries(room.floorDistribution).forEach(([floorStr, count]) => {
        const floor = parseInt(floorStr);
        if (!isNaN(floor) && floor >= 0 && floor <= totalFloors && count > 0) {
          if (!floors[floor]) floors[floor] = [];
          floors[floor].push({
            ...room,
            roomsCount: count,
            floor,
          });
        }
      });
    } else {
      // Evenly distribute across floors (excluding ground for multi-story)
      const floorsToUse = totalFloors > 0 ? totalFloors : 1;
      const roomsPerFloor = Math.ceil(room.roomsCount / floorsToUse);
      let remaining = room.roomsCount;
      
      for (let floor = buildingType === "multi_storey" ? 1 : 0; floor <= totalFloors && remaining > 0; floor++) {
        const count = Math.min(roomsPerFloor, remaining);
        if (!floors[floor]) floors[floor] = [];
        floors[floor].push({
          ...room,
          roomsCount: count,
          floor,
        });
        remaining -= count;
      }
    }
  });

  return floors;
}

export function PropertyVisualizationPreview({
  title,
  buildingType,
  totalFloors,
  rooms,
  onFloorSelect,
  onRoomTypeClick,
  headerVariant = "compact",
  showHeader = true,
}: PropertyVisualizationPreviewProps) {
  const ROOMTYPE_THEME_COUNT = 12;
  const numFloors = typeof totalFloors === "number" && totalFloors > 0 ? totalFloors : 0;
  const [currentFloor, setCurrentFloor] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [viewMode, setViewMode] = useState<"plan" | "structure">("structure");

  const roomsByFloor = useMemo(() => {
    if (numFloors === 0 || rooms.length === 0) {
      return { 0: rooms.map((r) => ({ ...r, floor: 0 })) };
    }
    return distributeRoomsToFloors(rooms, numFloors, buildingType);
  }, [rooms, numFloors, buildingType]);

  const availableFloors = useMemo(() => {
    return Object.keys(roomsByFloor)
      .map(Number)
      .filter((floor) => roomsByFloor[floor].length > 0)
      .sort((a, b) => a - b);
  }, [roomsByFloor]);

  const currentRooms = useMemo(() => roomsByFloor[currentFloor] || [], [roomsByFloor, currentFloor]);

  const roomTypeThemeMap = useMemo(() => {
    const uniq = new Set<string>();
    for (const r of rooms || []) {
      const raw = String((r as any)?.roomType || "Room").trim();
      const normalized = (raw || "Room").toLowerCase();
      uniq.add(normalized);
    }

    // Deterministic ordering, then assign unique palette indices sequentially.
    const ordered = Array.from(uniq).sort((a, b) => {
      const ha = stableThemeIndex(a, 1_000_000);
      const hb = stableThemeIndex(b, 1_000_000);
      if (ha !== hb) return ha - hb;
      return a.localeCompare(b);
    });

    const map = new Map<string, number>();
    ordered.forEach((key, idx) => {
      map.set(key, idx % ROOMTYPE_THEME_COUNT);
    });
    return map;
  }, [rooms, ROOMTYPE_THEME_COUNT]);

  const getRoomThemeClass = useCallback(
    (roomType: string) => {
      const key = String(roomType || "Room").trim().toLowerCase();
      const idx = roomTypeThemeMap.get(key) ?? stableThemeIndex(key, ROOMTYPE_THEME_COUNT);
      return `property-viz-roomtype-theme-${idx}`;
    },
    [roomTypeThemeMap, ROOMTYPE_THEME_COUNT]
  );

  const planRoomTypes = useMemo(() => {
    const map = new Map<string, { roomType: string; roomsCount: number }>();
    for (const r of currentRooms) {
      const name = String(r.roomType || "Room").trim() || "Room";
      const prev = map.get(name);
      if (prev) prev.roomsCount += Number(r.roomsCount) || 0;
      else map.set(name, { roomType: name, roomsCount: Number(r.roomsCount) || 0 });
    }
    return Array.from(map.values()).sort((a, b) => b.roomsCount - a.roomsCount);
  }, [currentRooms]);

  const handleFloorChange = useCallback((floor: number) => {
    if (floor === currentFloor) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentFloor(floor);
      onFloorSelect?.(floor);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 200);
  }, [currentFloor, onFloorSelect]);

  // Keyboard navigation for floors
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== "structure" && viewMode !== "plan") return;
      
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const currentIndex = availableFloors.indexOf(currentFloor);
        if (currentIndex > 0) {
          handleFloorChange(availableFloors[currentIndex - 1]);
        }
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        const currentIndex = availableFloors.indexOf(currentFloor);
        if (currentIndex < availableFloors.length - 1) {
          handleFloorChange(availableFloors[currentIndex + 1]);
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        if (availableFloors.length > 0) {
          handleFloorChange(availableFloors[0]);
        }
      } else if (e.key === "End") {
        e.preventDefault();
        if (availableFloors.length > 0) {
          handleFloorChange(availableFloors[availableFloors.length - 1]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentFloor, availableFloors, viewMode, handleFloorChange]);

  // Reset transition state when rooms change
  useEffect(() => {
    setIsTransitioning(false);
  }, [currentRooms.length]);

  if (rooms.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <BedDouble className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">No rooms configured yet</p>
        <p className="text-sm text-gray-500 mt-1">Add room types to see the floor plan visualization</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-gray-200 bg-white overflow-hidden shadow-2xl shadow-gray-200/50 transform transition-all duration-500 hover:shadow-3xl">
      {/* Header (compact by default; keep hero variant for special pages) */}
      {showHeader ? (headerVariant === "hero" ? (
        <div className="relative bg-gradient-to-br from-[#02665e] via-[#014e47] to-[#013a35] p-6 sm:p-8 text-white overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 property-viz-pattern-bg" />
          </div>

          <div className="relative flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-1 truncate drop-shadow-lg">{title || "Property"}</h3>
                  <p className="text-sm text-white/90 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Interactive Floor Plan Preview
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl flex-shrink-0 border border-white/30 shadow-lg">
              <Building2 className="w-5 h-5" />
              <span className="text-sm font-bold">
                {availableFloors.length} {availableFloors.length === 1 ? "Floor" : "Floors"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative px-6 sm:px-8 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-emerald-50/60">
          {/* subtle texture without heavy color */}
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
            <div className="absolute inset-0 property-viz-pattern-bg" />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white/70 border border-slate-200 flex items-center justify-center shadow-sm">
                <Home className="w-5 h-5 text-[#02665e]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{title || "Property"}</h3>
              </div>
            </div>

            <div className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 border border-slate-200 text-slate-700 shadow-sm">
              <Building2 className="w-4 h-4 text-slate-600" />
              <span className="text-xs sm:text-sm font-semibold">
                {availableFloors.length} {availableFloors.length === 1 ? "Floor" : "Floors"}
              </span>
            </div>
          </div>
        </div>
      )) : null}

      {/* Enhanced Floor Selector with Smooth Transitions */}
      {availableFloors.length > 1 && viewMode === "plan" && (
        <div className="px-6 sm:px-8 pt-5 pb-5 bg-white border-b border-gray-200">
          <div className="property-viz-floor-tabs">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
            {availableFloors.map((floor) => {
              const isActive = currentFloor === floor;
              return (
                <button
                  key={floor}
                  onClick={() => handleFloorChange(floor)}
                  className={[
                    "relative whitespace-nowrap flex-shrink-0",
                    "property-viz-floor-tab",
                    isActive ? "property-viz-floor-tab-active" : "",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                  ].join(" ")}
                  aria-label={`View ${getFloorName(floor)} floor`}
                  aria-current={isActive ? "true" : "false"}
                >
                  {getFloorName(floor)} Floor
                </button>
              );
            })}
          </div>
          </div>
        </div>
      )}

      {/* Building Structure View - Compact Design */}
      {viewMode === "structure" && (
        <div className="p-4 sm:p-6 bg-gradient-to-b from-gray-50 via-white to-gray-50">
          <div className="text-center mb-4">
            {showHeader ? (
              <h4 className="text-lg font-bold text-gray-900 mb-1 flex items-center justify-center gap-2">
                <Building2 className="w-4 h-4 text-[#02665e]" aria-hidden />
                Building Structure
              </h4>
            ) : null}
            <p className="text-xs text-gray-500">
              Select a floor below to see room types and room counts for that floor.
            </p>
          </div>

          {/* Compact Floor Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6 max-w-4xl mx-auto">
            {availableFloors.map((floor, floorIdx) => {
                const isActive = currentFloor === floor;
                const floorRooms = roomsByFloor[floor] || [];
                const roomCount = floorRooms.reduce((sum, room) => sum + (room.roomsCount || 0), 0);
                const roomTypesCount = floorRooms.length;
                
                const themeClass = `property-viz-theme-${floorIdx % 8}`;
                
                return (
                  <button
                    key={floor}
                    onClick={() => handleFloorChange(floor)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleFloorChange(floor);
                      }
                    }}
                    className={`relative w-full rounded-xl border-2 transition-all duration-300 transform property-viz-floor-button-compact ${themeClass} focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      isActive
                        ? "shadow-lg scale-[1.02] ring-2 ring-offset-2"
                        : "border-gray-200 hover:shadow-md hover:scale-[1.01]"
                    }`}
                    aria-label={`${getFloorName(floor)} floor, ${roomCount} rooms, ${roomTypesCount} room types`}
                    aria-pressed={isActive}
                    aria-current={isActive ? "true" : "false"}
                    role="button"
                    tabIndex={0}
                  >
                    {/* Compact Layout */}
                    <div className="p-4 flex items-center justify-between gap-3">
                      {/* Left: Floor Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Accent Line Indicator */}
                        <div className="w-1.5 h-12 rounded-full property-viz-floor-accent flex-shrink-0" />
                        
                        {/* Floor Details */}
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-base property-viz-floor-label ${
                            isActive ? "property-viz-floor-label-active" : ""
                          }`}>
                            {getFloorName(floor)} Floor
                          </div>
                          <div className={`text-xs mt-0.5 property-viz-floor-types ${
                            isActive ? "property-viz-floor-types-active" : "text-gray-500"
                          }`}>
                            {roomTypesCount} {roomTypesCount === 1 ? "type" : "types"}
                          </div>
                        </div>
                      </div>
                      
                      {/* Right: Room Count Badge */}
                      <div className={`px-3 py-1.5 rounded-lg text-xs font-bold property-viz-floor-badge-compact flex-shrink-0 ${
                        isActive ? "property-viz-floor-badge-active" : ""
                      }`}>
                        {roomCount} {roomCount === 1 ? "room" : "rooms"}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>

          {/* Selected Floor Details - Compact */}
          <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-sm font-bold text-gray-900">
                {getFloorName(currentFloor)} Floor Details
              </h5>
              <button
                onClick={() => setViewMode("plan")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setViewMode("plan");
                  }
                }}
                className="px-3 py-1.5 bg-[#02665e] text-white rounded-lg text-xs font-semibold hover:bg-[#014e47] transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e] focus:ring-offset-2"
                aria-label="View detailed floor plan"
                title="View detailed floor plan (Press Enter or Space)"
              >
                <Grid3x3 className="w-3.5 h-3.5" />
                View Plan
              </button>
            </div>
            
            {currentRooms.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {currentRooms.map((room, idx) => {
                  const themeClass = getRoomThemeClass(room.roomType);
                  return (
                  <button
                    key={`${room.roomType}-${idx}`}
                    type="button"
                    onClick={() => onRoomTypeClick?.({ roomType: room.roomType, floor: currentFloor, view: "structure" })}
                    className={[
                      "p-3 rounded-lg border transition-all",
                      "property-viz-roomtype-card",
                      themeClass,
                      "hover:shadow-sm",
                      onRoomTypeClick ? "cursor-pointer" : "cursor-default",
                    ].join(" ")}
                    aria-label={
                      onRoomTypeClick
                        ? `Open details for ${room.roomType} on ${getFloorName(currentFloor)} floor`
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-8 rounded-full property-viz-roomtype-accent flex-shrink-0" aria-hidden />
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 property-viz-roomtype-icon">
                        <BedDouble className="w-4 h-4" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-gray-900 truncate">{room.roomType}</div>
                        <div className="text-xs text-gray-600">{room.roomsCount} {room.roomsCount === 1 ? "room" : "rooms"}</div>
                      </div>
                    </div>
                  </button>
                )})}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <BedDouble className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No rooms on this floor</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Immersive Floor Plan Content */}
      {viewMode === "plan" && (
      <div className="relative p-6 sm:p-8 bg-gradient-to-b from-white via-gray-50/30 to-white min-h-[400px]">
        {/* Floor Title with Animation */}
        <div className="text-center mb-8">
          <div className={`transition-all duration-500 ${isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
            <h4 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#02665e]/10 flex items-center justify-center">
                <Layers className="w-4 h-4 text-[#02665e]" />
              </div>
              {getFloorName(currentFloor)} Floor
            </h4>
            <p className="text-sm text-gray-600 font-medium">
              {planRoomTypes.length} {planRoomTypes.length === 1 ? "room type" : "room types"} on this floor
            </p>
          </div>
        </div>

        {/* Room Type Tiles (modern + compact, grouped by room type) */}
        {planRoomTypes.length > 0 ? (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-500 ${isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
            {/* Performance: Limit visible room types, show message if truncated */}
            {planRoomTypes.slice(0, 50).map((room) => {
              const themeClass = getRoomThemeClass(room.roomType);
              return (
                <button
                  key={`${room.roomType}-${currentFloor}`}
                  type="button"
                  onClick={() => onRoomTypeClick?.({ roomType: room.roomType, floor: currentFloor, view: "plan" })}
                  className={[
                    "group text-left rounded-2xl border p-5",
                    "property-viz-roomtype-card property-viz-roomtype-plan-card",
                    themeClass,
                    "transition-all duration-300",
                    "hover:shadow-md hover:-translate-y-0.5",
                    "focus:outline-none focus:ring-2 focus:ring-offset-2",
                  ].join(" ")}
                  aria-label={`${room.roomType}, ${room.roomsCount} ${room.roomsCount === 1 ? "room" : "rooms"} on ${getFloorName(currentFloor)} floor`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 property-viz-roomtype-icon">
                        <BedDouble className="w-5 h-5" aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-slate-900 truncate">{room.roomType}</div>
                        <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" aria-hidden />
                          <span className="truncate">{getFloorName(currentFloor)} Floor</span>
                        </div>
                      </div>
                    </div>

                    <span className="shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold property-viz-roomtype-pill">
                      {room.roomsCount} {room.roomsCount === 1 ? "room" : "rooms"}
                    </span>
                  </div>

                  <div className="mt-4 h-1 rounded-full property-viz-roomtype-accent opacity-80" aria-hidden />
                </button>
              );
            })}
            {/* Performance message for large properties */}
            {planRoomTypes.length > 50 && (
              <div className="col-span-full p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <p className="font-semibold">Showing first 50 of {planRoomTypes.length} room types</p>
                <p className="text-xs mt-1">For better performance, large properties display a subset of rooms.</p>
              </div>
            )}
          </div>
        ) : (
          <div className={`text-center py-16 transition-all duration-500 ${isTransitioning ? "opacity-0" : "opacity-100"}`}>
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <BedDouble className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium text-lg">No rooms on this floor</p>
            <p className="text-sm text-gray-500 mt-1">Switch to another floor to view rooms</p>
          </div>
        )}

        {/* Enhanced Navigation with Smooth Transitions */}
        {availableFloors.length > 1 && (
          <div className="flex items-center justify-between mt-10 pt-8 border-t-2 border-gray-200">
            <button
              onClick={() => {
                const prevIndex = availableFloors.indexOf(currentFloor);
                if (prevIndex > 0) {
                  handleFloorChange(availableFloors[prevIndex - 1]);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const prevIndex = availableFloors.indexOf(currentFloor);
                  if (prevIndex > 0) {
                    handleFloorChange(availableFloors[prevIndex - 1]);
                  }
                }
              }}
              disabled={availableFloors.indexOf(currentFloor) === 0}
              className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 text-gray-700 hover:from-[#02665e] hover:to-[#014e47] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 border-2 border-gray-200 hover:border-[#02665e] focus:outline-none focus:ring-2 focus:ring-[#02665e] focus:ring-offset-2"
              aria-label="Navigate to previous floor"
              aria-disabled={availableFloors.indexOf(currentFloor) === 0}
              title="Previous floor (Arrow Up/Left or Enter)"
            >
              <ChevronDown className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-gray-200 shadow-md">
              <div className="w-8 h-8 rounded-lg bg-[#02665e]/10 flex items-center justify-center">
                <Layers className="w-4 h-4 text-[#02665e]" />
              </div>
              <div className="text-sm font-bold text-gray-700">
                Floor <span className="text-[#02665e]">{availableFloors.indexOf(currentFloor) + 1}</span> of <span className="text-gray-500">{availableFloors.length}</span>
              </div>
            </div>

            <button
              onClick={() => {
                const nextIndex = availableFloors.indexOf(currentFloor);
                if (nextIndex < availableFloors.length - 1) {
                  handleFloorChange(availableFloors[nextIndex + 1]);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const nextIndex = availableFloors.indexOf(currentFloor);
                  if (nextIndex < availableFloors.length - 1) {
                    handleFloorChange(availableFloors[nextIndex + 1]);
                  }
                }
              }}
              disabled={availableFloors.indexOf(currentFloor) === availableFloors.length - 1}
              className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 text-gray-700 hover:from-[#02665e] hover:to-[#014e47] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110 border-2 border-gray-200 hover:border-[#02665e] focus:outline-none focus:ring-2 focus:ring-[#02665e] focus:ring-offset-2"
              aria-label="Navigate to next floor"
              aria-disabled={availableFloors.indexOf(currentFloor) === availableFloors.length - 1}
              title="Next floor (Arrow Down/Right or Enter)"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}


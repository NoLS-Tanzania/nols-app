"use client";
import React from "react";
import { MapPin, Layers, Navigation } from "lucide-react";

interface DriverLiveMapFloatingActionsProps {
  onLocationClick?: () => void;
  onLayersClick?: () => void;
  onNavigationClick?: () => void;
}

export default function DriverLiveMapFloatingActions({
  onLocationClick,
  onLayersClick,
  onNavigationClick,
}: DriverLiveMapFloatingActionsProps) {
  return (
    <div className="absolute bottom-40 right-4 z-25 flex flex-col gap-2">
      {/* Location Button */}
      <button
        onClick={onLocationClick}
        className="bg-white rounded-full p-2.5 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 border border-slate-200"
        aria-label="Center on location"
        title="Center on my location"
      >
        <MapPin className="h-4 w-4 text-slate-700" />
      </button>

      {/* Navigation Button */}
      {onNavigationClick && (
        <button
          onClick={onNavigationClick}
          className="bg-white rounded-full p-2.5 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 border border-slate-200"
          aria-label="Start navigation"
          title="Start navigation"
        >
          <Navigation className="h-4 w-4 text-emerald-600" />
        </button>
      )}

      {/* Map Layers Button */}
      <button
        onClick={onLayersClick}
        className="bg-white rounded-full p-2.5 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 border border-slate-200"
        aria-label="Map layers"
        title="Map layers"
      >
        <Layers className="h-4 w-4 text-slate-700" />
      </button>
    </div>
  );
}


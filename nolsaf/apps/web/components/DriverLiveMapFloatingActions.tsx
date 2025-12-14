"use client";
import React from "react";
import { ChevronDown, Layers, MapPin, MessageCircle, Moon, Navigation, Route, Sun } from "lucide-react";

interface DriverLiveMapFloatingActionsProps {
  isDark?: boolean;
  onLocationClick?: () => void;
  onLayersClick?: () => void;
  onNavigationClick?: () => void;
  onRoutesClick?: () => void;
  mapThemeToggle?: {
    isDark: boolean;
    onToggle: () => void;
  };
  overlayToggle?: {
    isVisible: boolean;
    onToggle: () => void;
  };
}

export default function DriverLiveMapFloatingActions({
  isDark,
  onLocationClick,
  onLayersClick,
  onNavigationClick,
  onRoutesClick,
  mapThemeToggle,
  overlayToggle,
}: DriverLiveMapFloatingActionsProps) {
  const base = [
    "h-12 w-12 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 border",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    // Theme-adaptive "glass" so it stays readable on both day/night map styles.
    isDark
      ? "bg-slate-950/55 text-slate-100 border-white/15 backdrop-blur-md focus-visible:ring-offset-slate-950"
      : "bg-white text-slate-900 border-slate-200 focus-visible:ring-offset-white",
  ].join(" ");

  const themed = (light: string, dark: string) => (isDark ? dark : light);
  return (
    <div
      className={[
        "absolute z-40 flex flex-col gap-2",
        // Keep the stack low, but respect mobile safe-area insets (Android/iOS).
        "bottom-[calc(0.75rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1rem+env(safe-area-inset-bottom))]",
        "right-[calc(1rem+env(safe-area-inset-right))]",
      ].join(" ")}
    >
      {/* Location Button */}
      <button
        onClick={onLocationClick}
        className={[
          base,
          themed(
            "hover:border-blue-200 hover:bg-blue-50 active:bg-blue-100 focus-visible:ring-blue-300",
            "hover:border-blue-300/40 hover:bg-blue-500/15 active:bg-blue-500/20 focus-visible:ring-blue-400/50"
          ),
        ].join(" ")}
        aria-label="Center on location"
        title="Center on my location"
      >
        <MapPin className={["h-5 w-5", themed("text-blue-600", "text-blue-300")].join(" ")} />
      </button>

      {/* Routes Button */}
      {onRoutesClick && (
        <button
          onClick={onRoutesClick}
          className={[
            base,
            themed(
              "hover:border-violet-200 hover:bg-violet-50 active:bg-violet-100 focus-visible:ring-violet-300",
              "hover:border-violet-300/40 hover:bg-violet-500/15 active:bg-violet-500/20 focus-visible:ring-violet-400/50"
            ),
          ].join(" ")}
          aria-label="Routes"
          title="Routes"
        >
          <Route className={["h-5 w-5", themed("text-violet-600", "text-violet-300")].join(" ")} />
        </button>
      )}

      {/* Map Theme (Light/Dark) */}
      {mapThemeToggle && (
        <button
          onClick={mapThemeToggle.onToggle}
          className={[
            base,
            themed(
              "hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-slate-300",
              "hover:border-white/25 hover:bg-white/10 active:bg-white/15 focus-visible:ring-white/30"
            ),
          ].join(" ")}
          aria-label={mapThemeToggle.isDark ? "Switch to light map" : "Switch to dark map"}
          title={mapThemeToggle.isDark ? "Light map" : "Dark map"}
        >
          {mapThemeToggle.isDark ? (
            <Sun className={["h-5 w-5", themed("text-amber-600", "text-amber-300")].join(" ")} />
          ) : (
            <Moon className={["h-5 w-5", themed("text-slate-700", "text-slate-200")].join(" ")} />
          )}
        </button>
      )}

      {/* Navigation Button */}
      {onNavigationClick && (
        <button
          onClick={onNavigationClick}
          className={[
            base,
            themed(
              "hover:border-emerald-200 hover:bg-emerald-50 active:bg-emerald-100 focus-visible:ring-emerald-300",
              "hover:border-emerald-300/40 hover:bg-emerald-500/15 active:bg-emerald-500/20 focus-visible:ring-emerald-400/50"
            ),
          ].join(" ")}
          aria-label="Start navigation"
          title="Start navigation"
        >
          <Navigation className={["h-5 w-5", themed("text-emerald-600", "text-emerald-300")].join(" ")} />
        </button>
      )}

      {/* Map Layers Button */}
      <button
        onClick={onLayersClick}
        className={[
          base,
          themed(
            "hover:border-amber-200 hover:bg-amber-50 active:bg-amber-100 focus-visible:ring-amber-300",
            "hover:border-amber-300/40 hover:bg-amber-500/15 active:bg-amber-500/20 focus-visible:ring-amber-400/50"
          ),
        ].join(" ")}
        aria-label="Map layers"
        title="Map layers"
      >
        <Layers className={["h-5 w-5", themed("text-amber-600", "text-amber-300")].join(" ")} />
      </button>

      {/* Overlay toggle button (hide/show trip card) — placed under the stack to keep consistent spacing/ratio */}
      {overlayToggle && (
        <button
          onClick={overlayToggle.onToggle}
          className={[
            base,
            overlayToggle.isVisible
              ? themed(
                  "hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-slate-300",
                  "hover:border-white/25 hover:bg-white/10 active:bg-white/15 focus-visible:ring-white/30"
                )
              : themed(
                  "border-blue-200 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 focus-visible:ring-blue-300",
                  "border-blue-300/35 bg-blue-500/15 hover:bg-blue-500/20 active:bg-blue-500/25 focus-visible:ring-blue-400/50"
                ),
          ].join(" ")}
          aria-label={overlayToggle.isVisible ? "Hide trip card" : "Show trip card"}
          title={overlayToggle.isVisible ? "Hide trip card" : "Show trip card"}
        >
          {overlayToggle.isVisible ? (
            <ChevronDown className={["h-5 w-5", themed("text-slate-700", "text-slate-200")].join(" ")} />
          ) : (
            <MessageCircle className={["h-5 w-5", themed("text-blue-700", "text-blue-300")].join(" ")} />
          )}
        </button>
      )}
    </div>
  );
}


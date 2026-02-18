"use client";
import React, { useState, useEffect } from "react";
import { ChevronDown, Layers, MapPin, MessageCircle, Moon, Navigation, Route, Sun, Phone, CheckCircle } from "lucide-react";

interface DriverLiveMapFloatingActionsProps {
  isDark?: boolean;
  raiseForEarningsFab?: boolean;
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
  tripActions?: {
    phoneNumber?: string;
    onCall?: () => void;
    onMessage?: () => void;
    onConfirmPickup?: () => void;
    canConfirmPickup?: boolean;
  };
}

export default function DriverLiveMapFloatingActions({
  isDark,
  raiseForEarningsFab,
  onLocationClick,
  onLayersClick,
  onNavigationClick,
  onRoutesClick,
  mapThemeToggle,
  overlayToggle,
  tripActions,
}: DriverLiveMapFloatingActionsProps) {
  // Menu state - only shows when phone icon is clicked
  const [showTripMenu, setShowTripMenu] = useState(false);
  
  // Close menu when tripActions is removed or changes
  useEffect(() => {
    if (!tripActions) {
      setShowTripMenu(false);
    }
  }, [tripActions]);
  
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
        raiseForEarningsFab
          ? "bottom-[calc(4.25rem+env(safe-area-inset-bottom))] sm:bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
          : "bottom-[calc(0.75rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1rem+env(safe-area-inset-bottom))]",
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

      {/* Routes Button - Always visible for route control */}
      <button
        onClick={onRoutesClick || (() => {})}
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

      {/* Navigation Button - Always visible for route control */}
      <button
        onClick={onNavigationClick || (() => {})}
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

      {/* Trip Actions Button - Call, SMS, Confirm Pickup */}
      {tripActions && (
        <>
          <button
            onClick={() => setShowTripMenu(!showTripMenu)}
            className={[
              base,
              showTripMenu
                ? themed(
                    "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 focus-visible:ring-emerald-300",
                    "border-emerald-300/40 bg-emerald-500/20 hover:bg-emerald-500/25 active:bg-emerald-500/30 focus-visible:ring-emerald-400/50"
                  )
                : themed(
                    "hover:border-emerald-200 hover:bg-emerald-50 active:bg-emerald-100 focus-visible:ring-emerald-300",
                    "hover:border-emerald-300/40 hover:bg-emerald-500/15 active:bg-emerald-500/20 focus-visible:ring-emerald-400/50"
                  ),
            ].join(" ")}
            aria-label="Trip actions"
            title="Call, message, or confirm pickup"
          >
            <Phone className={["h-5 w-5", themed("text-emerald-600", "text-emerald-300")].join(" ")} />
          </button>
          
          {/* Trip Actions Menu - Only shows when phone icon is clicked */}
          {showTripMenu && (
            <>
              {/* Backdrop - closes menu when clicked */}
              <div
                className="fixed inset-0 z-[100]"
                onClick={() => setShowTripMenu(false)}
                aria-hidden="true"
              />
              {/* Menu - positioned right above the phone icon button */}
              <div
                className={[
                  "absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-0 z-[110] min-w-[200px] rounded-xl shadow-2xl border overflow-hidden animate-fade-in-up",
                  themed("bg-white border-slate-200", "bg-slate-950/90 border-white/15 backdrop-blur-md"),
                ].join(" ")}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2 space-y-1">
                  {/* Call Button */}
                  {tripActions.phoneNumber && tripActions.onCall && (
                    <button
                      onClick={() => {
                        tripActions.onCall?.();
                        setShowTripMenu(false);
                      }}
                      className={[
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium border",
                        themed(
                          "hover:bg-emerald-50 text-emerald-700 border-emerald-200 bg-white",
                          "hover:bg-emerald-500/15 text-emerald-200 border-emerald-400/25 bg-white/5"
                        ),
                      ].join(" ")}
                    >
                      <Phone className="h-4 w-4" />
                      <span>Call Traveler</span>
                    </button>
                  )}
                  
                  {/* Message/SMS Button */}
                  {tripActions.phoneNumber && tripActions.onMessage && (
                    <button
                      onClick={() => {
                        tripActions.onMessage?.();
                        setShowTripMenu(false);
                      }}
                      className={[
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium border",
                        themed(
                          "hover:bg-blue-50 text-blue-700 border-blue-200 bg-white",
                          "hover:bg-blue-500/15 text-blue-200 border-blue-400/25 bg-white/5"
                        ),
                      ].join(" ")}
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Send SMS</span>
                    </button>
                  )}
                  
                  {/* Confirm Pickup Button */}
                  {tripActions.onConfirmPickup && (
                    <button
                      onClick={() => {
                        tripActions.onConfirmPickup?.();
                        setShowTripMenu(false);
                      }}
                      disabled={!tripActions.canConfirmPickup}
                      className={[
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium border",
                        tripActions.canConfirmPickup
                          ? themed(
                              "hover:bg-green-50 text-green-700 border-green-200 bg-white",
                              "hover:bg-green-500/15 text-green-200 border-green-400/25 bg-white/5"
                            )
                          : themed(
                              "opacity-50 cursor-not-allowed text-slate-400 border-slate-200 bg-white",
                              "opacity-50 cursor-not-allowed text-slate-500 border-white/10 bg-white/5"
                            ),
                      ].join(" ")}
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Confirm Pickup</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

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


"use client";
import React, { useState, useEffect } from "react";
import { CheckCircle, ChevronDown, Layers, MapPin, MessageCircle, Moon, Navigation, Phone, Route, SlidersHorizontal, Sun } from "lucide-react";

interface DriverLiveMapFloatingActionsProps {
  isDark?: boolean;
  activeTripMode?: boolean;
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
  activeTripMode,
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
  const [showMapTools, setShowMapTools] = useState(false);
  
  // Close menu when tripActions is removed or changes
  useEffect(() => {
    if (!tripActions) {
      setShowTripMenu(false);
    }
  }, [tripActions]);

  useEffect(() => {
    if (!activeTripMode) {
      setShowMapTools(false);
    }
  }, [activeTripMode]);
  
  const base = [
    "h-12 w-12 rounded-[1.15rem] flex items-center justify-center shadow-[0_16px_32px_rgba(15,23,42,0.14)] transition-all duration-200 hover:scale-[1.04] active:scale-[0.97] border ring-1",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    isDark
      ? "bg-slate-950/64 text-slate-100 border-white/12 ring-white/10 backdrop-blur-xl focus-visible:ring-offset-slate-950"
      : "bg-white/90 text-slate-900 border-white/80 ring-slate-200/80 backdrop-blur-xl focus-visible:ring-offset-white",
  ].join(" ");

  const themed = (light: string, dark: string) => (isDark ? dark : light);
  const showCondensedTools = Boolean(activeTripMode);
  const hasSecondaryMapTools = Boolean(onRoutesClick || onLayersClick || mapThemeToggle);
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
            "border-[#02665e]/18 ring-[#02665e]/10 bg-white/92 hover:border-[#02665e]/28 hover:bg-[#02665e]/[0.07] active:bg-[#02665e]/[0.12] focus-visible:ring-[#02665e]/30",
            "border-[#02665e]/28 ring-[#35a79c]/10 bg-slate-950/70 hover:border-[#35a79c]/42 hover:bg-[#02665e]/18 active:bg-[#02665e]/24 focus-visible:ring-[#35a79c]/40"
          ),
        ].join(" ")}
        aria-label="Center on location"
        title="Center on my location"
      >
        <MapPin className={["h-5 w-5", themed("text-[#02665e]", "text-[#63c7bc]")].join(" ")} />
      </button>

      {!showCondensedTools && (
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
      )}

      {!showCondensedTools && mapThemeToggle && (
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

      {!showCondensedTools && (
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
      )}

      {showCondensedTools && hasSecondaryMapTools && (
        <>
          <button
            onClick={() => setShowMapTools((open) => !open)}
            className={[
              base,
              showMapTools
                ? themed(
                    "border-slate-300 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 focus-visible:ring-slate-300",
                    "border-white/25 bg-white/10 hover:bg-white/15 active:bg-white/20 focus-visible:ring-white/30"
                  )
                : themed(
                    "hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-slate-300",
                    "hover:border-white/25 hover:bg-white/10 active:bg-white/15 focus-visible:ring-white/30"
                  ),
            ].join(" ")}
            aria-label="Map tools"
            title="Map tools"
          >
            <SlidersHorizontal className={["h-5 w-5", themed("text-slate-700", "text-slate-200")].join(" ")} />
          </button>

          {showMapTools && (
            <>
              <div className="fixed inset-0 z-[100]" onClick={() => setShowMapTools(false)} aria-hidden="true" />
              <div
                className={[
                  "absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-0 z-[110] min-w-[226px] rounded-[1.4rem] border shadow-[0_26px_56px_rgba(15,23,42,0.24)] overflow-hidden animate-fade-in-up",
                  themed("bg-white/94 border-white/80 ring-1 ring-slate-200/80 backdrop-blur-xl", "bg-slate-950/90 border-white/12 ring-1 ring-white/10 backdrop-blur-xl"),
                ].join(" ")}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2.5 space-y-2">
                  {onRoutesClick && (
                    <button
                      onClick={() => {
                        onRoutesClick();
                        setShowMapTools(false);
                      }}
                      className={[
                        "w-full flex items-center gap-3 px-4 py-3.5 rounded-[1rem] transition-colors text-sm font-medium border",
                        themed(
                          "hover:bg-violet-50 text-violet-700 border-violet-200 bg-white",
                          "hover:bg-violet-500/15 text-violet-200 border-violet-400/25 bg-white/5"
                        ),
                      ].join(" ")}
                    >
                      <Route className="h-4 w-4" />
                      <span>Route options</span>
                    </button>
                  )}
                  {onLayersClick && (
                    <button
                      onClick={() => {
                        onLayersClick();
                        setShowMapTools(false);
                      }}
                      className={[
                        "w-full flex items-center gap-3 px-4 py-3.5 rounded-[1rem] transition-colors text-sm font-medium border",
                        themed(
                          "hover:bg-amber-50 text-amber-700 border-amber-200 bg-white",
                          "hover:bg-amber-500/15 text-amber-200 border-amber-400/25 bg-white/5"
                        ),
                      ].join(" ")}
                    >
                      <Layers className="h-4 w-4" />
                      <span>Map layers</span>
                    </button>
                  )}
                  {mapThemeToggle && (
                    <button
                      onClick={() => {
                        mapThemeToggle.onToggle();
                        setShowMapTools(false);
                      }}
                      className={[
                        "w-full flex items-center gap-3 px-4 py-3.5 rounded-[1rem] transition-colors text-sm font-medium border",
                        themed(
                          "hover:bg-slate-50 text-slate-700 border-slate-200 bg-white",
                          "hover:bg-white/10 text-slate-100 border-white/15 bg-white/5"
                        ),
                      ].join(" ")}
                    >
                      {mapThemeToggle.isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      <span>{mapThemeToggle.isDark ? "Light map" : "Dark map"}</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

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
                  "absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-0 z-[110] min-w-[212px] rounded-[1.35rem] shadow-[0_26px_56px_rgba(15,23,42,0.24)] border overflow-hidden animate-fade-in-up",
                  themed("bg-white/94 border-white/80 ring-1 ring-slate-200/80 backdrop-blur-xl", "bg-slate-950/90 border-white/12 ring-1 ring-white/10 backdrop-blur-xl"),
                ].join(" ")}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2.5 space-y-2">
                  {/* Call Button */}
                  {tripActions.phoneNumber && tripActions.onCall && (
                    <button
                      onClick={() => {
                        tripActions.onCall?.();
                        setShowTripMenu(false);
                      }}
                      className={[
                        "w-full flex items-center gap-3 px-4 py-3.5 rounded-[1rem] transition-colors text-sm font-medium border",
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
                        "w-full flex items-center gap-3 px-4 py-3.5 rounded-[1rem] transition-colors text-sm font-medium border",
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
                        "w-full flex items-center gap-3 px-4 py-3.5 rounded-[1rem] transition-colors text-sm font-medium border",
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


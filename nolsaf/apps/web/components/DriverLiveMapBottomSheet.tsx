"use client";
import React, { useState } from "react";
import Image from "next/image";
import { ChevronUp, ChevronDown, DollarSign, Clock, Navigation, Phone, MessageCircle, X, CheckCircle, Bell } from "lucide-react";
import DriverMatchingInfo from "./DriverMatchingInfo";
import LoadingSpinner from "./LoadingSpinner";

interface TripRequest {
  id: string;
  passengerName: string;
  passengerRating: number;
  passengerPhoto?: string;
  pickupAddress: string;
  pickupDistance: string;
  pickupETA: string;
  dropoffAddress: string;
  dropoffDistance: string;
  fare: string;
  tripType: string;
  matchedDriver?: {
    id: string;
    name: string;
    rating: number;
    level: "Silver" | "Gold" | "Diamond";
    distance: number;
    estimatedTime: number;
    acceptanceRate?: number;
  };
}

interface ActiveTrip {
  id: string;
  status: string;
  passengerName: string;
  passengerRating: number;
  passengerPhoto?: string;
  pickupAddress: string;
  dropoffAddress: string;
  fare: string;
  phoneNumber?: string;
}

type TripStage = 
  | 'waiting'           // Before request - initial map state
  | 'request_received'  // After request - trip request card shown
  | 'accepted'          // After accept - driver accepted, going to pickup
  | 'pickup'            // During pickup - driver at pickup location
  | 'picked_up'         // After pickup - client in vehicle
  | 'in_transit'        // On the way to destination
  | 'arrived'           // At destination - arrived at dropoff
  | 'dropoff'           // Dropoff & Review - client exits, provides review
  | 'completed';        // After review - back to waiting

interface DriverLiveMapBottomSheetProps {
  isCollapsed: boolean;
  onToggle: () => void;
  mapTheme?: "light" | "dark";
  tripRequest?: TripRequest | null;
  activeTrip?: ActiveTrip | null;
  tripStage?: TripStage;
  todayEarnings?: number;
  onAcceptTrip?: (tripId: string) => void;
  onDeclineTrip?: (tripId: string) => void;
  onCompleteTrip?: (tripId: string) => void;
  onArriveAtPickup?: () => void;
  onPickupPassenger?: () => void;
  onStartTrip?: () => void;
  onArriveAtDestination?: () => void;
  onStartDropoff?: () => void;
  onCall?: (phoneNumber: string) => void;
  onMessage?: (phoneNumber: string) => void;
  onSendQuickMessage?: (templateKey: string, toUserId?: string) => Promise<void> | void;
  latestUserMessage?: string;
  isAccepting?: boolean;
  isDeclining?: boolean;
}

export default function DriverLiveMapBottomSheet({
  isCollapsed,
  onToggle,
  mapTheme = "light",
  tripRequest,
  activeTrip,
  tripStage = 'waiting',
  todayEarnings = 0,
  onAcceptTrip,
  onDeclineTrip,
  onCompleteTrip,
  onArriveAtPickup,
  onPickupPassenger,
  onStartTrip,
  onArriveAtDestination,
  onStartDropoff,
  onCall,
  onMessage,
  onSendQuickMessage,
  latestUserMessage,
  isAccepting = false,
  isDeclining = false,
}: DriverLiveMapBottomSheetProps) {
  const isDark = mapTheme === "dark";
  const themed = (light: string, dark: string) => (isDark ? dark : light);

  const sheetBase = themed(
    "bg-white border-t border-slate-200 text-slate-900",
    "bg-slate-950/85 border-t border-white/12 text-slate-50"
  );
  const sheetShadow = themed("shadow-2xl", "shadow-[0_-18px_60px_rgba(0,0,0,0.5)]");
  const handleBar = themed("bg-slate-300 hover:bg-slate-400", "bg-white/18 hover:bg-white/22");
  const muted = themed("text-slate-500", "text-slate-200/70");
  const text = themed("text-slate-900", "text-slate-50");
  const iconMuted = themed("text-slate-600", "text-slate-200/80");

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // If the sheet is collapsed and we're already on an active trip, hide the sheet entirely.
  if (isCollapsed && activeTrip && !tripRequest) {
    return null;
  }

  // Collapsed state - shows earnings summary (hidden on the right, with a button to open)
  if (isCollapsed && !tripRequest && !activeTrip) {
    return (
      <>
        {/* Earnings button - always visible on the right side when collapsed */}
        <button
          onClick={onToggle}
          className={[
            "absolute bottom-4 right-4 z-30 rounded-full p-2.5 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 pointer-events-auto border backdrop-blur-md",
            themed("bg-white border-slate-200", "bg-slate-950/55 border-white/15"),
          ].join(" ")}
          aria-label="Show earnings"
          title={`Today's Earnings: ${formatMoney(todayEarnings)}`}
        >
          <DollarSign className={["h-4 w-4", themed("text-emerald-600", "text-emerald-300")].join(" ")} />
        </button>
      </>
    );
  }

  // Expanded earnings card - slides in from right when button is clicked
  if (!isCollapsed && !tripRequest && !activeTrip) {
    return (
      <>
        {/* Earnings card - slides in from right */}
        <div
          className={[
            "absolute bottom-4 right-4 z-30 rounded-2xl shadow-2xl border pointer-events-auto transition-all duration-300 translate-x-0 opacity-100 animate-slide-in-right backdrop-blur-md",
            themed("bg-white border-slate-200", "bg-slate-950/75 border-white/15 text-slate-50"),
          ].join(" ")}
        >
          <div className="px-5 pt-3 pb-4 min-w-[200px]">
            <div className="flex items-center justify-between mb-2">
              <p className={["text-xs", muted].join(" ")}>Today's Earnings</p>
              <button
                onClick={onToggle}
                className={["p-1 rounded-full transition-colors", themed("hover:bg-slate-100", "hover:bg-white/10")].join(" ")}
                aria-label="Close"
              >
                <X className={["h-4 w-4", iconMuted].join(" ")} />
              </button>
            </div>
            <p className={["text-2xl font-bold", text].join(" ")}>{formatMoney(todayEarnings)}</p>
          </div>
        </div>
      </>
    );
  }

  // Trip Request Card
  if (tripRequest) {
    return (
      <div
        className={[
          "absolute bottom-0 left-0 right-0 z-30 rounded-t-3xl animate-slide-up pointer-events-auto ring-2",
          sheetBase,
          sheetShadow,
          themed("ring-emerald-200", "ring-emerald-400/25"),
        ].join(" ")}
      >
        <div className="px-6 pt-4 pb-6 max-h-[80vh] overflow-y-auto space-y-5">
          {/* Drag handle */}
          <div className={["w-12 h-1.5 rounded-full mx-auto transition-colors", themed("bg-slate-300", "bg-white/18")].join(" ")} />

          {/* Attention bell (pulsing) */}
          <div className="absolute right-6 top-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
              <div
                className={[
                  "relative h-10 w-10 rounded-full border flex items-center justify-center shadow-sm",
                  themed("bg-emerald-50 border-emerald-200", "bg-emerald-500/12 border-emerald-400/25"),
                ].join(" ")}
              >
                <Bell className={["h-5 w-5", themed("text-emerald-700", "text-emerald-200")].join(" ")} />
              </div>
            </div>
          </div>

          {/* Passenger Info */}
          <div className="flex items-center gap-4">
            <div
              className={[
                "relative w-16 h-16 rounded-full flex items-center justify-center overflow-hidden",
                themed("bg-slate-200", "bg-white/10 border border-white/10"),
              ].join(" ")}
            >
              {tripRequest.passengerPhoto ? (
                <Image 
                  src={tripRequest.passengerPhoto || "/assets/default-avatar.png"} 
                  alt={tripRequest.passengerName} 
                  fill
                  className="object-cover rounded-full"
                  unoptimized
                />
              ) : (
                <span className={["text-2xl font-semibold", themed("text-slate-600", "text-slate-100")].join(" ")}>
                  {tripRequest.passengerName.charAt(0).toUpperCase()}
                </span>
              )}
              <div
                className={[
                  "absolute -bottom-1 -right-1 rounded-full p-1 shadow",
                  themed("bg-white", "bg-slate-950/85 border border-white/10"),
                ].join(" ")}
              >
                <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={["text-xl font-semibold truncate", text].join(" ")}>{tripRequest.passengerName}</h3>
              <div className={["flex items-center gap-2 mt-1 text-sm", themed("text-slate-600", "text-slate-200/75")].join(" ")}>
                <span className="text-amber-500">★</span>
                <span>{tripRequest.passengerRating.toFixed(1)}</span>
              </div>
            </div>
            <div
              className={[
                "px-3 py-1.5 rounded-full text-xs font-semibold border",
                themed("bg-emerald-50 text-emerald-700 border-emerald-100", "bg-emerald-500/12 text-emerald-200 border-emerald-400/20"),
              ].join(" ")}
            >
              {tripRequest.tripType}
            </div>
          </div>

          <div className="grid gap-4">
            {/* Pickup */}
            <div className={["rounded-xl border p-4", themed("border-slate-200 bg-white", "border-white/12 bg-white/5")].join(" ")}>
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                  <div className={["w-0.5 h-10 mx-auto", themed("bg-slate-200", "bg-white/12")].join(" ")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-emerald-600 font-semibold mb-1">Pickup</p>
                  <p className={["text-base font-semibold leading-snug", text].join(" ")}>{tripRequest.pickupAddress}</p>
                  <div className={["flex items-center gap-4 text-xs mt-2", muted].join(" ")}>
                    <span className="flex items-center gap-1">
                      <Navigation className="h-3.5 w-3.5" />
                      {tripRequest.pickupDistance}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {tripRequest.pickupETA}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dropoff */}
            <div className={["rounded-xl border p-4", themed("border-slate-200 bg-white", "border-white/12 bg-white/5")].join(" ")}>
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={["text-[11px] uppercase tracking-wide font-semibold mb-1", muted].join(" ")}>Dropoff</p>
                  <p className={["text-base font-semibold leading-snug", text].join(" ")}>{tripRequest.dropoffAddress}</p>
                  <p className={["text-xs mt-2", muted].join(" ")}>{tripRequest.dropoffDistance}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Driver Matching Info */}
          {tripRequest.matchedDriver && (
            <div
              className={[
                "rounded-xl border p-4",
                themed(
                  "border-slate-200 bg-gradient-to-br from-emerald-50 to-blue-50",
                  "border-white/12 bg-gradient-to-br from-emerald-500/12 to-blue-500/10"
                ),
              ].join(" ")}
            >
              <p className={["text-xs font-semibold mb-2 uppercase tracking-wide", themed("text-slate-700", "text-slate-200/80")].join(" ")}>
                Matched Driver
              </p>
              <DriverMatchingInfo matchedDriver={tripRequest.matchedDriver} />
            </div>
          )}

          {/* Fare Estimate */}
          <div className={["rounded-2xl border p-5 shadow-sm", themed("border-slate-200 bg-slate-50", "border-white/12 bg-white/5")].join(" ")}>
            <div className="flex items-center justify-between">
              <div>
                <p className={["text-xs mb-1", muted].join(" ")}>Estimated Fare</p>
                <p className={["text-2xl font-bold", text].join(" ")}>{tripRequest.fare}</p>
              </div>
              <div
                className={[
                  "h-12 w-12 rounded-full border flex items-center justify-center",
                  themed("bg-emerald-50 border-emerald-100", "bg-emerald-500/12 border-emerald-400/20"),
                ].join(" ")}
              >
                <DollarSign className={["h-7 w-7", themed("text-emerald-600", "text-emerald-300")].join(" ")} />
              </div>
            </div>
          </div>

          {/* Action Buttons - Small with animations */}
          <div className="flex gap-2.5">
            <button
              onClick={() => onDeclineTrip?.(tripRequest.id)}
              disabled={isDeclining}
              className="group flex-1 bg-red-500 text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-red-600 hover:shadow-lg active:scale-[0.97] transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeclining ? (
                <>
                  <LoadingSpinner size="sm" className="border-t-white" />
                  <span>Declining...</span>
                </>
              ) : (
                <>
                  <X className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                  <span>Decline</span>
                </>
              )}
            </button>
            <button
              onClick={() => onAcceptTrip?.(tripRequest.id)}
              disabled={isAccepting}
              className="group flex-1 bg-emerald-500 text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-emerald-600 hover:shadow-lg active:scale-[0.97] transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 animate-pulse-subtle disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAccepting ? (
                <>
                  <LoadingSpinner size="sm" className="border-t-white" />
                  <span>Accepting...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                  <span>Accept</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Trip Card
  if (activeTrip && tripStage !== 'dropoff') {
    const statusLabels: Record<string, string> = {
      accepted: 'Going to Pickup',
      pickup: 'At Pickup',
      picked_up: 'Picked Up',
      in_transit: 'In Transit',
      arrived: 'Arrived at Destination',
    };
    const [showQuickMessages, setShowQuickMessages] = useState(false);
    const [waitingReply, setWaitingReply] = useState(false);
    const [responseMessage, setResponseMessage] = useState<string | null>(null);
    const quickMessages = [
      { key: "nakuja", label: "Nakuja" },
      { key: "nisubiri", label: "Nisubiri, nafika hapo ulipo" },
      { key: "foleni", label: "Nivumilie, kuna foleni kidogo" },
      { key: "arrived", label: "Nimefika kwenye eneo la kuchukua" },
    ];

    // If we're waiting for reply and a new user message arrives, reopen and show it
    React.useEffect(() => {
      if (waitingReply && latestUserMessage) {
        setShowQuickMessages(true);
        setWaitingReply(false);
        setResponseMessage(latestUserMessage);
      }
    }, [waitingReply, latestUserMessage]);

    return (
      <div className={["absolute bottom-0 left-0 right-0 z-30 rounded-t-3xl animate-slide-up pointer-events-auto", sheetBase, sheetShadow].join(" ")}>
        <div className="px-6 pt-4 pb-6 max-h-[80vh] overflow-y-auto">
          {/* Drag handle */}
          <div className={["w-12 h-1.5 rounded-full mx-auto mb-4", themed("bg-slate-300", "bg-white/18")].join(" ")} />

          {/* Status Badge */}
          <div className="flex justify-center mb-4">
            <div
              className={[
                "px-4 py-1.5 rounded-full text-sm font-medium border",
                tripStage === 'accepted'
                  ? themed("bg-blue-100 text-blue-700 border-blue-200", "bg-blue-500/12 text-blue-200 border-blue-400/25")
                  : tripStage === 'pickup'
                    ? themed("bg-amber-100 text-amber-700 border-amber-200", "bg-amber-500/12 text-amber-200 border-amber-400/25")
                    : tripStage === 'picked_up'
                      ? themed("bg-emerald-100 text-emerald-700 border-emerald-200", "bg-emerald-500/12 text-emerald-200 border-emerald-400/25")
                      : tripStage === 'in_transit'
                        ? themed("bg-indigo-100 text-indigo-700 border-indigo-200", "bg-indigo-500/12 text-indigo-200 border-indigo-400/25")
                        : tripStage === 'arrived'
                          ? themed("bg-purple-100 text-purple-700 border-purple-200", "bg-purple-500/12 text-purple-200 border-purple-400/25")
                          : themed("bg-slate-100 text-slate-700 border-slate-200", "bg-white/6 text-slate-200/85 border-white/12"),
              ].join(" ")}
            >
              {statusLabels[tripStage] || 'Active Trip'}
            </div>
          </div>

          {/* Passenger Info */}
          <div className="flex items-center gap-4 mb-6">
            <div
              className={[
                "relative w-16 h-16 rounded-full flex items-center justify-center overflow-hidden",
                themed("bg-slate-200", "bg-white/10 border border-white/10"),
              ].join(" ")}
            >
              {activeTrip.passengerPhoto ? (
                <Image 
                  src={activeTrip.passengerPhoto || "/assets/default-avatar.png"} 
                  alt={activeTrip.passengerName} 
                  fill
                  className="object-cover rounded-full"
                  unoptimized
                />
              ) : (
                <span className={["text-2xl font-semibold", themed("text-slate-600", "text-slate-100")].join(" ")}>
                  {activeTrip.passengerName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h3 className={["text-lg font-semibold", text].join(" ")}>{activeTrip.passengerName}</h3>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-amber-500">★</span>
                <span className={["text-sm", themed("text-slate-600", "text-slate-200/75")].join(" ")}>{activeTrip.passengerRating.toFixed(1)}</span>
              </div>
            </div>
            {/* Call and Message buttons - Only visible after accept, hidden once arrived at pickup */}
            {activeTrip.phoneNumber && tripStage === 'accepted' && (
              <div className="flex gap-2">
                <button
                  onClick={() => onCall?.(activeTrip.phoneNumber!)}
                  className={[
                    "p-3 rounded-full transition-colors border",
                    themed("bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200", "bg-emerald-500/12 text-emerald-200 border-emerald-400/25 hover:bg-emerald-500/18"),
                  ].join(" ")}
                  aria-label="Call"
                >
                  <Phone className="h-5 w-5" />
                </button>
                {tripStage === 'accepted' && (
                  <div className="relative">
                    <button
                      onClick={() => setShowQuickMessages((p) => !p)}
                      className={[
                        "p-3 rounded-full transition-colors border",
                        themed("bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200", "bg-blue-500/12 text-blue-200 border-blue-400/25 hover:bg-blue-500/18"),
                      ].join(" ")}
                      aria-label="Quick messages"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </button>
                    {showQuickMessages && (
                      <div className="fixed inset-0 z-[120] flex items-center justify-center px-3">
                        {/* Backdrop */}
                        <div
                          className={["absolute inset-0 transition-opacity duration-200", isDark ? "bg-black/55" : "bg-black/40"].join(" ")}
                          onClick={() => setShowQuickMessages(false)}
                          aria-hidden
                        />
                        {/* Card */}
                        <div
                          className={[
                            "relative w-full max-w-sm rounded-2xl shadow-2xl border overflow-hidden max-h-[70vh] flex flex-col animate-fade-in-up",
                            themed("bg-white border-slate-200 text-slate-900", "bg-slate-950/80 border-white/15 text-slate-100"),
                          ].join(" ")}
                        >
                          <div
                            className={[
                              "px-4 py-3 border-b flex items-start justify-between gap-3",
                              themed("border-slate-100", "border-white/10"),
                            ].join(" ")}
                          >
                            <div>
                              <p className={["text-base font-semibold", themed("text-slate-900", "text-slate-50")].join(" ")}>Quick messages</p>
                              <p className={["text-[12px]", muted].join(" ")}>Choose a prepared note to send to the rider.</p>
                            </div>
                            <button
                              onClick={() => setShowQuickMessages(false)}
                              className={["p-1.5 rounded-full transition-colors", themed("hover:bg-slate-100", "hover:bg-white/10")].join(" ")}
                              aria-label="Close quick messages"
                            >
                              <X className={["h-4 w-4", iconMuted].join(" ")} />
                            </button>
                          </div>
                          <div className="p-3 space-y-2 overflow-y-auto">
                            {quickMessages.map((m) => (
                              <button
                                key={m.key}
                                onClick={async () => {
                                  setShowQuickMessages(false);
                                  setWaitingReply(true);
                                  setResponseMessage(null);
                                  await onSendQuickMessage?.(m.key, activeTrip.id);
                                  if (onMessage) onMessage(activeTrip.phoneNumber!);
                                }}
                                className={[
                                  "w-full text-left text-sm px-3 py-2 rounded-xl border transition-colors shadow-sm leading-snug",
                                  themed("border-slate-200 hover:border-blue-300 hover:bg-blue-50", "border-white/12 bg-white/5 hover:bg-white/10 hover:border-white/20"),
                                ].join(" ")}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>
                          {waitingReply && (
                            <div
                              className={[
                                "px-4 py-2.5 border-t text-[12px] font-medium",
                                themed("border-slate-100 bg-emerald-50 text-emerald-700", "border-white/10 bg-emerald-500/10 text-emerald-200"),
                              ].join(" ")}
                            >
                              Sent. Waiting for user response…
                            </div>
                          )}
                          {!waitingReply && responseMessage && (
                            <div
                              className={[
                                "px-4 py-2.5 border-t text-[12px] font-medium",
                                themed("border-slate-100 bg-blue-50 text-blue-700", "border-white/10 bg-blue-500/10 text-blue-200"),
                              ].join(" ")}
                            >
                              User replied: {responseMessage}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Route Info - Show pickup for accepted/pickup stages, dropoff for others */}
          {(tripStage === 'accepted' || tripStage === 'pickup') && (
            <div className="mb-4">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse"></div>
                  <div className={["w-0.5 h-12 mx-auto", themed("bg-slate-300", "bg-white/14")].join(" ")}></div>
                </div>
                <div className="flex-1">
                  <p className={["text-xs mb-1", muted].join(" ")}>PICKUP</p>
                  <p className={["text-sm font-medium", text].join(" ")}>{activeTrip.pickupAddress}</p>
                  {tripStage === 'pickup' && (
                    <p className="text-xs text-emerald-600 font-medium mt-1">✓ You've arrived</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {(tripStage === 'picked_up' || tripStage === 'in_transit' || tripStage === 'arrived') && (
            <>
              <div className="mb-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"></div>
                    <div className={["w-0.5 h-12 mx-auto", themed("bg-slate-300", "bg-white/14")].join(" ")}></div>
                  </div>
                  <div className="flex-1">
                    <p className={["text-xs mb-1", muted].join(" ")}>PICKUP</p>
                    <p className={["text-sm font-medium line-through", text].join(" ")}>{activeTrip.pickupAddress}</p>
                    <p className="text-xs text-emerald-600 font-medium mt-1">✓ Completed</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <div className={`w-3 h-3 rounded-full border-2 border-white ${
                      tripStage === 'arrived' ? 'bg-red-500 animate-pulse' : 'bg-red-500'
                    }`}></div>
                  </div>
                  <div className="flex-1">
                    <p className={["text-xs mb-1", muted].join(" ")}>DROPOFF</p>
                    <p className={["text-sm font-medium", text].join(" ")}>{activeTrip.dropoffAddress}</p>
                    {tripStage === 'arrived' && (
                      <p className="text-xs text-emerald-600 font-medium mt-1">✓ You've arrived</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Fare */}
          <div className={["rounded-xl p-4 mb-6 border", themed("bg-slate-50 border-slate-200", "bg-white/5 border-white/12")].join(" ")}>
            <div className="flex items-center justify-between">
              <div>
                <p className={["text-xs mb-1", muted].join(" ")}>Fare</p>
                <p className={["text-xl font-bold", text].join(" ")}>{activeTrip.fare}</p>
              </div>
              <DollarSign className={["h-8 w-8", themed("text-emerald-600", "text-emerald-300")].join(" ")} />
            </div>
          </div>

          {/* Action buttons removed - now shown at bottom of screen */}
        </div>
      </div>
    );
  }

  // Expanded state - no active trip or request
  return (
    <div className={["absolute bottom-0 left-0 right-0 z-30 rounded-t-3xl animate-slide-up pointer-events-auto", sheetBase, sheetShadow].join(" ")}>
      <div className="px-6 pt-4 pb-6">
        {/* Drag handle */}
        <button
          onClick={onToggle}
          className={["w-12 h-1.5 rounded-full mx-auto mb-4 block transition-colors", handleBar].join(" ")}
          aria-label="Collapse"
        />
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className={["text-xs mb-1", muted].join(" ")}>Today's Earnings</p>
            <p className={["text-2xl font-bold", text].join(" ")}>{formatMoney(todayEarnings)}</p>
          </div>
          <button
            onClick={onToggle}
            className={["p-2 rounded-full transition-colors", themed("hover:bg-slate-100", "hover:bg-white/10")].join(" ")}
            aria-label="Collapse"
          >
            <ChevronDown className={["h-5 w-5", iconMuted].join(" ")} />
          </button>
        </div>

        {/* Additional stats or actions can go here */}
        <div className={["text-center py-8", themed("text-slate-400", "text-slate-300/60")].join(" ")}>
          <p className="text-sm">Waiting for trip requests...</p>
        </div>
      </div>
    </div>
  );
}


"use client";
import React, { useState } from "react";
import Image from "next/image";
import { ChevronDown, DollarSign, Clock, Navigation, Phone, MessageCircle, X, CheckCircle } from "lucide-react";
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
  tripRequest?: TripRequest | null;
  activeTrip?: ActiveTrip | null;
  tripStage?: TripStage;
  todayEarnings?: number;
  onAcceptTrip?: (tripId: string) => void;
  onDeclineTrip?: (tripId: string) => void;
  onCompleteTrip?: (tripId: string) => void;
  onArriveAtPickup?: () => void;
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

function ActiveTripCard({
  activeTrip,
  tripStage,
  latestUserMessage,
  onCall,
  onMessage,
  onSendQuickMessage,
  onStartTrip,
}: {
  activeTrip: ActiveTrip;
  tripStage: TripStage;
  latestUserMessage?: string;
  onCall?: (phoneNumber: string) => void;
  onMessage?: (phoneNumber: string) => void;
  onSendQuickMessage?: (templateKey: string, toUserId?: string) => Promise<void> | void;
  onStartTrip?: () => void;
}) {
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
    <div className="absolute bottom-0 left-0 right-0 z-30 bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 animate-slide-up pointer-events-auto">
      <div className="px-6 pt-4 pb-6 max-h-[80vh] overflow-y-auto">
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />

        {/* Status Badge */}
        <div className="flex justify-center mb-4">
          <div className={`px-4 py-1.5 rounded-full text-sm font-medium ${
            tripStage === 'accepted' ? 'bg-blue-100 text-blue-700' :
            tripStage === 'pickup' ? 'bg-amber-100 text-amber-700' :
            tripStage === 'picked_up' ? 'bg-emerald-100 text-emerald-700' :
            tripStage === 'in_transit' ? 'bg-indigo-100 text-indigo-700' :
            tripStage === 'arrived' ? 'bg-purple-100 text-purple-700' :
            'bg-slate-100 text-slate-700'
          }`}>
            {statusLabels[tripStage] || 'Active Trip'}
          </div>
        </div>

        {/* Passenger Info */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
            {activeTrip.passengerPhoto ? (
              <Image
                src={activeTrip.passengerPhoto}
                alt={activeTrip.passengerName}
                className="w-full h-full object-cover"
                width={64}
                height={64}
                style={{ borderRadius: '9999px' }}
              />
            ) : (
              <span className="text-2xl font-semibold text-slate-600">
                {activeTrip.passengerName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900">{activeTrip.passengerName}</h3>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-amber-500">★</span>
              <span className="text-sm text-slate-600">{activeTrip.passengerRating.toFixed(1)}</span>
            </div>
          </div>
          {/* Call and Message buttons - Only visible after accept, hidden once arrived at pickup */}
          {activeTrip.phoneNumber && tripStage === 'accepted' && (
            <div className="flex gap-2">
              <button
                onClick={() => onCall?.(activeTrip.phoneNumber!)}
                className="p-3 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors"
                aria-label="Call"
              >
                <Phone className="h-5 w-5" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowQuickMessages((p) => !p)}
                  className="p-3 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                  aria-label="Quick messages"
                >
                  <MessageCircle className="h-5 w-5" />
                </button>
                {showQuickMessages && (
                  <div className="fixed inset-0 z-[120] flex items-center justify-center px-3">
                    {/* Backdrop */}
                    <div
                      className="absolute inset-0 bg-black/40 transition-opacity duration-200"
                      onClick={() => setShowQuickMessages(false)}
                      aria-hidden
                    />
                    {/* Card */}
                    <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[70vh] flex flex-col animate-fade-in-up">
                      <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-900">Quick messages</p>
                          <p className="text-[12px] text-slate-500">Choose a prepared note to send to the rider.</p>
                        </div>
                        <button
                          onClick={() => setShowQuickMessages(false)}
                          className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                          aria-label="Close quick messages"
                        >
                          <X className="h-4 w-4 text-slate-600" />
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
                            className="w-full text-left text-sm px-3 py-2 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors shadow-sm leading-snug"
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                      {waitingReply && (
                        <div className="px-4 py-2.5 border-t border-slate-100 bg-emerald-50 text-[12px] text-emerald-700 font-medium">
                          Sent. Waiting for user response…
                        </div>
                      )}
                      {!waitingReply && responseMessage && (
                        <div className="px-4 py-2.5 border-t border-slate-100 bg-blue-50 text-[12px] text-blue-700 font-medium">
                          User replied: {responseMessage}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Route Info - Show pickup for accepted/pickup stages, dropoff for others */}
        {(tripStage === 'accepted' || tripStage === 'pickup') && (
          <div className="mb-4">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse"></div>
                <div className="w-0.5 h-12 bg-slate-300 mx-auto"></div>
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1">PICKUP</p>
                <p className="text-sm font-medium text-slate-900">{activeTrip.pickupAddress}</p>
                {tripStage === 'pickup' && (
                  <p className="text-xs text-emerald-600 font-medium mt-1">✓ You&apos;ve arrived</p>
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
                  <div className="w-0.5 h-12 bg-slate-300 mx-auto"></div>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">PICKUP</p>
                  <p className="text-sm font-medium text-slate-900 line-through">{activeTrip.pickupAddress}</p>
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
                  <p className="text-xs text-slate-500 mb-1">DROPOFF</p>
                  <p className="text-sm font-medium text-slate-900">{activeTrip.dropoffAddress}</p>
                  {tripStage === 'arrived' && (
                    <p className="text-xs text-emerald-600 font-medium mt-1">✓ You've arrived</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Fare */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-1">Fare</p>
              <p className="text-xl font-bold text-slate-900">{activeTrip.fare}</p>
            </div>
            <DollarSign className="h-8 w-8 text-emerald-600" />
          </div>
        </div>

        {/* Action buttons - shown contextually */}
        <div className="flex gap-2.5">
          {tripStage === 'pickup' && (
            <button
              onClick={() => onStartTrip?.()}
              className="flex-1 bg-emerald-500 text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-all duration-300"
            >
              Start Trip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DriverLiveMapBottomSheet({
  isCollapsed,
  onToggle,
  tripRequest,
  activeTrip,
  tripStage = 'waiting',
  todayEarnings = 0,
  onAcceptTrip,
  onDeclineTrip,
  onStartTrip,
  onCall,
  onMessage,
  onSendQuickMessage,
  latestUserMessage,
  isAccepting = false,
  isDeclining = false,
}: DriverLiveMapBottomSheetProps) {
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
          className="absolute bottom-4 right-4 z-30 bg-white rounded-full p-2.5 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 pointer-events-auto border border-slate-200"
          aria-label="Show earnings"
          title={`Today's Earnings: ${formatMoney(todayEarnings)}`}
        >
          <DollarSign className="h-4 w-4 text-emerald-600" />
        </button>
      </>
    );
  }

  // Expanded earnings card - slides in from right when button is clicked
  if (!isCollapsed && !tripRequest && !activeTrip) {
    return (
      <>
        {/* Earnings card - slides in from right */}
        <div className="absolute bottom-4 right-4 z-30 bg-white rounded-2xl shadow-2xl border border-slate-200 pointer-events-auto transition-all duration-300 translate-x-0 opacity-100 animate-slide-in-right">
          <div className="px-5 pt-3 pb-4 min-w-[200px]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">Today&apos;s Earnings</p>
              <button
                onClick={onToggle}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-slate-600" />
              </button>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatMoney(todayEarnings)}</p>
          </div>
        </div>
      </>
    );
  }

  // Trip Request Card
  if (tripRequest) {
    return (
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 animate-slide-up pointer-events-auto">
        <div className="px-6 pt-4 pb-6 max-h-[80vh] overflow-y-auto space-y-5">
          {/* Drag handle */}
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto" />

          {/* Passenger Info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                {tripRequest.passengerPhoto ? (
                  <Image
                    src={tripRequest.passengerPhoto}
                    alt={tripRequest.passengerName}
                    className="w-full h-full object-cover"
                    width={64}
                    height={64}
                    style={{ borderRadius: '9999px' }}
                  />
                ) : (
                  <span className="text-2xl font-semibold text-slate-600">
                    {tripRequest.passengerName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow">
                <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold text-slate-900 truncate">{tripRequest.passengerName}</h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                <span className="text-amber-500">★</span>
                <span>{tripRequest.passengerRating.toFixed(1)}</span>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-100">
              {tripRequest.tripType}
            </div>
          </div>

          <div className="grid gap-4">
            {/* Pickup */}
            <div className="rounded-xl border border-slate-200 p-4 bg-white">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                  <div className="w-0.5 h-10 bg-slate-200 mx-auto" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-emerald-600 font-semibold mb-1">Pickup</p>
                  <p className="text-base font-semibold text-slate-900 leading-snug">{tripRequest.pickupAddress}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
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
            <div className="rounded-xl border border-slate-200 p-4 bg-white">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Dropoff</p>
                  <p className="text-base font-semibold text-slate-900 leading-snug">{tripRequest.dropoffAddress}</p>
                  <p className="text-xs text-slate-500 mt-2">{tripRequest.dropoffDistance}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Driver Matching Info */}
          {tripRequest.matchedDriver && (
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
              <p className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">Matched Driver</p>
              <DriverMatchingInfo matchedDriver={tripRequest.matchedDriver} />
            </div>
          )}

          {/* Fare Estimate */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Estimated Fare</p>
                <p className="text-2xl font-bold text-slate-900">{tripRequest.fare}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <DollarSign className="h-7 w-7 text-emerald-600" />
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
    return (
      <ActiveTripCard
        activeTrip={activeTrip}
        tripStage={tripStage}
        latestUserMessage={latestUserMessage}
        onCall={onCall}
        onMessage={onMessage}
        onSendQuickMessage={onSendQuickMessage}
        onStartTrip={onStartTrip}
      />
    );
  }

  // Expanded state - no active trip or request
  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 animate-slide-up pointer-events-auto">
      <div className="px-6 pt-4 pb-6">
        {/* Drag handle */}
        <button
          onClick={onToggle}
          className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 block hover:bg-slate-400 transition-colors"
          aria-label="Collapse"
        />
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-slate-500 mb-1">Today&apos;s Earnings</p>
            <p className="text-2xl font-bold text-slate-900">{formatMoney(todayEarnings)}</p>
          </div>
          <button
            onClick={onToggle}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Collapse"
          >
            <ChevronDown className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Additional stats or actions can go here */}
        <div className="text-center py-8 text-slate-400">
          <p className="text-sm">Waiting for trip requests...</p>
        </div>
      </div>
    </div>
  );
}


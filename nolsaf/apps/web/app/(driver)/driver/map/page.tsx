"use client";
import React, { useEffect, useState, useRef } from "react";
import DriverLiveMap from "@/components/DriverLiveMap";
import LiveMap from "@/components/LiveMap";
import DriverLiveMapTopControls from "@/components/DriverLiveMapTopControls";
import DriverLiveMapBottomSheet from "@/components/DriverLiveMapBottomSheet";
import DriverLiveMapFloatingActions from "@/components/DriverLiveMapFloatingActions";
import TripReviewModal from "@/components/TripReviewModal";
import { NotificationItem } from "@/components/Notifications";
import { useSearchParams, useRouter } from 'next/navigation';
import axios from "axios";
import { findBestDriver } from "@/lib/driverMatching";
import { notifyDriver, LocationMonitor } from "@/lib/driverNotifications";
import TripSteps, { TripStep } from "@/components/TripSteps";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/Toast";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import { X } from "lucide-react";

// TEMPORARILY DISABLED - Map will be re-enabled after UI is complete
const MAP_ENABLED = false;

// Trip stages
export type TripStage = 
  | 'waiting'           // Before request - initial map state
  | 'request_received'  // After request - trip request card shown
  | 'accepted'          // After accept - driver accepted, going to pickup
  | 'pickup'            // During pickup - driver at pickup location
  | 'picked_up'         // After pickup - client in vehicle
  | 'in_transit'        // On the way to destination
  | 'arrived'           // At destination - arrived at dropoff
  | 'dropoff'           // Dropoff & Review - client exits, provides review
  | 'completed';        // After review - back to waiting

export default function DriverLiveMapPage() {
  const search = useSearchParams();
  const router = useRouter();
  const liveOnly = search?.get('live') === '1';

  const [showLiveOverlay, setShowLiveOverlay] = useState(false);
  const [bottomSheetCollapsed, setBottomSheetCollapsed] = useState(true); // true = hidden, false = shown
  const [tripStage, setTripStage] = useState<TripStage>('waiting');
  const [tripRequest, setTripRequest] = useState<any | null>(null);
  const [activeTrip, setActiveTrip] = useState<any | null>(null);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: "n1", title: "New trip request", body: "Pickup at 123 Main Street", unread: true, type: "info", createdAt: "2 min ago" },
    { id: "n2", title: "Payment received", body: "TZS 12,000", unread: true, type: "info", createdAt: "15 min ago" },
    { id: "n3", title: "Weekly bonus unlocked", body: "You reached your weekly target!", unread: false, type: "info", createdAt: "1 hour ago" },
  ]);
  const latestUserMessage =
    notifications.find((n) => n.type === "message" && n.unread)?.body ||
    notifications.find((n) => n.type === "message" && n.unread)?.title ||
    undefined;

  // Overlay summary + quick messages modal states
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [waitingReply, setWaitingReply] = useState(false);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<TripStep[]>([]);
  const [hasClearLocationInfo, setHasClearLocationInfo] = useState(false);
  const [isAtDestination, setIsAtDestination] = useState(false);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Real-time ETA updates
  const [pickupETA, setPickupETA] = useState<number | null>(null);
  const [destinationETA, setDestinationETA] = useState<number | null>(null);
  const etaIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Toast notifications
  const { toasts, success, error, info, warning, removeToast } = useToast();
  
  // Connection status
  const { status: connectionStatus, isOnline } = useConnectionStatus();
  
  // Location monitoring refs
  const pickupMonitorRef = useRef<LocationMonitor | null>(null);
  const destinationMonitorRef = useRef<LocationMonitor | null>(null);
  
  // Map trip stage to current step
  const getCurrentStep = (): TripStep | null => {
    switch (tripStage) {
      case 'accepted': return 'arrived_at_pickup';
      case 'pickup': return 'passenger_picked_up';
      case 'picked_up': return 'start_trip';
      case 'in_transit': return 'arrived_at_destination';
      case 'arrived': return 'complete_trip';
      default: return null;
    }
  };
  
  // Handle step completion
  const handleStepClick = (step: TripStep) => {
    switch (step) {
      case 'arrived_at_pickup':
        handleArriveAtPickup();
        setCompletedSteps(prev => [...prev, step]);
        break;
      case 'passenger_picked_up':
        handlePickupPassenger();
        setCompletedSteps(prev => [...prev, step]);
        break;
      case 'start_trip':
        handleStartTrip();
        setCompletedSteps(prev => [...prev, step]);
        break;
      case 'arrived_at_destination':
        handleArriveAtDestination();
        setCompletedSteps(prev => [...prev, step]);
        break;
      case 'complete_trip':
        handleStartDropoff();
        setCompletedSteps(prev => [...prev, step]);
        break;
    }
  };
  
  // Clear completed steps after they fade out
  useEffect(() => {
    if (completedSteps.length > 0) {
      const timer = setTimeout(() => {
        setCompletedSteps([]);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [completedSteps]);

  useEffect(() => {
    if (!liveOnly) return;
    try {
      const raw = localStorage.getItem('driver_available');
      const available = raw === '1' || raw === 'true';
      if (!available) setShowLiveOverlay(true);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (liveOnly && tripStage === 'waiting') {
      // Trip requests will come from real-time API/Socket.IO
      // No mock data - wait for actual trip requests
    }
  }, [liveOnly, tripStage]);

  const handleAcceptTrip = async (tripId: string) => {
    if (!isOnline) {
      error("No Connection", "Please check your internet connection and try again.");
      return;
    }

    setIsAccepting(true);
    try {
      // Get pickup coordinates from trip request
      if (!tripRequest?.pickupLat || !tripRequest?.pickupLng) {
        error("Invalid Trip", "Trip request missing location data.");
        setIsAccepting(false);
        return;
      }
      const pickupLat = tripRequest.pickupLat;
      const pickupLng = tripRequest.pickupLng;
      const dropoffLat = tripRequest.dropoffLat;
      const dropoffLng = tripRequest.dropoffLng;
      
      // TODO: Replace with actual API call
      // await axios.post(`/api/driver/trips/${tripId}/accept`, { ... });
      
      // TODO: Get trip details from API response
      setTripRequest(null);
      // setActiveTrip will be set from API response
      setTripStage('accepted');
      setHasClearLocationInfo(false);
      setBottomSheetCollapsed(true);
      setOverlayVisible(true);
      
      // Start ETA calculation
      startETAUpdates(pickupLat, pickupLng, 'pickup');
      
      success("Trip Accepted", "Navigate to pickup location");
    } catch (err: any) {
      error("Failed to Accept Trip", err?.message || "Please try again");
    } finally {
      setIsAccepting(false);
    }
  };
  
  // Handler for confirming driver has clear location information
  const handleConfirmLocationInfo = () => {
    setHasClearLocationInfo(true);
    
    // Start monitoring for pickup arrival only after confirming location
    if (activeTrip?.pickupLat && activeTrip?.pickupLng) {
      if (pickupMonitorRef.current) {
        pickupMonitorRef.current.stopMonitoring();
      }
      pickupMonitorRef.current = new LocationMonitor();
      pickupMonitorRef.current.startMonitoring(
        activeTrip.pickupLat,
        activeTrip.pickupLng,
        () => {
          // Driver arrived at pickup
          notifyDriver(
            'Arrived at Pickup',
            'You have arrived at the pickup location. Please wait for the passenger.',
            {
              vibrate: true,
              sound: true,
              vibrationPattern: [300, 100, 300], // Triple vibration
            }
          );
          handleArriveAtPickup();
        },
        0.05 // 50 meters threshold
      );
    }
  };

  const handleDeclineTrip = async (tripId: string) => {
    if (!isOnline) {
      error("No Connection", "Please check your internet connection and try again.");
      return;
    }

    setIsDeclining(true);
    try {
      // TODO: Replace with actual API call
      // await axios.post(`/api/driver/trips/${tripId}/decline`, { ... });
      
      setTripRequest(null);
      setTripStage('waiting');
      setBottomSheetCollapsed(true);
      info("Trip Declined", "Waiting for next request");
    } catch (err: any) {
      error("Failed to Decline Trip", err?.message || "Please try again");
    } finally {
      setIsDeclining(false);
    }
  };
  
  // Trip cancellation handler
  const handleCancelTrip = async (tripId: string, reason?: string) => {
    if (!isOnline) {
      error("No Connection", "Please check your internet connection and try again.");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to cancel this trip? This may affect your acceptance rate.");
    if (!confirmed) return;

    setIsCancelling(true);
    try {
      // TODO: Replace with actual API call
      // await axios.post(`/api/driver/trips/${tripId}/cancel`, { reason });
      
      // Stop all monitoring
      if (pickupMonitorRef.current) {
        pickupMonitorRef.current.stopMonitoring();
      }
      if (destinationMonitorRef.current) {
        destinationMonitorRef.current.stopMonitoring();
      }
      if (etaIntervalRef.current) {
        clearInterval(etaIntervalRef.current);
      }
      
      setActiveTrip(null);
      setTripStage('waiting');
      setBottomSheetCollapsed(true);
      setPickupETA(null);
      setDestinationETA(null);
      
      warning("Trip Cancelled", "Your acceptance rate may be affected");
    } catch (err: any) {
      error("Failed to Cancel Trip", err?.message || "Please try again");
    } finally {
      setIsCancelling(false);
    }
  };
  
  // ETA calculation and updates
  const calculateETA = (lat1: number, lng1: number, lat2: number, lng2: number, speedKmH: number = 30): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return Math.round((distance / speedKmH) * 60); // ETA in minutes
  };
  
  const startETAUpdates = (targetLat: number, targetLng: number, type: 'pickup' | 'destination') => {
    // Clear existing interval
    if (etaIntervalRef.current) {
      clearInterval(etaIntervalRef.current);
    }
    
    // Update ETA every 10 seconds
    etaIntervalRef.current = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const driverLat = position.coords.latitude;
            const driverLng = position.coords.longitude;
            const eta = calculateETA(driverLat, driverLng, targetLat, targetLng);
            
            if (type === 'pickup') {
              setPickupETA(eta);
            } else {
              setDestinationETA(eta);
            }
          },
          (error) => {
            console.warn('Error getting location for ETA:', error);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }
    }, 10000); // Update every 10 seconds
  };
  
  const stopETAUpdates = () => {
    if (etaIntervalRef.current) {
      clearInterval(etaIntervalRef.current);
      etaIntervalRef.current = null;
    }
  };

  // Stage progression handlers
  const handleArriveAtPickup = () => {
    if (activeTrip) {
      setActiveTrip({ ...activeTrip, status: 'pickup' });
      setTripStage('pickup');
    }
  };

  const handlePickupPassenger = () => {
    if (activeTrip) {
      setActiveTrip({ ...activeTrip, status: 'picked_up' });
      setTripStage('picked_up');
      
      // Stop pickup monitoring
      if (pickupMonitorRef.current) {
        pickupMonitorRef.current.stopMonitoring();
      }
      
      // Note: Destination monitoring starts in handleStartTrip to prevent cheating
    }
  };

  const handleStartTrip = () => {
    if (activeTrip) {
      setActiveTrip({ ...activeTrip, status: 'in_transit' });
      setTripStage('in_transit');
      setIsAtDestination(false);
      setPickupETA(null); // Clear pickup ETA
      
      // Start destination ETA updates
      if (activeTrip.dropoffLat && activeTrip.dropoffLng) {
        startETAUpdates(activeTrip.dropoffLat, activeTrip.dropoffLng, 'destination');
      }
      
      // Start monitoring destination location to prevent cheating
      if (activeTrip.dropoffLat && activeTrip.dropoffLng) {
        if (destinationMonitorRef.current) {
          destinationMonitorRef.current.stopMonitoring();
        }
        destinationMonitorRef.current = new LocationMonitor();
        destinationMonitorRef.current.startMonitoring(
          activeTrip.dropoffLat,
          activeTrip.dropoffLng,
          () => {
            setIsAtDestination(true);
            stopETAUpdates(); // Stop ETA updates when arrived
            notifyDriver(
              'Arrived at Destination',
              'You have arrived at the destination. You can now confirm arrival.',
              {
                vibrate: true,
                sound: true,
                vibrationPattern: [300, 100, 300, 100, 300],
              }
            );
          },
          0.05
        );
      }
    }
  };

  const handleArriveAtDestination = () => {
    // Only allow if driver is actually at destination (prevent cheating)
    if (!isAtDestination) {
      console.warn('Cannot confirm arrival - driver not at destination location');
      return;
    }
    
    if (activeTrip) {
      setActiveTrip({ ...activeTrip, status: 'arrived' });
      setTripStage('arrived');
      // Stop destination monitoring
      if (destinationMonitorRef.current) {
        destinationMonitorRef.current.stopMonitoring();
      }
    }
  };

  const handleStartDropoff = () => {
    if (activeTrip) {
      setActiveTrip({ ...activeTrip, status: 'dropoff' });
      setTripStage('dropoff');
      setShowReviewModal(true);
    }
  };

  const handleSubmitReview = (rating: number, comment: string) => {
    console.log('Review submitted:', { rating, comment });
    setShowReviewModal(false);
    // Complete the trip
    if (activeTrip) {
      setTodayEarnings(prev => prev + 8500);
      setActiveTrip(null);
      setTripStage('completed');
      setBottomSheetCollapsed(true);
      
      // Stop all location monitoring and ETA updates
      if (pickupMonitorRef.current) {
        pickupMonitorRef.current.stopMonitoring();
      }
      if (destinationMonitorRef.current) {
        destinationMonitorRef.current.stopMonitoring();
      }
      stopETAUpdates();
      setPickupETA(null);
      setDestinationETA(null);
      
      // Reset to waiting after a brief moment
      setTimeout(() => {
        setTripStage('waiting');
      }, 2000);
    }
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pickupMonitorRef.current) {
        pickupMonitorRef.current.stopMonitoring();
      }
      if (destinationMonitorRef.current) {
        destinationMonitorRef.current.stopMonitoring();
      }
    };
  }, []);

  const handleCompleteTrip = (tripId: string) => {
    console.log('Complete trip:', tripId);
    handleStartDropoff();
  };

  const handleSendQuickMessage = async (templateKey: string, toUserId?: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "/api/driver/messages/send",
        { toUserId: toUserId || activeTrip?.id || "user-unknown", templateKey },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      // Optionally, add a confirmation notification locally
      setNotifications((prev) => [
        {
          id: `msg-${Date.now()}`,
          title: "Message sent",
          body: templateKey,
          unread: true,
          type: "info",
          createdAt: "just now",
        },
        ...prev,
      ]);
      setShowQuickModal(false);
      setWaitingReply(true);
      setResponseMessage(null);
    } catch (e) {
      console.warn("Quick message failed", e);
    }
  };

  // Reopen quick modal when a rider reply arrives while waiting
  useEffect(() => {
    if (waitingReply && latestUserMessage) {
      setShowQuickModal(true);
      setWaitingReply(false);
      setResponseMessage(latestUserMessage);
    }
  }, [waitingReply, latestUserMessage]);

  const handleNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  const handleNotificationDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNotificationReply = (id: string, message: string) => {
    console.log("Reply to", id, message);
    handleNotificationRead(id);
  };

  // If map is disabled, show ride-sharing app layout
  if (!MAP_ENABLED && liveOnly) {
    return (
      <div className="w-full h-[calc(100vh-8rem)] flex flex-col overflow-hidden relative">
        {/* MAP CONTAINER - Primary visible element */}
        <div className="flex-1 relative min-h-0 bg-slate-50" id="driver-live-map">
          {/* Map Background - This is where the actual map will render */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-slate-50 to-green-50">
            {/* Grid pattern to show map area */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `
                linear-gradient(to right, #64748b 1px, transparent 1px),
                linear-gradient(to bottom, #64748b 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}></div>
            
            {/* Streets/Roads pattern */}
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: `
                linear-gradient(45deg, #64748b 1px, transparent 1px),
                linear-gradient(-45deg, #64748b 1px, transparent 1px)
              `,
              backgroundSize: '100px 100px'
            }}></div>
          </div>

          {/* Map Skeleton Elements - Overlay on top of map */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Center indicator - where driver location will be */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="relative">
                {/* Outer pulse ring */}
                <div className="absolute inset-0 w-12 h-12 bg-blue-500 rounded-full animate-ping opacity-30"></div>
                <div className="absolute inset-0 w-8 h-8 bg-blue-400 rounded-full animate-ping opacity-40" style={{ animationDelay: '0.5s' }}></div>
                {/* Driver location marker */}
                <div className="relative w-8 h-8 bg-blue-600 rounded-full border-3 border-white shadow-xl flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
                {/* Label */}
                <div className="absolute top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg text-xs font-semibold text-slate-700 border border-slate-200">
                    Your Location
                  </div>
                </div>
              </div>
            </div>

            {/* Pickup marker - show for request_received, accepted, pickup stages */}
            {(tripRequest || (activeTrip && (tripStage === 'accepted' || tripStage === 'pickup'))) && (
              <div className="absolute top-[30%] left-[40%] z-10 animate-fade-in-up">
                <div className="relative">
                  <div className={`w-5 h-5 rounded-full border-3 border-white shadow-xl ${
                    tripStage === 'pickup' ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500'
                  }`}></div>
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <div className="bg-white/95 backdrop-blur-sm px-2 py-1 rounded shadow text-xs font-medium text-slate-700">
                      {tripStage === 'pickup' ? '✓ Pickup' : 'Pickup'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dropoff marker - show for all active trip stages after pickup */}
            {activeTrip && (tripStage === 'picked_up' || tripStage === 'in_transit' || tripStage === 'arrived') && (
              <div className="absolute top-[60%] left-[60%] z-10 animate-fade-in-up">
                <div className="relative">
                  <div className={`w-5 h-5 rounded-full border-3 border-white shadow-xl ${
                    tripStage === 'arrived' ? 'bg-red-500 animate-pulse' : 'bg-red-500'
                  }`}></div>
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <div className="bg-white/95 backdrop-blur-sm px-2 py-1 rounded shadow text-xs font-medium text-slate-700">
                      {tripStage === 'arrived' ? '✓ Dropoff' : 'Dropoff'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dropoff marker for request stage */}
            {tripRequest && (
              <div className="absolute top-[60%] left-[60%] z-10 animate-fade-in-up">
                <div className="relative">
                  <div className="w-5 h-5 bg-red-500 rounded-full border-3 border-white shadow-xl"></div>
                  <div className="absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <div className="bg-white/95 backdrop-blur-sm px-2 py-1 rounded shadow text-xs font-medium text-slate-700">
                      Dropoff
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Route line visualization - show for request and active trips */}
            {(tripRequest || (activeTrip && tripStage !== 'waiting')) && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                {/* Main route path */}
                <path
                  d="M 40% 30% Q 50% 45% 60% 60%"
                  stroke={tripStage === 'in_transit' ? "#3b82f6" : tripStage === 'accepted' || tripStage === 'pickup' ? "#10b981" : "#10b981"}
                  strokeWidth={tripStage === 'in_transit' ? "6" : "5"}
                  strokeDasharray={tripStage === 'in_transit' ? "0" : "10,5"}
                  fill="none"
                  opacity={tripStage === 'in_transit' ? "0.9" : "0.7"}
                  className="transition-all duration-500"
                  strokeLinecap="round"
                />
                {/* Route shadow/glow effect for active route */}
                {tripStage === 'in_transit' && (
                  <path
                    d="M 40% 30% Q 50% 45% 60% 60%"
                    stroke="#3b82f6"
                    strokeWidth="10"
                    fill="none"
                    opacity="0.2"
                    className="transition-all duration-500"
                    strokeLinecap="round"
                  />
                )}
                {/* Traffic indicator dots along route */}
                {tripStage === 'in_transit' && (
                  <>
                    <circle cx="45%" cy="37%" r="3" fill="#f59e0b" opacity="0.8" className="animate-pulse" />
                    <circle cx="55%" cy="52%" r="3" fill="#10b981" opacity="0.8" />
                  </>
                )}
              </svg>
            )}

            {/* Nearby driver markers skeleton (examples) - subtle */}
            <div className="absolute top-[25%] left-[20%] z-10">
              <div className="w-4 h-4 bg-emerald-400 rounded-full border-2 border-white shadow-md"></div>
            </div>
            <div className="absolute top-[45%] left-[75%] z-10">
              <div className="w-4 h-4 bg-emerald-400 rounded-full border-2 border-white shadow-md"></div>
            </div>
            <div className="absolute top-[70%] left-[30%] z-10">
              <div className="w-4 h-4 bg-slate-400 rounded-full border-2 border-white shadow-md"></div>
            </div>
          </div>

          {/* Trip Completed Success Message */}
          {tripStage === 'completed' && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto animate-fade-in-up">
              <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl border border-emerald-600 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-2xl">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-lg">Trip Completed!</p>
                  <p className="text-sm text-emerald-50">Waiting for next request...</p>
                </div>
              </div>
            </div>
          )}

          {/* Connection Status Indicator */}
          {connectionStatus !== 'online' && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40 pointer-events-auto">
              <ConnectionStatusIndicator status={connectionStatus} />
            </div>
          )}

          {/* Top Controls - Floating on top of map */}
          <div className="absolute inset-0 pointer-events-none z-20">
            <div className="pointer-events-auto">
              <DriverLiveMapTopControls 
                notifications={notifications}
                onNotificationRead={handleNotificationRead}
                onNotificationDelete={handleNotificationDelete}
                onNotificationReply={handleNotificationReply}
                hideAvailability={!!activeTrip && tripStage !== 'completed'}
                onMenuClick={() => router.push('/driver')}
              />
            </div>
          </div>

          {/* Floating Actions - Floating on top of map */}
          <div className="absolute inset-0 pointer-events-none z-20">
            <div className="pointer-events-auto">
              <DriverLiveMapFloatingActions
                onLocationClick={() => console.log('Center on location')}
                onLayersClick={() => console.log('Toggle map layers')}
              />
            </div>
          </div>

          {/* Active trip overlay - Shows Call/Message to get clear location, hidden after confirming location info */}
          {activeTrip && bottomSheetCollapsed && overlayVisible && tripStage === 'accepted' && !hasClearLocationInfo && (
            <div className="absolute bottom-6 right-4 z-30 pointer-events-auto animate-fade-in-up">
              <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 w-80 max-w-full space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-semibold">
                    {activeTrip.passengerName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{activeTrip.passengerName}</p>
                    <p className="text-xs text-slate-500 truncate">{activeTrip.pickupAddress}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-700">
                  <span className="font-semibold">{activeTrip.fare}</span>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">Going to Pickup</span>
                </div>
                {/* Call and Message buttons - Get clear location from client */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => console.log('Call:', activeTrip.phoneNumber)}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-[0.98] transition-all duration-200 py-2 text-sm font-medium"
                    >
                      📞 Call
                    </button>
                    <button
                      onClick={() => setShowQuickModal(true)}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-[0.98] transition-all duration-200 py-2 text-sm font-medium"
                    >
                      💬 Message
                    </button>
                  </div>
                  
                  {/* ETA Display */}
                  {pickupETA !== null && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-blue-600 font-medium">ETA to Pickup</p>
                      <p className="text-lg font-bold text-blue-900">{pickupETA} min</p>
                    </div>
                  )}
                  
                  {/* Confirm Location Info Button - Only show if not confirmed yet */}
                  {!hasClearLocationInfo && (
                    <button
                      onClick={handleConfirmLocationInfo}
                      className="w-full bg-slate-100 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 active:scale-[0.98] transition-all duration-200 border border-slate-300"
                    >
                      ✓ I have clear location info
                    </button>
                  )}
                  
                  {/* Cancel Trip Button */}
                  {tripStage === 'accepted' && (
                    <button
                      onClick={() => handleCancelTrip(activeTrip.id)}
                      disabled={isCancelling}
                      className="w-full bg-red-50 text-red-700 py-2 rounded-lg text-sm font-medium hover:bg-red-100 active:scale-[0.98] transition-all duration-200 border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isCancelling ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span>Cancelling...</span>
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4" />
                          <span>Cancel Trip</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Overlay toggle button (hide/show), blinks when hidden to remind driver */}
          {activeTrip && bottomSheetCollapsed && tripStage !== 'dropoff' && (
            <div className="absolute bottom-6 right-4 z-40 pointer-events-auto">
              <button
                onClick={() => setOverlayVisible((v) => !v)}
                className={`h-12 w-12 rounded-full border ${
                  overlayVisible
                    ? "border-slate-300 bg-white"
                    : "border-blue-500 bg-blue-500 shadow-lg ring-2 ring-blue-300"
                } shadow-md hover:shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95 ${
                  overlayVisible ? "" : "animate-pulse"
                }`}
                title={overlayVisible ? "Hide trip card" : "Show trip card"}
                aria-label={overlayVisible ? "Hide trip card" : "Show trip card"}
              >
                {overlayVisible ? (
                  <span className="text-slate-600 text-lg">⏷</span>
                ) : (
                  <span className="text-white text-xl">💬</span>
                )}
              </button>
            </div>
          )}
        </div>
        
        {/* Bottom Sheet */}
        <DriverLiveMapBottomSheet
          isCollapsed={bottomSheetCollapsed}
          onToggle={() => setBottomSheetCollapsed(!bottomSheetCollapsed)}
          tripRequest={tripRequest}
          activeTrip={activeTrip}
          tripStage={tripStage}
          todayEarnings={todayEarnings}
          onAcceptTrip={handleAcceptTrip}
          onDeclineTrip={handleDeclineTrip}
          onCompleteTrip={handleCompleteTrip}
          onArriveAtPickup={handleArriveAtPickup}
          onPickupPassenger={handlePickupPassenger}
          onStartTrip={handleStartTrip}
          onArriveAtDestination={handleArriveAtDestination}
          onStartDropoff={handleStartDropoff}
          onCall={(phone) => console.log('Call:', phone)}
          onMessage={(phone) => console.log('Message:', phone)}
          onSendQuickMessage={handleSendQuickMessage}
          latestUserMessage={latestUserMessage}
          isAccepting={isAccepting}
          isDeclining={isDeclining}
        />
        
        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onClose={removeToast} />
        
        {/* Trip Steps - Inside map container, pinned to bottom of map */}
        {activeTrip && tripStage !== 'dropoff' && tripStage !== 'completed' && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 pointer-events-auto">
            <TripSteps
              currentStep={getCurrentStep()}
              completedSteps={completedSteps}
              onStepClick={handleStepClick}
              tripStage={tripStage}
              hasClearLocationInfo={hasClearLocationInfo}
              isAtDestination={isAtDestination}
            />
          </div>
        )}

        {/* Review Modal */}
        {activeTrip && (
          <TripReviewModal
            isOpen={showReviewModal}
            passengerName={activeTrip.passengerName}
            tripFare={activeTrip.fare}
            onClose={() => {
              setShowReviewModal(false);
              // If closing without review, still complete the trip
              if (tripStage === 'dropoff') {
                setTodayEarnings(prev => prev + 8500);
                setActiveTrip(null);
                setTripStage('completed');
                setTimeout(() => {
                  setTripStage('waiting');
                }, 2000);
              }
            }}
            onSubmit={handleSubmitReview}
          />
        )}

        {/* Quick messages modal (map-level, for collapsed state) */}
        {showQuickModal && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center px-3 animate-fade-in-up">
            <div
              className="absolute inset-0 bg-black/40 transition-opacity duration-200"
              onClick={() => setShowQuickModal(false)}
              aria-hidden
            />
            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[70vh] flex flex-col animate-fade-in-up">
              <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">Quick messages</p>
                  <p className="text-[12px] text-slate-500">Choose a prepared note to send to the rider.</p>
                </div>
                <button
                  onClick={() => setShowQuickModal(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                  aria-label="Close quick messages"
                >
                  <span className="text-slate-600 text-sm">✕</span>
                </button>
              </div>
              <div className="p-3 space-y-2 overflow-y-auto">
                {["nakuja", "nisubiri", "foleni", "arrived"].map((key) => {
                  const labelMap: Record<string, string> = {
                    nakuja: "Nakuja",
                    nisubiri: "Nisubiri, nafika hapo ulipo",
                    foleni: "Nivumilie, kuna foleni kidogo",
                    arrived: "Nimefika kwenye eneo la kuchukua",
                  };
                  return (
                    <button
                      key={key}
                      onClick={() => handleSendQuickMessage(key, activeTrip?.id)}
                      className="w-full text-left text-sm px-3 py-2 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors shadow-sm leading-snug"
                    >
                      {labelMap[key]}
                    </button>
                  );
                })}
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
    );
  }

  return (
    <div className={liveOnly ? 'min-h-screen w-full' : 'space-y-6'}>
      {!liveOnly && (
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Live Map</h1>
        </div>
      )}

      {MAP_ENABLED && (
        <section className={liveOnly ? 'w-full h-[calc(100vh-8rem)] relative z-10' : 'mx-auto max-w-3xl bg-white rounded-lg p-4 border'}>
        <DriverLiveMap liveOnly={liveOnly} />
      </section>
      )}

      <LiveMap
        isOpen={showLiveOverlay}
        onClose={() => setShowLiveOverlay(false)}
        onGoToDashboard={() => { setShowLiveOverlay(false); router.push('/driver'); }}
      />
    </div>
  );
}

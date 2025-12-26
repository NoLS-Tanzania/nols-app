"use client";
import React, { useEffect, useState, useRef } from "react";
import DriverLiveMap from "@/components/DriverLiveMap";
import DriverLiveMapCanvas from "@/components/DriverLiveMapCanvas";
import LiveMap from "@/components/LiveMap";
import DriverLiveMapTopControls from "@/components/DriverLiveMapTopControls";
import DriverLiveMapBottomSheet from "@/components/DriverLiveMapBottomSheet";
import DriverLiveMapFloatingActions from "@/components/DriverLiveMapFloatingActions";
import TripReviewModal from "@/components/TripReviewModal";
import { NotificationItem } from "@/components/Notifications";
import { useSearchParams, useRouter } from 'next/navigation';
import axios from "axios";
import { notifyDriver, LocationMonitor } from "@/lib/driverNotifications";
import TripSteps, { TripStep } from "@/components/TripSteps";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/Toast";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import LoadingSpinner from "@/components/LoadingSpinner";
import ConnectionStatusIndicator from "@/components/ConnectionStatusIndicator";
import { Check, Globe, Map as MapIcon, Route as RouteIcon, X, Info } from "lucide-react";
import { openInMaps } from "@/lib/navigation";

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

  const [mapTheme, setMapTheme] = useState<"light" | "dark">("light");
  const [mapLayer, setMapLayer] = useState<"navigation" | "streets" | "outdoors" | "satellite">("navigation");
  const [layersOpen, setLayersOpen] = useState(false);
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
  const requestAlertedRef = useRef<string | null>(null);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Real-time ETA updates
  const [pickupETA, setPickupETA] = useState<number | null>(null);
  const [destinationETA, setDestinationETA] = useState<number | null>(null);
  const etaIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number; speedMps?: number } | null>(null);
  const [navBanner, setNavBanner] = useState<{ instruction: string; distanceMeters?: number; durationSec?: number; type: "pickup" | "destination" } | null>(null);
  const [routesOpen, setRoutesOpen] = useState(false);
  const [routeOptions, setRouteOptions] = useState<{ key: string; type: "pickup" | "destination"; routes: Array<{ index: number; durationSec: number | null; distanceMeters: number | null }> } | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [showAttribution, setShowAttribution] = useState(false);
  const lastRouteSelectSentRef = useRef<string | null>(null);
  const lastDirectionsEtaAtRef = useRef<number | null>(null);
  const [destinationCountdownSec, setDestinationCountdownSec] = useState<number | null>(null);
  const [pickupCountdownSec, setPickupCountdownSec] = useState<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const pickupDwellRef = useRef<number | null>(null);
  const destinationDwellRef = useRef<number | null>(null);
  const pickupAutoTriggeredRef = useRef(false);
  const destinationAutoTriggeredRef = useRef(false);
  const [isAtPickup, setIsAtPickup] = useState(false);
  const pickupEtaAtRef = useRef<number | null>(null);
  const destinationEtaAtRef = useRef<number | null>(null);
  
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

  const [isAvailable, setIsAvailable] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem('driver_available');
      return raw === '1' || raw === 'true';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    const checkAvailability = () => {
      try {
        const raw = localStorage.getItem('driver_available');
        const available = raw === '1' || raw === 'true';
        setIsAvailable(available);
        if (!available && liveOnly) {
          setShowLiveOverlay(true);
        }
      } catch (e) {
        // ignore
      }
    };
    checkAvailability();
    // Listen for availability changes
    const handleAvailabilityChange = (e: any) => {
      setIsAvailable(e.detail?.available ?? false);
    };
    window.addEventListener('nols:availability:changed', handleAvailabilityChange as EventListener);
    return () => {
      window.removeEventListener('nols:availability:changed', handleAvailabilityChange as EventListener);
    };
  }, [liveOnly]);

  // Map theme (light/dark) preference for driver map
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nols:driver:map_theme");
      if (saved === "dark" || saved === "light") {
        setMapTheme(saved);
        return;
      }
      if (typeof window !== "undefined" && window.matchMedia) {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (prefersDark) setMapTheme("dark");
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("nols:driver:map_theme", mapTheme);
    } catch {
      // ignore
    }
  }, [mapTheme]);

  // Map layer (base style) preference for driver map
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nols:driver:map_layer");
      if (saved === "navigation" || saved === "streets" || saved === "outdoors" || saved === "satellite") {
        setMapLayer(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("nols:driver:map_layer", mapLayer);
    } catch {
      // ignore
    }
  }, [mapLayer]);

  // Listen for real trip requests via Socket.IO events
  useEffect(() => {
    if (liveOnly && tripStage === 'waiting') {
      if (tripRequest || activeTrip) return;
      
      // Listen for real trip requests from Socket.IO
      const handleTripRequest = (event: Event) => {
        try {
          const detail = (event as CustomEvent).detail || {};
          if (detail.id && detail.pickupAddress) {
            setTripRequest({
              id: detail.id,
              passengerName: detail.passengerName || "Passenger",
              passengerRating: detail.passengerRating || 5.0,
              passengerPhoto: detail.passengerPhoto,
              tripType: detail.tripType || "Standard",
              pickupAddress: detail.pickupAddress,
              pickupDistance: detail.pickupDistance || "0 km",
              pickupETA: detail.pickupETA || "0 min",
              dropoffAddress: detail.dropoffAddress,
              dropoffDistance: detail.dropoffDistance || "0 km",
              fare: detail.fare || "TZS 0",
              phoneNumber: detail.phoneNumber,
              pickupLat: detail.pickupLat,
              pickupLng: detail.pickupLng,
              dropoffLat: detail.dropoffLat,
              dropoffLng: detail.dropoffLng,
            });
            setTripStage('request_received');
            setBottomSheetCollapsed(false);
          }
        } catch (e) {
          console.error("Error handling trip request:", e);
        }
      };

      window.addEventListener('nols:driver:trip:request', handleTripRequest as EventListener);
      return () => {
        window.removeEventListener('nols:driver:trip:request', handleTripRequest as EventListener);
      };
    }
  }, [liveOnly, tripStage, tripRequest, activeTrip]);

  // One-time attention bell for incoming request
  useEffect(() => {
    if (!liveOnly) return;
    if (!tripRequest?.id) return;
    if (requestAlertedRef.current === tripRequest.id) return;
    requestAlertedRef.current = tripRequest.id;
    const pickupAddress = tripRequest.pickupAddress || "Unknown";
    try {
      notifyDriver(
        "New trip request",
        `Pickup: ${pickupAddress}`,
        { vibrate: true, sound: true, vibrationPattern: [200, 120, 200, 120, 200] }
      );
    } catch {
      // ignore
    }
  }, [liveOnly, tripRequest?.id, tripRequest?.pickupAddress]);

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
      
      // Call API to accept the trip
      let apiTrip: any | null = null;
      try {
        const resp = await axios.post(
          `/api/driver/trips/${encodeURIComponent(tripId)}/accept`,
          { pickupLat, pickupLng, dropoffLat, dropoffLng },
          { withCredentials: true }
        );
        apiTrip = resp?.data?.trip ?? null;
      } catch (e) {
        console.error("Failed to accept trip:", e);
        error("Failed to Accept Trip", "Please try again or check your connection.");
        setIsAccepting(false);
        return;
      }

      // Promote request into activeTrip so the communication card shows
      setActiveTrip({
        id: apiTrip?.id ?? tripId,
        status: apiTrip?.status ?? 'accepted',
        passengerUserId: apiTrip?.passengerUserId ?? null,
        passengerName: apiTrip?.passengerName ?? tripRequest.passengerName,
        passengerRating: tripRequest.passengerRating,
        passengerPhoto: tripRequest.passengerPhoto,
        pickupAddress: apiTrip?.pickupAddress ?? tripRequest.pickupAddress,
        dropoffAddress: apiTrip?.dropoffAddress ?? tripRequest.dropoffAddress,
        fare: apiTrip?.fare ?? tripRequest.fare,
        phoneNumber: apiTrip?.phoneNumber ?? tripRequest.phoneNumber,
        pickupLat: apiTrip?.pickupLat ?? pickupLat,
        pickupLng: apiTrip?.pickupLng ?? pickupLng,
        dropoffLat: apiTrip?.dropoffLat ?? dropoffLat,
        dropoffLng: apiTrip?.dropoffLng ?? dropoffLng,
      });
      setTripRequest(null);
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
      try {
        if (!String(tripId).startsWith("demo-")) {
          await axios.post(
            `/api/driver/trips/${encodeURIComponent(tripId)}/decline`,
            {},
            { withCredentials: true }
          );
        }
      } catch (e) {
        // ignore (demo mode / backend not configured)
      }
      
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
      try {
        await axios.post(
          `/api/driver/trips/${encodeURIComponent(tripId)}/cancel`,
          { reason },
          { withCredentials: true }
        );
      } catch (e) {
        console.error("Failed to cancel trip:", e);
        error("Failed to Cancel Trip", "Please try again or check your connection.");
        setIsCancelling(false);
        return;
      }
      
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
              pickupEtaAtRef.current = Date.now();
              setPickupETA(eta);
            } else {
              destinationEtaAtRef.current = Date.now();
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

  // Prefer Mapbox Directions ETA when available (emitted from the map canvas)
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail || {};
        const minutes = Number(detail.minutes);
        if (!Number.isFinite(minutes)) return;
        lastDirectionsEtaAtRef.current = Date.now();
        // stop fallback interval once Directions is giving us time-based ETA
        stopETAUpdates();
        if (detail.type === "pickup") {
          pickupEtaAtRef.current = Date.now();
          setPickupETA(minutes);
        }
        if (detail.type === "destination") {
          destinationEtaAtRef.current = Date.now();
          setDestinationETA(minutes);
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("nols:route:eta", handler as EventListener);
    return () => window.removeEventListener("nols:route:eta", handler as EventListener);
  }, []);

  // Countdown timers (pickup + destination): speed-aware AND elapsed-time-aware.
  // If the driver slows down or stops, remaining time recalculates (won't keep counting down unrealistically).
  useEffect(() => {
    // Clear previous timer
    try {
      if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
    } catch {
      // ignore
    }
    countdownTimerRef.current = null;

    const tick = () => {
      const now = Date.now();
      const speed = driverPos?.speedMps;
      const baselineMps = 8.33; // ~30 km/h
      const speedPenalty =
        typeof speed === "number" && Number.isFinite(speed)
          ? Math.max(0.75, Math.min(6.0, baselineMps / Math.max(0.6, speed)))
          : 1;

      // Pickup countdown (accepted -> pickup)
      if (tripStage === "accepted" && typeof pickupETA === "number" && Number.isFinite(pickupETA)) {
        if (!pickupEtaAtRef.current) pickupEtaAtRef.current = now;
        const elapsedSec = (now - (pickupEtaAtRef.current ?? now)) / 1000;
        const baseSec = Math.max(1, Math.round(pickupETA)) * 60;
        const adjustedSec = baseSec * speedPenalty;
        const remaining = Math.max(0, Math.round(adjustedSec - elapsedSec));
        setPickupCountdownSec(remaining);
      } else {
        setPickupCountdownSec(null);
      }

      // Destination countdown (picked_up/in_transit -> arrived)
      const inTransit = tripStage === "in_transit" || tripStage === "picked_up";
      if (inTransit && typeof destinationETA === "number" && Number.isFinite(destinationETA)) {
        if (!destinationEtaAtRef.current) destinationEtaAtRef.current = now;
        const elapsedSec = (now - (destinationEtaAtRef.current ?? now)) / 1000;
        const baseSec = Math.max(1, Math.round(destinationETA)) * 60;
        const adjustedSec = baseSec * speedPenalty;
        const remaining = Math.max(0, Math.round(adjustedSec - elapsedSec));
        setDestinationCountdownSec(remaining);
      } else {
        setDestinationCountdownSec(null);
      }
    };

    // Run once immediately, then every second
    tick();
    countdownTimerRef.current = window.setInterval(tick, 1000);

    return () => {
      try {
        if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
      } catch {
        // ignore
      }
      countdownTimerRef.current = null;
    };
  }, [tripStage, pickupETA, destinationETA, driverPos?.speedMps]);

  // Listen to live smoothed driver position from the map canvas (socket-driven)
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const d = (ev as CustomEvent).detail || {};
        const lat = Number(d.lat);
        const lng = Number(d.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        setDriverPos({ lat, lng, speedMps: Number(d.speedMps) || undefined });
      } catch {
        // ignore
      }
    };
    window.addEventListener("nols:driver:pos", handler as EventListener);
    return () => window.removeEventListener("nols:driver:pos", handler as EventListener);
  }, []);

  // Listen to turn-by-turn nav banner from the map canvas
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const d = (ev as CustomEvent).detail || {};
        const instruction = String(d.instruction || "");
        if (!instruction) return;
        setNavBanner({
          instruction,
          distanceMeters: typeof d.distanceMeters === "number" ? d.distanceMeters : undefined,
          durationSec: typeof d.durationSec === "number" ? d.durationSec : undefined,
          type: d.type === "destination" ? "destination" : "pickup",
        });
      } catch {
        // ignore
      }
    };
    window.addEventListener("nols:route:nav", handler as EventListener);
    return () => {
      window.removeEventListener("nols:route:nav", handler as EventListener);
    };
  }, []);

  // Listen for route alternatives/options from the map canvas
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const d = (ev as CustomEvent).detail || {};
        const key = String(d.key || "");
        const type = d.type === "destination" ? ("destination" as const) : ("pickup" as const);
        const routes = Array.isArray(d.routes) ? d.routes : [];
        if (!key || routes.length === 0) return;
        setRouteOptions((prev) => {
          const changed = !prev || prev.key !== key || prev.type !== type;
          if (changed) {
            setSelectedRouteIndex(0);
          } else {
            // keep selection if still valid, else reset
            setSelectedRouteIndex((prevIdx) => {
              const max = routes.length - 1;
              const nextIdx = prevIdx >= 0 && prevIdx <= max ? prevIdx : 0;
              return nextIdx;
            });
          }
          return { key, type, routes };
        });
      } catch {
        // ignore
      }
    };
    window.addEventListener("nols:route:options", handler as EventListener);
    return () => window.removeEventListener("nols:route:options", handler as EventListener);
  }, []);

  // Sync selected route index to the map canvas AFTER React commits (avoid render-phase updates warning).
  useEffect(() => {
    if (!routeOptions) return;
    const idx = Number.isFinite(selectedRouteIndex) ? selectedRouteIndex : 0;
    const sig = `${routeOptions.key}:${routeOptions.type}:${idx}`;
    if (lastRouteSelectSentRef.current === sig) return;
    lastRouteSelectSentRef.current = sig;
    try {
      window.dispatchEvent(new CustomEvent("nols:route:select", { detail: { index: idx } }));
    } catch {
      // ignore
    }
  }, [routeOptions, selectedRouteIndex]);

  // Show/hide alternative route lines on the map only when the routes panel is open
  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent("nols:route:alts", { detail: { visible: routesOpen } }));
    } catch {
      // ignore
    }
  }, [routesOpen]);

  // Automatic stage triggers using arrival geofence (pickup + dropoff)
  useEffect(() => {
    if (!driverPos) return;
    const now = Date.now();
    const speed = driverPos.speedMps ?? 0;
    const nearRadiusM = 55; // ~50m, slightly forgiving for GPS drift
    const dwellMs = 8000;

    const distanceM = (aLat: number, aLng: number, bLat: number, bLng: number) => {
      const R = 6371000;
      const φ1 = (aLat * Math.PI) / 180;
      const φ2 = (bLat * Math.PI) / 180;
      const dφ = ((bLat - aLat) * Math.PI) / 180;
      const dλ = ((bLng - aLng) * Math.PI) / 180;
      const s =
        Math.sin(dφ / 2) * Math.sin(dφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) * Math.sin(dλ / 2);
      return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    };

    // Pickup arrival auto-trigger
    if (
      activeTrip?.pickupLat &&
      activeTrip?.pickupLng &&
      tripStage === "accepted" &&
      hasClearLocationInfo &&
      !pickupAutoTriggeredRef.current
    ) {
      const d = distanceM(driverPos.lat, driverPos.lng, activeTrip.pickupLat, activeTrip.pickupLng);
      setIsAtPickup(d <= nearRadiusM);
      if (d <= nearRadiusM) {
        if (!pickupDwellRef.current) pickupDwellRef.current = now;
        if (now - pickupDwellRef.current >= dwellMs && speed <= 3) {
          pickupAutoTriggeredRef.current = true;
          try {
            notifyDriver("Arrived at Pickup", "You have arrived at the pickup location.", {
              vibrate: true,
              sound: true,
              vibrationPattern: [300, 100, 300],
            });
          } catch {
            // ignore
          }
          handleArriveAtPickup();
        }
      } else {
        pickupDwellRef.current = null;
      }
    }

    // Destination arrival auto-trigger
    if (
      activeTrip?.dropoffLat &&
      activeTrip?.dropoffLng &&
      tripStage === "in_transit" &&
      !destinationAutoTriggeredRef.current
    ) {
      const d = distanceM(driverPos.lat, driverPos.lng, activeTrip.dropoffLat, activeTrip.dropoffLng);
      if (d <= nearRadiusM) {
        if (!destinationDwellRef.current) destinationDwellRef.current = now;
        if (now - destinationDwellRef.current >= dwellMs && speed <= 3) {
          destinationAutoTriggeredRef.current = true;
          setIsAtDestination(true);
          stopETAUpdates();
          try {
            notifyDriver("Arrived at Destination", "You have arrived at the destination.", {
              vibrate: true,
              sound: true,
              vibrationPattern: [300, 100, 300, 100, 300],
            });
          } catch {
            // ignore
          }
          // Do NOT auto-advance stage; driver must confirm via the Arrived button.
        }
      } else {
        destinationDwellRef.current = null;
      }
    }
  }, [driverPos, activeTrip, tripStage, hasClearLocationInfo]);

  // Reset auto-trigger state when a new trip starts or ends
  useEffect(() => {
    if (!activeTrip?.id || tripStage === "waiting" || tripStage === "completed") {
      pickupDwellRef.current = null;
      destinationDwellRef.current = null;
      pickupAutoTriggeredRef.current = false;
      destinationAutoTriggeredRef.current = false;
      setIsAtPickup(false);
      return;
    }
    pickupDwellRef.current = null;
    destinationDwellRef.current = null;
    pickupAutoTriggeredRef.current = false;
    destinationAutoTriggeredRef.current = false;
    setIsAtPickup(false);
  }, [activeTrip?.id]);

  // Stage progression handlers
  const handleArriveAtPickup = () => {
    if (activeTrip) {
      setActiveTrip({ ...activeTrip, status: 'pickup' });
      setTripStage('pickup');
      setIsAtPickup(true);
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
      await axios.post(
        "/api/driver/messages/send",
        { toUserId: toUserId || activeTrip?.passengerUserId || "user-unknown", templateKey },
        { withCredentials: true }
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

  // Live-only mode uses the ride-sharing app layout (with real Mapbox map behind UI)
  if (liveOnly) {
    const arriveMin =
      destinationCountdownSec !== null ? Math.max(1, Math.round(destinationCountdownSec / 60)) : destinationETA;

    return (
      <div className="w-full h-[calc(100vh-8rem)] flex flex-col overflow-hidden relative">
        {/* MAP CONTAINER - Primary visible element */}
        <div
          className={`flex-1 relative min-h-0 ${mapTheme === "dark" ? "bg-slate-950" : "bg-slate-50"}`}
          id="driver-live-map"
          data-map-theme={mapTheme}
          data-map-layer={mapLayer}
        >
          {/* Rounded map frame (subtle radius, no size reduction) */}
          <div
            className={[
              "relative w-full h-full rounded-xl overflow-hidden ring-1 ring-black/10 shadow-[0_18px_60px_rgba(15,23,42,0.16)]",
              mapTheme === "dark" ? "bg-slate-950" : "bg-slate-50",
            ].join(" ")}
          >
            {/* Real Mapbox map layer (behind overlays) */}
            <DriverLiveMapCanvas
              className="absolute inset-0 z-0"
              liveOnly
              tripRequest={tripRequest}
              activeTrip={activeTrip}
              tripStage={tripStage}
              mapTheme={mapTheme}
              mapLayer={mapLayer}
            />

            {/* Map Attribution Toggle Button - Bottom Left */}
            <div className="absolute bottom-2 left-2 z-30 pointer-events-auto">
              <button
                onClick={() => setShowAttribution(!showAttribution)}
                className={[
                  "h-8 w-8 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 border text-xs",
                  mapTheme === "dark"
                    ? "bg-slate-950/55 text-slate-100 border-white/15 backdrop-blur-md"
                    : "bg-white text-slate-600 border-slate-200",
                ].join(" ")}
                aria-label="Show map attribution"
                title="Map attribution"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
              
              {/* Attribution Popup */}
              {showAttribution && (
                <>
                  <div
                    className="fixed inset-0 z-[100]"
                    onClick={() => setShowAttribution(false)}
                    aria-hidden="true"
                  />
                  <div
                    className={[
                      "absolute bottom-10 left-0 z-[110] min-w-[200px] rounded-lg shadow-xl border overflow-hidden animate-fade-in-up p-3 text-xs",
                      mapTheme === "dark"
                        ? "bg-slate-950/90 border-white/15 backdrop-blur-md text-slate-100"
                        : "bg-white border-slate-200 text-slate-700",
                    ].join(" ")}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-semibold">Map Data</span>
                      <button
                        onClick={() => setShowAttribution(false)}
                        className={[
                          "p-0.5 rounded transition-colors",
                          mapTheme === "dark" ? "hover:bg-white/10" : "hover:bg-slate-100",
                        ].join(" ")}
                        aria-label="Close"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="space-y-1 text-[10px] leading-relaxed">
                      <p>© Mapbox</p>
                      <p>© OpenStreetMap</p>
                      <a
                        href="https://www.mapbox.com/about/maps/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={[
                          "underline hover:no-underline transition-colors",
                          mapTheme === "dark" ? "text-emerald-300 hover:text-emerald-200" : "text-emerald-600 hover:text-emerald-700",
                        ].join(" ")}
                      >
                        Improve this map
                      </a>
                    </div>
                  </div>
                </>
              )}
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

          {/* Routes selector (shows alternatives, allows selecting) */}
          {routesOpen && (
            <div className="absolute inset-0 z-40 pointer-events-auto">
              <div
                className={[
                  "absolute inset-0 backdrop-blur-[2px]",
                  mapTheme === "dark" ? "bg-black/35" : "bg-black/20",
                ].join(" ")}
                onClick={() => setRoutesOpen(false)}
                aria-hidden="true"
              />
              {/* Compact centered glass modal (small + clean) */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(22rem,calc(100%-1.5rem))]">
                <div
                  className={[
                    "relative animate-fade-in-up backdrop-blur-xl border ring-1 rounded-2xl overflow-hidden",
                    mapTheme === "dark"
                      ? "bg-slate-950/70 border-white/15 ring-white/10 shadow-[0_22px_70px_rgba(0,0,0,0.48)]"
                      : "bg-white/55 border-white/60 ring-black/5 shadow-[0_22px_70px_rgba(15,23,42,0.22)]",
                  ].join(" ")}
                >
                  {/* subtle reflective highlight */}
                  <div className="pointer-events-none absolute inset-0">
                    <div
                      className={[
                        "absolute -top-20 left-[-30%] h-48 w-[160%] rotate-6 bg-gradient-to-b to-transparent",
                        mapTheme === "dark" ? "from-white/12 via-white/5" : "from-white/30 via-white/10",
                      ].join(" ")}
                    />
                    <div
                      className={[
                        "absolute inset-0 bg-gradient-to-b via-transparent",
                        mapTheme === "dark" ? "from-white/6 to-white/0" : "from-white/10 to-white/5",
                      ].join(" ")}
                    />
                  </div>

                  <div className="relative px-3.5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={[
                              "h-7 w-7 rounded-xl border ring-1 shadow-sm flex items-center justify-center",
                              mapTheme === "dark" ? "bg-white/10 border-white/15 ring-white/10" : "bg-white/55 border-white/70 ring-black/5",
                            ].join(" ")}
                          >
                            <RouteIcon className={["h-4 w-4", mapTheme === "dark" ? "text-slate-100/85" : "text-slate-800/80"].join(" ")} />
                          </span>
                          <div className="min-w-0">
                            <p className={["text-[13px] font-semibold truncate", mapTheme === "dark" ? "text-slate-50/95" : "text-slate-950/90"].join(" ")}>
                              Choose a route
                            </p>
                            <p className={["text-[11px]", mapTheme === "dark" ? "text-slate-200/70" : "text-slate-700/70"].join(" ")}>
                              {routeOptions?.type === "destination" ? "To destination" : "To pickup"}
                              {!isOnline ? " • Offline cache" : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRoutesOpen(false)}
                        className={[
                          "h-9 w-9 rounded-xl border ring-1 flex items-center justify-center shadow-sm transition",
                          mapTheme === "dark"
                            ? "bg-slate-900/55 hover:bg-slate-900/70 border-white/10 ring-white/10 text-slate-100/90"
                            : "bg-white/40 hover:bg-white/60 border-white/60 ring-black/5 text-slate-900/80",
                        ].join(" ")}
                        aria-label="Close routes"
                        title="Close"
                      >
                        <span className="text-lg leading-none">×</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative px-3.5 pb-3.5 space-y-2 max-h-[50vh] overflow-y-auto">
                    {(routeOptions?.routes || []).map((r) => {
                      const mins = r.durationSec ? Math.max(1, Math.round(r.durationSec / 60)) : null;
                      const km = r.distanceMeters ? r.distanceMeters / 1000 : null;
                      const selected = selectedRouteIndex === r.index;
                      const recommended = r.index === 0;
                      return (
                        <button
                          key={r.index}
                          type="button"
                          onClick={() => {
                            setSelectedRouteIndex(r.index);
                          }}
                          aria-pressed={selected}
                          className={[
                            "group relative w-full text-left rounded-xl border px-3 py-2.5 flex items-center justify-between gap-3 transition-all",
                            mapTheme === "dark"
                              ? "bg-slate-900/45 hover:bg-slate-900/60 border-white/10"
                              : "bg-white/35 hover:bg-white/50 border-white/60",
                            selected
                              ? mapTheme === "dark"
                                ? "ring-2 ring-emerald-400/55 border-emerald-400/35 bg-emerald-500/10"
                                : "ring-2 ring-emerald-400/70 border-emerald-300/70 bg-emerald-50/40"
                              : mapTheme === "dark"
                                ? "ring-1 ring-white/0 hover:ring-white/10"
                                : "ring-1 ring-black/0 hover:ring-black/5",
                            "hover:-translate-y-[1px] active:translate-y-0",
                          ].join(" ")}
                        >
                          {/* inner gloss */}
                          <span
                            className={[
                              "pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b via-transparent opacity-70",
                              mapTheme === "dark" ? "from-white/10 to-white/0" : "from-white/25 to-white/10",
                            ].join(" ")}
                          />

                          <div className="min-w-0">
                            <p className={["text-[13px] font-semibold truncate", mapTheme === "dark" ? "text-slate-50/95" : "text-slate-950/90"].join(" ")}>
                              Route {r.index + 1}
                            </p>
                            <p className={["text-[11px]", mapTheme === "dark" ? "text-slate-200/70" : "text-slate-700/75"].join(" ")}>
                              {mins !== null ? `${mins} min` : "—"}
                              {km !== null ? ` • ${km.toFixed(1)} km` : ""}
                            </p>
                            {recommended && (
                              <div className="mt-1">
                                <span
                                  className={[
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                                    mapTheme === "dark"
                                      ? "bg-emerald-500/12 text-emerald-200 border-emerald-400/20"
                                      : "bg-emerald-500/10 text-emerald-700 border-emerald-400/20",
                                  ].join(" ")}
                                >
                                  Recommended
                                </span>
                              </div>
                            )}
                          </div>
                          <div
                            className={[
                              "relative h-9 w-9 rounded-xl flex items-center justify-center border ring-1 ring-black/5 shadow-sm transition",
                              selected
                                ? "bg-emerald-600 border-emerald-500 text-white"
                                : mapTheme === "dark"
                                  ? "bg-slate-800/60 border-white/10 text-slate-100 group-hover:bg-slate-800/75"
                                  : "bg-white/45 border-white/70 text-slate-700 group-hover:bg-white/60",
                            ].join(" ")}
                          >
                            {selected ? <Check className="h-4 w-4" /> : <span className="text-base leading-none">→</span>}
                          </div>
                        </button>
                      );
                    })}
                    {!routeOptions && (
                      <div
                        className={[
                          "text-[13px] rounded-xl px-3 py-3 border ring-1",
                          mapTheme === "dark"
                            ? "text-slate-100/80 bg-slate-900/45 border-white/10 ring-white/10"
                            : "text-slate-800/80 bg-white/35 border-white/60 ring-black/5",
                        ].join(" ")}
                      >
                        Loading routes…
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Map layers selector (small + clean, like Google Maps) */}
          {layersOpen && (
            <div className="absolute inset-0 z-50 pointer-events-auto">
              {/* Click-outside catcher (no big modal UI) */}
              <div
                className="absolute inset-0"
                onClick={() => setLayersOpen(false)}
                aria-hidden="true"
              />

              {/* Small popover near the layers button */}
              <div
                className={[
                  "absolute pointer-events-auto",
                  "bottom-[calc(0.75rem+env(safe-area-inset-bottom))]",
                  "right-[calc(4.75rem+env(safe-area-inset-right))]", // sits left of the floating actions stack
                ].join(" ")}
              >
                <div
                  className={[
                    "rounded-2xl border shadow-xl backdrop-blur-md p-1.5",
                    mapTheme === "dark" ? "bg-slate-950/80 border-white/15" : "bg-white/95 border-slate-200",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    {(
                      [
                        {
                          key: "navigation",
                          label: "Default",
                          icon: MapIcon,
                          thumb: mapTheme === "dark"
                            ? "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900"
                            : "bg-gradient-to-br from-emerald-100 via-white to-sky-100",
                        },
                        {
                          key: "satellite",
                          label: "Satellite",
                          icon: Globe,
                          thumb: "bg-[linear-gradient(135deg,rgba(34,197,94,0.25),rgba(59,130,246,0.20)),linear-gradient(45deg,rgba(2,6,23,0.18),rgba(2,6,23,0.04))]",
                        },
                      ] as const
                    ).map((opt) => {
                      const selected = mapLayer === opt.key;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            setMapLayer(opt.key);
                            setLayersOpen(false);
                          }}
                          aria-pressed={selected}
                          className="group flex flex-col items-center gap-1 px-1.5 py-1"
                          title={opt.label}
                        >
                          <span
                            className={[
                              "relative h-10 w-10 rounded-xl overflow-hidden border shadow-sm",
                              opt.thumb,
                              selected
                                ? "ring-2 ring-emerald-400 border-emerald-300"
                                : mapTheme === "dark"
                                  ? "border-white/15"
                                  : "border-slate-200",
                            ].join(" ")}
                          >
                            {/* icon badge */}
                            <span
                              className={[
                                "absolute left-1 top-1 h-6 w-6 rounded-lg border flex items-center justify-center",
                                mapTheme === "dark" ? "bg-slate-950/55 border-white/15" : "bg-white/75 border-white/60",
                              ].join(" ")}
                            >
                              <Icon className={["h-3.5 w-3.5", mapTheme === "dark" ? "text-slate-100/90" : "text-slate-700/90"].join(" ")} />
                            </span>
                            {/* tiny roads hint */}
                            <span className="absolute inset-0 opacity-60">
                              <span className="absolute left-2 top-3 h-1 w-8 rounded-full bg-white/40" />
                              <span className="absolute left-3 top-6 h-1 w-7 rounded-full bg-white/30" />
                              <span className="absolute left-4 top-9 h-1 w-6 rounded-full bg-white/25" />
                            </span>
                            {selected && (
                              <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow">
                                <Check className="h-4 w-4" />
                              </span>
                            )}
                          </span>
                          <span className={["text-[11px] font-semibold", mapTheme === "dark" ? "text-slate-100" : "text-slate-700"].join(" ")}>
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
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
                isDark={mapTheme === "dark"}
              />
            </div>
          </div>

          {/* Floating Actions - Floating on top of map */}
          <div className="absolute inset-0 pointer-events-none z-20">
            <div className="pointer-events-auto">
              <DriverLiveMapFloatingActions
                isDark={mapTheme === "dark"}
                onLocationClick={() => console.log('Center on location')}
                onLayersClick={() => setLayersOpen(true)}
                onRoutesClick={() => setRoutesOpen(true)}
                mapThemeToggle={{
                  isDark: mapTheme === "dark",
                  onToggle: () => setMapTheme((t) => (t === "dark" ? "light" : "dark")),
                }}
                overlayToggle={
                  activeTrip && bottomSheetCollapsed && tripStage !== "dropoff"
                    ? {
                        isVisible: overlayVisible,
                        onToggle: () => setOverlayVisible((v) => !v),
                      }
                    : undefined
                }
                tripActions={
                  activeTrip && tripStage !== 'completed' && tripStage !== 'waiting'
                    ? {
                        phoneNumber: activeTrip.phoneNumber || tripRequest?.phoneNumber || undefined,
                        onCall: () => {
                          const phone = activeTrip.phoneNumber || tripRequest?.phoneNumber;
                          if (phone) {
                            window.location.href = `tel:${phone}`;
                          }
                        },
                        onMessage: () => {
                          const phone = activeTrip.phoneNumber || tripRequest?.phoneNumber;
                          if (phone) {
                            // Open SMS app or quick message modal
                            const smsLink = `sms:${phone}`;
                            // Try to open SMS app, fallback to quick message modal
                            try {
                              window.location.href = smsLink;
                              // If SMS app doesn't open, show modal after a short delay
                              setTimeout(() => setShowQuickModal(true), 500);
                            } catch (e) {
                              setShowQuickModal(true);
                            }
                          } else {
                            // If no phone number, just show the quick message modal
                            setShowQuickModal(true);
                          }
                        },
                        onConfirmPickup: handleArriveAtPickup,
                        canConfirmPickup: isAtPickup || (tripStage === 'accepted' && hasClearLocationInfo),
                      }
                    : undefined
                }
                onNavigationClick={() => {
                  // Start navigation to pickup or destination based on trip stage
                  if (activeTrip) {
                    const stage = tripStage;
                    const isTransit = stage === "picked_up" || stage === "in_transit" || stage === "arrived" || stage === "dropoff";
                    if (isTransit && activeTrip.dropoffLat && activeTrip.dropoffLng) {
                      // Navigate to destination using navigation utility (opens native app on mobile, web on desktop)
                      openInMaps(
                        activeTrip.dropoffLat,
                        activeTrip.dropoffLng,
                        activeTrip.dropoffAddress || activeTrip.destinationAddress
                      );
                    } else if (activeTrip.pickupLat && activeTrip.pickupLng) {
                      // Navigate to pickup using navigation utility
                      openInMaps(
                        activeTrip.pickupLat,
                        activeTrip.pickupLng,
                        activeTrip.pickupAddress
                      );
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Active trip overlay - Shows Call/Message to get clear location, hidden after confirming location info */}
          {activeTrip && bottomSheetCollapsed && overlayVisible && tripStage === 'accepted' && !hasClearLocationInfo && (
            <div className="absolute bottom-6 right-4 z-30 pointer-events-auto animate-fade-in-up">
              <div
                className={[
                  "backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-4 w-80 max-w-full space-y-3 border",
                  mapTheme === "dark"
                    ? "bg-slate-950/70 border-white/15 text-slate-100"
                    : "bg-white/95 border-slate-200 text-slate-900",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      "h-10 w-10 rounded-full flex items-center justify-center font-semibold",
                      mapTheme === "dark" ? "bg-white/10 text-slate-100 border border-white/10" : "bg-slate-100 text-slate-700",
                    ].join(" ")}
                  >
                    {activeTrip.passengerName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={["text-sm font-semibold truncate", mapTheme === "dark" ? "text-slate-50" : "text-slate-900"].join(" ")}>
                      {activeTrip.passengerName}
                    </p>
                    <p className={["text-xs truncate", mapTheme === "dark" ? "text-slate-200/75" : "text-slate-500"].join(" ")}>
                      {activeTrip.pickupAddress}
                    </p>
                  </div>
                </div>
                <div className={["flex items-center justify-between text-sm", mapTheme === "dark" ? "text-slate-200/85" : "text-slate-700"].join(" ")}>
                  <span className="font-semibold">{activeTrip.fare}</span>
                  <span className={["text-xs uppercase tracking-wide", mapTheme === "dark" ? "text-slate-300/70" : "text-slate-500"].join(" ")}>
                    Going to Pickup
                  </span>
                </div>
                {/* Call and Message buttons - Get clear location from client */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                  
                      className={[
                        "flex-1 inline-flex items-center justify-center gap-2 rounded-xl border active:scale-[0.98] transition-all duration-200 py-2 text-sm font-medium",
                        mapTheme === "dark"
                          ? "border-emerald-400/25 bg-emerald-500/12 text-emerald-200 hover:bg-emerald-500/18"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                      ].join(" ")}
                    >
                      📞 Call
                    </button>
                    <button
                      onClick={() => setShowQuickModal(true)}
                      className={[
                        "flex-1 inline-flex items-center justify-center gap-2 rounded-xl border active:scale-[0.98] transition-all duration-200 py-2 text-sm font-medium",
                        mapTheme === "dark"
                          ? "border-blue-400/25 bg-blue-500/12 text-blue-200 hover:bg-blue-500/18"
                          : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
                      ].join(" ")}
                    >
                      💬 Message
                    </button>
                  </div>
                  
                  {/* Confirm Location Info Button - Only show if not confirmed yet */}
                  {!hasClearLocationInfo && (
                    <button
                      onClick={handleConfirmLocationInfo}
                      className={[
                        "w-full py-2 rounded-lg text-sm font-medium active:scale-[0.98] transition-all duration-200 border",
                        mapTheme === "dark"
                          ? "bg-white/8 text-slate-100 hover:bg-white/12 border-white/15"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300",
                      ].join(" ")}
                    >
                      ✓ I have clear location info
                    </button>
                  )}
                  
                  {/* Cancel Trip Button */}
                  {tripStage === 'accepted' && (
                    <button
                      onClick={() => handleCancelTrip(activeTrip.id)}
                      disabled={isCancelling}
                      className={[
                        "w-full py-2 rounded-lg text-sm font-medium active:scale-[0.98] transition-all duration-200 border disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",
                        mapTheme === "dark"
                          ? "bg-red-500/10 text-red-200 hover:bg-red-500/15 border-red-400/25"
                          : "bg-red-50 text-red-700 hover:bg-red-100 border-red-200",
                      ].join(" ")}
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

          {/* Overlay toggle button moved into the floating actions stack (consistent sizing/spacing). */}
          
          {/* Trip Steps / ETA badge - keep inside rounded map frame */}
          {activeTrip && tripStage !== 'dropoff' && tripStage !== 'completed' && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 pointer-events-auto">
              <TripSteps
                currentStep={getCurrentStep()}
                completedSteps={completedSteps}
                onStepClick={handleStepClick}
                tripStage={tripStage}
                mapTheme={mapTheme}
                mapLayer={mapLayer}
                hasClearLocationInfo={hasClearLocationInfo}
                isAtPickup={isAtPickup}
                isAtDestination={isAtDestination}
                pickupCountdownMin={tripStage === "accepted" ? (pickupCountdownSec !== null ? Math.max(1, Math.round(pickupCountdownSec / 60)) : pickupETA) : null}
                destinationCountdownMin={tripStage === "in_transit" || tripStage === "picked_up" ? (arriveMin ?? null) : null}
              />
            </div>
          )}
          </div>
        </div>
        
        {/* Bottom Sheet */}
        <DriverLiveMapBottomSheet
          isCollapsed={bottomSheetCollapsed}
          onToggle={() => setBottomSheetCollapsed(!bottomSheetCollapsed)}
          mapTheme={mapTheme}
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
              className={["absolute inset-0 transition-opacity duration-200", mapTheme === "dark" ? "bg-black/55" : "bg-black/40"].join(" ")}
              onClick={() => setShowQuickModal(false)}
              aria-hidden
            />
            <div
              className={[
                "relative w-full max-w-sm rounded-2xl shadow-2xl border overflow-hidden max-h-[70vh] flex flex-col animate-fade-in-up",
                mapTheme === "dark" ? "bg-slate-950/80 border-white/15 text-slate-100" : "bg-white border-slate-200 text-slate-900",
              ].join(" ")}
            >
              <div
                className={[
                  "px-4 py-3 border-b flex items-start justify-between gap-3",
                  mapTheme === "dark" ? "border-white/10" : "border-slate-100",
                ].join(" ")}
              >
                <div>
                  <p className={["text-base font-semibold", mapTheme === "dark" ? "text-slate-50" : "text-slate-900"].join(" ")}>
                    Quick messages
                  </p>
                  <p className={["text-[12px]", mapTheme === "dark" ? "text-slate-200/70" : "text-slate-500"].join(" ")}>
                    Choose a prepared note to send to the rider.
                  </p>
                </div>
                <button
                  onClick={() => setShowQuickModal(false)}
                  className={["p-1.5 rounded-full transition-colors", mapTheme === "dark" ? "hover:bg-white/10" : "hover:bg-slate-100"].join(" ")}
                  aria-label="Close quick messages"
                >
                  <span className={["text-sm", mapTheme === "dark" ? "text-slate-200" : "text-slate-600"].join(" ")}>✕</span>
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
                      className={[
                        "w-full text-left text-sm px-3 py-2 rounded-xl border transition-colors shadow-sm leading-snug",
                        mapTheme === "dark"
                          ? "border-white/12 bg-white/5 hover:bg-white/10 hover:border-white/20 text-slate-100"
                          : "border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-900",
                      ].join(" ")}
                    >
                      {labelMap[key]}
                    </button>
                  );
                })}
              </div>
              {waitingReply && (
                <div
                  className={[
                    "px-4 py-2.5 border-t text-[12px] font-medium",
                    mapTheme === "dark"
                      ? "border-white/10 bg-emerald-500/10 text-emerald-200"
                      : "border-slate-100 bg-emerald-50 text-emerald-700",
                  ].join(" ")}
                >
                  Sent. Waiting for user response…
                </div>
              )}
              {!waitingReply && responseMessage && (
                <div
                  className={[
                    "px-4 py-2.5 border-t text-[12px] font-medium",
                    mapTheme === "dark"
                      ? "border-white/10 bg-blue-500/10 text-blue-200"
                      : "border-slate-100 bg-blue-50 text-blue-700",
                  ].join(" ")}
                >
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
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Live Map</h1>
      </div>

      <section className="mx-auto max-w-3xl bg-white rounded-lg p-4 border">
        <DriverLiveMap liveOnly={false} />
      </section>

      <LiveMap
        isOpen={showLiveOverlay}
        onClose={() => setShowLiveOverlay(false)}
        onGoToDashboard={() => { setShowLiveOverlay(false); router.push('/driver'); }}
      />
    </div>
  );
}

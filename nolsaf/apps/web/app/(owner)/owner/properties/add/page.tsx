"use client";
import type { ReactNode } from "react";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import PicturesUploader from "@/components/PicturesUploader";
import { Plus, ChevronDown, Minus, ChevronLeft, ChevronRight, Home, Building, Building2, TreePine, Hotel, HelpCircle, Car, Coffee, Beer, Thermometer, Package, Shield, Bandage, FireExtinguisher, ShoppingBag, Store, PartyPopper, Gamepad, Dumbbell, Bus, Fuel, Sparkles, ScrollText, ShowerHead, Flame, Toilet as ToiletIcon, Wind, Trash2, Brush, ScanFace, FootprintsIcon, Shirt, RectangleHorizontal, Waves, Wifi, Table2, Armchair, CircleDot, Tv, MonitorPlay, Gamepad2, AirVent, Refrigerator, Phone, LampDesk, Heater, LockKeyhole, Eclipse, Sofa, Bed, BedDouble, BedSingle, WashingMachine, CheckCircle2, XCircle, AlertCircle, UtensilsCrossed, MapPin, Link as LinkIcon, BadgeCheck, Users, CreditCard, Smartphone, Navigation, Locate, Eye, X, Bath } from "lucide-react";
import axios from "axios";
import { REGIONS, REGION_BY_ID, REGIONS_FULL_DATA } from "@/lib/tzRegions";
import { BATHROOM_ICONS, OTHER_AMENITIES_ICONS } from "@/lib/amenityIcons";
import ServicesAndFacilities from "@/components/ServicesAndFacilities";
import NearbyServices from "@/components/NearbyServices";

const api = axios.create();
function authify(){ const t = typeof window!=="undefined" ? localStorage.getItem("token") : null; if(t) api.defaults.headers.common["Authorization"]=`Bearer ${t}`; }

// Safe icon renderer: renders the icon component if available, otherwise renders a small placeholder span
function IconOr({ Icon, className }: { Icon: any; className?: string }) {
  if (!Icon) return <span className={className} aria-hidden />;
  return <Icon className={className} />;
}

type BedKey = "twin" | "full" | "queen" | "king";
const PROPERTY_TYPES = ["Villa","Apartment","Hotel","Lodge","Condo","Guest House","Bungalow","Cabin","Homestay","Townhouse","House","Other"] as const;

// Icon mapping for property types
const PROPERTY_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Villa": Building2,
  "Apartment": Building,
  "Hotel": Hotel,
  "Lodge": TreePine,
  "Condo": Building2,
  "Guest House": Home,
  "Bungalow": Home,
  "Cabin": TreePine,
  "Homestay": Home,
  "Townhouse": Building2,
  "House": Home,
  "Other": HelpCircle,
};

// Border and color mapping for property types
const PROPERTY_TYPE_STYLES: Record<string, { border: string; leftBorder: string; text: string; bg: string; hoverBorder: string }> = {
  "Villa": { border: "border-blue-500", leftBorder: "border-l-blue-500", text: "text-blue-600", bg: "from-white to-blue-50", hoverBorder: "hover:border-blue-400" },
  "Apartment": { border: "border-purple-500", leftBorder: "border-l-purple-500", text: "text-purple-600", bg: "from-white to-purple-50", hoverBorder: "hover:border-purple-400" },
  "Hotel": { border: "border-amber-500", leftBorder: "border-l-amber-500", text: "text-amber-600", bg: "from-white to-amber-50", hoverBorder: "hover:border-amber-400" },
  "Lodge": { border: "border-green-500", leftBorder: "border-l-green-500", text: "text-green-600", bg: "from-white to-green-50", hoverBorder: "hover:border-green-400" },
  "Condo": { border: "border-indigo-500", leftBorder: "border-l-indigo-500", text: "text-indigo-600", bg: "from-white to-indigo-50", hoverBorder: "hover:border-indigo-400" },
  "Guest House": { border: "border-pink-500", leftBorder: "border-l-pink-500", text: "text-pink-600", bg: "from-white to-pink-50", hoverBorder: "hover:border-pink-400" },
  "Bungalow": { border: "border-orange-500", leftBorder: "border-l-orange-500", text: "text-orange-600", bg: "from-white to-orange-50", hoverBorder: "hover:border-orange-400" },
  "Cabin": { border: "border-emerald-500", leftBorder: "border-l-emerald-500", text: "text-emerald-600", bg: "from-white to-emerald-50", hoverBorder: "hover:border-emerald-400" },
  "Homestay": { border: "border-rose-500", leftBorder: "border-l-rose-500", text: "text-rose-600", bg: "from-white to-rose-50", hoverBorder: "hover:border-rose-400" },
  "Townhouse": { border: "border-cyan-500", leftBorder: "border-l-cyan-500", text: "text-cyan-600", bg: "from-white to-cyan-50", hoverBorder: "hover:border-cyan-400" },
  "House": { border: "border-teal-500", leftBorder: "border-l-teal-500", text: "text-teal-600", bg: "from-white to-teal-50", hoverBorder: "hover:border-teal-400" },
  "Other": { border: "border-gray-500", leftBorder: "border-l-gray-500", text: "text-gray-600", bg: "from-white to-gray-50", hoverBorder: "hover:border-gray-400" },
};
const HOTEL_STAR_OPTIONS = [
  { value: "", label: "Select rating" },
  { value: "basic", label: "Basic accommodations" },
  { value: "simple", label: "Simple and affordable" },
  { value: "moderate", label: "Moderate quality" },
  { value: "high", label: "High-end comfort" },
  { value: "luxury", label: "Luxury and exceptional service" },
];

const BED_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "twin": BedSingle,
  "full": BedDouble,
  "queen": Bed,
  "king": BedDouble,
};

/** Facilities config */
const FACILITY_TYPES = [
  "Hospital",
  "Pharmacy",
  "Polyclinic",
  "Clinic",
  "Police station",
  "Airport",
  "Bus station",
  "Petrol station",
  "Conference center",
  "Stadium",
  "Main road",
] as const;
const REACH_MODES = ["Walking","Boda","Public Transport","Car/Taxi"] as const;
type FacilityType = typeof FACILITY_TYPES[number];
type ReachMode = typeof REACH_MODES[number];

// Facility type to placeholder examples mapping
const FACILITY_PLACEHOLDERS: Record<FacilityType, string> = {
  "Hospital": "e.g. Aga Khan Hospital",
  "Pharmacy": "e.g. Medipharm Pharmacy",
  "Polyclinic": "e.g. City Polyclinic",
  "Clinic": "e.g. Community Health Clinic",
  "Police station": "e.g. Central Police Station",
  "Airport": "e.g. Julius Nyerere International Airport",
  "Bus station": "e.g. Ubungo Bus Terminal",
  "Petrol station": "e.g. Total Petrol Station",
  "Conference center": "e.g. Mlimani City Conference Center",
  "Stadium": "e.g. Benjamin Mkapa Stadium",
  "Main road": "e.g. Bagamoyo Road",
};

// Facility types that require ownership selection
const FACILITIES_WITH_OWNERSHIP: FacilityType[] = ["Hospital", "Pharmacy", "Polyclinic", "Clinic"];

// Helper function to check if facility type requires ownership
const requiresOwnership = (type: FacilityType): boolean => {
  return FACILITIES_WITH_OWNERSHIP.includes(type);
};
type NearbyFacility = {
  id: string;
  type: FacilityType;
  name: string;
  ownership: "Public/Government" | "Private" | "";
  distanceKm: number | "";
  reachableBy: ReachMode[];
  url?: string;
};

// Small inline SVGs for walking and motorbike when lucide doesn't expose those icons in this package version
function WalkingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M13.5 5.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 13s1-1 3-1 3 2 4 3 1 3 1 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 20s1-4 4-5 4-1 4-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 12l2-3 3 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MotorbikeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M3 13h3l3-5h4l2 3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="6" cy="18" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 13l1-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Map reach modes to icons (use available lucide icons where possible).
const REACH_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Walking": WalkingIcon,
  "Boda": MotorbikeIcon,
  "Public Transport": Bus,
  "Car/Taxi": Car,
};
// Color mapping for reach mode icons in summaries
const REACH_ICON_COLORS: Record<string, string> = {
  "Walking": "text-emerald-600",
  "Boda": "text-orange-600",
  "Public Transport": "text-indigo-600",
  "Car/Taxi": "text-blue-600",
};
type RoomEntry = {
  roomType: string;
  beds: Record<BedKey, number>;
  roomsCount: number;
  smoking: "yes" | "no";
  bathPrivate: "yes" | "no";
  bathItems: string[];
  towelColor: string;
  otherAmenities: string[];
  roomDescription: string;
  roomImages: string[];
  pricePerNight: number;
};
type ServicesState = {
  parking: "no"|"free"|"paid";
  parkingPrice: number | "";
  breakfastIncluded: boolean;
  breakfastAvailable: boolean;
  restaurant: boolean;
  bar: boolean;
  pool: boolean;
  sauna: boolean;
  laundry: boolean;
  roomService: boolean;
  security24: boolean;
  firstAid: boolean;
  fireExtinguisher: boolean;
  onSiteShop: boolean;
  nearbyMall: boolean;
  socialHall: boolean;
  sportsGames: boolean;
  gym: boolean;
  distanceHospital: number | "";
  nearPetrolStation?: boolean;
  petrolStationName?: string;
  petrolStationDistance?: number | "";
  nearBusStation?: boolean;
  busStationName?: string;
  busStationDistance?: number | "";
};

// Helper function to normalize names for matching (handles special chars, case, whitespace)
function normalizeName(name: string): string {
  return name.toLowerCase()
    .replace(/[''""]/g, "'") // Normalize different quote types
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

// Helper function to create region slug from name
function createRegionSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Property Location Map Component - Uses exact coordinates and postcode
function PropertyLocationMap({ 
  latitude, 
  longitude, 
  postcode,
  onLocationDetected
}: { 
  latitude: number; 
  longitude: number; 
  postcode?: string | null;
  onLocationDetected?: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const markerRef = useRef<any | null>(null);
  const popupRef = useRef<any | null>(null);
  const centerMarkerRef = useRef<HTMLDivElement | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const hasAutoDetectedRef = useRef(false);

  // Function to detect user's current location
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        
        console.log('📍 Location detected:', { latitude: lat, longitude: lng, accuracy: position.coords.accuracy });
        
        // Update parent component if callback provided
        if (onLocationDetected) {
          onLocationDetected(lat, lng);
        }
        
        // Center map on detected location
        // The center pin marker will automatically show the location
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 17,
            duration: 1500,
            essential: true
          });
        }
        
        setIsDetectingLocation(false);
      },
      (error) => {
        setIsDetectingLocation(false);
        let errorMsg = 'Failed to get your location.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location access denied. Please enable location permissions.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information unavailable.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out.';
        }
        setLocationError(errorMsg);
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [onLocationDetected]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!containerRef.current) return;

    // Check if coordinates are default/unset - if so, try auto-detection once
    const hasDefaultCoords = (!Number.isFinite(latitude) || !Number.isFinite(longitude)) ||
                             (latitude === 0 && longitude === 0) ||
                             (Math.abs(latitude) < 0.001 && Math.abs(longitude) < 0.001);

    // Auto-detect location on first load if coordinates are not set
    if (hasDefaultCoords && !hasAutoDetectedRef.current && navigator.geolocation) {
      hasAutoDetectedRef.current = true;
      // Small delay to ensure map container is ready
      setTimeout(() => {
        detectLocation();
      }, 500);
      return; // Don't initialize map yet, wait for location
    }

    // Validate coordinates are valid numbers
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      console.warn('Invalid coordinates:', { latitude, longitude });
      return;
    }

    // Ensure coordinates are within valid ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      console.warn('Coordinates out of range:', { latitude, longitude });
      return;
    }

    const token =
      (process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string) ||
      (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string) ||
      (window as any).__MAPBOX_TOKEN ||
      '';

    if (!token) {
      console.warn('Mapbox token not found');
      return;
    }

    let map: any = null;
    (async () => {
      try {
        const mod = await import('mapbox-gl');
        const mapboxgl = (mod as any).default ?? mod;
        mapboxgl.accessToken = token;

        // Clean up existing map if any
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }

        // Use EXACT coordinates - no rounding
        // IMPORTANT: Mapbox uses [longitude, latitude] format
        const exactLng = Number(longitude);
        const exactLat = Number(latitude);

        // Log coordinates for debugging
        console.log('Map initialization with coordinates:', {
          latitude: exactLat,
          longitude: exactLng,
          postcode: postcode || 'not provided',
          format: '[longitude, latitude]'
        });

        map = new mapboxgl.Map({
          container: containerRef.current as HTMLElement,
          style: 'mapbox://styles/mapbox/light-v10',
          center: [exactLng, exactLat], // [longitude, latitude] - Mapbox format
          zoom: 17, // Higher zoom for very precise location
          interactive: true,
        });

        mapRef.current = map;

        // Wait for map to load before adding controls and marker
        map.on('load', () => {
          // Add navigation controls
          map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

          // Add "Locate Me" button control
          const locateButton = document.createElement('button');
          locateButton.className = 'mapboxgl-ctrl-icon mapboxgl-ctrl-locate';
          locateButton.type = 'button';
          locateButton.setAttribute('aria-label', 'Locate me');
          locateButton.setAttribute('title', 'Locate me');
          locateButton.style.cssText = `
            width: 30px;
            height: 30px;
            background-color: #fff;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 0 2px rgba(0,0,0,0.1);
            transition: all 0.2s;
          `;
          
          // Add locate icon (using SVG)
          const locateIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          locateIcon.setAttribute('width', '18');
          locateIcon.setAttribute('height', '18');
          locateIcon.setAttribute('viewBox', '0 0 24 24');
          locateIcon.setAttribute('fill', 'none');
          locateIcon.setAttribute('stroke', isDetectingLocation ? '#10b981' : '#02665e');
          locateIcon.setAttribute('stroke-width', '2');
          locateIcon.setAttribute('stroke-linecap', 'round');
          locateIcon.setAttribute('stroke-linejoin', 'round');
          
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', '12');
          circle.setAttribute('cy', '12');
          circle.setAttribute('r', '10');
          
          const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          dot.setAttribute('cx', '12');
          dot.setAttribute('cy', '12');
          dot.setAttribute('r', '3');
          
          locateIcon.appendChild(circle);
          locateIcon.appendChild(dot);
          locateButton.appendChild(locateIcon);
          
          locateButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            detectLocation();
          });
          
          locateButton.addEventListener('mouseenter', () => {
            locateButton.style.backgroundColor = '#f0f9ff';
            locateButton.style.boxShadow = '0 0 0 2px rgba(2,102,94,0.2)';
          });
          
          locateButton.addEventListener('mouseleave', () => {
            locateButton.style.backgroundColor = '#fff';
            locateButton.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.1)';
          });
          
          // Create control container
          const locateControl = document.createElement('div');
          locateControl.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
          locateControl.appendChild(locateButton);
          locateControl.style.cssText = 'margin: 10px;';
          
          // Add to map (top-right, below navigation controls)
          const topRight = map.getContainer().querySelector('.mapboxgl-ctrl-top-right');
          if (topRight) {
            topRight.appendChild(locateControl);
          }

          // Add center pin marker (fixed at center of map viewport)
          const centerMarkerContainer = document.createElement('div');
          centerMarkerContainer.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -100%);
            z-index: 1000;
            pointer-events: none;
            width: 40px;
            height: 50px;
            display: flex;
            align-items: flex-end;
            justify-content: center;
          `;
          
          const centerPin = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          centerPin.setAttribute('width', '40');
          centerPin.setAttribute('height', '50');
          centerPin.setAttribute('viewBox', '0 0 24 24');
          centerPin.setAttribute('fill', 'none');
          centerPin.style.display = 'block';
          
          // Create pin shape (teardrop/pin icon like MapPin from Lucide)
          // The pin point is at y=22 (bottom of viewBox), so we position it at the bottom
          const pinPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          pinPath.setAttribute('d', 'M20 10c0 4.418-8 12-8 12s-8-7.582-8-12a8 8 0 1 1 16 0z');
          pinPath.setAttribute('fill', '#3b82f6'); // Blue color like the image
          pinPath.setAttribute('stroke', '#fff');
          pinPath.setAttribute('stroke-width', '1.5');
          
          // White circle in center of pin
          const whiteCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          whiteCircle.setAttribute('cx', '12');
          whiteCircle.setAttribute('cy', '10');
          whiteCircle.setAttribute('r', '4');
          whiteCircle.setAttribute('fill', '#fff');
          
          centerPin.appendChild(pinPath);
          centerPin.appendChild(whiteCircle);
          centerMarkerContainer.appendChild(centerPin);
          
          // Add to map container
          const mapContainer = map.getContainer();
          mapContainer.style.position = 'relative';
          mapContainer.appendChild(centerMarkerContainer);
          centerMarkerRef.current = centerMarkerContainer;
          
          // Update coordinates when map center changes
          const updateCenterCoordinates = () => {
            if (!map) return;
            const center = map.getCenter();
            const centerLat = center.lat;
            const centerLng = center.lng;
            
            // Update parent component with center coordinates
            if (onLocationDetected) {
              onLocationDetected(centerLat, centerLng);
            }
          };
          
          // Listen to map move events to update coordinates
          map.on('moveend', updateCenterCoordinates);
          map.on('dragend', updateCenterCoordinates);

          // If postcode is provided, try to geocode it and verify/adjust location
          if (postcode) {
            // First, try to geocode the postcode to get coordinates
            fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(postcode)}.json?access_token=${token}&country=TZ&types=postcode`)
              .then(res => res.json())
              .then(data => {
                if (data.features && data.features.length > 0) {
                  const postcodeCoords = data.features[0].center; // [lng, lat]
                  const distance = Math.sqrt(
                    Math.pow(postcodeCoords[0] - exactLng, 2) + 
                    Math.pow(postcodeCoords[1] - exactLat, 2)
                  ) * 111; // Approximate km
                  
                  // If coordinates are far from postcode center, log warning
                  if (distance > 5) {
                    console.warn('Location may be inaccurate: coordinates are far from postcode center');
                  }
                }
              })
              .catch(() => {});

            // Also do reverse geocoding to verify address
            fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${exactLng},${exactLat}.json?access_token=${token}&types=postcode,address`)
              .then(res => res.json())
              .then(data => {
                if (data.features && data.features.length > 0) {
                  const feature = data.features[0];
                  const context = feature.context || [];
                  const postcodeFromApi = context.find((c: any) => c.id?.startsWith('postcode'))?.text;
                  
                  // Postcode mismatch detected but not logged to avoid console noise
                }
              })
              .catch(() => {});
          }
        });

        // Add mapbox CSS if not already added
        if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
          const link = document.createElement('link');
          link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
          link.rel = 'stylesheet';
          document.head.appendChild(link);
        }
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    })();

    return () => {
      if (centerMarkerRef.current) {
        try {
          centerMarkerRef.current.remove();
        } catch (e) {
          // ignore
        }
        centerMarkerRef.current = null;
      }
      if (popupRef.current) {
        try {
          popupRef.current.remove();
        } catch (e) {
          // ignore
        }
        popupRef.current = null;
      }
      if (markerRef.current) {
        try {
          markerRef.current.remove();
        } catch (e) {
          // ignore
        }
        markerRef.current = null;
      }
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          // ignore
        }
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, postcode, detectLocation]);

  return (
    <div className="w-full">
      <div className="relative">
        <div 
          ref={containerRef} 
          className="w-full h-64 sm:h-80 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm bg-gray-50"
          style={{ minHeight: '256px' }}
        />
        {/* Loading overlay when detecting location */}
        {isDetectingLocation && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-[#02665e] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-[#02665e]">Detecting your location...</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Location info and error messages */}
      <div className="mt-2 space-y-1">
        <div className="text-xs text-gray-600 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-[#02665e]" />
          <span>
            {Number.isFinite(latitude) && Number.isFinite(longitude) 
              ? `Location: ${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`
              : 'No location set. Click "Locate Me" button on map to detect your location.'}
          </span>
          {postcode && <span className="text-[#02665e] font-medium">• Postcode: {postcode}</span>}
        </div>
        
        {locationError && (
          <div className="text-xs text-rose-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{locationError}</span>
          </div>
        )}
        
        {!isDetectingLocation && Number.isFinite(latitude) && Number.isFinite(longitude) && (
          <div className="text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Location detected successfully</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AddProperty() {
  useEffect(()=>{ authify(); },[]);

  const [propertyId, setPropertyId] = useState<number|null>(null);
  const [loadingProperty, setLoadingProperty] = useState(false);
  
  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const DRAFT_STORAGE_KEY = 'property_draft';
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Load existing property if ID is provided in query params
  useEffect(() => {
    const loadProperty = async () => {
      if (typeof window === 'undefined') return;
      
      const urlParams = new URLSearchParams(window.location.search);
      const idParam = urlParams.get('id');
      
      if (idParam && !propertyId) {
        const id = parseInt(idParam, 10);
        if (!isNaN(id)) {
          setLoadingProperty(true);
          try {
            const response = await api.get(`/owner/properties/${id}`);
            const property = response.data;
            
            if (property) {
              setPropertyId(property.id);
              
              // Load basic info
              if (property.title) setTitle(property.title);
              if (property.type) setType(property.type);
              if (property.hotelStar) setHotelStar(property.hotelStar);
              if (property.regionId) setRegionId(property.regionId);
              if (property.district) setDistrict(property.district);
              if (property.ward) setWard(property.ward);
              if (property.street) setStreet(property.street);
              if (property.zip) setZip(property.zip);
              if (property.latitude) setLatitude(property.latitude.toString());
              if (property.longitude) setLongitude(property.longitude.toString());
              if (property.description) setDesc(property.description);
              if (property.totalBedrooms) setTotalBedrooms(property.totalBedrooms);
              if (property.totalBathrooms) setTotalBathrooms(property.totalBathrooms);
              if (property.maxGuests) setMaxGuests(property.maxGuests);
              
              // Load photos
              if (property.images && Array.isArray(property.images)) {
                const imageUrls = property.images.map((img: any) => img.url || img).filter(Boolean);
                setPhotos(imageUrls);
              }
              
              // Load rooms
              if (property.roomsSpec) {
                try {
                  const rooms = typeof property.roomsSpec === 'string' 
                    ? JSON.parse(property.roomsSpec) 
                    : property.roomsSpec;
                  if (Array.isArray(rooms)) {
                    setDefinedRooms(rooms);
                  }
                } catch (e) {
                  console.error("Error parsing roomsSpec:", e);
                }
              }
              
              // Load services
              if (property.services) {
                try {
                  const services = typeof property.services === 'string' 
                    ? JSON.parse(property.services) 
                    : property.services;
                  if (services) {
                    setServices({
                      parking: services.parking || "no",
                      parkingPrice: services.parkingPrice || "",
                      breakfastIncluded: services.breakfastIncluded || false,
                      breakfastAvailable: services.breakfastAvailable || false,
                      restaurant: services.restaurant || false,
                      bar: services.bar || false,
                      pool: services.pool || false,
                      sauna: services.sauna || false,
                      laundry: services.laundry || false,
                      roomService: services.roomService || false,
                      security24: services.security24 || false,
                      firstAid: services.firstAid || false,
                      fireExtinguisher: services.fireExtinguisher || false,
                      onSiteShop: services.onSiteShop || false,
                      nearbyMall: services.nearbyMall || false,
                      socialHall: services.socialHall || false,
                      sportsGames: services.sportsGames || false,
                      gym: services.gym || false,
                      distanceHospital: services.distanceHospital || "",
                    });
                  }
                } catch (e) {
                  console.error("Error parsing services:", e);
                }
              }
              
              // Load nearby facilities
              if (property.services) {
                try {
                  const services = typeof property.services === 'string' 
                    ? JSON.parse(property.services) 
                    : property.services;
                  if (services && services.nearbyFacilities && Array.isArray(services.nearbyFacilities)) {
                    setNearbyFacilities(services.nearbyFacilities);
                  }
                } catch (e) {
                  console.error("Error parsing nearbyFacilities:", e);
                }
              }
            }
          } catch (error) {
            console.error("Error loading property:", error);
            alert("Failed to load property. You can still create a new one.");
          } finally {
            setLoadingProperty(false);
          }
        }
      }
    };
    
    loadProperty();
  }, [propertyId]);

  // collapses — only the active step is expanded to keep focus.
  // By default show only the first step; others are hidden until navigated.
  const [showBasics, setShowBasics] = useState(true);
  const [showRooms, setShowRooms] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showTotals, setShowTotals] = useState(false);

  // basics / location
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("");
  const [otherType, setOtherType] = useState<string>("");
  const isHotel = type === "Hotel";
  // default empty so placeholder "Select rating" is shown until user selects
  const [hotelStar, setHotelStar] = useState("");

  // ✅ Region/district now sourced from helper
  const [regionId, setRegionId] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [ward, setWard] = useState<string>("");
  const [wardNotAvailable, setWardNotAvailable] = useState<boolean>(false);
  const [customWard, setCustomWard] = useState<string>("");
  const regionName = useMemo(() => REGION_BY_ID[regionId]?.name ?? "", [regionId]);
  
  // Get districts from REGIONS_FULL_DATA to ensure all regions work consistently
  const districts = useMemo(() => {
    if (!regionId) return [];
    
    // Find the region in full data
    const regionData = REGIONS_FULL_DATA.find((r: any) => {
      const regionSlug = createRegionSlug(r.name);
      return regionSlug === regionId;
    });
    
    if (!regionData || !regionData.districts) {
      return [];
    }
    
    // Return district names
    return regionData.districts.map((d: any) => d.name);
  }, [regionId]);
  
  const wards = useMemo(() => {
    // Get wards from REGIONS_FULL_DATA using actual Tanzania locations database
    if (!regionId || !district) return [];
    
    // Find the region in full data
    const regionData = REGIONS_FULL_DATA.find((r: any) => {
      const regionSlug = createRegionSlug(r.name);
      return regionSlug === regionId;
    });
    
    if (!regionData) {
      return [];
    }
    
    // Find the district using normalized matching
    const districtData = regionData.districts.find((d: any) => 
      normalizeName(d.name) === normalizeName(district)
    );
    
    if (!districtData || !districtData.wards) {
      return [];
    }
    
    // Return ward names
    return districtData.wards.map((w: any) => w.name);
  }, [regionId, district]);

  // Get ward postcode when ward is selected
  const selectedWardPostcode = useMemo(() => {
    if (!regionId || !district || !ward) return null;
    
    // Try to find region - check both slug matching and direct name matching
    let regionData = REGIONS_FULL_DATA.find((r: any) => {
      const regionSlug = createRegionSlug(r.name);
      return regionSlug === regionId;
    });
    
    // Fallback: try direct name match (case-insensitive)
    if (!regionData) {
      regionData = REGIONS_FULL_DATA.find((r: any) => 
        normalizeName(r.name) === normalizeName(regionId) || 
        r.name.toUpperCase() === regionId.toUpperCase()
      );
    }
    
    if (!regionData) {
      return null;
    }
    
    const districtData = regionData.districts.find((d: any) => 
      normalizeName(d.name) === normalizeName(district)
    );
    
    if (!districtData || !districtData.wards) {
      return null;
    }
    
    const wardData = districtData.wards.find((w: any) => 
      normalizeName(w.name) === normalizeName(ward)
    );
    
    if (!wardData) {
      return null;
    }
    
    // Get postcode - prefer postcode field, fallback to code
    // Handle null, undefined, and empty string values
    let postcode = wardData.postcode;
    
    // If postcode is null, undefined, or empty, try the code field
    if (postcode === null || postcode === undefined || postcode === '' || String(postcode).trim() === '') {
      postcode = wardData.code;
    }
    
    // Handle null/undefined/empty code as well
    if (postcode === null || postcode === undefined || postcode === '' || String(postcode).trim() === '') {
      postcode = null;
    }
    
    // Convert to string and validate it's not empty
    const postcodeStr = (postcode !== null && postcode !== undefined && String(postcode).trim() !== '') 
      ? String(postcode).trim() 
      : null;
    
    return postcodeStr;
  }, [regionId, district, ward]);

  // Get streets for the selected ward
  const streets = useMemo(() => {
    if (!regionId || !district || !ward) return [];
    
    const regionData = REGIONS_FULL_DATA.find((r: any) => {
      const regionSlug = createRegionSlug(r.name);
      return regionSlug === regionId;
    });
    
    if (!regionData) return [];
    
    const districtData = regionData.districts.find((d: any) => 
      normalizeName(d.name) === normalizeName(district)
    );
    
    if (!districtData || !districtData.wards) return [];
    
    const wardData = districtData.wards.find((w: any) => 
      normalizeName(w.name) === normalizeName(ward)
    );
    
    return wardData?.streets || [];
  }, [regionId, district, ward]);

  const [street, setStreet] = useState("");
  const [apartment] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationTrackingEnabled, setLocationTrackingEnabled] = useState(false);
  const [freeCancellation, setFreeCancellation] = useState<boolean>(false);
  const [paymentModes, setPaymentModes] = useState<string[]>([]);

  // Auto-fill zip code when ward is selected (if postcode is available)
  // Always update zip when ward changes to ensure it's synced with the selected ward
  useEffect(() => {
    if (selectedWardPostcode) {
      setZip(selectedWardPostcode);
    } else if (ward && !selectedWardPostcode) {
      // Clear zip if ward is selected but has no postcode
      setZip("");
    } else if (!ward) {
      // Clear zip when ward is cleared
      setZip("");
    }
  }, [selectedWardPostcode, ward]);

  // Auto-detect if location is already available
  useEffect(() => {
    if (latitude && longitude) {
      setLocationTrackingEnabled(true);
    }
  }, [latitude, longitude]);

  // Handle location tracking toggle
  const handleLocationToggle = (enabled: boolean) => {
    setLocationTrackingEnabled(enabled);
    
    if (enabled) {
      // Request location when toggled on
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        setLocationTrackingEnabled(false);
        return;
      }
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Ensure correct coordinate order: latitude, longitude
          const lat = parseFloat(position.coords.latitude.toFixed(6));
          const lng = parseFloat(position.coords.longitude.toFixed(6));
          
          setLatitude(lat);
          setLongitude(lng);
          setLocationLoading(false);
        },
        (error) => {
          setLocationLoading(false);
          setLocationTrackingEnabled(false);
          if (error.code === error.PERMISSION_DENIED) {
            alert("Location access denied. Please enable location permissions in your browser settings.");
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            alert("Location information unavailable. Please try again or enter coordinates manually.");
          } else {
            alert("An error occurred while getting your location. Please try again or enter coordinates manually.");
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      // Clear coordinates when toggled off
      setLatitude("");
      setLongitude("");
    }
  };

  // overall counts + description
  const [totalBedrooms, setTotalBedrooms] = useState<number | "">("");
  const [totalBathrooms, setTotalBathrooms] = useState<number | "">("");
  const [maxGuests, setMaxGuests] = useState<number | "">("");
  const [desc, setDesc] = useState("");
  const [acceptGroupBooking, setAcceptGroupBooking] = useState<boolean>(false);

  // property photos (controlled here)
  const [photos, setPhotos] = useState<string[]>([]);
  const [photosSaved, setPhotosSaved] = useState<boolean[]>([]);
  const [photosUploading, setPhotosUploading] = useState<boolean[]>([]);
  const photosRef = useRef<string[]>([]);
  useEffect(()=>{ photosRef.current = photos; }, [photos]);

  // room-type mini form
  const [roomType, setRoomType] = useState("Single");
  const [beds, setBeds] = useState<Record<BedKey, number>>({ twin: 0, full: 0, queen: 0, king: 0 });
  const [roomsCount, setRoomsCount] = useState<number | "">("");
  const [smoking, setSmoking] = useState<"yes"|"no">("yes");
  const [bathPrivate, setBathPrivate] = useState<"yes"|"no">("yes");
  const [bathItems, setBathItems] = useState<string[]>([]);
  const [towelColor, setTowelColor] = useState("");
  const [otherAmenities, setOtherAmenities] = useState<string[]>([]);
  const [otherAmenitiesText, setOtherAmenitiesText] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomImages, setRoomImages] = useState<string[]>([]);
  const [roomImageSaved, setRoomImageSaved] = useState<boolean[]>([]);
  const [roomImageUploading, setRoomImageUploading] = useState<boolean[]>([]);
  const roomImagesRef = useRef<string[]>([]);
  useEffect(()=>{ roomImagesRef.current = roomImages; }, [roomImages]);
  // const roomImageInput = useRef<HTMLInputElement>(null);
  const [pricePerNight, setPricePerNight] = useState<number | "">("");
  const [definedRooms, setDefinedRooms] = useState<RoomEntry[]>([]);

  // services (added nearbyFacilities)
  const [services, setServices] = useState<ServicesState>({
    parking: "no",
    parkingPrice: "",
    breakfastIncluded: false, breakfastAvailable: false,
    restaurant: false, bar: false,
    pool: false, sauna: false,
    laundry: false, roomService: false,
    security24: false, firstAid: false, fireExtinguisher: false,
    onSiteShop: false, nearbyMall: false,
    socialHall: false, sportsGames: false,
    gym: false,
    distanceHospital: "", // legacy; can keep for compatibility
  });
  const [nearbyFacilities, setNearbyFacilities] = useState<NearbyFacility[]>([]);

  // helpers
  const changeBed = (k: BedKey, d: number)=> setBeds(b=>({ ...b, [k]: Math.max(0, (b[k]??0)+d) }));
  const toggleStr = (arr: string[], setArr:(v:string[])=>void, v: string)=> {
    const s = new Set(arr); s.has(v) ? s.delete(v) : s.add(v); setArr(Array.from(s));
  };

  // Inline validation state for Basics
  const [touchedBasics, setTouchedBasics] = useState<Record<string, boolean>>({});
  const [announcement, setAnnouncement] = useState<string>("");
  
  // Auto-save to localStorage (debounced) - defined after all state variables
  const autoSaveDraft = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      try {
        const draftData = {
          title, type, otherType, hotelStar,
          regionId, district, ward, street, city, zip,
          latitude: typeof latitude === 'number' ? latitude : '',
          longitude: typeof longitude === 'number' ? longitude : '',
          desc, totalBedrooms, totalBathrooms, maxGuests,
          photos, definedRooms, services, nearbyFacilities,
          acceptGroupBooking, freeCancellation, paymentModes,
          timestamp: new Date().toISOString(),
        };
        
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
        setAutoSaveStatus('saved');
        
        // Reset status after 2 seconds
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      }
    }, 2000); // Debounce: save 2 seconds after last change
  }, [
    title, type, otherType, hotelStar,
    regionId, district, ward, street, city, zip,
    latitude, longitude, desc, totalBedrooms, totalBathrooms, maxGuests,
    photos, definedRooms, services, nearbyFacilities,
    acceptGroupBooking, freeCancellation, paymentModes,
  ]);
  
  // Trigger auto-save on form changes
  useEffect(() => {
    // Don't auto-save if loading existing property
    if (loadingProperty) return;
    
    // Don't auto-save empty forms
    if (!title && !regionId && photos.length === 0) return;
    
    setAutoSaveStatus('saving');
    autoSaveDraft();
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [autoSaveDraft, loadingProperty, title, regionId, photos.length]);
  
  // Load draft on mount (if no propertyId is being loaded)
  useEffect(() => {
    if (propertyId || loadingProperty) return; // Skip if loading existing property
    
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        const draftAge = new Date().getTime() - new Date(draft.timestamp).getTime();
        const daysOld = draftAge / (1000 * 60 * 60 * 24);
        
        // Only restore if draft is less than 7 days old
        if (daysOld < 7) {
          const shouldRestore = window.confirm(
            `You have a saved draft from ${daysOld < 1 ? 'today' : `${Math.floor(daysOld)} day(s) ago`}. Would you like to restore it?`
          );
          
          if (shouldRestore) {
            if (draft.title) setTitle(draft.title);
            if (draft.type) setType(draft.type);
            if (draft.otherType) setOtherType(draft.otherType);
            if (draft.hotelStar) setHotelStar(draft.hotelStar);
            if (draft.regionId) setRegionId(draft.regionId);
            if (draft.district) setDistrict(draft.district);
            if (draft.ward) setWard(draft.ward);
            if (draft.street) setStreet(draft.street);
            if (draft.city) setCity(draft.city);
            if (draft.zip) setZip(draft.zip);
            if (draft.latitude) setLatitude(typeof draft.latitude === 'number' ? draft.latitude : parseFloat(draft.latitude) || '');
            if (draft.longitude) setLongitude(typeof draft.longitude === 'number' ? draft.longitude : parseFloat(draft.longitude) || '');
            if (draft.desc) setDesc(draft.desc);
            if (draft.totalBedrooms) setTotalBedrooms(draft.totalBedrooms);
            if (draft.totalBathrooms) setTotalBathrooms(draft.totalBathrooms);
            if (draft.maxGuests) setMaxGuests(draft.maxGuests);
            if (draft.photos && Array.isArray(draft.photos)) setPhotos(draft.photos);
            if (draft.definedRooms && Array.isArray(draft.definedRooms)) setDefinedRooms(draft.definedRooms);
            if (draft.services) setServices(draft.services);
            if (draft.nearbyFacilities && Array.isArray(draft.nearbyFacilities)) setNearbyFacilities(draft.nearbyFacilities);
            if (draft.acceptGroupBooking !== undefined) setAcceptGroupBooking(draft.acceptGroupBooking);
            if (draft.freeCancellation !== undefined) setFreeCancellation(draft.freeCancellation);
            if (draft.paymentModes && Array.isArray(draft.paymentModes)) setPaymentModes(draft.paymentModes);
          } else {
            // Clear draft if user doesn't want to restore
            localStorage.removeItem(DRAFT_STORAGE_KEY);
          }
        } else {
          // Clear old drafts
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }, [propertyId, loadingProperty]);
  
  // Clear draft on successful submission
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setAutoSaveStatus('idle');
  }, []);

  const validateBasics = () => {
    const missing: string[] = [];
    if (title.trim().length < 3) missing.push('Property name');
    if (!type) missing.push('Property type');
    if (!regionId) missing.push('Region');
    if (!district) missing.push('District');
    if (!ward) missing.push('Ward');
    if (street.trim().length === 0) missing.push('Street address');
    // Only require zip code if a postcode is available (some regions don't have postcodes in source data)
    // If selectedWardPostcode exists, zip must be filled; otherwise it's optional
    if (selectedWardPostcode && (!zip || zip.trim().length === 0)) {
      missing.push('Zip code');
    }

    if (missing.length) {
      // mark fields as touched so inline errors appear
      const touchedFields: Record<string, boolean> = { title: true, type: true, regionId: true, district: true, ward: true, street: true };
      if (selectedWardPostcode) touchedFields.zip = true;
      setTouchedBasics((t) => ({ ...t, ...touchedFields }));
      setAnnouncement(`Please complete: ${missing.join(', ')}.`);
      return false;
    }
    return true;
  };


  // Stepper refs + progress overlay
  const stepperContainerRef = useRef<HTMLDivElement|null>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const progressHeight = 0;
  const [currentStep, setCurrentStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0])); // Start with step 0 visited
  
  const goToNextStep = () => {
    if (currentStep < 5) {
      if (currentStep === 0) {
        const ok = validateBasics();
        if (!ok) return;
      }
      const nextStep = currentStep + 1;
      setVisitedSteps(prev => new Set([...prev, nextStep]));
      setCurrentStep(nextStep);
      scrollToStep(nextStep);
    }
  };

  const previewNextStep = () => {
    if (currentStep < 5) {
      const nextStep = currentStep + 1;
      setVisitedSteps(prev => new Set([...prev, nextStep]));
      scrollToStep(nextStep, true);
    }
  };
  
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      scrollToStep(prevStep);
    }
  };

  const scrollToStep = (i: number, skipValidation = false) => {
    setCurrentStep(i);
    // Mark step as visited
    setVisitedSteps(prev => new Set([...prev, i]));
    // Prevent navigating away from Basics if required fields are missing unless skipped
    if (i > 0 && !skipValidation) {
      const ok = validateBasics();
      if (!ok) {
        setCurrentStep(0);
        return;
      }
    }
    // Open only the target step
    setShowBasics(i === 0);
    setShowRooms(i === 1);
    setShowServices(i === 2);
    setShowTotals(i === 3);
    setShowPhotos(i === 4);
    setShowReview(i === 5);
    // Announce opened step for screen readers
    const stepNames = ['Basic details','Room & Bathroom','Services','Totals & Description','Property Photos','Review & Submit'];
    setAnnouncement(`Opened ${stepNames[i]}`);

    // small timeout to allow expand animation / layout before scrolling
    setTimeout(() => {
      const el = sectionRefs.current[i];
      if (el && 'scrollIntoView' in el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // Update current step when sections change
  useEffect(() => {
    if (showBasics) setCurrentStep(0);
    else if (showRooms) setCurrentStep(1);
    else if (showServices) setCurrentStep(2);
    else if (showTotals) setCurrentStep(3);
    else if (showPhotos) setCurrentStep(4);
    else if (showReview) setCurrentStep(5);
  }, [showBasics, showRooms, showServices, showTotals, showPhotos, showReview]);

  type CloudinarySig = {
    timestamp: number;
    apiKey: string;
    signature: string;
    folder: string;
    cloudName: string;
  };

  async function uploadToCloudinary(file: File, folder: string) {
    // Use relative path in browser to leverage Next.js rewrites and avoid CORS
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const sig = await axios.get(`/uploads/cloudinary/sign?folder=${encodeURIComponent(folder)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    const fd = new FormData();
    fd.append("file", file);
    const sigData = sig.data as CloudinarySig;
    fd.append("timestamp", String(sigData.timestamp));
    fd.append("api_key", sigData.apiKey);
    fd.append("signature", sigData.signature);
    fd.append("folder", sigData.folder);
    const resp = await axios.post(`https://api.cloudinary.com/v1_1/${sigData.cloudName}/auto/upload`, fd);
    return (resp.data as { secure_url: string }).secure_url;
  }

  const pickPropertyPhotos = async (files: FileList | null) => {
    if (!files) return;
    const chosen = Array.from(files).slice(0, 10);
    const localBlobs = chosen.map(f => URL.createObjectURL(f));
    setPhotos(prev => [...prev, ...localBlobs]);
    setPhotosSaved(prev => [...prev, ...Array(localBlobs.length).fill(false)]);
    setPhotosUploading(prev => [...prev, ...Array(localBlobs.length).fill(true)]);

    chosen.forEach((file, i) => {
      const blobUrl = localBlobs[i];
      uploadToCloudinary(file, "properties").then(url => {
        setPhotos(prev => {
          const idx = prev.indexOf(blobUrl);
          if (idx === -1) return prev;
          const copy = [...prev];
          copy[idx] = url;
          return copy;
        });
        setPhotosUploading(prev => {
          const idxNow = photosRef.current.indexOf(blobUrl);
          if (idxNow === -1) return prev;
          const copy = [...prev];
          copy[idxNow] = false;
          return copy;
        });
      }).catch(err => {
        console.error("Property photo upload failed", err);
      }).finally(() => {
        try { URL.revokeObjectURL(blobUrl); } catch {}
      });
    });
  };

  const onPickRoomImages = async (files: FileList | null) => {
    if (!files) return;
    const chosen = Array.from(files).slice(0, 6);
    const localBlobs = chosen.map(f => URL.createObjectURL(f));
    setRoomImages(prev => [...prev, ...localBlobs]);
    setRoomImageSaved(prev => [...prev, ...Array(localBlobs.length).fill(false)]);
    setRoomImageUploading(prev => [...prev, ...Array(localBlobs.length).fill(true)]);

    chosen.forEach((file, i) => {
      const blobUrl = localBlobs[i];
      uploadToCloudinary(file, "properties/rooms").then(url => {
        setRoomImages(prev => {
          const idx = prev.indexOf(blobUrl);
          if (idx === -1) return prev;
          const copy = [...prev];
          copy[idx] = url;
          return copy;
        });
        setRoomImageUploading(prev => {
          const idxNow = roomImagesRef.current.indexOf(blobUrl);
          if (idxNow === -1) return prev;
          const copy = [...prev];
          copy[idxNow] = false;
          return copy;
        });
      }).catch(err => {
        console.error("Room image upload failed", err);
      }).finally(() => {
        try { URL.revokeObjectURL(blobUrl); } catch {}
      });
    });
  };

  const addRoomType = () => {
    const errs: string[] = [];
    if (!roomsCount || Number(roomsCount) <= 0) errs.push("Rooms count is required.");
    if (roomImages.length === 0) errs.push("At least one room image is required.");
    if (errs.length) { alert(errs.join("\n")); return; }

    const entry: RoomEntry = {
      roomType, beds, roomsCount: Number(roomsCount),
      smoking, bathPrivate, bathItems, towelColor,
      otherAmenities: Array.from(new Set([...otherAmenities, ...splitComma(otherAmenitiesText)])),
      roomDescription, roomImages, pricePerNight: Number(pricePerNight || 0)
    };
    setDefinedRooms(list => [...list, entry]);

    // reset mini
    setBeds({ twin:0, full:0, queen:0, king:0 });
    setRoomsCount(""); setSmoking("yes"); setBathPrivate("yes");
    setBathItems([]); setTowelColor(""); setOtherAmenities([]);
    setOtherAmenitiesText(""); setRoomDescription(""); setRoomImages([]);
    setPricePerNight("");
  };

  const payload = () => {
    // Map hotelStar string values to numbers for backend validation
    const hotelStarMap: Record<string, number | null> = {
      "": null,
      "basic": 1,
      "simple": 2,
      "moderate": 3,
      "high": 4,
      "luxury": 5,
    };
    
    // Send regionId - prefer numeric code if available, otherwise use slug (string)
    // Database stores regionId as VARCHAR(50), so both formats work
    const regionData = REGION_BY_ID[regionId];
    const regionCode = regionData?.code ? Number(regionData.code) : undefined;
    
    return {
      title,
      type: toServerType(type),
      description: desc || null,
      // location - send numeric code if available (for regions with codes), otherwise send slug
      ...(regionId ? { regionId: regionCode || regionId } : {}),
      regionName: regionName || undefined,
      district: district || undefined,
      ward: ward || null,
      street: street || null,
      apartment: apartment || null,
      city: city || undefined,
      zip: zip || undefined,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,

      photos,

      // hotelStar must be a number (1-5) or null, not a string
      hotelStar: isHotel && hotelStar && hotelStar !== "" ? (hotelStarMap[hotelStar] ?? null) : null,

      roomsSpec: definedRooms,

      totalBedrooms: numOrNull(totalBedrooms),
      totalBathrooms: numOrNull(totalBathrooms),
      maxGuests: numOrNull(maxGuests),

      // Backend expects services as JSON: can be array of strings OR object with nearbyFacilities
      // Send as object to preserve full nearbyFacilities data (name, distance, etc.) AND all service properties
      services: (() => {
        const servicesObj: any = {
          // Include all service properties so they can be displayed in admin view
          // Only include properties that have been explicitly set (not default/empty values)
          ...(services.parking && services.parking !== 'no' ? { parking: services.parking } : {}),
          ...(services.parking === 'paid' && services.parkingPrice ? { parkingPrice: services.parkingPrice } : {}),
          ...(services.breakfastIncluded ? { breakfastIncluded: true } : {}),
          ...(services.breakfastAvailable ? { breakfastAvailable: true } : {}),
          ...(services.restaurant ? { restaurant: true } : {}),
          ...(services.bar ? { bar: true } : {}),
          ...(services.pool ? { pool: true } : {}),
          ...(services.sauna ? { sauna: true } : {}),
          ...(services.laundry ? { laundry: true } : {}),
          ...(services.roomService ? { roomService: true } : {}),
          ...(services.security24 ? { security24: true } : {}),
          ...(services.firstAid ? { firstAid: true } : {}),
          ...(services.fireExtinguisher ? { fireExtinguisher: true } : {}),
          ...(services.onSiteShop ? { onSiteShop: true } : {}),
          ...(services.nearbyMall ? { nearbyMall: true } : {}),
          ...(services.socialHall ? { socialHall: true } : {}),
          ...(services.sportsGames ? { sportsGames: true } : {}),
          ...(services.gym ? { gym: true } : {}),
          // Service tags array for filtering/searching
          tags: Array.from(
            new Set<string>([
              ...servicesToArray(services),
              ...nearbyFacilitiesToServiceTags(nearbyFacilities),
              ...(freeCancellation ? ["Free cancellation"] : []),
              ...(acceptGroupBooking ? ["Group stay"] : []),
              ...paymentModes.map((m) => `Payment: ${m}`),
            ])
          ),
        };
        
        // Full nearbyFacilities array with all details (name, distance, type, etc.)
        if (nearbyFacilities.length > 0) {
          servicesObj.nearbyFacilities = nearbyFacilities;
        }
        
        return servicesObj;
      })(),

      basePrice: inferBasePrice(definedRooms),
      currency: "TZS",
    };
    
    // Debug logging for basePrice
    console.log('[payload] basePrice calculation:', {
      definedRoomsCount: definedRooms.length,
      definedRooms: definedRooms.map((r: any) => ({ 
        roomType: r.roomType, 
        pricePerNight: r.pricePerNight,
        price: r.price 
      })),
      calculatedBasePrice: inferBasePrice(definedRooms),
      finalPayloadBasePrice: inferBasePrice(definedRooms)
    });
  };

  function nearbyFacilitiesToServiceTags(list: NearbyFacility[]): string[] {
    const map: Record<string, string> = {
      Hospital: "Near hospital",
      Pharmacy: "Near pharmacy",
      Polyclinic: "Near polyclinic",
      Clinic: "Near clinic",
      "Police station": "Near police station",
      Airport: "Near airport",
      "Bus station": "Near bus station",
      "Petrol station": "Near petrol station",
      "Main road": "Near main road",
    };
    const tags = new Set<string>();
    for (const f of list || []) {
      const t = map[String((f as any)?.type || "")];
      if (t) tags.add(t);
    }
    return Array.from(tags);
  }

  function servicesToArray(s: ServicesState): string[] {
    const out: string[] = [];
    if (s.parking === "free") out.push("Free parking");
    if (s.parking === "paid") out.push(`Paid parking (${numOrEmpty(s.parkingPrice)} TZS)`);
    if (s.breakfastIncluded) out.push("Breakfast included");
    if (s.breakfastAvailable) out.push("Breakfast available");
    if (s.restaurant) out.push("Restaurant");
    if (s.bar) out.push("Bar");
    if (s.pool) out.push("Pool");
    if (s.sauna) out.push("Sauna");
    if (s.laundry) out.push("Laundry");
    if (s.roomService) out.push("Room service");
    if (s.security24) out.push("24h security");
    if (s.firstAid) out.push("First aid");
    if (s.fireExtinguisher) out.push("Fire extinguisher");
    if (s.onSiteShop) out.push("On-site shop");
    if (s.nearbyMall) out.push("Nearby mall");
    if (s.socialHall) out.push("Social hall");
    if (s.sportsGames) out.push("Sports & games");
    if (s.gym) out.push("Gym");
    if (numOrEmpty(s.distanceHospital)) {
      out.push("Near hospital");
      out.push(`Hospital distance ${numOrEmpty(s.distanceHospital)} km`);
    }
    return out.filter(Boolean);
  }

  const completeEnough =
    title.trim().length >= 3 &&
    !!regionId &&
    !!district &&
    photos.length >= 3 &&
    definedRooms.length >= 1 &&
    // if this is a Hotel, ensure a star rating was chosen
    (!isHotel || (typeof hotelStar === "string" && hotelStar !== ""));

  async function saveDraft() {
    try {
      const body = payload();
      if (!propertyId) {
  const r = await api.post("/owner/properties", body);
  setPropertyId((r.data as { id: number }).id);
        alert("Draft created.");
        // After creating, take user to Pending view (shows drafts too)
        window.location.href = "/owner/properties/pending";
      } else {
        await api.put(`/owner/properties/${propertyId}`, body);
        alert("Draft saved.");
        // After saving, take user to Pending view (shows drafts too)
        window.location.href = "/owner/properties/pending";
      }
    } catch (e:any) {
      alert(e?.response?.data?.error ? JSON.stringify(e.response.data.error) : "Save failed");
    }
  }

  async function submitForReview() {
    if (!completeEnough) {
      const missing = [
        !(title.trim().length >= 3) ? "name" : null,
        !regionId ? "location" : null,
        !(photos.length >= 3) ? "≥3 photos" : null,
        !(definedRooms.length >= 1) ? "≥1 room type" : null,
        (isHotel && (!hotelStar || hotelStar === "")) ? "hotel star rating" : null,
      ].filter(Boolean);
      alert("Please complete: " + missing.join(", ") + ".");
      return;
    }
    try {
      const confirmed = window.confirm("Are you sure you're submitting this for review? You won't be able to edit while it's pending.");
      if (!confirmed) return;
      if (!propertyId) {
  const r = await api.post("/owner/properties", payload());
  setPropertyId((r.data as { id: number }).id);
      } else {
        await api.put(`/owner/properties/${propertyId}`, payload());
      }
      const id = propertyId ?? (await refetchLatestId());
      const resp = await api.post(`/owner/properties/${id}/submit`);
      // Accept 200 OK with body or 204 No Content
      if (resp.status === 200 || resp.status === 204) {
        clearDraft(); // Clear draft on successful submission
        alert("Submitted for review!");
        // Navigate to Pending list to reflect status change
        window.location.href = "/owner/properties/pending";
      } else {
        alert("Unexpected response: " + resp.status);
      }
    } catch (e:any) {
      alert(e?.response?.data?.error || "Submit failed");
    }
  }

  async function refetchLatestId(): Promise<number | undefined> {
    const r = await api.get("/owner/properties/mine", { params: { status: "DRAFT", pageSize: 1 } });
    const items = (r.data as any)?.items;
    return Array.isArray(items) ? items[0]?.id : undefined;
  }

  /* UI below */

  if (loadingProperty) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center">
        <div className="dot-spinner mb-4">
          <span className="dot dot-blue" />
          <span className="dot dot-black" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <h2 className="text-xl font-semibold text-gray-800">Loading property...</h2>
        <p className="text-sm text-gray-600 mt-2">Please wait while we load your property details.</p>
      </div>
    );
  }

  return (
    <div id="addPropertyView" className="w-full py-6 sm:py-8">
      <style dangerouslySetInnerHTML={{__html: `
        #addPropertyView {
          overflow-x: hidden !important;
        }
        #addPropertyView select {
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
          background-image: none !important;
        }
        #addPropertyView select::-ms-expand {
          display: none !important;
        }
        /* Small screens - prevent overflow */
        @media (max-width: 767px) {
          #addPropertyView {
            padding-left: 0.5rem !important;
            padding-right: 0.5rem !important;
          }
          #addPropertyView > div {
            padding-left: 0.75rem !important;
            padding-right: 0.75rem !important;
          }
          #addPropertyView input[type="text"],
          #addPropertyView input[type="number"] {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          /* Other type input - ensure it's constrained on mobile */
          @media (max-width: 767px) {
            #addPropertyView input[placeholder="Please specify"] {
              max-width: 100% !important;
              width: 100% !important;
              box-sizing: border-box !important;
            }
          }
          #addPropertyView .grid[class*="grid-cols"]:not([role="radiogroup"]) {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          /* Property type grid - ensure 2 columns on small screens */
          #addPropertyView [role="radiogroup"] {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 0.5rem !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          #addPropertyView .grid[class*="grid-cols"]:not([role="radiogroup"]) > div {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          #addPropertyView [role="radiogroup"] > label {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          #addPropertyView .grid[class*="grid-cols"]:not([role="radiogroup"]) > div > input,
          #addPropertyView .grid[class*="grid-cols"]:not([role="radiogroup"]) > div > div > select,
          #addPropertyView .grid[class*="grid-cols"]:not([role="radiogroup"]) > div > div > input {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
        }
        /* Large screens - uniform columns */
        @media (min-width: 768px) {
          #addPropertyView .grid[class*="grid-cols"] {
            display: grid !important;
          }
          #addPropertyView .grid[class*="grid-cols"][class*="md:grid-cols-3"] {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          #addPropertyView .grid[class*="grid-cols"][class*="md:grid-cols-4"] {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
          #addPropertyView .grid[class*="grid-cols"] > div {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            flex-shrink: 0 !important;
          }
          #addPropertyView .grid[class*="grid-cols"] > div > input,
          #addPropertyView .grid[class*="grid-cols"] > div > div > select,
          #addPropertyView .grid[class*="grid-cols"] > div > div > input {
            width: 100% !important;
            box-sizing: border-box !important;
          }
        }
      `}} />
      {/* Live region for screen reader announcements about step changes and validation */}
      <div aria-live="polite" className="sr-only" role="status">{announcement}</div>
      <div className="bg-white rounded shadow-md p-4 sm:p-6 border-l-4 border-emerald-500 overflow-hidden w-full max-w-full box-border">
  <div className="w-full relative" ref={stepperContainerRef} data-progress={progressHeight}>
        {/* header constrained so it doesn't stretch full width */}
        <div className="mb-4 text-center max-w-3xl mx-auto bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
              <Plus className="h-4 w-4" />
              <span>New Listing</span>
            </div>
            <div className="flex items-center justify-between w-full gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex-1">Add New Property</h1>
              {/* Auto-save status & Live Preview */}
              <div className="flex items-center gap-3">
                {/* Auto-save status indicator */}
                {autoSaveStatus !== 'idle' && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                    autoSaveStatus === 'saving' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    autoSaveStatus === 'saved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {autoSaveStatus === 'saving' && (
                      <>
                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    )}
                    {autoSaveStatus === 'saved' && (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Saved</span>
                      </>
                    )}
                    {autoSaveStatus === 'error' && (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Save failed</span>
                      </>
                    )}
                  </div>
                )}
                {/* Live Preview Button */}
                {title.trim().length >= 3 && (
                  <button
                    type="button"
                    onClick={() => setShowLivePreview(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#02665e] text-white text-sm font-semibold hover:bg-[#014e47] transition-colors shadow-sm hover:shadow"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">Live Preview</span>
                    <span className="sm:hidden">Preview</span>
                  </button>
                )}
              </div>
            </div>
            <span className="inline-block w-24 h-1 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 shadow-sm" />
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-2xl">
              Share clear, accurate details and include at least <span className="font-semibold text-emerald-600">5 high-quality photos</span> covering the exterior, living area, bedroom, bathroom, and kitchen. This helps us review and publish your property faster.
          </p>
            <p className="text-xs sm:text-sm text-emerald-700 font-medium">Step 1 of 6 · Basic details</p>
          </div>
          
          {/* Mobile horizontal stepper */}
          <nav className="owner-steps-container mt-6 mb-2 md:hidden" aria-label="Property creation steps">
            <div className="owner-steps-wrapper" />
          </nav>
        </div>

        <div className="md:grid md:grid-cols-12 gap-2 md:gap-3 mt-8 relative">
          {/* Vertical step navigation on the left */}
          <aside className="md:col-span-1 hidden md:block relative">
            <nav className="owner-steps-container-vertical sticky top-6" aria-label="Property creation steps">
              <div className="owner-steps-wrapper-vertical">
                {(() => {
                  const steps = [
                    { index: 0, label: "Details", completed: title.trim().length >= 3 && !!regionId && !!district },
                    { index: 1, label: "Rooms", completed: definedRooms.length >= 1 },
                    { index: 2, label: "Services", completed: false },
                    { index: 3, label: "Totals", completed: false },
                    { index: 4, label: "Photos", completed: photos.length >= 3 },
                    { index: 5, label: "Review", completed: false },
                  ];
                  const stepNames = ['Basic details','Room & Bathroom','Services','Totals & Description','Property Photos','Review & Submit'];
                  
                  // Filter to only show visited steps
                  const visibleSteps = steps.filter(step => visitedSteps.has(step.index));
                  
                  return visibleSteps.map((step, idx) => {
                    const isActive = currentStep === step.index;
                    const isCompleted = step.completed && currentStep > step.index;
                    const isPast = currentStep > step.index;
                    const connectorCompleted = isPast || (isActive && step.completed);
                    const isLastVisible = idx === visibleSteps.length - 1;
                    const nextStepIndex = visibleSteps[idx + 1]?.index;
                    const shouldShowConnector = !isLastVisible && nextStepIndex !== undefined && nextStepIndex === step.index + 1;
                    
                    return (
                      <div key={step.index} className="owner-step-item-vertical">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => scrollToStep(step.index)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToStep(step.index); } }}
                          className={`owner-step-button-vertical ${isActive ? 'owner-step-button-vertical--active' : ''} ${isCompleted ? 'owner-step-button-vertical--completed' : ''} ${isPast ? 'owner-step-button-vertical--past' : ''}`}
                          aria-label={`Go to ${stepNames[step.index]}`}
                          aria-current={isActive ? 'step' : undefined}
                          title={step.label}
                        >
                          <div className="owner-step-circle-vertical">
                            {isCompleted ? (
                              <svg className="owner-step-checkmark-vertical" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M16.7071 5.29289C17.0976 5.68342 17.0976 6.31658 16.7071 6.70711L8.70711 14.7071C8.31658 15.0976 7.68342 15.0976 7.29289 14.7071L3.29289 10.7071C2.90237 10.3166 2.90237 9.68342 3.29289 9.29289C3.68342 8.90237 4.31658 8.90237 4.70711 9.29289L8 12.5858L15.2929 5.29289C15.6834 4.90237 16.3166 4.90237 16.7071 5.29289Z" fill="currentColor"/>
                              </svg>
                            ) : (
                              <span className="owner-step-number-vertical">{step.index + 1}</span>
                            )}
                          </div>
                        </div>
                        {shouldShowConnector && (
                          <div className={`owner-step-connector-vertical ${connectorCompleted ? 'owner-step-connector-vertical--completed' : ''} ${isActive ? 'owner-step-connector-vertical--active' : ''}`}>
                            <div className="owner-step-connector-line-vertical"></div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </nav>
          </aside>

          {/* Content area on the right */}
          <main className="md:col-span-11 relative">
            <div className="relative w-full">
        {/* BASICS */}
        <section
          ref={el => { sectionRefs.current[0] = el }}
          className={`bg-white rounded pl-3 pr-3 sm:pr-4 py-4 border-l-4 border-primary-600 ${showBasics ? 'block' : 'hidden'}`}
        >
          {showBasics && (
            <div id="propertyBasicsInner" className="w-full">
              <div className="space-y-6 w-full">
                <div className="w-full max-w-lg sm:max-w-xl">
                  <div className="flex flex-col space-y-2">
                    <label htmlFor="propertyName" className="block text-sm font-medium text-gray-700">
                      Property Name <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-500">Keep it short and clear, e.g., “Cozy 2BR in City Center”.</p>
                    <input
                      id="propertyName"
                      aria-describedby={touchedBasics.title && title.trim().length < 3 ? 'nameError' : undefined}
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      onBlur={() => setTouchedBasics(t => ({ ...t, title: true }))}
                      type="text"
                      placeholder="Enter property name"
                      className={`w-full h-12 px-4 text-sm rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
                        touchedBasics.title && title.trim().length < 3 
                          ? 'border-2 border-red-400 bg-red-50 text-gray-900 focus:ring-red-200 focus:border-red-500' 
                          : 'border border-gray-300 bg-white text-gray-900 placeholder-gray-400 hover:border-gray-400 focus:ring-emerald-500/20 focus:border-emerald-500'
                      }`}
                      aria-required={true}
                    />
                  {touchedBasics.title && title.trim().length < 3 && (
                      <p id="nameError" className="text-xs text-red-600 mt-0.5">Please enter at least 3 characters</p>
                    )}
                    </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-4" id="propertyTypeLabel">
                    Select type of your Property <span className="text-red-500">*</span>
                  </label>

                  <div
                    role="radiogroup"
                    aria-labelledby="propertyTypeLabel"
                    className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full"
                  >
                      {PROPERTY_TYPES.map((pt) => {
                        const selected = type === pt;
                        const labelText = pt === 'Other' ? 'Specify if none of the above' : `Typical ${pt.toLowerCase()}`;
                        const IconComponent = PROPERTY_TYPE_ICONS[pt] || HelpCircle;
                        const styles = PROPERTY_TYPE_STYLES[pt] || PROPERTY_TYPE_STYLES["Other"];
                        
                        return (
                          <label
                            key={pt}
                          className={`group relative flex flex-col items-center text-center gap-2.5 p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                              selected 
                              ? `${styles.border} bg-white shadow-md ${styles.leftBorder}` 
                              : `border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm`
                            }`}
                          >
                              <input
                                type="radio"
                                name="propertyType"
                                value={pt}
                                checked={selected}
                                onChange={() => { 
                                  setType(pt); 
                                  setTouchedBasics(t => ({ ...t, type: true })); 
                                }}
                            className="sr-only"
                              />
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 ${
                            selected 
                              ? styles.bg.replace('from-white to-', 'bg-gradient-to-br from-').replace('-50', '-50/80 to-white')
                              : 'bg-gray-50 group-hover:bg-gray-100'
                          }`}>
                              <IconComponent 
                              className={`w-6 h-6 transition-colors duration-200 ${
                                  selected 
                                  ? styles.text
                                  : 'text-gray-400 group-hover:text-gray-600'
                                }`}
                              />
                          </div>
                          <div className="w-full">
                            <div className={`font-semibold text-sm mb-0.5 transition-colors ${
                                  selected ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'
                                }`}>{pt}</div>
                            <div className={`text-xs transition-colors line-clamp-2 ${
                              selected 
                                ? 'text-gray-500' 
                                : 'text-gray-400 group-hover:text-gray-500'
                            }`}>{labelText}</div>
                              </div>
                          {selected && (
                            <div className={`absolute top-2 right-2 w-5 h-5 rounded-full ${styles.border.replace('border-', 'bg-')} flex items-center justify-center shadow-sm`}>
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          </label>
                        );
                      })}
                    </div>

                    {touchedBasics.type && !type && (
                      <div id="typeError" className="text-xs text-red-600 mt-2">Please select a property type.</div>
                    )}

                    {type === 'Other' && (
                      <div className="mt-3 w-full max-w-xs sm:max-w-sm box-border">
                        <input 
                          value={otherType} 
                          onChange={e => setOtherType(e.target.value)} 
                          className="w-full h-11 px-3 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-lg shadow-sm transition-all duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 box-border" 
                          placeholder="Please specify" 
                        />
                      </div>
                    )}

                    {type === 'Hotel' && (
                      <div className="mt-4 flex flex-col space-y-2 w-full max-w-xs sm:max-w-sm">
                        <label htmlFor="hotelStarRating" className="text-sm font-medium text-gray-800">
                          Hotel Star Rating <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            id="hotelStarRating"
                            title="Hotel Star Rating"
                            aria-required={true}
                            value={hotelStar}
                            onChange={e => setHotelStar(e.target.value)}
                            className="w-full h-12 pl-4 pr-10 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm transition-all duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none cursor-pointer"
                          >
                            {HOTEL_STAR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    )}
                </div>

                {/* Property Location Section */}
                <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-hidden">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-gray-900">Where is your property located? <span className="text-red-500">*</span></h2>
                    <p className="text-sm text-gray-500">Provide the location details for your property</p>
                  </div>

                  {/* Region, District, Ward - Uniform Grid Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Region */}
                    <div className="flex flex-col space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Region <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          title="Region"
                          value={regionId}
                          onChange={e => { setRegionId(e.target.value); setDistrict(''); setWard(''); }}
                          style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                          className="w-full h-12 pl-4 pr-10 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm transition-all duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                          aria-required={true}
                        >
                          <option value="">Select region</option>
                          {REGIONS.map((r: { id: string; name: string }) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 z-10">
                          <ChevronDown className="h-5 w-5" />
                        </div>
                      </div>
                    </div>

                    {/* District */}
                    <div className="flex flex-col space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        District <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          title="District"
                          value={district}
                          onChange={e => { setDistrict(e.target.value); setWard(''); setStreet(''); setZip(''); }}
                          onBlur={() => setTouchedBasics(t => ({ ...t, district: true }))}
                          disabled={!regionId}
                          style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                          className={`w-full h-12 pl-4 pr-10 text-sm rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 cursor-pointer ${
                            touchedBasics.district && !district 
                              ? 'border-2 border-red-400 bg-red-50 text-gray-900 focus:ring-red-200 focus:border-red-500' 
                              : !regionId
                              ? 'border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                              : 'border border-gray-300 bg-white text-gray-900 hover:border-gray-400 focus:ring-emerald-500/20 focus:border-emerald-500'
                          }`}
                          aria-required={true}
                          aria-describedby={touchedBasics.district && !district ? 'districtError' : undefined}
                        >
                          <option value="">{regionId ? 'Select district' : 'Select region first'}</option>
                          {districts.map((d: string) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 ${!regionId ? 'text-gray-300' : 'text-gray-400'}`}>
                          <ChevronDown className="h-5 w-5" />
                        </div>
                      </div>
                      {touchedBasics.district && !district && (
                        <p id="districtError" className="text-xs text-red-600 mt-0.5">Please select a district</p>
                      )}
                    </div>

                    {/* Ward */}
                    <div className="flex flex-col space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Ward <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                            <select
                              title="Ward"
                              value={ward}
                          onChange={e => { setWard(e.target.value); setStreet(''); setZip(''); }}
                              onBlur={() => setTouchedBasics(t => ({ ...t, ward: true }))}
                              disabled={!district}
                          style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                          className={`w-full h-12 pl-4 pr-10 text-sm rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 cursor-pointer ${
                            touchedBasics.ward && !ward
                              ? 'border-2 border-red-400 bg-red-50 text-gray-900 focus:ring-red-200 focus:border-red-500' 
                                  : !district
                                  ? 'border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                              : 'border border-gray-300 bg-white text-gray-900 hover:border-gray-400 focus:ring-emerald-500/20 focus:border-emerald-500'
                              }`}
                              aria-required={true}
                          aria-describedby={touchedBasics.ward && !ward ? 'wardError' : undefined}
                            >
                              <option value="">{district ? 'Select ward' : 'Select district first'}</option>
                              {wards.map((w: string) => (
                                <option key={w} value={w}>{w}</option>
                              ))}
                            </select>
                        <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 ${!district ? 'text-gray-300' : 'text-gray-400'}`}>
                          <ChevronDown className="h-5 w-5" />
                            </div>
                          </div>
                      {touchedBasics.ward && !ward && (
                        <p id="wardError" className="text-xs text-red-600 mt-0.5">Please select a ward</p>
                      )}
                    </div>
                  </div>

                  {/* Street Address, City, Zip Code - Uniform Grid Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col space-y-2">
                      <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700">
                        Street Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="streetAddress"
                          title="Street"
                          value={street}
                          onChange={e => setStreet(e.target.value)}
                          onBlur={() => setTouchedBasics(t => ({ ...t, street: true }))}
                          disabled={!ward}
                          style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                          className={`w-full h-12 pl-4 pr-10 text-sm rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 cursor-pointer ${
                            touchedBasics.street && !street
                              ? 'border-2 border-red-400 bg-red-50 text-gray-900 focus:ring-red-200 focus:border-red-500' 
                              : !ward
                              ? 'border border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                              : 'border border-gray-300 bg-white text-gray-900 hover:border-gray-400 focus:ring-emerald-500/20 focus:border-emerald-500'
                          }`}
                          aria-required={true}
                          aria-describedby={touchedBasics.street && !street ? 'streetError' : undefined}
                        >
                          <option value="">{ward ? 'Select street' : 'Select ward first'}</option>
                          {streets.map((s: string) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 ${!ward ? 'text-gray-300' : 'text-gray-400'}`}>
                          <ChevronDown className="h-5 w-5" />
                        </div>
                      </div>
                      {touchedBasics.street && !street && (
                        <p id="streetError" className="text-xs text-red-600 mt-0.5">Please select a street</p>
                      )}
                      </div>
                    <div className="flex flex-col space-y-2">
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                        City <span className="text-xs text-gray-400 font-normal">(optional)</span>
                      </label>
                        <input
                          id="city"
                          type="text"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                        className="w-full h-12 px-4 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-lg shadow-sm transition-all duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        placeholder="City"
                        />
                      </div>
                    <div className="flex flex-col space-y-2">
                      <label htmlFor="zip" className="block text-sm font-medium text-gray-700">
                        Zip Code {selectedWardPostcode ? <span className="text-red-500">*</span> : <span className="text-xs text-gray-400 font-normal">(optional)</span>}
                      </label>
                        <input
                          id="zip"
                          type="text"
                          value={zip}
                          onChange={e => setZip(e.target.value)}
                          onBlur={() => setTouchedBasics(t => ({ ...t, zip: true }))}
                          readOnly={!!selectedWardPostcode}
                          className={`w-full h-12 px-4 text-sm rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
                            touchedBasics.zip && selectedWardPostcode && (!zip || zip.trim().length === 0)
                              ? 'border-2 border-red-400 bg-red-50 text-gray-900 focus:ring-red-200 focus:border-red-500' 
                              : selectedWardPostcode
                              ? 'border border-gray-300 bg-gray-50 text-gray-700 cursor-not-allowed'
                              : 'border border-gray-300 bg-white text-gray-900 placeholder-gray-400 hover:border-gray-400 focus:ring-emerald-500/20 focus:border-emerald-500'
                          }`}
                          placeholder={selectedWardPostcode ? "Auto-filled from ward" : "Zip code (enter manually if not auto-filled)"}
                          aria-required={!!selectedWardPostcode}
                          aria-describedby={touchedBasics.zip && selectedWardPostcode && (!zip || zip.trim().length === 0) ? 'zipError' : undefined}
                        />
                      {touchedBasics.zip && selectedWardPostcode && (!zip || zip.trim().length === 0) && (
                        <p id="zipError" className="text-xs text-red-600 mt-0.5">Zip code is required</p>
                      )}
                      {selectedWardPostcode && zip && (
                        <p className="text-xs text-emerald-600 mt-0.5">Auto-filled from selected ward</p>
                      )}
                      {!selectedWardPostcode && ward && (
                        <p className="text-xs text-amber-600 mt-0.5">Postcode not available for this ward - please enter manually</p>
                      )}
                      </div>
                    </div>
                  </div>

                  {/* Latitude and Longitude */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col space-y-2">
                      <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">
                        Latitude <span className="text-xs text-gray-400 font-normal">(optional)</span>
                      </label>
                      <input
                        id="latitude"
                        type="number"
                        step="any"
                        value={latitude}
                        onChange={e => setLatitude(e.target.value ? parseFloat(e.target.value) : "")}
                        className="w-full h-12 px-4 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-lg shadow-sm transition-all duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        placeholder="Auto-detected from location"
                      />
                    </div>
                    <div className="flex flex-col space-y-2">
                      <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">
                        Longitude <span className="text-xs text-gray-400 font-normal">(optional)</span>
                      </label>
                      <input
                        id="longitude"
                        type="number"
                        step="any"
                        value={longitude}
                        onChange={e => setLongitude(e.target.value ? parseFloat(e.target.value) : "")}
                        className="w-full h-12 px-4 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-lg shadow-sm transition-all duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        placeholder="Auto-detected from location"
                      />
                    </div>
                  </div>

                  {/* Location Tracking Toggle Switch */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`absolute inset-0 rounded-full ${locationTrackingEnabled ? 'bg-[#02665e]/10 animate-ping' : ''}`} style={{ animationDuration: '3s', animationIterationCount: 'infinite' }} />
                          <div className={`relative p-1.5 rounded-full transition-colors duration-200 ${locationTrackingEnabled ? 'bg-[#02665e]/5' : 'bg-gray-100'}`}>
                            {locationLoading ? (
                              <div className="w-4 h-4 border-2 border-[#02665e]/30 border-t-[#02665e] rounded-full animate-spin" />
                            ) : (
                              <MapPin
                                className={`w-4 h-4 transition-colors duration-200 ${
                                  locationTrackingEnabled
                                    ? 'text-[#02665e]'
                                    : 'text-gray-400'
                                }`}
                                strokeWidth={2}
                              />
                            )}
                          </div>
                        </div>
                        <div>
                          <label htmlFor="locationToggle" className="text-sm font-medium text-gray-900 cursor-pointer transition-colors hover:text-[#02665e]">
                            Enable location tracking
                          </label>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Automatically detect your current location using GPS
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        id="locationToggle"
                        role="switch"
                        aria-checked={locationTrackingEnabled}
                        onClick={() => handleLocationToggle(!locationTrackingEnabled)}
                        disabled={locationLoading}
                        className={`
                          relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
                          ${locationTrackingEnabled ? 'bg-[#02665e]' : 'bg-gray-300 hover:bg-gray-400'}
                        `}
                      >
                        <span
                          className={`
                            inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out
                            ${locationTrackingEnabled ? 'translate-x-6' : 'translate-x-1'}
                            ${locationLoading ? 'opacity-70' : ''}
                          `}
                        >
                          {locationLoading && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-2.5 h-2.5 border-2 border-[#02665e]/30 border-t-[#02665e] rounded-full animate-spin" />
                            </div>
                          )}
                        </span>
                      </button>
                    </div>
                    {locationTrackingEnabled && latitude && longitude && (
                      <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Location detected: {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
                      </p>
                    )}
                  </div>
                  
                  {/* Map Display - Shows exact location using latitude, longitude, and postcode */}
                  {latitude && longitude && (
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Location Map
                        <span className="text-xs text-gray-500 font-normal ml-2">
                          (Exact coordinates: {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)})
                        </span>
                      </label>
                      <PropertyLocationMap 
                        latitude={Number(latitude) || 0} 
                        longitude={Number(longitude) || 0}
                        postcode={zip || selectedWardPostcode || null}
                        onLocationDetected={(lat, lng) => {
                          setLatitude(lat);
                          setLongitude(lng);
                        }}
                      />
                    </div>
                  )}
                </div>
            </div>
          )}
          
          {/* Pagination for Basics */}
          {showBasics && (
            <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-200 flex-wrap">
              <button
                type="button"
                onClick={previewNextStep}
                disabled={currentStep >= 5}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Preview next steps without validation"
              >
                Preview steps
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goToNextStep}
                disabled={currentStep >= 5}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        {/* ROOM TYPES */}
        <section ref={el => { sectionRefs.current[1] = el }} className={`bg-white rounded-lg pl-4 pr-6 py-6 border-l-4 border-primary-600 shadow-sm ${showRooms ? 'block' : 'hidden'}`}>
          {showRooms && (
            <div className="w-full">
            <div className="space-y-4 text-gray-700 mt-2">
              <div>
                <label className="block text-sm font-medium">What type of room is this? <span className="text-red-600">*</span></label>
                <div className="relative">
                  <select title="Room type" value={roomType} onChange={e=>setRoomType(e.target.value)} className="mt-2 w-full h-9 appearance-none rounded-lg px-3 pr-10 border border-gray-300">
                    {["Single","Double","Studio","Suite","Family","Other"].map(o=><option key={o}>{o}</option>)}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-transparent border-0 flex items-center justify-center pointer-events-none text-gray-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">What beds are available in this room?</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {(["twin","full","queen","king"] as BedKey[]).map(k=>{
                    const BedIcon = BED_ICONS[k];
                    return (
                    <div key={k} className="bg-gray-50 p-2 rounded flex items-center justify-between">
                      <div className="text-sm capitalize flex items-center gap-2">
                        {BedIcon && <BedIcon className="w-4 h-4 text-blue-600" />}
                        {k} bed(s)
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          aria-label={`Remove one ${k} bed`}
                          onClick={()=>changeBed(k,-1)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          readOnly
                          aria-label={`${k} beds count`}
                          title={`${k} beds count`}
                          className="w-10 h-8 text-center rounded border border-gray-200"
                          value={beds[k]}
                        />
                        <button
                          type="button"
                          aria-label={`Add one ${k} bed`}
                          onClick={()=>changeBed(k,1)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">How many rooms of this type do you have? <span className="text-red-600">*</span></label>
                  <input value={roomsCount} onChange={e=>setRoomsCount(numOrEmpty(e.target.value))} type="number" min={1} placeholder="e.g. 3" className="mt-2 w-full h-9 border rounded-lg px-3" />
                </div>
                <div>
                  <label className="text-sm">Is smoking allowed in this room?</label>
                  <div className="mt-2">
                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <label className="inline-flex items-center">
                          <input type="radio" checked={smoking==="yes"} onChange={()=>setSmoking("yes")} className="mr-2" />
                          Yes
                        </label>
                        <label className="inline-flex items-center">
                          <input type="radio" checked={smoking==="no"} onChange={()=>setSmoking("no")} className="mr-2" />
                          No
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* bathroom */}
              <div className="mt-2">
                <h4 className="font-semibold">Bathroom Details</h4>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                    <label className="text-sm">Is the bathroom private?</label>
                    <div className="mt-2 flex items-center space-x-4">
                      <label className="inline-flex items-center"><input type="radio" checked={bathPrivate==="yes"} onChange={()=>setBathPrivate("yes")} className="mr-2" /> Yes</label>
                      <label className="inline-flex items-center"><input type="radio" checked={bathPrivate==="no"} onChange={()=>setBathPrivate("no")} className="mr-2" /> No, it&apos;s shared</label>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm">What bathroom items are available in this room?</label>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      {["Free toiletries","Toilet paper","Shower","Water Heater","Toilet","Hairdryer","Trash Bin","Toilet Brush","Mirror","Slippers","Bathrobe","Bath Mat","Towel"].map(i=>{
                        const Icon = BATHROOM_ICONS[i];
                        return (
                          <label key={i} className="flex items-center">
                            <input type="checkbox" className="mr-2" checked={bathItems.includes(i)} onChange={()=>toggleStr(bathItems,setBathItems,i)} />
                            {Icon && <Icon className="w-4 h-4 mr-1.5 text-blue-600" />}
                            <span className="text-sm">{i}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="mt-2">
                      <label className="text-sm">Towel color (optional)</label>
                      <input value={towelColor} onChange={e=>setTowelColor(e.target.value)} className="mt-1 w-full h-9 border rounded-lg px-3" placeholder="e.g. white, blue" />
                    </div>
                  </div>
                </div>
              </div>

              {/* other amenities */}
              <div className="mt-2">
                <h4 className="font-semibold">Other room amenities</h4>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm other-amenities-grid">
                  {["Free Wi-Fi","Table","Chair","Iron","TV","Flat Screen TV","PS Station","Wardrobe","Air Conditioning","Mini Fridge","Coffee Maker","Phone","Mirror","Bedside Lamps","Heating","Desk","Safe","Clothes Rack","Blackout Curtains","Couches"].map(i=>{
                    const Icon = OTHER_AMENITIES_ICONS[i];
                    return (
                      <label key={i} className="flex items-center">
                        <input type="checkbox" className="mr-2" checked={otherAmenities.includes(i)} onChange={()=>toggleStr(otherAmenities,setOtherAmenities,i)} />
                        {Icon && <Icon className="w-4 h-4 mr-1.5 text-blue-600" />}
                        <span className="text-sm">{i}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-2">
                  <label className="text-sm">Other amenities (comma separated)</label>
                  <input value={otherAmenitiesText} onChange={e=>setOtherAmenitiesText(e.target.value)} className="mt-1 w-full h-9 border rounded-lg px-3" placeholder="e.g. minibar, balcony" />
                </div>
              </div>

              {/* room desc + images + price */}
              <div className="mt-4 w-full max-w-full sm:max-w-xl box-border">
                <label className="text-sm">Room description (optional)</label>
                <textarea
                  value={roomDescription}
                  onChange={e=>setRoomDescription(e.target.value)}
                  rows={3}
                  className="mt-2 w-full max-w-full sm:max-w-xl rounded border border-gray-300 px-3 py-2 box-border"
                  placeholder="Short description for this room type"
                  style={{ minHeight: 96 }}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                <div>
                  <PicturesUploader
                    title="Room images"
                    minRequired={3}
                    images={roomImages}
                    onUpload={onPickRoomImages}
                    onRemove={(index)=>{
                      setRoomImages(prev=>prev.filter((_,i)=>i!==index));
                      setRoomImageSaved(prev=>prev.filter((_,i)=>i!==index));
                      setRoomImageUploading(prev=>prev.filter((_,i)=>i!==index));
                    }}
                    saved={roomImageSaved}
                    onSave={(index)=>setRoomImageSaved(prev=>prev.map((v,i)=>i===index?true:v))}
                    uploading={roomImageUploading}
                  />

                  {/* Price moved below the uploader as requested */}
                  <div className="mt-3">
                    <label className="text-sm">Price per night for this room type</label>
                    <div className="mt-2 flex items-center">
                      <input value={pricePerNight} onChange={e=>setPricePerNight(numOrEmpty(e.target.value))} type="number" step="0.01" placeholder="e.g. 45.00" className="w-full h-9 border rounded-lg px-3" />
                      <span className="ml-2 text-sm">/ night</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <button type="button" onClick={addRoomType} className="bg-primary-600 px-4 py-2 rounded text-white">Add room type</button>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-lg font-semibold">Defined room types</h4>
                <div className="mt-3 space-y-3 text-gray-800">
                  {definedRooms.length === 0 && <div className="text-sm opacity-70">No room types yet.</div>}
                  {definedRooms.map((r, idx)=>(
                    <div key={idx} className="border rounded-xl p-3">
                      <div className="font-medium">{r.roomType} • {r.roomsCount} room(s)</div>
                      <div className="text-xs opacity-70">Beds: T{r.beds.twin} / F{r.beds.full} / Q{r.beds.queen} / K{r.beds.king}</div>
                      <div className="text-xs opacity-70 mt-1">Smoking: {r.smoking}, Private bath: {r.bathPrivate}</div>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {r.roomImages.map((u:string,i:number)=>(
                          <div key={i} className="w-20 h-20 rounded overflow-hidden border relative defined-room-thumb">
                            <button
                              type="button"
                              aria-label={`Remove image ${i + 1} from room ${idx + 1}`}
                              onClick={() => setDefinedRooms(prev => prev.map((rr, ri) => ri === idx ? { ...rr, roomImages: rr.roomImages.filter((_: string, k: number) => k !== i) } : rr))}
                              className="thumbnail-remove-btn"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 11-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <Image src={u} alt={`Room ${idx+1} image ${i+1}`} width={120} height={30} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </div>
          )}
          
          {/* Pagination for Rooms */}
          {showRooms && (
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={goToPreviousStep}
                disabled={currentStep <= 0}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={goToNextStep}
                disabled={currentStep >= 5}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        {/* SERVICES */}
        <section ref={el => { sectionRefs.current[2] = el }} className={`bg-white rounded-lg pl-4 pr-6 py-6 border-l-4 border-primary-600 shadow-sm ${showServices ? 'block' : 'hidden'}`}>
          {showServices && (
            <div className="w-full">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-2 bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">Services & Facilities Available</h2>
                <p className="text-sm text-gray-600">Select the services and amenities available at your property</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Parking */}
                <div className="group bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border-2 border-gray-100 hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-blue-100 rounded-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Car className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Parking</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["no","free","paid"] as const).map((v) => (
                      <label
                        key={v}
                        className={`flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold transition-all duration-300 cursor-pointer transform hover:scale-105 animate-fade-in ${
                          services.parking === v 
                            ? 'bg-gradient-to-br from-[#02665e] to-[#02665e] border-[#02665e] text-white shadow-lg scale-105' 
                            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        <input
                          type="radio"
                          name="parking"
                          checked={services.parking === v}
                          onChange={() => setServices(s => ({ ...s, parking: v }))}
                          className="sr-only"
                        />
                        <Car className={`w-3.5 h-3.5 mr-1.5 transition-colors ${services.parking === v ? 'text-white' : 'text-blue-600'}`} />
                        <span>{v === 'no' ? 'No' : v === 'free' ? 'Free' : 'Paid'}</span>
                      </label>
                    ))}
                  </div>
                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${services.parking === "paid" ? "max-h-24 opacity-100 mt-3" : "max-h-0 opacity-0"}`}>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">Daily Price</label>
                    <input 
                      value={services.parkingPrice as any} 
                      onChange={e => setServices(s => ({ ...s, parkingPrice: numOrEmpty(e.target.value) }))} 
                      type="number" 
                      step="0.01" 
                      className="w-full h-10 border-2 border-gray-200 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all" 
                      placeholder="e.g. 5.00" 
                    />
                  </div>
                </div>

                {/* Breakfast */}
                <div className="group bg-gradient-to-br from-white to-orange-50 rounded-2xl p-6 border-2 border-orange-100 hover:border-orange-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-orange-100 rounded-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Coffee className="w-6 h-6 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Breakfast</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                        services.breakfastIncluded 
                          ? 'bg-gradient-to-br from-[#02665e] to-[#02665e] border-[#02665e] text-white shadow-lg scale-105' 
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <input type="checkbox" checked={services.breakfastIncluded} onChange={e => setServices(s => ({ ...s, breakfastIncluded: e.target.checked }))} className="sr-only" />
                      <Coffee className={`w-3.5 h-3.5 mr-1.5 ${services.breakfastIncluded ? 'text-white' : 'text-orange-600'}`} />
                      <span>Included</span>
                    </label>
                    <label
                      className={`flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                        services.breakfastAvailable 
                          ? 'bg-gradient-to-br from-[#02665e] to-[#02665e] border-[#02665e] text-white shadow-lg scale-105' 
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <input type="checkbox" checked={services.breakfastAvailable} onChange={e => setServices(s => ({ ...s, breakfastAvailable: e.target.checked }))} className="sr-only" />
                      <Coffee className={`w-3.5 h-3.5 mr-1.5 ${services.breakfastAvailable ? 'text-white' : 'text-orange-600'}`} />
                      <span>Extra</span>
                    </label>
                  </div>
                </div>

                {/* Restaurant / Bar */}
                <div className="group bg-gradient-to-br from-white to-purple-50 rounded-2xl p-6 border-2 border-purple-100 hover:border-purple-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-purple-100 rounded-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Coffee className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Restaurant / Bar</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold transition-all duration-300 cursor-pointer transform hover:scale-105 ${services.restaurant ? 'bg-gradient-to-br from-[#02665e] to-[#02665e] border-[#02665e] text-white shadow-lg scale-105' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'}`}>
                      <input type="checkbox" checked={services.restaurant} onChange={e => setServices(s => ({ ...s, restaurant: e.target.checked }))} className="sr-only" />
                      <Coffee className={`w-3.5 h-3.5 mr-1.5 ${services.restaurant ? 'text-white' : 'text-purple-600'}`} />
                      <span>Restaurant</span>
                    </label>
                    <label className={`flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold transition-all duration-300 cursor-pointer transform hover:scale-105 ${services.bar ? 'bg-gradient-to-br from-[#02665e] to-[#02665e] border-[#02665e] text-white shadow-lg scale-105' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'}`}>
                      <input type="checkbox" checked={services.bar} onChange={e => setServices(s => ({ ...s, bar: e.target.checked }))} className="sr-only" />
                      <Beer className={`w-3.5 h-3.5 mr-1.5 ${services.bar ? 'text-white' : 'text-purple-600'}`} />
                      <span>Bar</span>
                    </label>
                  </div>
                </div>

                {/* Wellness & Leisure */}
                <div className="group bg-gradient-to-br from-white to-cyan-50 rounded-2xl p-6 border-2 border-cyan-100 hover:border-cyan-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-cyan-100 rounded-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Waves className="w-6 h-6 text-cyan-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Wellness & Leisure</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold transition-all duration-300 cursor-pointer transform hover:scale-105 ${services.pool ? 'bg-gradient-to-br from-[#02665e] to-[#02665e] border-[#02665e] text-white shadow-lg scale-105' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'}`}>
                      <input type="checkbox" checked={services.pool} onChange={e => setServices(s => ({ ...s, pool: e.target.checked }))} className="sr-only" />
                      <Waves className={`w-3.5 h-3.5 mr-1.5 ${services.pool ? 'text-white' : 'text-cyan-600'}`} />
                      <span>Pool</span>
                    </label>
                    <label className={`flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold transition-all duration-300 cursor-pointer transform hover:scale-105 ${services.sauna ? 'bg-gradient-to-br from-[#02665e] to-[#02665e] border-[#02665e] text-white shadow-lg scale-105' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'}`}>
                      <input type="checkbox" checked={services.sauna} onChange={e => setServices(s => ({ ...s, sauna: e.target.checked }))} className="sr-only" />
                      <Thermometer className={`w-3.5 h-3.5 mr-1.5 ${services.sauna ? 'text-white' : 'text-cyan-600'}`} />
                      <span>Sauna</span>
                    </label>
                  </div>
                </div>

                {/* Housekeeping & Services */}
                <div className="group bg-gradient-to-br from-white to-indigo-50 rounded-2xl p-6 border-2 border-indigo-100 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-indigo-100 rounded-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <WashingMachine className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Housekeeping</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold transition-all duration-300 cursor-pointer transform hover:scale-105 ${services.laundry ? 'bg-gradient-to-br from-[#02665e] to-[#02665e] border-[#02665e] text-white shadow-lg scale-105' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'}`}>
                      <input type="checkbox" checked={services.laundry} onChange={e => setServices(s => ({ ...s, laundry: e.target.checked }))} className="sr-only" />
                      <IconOr Icon={WashingMachine} className={`w-3.5 h-3.5 mr-1.5 ${services.laundry ? 'text-white' : 'text-indigo-600'}`} />
                      <span>Laundry</span>
                    </label>
                    <label className={`flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold transition-all duration-300 cursor-pointer transform hover:scale-105 ${services.roomService ? 'bg-gradient-to-br from-[#02665e] to-[#02665e] border-[#02665e] text-white shadow-lg scale-105' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'}`}>
                      <input type="checkbox" checked={services.roomService} onChange={e => setServices(s => ({ ...s, roomService: e.target.checked }))} className="sr-only" />
                      <IconOr Icon={Package} className={`w-3.5 h-3.5 mr-1.5 ${services.roomService ? 'text-white' : 'text-indigo-600'}`} />
                      <span>Room Service</span>
                    </label>
                  </div>
                </div>

                {/* Safety & First Aid */}
                <div className="group bg-gradient-to-br from-white to-red-50 rounded-2xl p-6 border-2 border-red-100 hover:border-red-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-red-100 rounded-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Shield className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Safety & First Aid</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <label className={`flex flex-col items-center justify-center h-16 w-full rounded-xl border-2 text-[10px] font-semibold transition-all duration-300 cursor-pointer transform hover:scale-105 ${services.security24 ? 'bg-gradient-to-br from-[#02665e] to-[#02665e] border-[#02665e] text-white shadow-lg scale-105' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'}`}>
                      <input type="checkbox" checked={services.security24} onChange={e => setServices(s => ({ ...s, security24: e.target.checked }))} className="sr-only" />
                      <IconOr Icon={Shield} className={`w-4 h-4 mb-1 ${services.security24 ? 'text-white' : 'text-red-600'}`} />
                      <span className="text-center leading-tight">Security</span>
                    </label>
                    <label className={`flex flex-col items-center justify-center h-16 w-full rounded-xl border-2 text-[10px] font-semibold transition-all duration-300 cursor-pointer transform hover:scale-105 ${services.firstAid ? 'bg-gradient-to-br from-[#02665e] to-[#02665e] border-[#02665e] text-white shadow-lg scale-105' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'}`}>
                      <input type="checkbox" checked={services.firstAid} onChange={e => setServices(s => ({ ...s, firstAid: e.target.checked }))} className="sr-only" />
                      <IconOr Icon={Bandage} className={`w-4 h-4 mb-1 ${services.firstAid ? 'text-white' : 'text-red-600'}`} />
                      <span className="text-center leading-tight">First Aid</span>
                    </label>
                    <label className={`flex flex-col items-center justify-center h-16 w-full rounded-xl border-2 text-[10px] font-semibold transition-all duration-300 cursor-pointer transform hover:scale-105 ${services.fireExtinguisher ? 'bg-gradient-to-br from-[#02665e] to-[#02665e] border-[#02665e] text-white shadow-lg scale-105' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'}`}>
                      <input type="checkbox" checked={services.fireExtinguisher} onChange={e => setServices(s => ({ ...s, fireExtinguisher: e.target.checked }))} className="sr-only" />
                      <IconOr Icon={FireExtinguisher} className={`w-4 h-4 mb-1 ${services.fireExtinguisher ? 'text-white' : 'text-red-600'}`} />
                      <span className="text-center leading-tight">Fire Ext.</span>
                    </label>
                  </div>
                </div>

                {/* Shops & Nearby Facilities */}
                <div className="group bg-gradient-to-br from-white to-pink-50 rounded-2xl p-6 border-2 border-pink-100 hover:border-pink-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-pink-100 rounded-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <ShoppingBag className="w-6 h-6 text-pink-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Shopping</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold transition-all duration-300 cursor-pointer transform hover:scale-105 ${services.onSiteShop ? 'bg-gradient-to-br from-[#02665e] to-[#02665e] border-[#02665e] text-white shadow-lg scale-105' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'}`}>
                      <input type="checkbox" checked={services.onSiteShop} onChange={e => setServices(s => ({ ...s, onSiteShop: e.target.checked }))} className="sr-only" />
                      <IconOr Icon={ShoppingBag} className={`w-3.5 h-3.5 mr-1.5 ${services.onSiteShop ? 'text-white' : 'text-pink-600'}`} />
                      <span>On-site</span>
                    </label>
                    <label className={`flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold transition-all duration-300 cursor-pointer transform hover:scale-105 ${services.nearbyMall ? 'bg-gradient-to-br from-[#02665e] to-[#02665e] border-[#02665e] text-white shadow-lg scale-105' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'}`}>
                      <input type="checkbox" checked={services.nearbyMall} onChange={e => setServices(s => ({ ...s, nearbyMall: e.target.checked }))} className="sr-only" />
                      <IconOr Icon={Store} className={`w-3.5 h-3.5 mr-1.5 ${services.nearbyMall ? 'text-white' : 'text-pink-600'}`} />
                      <span>Mall</span>
                    </label>
                  </div>
                </div>

                {/* Events & Community */}
                <div className="group bg-gradient-to-br from-white to-yellow-50 rounded-2xl p-6 border-2 border-yellow-100 hover:border-yellow-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-yellow-100 rounded-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <PartyPopper className="w-6 h-6 text-yellow-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Events</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold transition-all duration-300 cursor-pointer transform hover:scale-105 ${services.socialHall ? 'bg-gradient-to-br from-[#02665e] to-[#02665e] border-[#02665e] text-white shadow-lg scale-105' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'}`}>
                      <input type="checkbox" checked={services.socialHall} onChange={e => setServices(s => ({ ...s, socialHall: e.target.checked }))} className="sr-only" />
                      <IconOr Icon={PartyPopper} className={`w-3.5 h-3.5 mr-1.5 ${services.socialHall ? 'text-white' : 'text-yellow-600'}`} />
                      <span>Social Hall</span>
                    </label>
                    <label className={`flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold transition-all duration-300 cursor-pointer transform hover:scale-105 ${services.sportsGames ? 'bg-gradient-to-br from-[#02665e] to-[#02665e] border-[#02665e] text-white shadow-lg scale-105' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'}`}>
                      <input type="checkbox" checked={services.sportsGames} onChange={e => setServices(s => ({ ...s, sportsGames: e.target.checked }))} className="sr-only" />
                      <IconOr Icon={Gamepad} className={`w-3.5 h-3.5 mr-1.5 ${services.sportsGames ? 'text-white' : 'text-yellow-600'}`} />
                      <span>Sports</span>
                    </label>
                  </div>
                </div>

                {/* Fitness */}
                <div className="group bg-gradient-to-br from-white to-green-50 rounded-2xl p-6 border-2 border-green-100 hover:border-green-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-green-100 rounded-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Dumbbell className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Fitness</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <label className={`flex items-center justify-center h-11 w-full rounded-xl border-2 text-xs font-semibold transition-all duration-300 cursor-pointer transform hover:scale-105 ${services.gym ? 'bg-gradient-to-br from-[#02665e] to-[#02665e] border-[#02665e] text-white shadow-lg scale-105' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'}`}>
                      <input type="checkbox" checked={services.gym} onChange={e => setServices(s => ({ ...s, gym: e.target.checked }))} className="sr-only" />
                      <IconOr Icon={Dumbbell} className={`w-3.5 h-3.5 mr-1.5 ${services.gym ? 'text-white' : 'text-green-600'}`} />
                      <span>Gym / Fitness Center</span>
                    </label>
                  </div>
                </div>

                {/* Nearby services — Enhanced Facilities - Full Width */}
                <div className="lg:col-span-2 group bg-gradient-to-br from-white to-slate-50 rounded-2xl p-6 border-2 border-slate-100 hover:border-slate-300 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-slate-100 rounded-xl group-hover:scale-110 transition-all duration-300">
                      <Building2 className="w-6 h-6 text-slate-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Nearby Services</h3>
                  </div>


                  {/* Inline add form */}
                  <AddFacilityInline onAdd={(f) => setNearbyFacilities(list => [...list, f])} />

                  {/* List */}
                  <div className="mt-6 space-y-4">
                    {nearbyFacilities.length === 0 && (
                      <div className="text-sm text-gray-500 py-8 text-center bg-white rounded-xl border-2 border-dashed border-gray-200">No facilities added yet.</div>
                    )}

                    {nearbyFacilities.map((f: NearbyFacility, idx: number) => (
                      <FacilityRow
                        key={f.id}
                        facility={f}
                        onChange={(updated: NearbyFacility) =>
                          setNearbyFacilities((list: NearbyFacility[]) =>
                            list.map((x: NearbyFacility, i: number) => (i === idx ? updated : x))
                          )
                        }
                        onRemove={() =>
                          setNearbyFacilities((list: NearbyFacility[]) =>
                            list.filter((_: NearbyFacility, i: number) => i !== idx)
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Pagination for Services */}
          {showServices && (
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={goToPreviousStep}
                disabled={currentStep <= 0}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={goToNextStep}
                disabled={currentStep >= 5}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        {/* totals + description */}
        <section ref={el => { sectionRefs.current[3] = el }} className={`bg-white rounded-lg pl-4 pr-6 py-6 border-l-4 border-primary-600 shadow-sm ${showTotals ? 'block' : 'hidden'}`}>
          {showTotals && (
            <div className="w-full">
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Num label="Total Bedrooms" v={totalBedrooms} set={setTotalBedrooms}/>
                <Num label="Total Bathrooms" v={totalBathrooms} set={setTotalBathrooms}/>
                <Num label="Max Guests" v={maxGuests} set={setMaxGuests}/>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="Enter property description" value={desc} onChange={e=>setDesc(e.target.value)} />
              </div>
              
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-700 mb-2">Are you accepting Group Booking?</label>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center">
                      <input type="radio" checked={acceptGroupBooking === true} onChange={() => setAcceptGroupBooking(true)} className="mr-2" />
                      Yes
                    </label>
                    <label className="inline-flex items-center">
                      <input type="radio" checked={acceptGroupBooking === false} onChange={() => setAcceptGroupBooking(false)} className="mr-2" />
                      No
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Pagination for Totals */}
          {showTotals && (
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={goToPreviousStep}
                disabled={currentStep <= 0}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={goToNextStep}
                disabled={currentStep >= 5}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        {/* PROPERTY PHOTOS */}
        <section ref={el => { sectionRefs.current[4] = el }} className={`bg-white rounded-lg pl-4 pr-6 py-6 border-l-4 border-primary-600 shadow-sm ${showPhotos ? 'block' : 'hidden'}`}>
          {showPhotos && (
            <div className="w-full">
            <div className="grid gap-3">
              <div>
                <PicturesUploader
                  title="Property Photos"
                  minRequired={3}
                  images={photos}
                  onUpload={pickPropertyPhotos}
                  onRemove={(index)=>{
                    setPhotos(prev=>prev.filter((_,i)=>i!==index));
                    setPhotosSaved(prev=>prev.filter((_,i)=>i!==index));
                    setPhotosUploading(prev=>prev.filter((_,i)=>i!==index));
                  }}
                  saved={photosSaved}
                  onSave={(index)=>setPhotosSaved(prev=>prev.map((v,i)=>i===index?true:v))}
                  inputId="propertyPhotosInput"
                  uploading={photosUploading}
                />
              </div>
            </div>
            </div>
          )}
          
          {/* Pagination for Photos */}
          {showPhotos && (
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={goToPreviousStep}
                disabled={currentStep <= 0}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={goToNextStep}
                disabled={currentStep >= 5}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        {/* REVIEW */}
        <section ref={el => { sectionRefs.current[5] = el }} className={`bg-white rounded-lg pl-4 pr-6 py-6 border-l-4 border-emerald-600 shadow-sm ${showReview ? 'block' : 'hidden'}`}>
          {showReview && (
            <div className="w-full">
            <div className="space-y-6">
              <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Review Your Property Listing</h3>
                <p className="text-base text-gray-600 mb-4">Please review all the information below before submitting your property for review.</p>
              </div>

              {/* Basics */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 transition-all hover:shadow-md hover:border-gray-300 animate-in fade-in slide-in-from-left-4 duration-500 delay-75">
                <h4 className="font-semibold text-base text-gray-800 mb-3 flex items-center gap-2">
                  {title.trim().length >= 3 && !!regionId && !!district ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 transition-transform duration-300 hover:scale-110" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 transition-transform duration-300 hover:scale-110" />
                  )}
                  <span>Property Basics</span>
                </h4>
                <div className="space-y-2 text-base text-gray-700">
                  <div className="flex justify-between items-center transition-all duration-200 hover:translate-x-1">
                    <span className="font-medium">Name:</span>
                    <span className={`transition-colors duration-200 ${title.trim().length >= 3 ? 'text-green-700' : 'text-red-600'}`}>
                      {title || '(Not provided)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center transition-all duration-200 hover:translate-x-1">
                    <span className="font-medium">Type:</span>
                    <span>{type || '(Not selected)'}</span>
                  </div>
                  <div className="flex justify-between items-center transition-all duration-200 hover:translate-x-1">
                    <span className="font-medium">Location:</span>
                    <span className={`transition-colors duration-200 ${!!regionId && !!district ? 'text-green-700' : 'text-red-600'}`}>
                      {regionId && district ? `${district}, ${REGION_BY_ID[regionId]?.name || regionId}` : '(Not provided)'}
                    </span>
                  </div>
                  {street && (
                    <div className="flex justify-between items-center transition-all duration-200 hover:translate-x-1">
                      <span className="font-medium">Street:</span>
                      <span>{street}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Room Types */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 transition-all hover:shadow-md hover:border-gray-300 animate-in fade-in slide-in-from-left-4 duration-500 delay-150">
                <h4 className="font-semibold text-base text-gray-800 mb-3 flex items-center gap-2">
                  {definedRooms.length >= 1 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 transition-transform duration-300 hover:scale-110" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 transition-transform duration-300 hover:scale-110" />
                  )}
                  <span>Room Types</span>
                </h4>
                <div className="text-base text-gray-700">
                  {definedRooms.length > 0 ? (
                    <div className="space-y-2">
                      {definedRooms.map((room, idx) => (
                        <div key={idx} className="flex justify-between items-center transition-all duration-200 hover:translate-x-1 hover:bg-white/50 rounded px-2 py-1">
                          <span className="font-medium">{room.roomType}</span>
                          <span className="text-gray-600">{room.roomsCount} room(s) • ${room.pricePerNight}/night</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-red-600 transition-colors duration-200">No room types added yet</span>
                  )}
                </div>
              </div>

              {/* Services & Facilities Available */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 transition-all hover:shadow-md hover:border-gray-300 animate-in fade-in slide-in-from-left-4 duration-500 delay-200">
                <h4 className="font-semibold text-base text-gray-800 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 transition-transform duration-300 hover:scale-110" />
                  <span>Services & Facilities Available</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-base text-gray-700">
                  {services.parking !== 'no' && (
                    <div className="flex items-center gap-1.5 transition-all duration-200 hover:translate-x-1">
                      <Car className="w-4 h-4 text-blue-600" />
                      <span>Parking: {services.parking}</span>
                    </div>
                  )}
                  {services.breakfastIncluded && (
                    <div className="flex items-center gap-1.5 transition-all duration-200 hover:translate-x-1">
                      <Coffee className="w-4 h-4 text-amber-600" />
                      <span>Breakfast Included</span>
                    </div>
                  )}
                  {services.breakfastAvailable && (
                    <div className="flex items-center gap-1.5 transition-all duration-200 hover:translate-x-1">
                      <Coffee className="w-4 h-4 text-amber-600" />
                      <span>Breakfast Available</span>
                    </div>
                  )}
                  {services.restaurant && (
                    <div className="flex items-center gap-1.5 transition-all duration-200 hover:translate-x-1">
                      <UtensilsCrossed className="w-4 h-4 text-rose-600" />
                      <span>Restaurant</span>
                    </div>
                  )}
                  {services.bar && (
                    <div className="flex items-center gap-1.5 transition-all duration-200 hover:translate-x-1">
                      <Beer className="w-4 h-4 text-purple-600" />
                      <span>Bar</span>
                    </div>
                  )}
                  {services.pool && (
                    <div className="flex items-center gap-1.5 transition-all duration-200 hover:translate-x-1">
                      <Waves className="w-4 h-4 text-cyan-600" />
                      <span>Pool</span>
                    </div>
                  )}
                  {services.sauna && (
                    <div className="flex items-center gap-1.5 transition-all duration-200 hover:translate-x-1">
                      <Thermometer className="w-4 h-4 text-orange-600" />
                      <span>Sauna</span>
                    </div>
                  )}
                  {services.laundry && (
                    <div className="flex items-center gap-1.5 transition-all duration-200 hover:translate-x-1">
                      <WashingMachine className="w-4 h-4 text-indigo-600" />
                      <span>Laundry</span>
                    </div>
                  )}
                  {services.roomService && (
                    <div className="flex items-center gap-1.5 transition-all duration-200 hover:translate-x-1">
                      <Coffee className="w-4 h-4 text-emerald-600" />
                      <span>Room Service</span>
                    </div>
                  )}
                  {services.security24 && (
                    <div className="flex items-center gap-1.5 transition-all duration-200 hover:translate-x-1">
                      <Shield className="w-4 h-4 text-red-600" />
                      <span>24/7 Security</span>
                    </div>
                  )}
                  {services.firstAid && (
                    <div className="flex items-center gap-1.5 transition-all duration-200 hover:translate-x-1">
                      <Bandage className="w-4 h-4 text-green-600" />
                      <span>First Aid</span>
                    </div>
                  )}
                  {services.fireExtinguisher && (
                    <div className="flex items-center gap-1.5 transition-all duration-200 hover:translate-x-1">
                      <FireExtinguisher className="w-4 h-4 text-red-600" />
                      <span>Fire Extinguisher</span>
                    </div>
                  )}
                  {services.gym && (
                    <div className="flex items-center gap-1.5 transition-all duration-200 hover:translate-x-1">
                      <Dumbbell className="w-4 h-4 text-slate-700" />
                      <span>Gym</span>
                    </div>
                  )}
                </div>
                {nearbyFacilities.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin className="w-4 h-4 text-pink-600" />
                      <span className="font-semibold">{nearbyFacilities.length} Nearby Services</span>
                    </div>
                    <div className="space-y-2">
                      {nearbyFacilities.map((f, i) => (
                        <div key={i} className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-all">
                          <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
                            {f.name && (
                              <div className="flex-shrink-0">
                                <span className="text-base font-semibold text-gray-800">{f.name}</span>
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                              {f.type && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">
                                  {f.type}
                                </span>
                              )}
                              {f.ownership && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                                  {f.ownership}
                                </span>
                              )}
                              {typeof f.distanceKm === 'number' && (
                                <span className="inline-flex items-center gap-1 text-gray-600">
                                  <MapPin className="w-3.5 h-3.5 text-pink-600" />
                                  <span className="font-medium">{f.distanceKm} km</span>
                                </span>
                              )}
                              {f.url && (
                                <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#02665e] hover:opacity-80" aria-label="Open link">
                                  <LinkIcon className="w-3.5 h-3.5" />
                                  <span className="text-xs font-medium">Link</span>
                                </a>
                              )}
                            </div>
                          </div>
                          {Array.isArray(f.reachableBy) && f.reachableBy.length > 0 && (
                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm text-gray-600 font-medium">Reachable:</span>
                              {f.reachableBy.map((m, idx) => {
                                const Icon = REACH_ICONS[m as string];
                                  return (
                                  <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                                      {Icon ? <Icon className={`h-3.5 w-3.5 ${REACH_ICON_COLORS[m as string] || ''}`} aria-hidden /> : null}
                                    <span className="text-sm font-medium">{m}</span>
                                    </span>
                                  );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Property Details */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 transition-all hover:shadow-md hover:border-gray-300 animate-in fade-in slide-in-from-left-4 duration-500 delay-300">
                <h4 className="font-semibold text-base text-gray-800 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 transition-transform duration-300 hover:scale-110" />
                  <span>Property Details</span>
                </h4>
                <div className="space-y-2 text-base text-gray-700">
                  {totalBedrooms !== '' && (
                    <div className="flex justify-between items-center transition-all duration-200 hover:translate-x-1">
                      <span className="font-medium">Total Bedrooms:</span>
                      <span>{totalBedrooms}</span>
                    </div>
                  )}
                  {totalBathrooms !== '' && (
                    <div className="flex justify-between items-center transition-all duration-200 hover:translate-x-1">
                      <span className="font-medium">Total Bathrooms:</span>
                      <span>{totalBathrooms}</span>
                    </div>
                  )}
                  {maxGuests !== '' && (
                    <div className="flex justify-between items-center transition-all duration-200 hover:translate-x-1">
                      <span className="font-medium">Max Guests:</span>
                      <span>{maxGuests}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center transition-all duration-200 hover:translate-x-1">
                    <span className="font-medium">Group Booking:</span>
                    <span>{acceptGroupBooking ? 'Accepted' : 'Not Accepted'}</span>
                  </div>
                  {desc && (
                    <div className="pt-2 transition-all duration-200 hover:translate-x-1">
                      <span className="font-medium">Description:</span>
                      <p className="mt-1 text-gray-600">{desc}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Photos */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 transition-all hover:shadow-md hover:border-gray-300 animate-in fade-in slide-in-from-left-4 duration-500 delay-[350ms]">
                <h4 className="font-semibold text-base text-gray-800 mb-3 flex items-center gap-2">
                  {photos.length >= 3 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 transition-transform duration-300 hover:scale-110" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 transition-transform duration-300 hover:scale-110" />
                  )}
                  <span>Property Photos</span>
                </h4>
                <div className="text-base text-gray-700">
                  <span className={`transition-colors duration-200 ${photos.length >= 3 ? 'text-green-700' : 'text-red-600'}`}>
                    {photos.length} photo(s) uploaded {photos.length < 3 && `(Need ${3 - photos.length} more)`}
                  </span>
                </div>
              </div>

              {/* Submission Status */}
              <div className={`rounded-lg p-4 border transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 delay-[400ms] ${
                completeEnough 
                  ? 'bg-green-50 border-green-200 hover:shadow-lg hover:shadow-green-100' 
                  : 'bg-amber-50 border-amber-200 hover:shadow-lg hover:shadow-amber-100'
              }`}>
                <div className="flex items-start gap-3">
                  <div className="text-2xl transition-transform duration-300 hover:scale-110">
                    {completeEnough ? (
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-base text-gray-800 mb-1">
                      Status: {completeEnough ? (
                        <span className="text-green-700 transition-colors duration-200">Ready to Submit</span>
                      ) : (
                        <span className="text-amber-700 transition-colors duration-200">Incomplete</span>
                      )}
                    </h4>
                    <p className="text-base text-gray-600">
                      {completeEnough 
                        ? 'Your property listing meets all requirements and is ready for submission.' 
                        : 'Please complete all required fields: name, location, at least 3 photos, and at least 1 room type.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[450ms]">
                <button className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 text-sm font-medium" onClick={saveDraft}>
                  Save Draft
                </button>
                <button 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    completeEnough 
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5" 
                      : "border border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`} 
                  disabled={!completeEnough} 
                  onClick={submitForReview}
                >
                  Submit for Review
                </button>
              </div>
            </div>
            </div>
          )}
          
          {/* Pagination for Review */}
          {showReview && (
            <div className="mt-6 flex items-center justify-start pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={goToPreviousStep}
                disabled={currentStep <= 0}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
            </div>
          )}
        </section>
            </div>
          </main>
        </div>
      </div>
      
      {/* Live Preview Modal */}
      {showLivePreview && (() => {
        // Prepare services data for preview components
        const previewServices = (() => {
          const servicesObj: any = {
            ...(services.parking && services.parking !== 'no' ? { parking: services.parking } : {}),
            ...(services.parking === 'paid' && services.parkingPrice ? { parkingPrice: services.parkingPrice } : {}),
            ...(services.breakfastIncluded ? { breakfastIncluded: true } : {}),
            ...(services.breakfastAvailable ? { breakfastAvailable: true } : {}),
            ...(services.restaurant ? { restaurant: true } : {}),
            ...(services.bar ? { bar: true } : {}),
            ...(services.pool ? { pool: true } : {}),
            ...(services.sauna ? { sauna: true } : {}),
            ...(services.laundry ? { laundry: true } : {}),
            ...(services.roomService ? { roomService: true } : {}),
            ...(services.security24 ? { security24: true } : {}),
            ...(services.firstAid ? { firstAid: true } : {}),
            ...(services.fireExtinguisher ? { fireExtinguisher: true } : {}),
            ...(services.onSiteShop ? { onSiteShop: true } : {}),
            ...(services.nearbyMall ? { nearbyMall: true } : {}),
            ...(services.socialHall ? { socialHall: true } : {}),
            ...(services.sportsGames ? { sportsGames: true } : {}),
            ...(services.gym ? { gym: true } : {}),
            tags: Array.from(
              new Set<string>([
                ...servicesToArray(services),
                ...nearbyFacilitiesToServiceTags(nearbyFacilities),
                ...(freeCancellation ? ["Free cancellation"] : []),
                ...(acceptGroupBooking ? ["Group stay"] : []),
                ...paymentModes.map((m) => `Payment: ${m}`),
              ])
            ),
          };
          if (nearbyFacilities.length > 0) {
            servicesObj.nearbyFacilities = nearbyFacilities;
          }
          return servicesObj;
        })();
        
        // Normalize services for preview
        const normalizeBoolean = (value: any): boolean => {
          if (value === undefined || value === null) return false;
          if (typeof value === 'boolean') return value;
          if (typeof value === 'string') return value.toLowerCase() === 'true';
          return false;
        };
        
        const normalizedServicesObj = {
          parking: previewServices.parking || 'no',
          parkingPrice: previewServices.parkingPrice || '',
          breakfastIncluded: normalizeBoolean(previewServices.breakfastIncluded),
          breakfastAvailable: normalizeBoolean(previewServices.breakfastAvailable),
          restaurant: normalizeBoolean(previewServices.restaurant),
          bar: normalizeBoolean(previewServices.bar),
          pool: normalizeBoolean(previewServices.pool),
          sauna: normalizeBoolean(previewServices.sauna),
          laundry: normalizeBoolean(previewServices.laundry),
          roomService: normalizeBoolean(previewServices.roomService),
          security24: normalizeBoolean(previewServices.security24),
          firstAid: normalizeBoolean(previewServices.firstAid),
          fireExtinguisher: normalizeBoolean(previewServices.fireExtinguisher),
          onSiteShop: normalizeBoolean(previewServices.onSiteShop),
          nearbyMall: normalizeBoolean(previewServices.nearbyMall),
          socialHall: normalizeBoolean(previewServices.socialHall),
          sportsGames: normalizeBoolean(previewServices.sportsGames),
          gym: normalizeBoolean(previewServices.gym),
          nearbyFacilities: previewServices.nearbyFacilities || [],
          tags: previewServices.tags || [],
        };
        
        const effectiveServicesArray = Array.isArray(previewServices.tags) ? previewServices.tags : [];
        const servicesArray = effectiveServicesArray;
        
        return (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowLivePreview(false);
            }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-[#02665e] to-[#014e47]">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-white" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Live Preview</h2>
                  <span className="hidden sm:inline text-sm text-white/80">See how your property will look</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLivePreview(false)}
                  className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                  aria-label="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Preview Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Property Header */}
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{title || "Property Name"}</h1>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {street && `${street}, `}
                        {ward && `${ward}, `}
                        {district && `${district}, `}
                        {regionName || regionId || "Location"}
                      </span>
                    </div>
                    {inferBasePrice(definedRooms) && (
                      <div className="mt-4 text-2xl font-bold text-[#02665e]">
                        TSh {inferBasePrice(definedRooms)?.toLocaleString()} / night
                      </div>
                    )}
                  </div>
                  
                  {/* Photos Preview */}
                  {photos.length > 0 && (
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Photos</h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {photos.slice(0, 6).map((photo, idx) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                            <Image src={photo} alt={`Property photo ${idx + 1}`} fill className="object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Services & Facilities Preview */}
                  <ServicesAndFacilities
                    normalizedServicesObj={normalizedServicesObj}
                    effectiveServicesArray={effectiveServicesArray}
                    servicesArray={servicesArray}
                  />
                  
                  {/* Nearby Services Preview */}
                  {nearbyFacilities.length > 0 && (
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                      <NearbyServices
                        facilities={nearbyFacilities}
                        defaultExpanded={false}
                        showExpandButton={nearbyFacilities.length > 2}
                        maxInitialDisplay={2}
                      />
                    </div>
                  )}
                  
                  {/* Description */}
                  {desc && (
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                      <h2 className="text-xl font-semibold text-gray-900 mb-3">About this place</h2>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{desc}</p>
                    </div>
                  )}
                  
                  {/* Room Types */}
                  {definedRooms.length > 0 && (
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Room Types</h2>
                      <div className="space-y-4">
                        {definedRooms.map((room, idx) => (
                          <div key={idx} className="border border-slate-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-lg text-gray-900">{room.roomType}</h3>
                              {room.pricePerNight > 0 && (
                                <span className="text-lg font-bold text-[#02665e]">
                                  TSh {room.pricePerNight.toLocaleString()} / night
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>{room.roomsCount} room(s) available</div>
                              <div>Beds: {Object.entries(room.beds).filter(([_, count]) => count > 0).map(([type, count]) => `${type} (${count})`).join(', ') || 'None'}</div>
                              {room.roomDescription && (
                                <p className="mt-2 text-gray-700">{room.roomDescription}</p>
                              )}
                            </div>
                            {room.roomImages.length > 0 && (
                              <div className="mt-3 grid grid-cols-3 gap-2">
                                {room.roomImages.slice(0, 3).map((img, i) => (
                                  <div key={i} className="relative aspect-square rounded overflow-hidden border border-slate-200">
                                    <Image src={img} alt={`${room.roomType} image ${i + 1}`} fill className="object-cover" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Property Details */}
                  {(totalBedrooms || totalBathrooms || maxGuests) && (
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Details</h2>
                      <div className="grid grid-cols-3 gap-4">
                        {totalBedrooms && (
                          <div className="text-center">
                            <BedDouble className="w-8 h-8 mx-auto mb-2 text-[#02665e]" />
                            <div className="text-2xl font-bold text-gray-900">{totalBedrooms}</div>
                            <div className="text-sm text-gray-600">Bedrooms</div>
                          </div>
                        )}
                        {totalBathrooms && (
                          <div className="text-center">
                            <Bath className="w-8 h-8 mx-auto mb-2 text-[#02665e]" />
                            <div className="text-2xl font-bold text-gray-900">{totalBathrooms}</div>
                            <div className="text-sm text-gray-600">Bathrooms</div>
                          </div>
                        )}
                        {maxGuests && (
                          <div className="text-center">
                            <Users className="w-8 h-8 mx-auto mb-2 text-[#02665e]" />
                            <div className="text-2xl font-bold text-gray-900">{maxGuests}</div>
                            <div className="text-sm text-gray-600">Max Guests</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  </div>
  );
}

/* Small pieces */
function Num({label,v,set}:{label:string; v:number|""; set:(v:number|"")=>void}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
      <input type="number" value={v} onChange={e=>set(numOrEmpty(e.target.value))} className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-primary-500 focus:border-transparent" placeholder="0" />
    </div>
  );
}


/** Facilities mini-components */
function AddFacilityInline({ onAdd }:{ onAdd:(f:NearbyFacility)=>void }) {
  const [type, setType] = useState<FacilityType>("Hospital");
  const [name, setName] = useState("");
  const [ownership, setOwnership] = useState<"Public/Government"|"Private"|"">("");
  const [distanceKm, setDistanceKm] = useState<number| "">("");
  const [reachableBy, setReachableBy] = useState<ReachMode[]>([]);
  const [url, setUrl] = useState("");

  // allow multiple selection: toggle presence in array
  const toggleMode = (m: ReachMode) =>
    setReachableBy(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  const canAdd = name.trim().length >= 2;

  const add = () => {
    if (!canAdd) return;
    onAdd({
      id: cryptoId(),
      type, name, ownership,
      distanceKm,
      reachableBy,
      url: url || undefined,
    });
    // reset
    setName(""); setOwnership(""); setDistanceKm(""); setReachableBy([]); setUrl("");
  };

  // Get context-aware placeholder based on selected type
  const namePlaceholder = FACILITY_PLACEHOLDERS[type] || "e.g. Facility name";

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300">
      <div className="space-y-5">
        {/* Type section - Full width with distinct styling */}
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 sm:p-5 border-2 border-slate-200">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="p-1.5 bg-[#02665e]/10 rounded-lg">
              <Building2 className="w-4 h-4 text-[#02665e]" />
            </div>
            <LabelSmall className="font-bold text-gray-800 text-sm">Facility Type</LabelSmall>
          </div>
          <div role="radiogroup" aria-label="Facility type" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {FACILITY_TYPES.map(t => {
              const sel = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => {
                    setType(t);
                    // Reset fields when type changes to show new context
                    setName("");
                    setOwnership("");
                  }}
                  className={`text-xs font-medium px-3 py-2.5 rounded-lg border transition-all duration-300 ease-out text-center motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98] ${
                    sel
                      ? 'bg-[#02665e] text-white border-[#02665e] shadow-md shadow-[#02665e]/20'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Ownership section - Distinct card styling - Only show for Hospital, Pharmacy, Polyclinic, and Clinic */}
        {requiresOwnership(type) && (
          <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-xl p-4 sm:p-5 border-2 border-blue-100">
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Shield className="w-4 h-4 text-blue-700" />
              </div>
              <LabelSmall className="font-bold text-gray-800 text-sm">Ownership Type</LabelSmall>
            </div>
            <div role="radiogroup" aria-label="Ownership" className="grid grid-cols-2 gap-2.5 max-w-md">
              {["Public/Government", "Private"].map(o => {
                const sel = ownership === o;
                return (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    onClick={() => setOwnership(o as any)}
                    className={`text-xs font-medium px-4 py-2.5 rounded-lg border transition-all duration-300 ease-out text-center motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98] ${
                      sel
                        ? 'bg-[#02665e] text-white border-[#02665e] shadow-md shadow-[#02665e]/20'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Name, Distance, and More info row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Name field */}
          <div className="space-y-1.5">
            <LabelSmall className="font-semibold text-gray-700 text-xs">Name</LabelSmall>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 placeholder-gray-400 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-500 transition-all duration-200"
              placeholder={namePlaceholder}
            />
          </div>
          
          {/* Distance field */}
          <div className="space-y-1.5">
            <LabelSmall className="font-semibold text-gray-700 text-xs">Distance (km)</LabelSmall>
            <input
              value={distanceKm as any}
              onChange={e => setDistanceKm(numOrEmpty(e.target.value))}
              type="number" 
              step="0.1"
              min="0"
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 placeholder-gray-400 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-500 transition-all duration-200"
              placeholder="2.5"
            />
          </div>
          
          {/* More info field */}
          <div className="space-y-1.5">
            <LabelSmall className="font-semibold text-gray-700 text-xs">More info (URL)</LabelSmall>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              type="url"
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 placeholder-gray-400 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-500 transition-all duration-200"
              placeholder="https://example.com"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <LabelSmall className="font-semibold text-gray-700 text-sm mb-3">Reachable by</LabelSmall>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" role="group" aria-label="Reachable by">
          {REACH_MODES.map(m => {
            const sel = reachableBy.includes(m);
            const Icon = REACH_ICONS[m as string];
            return (
              <button
                key={m}
                type="button"
                role="checkbox"
                aria-checked={sel}
                onClick={() => toggleMode(m)}
                className={`text-sm font-medium px-3 py-2.5 rounded-lg border flex items-center justify-center gap-2 transition-all duration-200 ${
                  sel 
                    ? 'bg-[#02665e] text-white border-[#02665e] shadow-sm hover:bg-[#02665e]' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                {Icon ? <Icon className={`h-4 w-4 flex-shrink-0 ${sel ? 'text-white' : 'text-gray-600'}`} aria-hidden /> : null}
                <span className="truncate">{m}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
        <button
          type="button"
          onClick={add}
          disabled={!canAdd}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            canAdd 
              ? "bg-[#02665e] text-white hover:bg-[#02665e] hover:shadow-md active:scale-95" 
              : "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300"
          }`}
        >
          Add facility
        </button>
      </div>
    </div>
  );
}

function FacilityRow({
  facility, onChange, onRemove
}:{ facility: NearbyFacility; onChange:(f:NearbyFacility)=>void; onRemove:()=>void }) {

  // allow multiple selection: toggle presence in array
  const toggleMode = (m: ReachMode) => {
    const current = facility.reachableBy || [];
    const next = current.includes(m) ? current.filter(x => x !== m) : [...current, m];
    onChange({ ...facility, reachableBy: next });
  };

  // Get context-aware placeholder based on selected type
  const namePlaceholder = FACILITY_PLACEHOLDERS[facility.type] || "e.g. Facility name";

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300">
      <div className="space-y-5">
        {/* Type section - Full width with distinct styling */}
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 sm:p-5 border-2 border-slate-200">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="p-1.5 bg-[#02665e]/10 rounded-lg">
              <Building2 className="w-4 h-4 text-[#02665e]" />
            </div>
            <LabelSmall className="font-bold text-gray-800 text-sm">Facility Type</LabelSmall>
          </div>
          <div role="radiogroup" aria-label={`Facility type for ${facility.name || 'facility'}`} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {FACILITY_TYPES.map(t => {
              const sel = facility.type === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => {
                    const updatedFacility: NearbyFacility = { 
                      ...facility, 
                      type: t as FacilityType,
                      ownership: requiresOwnership(t as FacilityType) ? facility.ownership : ""
                    };
                    onChange(updatedFacility);
                  }}
                  className={`text-xs font-medium px-3 py-2.5 rounded-lg border transition-all duration-300 ease-out text-center motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98] ${
                    sel
                      ? 'bg-[#02665e] text-white border-[#02665e] shadow-md shadow-[#02665e]/20'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Ownership section - Distinct card styling - Only show for Hospital, Pharmacy, Polyclinic, and Clinic */}
        {requiresOwnership(facility.type) && (
          <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-xl p-4 sm:p-5 border-2 border-blue-100">
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Shield className="w-4 h-4 text-blue-700" />
              </div>
              <LabelSmall className="font-bold text-gray-800 text-sm">Ownership Type</LabelSmall>
            </div>
            <div role="radiogroup" aria-label="Ownership" className="grid grid-cols-2 gap-2.5 max-w-md">
              {["Public/Government", "Private"].map(o => {
                const sel = facility.ownership === o;
                return (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    onClick={() => onChange({ ...facility, ownership: o as any })}
                    className={`text-xs font-medium px-4 py-2.5 rounded-lg border transition-all duration-300 ease-out text-center motion-safe:hover:scale-[1.02] motion-safe:active:scale-[0.98] ${
                      sel
                        ? 'bg-[#02665e] text-white border-[#02665e] shadow-md shadow-[#02665e]/20'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Name, Distance, and More info row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Name field */}
          <div className="space-y-1.5">
            <LabelSmall className="font-semibold text-gray-700 text-xs">Name</LabelSmall>
            <input
              title="Facility name"
              placeholder={namePlaceholder}
              value={facility.name}
              onChange={e => onChange({ ...facility, name: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 placeholder-gray-400 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-500 transition-all duration-200"
            />
          </div>
          
          {/* Distance field */}
          <div className="space-y-1.5">
            <LabelSmall className="font-semibold text-gray-700 text-xs">Distance (km)</LabelSmall>
            <input
              title="Distance (km)"
              placeholder="2.5"
              value={facility.distanceKm as any}
              onChange={e => onChange({ ...facility, distanceKm: numOrEmpty(e.target.value) })}
              type="number" 
              step="0.1"
              min="0"
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 placeholder-gray-400 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-500 transition-all duration-200"
            />
          </div>
          
          {/* More info field */}
          <div className="space-y-1.5">
            <LabelSmall className="font-semibold text-gray-700 text-xs">More info (URL)</LabelSmall>
            <input
              title="More info (URL)"
              placeholder="https://example.com"
              value={facility.url ?? ""}
              onChange={e => onChange({ ...facility, url: e.target.value })}
              type="url"
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 placeholder-gray-400 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-500 transition-all duration-200"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <LabelSmall className="font-semibold text-gray-700 text-sm mb-3">Reachable by</LabelSmall>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" role="group" aria-label={`Reachable by for ${facility.name || 'facility'}`}> 
          {REACH_MODES.map(m => {
            const sel = facility.reachableBy.includes(m as ReachMode);
            const Icon = REACH_ICONS[m as string];
            return (
              <button
                key={m}
                type="button"
                role="checkbox"
                aria-checked={sel}
                onClick={() => toggleMode(m as ReachMode)}
                className={`text-sm font-medium px-3 py-2.5 rounded-lg border flex items-center justify-center gap-2 transition-all duration-200 ${
                  sel 
                    ? 'bg-[#02665e] text-white border-[#02665e] shadow-sm hover:bg-[#02665e]' 
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                {Icon ? <Icon className={`h-4 w-4 flex-shrink-0 ${sel ? 'text-white' : 'text-gray-600'}`} aria-hidden /> : null}
                <span className="truncate">{m}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
        <button 
          type="button" 
          onClick={onRemove} 
          className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 hover:border-gray-400 active:scale-95 transition-all duration-200"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function LabelSmall({children, className=""}:{children:ReactNode; className?:string}) {
  return <label className={`block text-xs text-gray-600 ${className}`}>{children}</label>;
}

/* utils */
function numOrEmpty(v: string|number){ if (v === "" || v == null) return ""; const n = Number(v); return Number.isFinite(n) ? n : ""; }
function numOrNull(v: any){ return v==="" || v==null ? null : Number(v); }
function splitComma(s:string){ return s.split(",").map(x=>x.trim()).filter(Boolean); }
function inferBasePrice(rooms: any[]){ 
  const prices = rooms.map(r => {
    // Try multiple possible field names for price
    const price = r.pricePerNight || r.price || 0;
    const numPrice = Number(price);
    return numPrice > 0 ? numPrice : 0;
  }).filter(n => n > 0); 
  const result = prices.length ? Math.min(...prices) : null;
  // Debug logging
  console.log('[inferBasePrice]', { 
    roomsCount: rooms.length, 
    rooms: rooms.map(r => ({ pricePerNight: r.pricePerNight, price: r.price })), 
    prices, 
    result 
  });
  return result;
}
function toServerType(t: string){
  const map: Record<string,string> = { "Guest House":"GUEST_HOUSE", "Townhouse":"TOWNHOUSE", "Other":"OTHER" };
  const up = t.toUpperCase().replace(/\s+/g,"_");
  return (map[t] ?? up);
}
function cryptoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

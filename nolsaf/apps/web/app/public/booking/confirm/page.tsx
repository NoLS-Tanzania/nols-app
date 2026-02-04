"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Calendar,
  Users,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Info,
  Car,
  Navigation,
  Edit2,
  Plane,
} from "lucide-react";
import DatePicker from "../../../../components/ui/DatePicker";
import { 
  getPropertyCommission, 
  calculatePriceWithCommission 
} from "../../../../lib/priceUtils";
import {
  calculateTransportFare,
  getFareBreakdown,
  type Location,
  type TransportVehicleType,
  getVehicleTypeLabel,
} from "../../../../lib/transportFareCalculator";

type PickupPreset = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  arrivalType: "FLIGHT" | "BUS" | "TRAIN" | "FERRY" | "OTHER";
};

const PICKUP_PRESETS: PickupPreset[] = [
  {
    id: "JNIA",
    label: "Julius Nyerere International Airport (DAR)",
    lat: -6.878111,
    lng: 39.202625,
    arrivalType: "FLIGHT",
  },
  {
    id: "ZNZ",
    label: "Abeid Amani Karume International Airport (ZNZ)",
    lat: -6.222025,
    lng: 39.224886,
    arrivalType: "FLIGHT",
  },
  {
    id: "Ubungo",
    label: "Ubungo Bus Terminal (Dar es Salaam)",
    lat: -6.77239,
    lng: 39.21432,
    arrivalType: "BUS",
  },
];

type Property = {
  id: number;
  title: string;
  type: string;
  regionName: string | null;
  district: string | null;
  city: string | null;
  primaryImage: string | null;
  basePrice: number | null;
  currency: string | null;
  maxGuests: number | null;
  totalBedrooms: number | null;
  totalBathrooms: number | null;
  latitude: number | null;
  longitude: number | null;
  roomsSpec?: any; // Room specifications array
};

type BookingData = {
  propertyId: number;
  checkIn: string;
  checkOut: string | null;
  adults: number;
  children: number;
  pets: number;
  rooms: number;
};

export default function BookingConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);

  const availabilityAbortRef = useRef<AbortController | null>(null);
  const availabilityDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [availabilityState, setAvailabilityState] = useState<{
    status: "idle" | "checking" | "available" | "unavailable";
    message?: string;
  }>({ status: "idle" });
  
  // Guest information form
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [nationality, setNationality] = useState("");
  const [sex, setSex] = useState<"Male" | "Female" | "Other" | "">("");
  const [ageGroup] = useState<"Adult" | "Child" | "">("Adult");
  const [specialRequests, setSpecialRequests] = useState("");
  
  // Transportation
  const [includeTransport, setIncludeTransport] = useState(false);
  const [transportVehicleType, setTransportVehicleType] = useState<TransportVehicleType>("CAR");
  const [pickupMode, setPickupMode] = useState<"current" | "arrival" | "manual">("current");
  const [pickupPresetId, setPickupPresetId] = useState<string>("");
  const [transportOriginAddress, setTransportOriginAddress] = useState("");
  const [transportOriginLat, setTransportOriginLat] = useState<number | null>(null);
  const [transportOriginLng, setTransportOriginLng] = useState<number | null>(null);
  const [transportFare, setTransportFare] = useState<number | null>(null);
  const [calculatingFare, setCalculatingFare] = useState(false);
  const [transportPickupError, setTransportPickupError] = useState<string | null>(null);
  // Flexible arrival fields
  const [arrivalType, setArrivalType] = useState<"FLIGHT" | "BUS" | "TRAIN" | "FERRY" | "OTHER" | "">("");
  const [arrivalNumber, setArrivalNumber] = useState("");
  const [transportCompany, setTransportCompany] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [arrivalDate, setArrivalDate] = useState<string>("");
  const [arrivalTimeHour, setArrivalTimeHour] = useState<string>("");
  const [arrivalTimeMinute, setArrivalTimeMinute] = useState<string>("");
  const [arrivalDatePickerOpen, setArrivalDatePickerOpen] = useState(false);
  const [isGuestSelectorOpen, setIsGuestSelectorOpen] = useState(false);
  const [checkInPickerOpen, setCheckInPickerOpen] = useState(false);
  const [checkOutPickerOpen, setCheckOutPickerOpen] = useState(false);

  const [selectedRoomCode, setSelectedRoomCode] = useState<string | null>(null);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState<number | null>(null);

  const requiresArrivalInfo = includeTransport && pickupMode === "arrival" && !!pickupPresetId;
  const arrivalTypeLocked = requiresArrivalInfo;

  function sanitizePhoneInput(value: string): string {
    const raw = String(value ?? "");
    const keep = raw.replace(/[^0-9+\s-]/g, "");
    const compact = keep.replace(/-/g, " ").replace(/\s+/g, " ");
    // Allow '+' only at the first character.
    return compact.replace(/\+/g, (m, offset) => (offset === 0 ? m : ""));
  }

  function normalizeTzPhoneForApi(value: string): string | null {
    const raw = String(value ?? "").trim();
    if (!raw) return null;

    // Keep only digits (+ allowed but removed for digit parsing)
    const compact = raw.replace(/\s+/g, "").replace(/-/g, "");
    const digits = compact.replace(/^\+/, "").replace(/\D+/g, "");

    // Accept: 9 digits => assume TZ local without leading 0
    if (digits.length === 9) return `+255${digits}`;

    // Accept: 0XXXXXXXXX
    if (digits.length === 10 && digits.startsWith("0")) return `+255${digits.slice(1)}`;

    // Accept: 255XXXXXXXXX or +255XXXXXXXXX
    if (digits.length === 12 && digits.startsWith("255")) return `+255${digits.slice(3)}`;

    return null;
  }

  function isValidEmail(value: string): boolean {
    const v = String(value ?? "").trim();
    if (!v) return true;
    // Simple, practical email validation (server still validates).
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function sanitizeNationalityInput(value: string): string {
    const raw = String(value ?? "");
    // Remove digits; keep letters/spaces/punctuation the user might reasonably type.
    const noDigits = raw.replace(/\d+/g, "");
    return noDigits.replace(/\s+/g, " ");
  }

  const normalizedPhoneForApi = normalizeTzPhoneForApi(guestPhone);
  const normalizedEmailForApi = guestEmail.trim().replace(/\s+/g, "");
  const phoneInlineError = phoneTouched && !normalizedPhoneForApi ? "Enter a valid phone (e.g., +2557XXXXXXXX, 07XXXXXXXX, or 7XXXXXXXX)." : null;
  const emailInlineError = emailTouched && normalizedEmailForApi && !isValidEmail(normalizedEmailForApi) ? "Enter a valid email address." : null;

  function getRoomCodeForAvailabilityCheck(): string | null {
    if (selectedRoomCode) return selectedRoomCode;
    if (selectedRoomIndex === null) return null;

    const spec: any = (property as any)?.roomsSpec;
    let roomTypes: any[] = [];
    if (spec && typeof spec === "object") {
      if (Array.isArray(spec)) roomTypes = spec;
      else if (Array.isArray((spec as any).rooms)) roomTypes = (spec as any).rooms;
    }

    const rt = roomTypes?.[selectedRoomIndex];
    const rawKey = String(rt?.code ?? rt?.roomCode ?? rt?.roomType ?? rt?.type ?? rt?.name ?? rt?.label ?? "").trim();
    return rawKey || null;
  }

  useEffect(() => {
    // Get booking data from URL params
    const propertyId = searchParams?.get("property");
    const checkIn = searchParams?.get("checkIn");
    const checkOut = searchParams?.get("checkOut");
    const adults = searchParams?.get("adults") || "1";
    const children = searchParams?.get("children") || "0";
    const pets = searchParams?.get("pets") || "0";
    const rooms = searchParams?.get("rooms") || "1";
    const roomCode = searchParams?.get("roomCode");
    const roomIndex = searchParams?.get("roomIndex");

    // Property ID is required and must be a valid number
    const numericPropertyId = propertyId ? Number(propertyId) : null;
    if (!propertyId || !numericPropertyId || isNaN(numericPropertyId) || numericPropertyId <= 0) {
      setError("Missing or invalid property ID");
      setLoading(false);
      return;
    }

    // Set selected room code or index if provided
    if (roomCode) {
      setSelectedRoomCode(roomCode);
      setSelectedRoomIndex(null);
    } else if (roomIndex) {
      const index = Number(roomIndex);
      if (!isNaN(index) && index >= 0) {
        setSelectedRoomIndex(index);
        setSelectedRoomCode(null);
      }
    }

    // Set booking data - dates can be empty initially, user can select them on this page
    setBookingData({
      propertyId: numericPropertyId,
      checkIn: checkIn || "",
      checkOut: checkOut || "",
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      pets: Number(pets) || 0,
      rooms: Math.max(1, Number(rooms) || 1),
    });

    // Fetch property details
    fetchProperty(numericPropertyId);
  }, [searchParams]);

  // Cleanup availability checks on unmount
  useEffect(() => {
    return () => {
      if (availabilityDebounceRef.current) clearTimeout(availabilityDebounceRef.current);
      if (availabilityAbortRef.current) availabilityAbortRef.current.abort();
    };
  }, []);

  // Re-check availability when dates/room selection changes (pre-payment validation)
  useEffect(() => {
    if (!bookingData?.propertyId) return;

    const checkInRaw = bookingData.checkIn;
    const checkOutRaw = bookingData.checkOut;

    if (!checkInRaw || !checkOutRaw) {
      setAvailabilityState({ status: "idle" });
      return;
    }

    const checkInDate = new Date(checkInRaw);
    const checkOutDate = new Date(checkOutRaw);
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {
      setAvailabilityState({ status: "idle" });
      return;
    }

    if (availabilityDebounceRef.current) clearTimeout(availabilityDebounceRef.current);
    if (availabilityAbortRef.current) availabilityAbortRef.current.abort();

    setAvailabilityState({ status: "checking" });
    availabilityDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      availabilityAbortRef.current = controller;

      try {
        const roomCode = getRoomCodeForAvailabilityCheck();
        const response = await fetch("/api/public/availability/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            propertyId: bookingData.propertyId,
            checkIn: checkInDate.toISOString(),
            checkOut: checkOutDate.toISOString(),
            roomCode: roomCode || null,
          }),
        });

        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.includes("application/json") ? await response.json() : null;

        if (!response.ok) {
          const msg =
            payload?.error ||
            payload?.message ||
            `Availability check failed (HTTP ${response.status})`;
          setAvailabilityState({ status: "unavailable", message: msg });
          return;
        }

        const available = !!payload?.available;
        if (available) {
          setAvailabilityState({ status: "available" });
        } else {
          const summary = payload?.summary;
          const msg =
            typeof summary?.totalAvailableRooms === "number" && typeof summary?.totalAvailableBeds === "number"
              ? summary.totalAvailableRooms === 0 && summary.totalAvailableBeds === 0
                ? "No availability for these dates (0 rooms, 0 beds)."
                : `Limited availability: ${summary.totalAvailableRooms} rooms, ${summary.totalAvailableBeds} beds.`
              : "No availability for these dates.";
          setAvailabilityState({ status: "unavailable", message: msg });
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setAvailabilityState({
          status: "unavailable",
          message: "Could not verify availability right now. Please try again.",
        });
      }
    }, 350);
  }, [
    bookingData?.propertyId,
    bookingData?.checkIn,
    bookingData?.checkOut,
    selectedRoomCode,
    selectedRoomIndex,
    (property as any)?.roomsSpec,
  ]);

  async function fetchProperty(propertyId: number) {
    // Validate propertyId is a valid number
    if (!propertyId || isNaN(propertyId) || propertyId <= 0) {
      setError("Invalid property ID");
      setLoading(false);
      return;
    }

    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
      
      // Add timeout to prevent hanging requests (15 seconds should be enough)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(`${API_BASE}/api/public/properties/${propertyId}`, {
        signal: controller.signal,
        cache: 'no-store', // Don't cache this request
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 404) {
          throw new Error(`Property #${propertyId} not found or not approved for public viewing`);
        } else if (response.status === 400) {
          throw new Error(`Invalid property ID: ${propertyId}`);
        } else if (response.status >= 500) {
          throw new Error(`Server error: Please try again later`);
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.message || `Failed to fetch property (${response.status})`);
        }
      }

      const data = await response.json().catch((parseErr) => {
        throw new Error(`Invalid response from server: ${parseErr?.message || 'Unknown error'}`);
      });
      
      // API returns { property: {...} } so we need to extract the property object
      const propertyData = data.property || data;
      
      // Validate property data structure
      if (!propertyData || typeof propertyData !== 'object' || !propertyData.id) {
        throw new Error('Invalid property data received from server');
      }
      
      setProperty(propertyData);
      setError(null); // Clear any previous errors
      
      // Debug: Log property data structure
      if (process.env.NODE_ENV === 'development') {
        console.log('Property loaded successfully:', {
          id: propertyData.id,
          title: propertyData.title,
          basePrice: propertyData.basePrice,
          currency: propertyData.currency,
          hasRoomsSpec: !!propertyData.roomsSpec,
          roomsSpecType: typeof propertyData.roomsSpec,
          roomsSpecIsArray: Array.isArray(propertyData.roomsSpec),
          roomsSpecLength: Array.isArray(propertyData.roomsSpec) ? propertyData.roomsSpec.length : 0,
          status: propertyData.status,
        });
      }
    } catch (err: any) {
      // Handle AbortError (timeout)
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError("Failed to load property. Please try again.");
      }
      
      // Log error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('Property fetch error:', {
          propertyId,
          error: err?.message || err,
          name: err?.name,
          stack: err?.stack,
        });
      }
      
      // Set property to null so UI can handle error state
      setProperty(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!bookingData || !property) {
      setError("Missing booking information");
      setSubmitting(false);
      return;
    }

    // Validate dates
    if (!bookingData.checkIn || !bookingData.checkOut) {
      setError("Please select check-in and check-out dates");
      setSubmitting(false);
      return;
    }

    // Validate dates are valid
    const checkInDate = new Date(bookingData.checkIn);
    const checkOutDate = new Date(bookingData.checkOut);
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      setError("Please enter valid dates");
      setSubmitting(false);
      return;
    }

    // Validate check-out is after check-in
    if (checkOutDate <= checkInDate) {
      setError("Check-out date must be after check-in date");
      setSubmitting(false);
      return;
    }

    // Pre-payment availability gate (server-side booking creation will still re-check under lock)
    if (availabilityState.status === "checking") {
      setError("Checking availability... please wait a moment.");
      setSubmitting(false);
      return;
    }
    if (availabilityState.status === "unavailable") {
      setError(availabilityState.message || "Selected dates are no longer available. Please choose different dates.");
      setSubmitting(false);
      return;
    }

    if (checkOutDate <= checkInDate) {
      setError("Check-out date must be after check-in date");
      setSubmitting(false);
      return;
    }

    // Validate form
    if (!guestName.trim()) {
      setError("Please enter your full name");
      setSubmitting(false);
      return;
    }

    if (!guestPhone.trim()) {
      setError("Please enter your phone number");
      setSubmitting(false);
      return;
    }

    // Phone: normalize to TZ (+255XXXXXXXXX) and block invalid/short numbers before API
    const phoneForApi = normalizeTzPhoneForApi(guestPhone);
    if (!phoneForApi) {
      setError("Please enter a valid phone number. Example: +255 7XX XXX XXX or 07XX XXX XXX.");
      setSubmitting(false);
      return;
    }

    // Email: optional, but if provided it must be valid
    const emailForApi = guestEmail.trim().replace(/\s+/g, "");
    if (emailForApi && !isValidEmail(emailForApi)) {
      setError("Please enter a valid email address.");
      setSubmitting(false);
      return;
    }

    if (includeTransport) {
      if (calculatingFare) {
        setError("Calculating transportation fare... please wait a moment.");
        setSubmitting(false);
        return;
      }
      if (transportOriginLat === null || transportOriginLng === null) {
        setError("Please select a pickup location for transportation (Current / Arrival / Type).");
        setSubmitting(false);
        return;
      }
      if (!transportOriginAddress.trim()) {
        setError("Please provide a pickup location name/address.");
        setSubmitting(false);
        return;
      }
      if (transportFare === null || !Number.isFinite(transportFare) || transportFare <= 0) {
        setError("Transport fare is not ready yet. Please set a pickup location.");
        setSubmitting(false);
        return;
      }

      if (requiresArrivalInfo) {
        if (!arrivalType) {
          setError("Please confirm how you are arriving (Flight/Bus/etc).");
          setSubmitting(false);
          return;
        }
        if (!arrivalDate) {
          setError("Please select your arrival date.");
          setSubmitting(false);
          return;
        }
        if (!arrivalTimeHour) {
          setError("Please enter your arrival time (hour).");
          setSubmitting(false);
          return;
        }
        if (!arrivalTimeMinute) {
          setError("Please enter your arrival time (minute).");
          setSubmitting(false);
          return;
        }
        if (!pickupLocation.trim()) {
          setError("Please enter the specific pickup area/terminal (e.g., Terminal 1, Gate 3).");
          setSubmitting(false);
          return;
        }
      }
    }

    try {
      // Convert dates to ISO 8601 format (required by API)
      const checkInISO = checkInDate.toISOString();
      const checkOutISO = checkOutDate.toISOString();
      
      // Prepare request body with proper formatting
      const requestBody = {
        propertyId: bookingData.propertyId,
        checkIn: checkInISO,
        checkOut: checkOutISO,
        guestName: guestName.trim(),
        guestPhone: phoneForApi,
        guestEmail: emailForApi || null,
        nationality: sanitizeNationalityInput(nationality).trim() || null,
        sex: sex || null,
        ageGroup: ageGroup || null,
        adults: bookingData.adults || 1,
        children: bookingData.children || 0,
        pets: bookingData.pets || 0,
        rooms: Math.max(1, Number(bookingData.rooms ?? 1)),
        roomCode: selectedRoomCode || getRoomCodeForAvailabilityCheck(), // Keep consistent with live availability checks
        specialRequests: specialRequests.trim() || null,
        includeTransport: includeTransport || false,
        transportOriginLat: includeTransport && transportOriginLat !== null ? transportOriginLat : null,
        transportOriginLng: includeTransport && transportOriginLng !== null ? transportOriginLng : null,
        transportOriginAddress: includeTransport && transportOriginAddress.trim() ? transportOriginAddress.trim() : null,
        transportFare: includeTransport && transportFare ? transportFare : null,
        transportVehicleType: includeTransport ? transportVehicleType : null,
        // Flexible arrival fields
        arrivalType: includeTransport && arrivalType ? arrivalType : null,
        arrivalNumber: includeTransport && arrivalNumber.trim() ? arrivalNumber.trim() : null,
        transportCompany: includeTransport && transportCompany.trim() ? transportCompany.trim() : null,
        arrivalTime: includeTransport && arrivalDate && (arrivalTimeHour || arrivalTimeMinute) 
          ? (() => {
              const date = new Date(arrivalDate);
              date.setHours(parseInt(arrivalTimeHour || "0") || 0);
              date.setMinutes(parseInt(arrivalTimeMinute || "0") || 0);
              return date.toISOString();
            })()
          : includeTransport && arrivalDate
          ? new Date(arrivalDate).toISOString()
          : null,
        pickupLocation: includeTransport && pickupLocation.trim() ? pickupLocation.trim() : null,
      };
      
      // Create booking
      const bookingResponse = await fetch(`/api/public/bookings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const isDev = process.env.NODE_ENV === "development";

      // Read body once as text, then try to parse JSON (more reliable for error handling).
      const bookingContentType = bookingResponse.headers.get("content-type") || "";
      const bookingBodyText = await bookingResponse.text();
      const bookingResult = (() => {
        if (!bookingBodyText) return null;
        if (!bookingContentType.includes("application/json")) return null;
        try {
          return JSON.parse(bookingBodyText);
        } catch {
          return null;
        }
      })();

      if (!bookingResponse.ok) {
        // Show detailed error message if available
        let errorMessage = (bookingResult as any)?.error || "Failed to create booking";
        
        // Add validation details if available
        if ((bookingResult as any)?.details && Array.isArray((bookingResult as any).details)) {
          const details = (bookingResult as any).details.map((d: any) => 
            `${d.path?.join('.') || 'field'}: ${d.message}`
          ).join(', ');
          errorMessage = `${errorMessage}. ${details}`;
        }
        
        // Add development message if available
        if ((bookingResult as any)?.message) {
          errorMessage = `${errorMessage}. ${(bookingResult as any).message}`;
        }

        // If server returned non-JSON or empty JSON, include HTTP status + raw body.
        if (!bookingResult) {
          const statusMsg = `HTTP ${bookingResponse.status}${bookingResponse.statusText ? ` ${bookingResponse.statusText}` : ""}`;
          const bodyMsg = bookingBodyText ? `Response: ${bookingBodyText}` : "";
          errorMessage = `${errorMessage}. ${statusMsg}${bodyMsg ? `. ${bodyMsg}` : ""}`;
        }
        
        if (isDev) {
          console.error("Booking creation failed:", {
            status: bookingResponse.status,
            statusText: bookingResponse.statusText,
            contentType: bookingContentType,
            error: bookingResult,
            bodyText: bookingBodyText,
            requestBody,
          });
        } else {
          console.error("Booking creation failed:", {
            status: bookingResponse.status,
            statusText: bookingResponse.statusText,
          });
        }
        
        throw new Error(errorMessage);
      }

      if (!bookingResult) {
        const statusMsg = `HTTP ${bookingResponse.status}${bookingResponse.statusText ? ` ${bookingResponse.statusText}` : ""}`;
        throw new Error(`Booking response was not valid JSON. ${statusMsg}${bookingBodyText ? ` Response: ${bookingBodyText}` : ""}`);
      }

      // Create invoice from booking
      const invoiceResponse = await fetch(`/api/public/invoices/from-booking`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookingResult.bookingId,
        }),
      });

      // Read body once as text, then try to parse JSON.
      const invoiceContentType = invoiceResponse.headers.get("content-type") || "";
      const invoiceBodyText = await invoiceResponse.text();
      const invoiceResult = (() => {
        if (!invoiceBodyText) return null;
        if (!invoiceContentType.includes("application/json")) return null;
        try {
          return JSON.parse(invoiceBodyText);
        } catch {
          return null;
        }
      })();

      if (!invoiceResponse.ok) {
        // Show detailed error message if available
        let errorMessage = (invoiceResult as any)?.error || "Failed to create invoice";
        
        // Add validation details if available
        if ((invoiceResult as any)?.details && Array.isArray((invoiceResult as any).details)) {
          const details = (invoiceResult as any).details.map((d: any) => 
            `${d.path?.join('.') || 'field'}: ${d.message}`
          ).join(', ');
          errorMessage = `${errorMessage}. ${details}`;
        }
        
        // Add development message if available
        if ((invoiceResult as any)?.message) {
          errorMessage = `${errorMessage}. ${(invoiceResult as any).message}`;
        }

        if (!invoiceResult) {
          const statusMsg = `HTTP ${invoiceResponse.status}${invoiceResponse.statusText ? ` ${invoiceResponse.statusText}` : ""}`;
          const bodyMsg = invoiceBodyText ? `Response: ${invoiceBodyText}` : "";
          errorMessage = `${errorMessage}. ${statusMsg}${bodyMsg ? `. ${bodyMsg}` : ""}`;
        }
        
        // Log full error details for debugging
        if (isDev) {
          console.error("Invoice creation failed:", {
            status: invoiceResponse.status,
            statusText: invoiceResponse.statusText,
            contentType: invoiceContentType,
            error: invoiceResult,
            bodyText: invoiceBodyText,
            bookingId: bookingResult.bookingId,
          });
        } else {
          console.error("Invoice creation failed:", {
            status: invoiceResponse.status,
            statusText: invoiceResponse.statusText,
          });
        }
        
        throw new Error(errorMessage);
      }

      if (!invoiceResult) {
        const statusMsg = `HTTP ${invoiceResponse.status}${invoiceResponse.statusText ? ` ${invoiceResponse.statusText}` : ""}`;
        throw new Error(`Invoice response was not valid JSON. ${statusMsg}${invoiceBodyText ? ` Response: ${invoiceBodyText}` : ""}`);
      }

      // Redirect to payment page with invoice ID
      router.push(`/public/booking/payment?invoiceId=${invoiceResult.invoiceId}`);
    } catch (err: any) {
      console.error("Booking submission error:", err);
      
      // Extract error message
      let errorMessage = "Failed to create booking. Please try again.";
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Check for network errors
      if (err?.name === 'TypeError' && err?.message?.includes('fetch')) {
        errorMessage = "Network error. Please check your connection and try again.";
      }
      
      setError(errorMessage);
      setSubmitting(false);
    }
  }

  // Calculate pricing
  const nights = bookingData && bookingData.checkIn && bookingData.checkOut
    ? Math.max(
        1,
        Math.ceil(
          (new Date(bookingData.checkOut).getTime() -
            new Date(bookingData.checkIn).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const commissionPercent = getPropertyCommission(property, 0);

  // Calculate price based on selected room or base price
  // Always show the room's price even when nights is 0, so users can see the price while selecting dates
  let basePricePerNight = property?.basePrice ? Number(property.basePrice) : 0;
  
  // Debug logging - enhanced to help diagnose issues
  if (process.env.NODE_ENV === 'development') {
    console.log('Price calculation debug:', {
      hasProperty: !!property,
      propertyId: property?.id,
      propertyTitle: property?.title,
      basePrice: property?.basePrice,
      basePriceType: typeof property?.basePrice,
      currency: property?.currency,
      selectedRoomCode,
      selectedRoomIndex,
      hasRoomsSpec: !!property?.roomsSpec,
      roomsSpecType: typeof property?.roomsSpec,
      roomsSpecIsArray: Array.isArray(property?.roomsSpec),
      roomsSpecLength: Array.isArray(property?.roomsSpec) ? property?.roomsSpec.length : 0,
      loading,
      error,
    });
    
    // Warn if property is missing basePrice
    if (property && (property.basePrice === null || property.basePrice === undefined)) {
      console.warn('⚠️ Property missing basePrice:', {
        id: property.id,
        title: property.title,
        hasRoomsSpec: !!property.roomsSpec,
        suggestion: 'Property may need basePrice set or roomsSpec with prices',
      });
    }
  }
  
  // If a room is selected, use that room's price (this takes priority over basePrice)
  if (property?.roomsSpec && (selectedRoomCode !== null || selectedRoomIndex !== null)) {
    let roomTypes: Array<any> = [];
    if (typeof property.roomsSpec === "object") {
      const spec = property.roomsSpec as any;
      if (Array.isArray(spec)) {
        roomTypes = spec;
      } else if (spec.rooms && Array.isArray(spec.rooms)) {
        roomTypes = spec.rooms;
      } else if (spec && typeof spec === 'object') {
        // Try to extract rooms from any object structure
        roomTypes = Object.values(spec).filter((item: any) => Array.isArray(item) ? item : null).flat();
      }
    }
    
    // Debug: Log room types found
    if (process.env.NODE_ENV === 'development') {
      console.log('Room types extracted:', {
        roomTypesCount: roomTypes.length,
        roomTypes: roomTypes.map((rt: any, idx: number) => ({
          idx,
          code: rt?.code,
          roomCode: rt?.roomCode,
          roomType: rt?.roomType || rt?.name || rt?.label,
          pricePerNight: rt?.pricePerNight,
          price: rt?.price,
          allKeys: Object.keys(rt || {}),
        })),
      });
    }
    
    let selectedRoom: any = null;
    
    // Try to find room by code first
    if (selectedRoomCode) {
      for (let idx = 0; idx < roomTypes.length; idx++) {
        const rt = roomTypes[idx];
        const rtCode = rt?.code || rt?.roomCode;
        if (rtCode === selectedRoomCode) {
          selectedRoom = rt;
          if (process.env.NODE_ENV === 'development') {
            console.log('Room found by code:', { code: selectedRoomCode, room: rt });
          }
          break;
        }
      }
    }
    
    // If not found by code, try by index
    if (!selectedRoom && selectedRoomIndex !== null && selectedRoomIndex >= 0 && selectedRoomIndex < roomTypes.length) {
      selectedRoom = roomTypes[selectedRoomIndex];
      if (process.env.NODE_ENV === 'development') {
        console.log('Room found by index:', { index: selectedRoomIndex, room: selectedRoom });
      }
    }
    
    if (selectedRoom) {
      // Extract price using same logic as normalizeRoomSpec: r?.pricePerNight ?? r?.price
      const priceRaw = selectedRoom.pricePerNight ?? selectedRoom.price ?? null;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Selected room price extraction:', {
          pricePerNight: selectedRoom.pricePerNight,
          price: selectedRoom.price,
          priceRaw,
          allKeys: Object.keys(selectedRoom),
        });
      }
      
      if (priceRaw !== null && priceRaw !== undefined) {
        const numPrice = Number(priceRaw);
        // Check if price is valid and greater than 0
        if (Number.isFinite(numPrice) && numPrice > 0) {
          basePricePerNight = numPrice;
        } else if (Number.isFinite(numPrice) && numPrice === 0 && property?.basePrice) {
          // If room price is 0, fall back to basePrice
          basePricePerNight = Number(property.basePrice);
        }
      } else {
        // If no price found in room, fall back to basePrice
        if (property?.basePrice) {
          basePricePerNight = Number(property.basePrice);
        }
      }
    } else {
      // Room not found - fallback to basePrice
      if (process.env.NODE_ENV === 'development') {
        console.warn('Room not found!', {
          selectedRoomCode,
          selectedRoomIndex,
          roomTypesCount: roomTypes.length,
        });
      }
      if (property?.basePrice) {
        basePricePerNight = Number(property.basePrice);
      }
    }
  }

  const pricePerNight = calculatePriceWithCommission(basePricePerNight, commissionPercent);
  
  // Final debug
  if (process.env.NODE_ENV === 'development') {
    console.log('Final pricePerNight:', pricePerNight);
  }
  
  const roomsQty = Math.max(1, Number(bookingData?.rooms ?? 1));
  const subtotal = pricePerNight * nights * roomsQty;
  const totalAmount = subtotal;
  const currency = property?.currency || "TZS";
  
  // Calculate total including transport
  const finalTotal = totalAmount + (includeTransport && transportFare ? transportFare : 0);
  
  // Auto-calculate fare when transport is enabled and location is available
  useEffect(() => {
    const propertyLat = property?.latitude ?? null;
    const propertyLng = property?.longitude ?? null;
    const propertyCurrency = property?.currency || "TZS";
    if (
      includeTransport &&
      transportOriginLat !== null &&
      transportOriginLng !== null &&
      propertyLat !== null &&
      propertyLng !== null
    ) {
      const origin: Location = {
        latitude: transportOriginLat,
        longitude: transportOriginLng,
        address: transportOriginAddress,
      };

      const destination: Location = {
        latitude: propertyLat,
        longitude: propertyLng,
      };

      let fareAt: Date | undefined;
      if (arrivalDate) {
        const d = new Date(arrivalDate);
        if (!isNaN(d.getTime())) {
          if (arrivalTimeHour) d.setHours(parseInt(arrivalTimeHour) || 0);
          if (arrivalTimeMinute) d.setMinutes(parseInt(arrivalTimeMinute) || 0);
          fareAt = d;
        }
      }

      try {
        const fare = calculateTransportFare(origin, destination, propertyCurrency, fareAt, transportVehicleType);
        setTransportFare(fare.total);
      } catch (err: any) {
        console.error("Fare calculation error:", err);
      }
    } else if (!includeTransport) {
      setTransportFare(null);
      setTransportOriginAddress("");
      setTransportOriginLat(null);
      setTransportOriginLng(null);
      setTransportVehicleType("CAR");
      setPickupMode("current");
      setPickupPresetId("");
      setTransportPickupError(null);
    }
  }, [
    includeTransport,
    transportOriginLat,
    transportOriginLng,
    transportOriginAddress,
    transportVehicleType,
    property?.id,
    property?.latitude,
    property?.longitude,
    property?.currency,
    arrivalDate,
    arrivalTimeHour,
    arrivalTimeMinute,
  ]);

  // When switching pickup mode, reset coordinates so fare is recalculated from the chosen method
  useEffect(() => {
    if (!includeTransport) return;
    setTransportPickupError(null);
    setTransportFare(null);
    setTransportOriginLat(null);
    setTransportOriginLng(null);
    if (pickupMode !== "arrival") setPickupPresetId("");
  }, [pickupMode, includeTransport]);
  
  // Function to calculate transport fare manually (when user clicks calculate)
  // (manual fare calculation removed; fare is auto-calculated when location is available)

  // Handle location access
  function handleGetLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setCalculatingFare(true);
    setTransportPickupError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTransportOriginLat(position.coords.latitude);
        setTransportOriginLng(position.coords.longitude);
        setCalculatingFare(false);
        // Auto-calculate fare will be triggered by useEffect
      },
      () => {
        setTransportPickupError("Unable to get your current location. You can select an arrival point (airport) or type a pickup address.");
        setCalculatingFare(false);
      }
    );
  }

  async function handleGeocodePickupAddress() {
    const q = transportOriginAddress.trim();
    if (!q) {
      setTransportPickupError("Please enter a pickup address or place name.");
      return;
    }

    setCalculatingFare(true);
    setTransportPickupError(null);
    try {
      const resp = await fetch("/api/geocoding/public/forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, country: "TZ", limit: 3 }),
      });

      const contentType = resp.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? await resp.json() : null;

      if (!resp.ok) {
        const msg = payload?.error || payload?.message || `Geocoding failed (HTTP ${resp.status})`;
        setTransportPickupError(msg);
        return;
      }

      const best = payload?.features?.[0];
      const coords = best?.coordinates;
      const lng = Array.isArray(coords) ? Number(coords[0]) : NaN;
      const lat = Array.isArray(coords) ? Number(coords[1]) : NaN;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setTransportPickupError("We couldn't find that pickup location. Try a more specific place (e.g., street + area + city).");
        return;
      }

      setTransportOriginLat(lat);
      setTransportOriginLng(lng);
      const placeName = String(best?.placeName || "").trim();
      if (placeName) setTransportOriginAddress(placeName);
    } catch (e) {
      setTransportPickupError("Unable to look up that pickup location right now. Please try again.");
    } finally {
      setCalculatingFare(false);
    }
  }

  function handleSelectPickupPreset(id: string) {
    setPickupPresetId(id);
    const preset = PICKUP_PRESETS.find((p) => p.id === id);
    if (!preset) {
      setTransportOriginLat(null);
      setTransportOriginLng(null);
      setTransportOriginAddress("");
      setArrivalType("");
      return;
    }
    setTransportOriginLat(preset.lat);
    setTransportOriginLng(preset.lng);
    setTransportOriginAddress(preset.label);
    setTransportPickupError(null);

    // Auto-fill arrival type based on selected pickup point.
    setArrivalType(preset.arrivalType);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        <div className="text-center animate-in fade-in duration-300">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-[#02665e] mx-auto mb-4" />
            <div className="absolute inset-0 w-12 h-12 mx-auto border-4 border-[#02665e]/20 rounded-full"></div>
          </div>
          <p className="text-slate-700 font-medium text-lg">Loading booking details...</p>
          <p className="text-slate-500 text-sm mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-6">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-red-200/60 p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Error</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">{error}</p>
          <Link
            href="/public/properties"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-[#02665e] to-[#014e47] text-white font-semibold hover:from-[#014e47] hover:to-[#02665e] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
          >
            Browse Properties
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href={property ? `/public/properties/${property.id}` : "/public/properties"}
            className="inline-flex items-center text-slate-600 hover:text-[#02665e] transition-all duration-200 group"
          >
            <ChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium">Back to property</span>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Summary */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 p-4 sm:p-6 lg:p-8 transition-all duration-300 hover:shadow-xl overflow-hidden">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-4 sm:mb-6 lg:mb-8">
                Booking Summary
              </h2>

              {property && (
                <div className="space-y-4 overflow-x-hidden">
                  {/* Property Details Card - Name & Location */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200/60 shadow-sm mb-4">
                    <h3 className="text-base font-bold text-slate-900 truncate mb-2">
                      {property.title}
                    </h3>
                    {/* Property Location */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-[#02665e]" />
                      <span className="truncate">
                        {[
                          property.city,
                          property.district,
                          property.regionName,
                        ]
                          .filter(Boolean)
                          .join(", ") || "Location not specified"}
                      </span>
                    </div>
                  </div>
                  
                  {/* Property Label Section */}
                  <div className="pb-4 border-b border-slate-200/60">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      PROPERTY
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 truncate">
                      {property.title}
                    </h3>
                    <div className="text-sm text-slate-500 mt-1">
                      {property.type || "Property"}
                    </div>
                  </div>

                  {/* Dates & Guests */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 pt-6 border-t border-slate-200/60">
                    <div className="space-y-1.5 sm:space-y-2 min-w-0 w-full">
                      <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1 sm:gap-1.5">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#02665e] flex-shrink-0" />
                        <span className="whitespace-nowrap">Check-in</span>
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setCheckInPickerOpen(true)}
                          className="w-full min-w-0 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 pl-8 sm:pl-10 md:pl-11 pr-8 sm:pr-10 md:pr-11 border-2 border-slate-300 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-gradient-to-r from-slate-50 to-blue-50/50 shadow-sm max-w-full box-border flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#02665e] flex-shrink-0" />
                            <span className="text-slate-900 truncate text-xs sm:text-sm">
                              {bookingData?.checkIn
                                ? (() => {
                                    const date = new Date(bookingData.checkIn);
                                    const day = String(date.getDate()).padStart(2, "0");
                                    const month = String(date.getMonth() + 1).padStart(2, "0");
                                    const year = date.getFullYear();
                                    return `${day} / ${month} / ${year}`;
                                  })()
                                : "Select"}
                            </span>
                          </div>
                          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-[#02665e] transition-colors flex-shrink-0" />
                        </button>
                        {checkInPickerOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setCheckInPickerOpen(false)} />
                            <div className="absolute z-50 top-full left-0 mt-2">
                              <DatePicker
                                selected={bookingData?.checkIn || undefined}
                                onSelectAction={(s) => {
                                  const date = Array.isArray(s) ? s[0] : s;
                                  if (bookingData && date) {
                                    const newCheckIn = date;
                                    // If check-out is before new check-in, reset check-out
                                    let newCheckOut: string | null = bookingData.checkOut;
                                    if (newCheckOut && new Date(newCheckOut) <= new Date(newCheckIn)) {
                                      newCheckOut = null;
                                    }
                                    setBookingData({ ...bookingData, checkIn: newCheckIn, checkOut: newCheckOut ?? null });
                                  }
                                  setCheckInPickerOpen(false);
                                }}
                                onCloseAction={() => setCheckInPickerOpen(false)}
                                allowRange={false}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2 min-w-0 w-full">
                      <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1 sm:gap-1.5">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#02665e] flex-shrink-0" />
                        <span className="whitespace-nowrap">Check-out</span>
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setCheckOutPickerOpen(true)}
                          className="w-full min-w-0 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 pl-8 sm:pl-10 md:pl-11 pr-8 sm:pr-10 md:pr-11 border-2 border-slate-300 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-gradient-to-r from-slate-50 to-blue-50/50 shadow-sm max-w-full box-border flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#02665e] flex-shrink-0" />
                            <span className="text-slate-900 truncate text-xs sm:text-sm">
                              {bookingData?.checkOut
                                ? (() => {
                                    const date = new Date(bookingData.checkOut);
                                    const day = String(date.getDate()).padStart(2, "0");
                                    const month = String(date.getMonth() + 1).padStart(2, "0");
                                    const year = date.getFullYear();
                                    return `${day} / ${month} / ${year}`;
                                  })()
                                : "Select"}
                            </span>
                          </div>
                          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-[#02665e] transition-colors flex-shrink-0" />
                        </button>
                        {checkOutPickerOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setCheckOutPickerOpen(false)} />
                            <div className="absolute z-50 top-full left-0 mt-2">
                              <DatePicker
                                selected={bookingData?.checkOut || undefined}
                                onSelectAction={(s) => {
                                  const date = Array.isArray(s) ? s[0] : s;
                                  if (bookingData && date) {
                                    // Validate that check-out is after check-in
                                    if (bookingData.checkIn && new Date(date) <= new Date(bookingData.checkIn)) {
                                      // Show error message
                                      setError("Check-out date must be after check-in date");
                                      setCheckOutPickerOpen(false);
                                      return;
                                    }
                                    setError(null); // Clear any previous errors
                                    setBookingData({ ...bookingData, checkOut: date });
                                  }
                                  setCheckOutPickerOpen(false);
                                }}
                                onCloseAction={() => setCheckOutPickerOpen(false)}
                                allowRange={false}
                                minDate={bookingData?.checkIn ? (() => {
                                  // Set minimum date to check-in date + 1 day
                                  const checkInDate = new Date(bookingData.checkIn);
                                  checkInDate.setDate(checkInDate.getDate() + 1);
                                  const year = checkInDate.getFullYear();
                                  const month = String(checkInDate.getMonth() + 1).padStart(2, "0");
                                  const day = String(checkInDate.getDate()).padStart(2, "0");
                                  return `${year}-${month}-${day}`;
                                })() : undefined}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Guests & Duration - Two Column Layout */}
                  <div className="pt-4 sm:pt-6 border-t border-slate-200/60">
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
                      {/* Guests Section - Collapsible Editable */}
                      <div className="space-y-1.5 sm:space-y-2 min-w-0 w-full">
                        <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1 sm:gap-1.5">
                          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#02665e] flex-shrink-0" />
                          <span className="whitespace-nowrap">Guests</span>
                        </label>
                        
                        {!isGuestSelectorOpen ? (
                          // Summary View (Collapsed)
                          <button
                            type="button"
                            onClick={() => setIsGuestSelectorOpen(true)}
                            className="w-full flex items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-lg sm:rounded-xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200 hover:border-[#02665e]/40 group"
                          >
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#02665e] flex-shrink-0" />
                              <span className="text-slate-900 font-semibold text-xs sm:text-sm md:text-base truncate">
                                {bookingData?.adults || 1} adult{(bookingData?.adults || 1) !== 1 ? "s" : ""}
                                {bookingData?.children ? `, ${bookingData.children} child${bookingData.children !== 1 ? "ren" : ""}` : ""}
                                {bookingData?.pets ? `, ${bookingData.pets} pet${bookingData.pets !== 1 ? "s" : ""}` : ""}
                              </span>
                            </div>
                            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-[#02665e] transition-colors flex-shrink-0" />
                          </button>
                        ) : (
                          // Editable View (Expanded)
                          <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-xl border border-slate-200/60 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-slate-200/60">
                              <span className="text-sm sm:text-base font-semibold text-slate-700">Select Guests</span>
                              <button
                                type="button"
                                onClick={() => setIsGuestSelectorOpen(false)}
                                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-[#02665e] text-white hover:bg-[#014e47] font-medium transition-all duration-200 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm shadow-sm hover:shadow-md"
                              >
                                Done
                                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                            
                            <div className="space-y-3 sm:space-y-4">
                              {/* Adults */}
                              <div className="flex items-center justify-between gap-2 sm:gap-3">
                                <label className="text-sm sm:text-base font-medium text-slate-700 min-w-[80px] sm:min-w-[100px]">
                                  Adults <span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (bookingData) {
                                        const newAdults = Math.max(1, (bookingData.adults || 1) - 1);
                                        setBookingData({ ...bookingData, adults: newAdults });
                                      }
                                    }}
                                    className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 hover:border-[#02665e] active:border-[#02665e] transition-all duration-200 flex items-center justify-center text-slate-600 hover:text-[#02665e] active:text-[#02665e] font-bold text-lg sm:text-lg touch-manipulation"
                                  >
                                    −
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={bookingData?.adults || 1}
                                    aria-label="Adults"
                                    title="Adults"
                                    onChange={(e) => {
                                      if (bookingData) {
                                        const value = Math.max(1, parseInt(e.target.value) || 1);
                                        setBookingData({ ...bookingData, adults: value });
                                      }
                                    }}
                                    className="w-14 sm:w-16 text-center px-2 py-1.5 sm:py-2 border-2 border-slate-300 rounded-lg text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (bookingData) {
                                        const newAdults = (bookingData.adults || 1) + 1;
                                        setBookingData({ ...bookingData, adults: newAdults });
                                      }
                                    }}
                                    className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 hover:border-[#02665e] active:border-[#02665e] transition-all duration-200 flex items-center justify-center text-slate-600 hover:text-[#02665e] active:text-[#02665e] font-bold text-lg sm:text-lg touch-manipulation"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                              
                              {/* Child */}
                              <div className="flex items-center justify-between gap-2 sm:gap-3">
                                <label className="text-sm sm:text-base font-medium text-slate-700 min-w-[80px] sm:min-w-[100px]">
                                  Child
                                </label>
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (bookingData) {
                                        const newChildren = Math.max(0, (bookingData.children || 0) - 1);
                                        setBookingData({ ...bookingData, children: newChildren });
                                      }
                                    }}
                                    className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 hover:border-[#02665e] active:border-[#02665e] transition-all duration-200 flex items-center justify-center text-slate-600 hover:text-[#02665e] active:text-[#02665e] font-bold text-lg sm:text-lg touch-manipulation"
                                  >
                                    −
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={bookingData?.children || 0}
                                    aria-label="Children"
                                    title="Children"
                                    onChange={(e) => {
                                      if (bookingData) {
                                        const value = Math.max(0, parseInt(e.target.value) || 0);
                                        setBookingData({ ...bookingData, children: value });
                                      }
                                    }}
                                    className="w-14 sm:w-16 text-center px-2 py-1.5 sm:py-2 border-2 border-slate-300 rounded-lg text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (bookingData) {
                                        const newChildren = (bookingData.children || 0) + 1;
                                        setBookingData({ ...bookingData, children: newChildren });
                                      }
                                    }}
                                    className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 hover:border-[#02665e] active:border-[#02665e] transition-all duration-200 flex items-center justify-center text-slate-600 hover:text-[#02665e] active:text-[#02665e] font-bold text-lg sm:text-lg touch-manipulation"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Pets */}
                              <div className="flex items-center justify-between gap-2 sm:gap-3">
                                <label className="text-sm sm:text-base font-medium text-slate-700 min-w-[80px] sm:min-w-[100px]">
                                  Pets
                                </label>
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (bookingData) {
                                        const newPets = Math.max(0, (bookingData.pets || 0) - 1);
                                        setBookingData({ ...bookingData, pets: newPets });
                                      }
                                    }}
                                    className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 hover:border-[#02665e] active:border-[#02665e] transition-all duration-200 flex items-center justify-center text-slate-600 hover:text-[#02665e] active:text-[#02665e] font-bold text-lg sm:text-lg touch-manipulation"
                                  >
                                    −
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={bookingData?.pets || 0}
                                    aria-label="Pets"
                                    title="Pets"
                                    onChange={(e) => {
                                      if (bookingData) {
                                        const value = Math.max(0, parseInt(e.target.value) || 0);
                                        setBookingData({ ...bookingData, pets: value });
                                      }
                                    }}
                                    className="w-14 sm:w-16 text-center px-2 py-1.5 sm:py-2 border-2 border-slate-300 rounded-lg text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (bookingData) {
                                        const newPets = (bookingData.pets || 0) + 1;
                                        setBookingData({ ...bookingData, pets: newPets });
                                      }
                                    }}
                                    className="w-11 h-11 sm:w-9 sm:h-9 rounded-lg border-2 border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 hover:border-[#02665e] active:border-[#02665e] transition-all duration-200 flex items-center justify-center text-slate-600 hover:text-[#02665e] active:text-[#02665e] font-bold text-lg sm:text-lg touch-manipulation"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Duration Section */}
                      <div className="space-y-1.5 sm:space-y-2 min-w-0 w-full">
                        <label className="text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2 block whitespace-nowrap">Duration</label>
                        <div className="text-slate-900 font-bold text-sm sm:text-base md:text-lg px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-[#02665e]/10 to-blue-50/50 rounded-lg sm:rounded-xl border border-[#02665e]/20">
                          {nights > 0 ? `${nights} night${nights !== 1 ? "s" : ""}` : "Select dates"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Availability status card (near date + guest selection) */}
                  {bookingData?.checkIn && bookingData?.checkOut && (
                    <div
                      className={[
                        "mt-4 rounded-2xl border p-4 shadow-sm",
                        availabilityState.status === "available"
                          ? "bg-emerald-50/70 border-emerald-200"
                          : availabilityState.status === "checking"
                          ? "bg-slate-50 border-slate-200"
                          : availabilityState.status === "unavailable"
                          ? "bg-amber-50/70 border-amber-200"
                          : "bg-white border-slate-200",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={[
                            "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0",
                            availabilityState.status === "available"
                              ? "bg-emerald-100 text-emerald-700"
                              : availabilityState.status === "checking"
                              ? "bg-slate-100 text-slate-700"
                              : availabilityState.status === "unavailable"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700",
                          ].join(" ")}
                        >
                          {availabilityState.status === "available" ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : availabilityState.status === "checking" ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : availabilityState.status === "unavailable" ? (
                            <AlertCircle className="w-5 h-5" />
                          ) : (
                            <Info className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-sm font-semibold text-slate-900">Availability status</div>
                            <span
                              className={[
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                                availabilityState.status === "available"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : availabilityState.status === "checking"
                                  ? "bg-slate-100 text-slate-700 border-slate-200"
                                  : availabilityState.status === "unavailable"
                                  ? "bg-amber-100 text-amber-800 border-amber-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200",
                              ].join(" ")}
                            >
                              {availabilityState.status === "available"
                                ? "Available"
                                : availabilityState.status === "checking"
                                ? "Checking"
                                : availabilityState.status === "unavailable"
                                ? "Not available"
                                : "Select dates"}
                            </span>
                          </div>

                          <div className="mt-1 text-sm text-slate-700">
                            {availabilityState.status === "available"
                              ? "Your selected dates look open right now. To secure it, continue to payment as soon as possible."
                              : availabilityState.status === "checking"
                              ? "Verifying your dates in real-time…"
                              : availabilityState.status === "unavailable"
                              ? availabilityState.message || "No availability for these dates."
                              : "Select check-in and check-out to verify availability."}
                          </div>

                          {availabilityState.status === "unavailable" && (
                            <div className="mt-3 rounded-xl border border-amber-200 bg-white/70 p-3">
                              <div className="text-xs font-semibold text-amber-900 uppercase tracking-wide">Recommendation</div>
                              <ul className="mt-2 space-y-1 text-sm text-amber-900/90">
                                <li>Select different dates, then re-check availability.</li>
                                <li>If this property has multiple room options, try another room type if available.</li>
                                <li>Browse similar properties nearby and compare availability.</li>
                                <li>When it shows “Available”, continue immediately to secure it.</li>
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Guest Information Form */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 p-4 sm:p-6 lg:p-8 transition-all duration-300 hover:shadow-xl overflow-hidden">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-4 sm:mb-6 lg:mb-8">
                Guest Information
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 lg:space-y-6 overflow-x-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5 w-full">
                  <div className="space-y-2 min-w-0 w-full">
                    <label className="block text-sm font-semibold text-slate-700">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      required
                      className="w-full min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-slate-300 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-white shadow-sm max-w-full box-border"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2 min-w-0 w-full">
                    <label className="block text-sm font-semibold text-slate-700">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={guestPhone}
                      inputMode="tel"
                      autoComplete="tel"
                      onChange={(e) => {
                        setError(null);
                        setGuestPhone(sanitizePhoneInput(e.target.value));
                      }}
                      onBlur={() => {
                        setPhoneTouched(true);
                        const normalized = normalizeTzPhoneForApi(guestPhone);
                        if (normalized) setGuestPhone(normalized);
                      }}
                      required
                      className="w-full min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-slate-300 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-white shadow-sm max-w-full box-border"
                      placeholder="+255 XXX XXX XXX"
                    />
                    {phoneInlineError ? (
                      <p className="text-xs font-semibold text-red-600">{phoneInlineError}</p>
                    ) : (
                      <p className="text-xs text-slate-500">Accepted: +2557XXXXXXXX, 07XXXXXXXX, or 7XXXXXXXX.</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5 w-full">
                  <div className="space-y-2 min-w-0 w-full">
                    <label className="block text-sm font-semibold text-slate-700">
                      Email <span className="text-slate-400 text-xs font-normal">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      value={guestEmail}
                      inputMode="email"
                      autoComplete="email"
                      onChange={(e) => {
                        setError(null);
                        setGuestEmail(e.target.value.replace(/\s+/g, ""));
                      }}
                      onBlur={() => setEmailTouched(true)}
                      className="w-full min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-slate-300 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-white shadow-sm max-w-full box-border"
                      placeholder="your.email@example.com"
                    />
                    {emailInlineError && (
                      <p className="text-xs font-semibold text-red-600">{emailInlineError}</p>
                    )}
                  </div>

                  <div className="space-y-2 min-w-0 w-full">
                    <label className="block text-sm font-semibold text-slate-700">
                      Nationality <span className="text-slate-400 text-xs font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={nationality}
                      inputMode="text"
                      autoComplete="country-name"
                      onChange={(e) => {
                        setError(null);
                        setNationality(sanitizeNationalityInput(e.target.value));
                      }}
                      className="w-full min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-slate-300 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-white shadow-sm max-w-full box-border"
                      placeholder="e.g., Tanzanian"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5 w-full">
                  <div className="space-y-2 min-w-0 w-full">
                    <label className="block text-sm font-semibold text-slate-700">
                      Gender <span className="text-slate-400 text-xs font-normal">(Optional)</span>
                    </label>
                    <select
                      value={sex}
                      onChange={(e) => setSex(e.target.value as any)}
                      aria-label="Gender"
                      title="Gender"
                      className="w-full min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-slate-300 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-white shadow-sm max-w-full box-border cursor-pointer"
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2 min-w-0 w-full">
                    {/* Empty space to maintain grid alignment */}
                  </div>
                </div>

                {/* Transportation Option */}
                <div className="pt-6 border-t border-slate-200/60">
                  <div className="flex items-center justify-between mb-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-xl border border-slate-200/60">
                    <div className="flex-1">
                      <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                        <Car className="w-4 h-4 text-[#02665e]" />
                        Include Transportation
                      </label>
                      <p className="text-xs text-slate-600">
                        Add transport from your location to the property
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIncludeTransport(!includeTransport)}
                      aria-label={includeTransport ? "Disable transportation" : "Enable transportation"}
                      title={includeTransport ? "Disable transportation" : "Enable transportation"}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 shadow-md ${
                        includeTransport ? "bg-[#02665e] shadow-[#02665e]/30" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-all duration-300 ${
                          includeTransport ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {includeTransport && (
                    <div className="space-y-4 mt-4 p-5 bg-gradient-to-br from-blue-50/50 to-slate-50 rounded-xl border-2 border-[#02665e]/20 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">
                          Transport Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={transportVehicleType}
                          onChange={(e) => setTransportVehicleType(e.target.value as TransportVehicleType)}
                          aria-label="Transport type"
                          title="Transport type"
                          className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-white shadow-sm cursor-pointer"
                        >
                          <option value="BODA">Boda</option>
                          <option value="BAJAJI">Bajaji</option>
                          <option value="CAR">Car</option>
                          <option value="XL">XL</option>
                          <option value="PREMIUM">Premium</option>
                        </select>
                        <p className="text-xs text-slate-600 flex items-start gap-1">
                          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          Different transport types have different pricing.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <label className="block text-sm font-semibold text-slate-700">
                            Pickup Location <span className="text-red-500">*</span>
                          </label>

                          <div className="inline-flex rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setPickupMode("current")}
                              className={[
                                "px-3 py-2 text-xs font-semibold transition-colors",
                                pickupMode === "current" ? "bg-[#02665e] text-white" : "text-slate-700 hover:bg-slate-50",
                              ].join(" ")}
                              aria-pressed={pickupMode === "current"}
                              title="Use my current location"
                            >
                              Current
                            </button>
                            <button
                              type="button"
                              onClick={() => setPickupMode("arrival")}
                              className={[
                                "px-3 py-2 text-xs font-semibold transition-colors border-l border-slate-200",
                                pickupMode === "arrival" ? "bg-[#02665e] text-white" : "text-slate-700 hover:bg-slate-50",
                              ].join(" ")}
                              aria-pressed={pickupMode === "arrival"}
                              title="Select an arrival point (airport/bus terminal)"
                            >
                              Arrival
                            </button>
                            <button
                              type="button"
                              onClick={() => setPickupMode("manual")}
                              className={[
                                "px-3 py-2 text-xs font-semibold transition-colors border-l border-slate-200",
                                pickupMode === "manual" ? "bg-[#02665e] text-white" : "text-slate-700 hover:bg-slate-50",
                              ].join(" ")}
                              aria-pressed={pickupMode === "manual"}
                              title="Type an address and search"
                            >
                              Type
                            </button>
                          </div>
                        </div>

                        {pickupMode === "arrival" ? (
                          <div className="space-y-2">
                            <select
                              value={pickupPresetId}
                              onChange={(e) => handleSelectPickupPreset(e.target.value)}
                              aria-label="Select arrival pickup point"
                              title="Select arrival pickup point"
                              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-white shadow-sm cursor-pointer"
                            >
                              <option value="">Select pickup point</option>
                              {PICKUP_PRESETS.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-slate-600 flex items-start gap-1">
                              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              If you're currently outside Tanzania (e.g., Dubai), choose your arrival pickup point here.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={transportOriginAddress}
                                onChange={(e) => setTransportOriginAddress(e.target.value)}
                                placeholder={pickupMode === "manual" ? "Type pickup address/place (Tanzania)" : "Optional: add a pickup note"}
                                className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-white shadow-sm"
                                required={includeTransport}
                              />
                              {pickupMode === "current" ? (
                                <button
                                  type="button"
                                  onClick={handleGetLocation}
                                  disabled={calculatingFare}
                                  className="px-4 py-3 bg-gradient-to-r from-[#02665e] to-[#014e47] text-white rounded-xl hover:from-[#014e47] hover:to-[#02665e] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                                  title="Use current location"
                                >
                                  <Navigation className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleGeocodePickupAddress}
                                  disabled={calculatingFare}
                                  className="px-4 py-3 bg-gradient-to-r from-[#02665e] to-[#014e47] text-white rounded-xl hover:from-[#014e47] hover:to-[#02665e] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                                  title="Find this location"
                                >
                                  <MapPin className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            {pickupMode === "current" ? (
                              <p className="text-xs text-slate-600 flex items-center gap-1">
                                <Info className="w-3.5 h-3.5" />
                                Click the location icon to use your current location.
                              </p>
                            ) : (
                              <p className="text-xs text-slate-600 flex items-start gap-1">
                                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                We’ll calculate transport from the place you search (within Tanzania) to the property.
                              </p>
                            )}
                          </div>
                        )}

                        {transportPickupError && (
                          <div className="bg-red-50/80 border-2 border-red-200 rounded-xl p-3 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs font-semibold text-red-700">{transportPickupError}</p>
                          </div>
                        )}

                        {transportOriginLat !== null && transportOriginLng !== null && (
                          <div className="flex items-center justify-between gap-2 text-xs bg-white/80 border border-emerald-200 rounded-xl px-3 py-2">
                            <span className="font-semibold text-emerald-700">Pickup location ready</span>
                            <span className="text-slate-500">{transportOriginLat.toFixed(5)}, {transportOriginLng.toFixed(5)}</span>
                          </div>
                        )}
                      </div>

                      {/* Arrival Information Section */}
                      <div className="pt-4 mt-4 border-t border-slate-200/60">
                        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                          <Plane className="w-4 h-4 text-[#02665e] flex-shrink-0" />
                          <span>Arrival Information</span>
                          {requiresArrivalInfo && <span className="text-red-500">*</span>}
                          {!requiresArrivalInfo && (
                            <span className="text-slate-400 text-xs font-normal">(Optional)</span>
                          )}
                        </h3>
                        <p className="text-xs text-slate-600 mb-4">
                          Help us coordinate your pickup by providing your arrival details
                        </p>
                        
                        <div className="space-y-4 w-full min-w-0">
                          {/* Arrival Type */}
                          <div className="space-y-2 w-full min-w-0">
                            <label className="block text-sm font-semibold text-slate-700">
                              How are you arriving?
                              {requiresArrivalInfo && <span className="text-red-500"> *</span>}
                            </label>
                            <select
                              value={arrivalType}
                              onChange={(e) => setArrivalType(e.target.value as any)}
                              aria-label="Arrival type"
                              title="Arrival type"
                              disabled={arrivalTypeLocked}
                              className={[
                                "w-full min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-slate-300 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-white shadow-sm cursor-pointer max-w-full box-border",
                                arrivalTypeLocked ? "opacity-80 cursor-not-allowed" : "",
                              ].join(" ")}
                            >
                              <option value="">Select arrival type</option>
                              <option value="FLIGHT">Flight</option>
                              <option value="BUS">Bus</option>
                              <option value="TRAIN">Train</option>
                              <option value="FERRY">Ferry</option>
                              <option value="OTHER">Other</option>
                            </select>
                            {arrivalTypeLocked && (
                              <p className="text-xs text-slate-600 flex items-start gap-1">
                                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                Auto-selected from your pickup point. Switch pickup point to change.
                              </p>
                            )}
                          </div>

                          {/* Arrival Number & Company - shown when arrival type is selected */}
                          {arrivalType && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full min-w-0">
                              <div className="space-y-2 min-w-0 w-full">
                                <label className="block text-sm font-semibold text-slate-700">
                                  {arrivalType === "FLIGHT" ? "Flight Number" :
                                   arrivalType === "BUS" ? "Bus Number" :
                                   arrivalType === "TRAIN" ? "Train Number" :
                                   arrivalType === "FERRY" ? "Ferry Number" :
                                   "Transport Number"}
                                </label>
                                <input
                                  type="text"
                                  value={arrivalNumber}
                                  onChange={(e) => setArrivalNumber(e.target.value)}
                                  placeholder={arrivalType === "FLIGHT" ? "e.g., JN123" :
                                               arrivalType === "BUS" ? "e.g., BUS-456" :
                                               arrivalType === "TRAIN" ? "e.g., TR-789" :
                                               arrivalType === "FERRY" ? "e.g., FR-012" :
                                               "Transport number"}
                                  className="w-full min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-slate-300 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-white shadow-sm max-w-full box-border"
                                />
                              </div>
                              <div className="space-y-2 min-w-0 w-full">
                                <label className="block text-sm font-semibold text-slate-700">
                                  {arrivalType === "FLIGHT" ? "Airline" :
                                   arrivalType === "BUS" ? "Bus Company" :
                                   arrivalType === "TRAIN" ? "Train Operator" :
                                   arrivalType === "FERRY" ? "Ferry Operator" :
                                   "Transport Company"}
                                </label>
                                <input
                                  type="text"
                                  value={transportCompany}
                                  onChange={(e) => setTransportCompany(e.target.value)}
                                  placeholder={arrivalType === "FLIGHT" ? "e.g., Precision Air" :
                                               arrivalType === "BUS" ? "e.g., Scania" :
                                               arrivalType === "TRAIN" ? "e.g., TAZARA" :
                                               arrivalType === "FERRY" ? "e.g., Azam Marine" :
                                               "Company name"}
                                  className="w-full min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-slate-300 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-white shadow-sm max-w-full box-border"
                                />
                              </div>
                            </div>
                          )}

                          {/* Arrival Time and Pickup Location - Two columns on large screens */}
                          {arrivalType && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-5 w-full min-w-0">
                              {/* Arrival Time */}
                              <div className="space-y-2 w-full min-w-0">
                                <label className="block text-sm font-semibold text-slate-700">
                                  Arrival Time
                                  {requiresArrivalInfo && <span className="text-red-500"> *</span>}
                                </label>
                                <div className="space-y-2 sm:space-y-3">
                                  {/* Date Picker Button */}
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() => setArrivalDatePickerOpen(true)}
                                      className="w-full min-w-0 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 pl-8 sm:pl-10 md:pl-11 pr-8 sm:pr-10 md:pr-11 border-2 border-slate-300 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-gradient-to-r from-slate-50 to-blue-50/50 shadow-sm max-w-full box-border flex items-center justify-between group"
                                    >
                                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#02665e] flex-shrink-0" />
                                        <span className="text-slate-900 truncate text-xs sm:text-sm">
                                          {arrivalDate
                                            ? (() => {
                                                const date = new Date(arrivalDate);
                                                const day = String(date.getDate()).padStart(2, "0");
                                                const month = String(date.getMonth() + 1).padStart(2, "0");
                                                const year = date.getFullYear();
                                                return `${day} / ${month} / ${year}`;
                                              })()
                                            : "dd / mm / yyyy"}
                                        </span>
                                      </div>
                                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-[#02665e] transition-colors flex-shrink-0" />
                                    </button>
                                    {arrivalDatePickerOpen && (
                                      <>
                                        <div className="fixed inset-0 z-[100]" onClick={() => setArrivalDatePickerOpen(false)} />
                                        <div className="absolute z-[101] top-full left-0 mt-2 bg-white rounded-xl border-2 border-slate-200 shadow-2xl max-h-[calc(100vh-200px)] overflow-y-auto">
                                          <DatePicker
                                            selected={arrivalDate}
                                            onSelectAction={(s) => {
                                              const date = Array.isArray(s) ? s[0] : s;
                                              setArrivalDate(date || "");
                                              setArrivalDatePickerOpen(false);
                                            }}
                                            onCloseAction={() => setArrivalDatePickerOpen(false)}
                                            allowRange={false}
                                            minDate={new Date().toISOString().split("T")[0]}
                                          />
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  {/* Time Inputs */}
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="flex-1 min-w-0">
                                      <input
                                        type="number"
                                        min="0"
                                        max="23"
                                        value={arrivalTimeHour}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "" || (parseInt(val) >= 0 && parseInt(val) <= 23)) {
                                            setArrivalTimeHour(val);
                                          }
                                        }}
                                        placeholder="--"
                                        required={requiresArrivalInfo}
                                        aria-required={requiresArrivalInfo}
                                        className="w-full min-w-0 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-slate-300 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-white shadow-sm text-center max-w-full box-border"
                                      />
                                    </div>
                                    <span className="flex items-center text-slate-600 font-semibold text-sm sm:text-base">:</span>
                                    <div className="flex-1 min-w-0">
                                      <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        value={arrivalTimeMinute}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val === "" || (parseInt(val) >= 0 && parseInt(val) <= 59)) {
                                            setArrivalTimeMinute(val);
                                          }
                                        }}
                                        placeholder="--"
                                        required={requiresArrivalInfo}
                                        aria-required={requiresArrivalInfo}
                                        className="w-full min-w-0 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border-2 border-slate-300 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-white shadow-sm text-center max-w-full box-border"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Pickup Location (specific area/terminal) */}
                              <div className="space-y-2 w-full min-w-0">
                                <label className="block text-sm font-semibold text-slate-700">
                                  Specific Pickup Area/Terminal
                                  {requiresArrivalInfo && <span className="text-red-500"> *</span>}
                                </label>
                                <input
                                  type="text"
                                  value={pickupLocation}
                                  onChange={(e) => setPickupLocation(e.target.value)}
                                  placeholder={arrivalType === "FLIGHT" ? "e.g., Terminal 1, Gate 3" :
                                               arrivalType === "BUS" ? "e.g., Ubungo Bus Terminal, Platform 5" :
                                               arrivalType === "TRAIN" ? "e.g., Central Station, Platform 2" :
                                               arrivalType === "FERRY" ? "e.g., Ferry Terminal, Dock A" :
                                               "Specific pickup location"}
                                  required={requiresArrivalInfo}
                                  className="w-full min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-slate-300 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-white shadow-sm max-w-full box-border"
                                />
                                <p className="text-xs text-slate-600 mt-1.5">
                                  Specify the exact pickup point (terminal, gate, platform, etc.)
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {transportFare && (
                        <div className="p-4 bg-white rounded-xl border-2 border-[#02665e]/30 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="text-sm font-bold text-slate-800">Transport Fare</span>
                              <span className="ml-2 text-xs text-slate-500 font-medium">({getVehicleTypeLabel(transportVehicleType)})</span>
                              <span className="ml-2 text-xs text-slate-500 font-medium">(Fixed upfront price)</span>
                            </div>
                            <span className="text-xl font-bold text-[#02665e]">
                              {transportFare.toLocaleString()} {currency}
                            </span>
                          </div>
                          {transportOriginLat !== null && transportOriginLng !== null && !!property && property.latitude !== null && property.longitude !== null && (
                            <>
                              <p className="text-xs text-slate-600 mb-1">
                                {getFareBreakdown(
                                  calculateTransportFare(
                                    {
                                      latitude: transportOriginLat,
                                      longitude: transportOriginLng,
                                      address: transportOriginAddress,
                                    },
                                    {
                                      latitude: property.latitude,
                                      longitude: property.longitude,
                                    },
                                    currency,
                                    arrivalDate
                                      ? (() => {
                                          const d = new Date(arrivalDate);
                                          if (isNaN(d.getTime())) return undefined;
                                          if (arrivalTimeHour) d.setHours(parseInt(arrivalTimeHour) || 0);
                                          if (arrivalTimeMinute) d.setMinutes(parseInt(arrivalTimeMinute) || 0);
                                          return d;
                                        })()
                                      : undefined,
                                    transportVehicleType
                                  )
                                )}
                              </p>
                              <p className="text-xs text-slate-500 italic">
                                This is your final fare - no additional charges. Included in your booking total.
                              </p>
                            </>
                          )}
                        </div>
                      )}

                      {calculatingFare && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Calculating fare...
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 w-full min-w-0">
                  <label className="block text-sm font-semibold text-slate-700">
                    Special Requests <span className="text-slate-400 text-xs font-normal">(Optional)</span>
                  </label>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    rows={4}
                    className="w-full min-w-0 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-slate-300 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-white shadow-sm resize-none max-w-full box-border"
                    placeholder="Any special requests or notes for the host..."
                  />
                </div>

                {error && (
                  <div className="bg-gradient-to-r from-red-50 to-red-100/50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-red-700">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    availabilityState.status === "checking" ||
                    availabilityState.status === "unavailable" ||
                    (includeTransport && (
                      calculatingFare ||
                      transportOriginLat === null ||
                      transportOriginLng === null ||
                      transportFare === null
                    ))
                  }
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#02665e] to-[#014e47] text-white font-bold text-base hover:from-[#014e47] hover:to-[#02665e] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Creating booking...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Confirm & Continue to Payment</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar - Price Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/60 p-6 lg:p-8 sticky top-8 transition-all duration-300 hover:shadow-2xl">
              <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-6 lg:mb-8">
                Price Summary
              </h2>

              <div className="space-y-4 lg:space-y-5">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-sm font-medium text-slate-700">
                    {pricePerNight.toLocaleString()} {currency} × {nights} night{nights !== 1 ? "s" : ""} × {roomsQty} room{roomsQty !== 1 ? "s" : ""}
                    {(selectedRoomCode || selectedRoomIndex !== null) && (
                      <span className="block text-xs text-slate-500 mt-0.5">
                        {(() => {
                          if (!property?.roomsSpec) return "";
                          let roomTypes: Array<{ code?: string; roomCode?: string; roomType?: string; name?: string; label?: string }> = [];
                          if (typeof property.roomsSpec === "object") {
                            const spec = property.roomsSpec as any;
                            if (Array.isArray(spec)) {
                              roomTypes = spec;
                            } else if (spec.rooms && Array.isArray(spec.rooms)) {
                              roomTypes = spec.rooms;
                            }
                          }
                          
                          let room: any = null;
                          if (selectedRoomCode) {
                            room = roomTypes.find((rt) => (rt.code || rt.roomCode) === selectedRoomCode);
                          } else if (selectedRoomIndex !== null && selectedRoomIndex >= 0 && selectedRoomIndex < roomTypes.length) {
                            room = roomTypes[selectedRoomIndex];
                          }
                          
                          return room ? `(${room.roomType || room.name || room.label || "Selected Room"})` : "";
                        })()}
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-slate-900 text-base">
                    {subtotal.toLocaleString()} {currency}
                  </span>
                </div>

                {includeTransport && transportFare && (
                  <div className="flex justify-between items-center text-slate-600 text-sm pt-2 p-3 bg-blue-50/50 rounded-xl border border-blue-200/60">
                    <span className="flex items-center gap-2 font-medium">
                      <Car className="w-4 h-4 text-[#02665e]" />
                      Transportation ({getVehicleTypeLabel(transportVehicleType)})
                    </span>
                    <span className="font-bold text-[#02665e]">
                      {transportFare.toLocaleString()} {currency}
                    </span>
                  </div>
                )}

                <div className="pt-4 border-t-2 border-slate-200">
                  <div className="flex justify-between items-center p-4 bg-gradient-to-r from-[#02665e]/10 to-blue-50/50 rounded-xl border border-[#02665e]/20">
                    <span className="text-lg font-bold text-slate-900">Total</span>
                    <span className="text-2xl lg:text-3xl font-extrabold text-[#02665e]">
                      {finalTotal.toLocaleString()} {currency}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/60">
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-emerald-50/50 to-slate-50 rounded-xl border border-emerald-200/40">
                    <ShieldCheck className="w-5 h-5 text-[#02665e] flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900 mb-1 text-sm">
                        Secure Payment
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed">
                        Your payment is processed securely through our payment partners.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60">
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50/30 to-slate-50 rounded-xl border border-blue-200/40">
                    <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900 mb-1 text-sm">
                        Cancellation Policy
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed">
                        Free cancellation up to 24 hours before check-in. Review full policy on property page.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


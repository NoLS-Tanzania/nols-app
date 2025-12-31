"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Calendar,
  Users,
  BedDouble,
  Bath,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ShieldCheck,
  Info,
  Car,
  Navigation,
} from "lucide-react";
import VerifiedIcon from "../../../../components/VerifiedIcon";
import { 
  getPropertyCommission, 
  calculatePriceWithCommission 
} from "../../../../lib/priceUtils";
import {
  calculateTransportFare,
  formatFare,
  getFareBreakdown,
  type Location,
} from "../../../../lib/transportFareCalculator";

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
};

type BookingData = {
  propertyId: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  pets: number;
};

export default function BookingConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  
  // Guest information form
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [nationality, setNationality] = useState("");
  const [sex, setSex] = useState<"Male" | "Female" | "Other" | "">("");
  const [ageGroup, setAgeGroup] = useState<"Adult" | "Child" | "">("Adult");
  const [specialRequests, setSpecialRequests] = useState("");
  
  // Transportation
  const [includeTransport, setIncludeTransport] = useState(false);
  const [transportOriginAddress, setTransportOriginAddress] = useState("");
  const [transportOriginLat, setTransportOriginLat] = useState<number | null>(null);
  const [transportOriginLng, setTransportOriginLng] = useState<number | null>(null);
  const [transportFare, setTransportFare] = useState<number | null>(null);
  const [calculatingFare, setCalculatingFare] = useState(false);

  useEffect(() => {
    // Get booking data from URL params
    const propertyId = searchParams.get("property");
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    const adults = searchParams.get("adults") || "1";
    const children = searchParams.get("children") || "0";
    const pets = searchParams.get("pets") || "0";

    if (!propertyId || !checkIn || !checkOut) {
      setError("Missing required booking information");
      setLoading(false);
      return;
    }

    setBookingData({
      propertyId: Number(propertyId),
      checkIn,
      checkOut,
      adults: Number(adults),
      children: Number(children),
      pets: Number(pets),
    });

    // Fetch property details
    fetchProperty(Number(propertyId));
  }, [searchParams]);

  async function fetchProperty(propertyId: number) {
    try {
      const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
      const response = await fetch(`${API}/api/public/properties/${propertyId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch property");
      }

      const data = await response.json();
      setProperty(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load property");
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

    try {
      const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
      
      // Create booking
      const bookingResponse = await fetch(`${API}/api/public/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: bookingData.propertyId,
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          guestEmail: guestEmail.trim() || null,
          nationality: nationality.trim() || null,
          sex: sex || null,
          ageGroup: ageGroup || null,
          adults: bookingData.adults,
          children: bookingData.children,
          pets: bookingData.pets,
          specialRequests: includeTransport ? specialRequests.trim() || null : specialRequests.trim() || null,
          includeTransport: includeTransport,
          transportOriginLat: includeTransport ? transportOriginLat : null,
          transportOriginLng: includeTransport ? transportOriginLng : null,
          transportOriginAddress: includeTransport ? transportOriginAddress.trim() : null,
          transportFare: includeTransport ? transportFare : null,
        }),
      });

      const bookingResult = await bookingResponse.json();

      if (!bookingResponse.ok) {
        throw new Error(bookingResult.error || "Failed to create booking");
      }

      // Create invoice from booking
      const invoiceResponse = await fetch(`${API}/api/public/invoices/from-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: bookingResult.bookingId,
        }),
      });

      const invoiceResult = await invoiceResponse.json();

      if (!invoiceResponse.ok) {
        throw new Error(invoiceResult.error || "Failed to create invoice");
      }

      // Redirect to payment page with invoice ID
      router.push(`/public/booking/payment?invoiceId=${invoiceResult.invoiceId}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create booking. Please try again.");
      setSubmitting(false);
    }
  }

  // Calculate pricing
  const nights = bookingData
    ? Math.max(
        1,
        Math.ceil(
          (new Date(bookingData.checkOut).getTime() -
            new Date(bookingData.checkIn).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const basePrice = property?.basePrice ? Number(property.basePrice) : 0;
  const subtotal = basePrice * nights;
  const commissionPercent = getPropertyCommission(property?.type || "", 0);
  const totalAmount = calculatePriceWithCommission(
    subtotal,
    commissionPercent
  );
  const commission = (subtotal * commissionPercent) / 100;
  const currency = property?.currency || "TZS";
  
  // Calculate total including transport
  const finalTotal = totalAmount + (includeTransport && transportFare ? transportFare : 0);
  
  // Auto-calculate fare when transport is enabled and location is available
  useEffect(() => {
    if (includeTransport && transportOriginLat && transportOriginLng && property?.latitude && property?.longitude) {
      const origin: Location = {
        latitude: transportOriginLat,
        longitude: transportOriginLng,
        address: transportOriginAddress,
      };

      const destination: Location = {
        latitude: property.latitude,
        longitude: property.longitude,
      };

      const currentCurrency = property?.currency || "TZS";

      try {
        const fare = calculateTransportFare(origin, destination, currentCurrency);
        setTransportFare(fare.total);
      } catch (err: any) {
        console.error("Fare calculation error:", err);
      }
    } else if (!includeTransport) {
      setTransportFare(null);
      setTransportOriginAddress("");
      setTransportOriginLat(null);
      setTransportOriginLng(null);
    }
  }, [includeTransport, transportOriginLat, transportOriginLng, property?.latitude, property?.longitude, property?.currency, transportOriginAddress]);
  
  // Function to calculate transport fare manually (when user clicks calculate)
  function handleCalculateFare() {
    if (!includeTransport) {
      setTransportFare(null);
      return;
    }

    if (!property?.latitude || !property?.longitude) {
      setError("Property location is required for transport calculation");
      return;
    }

    if (!transportOriginLat || !transportOriginLng) {
      setError("Please provide your location for fare calculation");
      return;
    }

    setCalculatingFare(true);
    try {
      const origin: Location = {
        latitude: transportOriginLat,
        longitude: transportOriginLng,
        address: transportOriginAddress,
      };

      const destination: Location = {
        latitude: property.latitude,
        longitude: property.longitude,
      };

      const fare = calculateTransportFare(origin, destination, currency);
      setTransportFare(fare.total);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to calculate transport fare");
    } finally {
      setCalculatingFare(false);
    }
  }

  // Handle location access
  function handleGetLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setCalculatingFare(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setTransportOriginLat(position.coords.latitude);
        setTransportOriginLng(position.coords.longitude);
        setCalculatingFare(false);
        // Auto-calculate fare will be triggered by useEffect
      },
      (error) => {
        setError("Unable to get your location. Please enter your address manually.");
        setCalculatingFare(false);
      }
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#02665e] mx-auto mb-4" />
          <p className="text-slate-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link
            href="/public/properties"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#02665e] text-white hover:bg-[#014e47] transition-colors"
          >
            Browse Properties
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href={property ? `/public/properties/${property.id}` : "/public/properties"}
            className="inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back to property
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-2xl font-semibold text-slate-900 mb-6">
                Booking Summary
              </h2>

              {property && (
                <div className="space-y-4">
                  {/* Property Info */}
                  <div className="flex gap-4">
                    {property.primaryImage ? (
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={property.primaryImage}
                          alt={property.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <BedDouble className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900 truncate">
                        {property.title}
                      </h3>
                      <div className="flex items-center text-sm text-slate-600 mt-1">
                        <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                        <span className="truncate">
                          {[
                            property.city,
                            property.district,
                            property.regionName,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                        {property.totalBedrooms && (
                          <div className="flex items-center">
                            <BedDouble className="w-4 h-4 mr-1" />
                            {property.totalBedrooms} bedrooms
                          </div>
                        )}
                        {property.totalBathrooms && (
                          <div className="flex items-center">
                            <Bath className="w-4 h-4 mr-1" />
                            {property.totalBathrooms} bathrooms
                          </div>
                        )}
                        {property.maxGuests && (
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            Up to {property.maxGuests} guests
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dates & Guests */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                    <div>
                      <div className="text-sm text-slate-600 mb-1">Check-in</div>
                      <div className="flex items-center text-slate-900 font-medium">
                        <Calendar className="w-4 h-4 mr-2" />
                        {bookingData &&
                          new Date(bookingData.checkIn).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-600 mb-1">Check-out</div>
                      <div className="flex items-center text-slate-900 font-medium">
                        <Calendar className="w-4 h-4 mr-2" />
                        {bookingData &&
                          new Date(bookingData.checkOut).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="text-sm text-slate-600 mb-1">Guests</div>
                    <div className="flex items-center text-slate-900 font-medium">
                      <Users className="w-4 h-4 mr-2" />
                      {bookingData?.adults || 1} adult{bookingData?.adults !== 1 ? "s" : ""}
                      {bookingData?.children ? `, ${bookingData.children} child${bookingData.children !== 1 ? "ren" : ""}` : ""}
                      {bookingData?.pets ? `, ${bookingData.pets} pet${bookingData.pets !== 1 ? "s" : ""}` : ""}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="text-sm text-slate-600 mb-1">Duration</div>
                    <div className="text-slate-900 font-medium">
                      {nights} night{nights !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Guest Information Form */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-2xl font-semibold text-slate-900 mb-6">
                Guest Information
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent"
                    placeholder="+255 XXX XXX XXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nationality (Optional)
                    </label>
                    <input
                      type="text"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent"
                      placeholder="e.g., Tanzanian"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Gender (Optional)
                    </label>
                    <select
                      value={sex}
                      onChange={(e) => setSex(e.target.value as any)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent"
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Transportation Option */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Include Transportation
                      </label>
                      <p className="text-xs text-slate-500">
                        Add transport from your location to the property
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIncludeTransport(!includeTransport)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        includeTransport ? "bg-[#02665e]" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          includeTransport ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {includeTransport && (
                    <div className="space-y-3 mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Pickup Location <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={transportOriginAddress}
                            onChange={(e) => setTransportOriginAddress(e.target.value)}
                            placeholder="Enter your address or location"
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent"
                            required={includeTransport}
                          />
                          <button
                            type="button"
                            onClick={handleGetLocation}
                            disabled={calculatingFare}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                            title="Use current location"
                          >
                            <Navigation className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Click the location icon to use your current location
                        </p>
                      </div>

                      {transportFare && (
                        <div className="p-3 bg-white rounded-lg border border-[#02665e]/20">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="text-sm font-medium text-slate-700">Transport Fare</span>
                              <span className="ml-2 text-xs text-slate-500">(Fixed upfront price)</span>
                            </div>
                            <span className="text-lg font-bold text-[#02665e]">
                              {transportFare.toLocaleString()} {currency}
                            </span>
                          </div>
                          {transportOriginLat && transportOriginLng && property?.latitude && property?.longitude && (
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
                                    currency
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

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Special Requests (Optional)
                  </label>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent"
                    placeholder="Any special requests or notes for the host..."
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-6 rounded-lg bg-[#02665e] text-white font-medium hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating booking...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Confirm & Continue to Payment
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar - Price Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">
                Price Summary
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between text-slate-600">
                  <span>
                    {basePrice.toLocaleString()} {currency} × {nights} night{nights !== 1 ? "s" : ""}
                  </span>
                  <span className="font-medium text-slate-900">
                    {subtotal.toLocaleString()} {currency}
                  </span>
                </div>

                {commission > 0 && (
                  <div className="flex justify-between text-slate-600 text-sm">
                    <span>Service fee</span>
                    <span>{commission.toLocaleString()} {currency}</span>
                  </div>
                )}

                {includeTransport && transportFare && (
                  <div className="flex justify-between text-slate-600 text-sm pt-2">
                    <span className="flex items-center gap-1">
                      <Car className="w-4 h-4" />
                      Transportation
                    </span>
                    <span className="font-medium text-slate-900">
                      {transportFare.toLocaleString()} {currency}
                    </span>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-slate-900">Total</span>
                    <span className="text-2xl font-bold text-[#02665e]">
                      {finalTotal.toLocaleString()} {currency}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <ShieldCheck className="w-5 h-5 text-[#02665e] flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-slate-900 mb-1">
                        Secure Payment
                      </div>
                      <div>
                        Your payment is processed securely through our payment partners.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <Info className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-slate-900 mb-1">
                        Cancellation Policy
                      </div>
                      <div>
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


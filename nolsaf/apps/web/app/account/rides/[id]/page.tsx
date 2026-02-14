"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  Car,
  MapPin,
  Star,
  User,
  CheckCircle,
  Calendar,
  ArrowLeft,
  Phone,
  Navigation,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import TransportChat from "@/components/TransportChat";
import LogoSpinner from "@/components/LogoSpinner";

const api = axios.create({ baseURL: "", withCredentials: true });

type Ride = {
  id: number;
  status: string;
  vehicleType?: string;
  scheduledDate: string;
  pickupTime?: string;
  dropoffTime?: string;
  fromAddress?: string;
  fromLatitude?: number;
  fromLongitude?: number;
  toAddress?: string;
  toLatitude?: number;
  toLongitude?: number;
  amount?: number;
  currency?: string;
  arrivalType?: string;
  arrivalNumber?: string;
  transportCompany?: string;
  arrivalTime?: string;
  pickupLocation?: string;
  numberOfPassengers?: number;
  notes?: string;
  user?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  };
  driver?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  };
  property?: {
    id: number;
    title: string;
    regionName?: string;
    district?: string;
  };
  paymentStatus?: string;
  createdAt: string;
  updatedAt: string;
};

export default function RideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rideId = Number((params as any)?.id ?? "");
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    // Get current user
    api
      .get("/api/account/me")
      .then((res) => {
        setCurrentUserId(res.data?.id || null);
      })
      .catch(() => {});

    // Fetch ride details
    const fetchRide = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/api/transport-bookings/${rideId}`);
        setRide(response.data);
      } catch (err: any) {
        const msg = err?.response?.data?.error || "Failed to load ride details";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    if (rideId) {
      fetchRide();
    }
  }, [rideId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return "N/A";
    return new Date(timeString).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("completed")) {
      return "bg-green-100 text-green-700";
    }
    if (statusLower.includes("canceled") || statusLower.includes("cancelled")) {
      return "bg-red-100 text-red-700";
    }
    if (statusLower.includes("in_progress") || statusLower.includes("assigned")) {
      return "bg-blue-100 text-blue-700";
    }
    if (statusLower.includes("pending")) {
      return "bg-amber-100 text-amber-700";
    }
    return "bg-slate-100 text-slate-700";
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <LogoSpinner size="md" className="mx-auto mb-4" ariaLabel="Loading ride details" />
            <p className="text-slate-600">Loading ride details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="mx-auto w-full max-w-4xl p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">Error</h2>
          <p className="text-red-700 mb-4">{error || "Ride not found"}</p>
          <Link
            href="/account/rides"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#02665e] text-white hover:bg-[#014e47] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Rides
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/account/rides"
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ride Details</h1>
          <p className="text-sm text-slate-600">Booking ID: #{ride.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Trip Status</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(ride.status)}`}>
                {ride.status.replace("_", " ")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Scheduled Date</p>
                <p className="font-semibold text-slate-900">{formatDate(ride.scheduledDate)}</p>
              </div>
              {ride.pickupTime && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Pickup Time</p>
                  <p className="font-semibold text-slate-900">{formatTime(ride.pickupTime)}</p>
                </div>
              )}
              {ride.vehicleType && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Vehicle Type</p>
                  <p className="font-semibold text-slate-900">{ride.vehicleType}</p>
                </div>
              )}
              {ride.numberOfPassengers && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Passengers</p>
                  <p className="font-semibold text-slate-900">{ride.numberOfPassengers}</p>
                </div>
              )}
            </div>
          </div>

          {/* Route Information */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Route</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">Pickup Location</p>
                  <p className="font-semibold text-slate-900">{ride.fromAddress || "Not specified"}</p>
                  {ride.fromLatitude && ride.fromLongitude && (
                    <a
                      href={`https://www.google.com/maps?q=${ride.fromLatitude},${ride.fromLongitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#02665e] hover:underline mt-1 inline-flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3" />
                      View on Map
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-slate-400 rotate-90" />
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-[#02665e]/10 rounded-lg">
                  <Navigation className="w-5 h-5 text-[#02665e]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">Drop-off Location</p>
                  <p className="font-semibold text-slate-900">
                    {ride.property?.title || ride.toAddress || "Not specified"}
                  </p>
                  {ride.toLatitude && ride.toLongitude && (
                    <a
                      href={`https://www.google.com/maps?q=${ride.toLatitude},${ride.toLongitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#02665e] hover:underline mt-1 inline-flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3" />
                      View on Map
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Arrival Information */}
          {(ride.arrivalType || ride.arrivalNumber || ride.pickupLocation) && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Arrival Information</h2>
              <div className="space-y-4">
                {ride.pickupLocation && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Pickup Location</p>
                    <p className="font-semibold text-slate-900">{ride.pickupLocation}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {ride.arrivalType && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Arrival Type</p>
                      <p className="font-semibold text-slate-900">{ride.arrivalType}</p>
                    </div>
                  )}
                  {ride.arrivalNumber && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">
                        {ride.arrivalType === "FLIGHT" ? "Flight Number" : 
                         ride.arrivalType === "BUS" ? "Bus Number" :
                         ride.arrivalType === "TRAIN" ? "Train Number" :
                         ride.arrivalType === "FERRY" ? "Ferry Number" :
                         "Transport Number"}
                      </p>
                      <p className="font-semibold text-slate-900">{ride.arrivalNumber}</p>
                    </div>
                  )}
                  {ride.transportCompany && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">
                        {ride.arrivalType === "FLIGHT" ? "Airline" : 
                         ride.arrivalType === "BUS" ? "Bus Company" :
                         ride.arrivalType === "TRAIN" ? "Train Operator" :
                         ride.arrivalType === "FERRY" ? "Ferry Operator" :
                         "Transport Company"}
                      </p>
                      <p className="font-semibold text-slate-900">{ride.transportCompany}</p>
                    </div>
                  )}
                  {ride.arrivalTime && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Arrival Time</p>
                      <p className="font-semibold text-slate-900">{formatTime(ride.arrivalTime)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {ride.notes && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Special Instructions</h2>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{ride.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Driver Information */}
          {ride.driver && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Driver</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-[#02665e]/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-[#02665e]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{ride.driver.name}</p>
                    {ride.driver.phone && (
                      <a
                        href={`tel:${ride.driver.phone}`}
                        className="text-sm text-[#02665e] hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        <Phone className="w-3 h-3" />
                        {ride.driver.phone}
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowChat(!showChat)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#02665e] text-white font-semibold hover:bg-[#014e47] transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  {showChat ? "Hide Chat" : "Chat with Driver"}
                </button>
              </div>
            </div>
          )}

          {/* Payment Information */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment</h2>
            <div className="space-y-2">
              {ride.amount && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Amount</span>
                  <span className="font-semibold text-slate-900">
                    {Number(ride.amount).toLocaleString()} {ride.currency || "TZS"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Status</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  ride.paymentStatus === "PAID" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {ride.paymentStatus || "PENDING"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Section */}
      {showChat && ride.driver && currentUserId && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <TransportChat
            bookingId={ride.id}
            currentUserId={currentUserId}
            currentUserType="PASSENGER"
            otherUserName={ride.driver.name}
            otherUserPhone={ride.driver.phone}
            className="h-[500px]"
          />
        </div>
      )}
    </div>
  );
}


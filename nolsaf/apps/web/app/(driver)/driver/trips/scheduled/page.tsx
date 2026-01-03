"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Car,
  MapPin,
  Calendar,
  Clock,
  Users,
  Plane,
  CheckCircle,
  Loader2,
  Navigation,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";

const api = axios.create({ baseURL: "", withCredentials: true });

type ScheduledTrip = {
  id: number;
  vehicleType?: string;
  scheduledDate: string;
  pickupTime?: string;
  fromAddress?: string;
  fromLatitude?: number;
  fromLongitude?: number;
  toAddress?: string;
  toLatitude?: number;
  toLongitude?: number;
  amount?: number;
  currency?: string;
  numberOfPassengers?: number;
  arrivalType?: string;
  arrivalNumber?: string;
  transportCompany?: string;
  arrivalTime?: string;
  pickupLocation?: string;
  notes?: string;
  passenger?: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
  };
  property?: {
    id: number;
    title: string;
    regionName?: string;
    district?: string;
  };
  createdAt: string;
};

export default function DriverScheduledTripsPage() {
  const [trips, setTrips] = useState<ScheduledTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "BODA" | "BAJAJI" | "CAR" | "XL">("all");
  const { success, error: showError } = useToast();

  useEffect(() => {
    loadTrips();
  }, [filter]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.set("vehicleType", filter);
      }
      const response = await api.get(`/api/driver/trips/scheduled?${params.toString()}`);
      setTrips(response.data.items || []);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to load scheduled trips";
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (tripId: number) => {
    try {
      setClaiming(tripId);
      const response = await api.post(`/api/driver/trips/${tripId}/claim`);
      if (response.data.ok) {
        success("Trip claimed successfully!");
        // Remove from list
        setTrips((prev) => prev.filter((t) => t.id !== tripId));
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to claim trip";
      showError(msg);
    } finally {
      setClaiming(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return null;
    return new Date(timeString).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getVehicleIcon = (type?: string) => {
    switch (type) {
      case "BODA":
        return "🏍️";
      case "BAJAJI":
        return "🛺";
      case "CAR":
        return "🚗";
      case "XL":
        return "🚐";
      default:
        return "🚕";
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#02665e] mx-auto mb-4" />
            <p className="text-slate-600">Loading scheduled trips...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-[#02665e]/10 to-[#014e47]/10 mb-4">
          <Calendar className="h-8 w-8 text-[#02665e]" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Claim Trips</h1>
        <p className="text-slate-600">Browse and claim available scheduled trips</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-center flex-wrap gap-2">
        {[
          { key: "all" as const, label: "All" },
          { key: "BODA" as const, label: "Boda" },
          { key: "BAJAJI" as const, label: "Bajaji" },
          { key: "CAR" as const, label: "Car" },
          { key: "XL" as const, label: "XL" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200 ${
              filter === tab.key
                ? "bg-[#02665e] text-white shadow-md"
                : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trips List */}
      {trips.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 mb-4">
            <Car className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No trips available</h3>
          <p className="text-slate-600">
            {filter === "all"
              ? "There are no scheduled trips available to claim at the moment."
              : `No ${filter} trips available. Try selecting a different vehicle type.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-200"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{getVehicleIcon(trip.vehicleType)}</div>
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {trip.vehicleType || "Vehicle"}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {formatDate(trip.scheduledDate)}
                    </p>
                  </div>
                </div>
                {trip.amount && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Fare</p>
                    <p className="font-bold text-[#02665e]">
                      {Number(trip.amount).toLocaleString()} {trip.currency || "TZS"}
                    </p>
                  </div>
                )}
              </div>

              {/* Route */}
              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-green-100 rounded-lg mt-0.5">
                    <MapPin className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 mb-0.5">Pickup</p>
                    <p className="font-semibold text-slate-900 text-sm line-clamp-2">
                      {trip.fromAddress || "Not specified"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="h-px w-full bg-slate-200" />
                  <Navigation className="w-4 h-4 text-slate-400 mx-2" />
                  <div className="h-px w-full bg-slate-200" />
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-[#02665e]/10 rounded-lg mt-0.5">
                    <Navigation className="w-4 h-4 text-[#02665e]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 mb-0.5">Drop-off</p>
                    <p className="font-semibold text-slate-900 text-sm line-clamp-2">
                      {trip.property?.title || trip.toAddress || "Not specified"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Trip Details */}
              <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
                {trip.numberOfPassengers && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span className="text-xs text-slate-700">
                      {trip.numberOfPassengers} passenger{trip.numberOfPassengers !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {trip.pickupTime && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="text-xs text-slate-700">{formatTime(trip.pickupTime)}</span>
                  </div>
                )}
                {trip.pickupLocation && (
                  <div className="flex items-center gap-2 col-span-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span className="text-xs text-slate-700">{trip.pickupLocation}</span>
                  </div>
                )}
                {trip.arrivalNumber && (
                  <div className="flex items-center gap-2 col-span-2">
                    {trip.arrivalType === "FLIGHT" ? (
                      <Plane className="w-4 h-4 text-slate-500" />
                    ) : trip.arrivalType === "BUS" ? (
                      <Car className="w-4 h-4 text-slate-500" />
                    ) : (
                      <Navigation className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="text-xs text-slate-700">
                      {trip.transportCompany && `${trip.transportCompany} `}
                      {trip.arrivalNumber}
                      {trip.arrivalTime && ` - Arrives ${formatTime(trip.arrivalTime)}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {trip.notes && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-semibold text-amber-900 mb-1">Special Instructions</p>
                  <p className="text-xs text-amber-800">{trip.notes}</p>
                </div>
              )}

              {/* Claim Button */}
              <button
                onClick={() => handleClaim(trip.id)}
                disabled={claiming === trip.id}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#02665e] to-[#014e47] text-white font-semibold hover:from-[#014e47] hover:to-[#02665e] transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {claiming === trip.id ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Claiming...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Claim This Trip</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


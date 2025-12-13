"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Car, MapPin, Clock, Star, User } from "lucide-react";

const api = axios.create();

type Ride = {
  id: number;
  scheduledDate: string;
  pickupTime?: string;
  dropoffTime?: string;
  fromRegion?: string;
  fromDistrict?: string;
  fromWard?: string;
  fromAddress?: string;
  toRegion?: string;
  toDistrict?: string;
  toWard?: string;
  toAddress?: string;
  driver?: {
    id: number;
    name: string;
    phone?: string;
  };
  property?: {
    id: number;
    title: string;
  };
  status: string;
  amount?: number;
  rating?: number;
  isValid: boolean;
  createdAt: string;
};

export default function MyRidesPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "valid" | "invalid">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    loadRides();
  }, []);

  const loadRides = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/customer/rides");
      setRides(response.data.items || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load rides");
    } finally {
      setLoading(false);
    }
  };

  const filteredRides = rides.filter((ride) => {
    if (filter === "valid") return ride.isValid;
    if (filter === "invalid") return !ride.isValid;
    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return "N/A";
    return new Date(timeString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatLocation = (ride: Ride, type: "from" | "to") => {
    const parts = [];
    if (type === "from") {
      if (ride.fromWard) parts.push(ride.fromWard);
      if (ride.fromDistrict) parts.push(ride.fromDistrict);
      if (ride.fromRegion) parts.push(ride.fromRegion);
      if (ride.fromAddress) parts.unshift(ride.fromAddress);
    } else {
      if (ride.toWard) parts.push(ride.toWard);
      if (ride.toDistrict) parts.push(ride.toDistrict);
      if (ride.toRegion) parts.push(ride.toRegion);
      if (ride.toAddress) parts.unshift(ride.toAddress);
      if (ride.property?.title) parts.unshift(ride.property.title);
    }
    return parts.length > 0 ? parts.join(", ") : "Not specified";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <p className="mt-4 text-slate-600">Loading your rides...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Rides</h1>
          <p className="text-slate-600 mt-1">View all your transportation bookings</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === "all"
              ? "border-b-2 border-emerald-600 text-emerald-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          All ({rides.length})
        </button>
        <button
          onClick={() => setFilter("valid")}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === "valid"
              ? "border-b-2 border-emerald-600 text-emerald-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Scheduled ({rides.filter((r) => r.isValid).length})
        </button>
        <button
          onClick={() => setFilter("invalid")}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === "invalid"
              ? "border-b-2 border-emerald-600 text-emerald-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Completed/Expired ({rides.filter((r) => !r.isValid).length})
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {filteredRides.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <Car className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No rides found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRides.map((ride) => (
            <div
              key={ride.id}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Car className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {formatDate(ride.scheduledDate)}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {ride.pickupTime ? `Pickup: ${formatTime(ride.pickupTime)}` : "Scheduled ride"}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    ride.isValid
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {ride.status}
                </span>
              </div>

              <div className="space-y-3">
                {/* Route */}
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm">
                      <div className="font-medium text-slate-900 mb-1">From:</div>
                      <div className="text-slate-600">{formatLocation(ride, "from")}</div>
                    </div>
                    <div className="text-sm mt-3">
                      <div className="font-medium text-slate-900 mb-1">To:</div>
                      <div className="text-slate-600">{formatLocation(ride, "to")}</div>
                    </div>
                  </div>
                </div>

                {/* Driver Info */}
                {ride.driver && (
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
                    <User className="w-5 h-5 text-slate-400" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900">{ride.driver.name}</div>
                      {ride.driver.phone && (
                        <div className="text-xs text-slate-600">{ride.driver.phone}</div>
                      )}
                    </div>
                    {ride.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium">{ride.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Amount */}
                {ride.amount && (
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <span className="text-sm text-slate-600">Amount:</span>
                    <span className="font-semibold text-slate-900">
                      {Number(ride.amount).toLocaleString("en-US")} TZS
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

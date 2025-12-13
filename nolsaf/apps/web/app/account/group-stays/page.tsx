"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Users, Calendar, MapPin, CheckCircle, XCircle } from "lucide-react";

const api = axios.create();

type GroupStay = {
  id: number;
  arrangement: {
    id: number;
    property: {
      id: number;
      title: string;
      type: string;
      regionName?: string;
      district?: string;
      city?: string;
    };
  };
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
  numberOfGuests: number;
  passengers?: Array<{
    id: number;
    name: string;
    phone?: string;
    nationality?: string;
  }>;
  isValid: boolean;
  createdAt: string;
};

export default function MyGroupStaysPage() {
  const [groupStays, setGroupStays] = useState<GroupStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "valid" | "invalid">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    loadGroupStays();
  }, []);

  const loadGroupStays = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/customer/group-stays");
      setGroupStays(response.data.items || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load group stays");
    } finally {
      setLoading(false);
    }
  };

  const filteredGroupStays = groupStays.filter((stay) => {
    if (filter === "valid") return stay.isValid;
    if (filter === "invalid") return !stay.isValid;
    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <p className="mt-4 text-slate-600">Loading your group stays...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Group Stay</h1>
          <p className="text-slate-600 mt-1">View all your group booking arrangements</p>
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
          All ({groupStays.length})
        </button>
        <button
          onClick={() => setFilter("valid")}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === "valid"
              ? "border-b-2 border-emerald-600 text-emerald-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Active ({groupStays.filter((s) => s.isValid).length})
        </button>
        <button
          onClick={() => setFilter("invalid")}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === "invalid"
              ? "border-b-2 border-emerald-600 text-emerald-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Completed/Expired ({groupStays.filter((s) => !s.isValid).length})
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {filteredGroupStays.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No group stays found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroupStays.map((stay) => (
            <div
              key={stay.id}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Users className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {stay.arrangement.property.title}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {stay.arrangement.property.type}
                    </p>
                  </div>
                </div>
                {stay.isValid ? (
                  <span className="flex items-center gap-1 text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded">
                    <CheckCircle className="w-4 h-4" />
                    Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-red-600 bg-red-50 px-3 py-1 rounded">
                    <XCircle className="w-4 h-4" />
                    Completed
                  </span>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-700">Check-in:</span>{" "}
                  <span className="text-slate-600">{formatDate(stay.checkIn)}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Check-out:</span>{" "}
                  <span className="text-slate-600">{formatDate(stay.checkOut)}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Number of Guests:</span>{" "}
                  <span className="text-slate-600">{stay.numberOfGuests}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Total Amount:</span>{" "}
                  <span className="font-semibold text-slate-900">
                    {Number(stay.totalAmount).toLocaleString("en-US")} TZS
                  </span>
                </div>
                {stay.arrangement.property.regionName && (
                  <div className="md:col-span-2 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                    <span className="text-slate-600">
                      {[
                        stay.arrangement.property.regionName,
                        stay.arrangement.property.district,
                        stay.arrangement.property.city,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
              </div>

              {stay.passengers && stay.passengers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="font-medium text-slate-900 mb-2">Passengers:</h4>
                  <div className="space-y-2">
                    {stay.passengers.map((passenger) => (
                      <div
                        key={passenger.id}
                        className="text-sm text-slate-600 bg-slate-50 p-2 rounded"
                      >
                        <span className="font-medium">{passenger.name}</span>
                        {passenger.nationality && (
                          <span className="text-slate-500"> • {passenger.nationality}</span>
                        )}
                        {passenger.phone && (
                          <span className="text-slate-500"> • {passenger.phone}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Calendar, Download, CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import Link from "next/link";

const api = axios.create();

type Booking = {
  id: number;
  property: {
    id: number;
    title: string;
    type: string;
    regionName?: string;
    district?: string;
    city?: string;
  };
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
  roomType?: string;
  rooms?: number;
  services?: any;
  isValid: boolean;
  isPaid: boolean;
  bookingCode: string | null;
  codeStatus: string | null;
  invoice?: {
    invoiceNumber?: string;
    receiptNumber?: string;
    status?: string;
  };
  createdAt: string;
};

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "valid" | "invalid">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/customer/bookings");
      setBookings(response.data.items || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (bookingId: number) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        alert("Please log in to download");
        return;
      }

      const response = await fetch(`/api/customer/bookings/${bookingId}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to generate PDF");
        return;
      }

      // Get HTML content
      const html = await response.text();
      
      // Create a new window and print
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (err: any) {
      alert("Failed to download PDF: " + (err?.message || "Unknown error"));
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    if (filter === "valid") return booking.isValid && booking.isPaid;
    if (filter === "invalid") return !booking.isValid || !booking.isPaid;
    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number) => {
    return Number(amount).toLocaleString("en-US");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <p className="mt-4 text-slate-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
          <p className="text-slate-600 mt-1">View and manage all your bookings</p>
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
          All ({bookings.length})
        </button>
        <button
          onClick={() => setFilter("valid")}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === "valid"
              ? "border-b-2 border-emerald-600 text-emerald-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Valid ({bookings.filter((b) => b.isValid && b.isPaid).length})
        </button>
        <button
          onClick={() => setFilter("invalid")}
          className={`px-4 py-2 font-medium transition-colors ${
            filter === "invalid"
              ? "border-b-2 border-emerald-600 text-emerald-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Expired/Canceled ({bookings.filter((b) => !b.isValid || !b.isPaid).length})
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No bookings found</p>
          <Link href="/public/properties" className="text-emerald-600 hover:underline mt-2 inline-block">
            Browse properties
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-slate-900">{booking.property.title}</h3>
                    {booking.isValid && booking.isPaid ? (
                      <span className="flex items-center gap-1 text-sm text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        <CheckCircle className="w-4 h-4" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
                        <XCircle className="w-4 h-4" />
                        {!booking.isPaid ? "Unpaid" : "Expired"}
                      </span>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600">
                    <div>
                      <span className="font-medium">Check-in:</span> {formatDate(booking.checkIn)}
                    </div>
                    <div>
                      <span className="font-medium">Check-out:</span> {formatDate(booking.checkOut)}
                    </div>
                    {booking.roomType && (
                      <div>
                        <span className="font-medium">Room Type:</span> {booking.roomType}
                      </div>
                    )}
                    {booking.rooms && (
                      <div>
                        <span className="font-medium">Rooms:</span> {booking.rooms}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Amount:</span>{" "}
                      <span className="font-semibold text-slate-900">
                        {formatAmount(booking.totalAmount)} TZS
                      </span>
                    </div>
                    {booking.bookingCode && (
                      <div>
                        <span className="font-medium">Booking Code:</span>{" "}
                        <span className="font-mono font-semibold text-emerald-600">
                          {booking.bookingCode}
                        </span>
                      </div>
                    )}
                  </div>

                  {booking.services && (
                    <div className="mt-3 text-sm">
                      <span className="font-medium text-slate-700">Services:</span>{" "}
                      <span className="text-slate-600">
                        {typeof booking.services === "string"
                          ? booking.services
                          : JSON.stringify(booking.services)}
                      </span>
                    </div>
                  )}

                  {booking.invoice?.receiptNumber && (
                    <div className="mt-2 text-sm text-slate-600">
                      <span className="font-medium">Receipt:</span> {booking.invoice.receiptNumber}
                    </div>
                  )}
                </div>

                <div className="ml-4 flex flex-col gap-2">
                  {booking.isValid && booking.isPaid && booking.bookingCode && (
                    <button
                      onClick={() => downloadPDF(booking.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                  )}
                  <Link
                    href={`/account/bookings/${booking.id}`}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

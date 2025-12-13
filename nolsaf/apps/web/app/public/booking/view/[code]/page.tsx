"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FileCheck2, Calendar, MapPin, User, CreditCard, CheckCircle } from "lucide-react";

type BookingData = {
  booking: {
    id: number;
    bookingCode: string;
    guestName: string;
    guestPhone?: string;
    nationality?: string;
    property: {
      title: string;
      type: string;
      regionName?: string;
      district?: string;
      city?: string;
      country?: string;
    };
    checkIn: string;
    checkOut: string;
    nights: number;
    roomType?: string;
    rooms?: number;
    totalAmount: number;
    status: string;
    services?: any;
    invoice?: {
      invoiceNumber?: string;
      receiptNumber?: string;
      paidAt?: string;
    };
  };
};

export default function PublicBookingViewPage() {
  const params = useParams();
  const code = params.code as string;
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    loadBooking();
  }, [code]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/booking/${code}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Booking not found");
      }
      const data = await response.json();
      setBooking(data);
    } catch (err: any) {
      setError(err.message || "Failed to load booking");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <p className="mt-4 text-slate-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg border border-red-200 p-6 text-center">
          <FileCheck2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Booking Not Found</h1>
          <p className="text-slate-600">{error || "The booking code you scanned is not valid or has expired."}</p>
        </div>
      </div>
    );
  }

  const b = booking.booking;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-emerald-100 rounded-full">
              <FileCheck2 className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">Booking Confirmation</h1>
          <div className="text-center mb-6">
            <div className="inline-block px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-sm text-slate-600">Booking Code:</span>
              <span className="ml-2 font-mono font-bold text-emerald-600 text-lg">{b.bookingCode}</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Personal Information */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-emerald-600 text-white px-4 py-2 font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Name:</span>
                  <span className="font-medium">{b.guestName}</span>
                </div>
                {b.guestPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Phone:</span>
                    <span className="font-medium">{b.guestPhone}</span>
                  </div>
                )}
                {b.nationality && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Nationality:</span>
                    <span className="font-medium">{b.nationality}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Details */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-emerald-600 text-white px-4 py-2 font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Booking Details
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Property:</span>
                  <span className="font-medium">{b.property.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Type:</span>
                  <span className="font-medium">{b.property.type}</span>
                </div>
                {b.property.regionName && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Location:</span>
                    <span className="font-medium text-right">
                      {[b.property.regionName, b.property.district, b.property.city]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
                {b.roomType && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Room Type:</span>
                    <span className="font-medium">{b.roomType}</span>
                  </div>
                )}
                {b.rooms && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Rooms:</span>
                    <span className="font-medium">{b.rooms}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Check-in:</span>
                  <span className="font-medium">{formatDate(b.checkIn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Check-out:</span>
                  <span className="font-medium">{formatDate(b.checkOut)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Nights:</span>
                  <span className="font-medium">{b.nights}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-600 font-semibold">Total Amount:</span>
                  <span className="font-bold text-lg text-emerald-600">
                    {Number(b.totalAmount).toLocaleString("en-US")} TZS
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            {b.invoice && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-emerald-600 text-white px-4 py-2 font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Information
                </div>
                <div className="p-4 space-y-2">
                  {b.invoice.receiptNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Receipt Number:</span>
                      <span className="font-medium">{b.invoice.receiptNumber}</span>
                    </div>
                  )}
                  {b.invoice.invoiceNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Invoice Number:</span>
                      <span className="font-medium">{b.invoice.invoiceNumber}</span>
                    </div>
                  )}
                  {b.invoice.paidAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Paid On:</span>
                      <span className="font-medium">{formatDate(b.invoice.paidAt)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-600">Payment Confirmed</span>
                  </div>
                </div>
              </div>
            )}

            {/* Services */}
            {b.services && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-emerald-600 text-white px-4 py-2 font-semibold">
                  Inclusive Services
                </div>
                <div className="p-4">
                  <p className="text-slate-700">
                    {typeof b.services === "string"
                      ? b.services
                      : JSON.stringify(b.services, null, 2)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This booking information was accessed via QR code scan. 
              Present your booking code at the property during check-in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

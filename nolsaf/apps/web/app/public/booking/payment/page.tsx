"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  Smartphone,
} from "lucide-react";
import LogoSpinner from "@/components/LogoSpinner";

type PaymentMethod = {
  id: "Airtel" | "Tigo" | "M-Pesa" | "Halopesa";
  name: string;
  icon: string;
  description: string;
};

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "Airtel",
    name: "Airtel Money",
    icon: "/assets/airtel_money.png",
    description: "Pay with Airtel Money",
  },
  {
    id: "M-Pesa",
    name: "M-Pesa",
    icon: "/assets/M-pesa.png",
    description: "Pay with M-Pesa",
  },
  {
    id: "Tigo",
    name: "Tigo Pesa",
    icon: "/assets/mix%20by%20yas.png",
    description: "Pay with Tigo Pesa",
  },
  {
    id: "Halopesa",
    name: "HaloPesa",
    icon: "/assets/halopesa.png",
    description: "Pay with HaloPesa",
  },
];

type InvoiceData = {
  id: number;
  invoiceNumber: string;
  paymentRef: string;
  status: string;
  totalAmount: number;
  currency: string;
  booking: {
    id: number;
    bookingCode: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    guestName: string | null;
    guestPhone: string | null;
    roomCode: string | null;
    roomsQty?: number;
    includeTransport?: boolean;
    totalAmount: number;
  };
  property: {
    id: number;
    title: string;
    type: string;
    primaryImage: string | null;
    basePrice: number;
  };
  priceBreakdown: {
    accommodationSubtotal: number;
    taxPercent: number;
    taxAmount: number;
    discount: number;
    transportFare: number;
    commission: number;
    subtotal: number;
    total: number;
  };
};

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "success" | "failed">("idle");
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchInvoice = useCallback(
    async (invoiceId: number) => {
      try {
        const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
        const response = await fetch(`${API}/api/public/invoices/${invoiceId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch invoice");
        }

        const data = await response.json();

        // Validate that we have required data
        if (!data || !data.property || !data.property.id) {
          throw new Error("Invoice data is incomplete. Property information is missing.");
        }

        setInvoice(data);

        // If already paid, redirect to receipt
        if (data.status === "PAID") {
          router.push(`/public/booking/receipt?invoiceId=${invoiceId}`);
          return;
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const invoiceId = searchParams?.get("invoiceId");
    if (!invoiceId) {
      setError("Missing invoice ID");
      setLoading(false);
      return;
    }

    fetchInvoice(Number(invoiceId));
  }, [searchParams, fetchInvoice]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  async function handlePayment() {
    if (!selectedMethod || !phoneNumber.trim() || !invoice) {
      setError("Please select a payment method and enter your phone number");
      return;
    }

    // Validate phone number format
    const phoneRegex = /^(\+255|255|0)?[0-9]{9}$/;
    const cleanedPhone = phoneNumber.replace(/\s+/g, "");
    if (!phoneRegex.test(cleanedPhone)) {
      setError("Please enter a valid phone number (e.g., +255 XXX XXX XXX)");
      return;
    }

    setError(null);
    setSubmitting(true);
    setProcessing(true);
    setPaymentStatus("pending");

    try {
      const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
      
      // Initiate payment
      const response = await fetch(`${API}/api/payments/azampay/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          phoneNumber: cleanedPhone,
          provider: selectedMethod.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to initiate payment");
      }

      // Start polling for payment status
      startPolling(result.paymentRef);
    } catch (err: any) {
      setError(err?.message || "Failed to initiate payment. Please try again.");
      setSubmitting(false);
      setProcessing(false);
      setPaymentStatus("failed");
    }
  }

  function startPolling(paymentRef: string) {
    // Poll every 2 seconds for up to 60 seconds (30 attempts)
    let attempts = 0;
    const maxAttempts = 30;

    pollingIntervalRef.current = setInterval(async () => {
      attempts++;

      try {
        const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
        const response = await fetch(`${API}/api/payments/azampay/status/${paymentRef}`);
        const data = await response.json();

        if (data.invoiceStatus === "PAID") {
          // Payment successful!
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          setPaymentStatus("success");
          setProcessing(false);
          
          // Redirect to receipt after 2 seconds
          setTimeout(() => {
            router.push(`/public/booking/receipt?invoiceId=${invoice?.id}`);
          }, 2000);
        } else if (data.paymentStatus === "FAILED") {
          // Payment failed
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          setPaymentStatus("failed");
          setProcessing(false);
          setSubmitting(false);
          setError("Payment failed. Please try again.");
        } else if (attempts >= maxAttempts) {
          // Timeout
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          setProcessing(false);
          setSubmitting(false);
          setError("Payment is taking longer than expected. Please check your phone or try again.");
        }
      } catch (err) {
        console.error("Polling error:", err);
        // Continue polling on error
      }
    }, 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        <div className="text-center animate-in fade-in duration-300">
          <div className="relative">
            <div className="mx-auto mb-4 inline-flex">
              <LogoSpinner size="lg" ariaLabel="Loading" />
            </div>
          </div>
          <p className="text-slate-700 font-medium text-lg">Loading payment details...</p>
          <p className="text-slate-500 text-sm mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  if (error && !invoice) {
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
        <div className="public-container py-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 hover:bg-[#02665e] text-slate-600 hover:text-white transition-all duration-200 group shadow-sm hover:shadow-md"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform duration-200" />
          </button>
        </div>
      </div>

      <div className="public-container py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content - Payment Methods */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Status */}
            {paymentStatus === "success" && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50/50 border-2 border-green-200 rounded-2xl p-8 text-center shadow-lg animate-in fade-in slide-in-from-top-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl lg:text-3xl font-bold text-green-900 mb-3">
                  Payment Successful!
                </h2>
                <p className="text-green-700 font-medium">
                  Redirecting to your receipt...
                </p>
              </div>
            )}

            {paymentStatus === "pending" && processing && (
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50/50 border-2 border-blue-200 rounded-2xl p-8 text-center shadow-lg animate-in fade-in slide-in-from-top-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LogoSpinner size="md" ariaLabel="Processing" />
                </div>
                <h2 className="text-2xl lg:text-3xl font-bold text-blue-900 mb-3">
                  Processing Payment...
                </h2>
                <p className="text-blue-700 font-medium">
                  Please complete the payment on your phone. We'll update you when it's confirmed.
                </p>
              </div>
            )}

            {/* Payment Method Selection */}
            {paymentStatus === "idle" && (
              <>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 p-5 lg:p-6 transition-all duration-300 hover:shadow-xl">
                  <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-4 lg:mb-5">
                    Select Payment Method
                  </h2>

                  <div className="grid grid-cols-2 gap-3 lg:gap-4">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethod(method)}
                        className={`group relative p-3.5 lg:p-4 rounded-lg border-2 transition-all duration-300 ${
                          selectedMethod?.id === method.id
                            ? "border-[#02665e] bg-gradient-to-br from-[#02665e]/10 to-blue-50/50 shadow-md ring-2 ring-[#02665e]/20"
                            : "border-slate-200 hover:border-[#02665e]/50 hover:shadow-md bg-white"
                        }`}
                      >
                        <div className="flex flex-col items-center text-center gap-2">
                          <div className="relative w-12 h-12 lg:w-14 lg:h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white shadow-sm ring-1 ring-slate-100">
                            <Image
                              src={method.icon}
                              alt={method.name}
                              fill
                              sizes="(max-width: 768px) 48px, 56px"
                              className="object-contain p-1.5"
                            />
                          </div>
                          <div className="w-full">
                            <div className={`font-bold text-sm lg:text-base mb-0.5 ${
                              selectedMethod?.id === method.id
                                ? "text-[#02665e]"
                                : "text-slate-900"
                            }`}>
                              {method.name}
                            </div>
                            <div className="text-xs text-slate-600">
                              {method.description}
                            </div>
                          </div>
                          {selectedMethod?.id === method.id && (
                            <div className="absolute top-1.5 right-1.5">
                              <div className="w-5 h-5 rounded-full bg-[#02665e] flex items-center justify-center shadow-md">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phone Number Input */}
                {selectedMethod && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 p-5 lg:p-6 transition-all duration-300 hover:shadow-xl overflow-hidden">
                    <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-5">
                      Enter Phone Number
                    </h2>

                    <div className="space-y-4">
                      <div className="min-w-0">
                        <label className="flex w-full text-sm font-semibold text-slate-700 mb-3 items-center gap-2">
                          <Smartphone className="w-4 h-4 text-[#02665e] flex-shrink-0" />
                          <span>Phone Number <span className="text-red-500">*</span></span>
                        </label>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+255 XXX XXX XXX"
                          className="w-full min-w-0 px-4 py-3.5 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] transition-all duration-200 text-slate-900 font-medium bg-white shadow-sm hover:shadow-md box-border"
                        />
                        <p className="text-xs text-slate-500 mt-2 ml-1">
                          Enter the phone number linked to your {selectedMethod.name} account
                        </p>
                      </div>

                      {error && (
                        <div className="bg-red-50/80 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm font-medium text-red-700">{error}</p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handlePayment}
                        disabled={submitting || !phoneNumber.trim()}
                        className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#02665e] to-[#014e47] text-white font-semibold hover:from-[#014e47] hover:to-[#02665e] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {submitting ? (
                          <>
                            <LogoSpinner size="sm" ariaLabel="Loading" className="text-white/90" />
                            <span>Initiating payment...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-5 h-5" />
                            <span>Pay {invoice?.totalAmount.toLocaleString()} {invoice?.currency}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar - Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/60 p-6 lg:p-8 sticky top-8 transition-all duration-300 hover:shadow-xl">
              <h2 className="text-xl lg:text-2xl font-bold text-slate-900 mb-6 lg:mb-8">
                Booking Summary
              </h2>

              {invoice && (
                <div className="space-y-5">
                  {invoice.property.primaryImage && (
                    <div className="relative w-full h-40 lg:h-48 rounded-xl overflow-hidden shadow-md ring-2 ring-slate-100">
                      <Image
                        src={invoice.property.primaryImage}
                        alt={invoice.property.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 384px"
                        className="object-cover"
                      />
                    </div>
                  )}

                  {/* Property */}
                  <div className="pb-4 border-b border-slate-200/60">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Property</div>
                    <div className="text-lg font-bold text-slate-900 leading-tight">
                      {invoice.property.title}
                    </div>
                    {invoice.property.type && (
                      <div className="text-sm text-slate-600 mt-1">
                        {invoice.property.type}
                      </div>
                    )}
                  </div>

                  {/* Guest Information */}
                  {(invoice.booking.guestName || invoice.booking.guestPhone) && (
                    <div className="pb-4 border-b border-slate-200/60">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Guest Information</div>
                      {invoice.booking.guestName && (
                        <div className="mb-2">
                          <div className="text-xs text-slate-500 mb-1">Name</div>
                          <div className="text-sm font-semibold text-slate-900">
                            {invoice.booking.guestName}
                          </div>
                        </div>
                      )}
                      {invoice.booking.guestPhone && (
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Phone</div>
                          <div className="text-sm font-semibold text-slate-900">
                            {invoice.booking.guestPhone}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Check-in & Check-out */}
                  <div className="pb-4 border-b border-slate-200/60">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Dates</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Check-in</div>
                        <div className="text-sm font-semibold text-slate-900">
                          {new Date(invoice.booking.checkIn).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Check-out</div>
                        <div className="text-sm font-semibold text-slate-900">
                          {new Date(invoice.booking.checkOut).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-200/60">
                      <div className="text-xs text-slate-500 mb-1">Duration</div>
                      <div className="text-sm font-semibold text-slate-900">
                        {invoice.booking.nights} night{invoice.booking.nights !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  {/* Room Type */}
                  {invoice.booking.roomCode && (
                    <div className="pb-4 border-b border-slate-200/60">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Room</div>
                      <div className="text-sm font-semibold text-slate-900">
                        {invoice.booking.roomCode}
                      </div>
                    </div>
                  )}

                  {/* Price Breakdown */}
                  <div className="pb-4 border-b border-slate-200/60">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Price Breakdown</div>
                    <div className="space-y-2.5">
                      {/* Accommodation */}
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          Accommodation ({invoice.booking.nights} night{invoice.booking.nights !== 1 ? "s" : ""}
                          {invoice.booking.roomsQty && invoice.booking.roomsQty > 1 ? ` × ${invoice.booking.roomsQty} rooms` : ""})
                        </span>
                        <span className="font-semibold text-slate-900">
                          {invoice.priceBreakdown?.accommodationSubtotal.toLocaleString() || (invoice.property.basePrice * invoice.booking.nights).toLocaleString()} {invoice.currency}
                        </span>
                      </div>
                      
                      {/* Tax - Always shown */}
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          Tax {invoice.priceBreakdown?.taxPercent && invoice.priceBreakdown.taxPercent > 0 ? `(${invoice.priceBreakdown.taxPercent}%)` : ""}
                        </span>
                        <span className={`font-semibold ${invoice.priceBreakdown?.taxAmount && invoice.priceBreakdown.taxAmount > 0 ? "text-slate-900" : "text-slate-400"}`}>
                          {invoice.priceBreakdown?.taxAmount ? invoice.priceBreakdown.taxAmount.toLocaleString() : "0"} {invoice.currency}
                        </span>
                      </div>
                      
                      {/* Service fee intentionally not shown here. */}
                      
                      {/* Transportation - Always shown */}
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Transportation</span>
                        <span className={`font-semibold ${invoice.priceBreakdown?.transportFare && invoice.priceBreakdown.transportFare > 0 ? "text-slate-900" : "text-slate-400"}`}>
                          {invoice.priceBreakdown?.transportFare ? invoice.priceBreakdown.transportFare.toLocaleString() : "0"} {invoice.currency}
                        </span>
                      </div>
                      
                      {/* Subtotal - Always shown if breakdown exists */}
                      {invoice.priceBreakdown?.subtotal !== undefined && (
                        <div className="flex justify-between text-sm pt-2 border-t border-slate-200/60">
                          <span className="font-medium text-slate-700">Subtotal</span>
                          <span className="font-semibold text-slate-900">
                            {invoice.priceBreakdown.subtotal.toLocaleString()} {invoice.currency}
                          </span>
                        </div>
                      )}
                      
                      {/* Discount - Always shown */}
                      <div className="flex justify-between text-sm">
                        <span className={`font-medium ${invoice.priceBreakdown?.discount && invoice.priceBreakdown.discount > 0 ? "text-green-600" : "text-slate-400"}`}>
                          Discount
                        </span>
                        <span className={`font-semibold ${invoice.priceBreakdown?.discount && invoice.priceBreakdown.discount > 0 ? "text-green-600" : "text-slate-400"}`}>
                          {invoice.priceBreakdown?.discount && invoice.priceBreakdown.discount > 0 ? "-" : ""}{invoice.priceBreakdown?.discount ? invoice.priceBreakdown.discount.toLocaleString() : "0"} {invoice.currency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="pt-2 pb-4 border-b border-slate-200/60">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-slate-900">Total</span>
                      <span className="text-2xl font-bold text-[#02665e]">
                        {invoice.totalAmount.toLocaleString()} {invoice.currency}
                      </span>
                    </div>
                  </div>

                  {/* Secure Payment */}
                  <div className="pt-4">
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-xl border border-slate-200/60">
                      <ShieldCheck className="w-5 h-5 text-[#02665e] flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 mb-1 text-sm">
                          Secure Payment
                        </div>
                        <div className="text-xs text-slate-600 leading-relaxed">
                          Your payment is processed securely through our payment partners.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


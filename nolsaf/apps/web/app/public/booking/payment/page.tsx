"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  Smartphone,
  X,
  Info,
} from "lucide-react";

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
  };
  property: {
    id: number;
    title: string;
    primaryImage: string | null;
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

  useEffect(() => {
    const invoiceId = searchParams.get("invoiceId");
    if (!invoiceId) {
      setError("Missing invoice ID");
      setLoading(false);
      return;
    }

    fetchInvoice(Number(invoiceId));
  }, [searchParams]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  async function fetchInvoice(invoiceId: number) {
    try {
      const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
      const response = await fetch(`${API}/api/public/invoices/${invoiceId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch invoice");
      }

      const data = await response.json();
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
  }

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#02665e] mx-auto mb-4" />
          <p className="text-slate-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error && !invoice) {
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href={invoice ? `/public/properties/${invoice.property.id}` : "/public/properties"}
            className="inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Status */}
            {paymentStatus === "success" && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-green-900 mb-2">
                  Payment Successful!
                </h2>
                <p className="text-green-700">
                  Redirecting to your receipt...
                </p>
              </div>
            )}

            {paymentStatus === "pending" && processing && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center">
                <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
                <h2 className="text-2xl font-semibold text-blue-900 mb-2">
                  Processing Payment...
                </h2>
                <p className="text-blue-700">
                  Please complete the payment on your phone. We'll update you when it's confirmed.
                </p>
              </div>
            )}

            {/* Payment Method Selection */}
            {paymentStatus === "idle" && (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-2xl font-semibold text-slate-900 mb-6">
                    Select Payment Method
                  </h2>

                  <div className="grid grid-cols-2 gap-4">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethod(method)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedMethod?.id === method.id
                            ? "border-[#02665e] bg-[#02665e]/5"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={method.icon}
                              alt={method.name}
                              fill
                              className="object-contain"
                            />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-slate-900">
                              {method.name}
                            </div>
                            <div className="text-sm text-slate-600">
                              {method.description}
                            </div>
                          </div>
                          {selectedMethod?.id === method.id && (
                            <CheckCircle2 className="w-5 h-5 text-[#02665e] ml-auto" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Phone Number Input */}
                {selectedMethod && (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-xl font-semibold text-slate-900 mb-4">
                      Enter Phone Number
                    </h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-5 h-5 text-slate-400" />
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+255 XXX XXX XXX"
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent"
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Enter the phone number linked to your {selectedMethod.name} account
                        </p>
                      </div>

                      {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handlePayment}
                        disabled={submitting || !phoneNumber.trim()}
                        className="w-full py-3 px-6 rounded-lg bg-[#02665e] text-white font-medium hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Initiating payment...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-5 h-5" />
                            Pay {invoice?.totalAmount.toLocaleString()} {invoice?.currency}
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-6">
                Booking Summary
              </h2>

              {invoice && (
                <div className="space-y-4">
                  {invoice.property.primaryImage && (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden">
                      <Image
                        src={invoice.property.primaryImage}
                        alt={invoice.property.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div>
                    <div className="text-sm text-slate-600 mb-1">Property</div>
                    <div className="font-semibold text-slate-900">
                      {invoice.property.title}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-slate-600 mb-1">Booking Code</div>
                    <div className="font-mono font-semibold text-[#02665e]">
                      {invoice.booking.bookingCode}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-slate-600 mb-1">Duration</div>
                    <div className="text-slate-900">
                      {invoice.booking.nights} night{invoice.booking.nights !== 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-slate-900">Total</span>
                      <span className="text-2xl font-bold text-[#02665e]">
                        {invoice.totalAmount.toLocaleString()} {invoice.currency}
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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


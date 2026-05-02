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
  Clock3,
  RefreshCw,
  ReceiptText,
} from "lucide-react";
import LogoSpinner from "@/components/LogoSpinner";

const PAYMENT_WAIT_SECONDS = 4 * 60;
const PAYMENT_RETRY_WINDOW_SECONDS = 5 * 60;
const PAYMENT_RETRY_LIMIT = 3;

type PaymentMethod = {
  id: "Airtel" | "Mixx" | "M-Pesa" | "Halopesa";
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
    id: "Mixx",
    name: "Mixx by Yas",
    icon: "/assets/mix%20by%20yas.png",
    description: "Pay with Mixx by Yas",
  },
  {
    id: "Halopesa",
    name: "HaloPesa",
    icon: "/assets/halopesa.png",
    description: "Pay with HaloPesa",
  },
];

function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function toDisplayMessage(value: unknown, fallback: string) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) return record.message.trim();
    if (typeof record.error === "string" && record.error.trim()) return record.error.trim();
  }

  return fallback;
}

function formatPaymentError(message?: unknown, retryAfterSeconds?: number) {
  const plainMessage = toDisplayMessage(message, "Failed to initiate payment. Please try again.");
  const normalized = plainMessage.trim().toLowerCase();
  if (normalized === "rate_limited" || normalized?.includes("too many payment requests")) {
    if (retryAfterSeconds && retryAfterSeconds > 0) {
      return `Too many payment requests. Try again in ${formatCountdown(retryAfterSeconds)}.`;
    }
    return "Too many payment requests. Please wait before trying again.";
  }

  if (normalized === "unauthorized" || normalized === "forbidden") {
    return "Payment service is not available yet. Please try again later.";
  }

  return plainMessage;
}

function isPaymentCooldownMessage(message: string | null) {
  return message?.toLowerCase().includes("too many payment requests") ?? false;
}

function getPaymentAttemptKey(invoiceId: number, phone: string) {
  return `nolsaf:payment-attempts:${invoiceId}:${phone}`;
}

function registerPaymentAttempt(invoiceId: number, phone: string) {
  if (typeof window === "undefined") return 0;

  const now = Date.now();
  const windowMs = PAYMENT_RETRY_WINDOW_SECONDS * 1000;
  const key = getPaymentAttemptKey(invoiceId, phone);

  try {
    const raw = window.localStorage.getItem(key);
    const current = raw ? JSON.parse(raw) as { startedAt: number; count: number } : null;
    const expired = !current || now - current.startedAt >= windowMs;

    if (expired) {
      window.localStorage.setItem(key, JSON.stringify({ startedAt: now, count: 1 }));
      return 0;
    }

    if (current.count >= PAYMENT_RETRY_LIMIT) {
      return Math.ceil((current.startedAt + windowMs - now) / 1000);
    }

    window.localStorage.setItem(key, JSON.stringify({ ...current, count: current.count + 1 }));
    return 0;
  } catch {
    return 0;
  }
}

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
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "success" | "failed" | "timeout">("idle");
  const [authRequired, setAuthRequired] = useState(false);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(PAYMENT_WAIT_SECONDS);
  const [paymentCooldownSeconds, setPaymentCooldownSeconds] = useState(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const paymentReturnQuery = searchParams?.toString();
  const paymentReturnPath = `/public/booking/payment${paymentReturnQuery ? `?${paymentReturnQuery}` : ""}`;
  const loginHref = `/account/login?next=${encodeURIComponent(paymentReturnPath)}`;
  const registerHref = `/account/register?mode=register&role=traveller&next=${encodeURIComponent(paymentReturnPath)}`;

  const fetchInvoice = useCallback(
    async (invoiceId: number, accessToken: string) => {
      try {
        const url = new URL(`/api/public/invoices/${invoiceId}`, window.location.origin);
        url.searchParams.set("accessToken", accessToken);
        const response = await fetch(url.toString());

        if (!response.ok) {
          throw new Error("Failed to fetch invoice");
        }

        const data = await response.json();

        // Validate that we have required data
        if (!data || !data.property || !data.property.id) {
          throw new Error("Invoice data is incomplete. Property information is missing.");
        }

        setInvoice(data);

        if (data.status === "PAID") {
          setPaymentStatus("success");
        }
      } catch (err: any) {
        setError(toDisplayMessage(err, "Failed to load invoice"));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const invoiceId = searchParams?.get("invoiceId");
    const accessToken = searchParams?.get("accessToken");
    if (!invoiceId) {
      setError("Missing invoice ID");
      setLoading(false);
      return;
    }

    if (!accessToken) {
      setError("Missing invoice access token");
      setLoading(false);
      return;
    }

    fetchInvoice(Number(invoiceId), accessToken);
  }, [searchParams, fetchInvoice]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (paymentStatus !== "pending") {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }

    setRemainingSeconds(PAYMENT_WAIT_SECONDS);
    const startedAt = Date.now();
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const nextRemaining = PAYMENT_WAIT_SECONDS - elapsed;
      setRemainingSeconds(Math.max(0, nextRemaining));
      if (nextRemaining <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setPaymentStatus((current) => (current === "pending" ? "timeout" : current));
        setSubmitting(false);
      }
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [paymentStatus]);

  useEffect(() => {
    if (paymentCooldownSeconds <= 0) return;

    const cooldownTimer = setInterval(() => {
      setPaymentCooldownSeconds((current) => {
        if (current <= 1) {
          setError((message) => (isPaymentCooldownMessage(message) ? null : message));
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(cooldownTimer);
  }, [paymentCooldownSeconds]);

  async function handlePayment() {
    if (paymentCooldownSeconds > 0) {
      setError(null);
      return;
    }

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

    const localRetryAfter = registerPaymentAttempt(invoice.id, cleanedPhone);
    if (localRetryAfter > 0) {
      setPaymentCooldownSeconds(localRetryAfter);
      setPaymentStatus("failed");
      setError(null);
      return;
    }

    setError(null);
    setAuthRequired(false);
    setSubmitting(true);
    setPaymentStatus("pending");
    setRemainingSeconds(PAYMENT_WAIT_SECONDS);

    try {
      // Initiate payment
      const response = await fetch(`/api/payments/azampay/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          phoneNumber: cleanedPhone,
          provider: selectedMethod.id,
          accessToken: searchParams?.get("accessToken") || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setAuthRequired(true);
          setError(null);
          setSubmitting(false);
          setPaymentStatus("failed");
          return;
        }
        const retryAfterHeader = Number(response.headers.get("Retry-After"));
        const retryAfterSeconds = Number(result.retryAfterSeconds || retryAfterHeader || 0);
        const message = formatPaymentError(result.message ?? result.error, retryAfterSeconds);
        if (response.status === 429 && retryAfterSeconds > 0) {
          setPaymentCooldownSeconds(retryAfterSeconds);
          setError(null);
          setSubmitting(false);
          setPaymentStatus("failed");
          return;
        }
        throw new Error(message);
      }

      // Start polling for payment status
      const ref = result.paymentRef || result.transactionId || invoice.paymentRef;
      setPaymentCooldownSeconds(0);
      setPaymentRef(ref);
      startPolling(ref);
    } catch (err: any) {
      setError(formatPaymentError(err));
      setSubmitting(false);
      setPaymentStatus("failed");
    }
  }

  function startPolling(ref: string) {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    const invoiceId = invoice?.id;
    const accessToken = searchParams?.get("accessToken");
    if (!invoiceId || !accessToken) return;

    const pollInvoice = async () => {
      const url = new URL(`/api/public/invoices/${invoiceId}`, window.location.origin);
      url.searchParams.set("accessToken", accessToken);
      const response = await fetch(url.toString(), { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to check invoice status");
      }
      const data = await response.json();
      setInvoice(data);

      if (data.status === "PAID") {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setPaymentStatus("success");
        setSubmitting(false);
        setError(null);
        return true;
      }

      return false;
    };

    void pollInvoice().catch((err) => {
      console.error("Initial payment polling error:", err);
    });

    // Poll for longer than the visible countdown so late webhooks can still update the card.
    let attempts = 0;
    const maxAttempts = 200;

    pollingIntervalRef.current = setInterval(async () => {
      attempts++;

      try {
        const completed = await pollInvoice();
        if (completed) {
          return;
        }

        if (attempts >= maxAttempts) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.error("Payment polling error:", err, ref);
      }
    }, 3000);
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
              <div className="bg-white border-2 border-emerald-200 rounded-2xl p-6 lg:p-8 shadow-lg animate-in fade-in slide-in-from-top-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-center text-2xl lg:text-3xl font-bold text-green-900 mb-3">
                  Payment Successful
                </h2>
                <p className="text-center text-green-700 font-medium">
                  Your booking is confirmed. The booking code will be available in your account.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/account/bookings"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#02665e] px-5 py-3 font-semibold text-white shadow-md transition hover:bg-[#014e47]"
                  >
                    <ReceiptText className="h-5 w-5" />
                    My Bookings
                  </Link>
                  {invoice && (
                    <Link
                      href={`/public/booking/receipt?${new URLSearchParams({
                        invoiceId: String(invoice.id),
                        accessToken: String(searchParams?.get("accessToken") || ""),
                      }).toString()}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 font-semibold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      View Receipt
                    </Link>
                  )}
                </div>
              </div>
            )}

            {paymentStatus === "pending" && (
              <div className="bg-white border-2 border-blue-200 rounded-2xl p-6 lg:p-8 shadow-lg animate-in fade-in slide-in-from-top-4">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <LogoSpinner size="sm" ariaLabel="Processing" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-blue-950">Waiting for Payment</h2>
                      <p className="mt-2 text-sm leading-6 text-blue-800">
                        We sent a payment request to your phone. Keep this page open and approve the prompt on your mobile money account.
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
                      <Clock3 className="h-4 w-4" />
                      Time left
                    </div>
                    <div className="mt-1 font-mono text-2xl font-black text-blue-950">
                      {formatCountdown(remainingSeconds)}
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-3">
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-500">Invoice</div>
                    <div className="mt-1 font-semibold text-slate-900">{invoice?.invoiceNumber || `#${invoice?.id}`}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-500">Amount</div>
                    <div className="mt-1 font-semibold text-slate-900">
                      {invoice?.totalAmount.toLocaleString()} {invoice?.currency}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-500">Phone</div>
                    <div className="mt-1 font-semibold text-slate-900">{phoneNumber || invoice?.booking.guestPhone || "-"}</div>
                  </div>
                </div>
                {paymentRef && (
                  <p className="mt-4 text-xs text-slate-500">
                    Payment reference: <span className="font-mono">{paymentRef}</span>
                  </p>
                )}
              </div>
            )}

            {paymentStatus === "timeout" && (
              <div className="bg-white border-2 border-amber-200 rounded-2xl p-6 lg:p-8 shadow-lg animate-in fade-in slide-in-from-top-4">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <Clock3 className="h-6 w-6 text-amber-700" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-amber-950">Payment Not Confirmed Yet</h2>
                    <p className="mt-2 text-sm leading-6 text-amber-800">
                      Your booking details are still here. You do not need to choose the room again. If you did not approve the phone prompt, try sending a new payment request.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {paymentStatus === "failed" && !authRequired && (
              <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-lg shadow-rose-950/5 animate-in fade-in slide-in-from-top-4 lg:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-rose-50 ring-1 ring-rose-100">
                    <AlertCircle className="h-5 w-5 text-rose-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold leading-tight text-slate-950 sm:text-2xl">
                      Payment Request Failed
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                      Your booking details are saved. Please confirm the phone number and try again.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method Selection */}
            {(paymentStatus === "idle" || paymentStatus === "failed" || paymentStatus === "timeout") && (
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
                          <div className="relative h-16 w-24 flex-shrink-0">
                            <Image
                              src={method.icon}
                              alt={method.name}
                              fill
                              sizes="96px"
                              className="object-contain"
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

                      {error && !isPaymentCooldownMessage(error) && (
                        <div className="bg-red-50/80 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm font-medium text-red-700">{error}</p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handlePayment}
                        disabled={submitting || authRequired || paymentCooldownSeconds > 0 || !phoneNumber.trim()}
                        className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#02665e] to-[#014e47] text-white font-semibold hover:from-[#014e47] hover:to-[#02665e] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {submitting ? (
                          <>
                            <LogoSpinner size="sm" ariaLabel="Loading" className="text-white/90" />
                            <span>Initiating payment...</span>
                          </>
                        ) : authRequired ? (
                          <>
                            <ShieldCheck className="w-5 h-5" />
                            <span>Sign in to continue payment</span>
                          </>
                        ) : paymentCooldownSeconds > 0 ? (
                          <>
                            <Clock3 className="w-5 h-5" />
                            <span>Try again in {formatCountdown(paymentCooldownSeconds)}</span>
                          </>
                        ) : (
                          <>
                            {paymentStatus === "failed" || paymentStatus === "timeout" ? (
                              <RefreshCw className="w-5 h-5" />
                            ) : (
                              <CreditCard className="w-5 h-5" />
                            )}
                            <span>
                              {paymentStatus === "failed" || paymentStatus === "timeout" ? "Send payment request again" : "Pay"}{" "}
                              {invoice?.totalAmount.toLocaleString()} {invoice?.currency}
                            </span>
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
                        loading="eager"
                        priority
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
                      
                      {/* Transportation - only shown when transport was included */}
                      {(invoice.booking.includeTransport || (invoice.priceBreakdown?.transportFare && invoice.priceBreakdown.transportFare > 0)) && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Transportation</span>
                        <span className="font-semibold text-slate-900">
                          {invoice.priceBreakdown?.transportFare ? invoice.priceBreakdown.transportFare.toLocaleString() : "0"} {invoice.currency}
                        </span>
                      </div>
                      )}
                      
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

      {authRequired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-emerald-100 bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,0.24)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#02665e] ring-1 ring-emerald-100">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold leading-tight text-slate-950">
                  Sign in to continue payment
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Your booking is still reserved. You will return here after sign in.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link
                href={loginHref}
                className="inline-flex items-center justify-center rounded-2xl bg-[#02665e] px-4 py-3 text-sm font-semibold text-white no-underline shadow-md transition hover:bg-[#014e47] hover:no-underline"
                style={{ textDecoration: "none" }}
              >
                Sign in
              </Link>
              <Link
                href={registerHref}
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 no-underline transition hover:bg-emerald-100 hover:no-underline"
                style={{ textDecoration: "none" }}
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


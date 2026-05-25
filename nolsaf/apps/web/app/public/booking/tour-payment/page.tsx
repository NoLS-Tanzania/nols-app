"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Smartphone,
  Clock3,
  RefreshCw,
  Lock,
  Loader2,
  MapPin,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const PAYMENT_WAIT_SECONDS = 4 * 60;
const PAYMENT_POLL_MAX_ATTEMPTS = 45;
const PAYMENT_POLL_FAST_DELAY_MS = 3000;
const PAYMENT_POLL_SLOW_DELAY_MS = 10000;
const PAYMENT_RETRY_LIMIT = 3;
const PAYMENT_RETRY_WINDOW_SECONDS = 5 * 60;

type PaymentMethod = {
  id: "Airtel" | "Mixx" | "M-Pesa" | "Halopesa";
  name: string;
  icon: string;
  description: string;
};

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "Airtel",   name: "Airtel Money", icon: "/assets/airtel_money.png",   description: "Pay with Airtel Money" },
  { id: "M-Pesa",   name: "M-Pesa",       icon: "/assets/M-pesa.png",         description: "Pay with M-Pesa" },
  { id: "Mixx",     name: "Mixx by Yas",  icon: "/assets/mix%20by%20yas.png", description: "Pay with Mixx by Yas" },
  { id: "Halopesa", name: "HaloPesa",     icon: "/assets/halopesa.png",       description: "Pay with HaloPesa" },
];

function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmt(n: number, currency = "TZS"): string {
  return `${currency} ${Number(n).toLocaleString("en-US")}`;
}

const _IDEM_STORAGE_KEY = (tourBookingId: number, phone: string) =>
  `nolsaf:tour-pay:${tourBookingId}:${phone}`;

function isPaymentCooldownMessage(msg: string | null): boolean {
  return !!msg && msg.toLowerCase().includes("wait");
}

// ── Component ─────────────────────────────────────────────────────────────────
function paymentApiMessage(payload: any, fallback: string): string {
  if (payload?.error === "payment_access_expired") {
    return "This draft payment link has expired. Please create a new booking to continue.";
  }
  return payload?.message || payload?.error || fallback;
}

export default function TourPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tourBookingId = Number(searchParams?.get("tourBookingId") || 0);
  const accessToken = searchParams?.get("accessToken") || "";

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod["id"] | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "success" | "failed" | "timeout">("idle");
  const [_paymentRef, setPaymentRef] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(PAYMENT_WAIT_SECONDS);
  const [paymentCooldownSeconds, setPaymentCooldownSeconds] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [retryWindowStart, setRetryWindowStart] = useState<number | null>(null);

  const pollingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load booking ──────────────────────────────────────────────────────────
  const fetchBooking = useCallback(
    async (id: number, token: string) => {
      try {
        const url = new URL(`/api/public/tour-bookings/${id}/payment-status`, window.location.origin);
        url.searchParams.set("accessToken", token);
        const res = await fetch(url.toString());
        const data = await res.json();
        if (!res.ok) throw new Error(paymentApiMessage(data, "Failed to load booking"));
        setBooking(data.booking);
        if (data.booking?.paymentStatus === "PAID") {
          setPaymentStatus("success");
        }
        // Pre-fill phone from booking
        if (data.booking?.guestPhone && !phoneNumber) {
          setPhoneNumber(data.booking.guestPhone.replace("+255", "0"));
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load booking information.");
      } finally {
        setLoading(false);
      }
    },
    [phoneNumber]
  );

  useEffect(() => {
    if (!tourBookingId || !accessToken) {
      setError("Missing booking information.");
      setLoading(false);
      return;
    }
    fetchBooking(tourBookingId, accessToken);
  }, [tourBookingId, accessToken, fetchBooking]);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (paymentStatus !== "pending") {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      return;
    }
    setRemainingSeconds(PAYMENT_WAIT_SECONDS);
    const startedAt = Date.now();
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const next = PAYMENT_WAIT_SECONDS - elapsed;
      setRemainingSeconds(Math.max(0, next));
      if (next <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setPaymentStatus((cur) => (cur === "pending" ? "timeout" : cur));
        setSubmitting(false);
      }
    }, 1000);
    return () => { if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current); };
  }, [paymentStatus]);

  // ── Cooldown timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (paymentCooldownSeconds <= 0) return;
    const t = setInterval(() => {
      setPaymentCooldownSeconds((c) => {
        if (c <= 1) {
          setError((msg) => (isPaymentCooldownMessage(msg) ? null : msg));
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [paymentCooldownSeconds]);

  // ── Poll booking status ───────────────────────────────────────────────────
  function startPolling() {
    if (pollingIntervalRef.current) { clearTimeout(pollingIntervalRef.current); pollingIntervalRef.current = null; }

    let attempts = 0;

    const pollBooking = async (): Promise<boolean> => {
      const url = new URL(`/api/public/tour-bookings/${tourBookingId}/payment-status`, window.location.origin);
      url.searchParams.set("accessToken", accessToken);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error("Poll failed");
      const data = await res.json();
      setBooking(data.booking);
      if (data.booking?.paymentStatus === "PAID") {
        if (pollingIntervalRef.current) { clearTimeout(pollingIntervalRef.current); pollingIntervalRef.current = null; }
        setPaymentStatus("success");
        setSubmitting(false);
        return true;
      }
      return false;
    };

    const scheduleNext = () => {
      if (attempts >= PAYMENT_POLL_MAX_ATTEMPTS) return;
      const delay = attempts < 20 ? PAYMENT_POLL_FAST_DELAY_MS : PAYMENT_POLL_SLOW_DELAY_MS;
      pollingIntervalRef.current = setTimeout(runPoll, delay);
    };

    const runPoll = async () => {
      attempts++;
      try {
        const done = await pollBooking();
        if (!done) scheduleNext();
      } catch {
        scheduleNext();
      }
    };

    void pollBooking().catch(() => {});
    scheduleNext();
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearTimeout(pollingIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // ── Submit payment ────────────────────────────────────────────────────────
  async function handlePayment() {
    if (paymentCooldownSeconds > 0) return;
    if (!selectedMethod || !phoneNumber.trim() || !booking) {
      setError("Please select a payment method and enter your phone number.");
      return;
    }

    // Retry rate check (client-side)
    const now = Date.now();
    if (retryWindowStart && now - retryWindowStart < PAYMENT_RETRY_WINDOW_SECONDS * 1000) {
      if (retryCount >= PAYMENT_RETRY_LIMIT) {
        const waitSec = Math.ceil((PAYMENT_RETRY_WINDOW_SECONDS * 1000 - (now - retryWindowStart)) / 1000);
        setError(`Too many attempts. Please wait ${Math.ceil(waitSec / 60)} minute(s) before retrying.`);
        return;
      }
    } else {
      setRetryWindowStart(now);
      setRetryCount(0);
    }

    setError(null);
    setSubmitting(true);
    setPaymentStatus("idle");

    try {
      const res = await fetch(`/api/public/tour-bookings/${tourBookingId}/initiate-payment`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          provider: selectedMethod,
          accessToken,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        const retryAfterHeader = Number(res.headers.get("Retry-After") || 0);
        const retryAfterSec = Number(result.retryAfterSeconds || retryAfterHeader || 0);
        if (res.status === 429 && retryAfterSec > 0) {
          setPaymentCooldownSeconds(retryAfterSec);
          setError(null);
          setSubmitting(false);
          setPaymentStatus("failed");
          return;
        }
        throw new Error(paymentApiMessage(result, "Payment initiation failed."));
      }

      setRetryCount((c) => c + 1);
      const ref = result.paymentRef || result.transactionId;
      setPaymentRef(ref);
      setPaymentStatus("pending");
      startPolling();
    } catch (err: any) {
      setError(err?.message || "Payment failed. Please try again.");
      setSubmitting(false);
      setPaymentStatus("failed");
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (paymentStatus === "success" || booking?.paymentStatus === "PAID") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Payment Confirmed</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ background: "linear-gradient(135deg, #02665e, #4ecdc4)" }}
          >
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-500 text-sm mb-6 max-w-xs">
            Your tour package booking has been paid and confirmed. The operator will be in touch with you.
          </p>
          {booking?.bookingCode && (
            <div className="bg-white rounded-2xl border border-[#02665e]/20 px-6 py-4 mb-6">
              <p className="text-xs text-gray-400 mb-1">Booking Reference</p>
              <p className="text-xl font-bold text-[#02665e] tracking-widest">{booking.bookingCode}</p>
            </div>
          )}
          {booking && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 w-full max-w-sm text-left space-y-2 mb-6">
              {booking.title && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Package</span>
                  <span className="font-medium text-gray-900 text-right max-w-[60%]">{booking.title}</span>
                </div>
              )}
              {booking.destination && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Destination</span>
                  <span className="font-medium text-gray-900">{booking.destination}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Travelers</span>
                <span className="font-medium text-gray-900">{booking.travelerCount}</span>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t border-gray-100">
                <span className="text-gray-500">Amount Paid</span>
                <span className="font-bold text-[#02665e]">{fmt(Number(booking.amountDue ?? booking.grossAmount), booking.currency)}</span>
              </div>
            </div>
          )}
          <Link
            href="/"
            className="text-sm text-[#02665e] underline underline-offset-2"
          >
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  // ── Loading / error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#02665e]" />
      </div>
    );
  }

  if (!booking && error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-red-600 text-center mb-4 text-sm">{error}</p>
        <button onClick={() => router.back()} className="text-[#02665e] text-sm underline">Go back</button>
      </div>
    );
  }

  const operatorName = (booking?.operatorSnapshot as any)?.companyName || "Tour Operator";
  const amount = Number(booking?.amountDue ?? booking?.grossAmount ?? 0);
  const currency = booking?.currency || "TZS";

  const bookingSummaryCard = booking ? (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-[#02665e]/10">
      <div
        className="px-5 pt-5 pb-4"
        style={{ background: "linear-gradient(135deg, #02665e 0%, #028570 55%, #3ab8af 100%)" }}
      >
        <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white/90 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">
          Booking Summary
        </span>
        {booking.title && (
          <h2 className="text-xl font-extrabold text-white leading-snug">{booking.title}</h2>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-2.5">
          {booking.destination && (
            <span className="flex items-center gap-1 text-white/85 text-xs bg-white/15 px-2.5 py-1 rounded-full">
              <MapPin className="w-3 h-3 flex-shrink-0" />{booking.destination}
            </span>
          )}
          {booking.bookingCode && (
            <span className="text-white/85 text-xs bg-white/15 px-2.5 py-1 rounded-full font-mono">
              {booking.bookingCode}
            </span>
          )}
        </div>
      </div>
      <div className="bg-white px-5 py-3.5 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Travelers</span>
          <span className="font-medium text-gray-900">{booking.travelerCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Service Fee</span>
            <span className="font-medium text-gray-900">{fmt(Number(booking.commissionAmount || 0), currency)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Tax</span>
          <span className="font-medium text-gray-900">{fmt(0, currency)}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-sm font-semibold text-gray-700">Total Due</span>
          <span className="text-xl font-bold text-[#02665e]">{fmt(amount, currency)}</span>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-[#f5faf9] overflow-x-hidden">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          {paymentStatus === "idle" || paymentStatus === "failed" ? (
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
          ) : null}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-tight truncate">Secure Payment</p>
            <p className="text-xs text-gray-400 truncate">{operatorName}</p>
          </div>
          <span className="flex-shrink-0 text-[10px] font-bold text-[#02665e] bg-[#02665e]/10 px-2.5 py-1 rounded-full tracking-wide">
            STEP 2 OF 2
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-10 xl:gap-14 lg:items-start">

          {/* LEFT: Payment content */}
          <div className="space-y-5 min-w-0 overflow-hidden">
            <div className="lg:hidden">{bookingSummaryCard}</div>

            {/* Pending state */}
            {paymentStatus === "pending" && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Smartphone className="w-5 h-5 text-amber-600 animate-pulse" />
                  <p className="font-semibold text-amber-800 text-sm">Check your phone for a payment prompt</p>
                </div>
                <p className="text-xs text-amber-600 mb-3">
                  Approve the payment on your {selectedMethod} app or dial the USSD code to confirm.
                </p>
                <div className="flex items-center justify-center gap-2 text-amber-700">
                  <Clock3 className="w-4 h-4" />
                  <span className="font-mono font-bold text-lg">{formatCountdown(remainingSeconds)}</span>
                  <span className="text-xs">remaining</span>
                </div>
              </div>
            )}

            {/* Timeout state */}
            {paymentStatus === "timeout" && (
              <div className="bg-gray-100 border border-gray-300 rounded-2xl px-5 py-4 text-center">
                <AlertCircle className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                <p className="font-semibold text-gray-700 text-sm mb-1">Payment window expired</p>
                <p className="text-xs text-gray-500">You can try again below.</p>
              </div>
            )}

            {/* Error */}
            {error && paymentStatus !== "pending" && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Payment form */}
            {paymentStatus !== "pending" && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5 overflow-hidden">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#02665e]" />
                  Select Payment Method
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethod(method.id)}
                      className={`group relative p-3.5 rounded-lg border-2 transition-all duration-300 ${
                        selectedMethod === method.id
                          ? "border-[#02665e] bg-gradient-to-br from-[#02665e]/10 to-blue-50/50 shadow-md ring-2 ring-[#02665e]/20"
                          : "border-slate-200 hover:border-[#02665e]/50 hover:shadow-md bg-white"
                      }`}
                    >
                      <div className="flex flex-col items-center text-center gap-2">
                        <div className="relative h-14 w-20 flex-shrink-0">
                          <Image
                            src={method.icon}
                            alt={method.name}
                            fill
                            sizes="80px"
                            className="object-contain"
                          />
                        </div>
                        <div className="w-full">
                          <div className={`font-bold text-sm ${
                            selectedMethod === method.id ? "text-[#02665e]" : "text-slate-900"
                          }`}>
                            {method.name}
                          </div>
                        </div>
                        {selectedMethod === method.id && (
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

                <div className="flex w-full justify-center overflow-hidden">
                  <div className="w-full max-w-[min(280px,calc(100vw-2rem))] min-w-0">
                    <label className="mb-2 flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-slate-700">
                      <Smartphone className="w-4 h-4 text-[#02665e]" />
                      Mobile Money Number
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 select-none">+255</span>
                      <div className="absolute left-[3.75rem] top-1/2 -translate-y-1/2 h-5 w-px bg-slate-300" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                        placeholder="7XXXXXXXX"
                        autoComplete="tel"
                        maxLength={12}
                        className="block w-full min-w-0 box-border border border-slate-200 bg-slate-50 rounded-xl pl-[4.5rem] pr-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#02665e]/25 focus:border-[#02665e] transition-all duration-200 shadow-sm"
                      />
                    </div>
                    <p className="mt-1.5 text-center text-xs text-slate-500">Enter the number linked to your mobile wallet</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={submitting || !selectedMethod || !phoneNumber.trim() || paymentCooldownSeconds > 0}
                  className="w-full py-4 rounded-2xl text-white font-semibold text-base disabled:opacity-60 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
                  style={{
                    background: (submitting || paymentCooldownSeconds > 0)
                      ? "#606363"
                      : "linear-gradient(135deg, #02665e, #4ecdc4)",
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Initiating Payment...
                    </>
                  ) : paymentCooldownSeconds > 0 ? (
                    <>
                      <Clock3 className="w-4 h-4" />
                      Retry in {paymentCooldownSeconds}s
                    </>
                  ) : paymentStatus === "failed" || paymentStatus === "timeout" ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </>
                  ) : (
                    `Pay ${fmt(amount, currency)}`
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>256-bit SSL encrypted. Your payment is fully secure.</span>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Sidebar (desktop only) */}
          <div className="hidden lg:block lg:sticky lg:top-20">
            {bookingSummaryCard}
          </div>

        </div>
      </div>
    </div>
  );
}

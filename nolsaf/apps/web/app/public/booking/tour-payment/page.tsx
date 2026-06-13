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
  Building2,
  CreditCard,
  Ticket,
  ArrowRight,
  Home,
  Users,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const PAYMENT_WAIT_SECONDS = 4 * 60;
const PAYMENT_POLL_MAX_ATTEMPTS = 45;
const PAYMENT_POLL_FAST_DELAY_MS = 3000;
const PAYMENT_POLL_SLOW_DELAY_MS = 10000;
const PAYMENT_RETRY_LIMIT = 3;
const PAYMENT_RETRY_WINDOW_SECONDS = 5 * 60;
const CARD_VERIFICATION_FAILED_MESSAGE =
  "Card verification failed. No payment was taken. Please try again or choose another payment method.";

type MnoMethod = "Airtel" | "Tigo" | "Mpesa" | "Halopesa";

type PaymentMethod = {
  id: MnoMethod;
  name: string;
  icon: string;
  description: string;
};

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "Airtel",   name: "Airtel Money", icon: "/assets/airtel_money.png",   description: "Pay with Airtel Money" },
  { id: "Mpesa",    name: "MPesa",       icon: "/assets/M-pesa.png",         description: "Pay with Mpesa" },
  { id: "Tigo",     name: "Tigo",  icon: "/assets/mix%20by%20yas.png", description: "Pay with Tigo" },
  { id: "Halopesa", name: "HaloPesa",     icon: "/assets/halopesa.png",       description: "Pay with HaloPesa" },
];

const BANK_PROVIDERS = [
  {
    code: "CRDB",
    name: "CRDB Bank",
    logo: "/assets/NoLSAF_CRDB.png",
    activeClass: "border-[#0f8b3d] bg-[#f0fff5] text-[#07502a] shadow-sm ring-2 ring-[#0f8b3d]/15",
    dotClass: "border-[#0f8b3d] bg-[#0f8b3d]",
  },
  {
    code: "NMB",
    name: "NMB Bank",
    logo: "/assets/NoLSAF_NMB.png",
    activeClass: "border-[#0069b4] bg-[#eff8ff] text-[#00477a] shadow-sm ring-2 ring-[#0069b4]/15",
    dotClass: "border-[#0069b4] bg-[#0069b4]",
  },
] as const;

const BANK_OTP_INSTRUCTIONS: Record<string, { title: string; steps: string[] }> = {
  CRDB: {
    title: "Generate CRDB OTP",
    steps: [
      "Dial *150*03# and enter your SIM Banking PIN.",
      "Choose 7 Other services, then 5 AzamPay.",
      "Select Link AzamPay Account to generate the OTP.",
    ],
  },
  NMB: {
    title: "Generate NMB OTP",
    steps: [
      "Dial *150*66#.",
      "Choose 8 More, then 5 Register Sarafu.",
      "Choose 1 Select Account No. to generate the OTP.",
    ],
  },
};

function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function fmt(n: number, currency = "TZS"): string {
  return `${currency} ${Number(n).toLocaleString("en-US")}`;
}

function isPaymentCooldownMessage(msg: string | null): boolean {
  return !!msg && msg.toLowerCase().includes("wait");
}

function paymentApiMessage(payload: any, fallback: string): string {
  if (payload?.error === "payment_access_expired") {
    return "This draft payment link has expired. Please create a new booking to continue.";
  }
  return payload?.message || payload?.error || fallback;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TourPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tourBookingId = Number(searchParams?.get("tourBookingId") || 0);
  const accessToken   = searchParams?.get("accessToken") || "";

  const [booking, setBooking]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // MNO state
  const [selectedMethod, setSelectedMethod] = useState<MnoMethod | null>(null);
  const [phoneNumber, setPhoneNumber]       = useState("");

  // Bank state
  const [selectedBankCode, setSelectedBankCode]   = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankMobileNumber, setBankMobileNumber] = useState("");
  const [bankOtp, setBankOtp] = useState("");

  // Payment channel accordion (null = all collapsed)
  const [paymentChannel, setPaymentChannel] = useState<"MNO" | "BANK" | "CARD" | null>(null);

  const [submitting, setSubmitting]                         = useState(false);
  const [paymentStatus, setPaymentStatus]                   = useState<"idle" | "pending" | "success" | "failed" | "timeout">("idle");
  const [_paymentRef, setPaymentRef]                        = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds]             = useState(PAYMENT_WAIT_SECONDS);
  const [paymentCooldownSeconds, setPaymentCooldownSeconds] = useState(0);
  const [retryCount, setRetryCount]                         = useState(0);
  const [retryWindowStart, setRetryWindowStart]             = useState<number | null>(null);

  const pollingIntervalRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load booking ──────────────────────────────────────────────────────────
  const fetchBooking = useCallback(
    async (id: number, token: string) => {
      try {
        const url = new URL(`/api/public/tour-bookings/${id}/payment-status`, window.location.origin);
        url.searchParams.set("accessToken", token);
        const res  = await fetch(url.toString());
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

  // Initial load + card return detection
  useEffect(() => {
    if (!tourBookingId || !accessToken) {
      setError("Missing booking information.");
      setLoading(false);
      return;
    }

    const cardReturn = searchParams?.get("cardReturn");
    const cardRef    = searchParams?.get("ref");

    if (cardReturn && cardRef) {
      if (cardReturn === "success") {
        setPaymentStatus("success");
        setPaymentChannel("CARD");
      } else if (cardReturn === "pending") {
        setPaymentRef(cardRef);
        setSubmitting(true);
        setPaymentStatus("pending");
        setPaymentChannel("CARD");
        // Poll will start after booking loads (startPolling reads booking state)
      } else if (cardReturn === "failed") {
        setPaymentRef(cardRef);
        setSubmitting(false);
        setPaymentStatus("failed");
        setPaymentChannel("CARD");
        setError(CARD_VERIFICATION_FAILED_MESSAGE);
      }
    }

    fetchBooking(tourBookingId, accessToken);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourBookingId, accessToken]);

  // After booking loads, kick off card-return polling if pending
  useEffect(() => {
    if (!booking) return;
    const cardReturn = searchParams?.get("cardReturn");
    const cardRef    = searchParams?.get("ref");
    if (cardReturn === "pending" && cardRef && paymentStatus === "pending") {
      startPolling();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking]);

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
      const res  = await fetch(url.toString(), { cache: "no-store" });
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
      if (pollingIntervalRef.current)   clearTimeout(pollingIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // ── Accordion toggle ──────────────────────────────────────────────────────
  function toggleChannel(channel: "MNO" | "BANK" | "CARD") {
    setPaymentChannel((prev) => (prev === channel ? null : channel));
    setError(null);
  }

  // ── MNO payment ───────────────────────────────────────────────────────────
  async function handleMnoPayment() {
    if (paymentCooldownSeconds > 0) return;
    if (!selectedMethod || !phoneNumber.trim() || !booking) {
      setError("Please select a payment method and enter your phone number.");
      return;
    }

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
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ phoneNumber: phoneNumber.trim(), provider: selectedMethod, accessToken }),
      });

      const result = await res.json();

      if (!res.ok) {
        const retryAfterHeader = Number(res.headers.get("Retry-After") || 0);
        const retryAfterSec    = Number(result.retryAfterSeconds || retryAfterHeader || 0);
        if (res.status === 429 && retryAfterSec > 0) {
          setPaymentCooldownSeconds(retryAfterSec);
          setError(null);
          setSubmitting(false);
          setPaymentStatus("failed");
          return;
        }
        throw new Error(paymentApiMessage(result, "Payment initiation failed."));
      }

      // MNO is a USSD push to the phone — the handset is the payment surface.
      // We deliberately ignore any checkoutUrl the API might return; redirecting
      // here would yank the user off the "check your phone" prompt and break the
      // push flow. The status poll + webhook are the source of truth.
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

  // ── Bank payment ──────────────────────────────────────────────────────────
  async function handleBankPayment() {
    if (!booking || !selectedBankCode) {
      setError("Please select a bank.");
      return;
    }
    const cleanedBankMobile = bankMobileNumber.replace(/\s+/g, "");
    const phoneRegex = /^(\+255|255|0)?[0-9]{9}$/;
    if (!bankAccountNumber.trim()) {
      setError("Please enter the bank account number selected while generating the OTP.");
      return;
    }
    if (!phoneRegex.test(cleanedBankMobile)) {
      setError("Please enter the mobile number registered with your bank account.");
      return;
    }
    if (!bankOtp.trim()) {
      setError("Please enter the OTP generated from your bank menu.");
      return;
    }

    setError(null);
    setSubmitting(true);
    setPaymentStatus("idle");

    try {
      const res = await fetch(`/api/public/tour-bookings/${tourBookingId}/initiate-bank-payment`, {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({
          bankCode:      selectedBankCode,
          accountNumber: bankAccountNumber.trim(),
          merchantMobileNumber: cleanedBankMobile,
          otp:           bankOtp.trim(),
          accessToken,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        const retryAfterHeader = Number(res.headers.get("Retry-After") || 0);
        const retryAfterSec    = Number(result.retryAfterSeconds || retryAfterHeader || 0);
        if (res.status === 429 && retryAfterSec > 0) {
          setPaymentCooldownSeconds(retryAfterSec);
          setError(null);
          setSubmitting(false);
          setPaymentStatus("failed");
          return;
        }
        throw new Error(paymentApiMessage(result, "Bank payment initiation failed."));
      }

      const ref = result.paymentRef || result.transactionId;
      setPaymentRef(ref);
      setPaymentStatus("pending");
      startPolling();
    } catch (err: any) {
      setError(err?.message || "Bank payment failed. Please try again.");
      setSubmitting(false);
      setPaymentStatus("failed");
    }
  }

  // ── Card payment ──────
  async function handleCardPayment() {
    if (!booking) return;

    setError(null);
    setSubmitting(true);
    setPaymentStatus("idle");

    try {
      const res = await fetch(`/api/public/tour-bookings/${tourBookingId}/initiate-card-payment`, {
        method:      "POST",
        credentials: "include",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ accessToken }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(paymentApiMessage(result, "Card payment initiation failed."));
      }

      if (result.checkoutUrl) {
        // Browser navigates to hosted checkout; callback returns with ?cardReturn=
        window.location.href = result.checkoutUrl;
        return; // keep submitting=true — page is navigating away
      }

      throw new Error("No checkout URL returned from payment provider");
    } catch (err: any) {
      setError(err?.message || "Card payment failed. Please try again.");
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
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-md flex flex-col items-center text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-teal-900/20"
              style={{ background: "linear-gradient(135deg, #02665e, #4ecdc4)" }}
            >
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
            <p className="text-gray-500 text-sm mb-6 max-w-sm">
              Your tour package booking has been paid and confirmed. The operator will be in touch with you.
            </p>

            {booking?.bookingCode && (
              <div className="w-full bg-white rounded-2xl border border-[#02665e]/20 px-6 py-4 mb-4 shadow-sm">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1">Booking Reference</p>
                <p className="text-xl font-bold text-[#02665e] tracking-widest">{booking.bookingCode}</p>
              </div>
            )}

            {booking && (
              <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm text-left mb-6 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-4 h-4 text-[#02665e] shrink-0" />
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {(booking.operatorSnapshot as any)?.companyName || "Tour Operator"}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> PAID
                  </span>
                </div>
                <div className="px-5 py-4 space-y-2.5">
                  {booking.title && (
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-gray-500 inline-flex items-center gap-1.5"><Ticket className="w-3.5 h-3.5" /> Package</span>
                      <span className="font-medium text-gray-900 text-right">{booking.title}</span>
                    </div>
                  )}
                  {booking.destination && (
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-gray-500 inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Destination</span>
                      <span className="font-medium text-gray-900 text-right">{booking.destination}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-gray-500 inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Travelers</span>
                    <span className="font-medium text-gray-900">{booking.travelerCount}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-sm pt-2.5 border-t border-gray-100">
                    <span className="text-gray-500">Amount Paid</span>
                    <span className="font-bold text-[#02665e]">{fmt(Number(booking.amountDue ?? booking.grossAmount), booking.currency)}</span>
                  </div>
                </div>
              </div>
            )}

            <Link
              href={tourBookingId ? `/account/tour-packages/${encodeURIComponent(String(tourBookingId))}` : "/account/tour-packages"}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-teal-900/20 transition-transform hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: "linear-gradient(135deg, #02665e, #038a7f)" }}
            >
              <Ticket className="w-4 h-4" />
              View Receipt &amp; Voucher
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-xs text-gray-400 mt-2 mb-4">
              Available anytime under <span className="font-medium text-gray-500">My Tour Packages</span> in your account.
            </p>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
            >
              <Home className="w-3.5 h-3.5" />
              Return to home
            </Link>
          </div>
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
  const amount       = Number(booking?.amountDue ?? booking?.grossAmount ?? 0);
  const currency     = booking?.currency || "TZS";
  const isTZS        = currency === "TZS";

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

  const isDisabled = submitting || paymentCooldownSeconds > 0;
  const bankInstruction = selectedBankCode ? BANK_OTP_INSTRUCTIONS[selectedBankCode] : null;
  const bankReady = Boolean(selectedBankCode && bankAccountNumber.trim() && bankMobileNumber.trim() && bankOtp.trim());

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
                  {paymentChannel === "CARD"
                    ? <CreditCard className="w-5 h-5 text-amber-600" />
                    : paymentChannel === "BANK"
                    ? <Building2 className="w-5 h-5 text-amber-600" />
                    : <Smartphone className="w-5 h-5 text-amber-600 animate-pulse" />
                  }
                  <p className="font-semibold text-amber-800 text-sm">
                    {paymentChannel === "CARD"
                      ? "Verifying your card payment..."
                      : paymentChannel === "BANK"
                      ? "Confirming bank checkout"
                      : `Check your phone for a payment prompt`}
                  </p>
                </div>
                <p className="text-xs text-amber-600 mb-3">
                  {paymentChannel === "CARD"
                    ? "Please wait while we confirm your card payment."
                    : paymentChannel === "BANK"
                    ? `We are confirming the ${BANK_PROVIDERS.find((b) => b.code === selectedBankCode)?.name || "bank"} checkout using the OTP you generated.`
                    : `Approve the payment on your ${selectedMethod} app or dial the USSD code to confirm.`}
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

            {/* Cooldown */}
            {paymentCooldownSeconds > 0 && paymentStatus !== "pending" && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-2 text-sm text-amber-700">
                <Clock3 className="w-4 h-4 flex-shrink-0" />
                Too many attempts — retry in {paymentCooldownSeconds}s
              </div>
            )}

            {/* Payment method selection */}
            {paymentStatus !== "pending" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1 min-h-[28px]">
                  {paymentChannel ? (
                    <button
                      type="button"
                      onClick={() => { setPaymentChannel(null); setError(null); }}
                      className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors group"
                    >
                      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-150" />
                      <span>Change payment method</span>
                    </button>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-[#02665e]" />
                      <h3 className="text-sm font-bold text-gray-800 tracking-wide uppercase">
                        Choose How to Pay
                      </h3>
                    </>
                  )}
                </div>

                {/* USD-only notice */}
                {!isTZS && !paymentChannel && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
                    <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
                    <span>
                      This booking is priced in <strong>USD</strong>. Please pay by card below. Any Visa or Mastercard works, and your bank will convert the amount automatically.
                    </span>
                  </div>
                )}

                {/* ── Method selector: 3 standalone cards ── */}
                <div className="space-y-2.5">

                  {/* Mobile Money — TZS only */}
                  {isTZS && (!paymentChannel || paymentChannel === "MNO") && (
                    <button
                      type="button"
                      onClick={() => toggleChannel("MNO")}
                      className={`group w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                        paymentChannel === "MNO"
                          ? "border-red-300 bg-red-50 shadow-lg shadow-red-100"
                          : "border-slate-100 bg-white shadow-sm hover:border-slate-200 hover:shadow-md"
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${
                        paymentChannel === "MNO" ? "bg-red-100" : "bg-red-50 group-hover:bg-red-100"
                      }`}>
                        <Smartphone className={`w-5 h-5 transition-colors ${paymentChannel === "MNO" ? "text-red-600" : "text-red-500"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-[15px] transition-colors ${paymentChannel === "MNO" ? "text-red-900" : "text-gray-900"}`}>
                          Mobile Money
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 font-medium">Airtel · M-Pesa · Mixx · HaloPesa</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        paymentChannel === "MNO" ? "border-red-500 bg-red-500" : "border-gray-300"
                      }`}>
                        {paymentChannel === "MNO" && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  )}

                  {/* Bank Transfer — TZS only */}
                  {isTZS && (!paymentChannel || paymentChannel === "BANK") && (
                    <button
                      type="button"
                      onClick={() => toggleChannel("BANK")}
                      className={`group w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                        paymentChannel === "BANK"
                          ? "border-green-300 bg-green-50 shadow-lg shadow-green-100"
                          : "border-slate-100 bg-white shadow-sm hover:border-slate-200 hover:shadow-md"
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${
                        paymentChannel === "BANK" ? "bg-green-100" : "bg-green-50 group-hover:bg-green-100"
                      }`}>
                        <Building2 className={`w-5 h-5 transition-colors ${paymentChannel === "BANK" ? "text-green-700" : "text-green-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-[15px] transition-colors ${paymentChannel === "BANK" ? "text-green-900" : "text-gray-900"}`}>
                          Bank Transfer
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 font-medium">CRDB · NMB OTP checkout</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        paymentChannel === "BANK" ? "border-green-600 bg-green-600" : "border-gray-300"
                      }`}>
                        {paymentChannel === "BANK" && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  )}

                  {/* Debit / Credit Card */}
                  {(!paymentChannel || paymentChannel === "CARD") && (
                    <button
                      type="button"
                      onClick={() => toggleChannel("CARD")}
                      className={`group w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                        paymentChannel === "CARD"
                          ? "border-violet-300 bg-violet-50 shadow-lg shadow-violet-100"
                          : "border-slate-100 bg-white shadow-sm hover:border-slate-200 hover:shadow-md"
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${
                        paymentChannel === "CARD" ? "bg-violet-100" : "bg-violet-50 group-hover:bg-violet-100"
                      }`}>
                        <CreditCard className={`w-5 h-5 transition-colors ${paymentChannel === "CARD" ? "text-violet-700" : "text-violet-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-[15px] transition-colors ${paymentChannel === "CARD" ? "text-violet-900" : "text-gray-900"}`}>
                          Debit / Credit Card
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 font-medium">Visa · Mastercard · Secure checkout</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        paymentChannel === "CARD" ? "border-violet-600 bg-violet-600" : "border-gray-300"
                      }`}>
                        {paymentChannel === "CARD" && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  )}

                </div>

                {/* ── Form panel — appears below when a channel is selected ── */}
                {paymentChannel && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-5 pb-5 pt-4 space-y-4">

                      {/* ── MNO form ── */}
                      {paymentChannel === "MNO" && (
                        <>
                          {/* Provider grid */}
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

                          {/* Phone input */}
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
                            onClick={handleMnoPayment}
                            disabled={isDisabled || !selectedMethod || !phoneNumber.trim()}
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
                        </>
                      )}

                      {/* ── Bank form ── */}
                      {paymentChannel === "BANK" && (
                        <>
                          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#02665e] text-white">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-950">Bank OTP checkout</div>
                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                  Generate the OTP from your bank SIM menu first, then enter the same account number, registered mobile number, and OTP below.
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="min-w-0 max-w-full overflow-hidden">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Select Bank <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {BANK_PROVIDERS.map((bank) => {
                                const active = selectedBankCode === bank.code;
                                return (
                                  <button
                                    key={bank.code}
                                    type="button"
                                    onClick={() => setSelectedBankCode(bank.code)}
                                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                                      active
                                        ? bank.activeClass
                                        : "border-slate-200 bg-white text-slate-800 hover:border-emerald-200 hover:bg-emerald-50/40"
                                    }`}
                                  >
                                    <span className="relative flex h-11 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg">
                                      <Image src={bank.logo} alt={`${bank.name} logo`} fill sizes="56px" className="object-contain" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block text-sm font-bold">{bank.name}</span>
                                      <span className="mt-0.5 block text-xs text-slate-500">{bank.code} SIM banking OTP</span>
                                    </span>
                                    <span className={`h-4 w-4 rounded-full border-2 ${active ? bank.dotClass : "border-slate-300"}`} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {bankInstruction && (
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                              <div className="text-sm font-bold text-emerald-950">{bankInstruction.title}</div>
                              <p className="mt-1 text-xs leading-5 text-emerald-800">
                                Complete these steps on your phone before pressing the payment button.
                              </p>
                              <ol className="mt-3 space-y-2 text-xs leading-5 text-emerald-900">
                                {bankInstruction.steps.map((step, index) => (
                                  <li key={step} className="flex gap-2">
                                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#02665e] ring-1 ring-emerald-100">
                                      {index + 1}
                                    </span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Account Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={bankAccountNumber}
                              onChange={(e) => setBankAccountNumber(e.target.value)}
                              placeholder="Account number selected for OTP"
                              maxLength={30}
                              className="block box-border w-full max-w-full min-w-0 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/25 focus:border-[#02665e] bg-slate-50 focus:bg-white text-sm text-gray-900 font-mono tracking-wide transition-all"
                            />
                            <p className="mt-1.5 max-w-full break-words text-xs leading-5 text-slate-500">Use the same account you selected while generating the OTP.</p>
                          </div>

                          <div className="min-w-0 max-w-full overflow-hidden">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Bank Registered Mobile Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="tel"
                              value={bankMobileNumber}
                              onChange={(e) => setBankMobileNumber(e.target.value)}
                              placeholder="+255 XXX XXX XXX"
                              maxLength={15}
                              className="block box-border w-full max-w-full min-w-0 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/25 focus:border-[#02665e] bg-slate-50 focus:bg-white text-sm text-gray-900 transition-all"
                            />
                            <p className="mt-1.5 max-w-full break-words text-xs leading-5 text-slate-500">This is the number registered for SIM banking on that bank account.</p>
                          </div>

                          <div className="min-w-0 max-w-full overflow-hidden">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Bank OTP <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={bankOtp}
                              onChange={(e) => setBankOtp(e.target.value)}
                              placeholder="Enter OTP from bank menu"
                              maxLength={50}
                              className="block box-border w-full max-w-full min-w-0 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/25 focus:border-[#02665e] bg-slate-50 focus:bg-white text-sm text-gray-900 font-mono tracking-wide transition-all"
                            />
                            <p className="mt-1.5 max-w-full break-words text-xs leading-5 text-slate-500">The OTP comes from the bank menu, not from NoLSAF.</p>
                          </div>

                          <button
                            type="button"
                            onClick={handleBankPayment}
                            disabled={isDisabled || !bankReady}
                            className="w-full py-4 rounded-2xl text-white font-semibold text-base disabled:opacity-60 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
                            style={{ background: submitting ? "#606363" : "linear-gradient(135deg, #02665e, #4ecdc4)" }}
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Initiating Bank Payment...
                              </>
                            ) : paymentStatus === "failed" || paymentStatus === "timeout" ? (
                              <>
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                              </>
                            ) : (
                              <>
                                <Building2 className="w-4 h-4" />
                                Pay via Bank Transfer {fmt(amount, currency)}
                              </>
                            )}
                          </button>
                        </>
                      )}

                      {/* ── Card form ── */}
                      {paymentChannel === "CARD" && (
                        <>
                          <div className="flex items-start gap-3 p-3.5 bg-violet-50 rounded-xl border border-violet-100">
                            <ShieldCheck className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-gray-600 leading-relaxed">
                              You will be redirected to a secure hosted card checkout page. After completing payment you will return here automatically.
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleCardPayment}
                            disabled={isDisabled}
                            className="w-full py-4 rounded-2xl text-white font-semibold text-base disabled:opacity-60 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
                            style={{ background: submitting ? "#606363" : "linear-gradient(135deg, #6d28d9, #7c3aed)" }}
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Redirecting to checkout...
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-4 h-4" />
                                {paymentStatus === "failed" || paymentStatus === "timeout"
                                  ? `Try Card Again ${fmt(amount, currency)}`
                                  : `Pay with Card ${fmt(amount, currency)}`}
                              </>
                            )}
                          </button>
                        </>
                      )}

                    </div>
                  </div>
                )}

                {/* Security badge */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 pt-1">
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

"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle, Search, XCircle, Calendar, DollarSign, MapPin, Mail, Phone, ChevronRight } from "lucide-react";
import LayoutFrame from "@/components/LayoutFrame";
import LogoSpinner from "@/components/LogoSpinner";

const api = axios.create({ baseURL: "", withCredentials: true });

type LookupResponse = {
  booking: {
    id: number;
    status: string;
    createdAt: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    bookingCode: string;
    codeStatus: string;
    property: {
      id: number;
      title: string;
      type: string;
      regionName?: string | null;
      district?: string | null;
      city?: string | null;
      country?: string | null;
    };
  };
  eligibility: {
    eligible: boolean;
    reason?: string;
    refundPercent?: number;
    rule?: string;
    nextStep?: "PLATFORM" | "EMAIL";
  };
  existingRequest: { id: number; status: string; createdAt: string } | null;
};

function normalizeCode(input: string) {
  return (input || "").trim().toUpperCase().replace(/\s+/g, "");
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

function formatAmountTZS(n: number) {
  try {
    return `${Number(n || 0).toLocaleString("en-US")} TZS`;
  } catch {
    return `${n} TZS`;
  }
}

const CANCELLATION_EMAIL = "cancellation@nolsaf.com";

export default function CancellationRequestPage() {
  const sp = useSearchParams();
  const initialCode = useMemo(() => normalizeCode(sp?.get("code") || ""), [sp]);

  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<LookupResponse | null>(null);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: number; status: string } | null>(null);

  const [reason, setReason] = useState("");
  const [confirmPolicy, setConfirmPolicy] = useState(false);
  const [confirmTerms, setConfirmTerms] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  async function loadMyRequests() {
    setLoadingRequests(true);
    try {
      const res = await api.get("/api/customer/cancellations");
      setMyRequests(res.data.items || []);
    } catch {
      // ignore (page can still work without list)
    } finally {
      setLoadingRequests(false);
    }
  }

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
      void doLookup(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  useEffect(() => {
    void loadMyRequests();
  }, []);

  // Auto-validate when code changes (debounced)
  useEffect(() => {
    const normalized = normalizeCode(code);
    if (normalized.length >= 6) {
      // Only validate if code is at least 6 characters
      const timer = setTimeout(() => {
        void doLookup(normalized);
      }, 500); // 500ms debounce
      return () => clearTimeout(timer);
    } else if (normalized.length === 0) {
      // Clear lookup if code is empty
      setLookup(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function doLookup(overrideCode?: string) {
    const c = normalizeCode(overrideCode ?? code);
    if (!c) {
      setError("Please enter your booking code.");
      setLookup(null);
      return;
    }

    setLoadingLookup(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.get<LookupResponse>("/api/customer/cancellations/lookup", { params: { code: c } });
      setLookup(res.data);
      setConfirmPolicy(false);
      setConfirmTerms(false);
      setReason("");
    } catch (e: any) {
      setLookup(null);
      setError(e?.response?.data?.error || "Failed to validate booking code.");
    } finally {
      setLoadingLookup(false);
    }
  }

  function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  async function submitRequest() {
    if (!lookup) return;
    if (lookup.existingRequest) {
      setError("A cancellation request has already been submitted for this booking code. Each booking code can only be used once for cancellation requests.");
      return;
    }
    // Only allow submission if eligible per policy - this screens valid claims for admin review
    if (!lookup.eligibility.eligible) {
      setError("This booking does not qualify for platform cancellation. Please contact us directly via email or phone for assistance.");
      return;
    }
    // Mandatory - user must agree to cancellation policy before submission
    if (!confirmPolicy) {
      setError("You must read and agree to the cancellation policy to proceed.");
      return;
    }
    // Mandatory - user must agree to terms and conditions before submission
    if (!confirmTerms) {
      setError("You must read and agree to the terms and conditions to proceed.");
      return;
    }
    // Mandatory cancellation reason with word count validation
    const wordCount = countWords(reason);
    if (!reason.trim()) {
      setError("Please provide a reason for cancellation (50-100 words required).");
      return;
    }
    if (wordCount < 50) {
      setError(`Your cancellation reason must be at least 50 words. You have ${wordCount} word${wordCount !== 1 ? 's' : ''}.`);
      return;
    }
    if (wordCount > 100) {
      setError(`Your cancellation reason must not exceed 100 words. You have ${wordCount} words.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post("/api/customer/cancellations/request", {
        code: lookup.booking.bookingCode,
        reason,
        confirmPolicy: true,
      });
      setSuccess(res.data?.request || { id: 0, status: "PENDING" });
      await loadMyRequests();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to submit cancellation request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      <LayoutFrame />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 min-w-0">
        {/* Back Button */}
        <div className="flex items-center">
          <Link
            href="/account/bookings"
            aria-label="Back to bookings"
            className="group no-underline inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:-translate-x-0.5" />
          </Link>
        </div>

        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900 mb-2">Cancellation Request</h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
            Enter your booking code to start a cancellation request (subject to our{" "}
            <Link 
              href="/cancellation-policy" 
              className="text-blue-600 hover:text-blue-700 underline font-medium transition-colors"
            >
              cancellation policy
            </Link>
            ).
          </p>
        </div>

      {/* Booking Code Input */}
      <div className="w-full max-w-md mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 box-border">
        <label className="block text-xs font-medium text-gray-700 mb-1.5 text-center">
          Booking code
        </label>
        <div className="relative w-full min-w-0 box-border">
          <input
            value={code}
            onChange={(e) => setCode(normalizeCode(e.target.value))}
            placeholder="e.g. ABCD9F3A"
            className="w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white pl-3 pr-8 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] transition-all box-border"
          />
          {loadingLookup && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <LogoSpinner size="xs" className="h-4 w-4" ariaLabel="Validating booking code" />
            </div>
          )}
          {!loadingLookup && code && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
          )}
        </div>
        <p className="mt-1.5 text-xs text-gray-500 text-center">Validation happens automatically</p>

        {error && (
          <div className="mt-4 w-full min-w-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-red-900 mb-1">Error</div>
                <div className="text-sm text-red-800 break-words">{error}</div>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-4 w-full min-w-0 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-emerald-900 mb-1">Request submitted</div>
                <div className="text-sm text-emerald-800">
                  Your cancellation request is now <span className="font-semibold">{success.status || "PENDING"}</span>.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {lookup && (
        <div className="w-full min-w-0 max-w-full space-y-6 sm:space-y-8 box-border">
          {/* Policy Card */}
          <div id="cancellation-policy" className="w-full min-w-0 max-w-full bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8 box-border overflow-hidden scroll-mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cancellation Policy</h2>
            <p className="text-sm text-gray-700 mb-4">
              This policy determines whether you can cancel directly in the platform. If your booking doesn&apos;t qualify,
              you&apos;ll need to contact us at{" "}
              <a className="font-medium text-[#02665e] hover:text-[#014d47] underline" href={`mailto:${CANCELLATION_EMAIL}`}>
                {CANCELLATION_EMAIL}
              </a>
              .
            </p>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 min-w-0">
              <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/80 to-blue-100/40 p-5 sm:p-6 min-w-0 box-border shadow-sm hover:shadow-md hover:border-blue-300 hover:scale-[1.02] transition-all duration-300 group">
                <div className="font-semibold text-base sm:text-lg text-blue-900 mb-4 flex items-center gap-2 transition-colors group-hover:text-blue-950">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
                  Before check-in
                </div>
                <ul className="space-y-3 text-sm sm:text-base text-gray-700 min-w-0">
                  <li className="flex items-start gap-3 min-w-0 transition-all hover:translate-x-1">
                    <span className="text-blue-600 mt-0.5 flex-shrink-0 text-lg font-bold">•</span>
                    <span className="min-w-0 break-words leading-relaxed"><span className="font-semibold text-gray-900">Free cancellation</span>: within 24 hours of booking and at least 72 hours before check-in.</span>
                  </li>
                  <li className="flex items-start gap-3 min-w-0 transition-all hover:translate-x-1">
                    <span className="text-blue-600 mt-0.5 flex-shrink-0 text-lg font-bold">•</span>
                    <span className="min-w-0 break-words leading-relaxed"><span className="font-semibold text-gray-900">50% refund</span>: cancellations at least 96 hours before check-in (after the free-cancellation window).</span>
                  </li>
                  <li className="flex items-start gap-3 min-w-0 transition-all hover:translate-x-1">
                    <span className="text-blue-600 mt-0.5 flex-shrink-0 text-lg font-bold">•</span>
                    <span className="min-w-0 break-words leading-relaxed"><span className="font-semibold text-gray-900">Non-refundable</span>: some promotions/last-minute/special terms may be non-refundable.</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/80 to-amber-100/40 p-5 sm:p-6 min-w-0 box-border shadow-sm hover:shadow-md hover:border-amber-300 hover:scale-[1.02] transition-all duration-300 group">
                <div className="font-semibold text-base sm:text-lg text-amber-900 mb-4 flex items-center gap-2 transition-colors group-hover:text-amber-950">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></div>
                  After check-in
                </div>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed min-w-0 break-words">
                  Generally <span className="font-semibold text-gray-900">no refunds</span>. Exceptional circumstances require documentation and are reviewed strictly — contact{" "}
                  <a className="font-medium text-[#02665e] hover:text-[#014d47] underline break-all transition-colors" href={`mailto:${CANCELLATION_EMAIL}`}>
                    {CANCELLATION_EMAIL}
                  </a>
                  .
                </p>
              </div>
            </div>

            <details className="mt-6 rounded-xl border-2 border-gray-200 bg-white overflow-hidden transition-all hover:border-[#02665e]/30 group">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-gray-800 hover:text-[#02665e] list-none flex items-center justify-between transition-colors group-open:text-[#02665e]">
                <span className="flex items-center gap-2">
                  <span>View full policy text</span>
                </span>
                <svg
                  className="w-5 h-5 text-gray-500 group-open:text-[#02665e] transition-transform group-open:rotate-180 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5 pt-2 border-t-2 border-gray-100 text-sm text-gray-700 space-y-5 bg-gray-50/30">
                <div className="space-y-2">
                  <p className="font-semibold text-gray-900 text-base">General Overview</p>
                  <p className="leading-relaxed">
                    The{" "}
                    <Link 
                      href="/cancellation-policy" 
                      className="text-blue-600 hover:text-blue-700 underline font-medium transition-colors"
                    >
                      Cancellation Policy
                    </Link>
                    {" "}for NoLSAF varies based on the type of service booked. This policy applies to
                    all reservations made through the NoLSAF platform, including individual bookings and group stays.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-gray-900 text-base">Before Check-In</p>
                  <p className="leading-relaxed mb-2">
                    Free cancellation within 24 hours of making the reservation, provided cancellation occurs at least 72
                    hours before scheduled check-in. Partial refunds (50%) may apply for cancellations at least 96 hours
                    before check-in. Some bookings may be non-refundable as indicated at booking.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>Free cancellation window: 24 hours from booking AND at least 72 hours before check-in</li>
                    <li>50% refund: Cancellations made at least 96 hours before check-in (after free cancellation window expires)</li>
                    <li>Non-refundable bookings: Clearly marked at time of booking and cannot be cancelled</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-gray-900 text-base">After Check-In</p>
                  <p className="leading-relaxed mb-2">
                    Generally not eligible for refunds. Exceptional circumstances require official documentation and must
                    be submitted within the specified timeframes.
                  </p>
                  <p className="leading-relaxed text-gray-600">
                    If you&apos;ve already checked in, cancellations are typically not permitted. In cases of medical emergencies,
                    natural disasters, or other documented exceptional circumstances, contact our support team immediately with 
                    official documentation for review.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-gray-900 text-base">Non-Refundable Bookings</p>
                  <p className="leading-relaxed">
                    Certain bookings are marked as non-refundable at the time of reservation. These include promotional rates, 
                    last-minute bookings, special event periods, and bookings with explicit non-refundable terms. No refunds 
                    will be issued for non-refundable bookings, regardless of cancellation timing.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-gray-900 text-base">Group Stay Cancellations</p>
                  <p className="leading-relaxed mb-2">
                    Group stays may have stricter terms and require written communication; terms vary by booking and may
                    include non-refundable deposits.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>Group bookings (typically 5+ rooms or guests) require direct communication with our support team</li>
                    <li>Non-refundable deposits may apply and are clearly stated at booking</li>
                    <li>Cancellation terms for groups are customized and may differ from standard individual bookings</li>
                    <li>Written confirmation of cancellation is required for group stays</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-gray-900 text-base">Modification vs Cancellation</p>
                  <p className="leading-relaxed">
                    If you need to change your booking dates or details rather than cancel, modifications may be available 
                    subject to availability and rate differences. Modification requests should be made at least 48 hours before 
                    check-in. Date changes may incur additional charges or require rebooking at current rates.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-gray-900 text-base">Refund Processing</p>
                  <p className="leading-relaxed mb-2">
                    Eligible refunds are processed to the original payment method within 5-10 business days after confirmation.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>Refunds are issued to the original payment method used for booking</li>
                    <li>Processing time: 5-10 business days after cancellation confirmation</li>
                    <li>Bank processing times may vary and are outside our control</li>
                    <li>You will receive email confirmation once the refund has been processed</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-gray-900 text-base">Special Circumstances</p>
                  <p className="leading-relaxed">
                    In exceptional circumstances such as natural disasters, government travel restrictions, medical emergencies, 
                    or death in the family, we may consider refund requests on a case-by-case basis. Official documentation 
                    (medical certificates, death certificates, government notices) must be provided within 7 days of the 
                    incident. Contact our support team immediately for assistance.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-gray-900 text-base">How to Cancel</p>
                  <p className="leading-relaxed mb-2">
                    Cancellations can be processed through the NoLSAF platform if your booking is eligible. For bookings that
                    don&apos;t qualify for platform cancellation, or for group bookings, contact our support team directly.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                    <li>Eligible bookings: Use the cancellation request form on this page</li>
                    <li>Non-eligible bookings: Contact us via email at <a href={`mailto:${CANCELLATION_EMAIL}`} className="text-[#02665e] hover:underline font-medium">{CANCELLATION_EMAIL}</a> or phone</li>
                    <li>Group bookings: Must contact support team directly for cancellation processing</li>
                    <li>Always retain your booking confirmation and cancellation reference number</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-gray-900 text-base">Policy Updates</p>
                  <p className="leading-relaxed">
                    NoLSAF reserves the right to update this{" "}
                    <Link 
                      href="/cancellation-policy" 
                      className="text-blue-600 hover:text-blue-700 underline font-medium transition-colors"
                    >
                      cancellation policy
                    </Link>
                    {" "}at any time. The policy in effect at the time 
                    of your booking will apply to your reservation. Significant policy changes will be communicated to users 
                    via email or platform notifications.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-gray-900 text-base">Contact Information</p>
                  <p className="leading-relaxed">
                    For cancellation requests, questions about this policy, or assistance with modifications, please contact 
                    our support team at <a href={`mailto:${CANCELLATION_EMAIL}`} className="text-[#02665e] hover:underline font-medium">{CANCELLATION_EMAIL}</a>. 
                    Our team is available to assist you with all cancellation-related inquiries.
                  </p>
                </div>
              </div>
            </details>
          </div>

          {/* Booking Details Card */}
          <div className="w-full min-w-0 max-w-full bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8 box-border overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-4 min-w-0">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Booking Details</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2 break-words">{lookup.booking.property.title}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="min-w-0 break-words">
                    {[lookup.booking.property.regionName, lookup.booking.property.city, lookup.booking.property.district]
                      .filter(Boolean)
                      .join(" • ")}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end min-w-0 flex-shrink-0">
                <span className="inline-flex items-center gap-2 rounded-lg bg-gray-100 border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 min-w-0 box-border">
                  <span className="text-xs text-gray-500 flex-shrink-0">CODE:</span> 
                  <span className="font-mono truncate">{lookup.booking.bookingCode}</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg bg-gray-100 border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 min-w-0 box-border">
                  <span className="text-xs text-gray-500 flex-shrink-0">STATUS:</span> 
                  <span className="truncate">{lookup.booking.status}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 min-w-0">
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4 sm:p-5 min-w-0 box-border hover:border-blue-300 transition-all">
                <div className="flex items-center gap-2 mb-3 min-w-0">
                  <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0 animate-spin transition-all" />
                  <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide truncate">Check-in</div>
                </div>
                <div className="text-lg sm:text-xl font-bold text-gray-900 break-words transition-all">{formatDate(lookup.booking.checkIn)}</div>
              </div>
              <div className="rounded-xl border-2 border-purple-200 bg-purple-50/50 p-4 sm:p-5 min-w-0 box-border hover:border-purple-300 transition-all">
                <div className="flex items-center gap-2 mb-3 min-w-0">
                  <Calendar className="h-5 w-5 text-purple-600 flex-shrink-0 animate-spin transition-all" />
                  <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide truncate">Check-out</div>
                </div>
                <div className="text-lg sm:text-xl font-bold text-gray-900 break-words transition-all">{formatDate(lookup.booking.checkOut)}</div>
              </div>
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4 sm:p-5 min-w-0 box-border hover:border-emerald-300 transition-all col-span-2 sm:col-span-1">
                <div className="flex items-center gap-2 mb-3 min-w-0">
                  <DollarSign className="h-5 w-5 text-emerald-600 flex-shrink-0 animate-spin transition-all" />
                  <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide truncate">Amount</div>
                </div>
                <div className="text-lg sm:text-xl font-bold text-gray-900 break-words transition-all">{formatAmountTZS(lookup.booking.totalAmount)}</div>
              </div>
            </div>

            {/* Eligibility Status */}
            {lookup.existingRequest ? (
              <div className="mt-6 rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/80 to-amber-100/40 px-6 py-5 shadow-sm transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertTriangle className="h-7 w-7 text-amber-600 transition-all" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg text-amber-900 mb-2 transition-colors">Request Already Pending</div>
                    <div className="text-sm sm:text-base text-amber-800 leading-relaxed bg-white/50 rounded-lg px-3 py-2 border border-amber-200/50">
                      A cancellation request is already pending <span className="font-semibold">(Request #{lookup.existingRequest.id})</span>. Please wait for a response from our team.
                    </div>
                  </div>
                </div>
              </div>
            ) : lookup.eligibility.eligible ? (
              <div className="mt-6 rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 px-6 py-5 shadow-sm transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-7 w-7 text-emerald-600 transition-all" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg text-emerald-900 mb-2 transition-colors">Eligible via Platform</div>
                    <div className="text-sm sm:text-base text-emerald-800 leading-relaxed bg-white/50 rounded-lg px-3 py-2 border border-emerald-200/50">
                      <span className="font-semibold">Refund policy outcome:</span>{" "}
                      <span className="font-bold text-emerald-900">
                        {lookup.eligibility.refundPercent === 100
                          ? "Free cancellation (100% refund)"
                          : lookup.eligibility.refundPercent === 50
                            ? "50% refund"
                            : "Policy-based review"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-red-200 bg-white px-6 py-6 shadow-sm transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="rounded-full bg-red-100 p-2.5">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-4">
                    <div>
                      <h3 className="font-semibold text-base text-gray-900 mb-2">Not Eligible via Platform</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        You&apos;re not eligible for cancellations due to the non-refundable policy and specific booking terms. For more information please read our{" "}
                        <Link 
                          href="/cancellation-policy" 
                          className="text-blue-600 hover:text-blue-700 underline font-medium transition-colors"
                        >
                          cancellation policy
                        </Link>
                        {" "}or you can contact us for more information.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Contact Support</p>
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <a 
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#02665e] text-white px-4 py-2.5 text-sm font-medium hover:bg-[#014d47] transition-all duration-300 shadow-sm hover:shadow-md no-underline active:scale-[0.98]" 
                          href={`mailto:${CANCELLATION_EMAIL}?subject=Cancellation Request - Booking ${lookup.booking.bookingCode}`}
                        >
                          <Mail className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                          <span>Email Support</span>
                        </a>
                        <button 
                          type="button"
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white text-gray-700 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 hover:border-gray-400 active:scale-[0.98] transition-all duration-300 shadow-sm hover:shadow-md"
                        >
                          <Phone className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                          <span>Call Support</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Procedure & Form Card - Only show if eligible */}
          {lookup.eligibility.eligible && (
          <div className="w-full min-w-0 max-w-full bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8 box-border overflow-hidden">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Submit Cancellation Request</h2>

            <div className="space-y-5 sm:space-y-6 min-w-0">
              <div className="w-full min-w-0 max-w-full box-border">
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Cancellation Reason <span className="text-red-600 font-semibold">*</span>
                  <span className="text-xs font-normal text-gray-500 ml-2">(50-100 words required)</span>
                </label>
                <textarea
                  required
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    // Clear error when user starts typing
                    if (error?.includes("cancellation reason") || error?.includes("words")) {
                      setError(null);
                    }
                  }}
                  placeholder="Please explain why you need to cancel this booking (minimum 50 words, maximum 100 words)..."
                  rows={6}
                  className="w-full min-w-0 max-w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3.5 text-sm sm:text-base text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] transition-all resize-none box-border"
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className={`font-medium ${
                    countWords(reason) < 50 
                      ? 'text-amber-600' 
                      : countWords(reason) > 100 
                        ? 'text-red-600' 
                        : 'text-emerald-600'
                  }`}>
                    {countWords(reason)} / 50-100 words
                  </span>
                  {countWords(reason) > 0 && countWords(reason) < 50 && (
                    <span className="text-amber-600">
                      {50 - countWords(reason)} more word{50 - countWords(reason) !== 1 ? 's' : ''} required
                    </span>
                  )}
                  {countWords(reason) > 100 && (
                    <span className="text-red-600">
                      {countWords(reason) - 100} word{countWords(reason) - 100 !== 1 ? 's' : ''} over limit
                    </span>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 hover:border-[#02665e] bg-gray-50/50 cursor-pointer transition-all min-w-0 box-border">
                <div className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    required
                    checked={confirmPolicy}
                    onChange={(e) => {
                      setConfirmPolicy(e.target.checked);
                      // Clear error when user agrees to cancellation policy
                      if (e.target.checked && error?.includes("cancellation policy")) {
                        setError(null);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#02665e]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#02665e] shadow-inner"></div>
                </div>
                <span className="text-sm sm:text-base text-gray-700 leading-relaxed min-w-0 break-words">
                  I have read and agree to the{" "}
                  <Link 
                    href="/cancellation-policy" 
                    className="text-blue-600 hover:text-blue-700 underline font-medium transition-colors"
                  >
                    cancellation policy
                  </Link>
                  {" "}and understand this is a request for review. <span className="text-red-600 font-semibold">*</span>
                </span>
              </label>

              <label className="flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 hover:border-[#02665e] bg-gray-50/50 cursor-pointer transition-all min-w-0 box-border">
                <div className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    required
                    checked={confirmTerms}
                    onChange={(e) => {
                      setConfirmTerms(e.target.checked);
                      // Clear error when user agrees to terms
                      if (e.target.checked && error?.includes("terms and conditions")) {
                        setError(null);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#02665e]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#02665e] shadow-inner"></div>
                </div>
                <span className="text-sm sm:text-base text-gray-700 leading-relaxed min-w-0 break-words">
                  I have read and agree to the terms and conditions. <span className="text-red-600 font-semibold">*</span>
                </span>
              </label>
            </div>

            <div className="mt-8 pt-6 border-t-2 border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 min-w-0">
              <div className="text-sm sm:text-base text-gray-600 min-w-0 break-words">
                Need help? Email{" "}
                <a className="font-medium text-[#02665e] hover:text-[#014d47] underline break-all" href={`mailto:${CANCELLATION_EMAIL}`}>
                  {CANCELLATION_EMAIL}
                </a>
              </div>
              <button
                type="button"
                onClick={submitRequest}
                disabled={submitting || !!lookup.existingRequest || !confirmPolicy || !confirmTerms || countWords(reason) < 50 || countWords(reason) > 100}
                className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-red-600 px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex-shrink-0 w-full sm:w-auto box-border"
              >
                {submitting ? (
                  <>
                    <LogoSpinner size="xs" ariaLabel="Submitting" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    <span>Submit Your Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
          )}
        </div>
      )}

      {/* My Cancellation Claims Card */}
      <div className="w-full min-w-0 max-w-full bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 lg:p-8 box-border overflow-hidden">
        <div className="text-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 mb-1 sm:mb-2">My Cancellation Claims</h2>
          <p className="text-xs sm:text-sm lg:text-base text-gray-500">Track your submitted claims and messages</p>
        </div>

        {loadingRequests ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
            <LogoSpinner size="xs" className="h-4 w-4" ariaLabel="Loading cancellation claims" />
            <span>Loading…</span>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3 min-w-0">
            {myRequests.length === 0 ? (
              <div className="text-center py-8 sm:py-12 px-4">
                <div className="inline-flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-xl bg-gray-100 mb-3 sm:mb-4">
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                </div>
                <div className="text-sm font-medium text-gray-700">No claims yet</div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">Your cancellation requests will appear here</div>
              </div>
            ) : (
              myRequests.slice(0, 10).map((r: any) => {
                const statusColors: Record<string, string> = {
                  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
                  REVIEWING: "bg-amber-50 text-amber-700 border-amber-200",
                  NEED_INFO: "bg-orange-50 text-orange-700 border-orange-200",
                  PROCESSING: "bg-indigo-50 text-indigo-700 border-indigo-200",
                  REFUNDED: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  REJECTED: "bg-red-50 text-red-700 border-red-200",
                };
                const statusColor = statusColors[r.status] || "bg-gray-50 text-gray-700 border-gray-200";
                
                return (
                  <Link
                    key={r.id}
                    href={`/account/cancellations/${r.id}`}
                    className="w-full min-w-0 group no-underline flex items-center gap-2 sm:gap-3 lg:gap-4 rounded-xl border border-gray-200 bg-white p-3 sm:p-4 lg:px-5 lg:py-4 hover:border-[#02665e]/50 hover:shadow-md transition-all duration-300 hover:bg-gray-50/50 box-border overflow-hidden"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-[#02665e]/10 to-[#02665e]/5 flex items-center justify-center border border-[#02665e]/20 group-hover:from-[#02665e]/20 group-hover:to-[#02665e]/10 transition-all">
                        <span className="text-sm sm:text-base font-bold text-[#02665e]">#{r.id}</span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2 overflow-hidden">
                      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-semibold uppercase tracking-wide border ${statusColor} transition-colors flex-shrink-0`}>
                          {r.status}
                        </span>
                        {r.createdAt && (
                          <span className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-w-0">
                          <span className="text-gray-500 font-medium flex-shrink-0">Code:</span>
                          <span className="font-mono font-semibold text-gray-900 truncate min-w-0">{r.bookingCode}</span>
                        </div>
                        {r.booking?.property?.title && (
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 min-w-0">
                            <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate min-w-0">{r.booking.property.title}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 group-hover:text-[#02665e] group-hover:translate-x-1 transition-all flex-shrink-0 ml-1 sm:ml-2" />
                  </Link>
                );
              })
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}



"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { FileCheck2 } from "lucide-react";
import Support from "@/components/Support";
import axios from "axios";
import { useRouter } from "next/navigation";

const api = axios.create({ baseURL: "", withCredentials: true });

type Preview = {
  bookingId: number;
  property: { id: number; title: string; type: string };
  personal: { fullName: string; phone: string; nationality: string; sex: string; ageGroup: string };
  booking: { roomType: string; rooms: number; nights: number; checkIn: string; checkOut: string; status: string; totalAmount: string };
} | null;

export default function CheckinValidation() {
  // Support contact — fetch from public settings endpoint if available, otherwise use env fallbacks.
  const [supportEmail, setSupportEmail] = useState<string>(process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@nolsapp.com");
  const [supportPhone, setSupportPhone] = useState<string>(process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+255 736 766 726");

  const [code, setCode] = useState("");
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [contactSuggest, setContactSuggest] = useState(false);
  const searchingRef = useRef<number | null>(null);
  const contactRef = useRef<number | null>(null);
  const [attempting, setAttempting] = useState(false);
  const router = useRouter();

  const [lastValidated, setLastValidated] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  const validate = useCallback(async (incomingCode?: string) => {
    const codeToUse = (incomingCode ?? code)?.trim();
    if (!codeToUse) return;
    // avoid re-validating the same code repeatedly
    if (codeToUse === lastValidated) return;

    // reset helpers
    setLoading(true);
    setSearching(false);
    setContactSuggest(false);
    setResultMsg(null);
    setPreview(null);
    setAttempting(true);

    // clear any existing timers
    if (searchingRef.current) {
      window.clearTimeout(searchingRef.current);
      searchingRef.current = null;
    }
    if (contactRef.current) {
      window.clearTimeout(contactRef.current);
      contactRef.current = null;
    }

    // show a gentle "Still searching..." indicator after 10s
    searchingRef.current = window.setTimeout(() => {
      setSearching(true);
    }, 10000);
    // escalate to contact suggestion after 20s
    contactRef.current = window.setTimeout(() => {
      setContactSuggest(true);
    }, 20000);

    try {
      const r = await api.post<{ details: Preview }>("/api/owner/bookings/validate", { code: codeToUse });
      setPreview(r.data?.details ?? null);
      setLastValidated(codeToUse);
      if (!r.data?.details) setResultMsg("No details returned");
    } catch (e: any) {
      // network errors (no response) vs application errors
      if (!e?.response) {
        setResultMsg("Network error: could not reach server. Check your internet connection or contact the NoLSAF team for assistance.");
      } else {
        setResultMsg(e?.response?.data?.error ?? "Invalid code");
      }
    } finally {
      setLoading(false);
      setSearching(false);
      setAttempting(false);
      // clear timers
      if (searchingRef.current) {
        window.clearTimeout(searchingRef.current);
        searchingRef.current = null;
      }
      if (contactRef.current) {
        window.clearTimeout(contactRef.current);
        contactRef.current = null;
      }
      setContactSuggest(false);
    }
  }, [code, lastValidated]);

  // legacy direct confirm removed; use handleConfirmWithConsent (modal flow) for confirmations.

  // Confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [agree, setAgree] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  async function handleConfirmWithConsent() {
    if (!preview) return;
    if (!agree) return setResultMsg('Please accept the Terms & Conditions to continue.');
    setConfirmLoading(true);
    setResultMsg(null);
    try {
      const payload = {
        bookingId: preview.bookingId,
        consent: {
          accepted: true,
          method: 'checkbox',
          termsVersion: process.env.NEXT_PUBLIC_TERMS_VERSION ?? 'v1'
        },
        clientSnapshot: {
          fullName: preview.personal.fullName,
          phone: preview.personal.phone,
          property: preview.property.title,
          roomType: preview.booking.roomType,
          nights: preview.booking.nights,
          amountPaid: preview.booking.totalAmount,
          bookingCode: (preview as any).booking?.code ?? null,
          nationality: preview.personal.nationality
        }
      };

      await api.post('/api/owner/bookings/confirm-checkin', payload);
      setConfirmOpen(false);
      // redirect to checked-in list
      router.push('/owner/bookings/checked-in');
    } catch (err: any) {
      setResultMsg(err?.response?.data?.error ?? 'Could not confirm check-in');
    } finally {
      setConfirmLoading(false);
    }
  }

  // Auto-validate when the code changes (debounced)
  useEffect(() => {
    // clear any pending debounce
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current as number);
      debounceRef.current = null;
    }

    const trimmed = code?.trim();
    if (!trimmed) {
      // nothing typed — stop showing checking
      setAttempting(false);
      return;
    }

    // only attempt auto-validate for codes with >= 3 chars to avoid noise
    if (trimmed.length < 3) {
      setAttempting(false);
      return;
    }

    // schedule validation and mark that the owner initiated an attempt
    setAttempting(true);
    debounceRef.current = window.setTimeout(() => {
      validate(trimmed);
    }, 450);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current as number);
    };
  }, [code, validate]);

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current as number);
      if (searchingRef.current) window.clearTimeout(searchingRef.current as number);
      if (contactRef.current) window.clearTimeout(contactRef.current as number);
    };
  }, []);

  // Fetch public support contact (admin-editable) on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Use same-origin path to leverage Next.js rewrites and avoid CORS
        const r = await fetch('/api/public/support');
        if (!mounted) return;
        if (r.ok) {
          const j = await r.json();
          if (j?.supportEmail) setSupportEmail(j.supportEmail);
          if (j?.supportPhone) setSupportPhone(j.supportPhone);
        }
      } catch (err) {
        // silently ignore — fall back to env defaults
        console.debug('Could not fetch public support contact', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Simple header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold text-slate-800">
            Check-in Validation
          </h1>
          <p className="text-slate-600 text-sm">Enter the booking code to validate guest check-in</p>
        </div>

        {/* Simple validation card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 w-full space-y-4">
          {/* Success message */}
          {preview && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
              Code valid — booking found for <strong>{preview.personal.fullName}</strong>.
            </div>
          )}

          {/* Code input - centered and smaller */}
          <div className="w-full flex flex-col items-center space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Check-in Code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onPaste={(e) => {
                const pasted = e.clipboardData?.getData("text") ?? "";
                if (pasted) {
                  setCode(pasted);
                  validate(pasted);
                }
              }}
              className="w-full max-w-xs px-4 py-3 text-base font-mono tracking-wider border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 placeholder:text-slate-400 bg-white text-center"
              placeholder="Enter check-in code"
              autoFocus
            />
          </div>

          {/* Loading and status indicators */}
          <div className="flex items-center justify-center min-h-[2rem]">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" />
                </div>
                <span>
                  {searching ? "Still searching…" : attempting ? "Checking…" : "Validating…"}
                </span>
              </div>
            )}

            {contactSuggest && !loading && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                This is taking unusually long. If it still does not return a result, please contact support below.
              </div>
            )}
          </div>

          {/* Error message */}
          {resultMsg && !preview && (
            <div className="w-full" role="alert" aria-live="polite">
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex items-start gap-2">
                  <span className="inline-flex h-2 w-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">
                    {resultMsg.includes("Network error")
                      ? "Check your internet connection or contact the NoLSAF team for assistance."
                      : resultMsg}
                  </p>
                </div>

                {resultMsg.includes("Network error") && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="text-xs font-medium text-red-600 mb-2">Get Help:</p>
                    <div className="flex flex-col gap-2">
                      <a
                        href={`mailto:${supportEmail}`}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-white text-sm text-red-700 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {supportEmail}
                      </a>
                      <a
                        href={`tel:${supportPhone.replace(/\s+/g, '')}`}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-white text-sm text-red-700 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {supportPhone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {contactSuggest && (
            <div className="space-y-3">
              <Support compact />
              <button
                onClick={() => validate(code)}
                className="w-full px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
              >
                Retry Validation
              </button>
            </div>
          )}

          {/* Preview content inside the same card */}
          {preview && (
            <div className="pt-4 border-t border-slate-200 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                  <FileCheck2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Booking Confirmation</h2>
                  <p className="text-xs text-slate-500">NoLSAF Booking Details</p>
                </div>
              </div>

              {/* Grid with compact design */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Personal Details */}
                <div className="rounded-lg overflow-hidden border border-blue-200 bg-blue-50/30">
                  <div className="bg-blue-600 text-white px-3 py-2 text-xs font-semibold">
                    Personal Details
                  </div>
                  <div className="divide-y divide-slate-100">
                    <Row label="Full name" value={preview.personal.fullName} />
                    <Row label="Phone" value={preview.personal.phone} />
                    <Row label="Nationality" value={preview.personal.nationality} />
                    <Row label="Sex" value={preview.personal.sex} />
                    <Row label="Age Group" value={preview.personal.ageGroup} />
                  </div>
                </div>

                {/* Booking Details */}
                <div className="rounded-lg overflow-hidden border border-emerald-200 bg-emerald-50/30">
                  <div className="bg-emerald-600 text-white px-3 py-2 text-xs font-semibold">
                    Booking Details
                  </div>
                  <div className="divide-y divide-slate-100">
                    <Row label="Property" value={`${preview.property.title} • ${preview.property.type}`} />
                    <Row label="Room type" value={preview.booking.roomType} />
                    <Row label="Rooms" value={String(preview.booking.rooms)} />
                    <Row label="Nights" value={String(preview.booking.nights)} />
                    <Row label="Check-in" value={new Date(preview.booking.checkIn).toLocaleString()} />
                    <Row label="Check-out" value={new Date(preview.booking.checkOut).toLocaleString()} />
                    <Row label="Amount paid" value={`TZS ${preview.booking.totalAmount}`} />
                    <Row label="Status" value={preview.booking.status} />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  onClick={() => { setConfirmOpen(true); setAgree(false); }}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Confirming...
                    </span>
                  ) : (
                    "Confirm Check-in"
                  )}
                </button>
                <button
                  onClick={() => {
                    setPreview(null);
                    setCode("");
                    setResultMsg(null);
                  }}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Simple tip */}
          {!preview && (
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Tip: After confirmation, the guest will appear under <strong>Checked-In</strong>.</span>
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Confirmation modal with backdrop blur */}
        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
              onClick={() => setConfirmOpen(false)}
            />
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 z-10 animate-in zoom-in-95 duration-300 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                  <FileCheck2 className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Confirm Check-in</h3>
              </div>
              
              <p className="text-sm text-slate-600 leading-relaxed">
                You are about to confirm check-in for <strong className="font-semibold text-slate-800">{preview?.personal.fullName}</strong> at <strong className="font-semibold text-slate-800">{preview?.property.title}</strong>. By confirming, this guest will be moved to Checked-In and this action will be recorded.
              </p>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={agree} 
                    onChange={(e) => setAgree(e.target.checked)} 
                    className="mt-0.5 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                  />
                  <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">
                    I have read and agree to the{' '}
                    <a 
                      className="text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2" 
                      href={process.env.NEXT_PUBLIC_TERMS_URL ?? '#'} 
                      target="_blank" 
                      rel="noreferrer"
                    >
                      Terms &amp; Conditions
                    </a>.
                  </span>
                </label>
              </div>

              {resultMsg && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700 animate-in fade-in duration-200">
                  {resultMsg}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all duration-200" 
                  onClick={() => setConfirmOpen(false)} 
                  disabled={confirmLoading}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" 
                  onClick={handleConfirmWithConsent} 
                  disabled={confirmLoading || !agree}
                >
                  {confirmLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Confirming...
                    </span>
                  ) : (
                    'Confirm Check-in'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-2 hover:bg-slate-50/50 transition-colors duration-150">
      <div className="px-4 py-3 text-sm font-medium text-slate-600 bg-slate-50/50 border-r border-slate-100">
        {label}
      </div>
      <div className="px-4 py-3 text-sm text-slate-800 font-medium">
        {value}
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, FileCheck2, Loader2, Wifi, WifiOff, X } from "lucide-react";
import Support from "@/components/Support";
import axios from "axios";
import { useRouter } from "next/navigation";

const api = axios.create({ baseURL: "", withCredentials: true });

type Preview = {
  bookingId: number;
  property: { id: number; title: string; type: string };
  personal: { fullName: string; phone: string; nationality: string; sex: string; ageGroup: string };
  booking: {
    roomType: string;
    rooms: number;
    nights: number;
    checkIn: string;
    checkOut: string;
    status: string;
    totalAmount: string;
    transportFare?: string;
    ownerBaseAmount?: string;
    includeTransport?: boolean;
  };
} | null;

type Eligibility =
  | { canValidate: true; status: "IN_WINDOW"; reason?: undefined }
  | { canValidate: false; status: "BEFORE_CHECKIN" | "AFTER_CHECKOUT" | "INVALID_DATES" | "CODE_NOT_ACTIVE"; reason: string };

export default function CheckinValidation() {
  // Support contact — fetch from public settings endpoint if available, otherwise use env fallbacks.
  const [supportEmail, setSupportEmail] = useState<string>(process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@nolsaf.com");
  const [supportPhone, setSupportPhone] = useState<string>(process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+255 736 766 726");

  const [code, setCode] = useState("");
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [searching, setSearching] = useState(false);
  const [contactSuggest, setContactSuggest] = useState(false);
  const searchingRef = useRef<number | null>(null);
  const contactRef = useRef<number | null>(null);
  const [attempting, setAttempting] = useState(false);
  const router = useRouter();

  const [lastValidated, setLastValidated] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  const lockedMs = lockedUntil ? Math.max(0, lockedUntil - nowMs) : 0;
  const isLocked = lockedMs > 0;
  const lockSeconds = Math.ceil(lockedMs / 1000);
  const lockMinutesPart = Math.floor(lockSeconds / 60);
  const lockSecondsPart = lockSeconds % 60;
  const lockCountdown = isLocked ? `${lockMinutesPart}:${String(lockSecondsPart).padStart(2, "0")}` : null;

  useEffect(() => {
    if (!lockedUntil) return;
    const t = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(t);
  }, [lockedUntil]);

  useEffect(() => {
    if (lockedUntil && lockedUntil <= nowMs) {
      setLockedUntil(null);
      setRemainingAttempts(null);
    }
  }, [lockedUntil, nowMs]);

  const validate = useCallback(async (incomingCode?: string) => {
    const codeToUse = (incomingCode ?? code)?.trim();
    if (!codeToUse) return;
    // avoid re-validating the same code repeatedly
    if (codeToUse === lastValidated) return;

    if (lockedUntil && lockedUntil > Date.now()) {
      setResultMsg(null);
      return;
    }

    // reset helpers
    setLoading(true);
    setSearching(false);
    setContactSuggest(false);
    setResultMsg(null);
    setPreview(null);
    setEligibility(null);
    setRemainingAttempts(null);
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
      const r = await api.post<{ details: Preview; eligibility?: Eligibility }>("/api/owner/bookings/validate", { code: codeToUse });
      setPreview(r.data?.details ?? null);
      setEligibility((r.data as any)?.eligibility ?? null);
      setRemainingAttempts(null);
      setLockedUntil(null);
      setLastValidated(codeToUse);
      if (!r.data?.details) setResultMsg("No details returned");
    } catch (e: any) {
      // network errors (no response) vs application errors
      if (!e?.response) {
        setResultMsg("Network error: could not reach server. Check your internet connection or contact the NoLSAF team for assistance.");
      } else {
        const status = Number(e?.response?.status);
        const data = e?.response?.data ?? {};

        if (status === 429) {
          const until = typeof data?.lockedUntil === "number" ? data.lockedUntil : null;
          setLockedUntil(until);
          setRemainingAttempts(0);
          if (until) setNowMs(Date.now());
          // Keep UI clean during lockout: show only countdown banner.
          setResultMsg(null);
        } else {
          const ra = typeof data?.remainingAttempts === "number" ? data.remainingAttempts : null;
          if (ra !== null) setRemainingAttempts(ra);
          setResultMsg(data?.error ?? "Invalid code");
        }
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
  }, [code, lastValidated, lockedUntil]);

  // legacy direct confirm removed; use handleConfirmWithConsent (modal flow) for confirmations.

  // Confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeDisbursement, setAgreeDisbursement] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // QR scan modal
  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanActive, setScanActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  async function handleConfirmWithConsent() {
    if (!preview) return;
    if (!agreeTerms || !agreeDisbursement) return setResultMsg("Please accept the Terms & Conditions and the Disbursement Policy to continue.");
    setConfirmLoading(true);
    setResultMsg(null);
    try {
      const payload = {
        bookingId: preview.bookingId,
        consent: {
          accepted: true,
          method: 'checkbox',
          termsVersion: process.env.NEXT_PUBLIC_TERMS_VERSION ?? 'v1',
          disbursementVersion: process.env.NEXT_PUBLIC_DISBURSEMENT_POLICY_VERSION ?? 'v1'
        },
        clientSnapshot: {
          fullName: preview.personal.fullName,
          phone: preview.personal.phone,
          property: preview.property.title,
          roomType: preview.booking.roomType,
          nights: preview.booking.nights,
          amountPaid: preview.booking.ownerBaseAmount ?? preview.booking.totalAmount,
          bookingCode: (preview as any).booking?.code ?? null,
          nationality: preview.personal.nationality
        }
      };
      await api.post('/api/owner/bookings/confirm-checkin', payload);
      setConfirmOpen(false);

      // notify sidebar (and any listeners) to refresh checked-in counts immediately
      window.dispatchEvent(new Event("nols:checkedin-changed"));
      // redirect to checked-in list
      router.push('/owner/bookings/checked-in');
    } catch (err: any) {
      setResultMsg(err?.response?.data?.error ?? 'Could not confirm check-in');
    } finally {
      setConfirmLoading(false);
    }
  }

  const stopScanner = useCallback(() => {
    setScanActive(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
    if (videoRef.current) {
      try { videoRef.current.srcObject = null; } catch {}
    }
  }, []);

  const normalizeScanValue = (rawVal: string) => {
    const v = String(rawVal || "").trim();
    // If the QR encodes JSON, send it as-is (API will parse bookingId).
    if (v.startsWith("{") && v.includes("bookingId")) return v;
    // If it looks like a URL, try to extract a plausible code token.
    // Otherwise pass through (server validation will reject invalid input).
    try {
      const u = new URL(v);
      const qp = u.searchParams.get("code") || u.searchParams.get("bookingCode") || u.searchParams.get("checkinCode");
      if (qp) return String(qp).trim();
    } catch {}
    return v;
  };

  const startScanner = useCallback(async () => {
    setScanError(null);
    if (!scanOpen) return;
    if (!videoRef.current) return;

    // Prefer built-in BarcodeDetector when available (no extra deps).
    const DetectorCtor = (globalThis as any).BarcodeDetector;
    if (!DetectorCtor) {
      setScanError("QR scanning is not supported on this browser. Please type the code manually.");
      return;
    }

    try {
      const supported: string[] = await DetectorCtor.getSupportedFormats?.();
      if (Array.isArray(supported) && supported.length && !supported.includes("qr_code")) {
        setScanError("QR scanning is not supported on this device. Please type the code manually.");
        return;
      }
    } catch {
      // ignore
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const detector = new DetectorCtor({ formats: ["qr_code"] });
      setScanActive(true);

      const loop = async () => {
        if (!videoRef.current || !scanOpen) return;
        try {
          const results = await detector.detect(videoRef.current);
          if (Array.isArray(results) && results[0]?.rawValue) {
            const normalized = normalizeScanValue(String(results[0].rawValue));
            setCode(normalized);
            setScanOpen(false);
            stopScanner();
            validate(normalized);
            return;
          }
        } catch {
          // ignore frame errors
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e: any) {
      setScanError(e?.message || "Could not access the camera. Please allow camera access and try again.");
      stopScanner();
    }
  }, [scanOpen, stopScanner, validate]);

  // Auto-validate only when a full code is present (debounced)
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

    if (isLocked) {
      setAttempting(false);
      return;
    }

    // Only validate once the full code is entered to avoid consuming attempts on partial typing.
    // Receipt QR scan payloads are JSON and can be validated immediately.
    const isQrPayload = trimmed.startsWith("{") && trimmed.includes("bookingId");
    if (!isQrPayload && trimmed.length !== 8) {
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
  }, [code, isLocked, validate]);

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current as number);
      if (searchingRef.current) window.clearTimeout(searchingRef.current as number);
      if (contactRef.current) window.clearTimeout(contactRef.current as number);
      stopScanner();
    };
  }, [stopScanner]);

  // start/stop scanner when modal toggles
  useEffect(() => {
    if (scanOpen) startScanner();
    else stopScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanOpen]);

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

  // Connectivity indicator (for premium clients): reflects whether the API is reachable.
  useEffect(() => {
    let mounted = true;
    let timer: number | null = null;
    const ping = async () => {
      try {
        const r = await fetch('/api/health', { method: 'GET', credentials: 'include' });
        if (!mounted) return;
        setIsConnected(r.ok);
      } catch {
        if (!mounted) return;
        setIsConnected(false);
      }
    };

    ping();
    timer = window.setInterval(ping, 15000);

    return () => {
      mounted = false;
      if (timer) window.clearInterval(timer);
    };
  }, []);

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTZS = (value: string | number) => {
    const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
    if (!Number.isFinite(n)) return `TZS ${value}`;
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  return (
    <div className="w-full overflow-x-hidden">
      <div className="relative mx-auto w-full max-w-6xl box-border bg-transparent pl-2 pr-4 py-3 nols-entrance sm:rounded-[28px] sm:border sm:border-slate-200/70 sm:bg-gradient-to-br sm:from-white sm:via-emerald-50/25 sm:to-slate-50 sm:p-6 lg:p-7 sm:shadow-sm sm:ring-1 sm:ring-black/5">
        <div className="w-full min-w-0 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="nols-entrance nols-delay-1">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="h-12 w-12 rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-sm ring-1 ring-black/10">
                <FileCheck2 className="h-6 w-6 text-white" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
                  Check-in Validation
                </h1>
                <p className="mt-1 text-slate-600 text-sm sm:text-base">
                  Scan the receipt QR or enter the booking code to validate a guest check-in.
                </p>
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-black/5">
                  Owner tool
                </span>
                <span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-black/5">
                  Secure
                </span>
              </div>
            </div>
          </div>

          {/* Main layout: Validate (left) + Result (right) */}
          <div className="grid min-w-0 grid-cols-1 lg:grid-cols-2 gap-y-5 sm:gap-y-6 gap-x-5 sm:gap-x-6 lg:gap-x-10 xl:gap-x-12 nols-entrance nols-delay-2">
            {/* Validation */}
            <div className="min-w-0">
              <div className="bg-gradient-to-br from-white via-slate-50/70 to-emerald-50/30 backdrop-blur border border-slate-300/70 rounded-2xl sm:rounded-3xl shadow-md ring-1 ring-black/5 p-3 sm:p-5 w-full space-y-3 sm:space-y-4 transition-all duration-300 hover:shadow-lg">
                <div className="flex flex-col items-center text-center gap-3">
                  <div>
                    <div className="text-sm font-semibold tracking-tight text-slate-900">Validate guest</div>
                    <div className="text-xs text-slate-500 mt-0.5">Paste code, type it, or scan QR</div>
                  </div>
                  <div
                    className={
                      isConnected
                        ? "inline-flex items-center gap-2 rounded-xl sm:rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-emerald-800 shadow-sm ring-1 ring-emerald-500/10"
                        : isConnected === false
                          ? "inline-flex items-center gap-2 rounded-xl sm:rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-slate-700 shadow-sm ring-1 ring-black/5"
                          : "inline-flex items-center gap-2 rounded-xl sm:rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-slate-700 shadow-sm ring-1 ring-black/5"
                    }
                    aria-live="polite"
                    title={isConnected ? "API reachable" : isConnected === false ? "API not reachable" : "Checking API"}
                  >
                    <span
                      className={
                        isConnected
                          ? "inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-xl bg-white ring-1 ring-emerald-500/10"
                          : "inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-xl bg-white ring-1 ring-black/5"
                      }
                      aria-hidden
                    >
                      {isConnected ? (
                        <Wifi className="h-4 w-4 text-emerald-700" />
                      ) : isConnected === false ? (
                        <WifiOff className="h-4 w-4 text-slate-600" />
                      ) : (
                        <Loader2 className="h-4 w-4 text-slate-600 animate-spin" />
                      )}
                    </span>
                    <div className="leading-tight text-left">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            isConnected
                              ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
                              : isConnected === false
                                ? "h-1.5 w-1.5 rounded-full bg-slate-400"
                                : "h-1.5 w-1.5 rounded-full bg-slate-300"
                          }
                        />
                        <span className="text-[11px] font-semibold">
                          {isConnected ? "Online" : isConnected === false ? "Offline" : "Checking"}
                        </span>
                      </div>
                      <div className={isConnected ? "text-[10px] text-emerald-700/80" : "text-[10px] text-slate-500"}>
                        {isConnected ? "Live connection" : isConnected === false ? "No server link" : "Verifying"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Code input */}
                <div className="w-full space-y-2">
                  <label className="block text-sm font-semibold text-slate-800">
                    Check-in Code
                  </label>
                  <div className="w-full min-w-0 flex items-center rounded-xl sm:rounded-2xl border border-slate-300/90 bg-white/95 shadow-sm ring-1 ring-black/5 overflow-hidden transition-all duration-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      onPaste={(e) => {
                        if (isLocked) return;
                        const pasted = e.clipboardData?.getData("text") ?? "";
                        if (pasted) {
                          const normalized = normalizeScanValue(pasted);
                          setCode(normalized);
                          const t = String(normalized || "").trim();
                          const isQrPayload = t.startsWith("{") && t.includes("bookingId");
                          if (isQrPayload || t.length === 8) {
                            validate(normalized);
                          }
                        }
                      }}
                      disabled={isLocked}
                      className="min-w-0 flex-1 px-3 py-2 text-sm sm:text-base font-mono tracking-[0.15em] sm:tracking-[0.18em] uppercase border-0 rounded-none bg-transparent text-center outline-none placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                      placeholder="Enter check-in code"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setScanOpen(true);
                        setScanError(null);
                      }}
                      disabled={isLocked}
                      className="shrink-0 inline-flex h-9 w-10 sm:h-10 sm:w-11 items-center justify-center border-l border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/80 hover:from-slate-100 hover:to-slate-200/70 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:from-slate-50 disabled:hover:to-slate-100/80"
                      aria-label="Scan QR code"
                      title="Scan QR code"
                    >
                      <Camera className="h-5 w-5 text-slate-700" aria-hidden />
                    </button>
                  </div>
                  <div className="text-[11px] sm:text-[12px] text-slate-600">
                    Tip: QR scanning may require a supported browser (Chrome/Edge mobile).
                  </div>

                  {isLocked && lockCountdown ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status" aria-live="polite">
                      Too many invalid attempts. Try again in <strong className="font-semibold">{lockCountdown}</strong>.
                    </div>
                  ) : null}

                  {!isLocked && typeof remainingAttempts === "number" ? (
                    <div className="text-xs text-slate-600" aria-live="polite">
                      Attempts remaining: <span className="font-semibold">{remainingAttempts}</span>
                    </div>
                  ) : null}
                </div>

                {/* Loading and status indicators */}
                <div className="flex items-center justify-center min-h-[2rem]">
                  {loading && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <div className="flex gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" />
                      </div>
                      <span>{searching ? "Still searching…" : attempting ? "Checking…" : "Validating…"}</span>
                    </div>
                  )}

                  {contactSuggest && !loading && (
                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                      This is taking unusually long. If it still does not return a result, please contact support below.
                    </div>
                  )}
                </div>

                {/* Error message */}
                {resultMsg && !preview && !isLocked && (
                  <div className="w-full" role="alert" aria-live="polite">
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 ring-1 ring-black/5">
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
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 bg-white text-sm text-red-700 hover:bg-red-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                              {supportEmail}
                            </a>
                            <a
                              href={`tel:${supportPhone.replace(/\s+/g, "")}`}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 bg-white text-sm text-red-700 hover:bg-red-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                />
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
                      disabled={isLocked}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors ring-1 ring-black/5"
                    >
                      Retry Validation
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Result / Preview (shown only after a successful validation) */}
            {preview ? (
              <div className="min-w-0">
                <div className="2xl:sticky 2xl:top-6 min-w-0">
                  <div className="bg-white/90 backdrop-blur border border-slate-200/80 rounded-3xl shadow-sm ring-1 ring-black/5 p-4 sm:p-5 w-full transition-all duration-300 hover:shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-sm">
                          <FileCheck2 className="h-5 w-5 text-white" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-slate-500">Validated result</div>
                          <div className="text-2xl font-bold text-slate-900 truncate">{preview.personal.fullName}</div>
                          <div className="text-sm text-slate-600 truncate">
                            {preview.property.title} • {preview.property.type}
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {preview.booking.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <InfoTile label="Booking ID" value={String(preview.bookingId)} />
                      <InfoTile label="Property ID" value={String(preview.property.id)} />
                    </div>

                    <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                      <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:shadow-md">
                        <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                          <div className="text-xs font-bold tracking-wide text-slate-700 uppercase">Personal details</div>
                        </div>
                        <div className="p-3 sm:p-4">
                          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2 sm:gap-3">
                            <InfoTile label="Full name" value={preview.personal.fullName} />
                            <InfoTile label="Phone" value={preview.personal.phone} />
                            <InfoTile label="Nationality" value={preview.personal.nationality} />
                            <InfoTile label="Sex" value={preview.personal.sex} />
                            <div className="min-[420px]:col-span-2">
                              <InfoTile label="Age group" value={preview.personal.ageGroup} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:shadow-md">
                        <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                          <div className="text-xs font-bold tracking-wide text-slate-700 uppercase">Booking details</div>
                        </div>
                        <div className="p-3 sm:p-4">
                          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2 sm:gap-3">
                            <InfoTile label="Room type" value={preview.booking.roomType} />
                            <InfoTile label="Rooms" value={String(preview.booking.rooms)} />
                            <InfoTile label="Nights" value={String(preview.booking.nights)} />
                            <InfoTile label="Base amount" value={formatTZS(preview.booking.ownerBaseAmount ?? preview.booking.totalAmount)} />
                            <div className="min-[420px]:col-span-2">
                              <InfoTile variant="checkin" label="Check-in" value={formatDateTime(preview.booking.checkIn)} />
                            </div>
                            <div className="min-[420px]:col-span-2">
                              <InfoTile variant="checkout" label="Check-out" value={formatDateTime(preview.booking.checkOut)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white to-emerald-50/40 p-3 sm:p-4 shadow-sm ring-1 ring-black/5">
                      {!eligibility?.canValidate && eligibility?.reason ? (
                        <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          {eligibility.reason}
                        </div>
                      ) : null}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => {
                            setConfirmOpen(true);
                            setAgreeTerms(false);
                            setAgreeDisbursement(false);
                          }}
                          disabled={loading || (eligibility ? !eligibility.canValidate : false)}
                          className="flex-1 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
                        >
                          Confirm Check-in
                        </button>
                        <button
                          onClick={() => {
                            setPreview(null);
                            setCode("");
                            setResultMsg(null);
                            setEligibility(null);
                          }}
                          className="px-4 py-3 rounded-2xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all duration-200 active:scale-[0.98]"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="mt-3 text-[12px] text-slate-600 text-center">
                        Confirming will mark the booking code as <strong>USED</strong> and move this guest to <strong>Checked‑In</strong>.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

        {/* QR Scan Modal */}
        {scanOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setScanOpen(false)}
            />
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-5 sm:p-6 z-10 animate-in zoom-in-95 duration-300 space-y-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-slate-900">Scan Receipt QR</div>
                  <div className="text-xs text-slate-500">Point your camera at the QR code on the guest’s receipt</div>
                </div>
                <button
                  type="button"
                  onClick={() => setScanOpen(false)}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                  aria-label="Close scanner"
                  title="Close"
                >
                  <X className="h-4 w-4 text-slate-700" aria-hidden />
                </button>
              </div>

              {scanError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {scanError}
                </div>
              )}

              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-black/5">
                <div className="relative aspect-video bg-black">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-6 rounded-2xl border-2 border-white/70 shadow-[0_0_0_2000px_rgba(0,0,0,0.15)]" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>{scanActive ? "Scanning…" : "Camera stopped"}</span>
                <button
                  type="button"
                  onClick={() => { stopScanner(); startScanner(); }}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-xs font-semibold"
                >
                  Restart
                </button>
              </div>
            </div>
          </div>
        )}

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
                    checked={agreeTerms} 
                    onChange={(e) => setAgreeTerms(e.target.checked)} 
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
                <label className="mt-3 flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreeDisbursement}
                    onChange={(e) => setAgreeDisbursement(e.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                  />
                  <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">
                    I have read and agree to the{" "}
                    <a
                      className="text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2"
                      href={(process.env.NEXT_PUBLIC_DISBURSEMENT_POLICY_URL ?? process.env.NEXT_PUBLIC_PAYOUT_POLICY_URL ?? "#")}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Disbursement Policy
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
                  disabled={confirmLoading || !agreeTerms || !agreeDisbursement}
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
    </div>
  );
}

function InfoTile({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: string;
  variant?: 'default' | 'checkin' | 'checkout';
}) {
  const variantClass =
    variant === 'checkin'
      ? 'border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 via-white to-white ring-emerald-500/10'
      : variant === 'checkout'
        ? 'border-sky-200/70 bg-gradient-to-br from-sky-50/70 via-white to-white ring-sky-500/10'
        : 'border-slate-200/80 bg-white ring-black/5';

  return (
    <div className={`min-w-0 rounded-2xl border px-3.5 py-3 shadow-sm ring-1 transition-all duration-200 hover:shadow-md ${variantClass} hover:border-slate-300`}>
      <div className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">{label}</div>
      <div className="mt-1 text-[13px] sm:text-[14px] font-semibold text-slate-900 leading-snug break-words">{value || "—"}</div>
    </div>
  );
}


"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { FileCheck2, Phone } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

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

  // attach auth
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

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
      const r = await api.post<{ details: Preview }>("/owner/bookings/validate", { code: codeToUse });
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

      await api.post('/owner/bookings/confirm-checkin', payload);
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
        const r = await fetch((process.env.NEXT_PUBLIC_API_URL || '') + '/api/public/support');
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
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {/* Top icon with hover (match pattern used elsewhere: rounded + hover bg + title) */}
        <div className="flex justify-center">
          <span
            role="img"
            aria-label="Check-in Validation"
            title="Check-in Validation"
            className="inline-flex items-center justify-center rounded-md p-2 hover:bg-white/10 transition-colors"
          >
            <FileCheck2 className="h-8 w-8 text-blue-600" />
          </span>
        </div>

        <h1 className="text-2xl font-semibold text-center mt-3">Check-in Validation</h1>

  <div className="mt-6 bg-white border rounded-2xl p-4 w-full max-w-md mx-auto flex flex-col items-center gap-3 text-center">
          {/* Alerts */}
          {preview && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
              Code valid — booking found for <strong>{preview.personal.fullName}</strong>.
            </div>
          )}

          {/* resMsg moved below spinner for better layout */}

          {/* Compact code entry */}
          <div className="w-full flex justify-center">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onPaste={(e) => {
                const pasted = e.clipboardData?.getData("text") ?? "";
                if (pasted) {
                  setCode(pasted);
                  // validate immediately when a code is pasted
                  validate(pasted);
                }
              }}
              className="border rounded-xl px-3 py-2 w-full max-w-xs text-sm"
              placeholder="Enter check-in code"
            />
          </div>

          <div className="px-3 py-2 flex items-center gap-3 justify-center">
            {loading ? (
              <span aria-hidden className="dot-spinner" aria-live="polite">
                <span className="dot dot-blue" />
                <span className="dot dot-black" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </span>
            ) : null}

            {contactSuggest ? (
              <div className="text-sm text-yellow-700">This is taking unusually long. If it still does not return a result, please contact support below.</div>
            ) : searching ? (
              <div className="text-sm text-muted-foreground">Still searching…</div>
            ) : (attempting || loading) ? (
              <div className="text-sm text-muted-foreground">Checking…</div>
            ) : null}
          </div>

          {/* Move resultMsg here so it's below the spinner/checking area and looks clean */}
          {resultMsg && (
            <div className="mt-3 rounded border bg-white p-3 text-sm text-red-800 shadow-sm w-full">
              <div className="mx-auto max-w-xs">
                <div>
                  {resultMsg.includes("Network error")
                    ? "Check your internet connection or contact the NoLSAF team for assistance."
                    : resultMsg}
                </div>

                {resultMsg.includes("Network error") && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                      <span>Contact:</span>
                      <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>
                      <span className="hidden sm:inline mx-2">|</span>
                      <a className="underline" href={`tel:${supportPhone.replace(/\s+/g, '')}`}>{supportPhone}</a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {contactSuggest && (
            <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 w-full">
              <div className="mb-2">Still searching? Try again, or contact support:</div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
                <Phone className="h-4 w-4 text-emerald-600" />
                <a href={`tel:${supportPhone.replace(/\s+/g, '')}`} className="font-medium underline">
                  {supportPhone}
                </a>
                <span className="mx-2">•</span>
                <a href={`mailto:${supportEmail}`} className="font-medium underline">
                  {supportEmail}
                </a>
              </div>
              <div className="mt-2">
                <button className="btn btn-sm" onClick={() => validate(code)}>
                  Retry
                </button>
              </div>
            </div>
          )}

          <div>
            <p className="text-xs opacity-70 text-center">Tip: After confirmation, the guest will appear under <b>Checked-In</b>.</p>
          </div>
        </div>

        {/* Preview card */}
        {preview && (
          <div className="mt-6 bg-white border rounded-2xl p-4">
            <h2 className="text-lg font-semibold mb-3">Booking Confirmation (NoLSAF)</h2>

            {/* Grid with bordered rows/cols */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Personal Details */}
              <div className="rounded-xl overflow-hidden border border-brand-primary/40">
                <div className="bg-brand-primary text-white px-3 py-2 text-sm font-medium">Personal Details</div>
                <div className="divide-y">
                  <Row label="Full name" value={preview.personal.fullName} />
                  <Row label="Phone" value={preview.personal.phone} />
                  <Row label="Nationality" value={preview.personal.nationality} />
                  <Row label="Sex" value={preview.personal.sex} />
                  <Row label="Adult/Child" value={preview.personal.ageGroup} />
                </div>
              </div>

              {/* Booking Details */}
              <div className="rounded-xl overflow-hidden border border-brand-primary/40">
                <div className="bg-brand-primary text-white px-3 py-2 text-sm font-medium">Booking Details</div>
                <div className="divide-y">
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

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => { setConfirmOpen(true); setAgree(false); }}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-green-600 text-white disabled:opacity-60"
              >
                {loading ? "Confirming..." : "Confirm Check-in"}
              </button>
              <button
                onClick={() => setPreview(null)}
                className="px-4 py-2 rounded-xl border"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Confirmation modal */}
        {confirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmOpen(false)} />
            <div className="relative bg-white rounded-xl shadow-lg max-w-md w-full p-4 z-10">
              <h3 className="text-lg font-semibold">Confirm Check-in</h3>
              <p className="text-sm mt-2">You are about to confirm check-in for <strong>{preview?.personal.fullName}</strong> at <strong>{preview?.property.title}</strong>. By confirming, this guest will be moved to Checked-In and this action will be recorded.</p>

              <div className="mt-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="form-checkbox" />
                  <span>I have read and agree to the <a className="underline" href={process.env.NEXT_PUBLIC_TERMS_URL ?? '#'} target="_blank" rel="noreferrer">Terms &amp; Conditions</a>.</span>
                </label>
              </div>

              {resultMsg && <div className="mt-3 text-sm text-red-700">{resultMsg}</div>}

              <div className="mt-4 flex gap-2 justify-end">
                <button className="px-3 py-2 rounded border" onClick={() => setConfirmOpen(false)} disabled={confirmLoading}>Cancel</button>
                <button className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-60" onClick={handleConfirmWithConsent} disabled={confirmLoading || !agree}>
                  {confirmLoading ? 'Confirming...' : 'Confirm Check-in'}
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
    <div className="grid grid-cols-2">
      <div className="px-3 py-2 text-sm bg-neutral-50 border-r">{label}</div>
      <div className="px-3 py-2 text-sm">{value}</div>
    </div>
  );
}

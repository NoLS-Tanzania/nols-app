"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Download, MapPin, ShieldCheck, BadgeCheck, Building2, User, CalendarDays, Clock } from "lucide-react";
// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export default function Receipt() {
  const routeParams = useParams<{ id?: string | string[] }>();
  const idParam = Array.isArray(routeParams?.id) ? routeParams?.id?.[0] : routeParams?.id;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!idParam) return;
    setError(null);
    setData(null);
    api
      .get(`/api/owner/revenue/invoices/${idParam}/receipt`)
      .then((r) => setData(r.data))
      .catch((e: any) => setError(String(e?.response?.data?.error || e?.message || "Failed to load receipt")));
  }, [idParam]);

  function handlePrint() {
    window.print();
  }

  if (!idParam) return <div>Missing receipt id</div>;
  if (error) {
    return (
      <div className="flex items-center justify-center py-20 px-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link
            href="/owner/revenue/paid"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#02665e] text-white hover:bg-[#014e47] transition-colors no-underline"
          >
            Back to revenue
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-600">Loading receipt...</div>
      </div>
    );
  }

  const { invoice: inv } = data;
  const codeVisible = inv?.booking?.code?.codeVisible ?? inv?.booking?.code?.code ?? "-";
  const property = inv?.booking?.property;
  const booking = inv?.booking;
  const checkIn = booking?.checkIn ? new Date(booking.checkIn) : null;
  const checkOut = booking?.checkOut ? new Date(booking.checkOut) : null;
  const nights = (() => {
    if (!checkIn || !checkOut) return null;
    const ms = checkOut.getTime() - checkIn.getTime();
    const n = Math.round(ms / (1000 * 60 * 60 * 24));
    return Number.isFinite(n) && n >= 0 ? n : null;
  })();

  return (
    <div className="relative" style={{ background: "linear-gradient(160deg,#edf8f7 0%,#f9fffe 30%,#ffffff 65%,#f4f8f7 100%)" }} id="receipt-root" data-receipt-ready="true">
      <style jsx global>{`
        @media print {
          @page { size: A5 portrait; margin: 0; }
          html, body { width: 148mm; height: auto; margin: 0; padding: 0; background: #fff; }
          #receipt-root { width: 148mm; margin: 0 auto; background: #fff !important; }
          #receipt-card { box-shadow: none !important; page-break-after: avoid; break-after: avoid; }
          .no-print { display: none !important; }
          .receipt-seal { break-inside: avoid; page-break-inside: avoid; }
        }
        .receipt-bg-dots {
          background-image: radial-gradient(circle, rgba(2,102,94,0.12) 1px, transparent 1px);
          background-size: 18px 18px;
        }
      `}</style>

      {/* Top nav bar */}
      <div className="no-print border-b border-white/60 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link
            href="/owner/revenue/paid"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600 hover:text-[#02665e] transition-colors no-underline"
          >
            <ChevronLeft className="w-4 h-4" />
            Revenue
          </Link>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all text-white"
            style={{ background: "linear-gradient(135deg,#024d47,#02665e)" }}
          >
            <Download className="w-3.5 h-3.5" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Receipt card */}
      <div className="max-w-[490px] mx-auto px-4 sm:px-5 py-6 print:px-2 print:py-0">
        <div
          id="receipt-card"
          className="bg-white rounded-3xl overflow-hidden print:rounded-none"
          style={{ boxShadow: "0 4px 6px -1px rgba(2,102,94,0.06), 0 20px 50px -10px rgba(2,102,94,0.14), 0 0 0 1px rgba(2,102,94,0.08)" }}
        >

          {/* ── HEADER BAND ────────────────────────────────────── */}
          <div
            className="relative overflow-hidden px-6 pt-7 pb-8"
            style={{ background: "linear-gradient(145deg,#011f1c 0%,#023f3b 40%,#02665e 80%,#028076 100%)" }}
          >
            {/* dot mesh texture */}
            <div className="receipt-bg-dots absolute inset-0 opacity-100 pointer-events-none" />
            {/* ambient glow */}
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle,rgba(2,180,160,0.18) 0%,transparent 70%)", transform: "translate(20%,-30%)" }} />
            <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle,rgba(0,255,200,0.06) 0%,transparent 70%)", transform: "translate(-30%,30%)" }} />
            {/* watermark icon */}
            <ShieldCheck className="absolute right-5 bottom-4 w-28 h-28 text-white pointer-events-none" style={{ opacity: 0.04 }} />

            {/* Brand row */}
            <div className="relative flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)" }}>
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-white/90 text-[13px] font-semibold tracking-wide">NolSAF</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">Verified</span>
              </div>
            </div>

            {/* Title */}
            <div className="relative text-center mb-5">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/40 mb-1.5">Owner Payout Confirmation</p>
              <h1 className="text-[22px] font-black text-white tracking-tight leading-none">Payment Receipt</h1>
            </div>

            {/* Amount hero */}
            <div className="relative text-center">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40 mb-1">Amount Paid</p>
              <div className="text-[42px] font-black text-white leading-none tracking-tight tabular-nums">
                {Number(inv?.total || 0).toLocaleString()}
                <span className="text-[20px] font-bold text-white/50 ml-2">TZS</span>
              </div>
              {inv?.paidAt && (
                <p className="text-[11px] text-white/50 mt-2 font-medium">
                  {new Date(inv.paidAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              )}
            </div>
          </div>

          {/* ── REFERENCE STRIP ─────────────────────────────────── */}
          <div className="px-6 py-3 flex items-center justify-between gap-4 border-b" style={{ background: "#f6faf9", borderColor: "#e2efed" }}>
            <div className="min-w-0">
              <p className="text-[8px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ color: "#5a9990" }}>Receipt Number</p>
              <p className="font-mono text-[11px] font-bold tracking-[0.1em] text-slate-800 truncate">{inv?.receiptNumber || "—"}</p>
            </div>
            <div className="w-px h-7 self-center" style={{ background: "#d0e8e5" }} />
            <div className="min-w-0 text-right">
              <p className="text-[8px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ color: "#5a9990" }}>Invoice</p>
              <p className="font-mono text-[11px] font-bold tracking-[0.1em] text-slate-800 truncate">{inv?.invoiceNumber || "—"}</p>
            </div>
          </div>

          {/* ── BODY ────────────────────────────────────────────── */}
          <div className="px-6 pt-5 pb-1 space-y-5">

            {/* Payment + Booking details 2-col */}
            <div className="grid grid-cols-2 gap-3">
              {/* Payment */}
              <div className="rounded-2xl p-3.5" style={{ background: "#f6faf9", border: "1px solid #e2efed" }}>
                <SectionLabel icon={<Clock className="w-3 h-3" />} label="Payment" />
                <div className="mt-2.5 space-y-2">
                  <DetailRow label="Method" value={inv?.paymentMethod || "—"} />
                  {inv?.paidAt && (
                    <DetailRow
                      label="Date"
                      value={new Date(inv.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    />
                  )}
                  <DetailRow label="Reference" value={inv?.paymentRef || "—"} mono wrap />
                </div>
              </div>

              {/* Booking */}
              <div className="rounded-2xl p-3.5" style={{ background: "#f6faf9", border: "1px solid #e2efed" }}>
                <SectionLabel icon={<CalendarDays className="w-3 h-3" />} label="Booking" />
                <div className="mt-2.5 space-y-2">
                  <DetailRow label="Code" value={codeVisible} accent mono />
                  {checkIn && (
                    <DetailRow
                      label="Check-in"
                      value={checkIn.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    />
                  )}
                  {checkOut && (
                    <DetailRow
                      label="Check-out"
                      value={checkOut.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    />
                  )}
                  {typeof nights === "number" && (
                    <DetailRow label="Duration" value={`${nights} night${nights !== 1 ? "s" : ""}`} />
                  )}
                  <DetailRow label="Booking" value={`#${inv?.bookingId}`} />
                </div>
              </div>
            </div>

            {/* Property */}
            {property && (
              <div className="rounded-2xl p-3.5" style={{ background: "#f6faf9", border: "1px solid #e2efed" }}>
                <SectionLabel icon={<MapPin className="w-3 h-3" />} label="Property" />
                <div className="mt-2.5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: "linear-gradient(135deg,#024d47,#02665e)" }}>
                    <Building2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-slate-900 leading-tight">{property?.title || "—"}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "#5a9990" }}>
                      {[property?.type, property?.city, property?.district, property?.regionName, property?.country]
                        .filter(Boolean)
                        .join("  ·  ")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Guest */}
            {booking?.guestName && (
              <div className="rounded-2xl p-3.5" style={{ background: "#f6faf9", border: "1px solid #e2efed" }}>
                <SectionLabel icon={<User className="w-3 h-3" />} label="Guest" />
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] font-black text-white" style={{ background: "linear-gradient(135deg,#024d47,#02665e)" }}>
                    {booking.guestName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-slate-900">{booking.guestName}</p>
                    {booking?.guestPhone && <p className="text-[11px] font-mono tracking-wide mt-0.5" style={{ color: "#5a9990" }}>{booking.guestPhone}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── SEAL FOOTER ─────────────────────────────────────── */}
          <div className="receipt-seal mx-4 mb-5 mt-4 rounded-2xl overflow-hidden" style={{ border: "1px solid #e2efed" }}>
            {/* teal top stripe */}
            <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg,#024d47,#02665e,#04a89a)" }} />
            <div className="px-4 py-3.5 grid grid-cols-[1fr,auto] gap-4 items-center" style={{ background: "#f6faf9" }}>
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#024d47,#02665e)" }}>
                    <BadgeCheck className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "#024d47" }}>NolSAF · Certified Receipt</span>
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: "#5a9990" }}>
                  Thank you for partnering with NolSAF.<br />
                  For questions, contact support.
                </p>
                <p className="text-[9px] mt-2 font-medium" style={{ color: "#8ab8b4" }}>
                  Scan the QR code to verify this receipt.
                </p>
              </div>
              <div className="text-center flex-shrink-0">
                <p className="text-[8px] font-bold uppercase tracking-[0.14em] mb-1.5" style={{ color: "#5a9990" }}>QR · Verify</p>
                <div className="inline-block p-2 bg-white rounded-xl" style={{ border: "1.5px solid #d0e8e5", boxShadow: "0 2px 8px rgba(2,102,94,0.08)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/owner/revenue/invoices/${inv.id}/receipt/qr.png`}
                    alt="Receipt QR Code"
                    className="w-[76px] h-[76px]"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* bottom brand note */}
        <p className="no-print text-center text-[10px] mt-4 mb-2" style={{ color: "#8ab8b4" }}>
          NolSAF — Official Payment Document · Secure & Verified
        </p>
      </div>
    </div>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ color: "#5a9990" }}>{icon}</span>
      <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: "#5a9990" }}>{label}</span>
    </div>
  );
}

function DetailRow({ label, value, mono, accent, wrap }: { label: string; value: string; mono?: boolean; accent?: boolean; wrap?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[10px] text-slate-500 shrink-0 mt-px">{label}</span>
      <span
        className={`text-right text-[11px] min-w-0 ${mono ? (wrap ? "font-mono break-all whitespace-normal" : "font-mono tracking-[0.1em]") : "font-semibold"} ${accent ? "font-bold" : ""} ${wrap ? "" : "truncate"}`}
        style={{ color: accent ? "#02665e" : "#1e293b" }}
      >
        {value}
      </span>
    </div>
  );
}

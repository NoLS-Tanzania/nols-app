"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Printer, MapPin, BadgeCheck, Building2, User, CalendarDays, Clock } from "lucide-react";
const api = axios.create({ baseURL: "", withCredentials: true });

export default function Receipt() {
  const routeParams = useParams<{ id?: string | string[] }>();
  const idParam = Array.isArray(routeParams?.id) ? routeParams?.id?.[0] : routeParams?.id;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!idParam) return;
    setError(null);
    setData(null);
    setQrDataUrl(null);
    api
      .get(`/api/owner/revenue/invoices/${idParam}/receipt`)
      .then((r) => setData(r.data))
      .catch((e: any) => setError(String(e?.response?.data?.error || e?.message || "Failed to load receipt")));
  }, [idParam]);

  // Generate QR client-side once invoice data is available
  useEffect(() => {
    if (!data?.invoice) return;
    const inv = data.invoice;
    (async () => {
      try {
        const QR: any = await import("qrcode");
        const toDataURL: any = QR?.toDataURL ?? QR?.default?.toDataURL;
        if (typeof toDataURL !== "function") return;
        const payload = JSON.stringify({
          invoiceId: inv.id,
          receiptNumber: inv.receiptNumber,
          paidAt: inv.paidAt,
          ownerPayout: Number(inv.netPayable ?? inv.total ?? 0),
          paymentRef: inv.paymentRef,
        });
        const url = await toDataURL(payload, { margin: 1, width: 256, errorCorrectionLevel: "M" });
        setQrDataUrl(url);
      } catch {
        setQrDataUrl(null);
      }
    })();
  }, [data]);

  function handlePrint() {
    window.print();
  }

  if (!idParam) return <div>Missing receipt id</div>;
  if (error) {
    return (
      <div className="flex items-center justify-center py-20 px-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-6 text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link href="/owner/revenue/paid" className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#02665e] text-white no-underline">
            Back to revenue
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-600">Loading receipt…</div>
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
    const n = Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000);
    return Number.isFinite(n) && n >= 0 ? n : null;
  })();

  return (
    <div className="bg-white min-h-screen" id="receipt-root" data-receipt-ready="true">
      <style jsx global>{`
        @media print {
          @page {
            size: A5 portrait;
            margin: 8mm 7mm;
          }
          html, body {
            width: 148mm;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #receipt-root {
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print { display: none !important; }
          #receipt-card {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            page-break-inside: avoid;
            break-inside: avoid;
            overflow: visible !important;
          }
          #receipt-wrap {
            padding: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      {/* ── Nav bar (screen only) ── */}
      <div className="no-print border-b border-slate-100 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/owner/revenue/paid" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-[#02665e] transition-colors no-underline">
            <ChevronLeft className="w-4 h-4" />
            Revenue
          </Link>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all"
            style={{ background: "linear-gradient(135deg,#024d47,#02665e)" }}
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* ── Receipt wrapper ── */}
      <div id="receipt-wrap" className="max-w-[460px] mx-auto px-4 py-6 print:px-0 print:py-0">
        <div
          id="receipt-card"
          className="bg-white rounded-2xl overflow-hidden"
          style={{ border: "1px solid #e2eae9", boxShadow: "0 2px 8px rgba(2,102,94,0.06),0 12px 40px rgba(2,102,94,0.08)" }}
        >

          {/* ══ TOP DOT ROW ══════════════════════════════════ */}
          <div className="w-full" style={{ height: "5px", backgroundImage: "radial-gradient(circle, #02665e 1.5px, transparent 1.5px)", backgroundSize: "10px 5px", backgroundRepeat: "repeat-x", backgroundPosition: "center" }} />

          {/* ══ HEADER — white background ════════════════════ */}
          <div className="px-5 pt-4 pb-4 border-b" style={{ borderColor: "#edf4f3" }}>
            {/* Brand row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/NoLS2025-04.png" alt="NolSAF" className="w-8 h-8 rounded-xl object-contain flex-shrink-0" style={{ background: "#edf7f6" }} />
                <span className="text-[13px] font-black tracking-wide" style={{ color: "#024d47" }}>NolSAF</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: "#edf7f6", border: "1px solid #c0dedd" }}>
                <BadgeCheck className="w-3 h-3" style={{ color: "#02665e" }} />
                <span className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: "#02665e" }}>Verified</span>
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-3">
              <p className="text-[8px] font-bold uppercase tracking-[0.22em] mb-1" style={{ color: "#8aaca9" }}>Owner Payout Confirmation</p>
              <h1 className="text-[19px] font-black tracking-tight" style={{ color: "#0f2e2b" }}>Payment Receipt</h1>
            </div>

            {/* Amount */}
            <div className="text-center">
              <p className="text-[8px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: "#8aaca9" }}>Amount Paid</p>
              <div className="flex items-baseline justify-center gap-2 leading-none">
                <span className="text-[36px] font-black tabular-nums tracking-tight" style={{ color: "#02665e" }}>
                  {Number(inv?.total || 0).toLocaleString()}
                </span>
                <span className="text-[15px] font-bold" style={{ color: "#5a9990" }}>TZS</span>
              </div>
              {inv?.paidAt && (
                <p className="text-[10px] mt-1 font-medium" style={{ color: "#8aaca9" }}>
                  {new Date(inv.paidAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              )}
            </div>
          </div>

          {/* ══ REFERENCE STRIP ═════════════════════════════ */}
          <div className="px-5 py-2 flex items-center justify-between gap-4 border-b" style={{ background: "#f7fbfa", borderColor: "#edf4f3" }}>
            <div className="min-w-0">
              <p className="text-[7.5px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ color: "#8aaca9" }}>Receipt Number</p>
              <p className="font-mono text-[10.5px] font-bold tracking-[0.08em] truncate" style={{ color: "#1e3a38" }}>{inv?.receiptNumber || "—"}</p>
            </div>
            <div className="w-px h-6 self-center" style={{ background: "#d0e8e5" }} />
            <div className="min-w-0 text-right">
              <p className="text-[7.5px] font-bold uppercase tracking-[0.18em] mb-0.5" style={{ color: "#8aaca9" }}>Invoice</p>
              <p className="font-mono text-[10.5px] font-bold tracking-[0.08em] truncate" style={{ color: "#1e3a38" }}>{inv?.invoiceNumber || "—"}</p>
            </div>
          </div>

          {/* ══ BODY ════════════════════════════════════════ */}
          <div className="px-5 pt-3 pb-2 space-y-2.5">

            {/* Payment + Booking 2-col */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-2.5" style={{ background: "#f7fbfa", border: "1px solid #edf4f3" }}>
                <SectionLabel icon={<Clock className="w-2.5 h-2.5" />} label="Payment" />
                <div className="mt-2 space-y-1.5">
                  <DetailRow label="Method" value={inv?.paymentMethod || "—"} />
                  {inv?.paidAt && (
                    <DetailRow label="Date" value={new Date(inv.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />
                  )}
                  <DetailRow label="Reference" value={inv?.paymentRef || "—"} mono wrap />
                </div>
              </div>
              <div className="rounded-xl p-2.5" style={{ background: "#f7fbfa", border: "1px solid #edf4f3" }}>
                <SectionLabel icon={<CalendarDays className="w-2.5 h-2.5" />} label="Booking" />
                <div className="mt-2 space-y-1.5">
                  <DetailRow label="Code" value={codeVisible} accent mono />
                  {checkIn && <DetailRow label="Check-in" value={checkIn.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />}
                  {checkOut && <DetailRow label="Check-out" value={checkOut.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} />}
                  {typeof nights === "number" && <DetailRow label="Duration" value={`${nights} night${nights !== 1 ? "s" : ""}`} />}
                  <DetailRow label="Booking" value={`#${inv?.bookingId}`} />
                </div>
              </div>
            </div>

            {/* Property + Guest side by side if both exist, else full width */}
            {property && booking?.guestName ? (
              <div className="grid grid-cols-2 gap-2">
                {/* Property */}
                <div className="rounded-xl p-2.5" style={{ background: "#f7fbfa", border: "1px solid #edf4f3" }}>
                  <SectionLabel icon={<MapPin className="w-2.5 h-2.5" />} label="Property" />
                  <div className="mt-2 flex items-start gap-2">
                    <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: "#02665e" }}>
                      <Building2 className="w-3 h-3 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10.5px] font-bold leading-tight" style={{ color: "#0f2e2b" }}>{property?.title || "—"}</p>
                      <p className="text-[9px] mt-0.5 leading-snug" style={{ color: "#5a9990" }}>
                        {[property?.type, property?.city, property?.district, property?.regionName, property?.country].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Guest */}
                <div className="rounded-xl p-2.5" style={{ background: "#f7fbfa", border: "1px solid #edf4f3" }}>
                  <SectionLabel icon={<User className="w-2.5 h-2.5" />} label="Guest" />
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-black text-white" style={{ background: "#02665e" }}>
                      {booking.guestName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10.5px] font-bold" style={{ color: "#0f2e2b" }}>{booking.guestName}</p>
                      {booking?.guestPhone && <p className="text-[9px] font-mono mt-0.5" style={{ color: "#5a9990" }}>{booking.guestPhone}</p>}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {property && (
                  <div className="rounded-xl p-2.5" style={{ background: "#f7fbfa", border: "1px solid #edf4f3" }}>
                    <SectionLabel icon={<MapPin className="w-2.5 h-2.5" />} label="Property" />
                    <div className="mt-2 flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: "#02665e" }}>
                        <Building2 className="w-3 h-3 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold" style={{ color: "#0f2e2b" }}>{property?.title || "—"}</p>
                        <p className="text-[9px] mt-0.5" style={{ color: "#5a9990" }}>
                          {[property?.type, property?.city, property?.district, property?.regionName, property?.country].filter(Boolean).join("  ·  ")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {booking?.guestName && (
                  <div className="rounded-xl p-2.5" style={{ background: "#f7fbfa", border: "1px solid #edf4f3" }}>
                    <SectionLabel icon={<User className="w-2.5 h-2.5" />} label="Guest" />
                    <div className="mt-2 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-black text-white" style={{ background: "#02665e" }}>
                        {booking.guestName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold" style={{ color: "#0f2e2b" }}>{booking.guestName}</p>
                        {booking?.guestPhone && <p className="text-[9px] font-mono mt-0.5" style={{ color: "#5a9990" }}>{booking.guestPhone}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ══ FOOTER SEAL ═════════════════════════════════ */}
          <div className="mx-3 mb-3 mt-1 rounded-xl overflow-hidden" style={{ border: "1px solid #edf4f3" }}>
            <div className="w-full" style={{ height: "4px", backgroundImage: "radial-gradient(circle, rgba(2,102,94,0.55) 1.5px, transparent 1.5px)", backgroundSize: "9px 4px", backgroundRepeat: "repeat-x", backgroundPosition: "center" }} />
            <div className="px-3.5 py-3 grid grid-cols-[1fr,auto] gap-3 items-center" style={{ background: "#f7fbfa" }}>
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: "#02665e" }}>
                    <BadgeCheck className="w-2 h-2 text-white" />
                  </div>
                  <span className="text-[8.5px] font-black uppercase tracking-[0.15em]" style={{ color: "#024d47" }}>NolSAF · Certified Receipt</span>
                </div>
                <p className="text-[9px] leading-relaxed" style={{ color: "#5a9990" }}>
                  Thank you for partnering with NolSAF.<br />
                  Questions? Contact support.
                </p>
                <p className="text-[8px] mt-1" style={{ color: "#9ab8b6" }}>Scan QR to verify this receipt.</p>
              </div>
              <div className="text-center flex-shrink-0">
                <p className="text-[7px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: "#8aaca9" }}>QR · Verify</p>
                <div className="inline-block p-1.5 bg-white rounded-lg" style={{ border: "1px solid #d0e8e5" }}>
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt="Receipt QR"
                      width={66}
                      height={66}
                      className="block"
                    />
                  ) : (
                    <div className="w-[66px] h-[66px] flex items-center justify-center text-[8px]" style={{ color: "#9ab8b6" }}>loading…</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ══ BOTTOM DOT ROW ══════════════════════════════ */}
          <div className="w-full" style={{ height: "5px", backgroundImage: "radial-gradient(circle, #02665e 1.5px, transparent 1.5px)", backgroundSize: "10px 5px", backgroundRepeat: "repeat-x", backgroundPosition: "center" }} />

        </div>

        <p className="no-print text-center text-[10px] mt-3" style={{ color: "#9ab8b6" }}>
          NolSAF — Official Payment Document · Secure & Verified
        </p>
      </div>
    </div>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span style={{ color: "#5a9990" }}>{icon}</span>
      <span className="text-[8px] font-black uppercase tracking-[0.18em]" style={{ color: "#8aaca9" }}>{label}</span>
    </div>
  );
}

function DetailRow({ label, value, mono, accent, wrap }: { label: string; value: string; mono?: boolean; accent?: boolean; wrap?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[9.5px] shrink-0 mt-px" style={{ color: "#8aaca9" }}>{label}</span>
      <span
        className={`text-right text-[10px] min-w-0 ${mono ? (wrap ? "font-mono break-all whitespace-normal" : "font-mono tracking-[0.08em]") : "font-semibold"} ${wrap ? "" : "truncate"}`}
        style={{ color: accent ? "#02665e" : "#1e3a38", fontWeight: accent ? 700 : undefined }}
      >
        {value}
      </span>
    </div>
  );
}




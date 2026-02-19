"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, CheckCircle2, Download, MapPin } from "lucide-react";
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
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
    <div className="bg-slate-50 print:bg-white" id="receipt-root" data-receipt-ready="true">
      <style jsx global>{`
        @media print {
          @page { size: A5 portrait; margin: 0; }
          html, body { width: 148mm; height: auto; margin: 0; padding: 0; }
          #receipt-root { width: 148mm; margin: 0 auto; page-break-after: avoid; }
          #receipt-card { box-shadow: none; page-break-after: avoid; break-after: avoid; }
          .receipt-footer { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/owner/revenue/paid"
              className="inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors no-underline"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back
            </Link>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Print / Save
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[520px] mx-auto px-5 sm:px-6 py-6 print:px-4 print:py-0">
        <div
          id="receipt-card"
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-slate-200"
        >
          {/* Header */}
          <div className="px-6 sm:px-7 pt-3 pb-3 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="h-7 w-7 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              </div>
              <div>
                <h1 className="text-[20px] sm:text-[22px] font-bold text-slate-900">Payment Receipt</h1>
                <p className="text-[8px] uppercase tracking-[0.16em] text-slate-500 mt-1">Owner payout confirmation</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-center">
              <div className="h-px w-40 border-t border-dashed border-slate-200/80" />
            </div>
            <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-slate-600 text-center">
              {inv?.receiptNumber && (
                <div>
                  Receipt Number: <span className="font-mono font-semibold tracking-[0.12em] tabular-nums text-slate-900">{inv.receiptNumber}</span>
                </div>
              )}
              <div>
                Invoice: <span className="font-mono font-semibold tracking-[0.12em] tabular-nums text-slate-900">{inv.invoiceNumber}</span>
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-7 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Payment Details</h2>
              <div className="space-y-2.5 text-[12px]">
                <Row label="Amount Paid" value={`${Number(inv?.total || 0).toLocaleString()} TZS`} />
                {inv.paymentMethod && <Row label="Payment Method" value={inv.paymentMethod} />}
                {inv.paidAt && (
                  <Row
                    label="Payment Date"
                    value={new Date(inv.paidAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  />
                )}
                <Row label="Transaction Reference" value={inv.paymentRef || "—"} mono wrap />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Booking Details</h2>
              <div className="space-y-2.5 text-[12px]">
                <Row label="Booking Code" value={codeVisible} accent mono />
                {checkIn && (
                  <Row
                    label="Check-in"
                    value={checkIn.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  />
                )}
                {checkOut && (
                  <Row
                    label="Check-out"
                    value={checkOut.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  />
                )}
                {typeof nights === "number" && (
                  <Row label="Duration" value={`${nights} night${nights !== 1 ? "s" : ""}`} />
                )}
                <Row label="Booking" value={`#${inv.bookingId}`} />
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-7 pb-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Property Information</h2>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
              <MapPin className="w-4 h-4 text-slate-400" />
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-slate-900 truncate">{property?.title || "—"}</div>
                <div className="text-[11px] text-slate-600 truncate">
                  {[property?.type, property?.city, property?.district, property?.regionName, property?.country]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              </div>
            </div>
          </div>

          {booking?.guestName && (
            <div className="px-6 sm:px-7 pb-4">
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Guest Information</h2>
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 text-[12px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">Name</span>
                  <span className="font-semibold text-slate-900">{booking.guestName}</span>
                </div>
                {booking?.guestPhone && (
                  <div className="flex items-center justify-between gap-3 mt-2">
                    <span className="text-slate-600">Phone</span>
                    <span className="font-semibold text-slate-900">{booking.guestPhone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="px-6 sm:px-7 pb-4">
            <div className="receipt-footer rounded-2xl border border-slate-200 bg-white p-3 grid grid-cols-[1.2fr,0.8fr] gap-4 items-center">
              <div className="text-[10px] text-slate-600">
                <p className="mb-2">Thank you for partnering with NoLSAF.</p>
                <p>For any questions, please contact support.</p>
                <p className="mt-3 text-[10px] text-slate-500">Scan this QR code to verify your receipt.</p>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Receipt QR Code</div>
                <div className="inline-block p-2 bg-white rounded-xl border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/owner/revenue/invoices/${inv.id}/receipt/qr.png`}
                    alt="Receipt QR Code"
                    className="mx-auto w-24 h-24"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, accent, wrap }: { label: string; value: string; mono?: boolean; accent?: boolean; wrap?: boolean }) {
  return (
    <div className="grid grid-cols-[1fr,1.1fr] gap-3 items-start">
      <span className="text-slate-600 min-w-0">{label}</span>
      <span
        className={`min-w-0 text-right ${mono ? (wrap ? "font-mono tabular-nums" : "font-mono tracking-[0.12em] tabular-nums") : "font-semibold"} ${accent ? "text-[#02665e]" : "text-slate-900"} ${wrap ? "break-all whitespace-normal" : "truncate"}`}
      >
        {value}
      </span>
    </div>
  );
}

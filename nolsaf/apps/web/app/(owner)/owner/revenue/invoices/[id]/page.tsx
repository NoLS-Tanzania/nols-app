"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Download, Loader2 } from "lucide-react";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export default function OwnerRevenueInvoiceView() {
  const routeParams = useParams<{ id?: string | string[] }>();
  const idParam = Array.isArray(routeParams?.id) ? routeParams?.id?.[0] : routeParams?.id;

  const [loading, setLoading] = useState(true);
  const [inv, setInv] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!idParam) {
      setInv(null);
      setErr("Missing invoice id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);
    setInv(null);

    api
      .get(`/api/owner/revenue/invoices/${idParam}`)
      .then((r) => {
        if (!mounted) return;
        setInv(r.data);
      })
      .catch((e: any) => {
        if (!mounted) return;
        const status = Number(e?.response?.status ?? 0);
        if (status === 404) {
          setErr("Invoice not found (or you don’t have access to it).");
        } else {
          setErr(String(e?.response?.data?.error || e?.message || "Failed to load invoice"));
        }
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [idParam]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="relative mb-6">
          <span className="absolute inset-0 rounded-full bg-slate-400/20 animate-ping" />
          <div className="relative inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Invoice</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">Loading invoice details…</p>
      </div>
    );
  }

  if (err && !inv) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-50 border border-red-200 mx-auto">
          <FileText className="h-6 w-6 text-red-400" aria-hidden />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Unable to open invoice</h1>
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">{err}</p>
        <Link
          href="/owner/revenue"
          className="no-underline inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm mx-auto"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Revenue
        </Link>
      </div>
    );
  }

  const invoiceNumber = String(inv?.invoiceNumber ?? "—");
  const status = String(inv?.status ?? "—");
  const issuedAt = inv?.issuedAt
    ? new Date(inv.issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";
  const paidAt = inv?.paidAt
    ? new Date(inv.paidAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;
  const propertyTitle = inv?.booking?.property?.title ?? "Property";
  const guestName = inv?.booking?.user?.fullName ?? inv?.booking?.user?.name ?? "—";
  const phone = inv?.booking?.user?.phone ?? "—";
  const codeVisible = inv?.booking?.code?.codeVisible ?? inv?.booking?.code?.code ?? "—";
  const total = inv?.total ?? 0;

  // Sender (owner) info
  const senderName = inv?.owner?.fullName ?? inv?.owner?.name ?? inv?.senderName ?? guestName;
  const senderPhone = inv?.owner?.phone ?? inv?.senderPhone ?? phone;
  const senderCity = inv?.owner?.city ?? inv?.senderCity ?? inv?.booking?.property?.city ?? "";
  const senderAddress = [senderCity, "Tanzania"].filter(Boolean).join(", ");

  const formattedTotal = (() => {
    const n = Number(total);
    if (!Number.isFinite(n)) return "—";
    return new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency: "TZS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  })();

  const statusColors: Record<string, string> = {
    PAID: "bg-emerald-50 border-emerald-200 text-emerald-700",
    REQUESTED: "bg-amber-50 border-amber-200 text-amber-700",
    REJECTED: "bg-red-50 border-red-200 text-red-700",
    DRAFT: "bg-slate-50 border-slate-200 text-slate-600",
    PENDING: "bg-blue-50 border-blue-200 text-blue-700",
  };
  const statusStyle = statusColors[status.toUpperCase()] ?? "bg-slate-50 border-slate-200 text-slate-600";

  return (
    <div className="space-y-5 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-100/70">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-slate-800 via-slate-400 to-transparent rounded-l-2xl" />
        <div className="pointer-events-none select-none absolute right-0 bottom-0 text-[90px] font-black text-slate-100/80 leading-none tracking-tighter pr-4 pb-1" aria-hidden>INVOICE</div>
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(circle, #334155 1px, transparent 1px)", backgroundSize: "18px 18px" }} />

        <div className="relative pl-8 pr-6 pt-6 pb-6 sm:pt-7 sm:pb-7 sm:pr-8 lg:pt-8 lg:pb-8 lg:pr-10 lg:pl-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-600 shadow-sm">
                <FileText className="h-5 w-5 text-white" aria-hidden />
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                Accommodation Invoice
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/api/owner/revenue/invoices/${idParam}/download`}
                download
                className="no-underline inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.97] transition-all duration-150 shadow-sm"
                aria-label="Download invoice"
                title="Download"
              >
                <Download className="h-4 w-4" aria-hidden />
              </a>
              <Link
                href="/owner/revenue"
                className="no-underline inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.97] transition-all duration-150 shadow-sm"
                aria-label="Back to Revenue"
                title="Back"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>

          <div className="mt-5">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-none">{invoiceNumber}</h1>
            <p className="mt-2 text-sm text-slate-500">{propertyTitle} — Accommodation Invoice</p>
          </div>
          <div className="mt-6 h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
        </div>
      </div>

      {/* ── Invoice Details ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Section header */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Invoice Details</span>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusStyle}`}>
            {status}
          </span>
        </div>

        {/* Sender / Receiver */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="p-5 sm:p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Sender (Owner)</div>
            <div className="font-black text-slate-900 text-base leading-snug">{senderName}</div>
            {senderPhone && senderPhone !== "—" ? (
              <div className="text-sm text-slate-600 mt-1">{senderPhone}</div>
            ) : null}
            {senderCity ? (
              <div className="text-sm text-slate-500 mt-0.5">{senderAddress}</div>
            ) : null}
          </div>
          <div className="p-5 sm:p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Receiver (NoLSAF)</div>
            <div className="font-black text-slate-900 text-base leading-snug">NoLSAF</div>
            <div className="text-sm text-slate-600 mt-1">+255</div>
            <div className="text-sm text-slate-500 mt-0.5">Dar es Salaam, Tanzania</div>
          </div>
        </div>

        {/* Booking rows */}
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          <InfoRow label="Property" value={propertyTitle} />
          <InfoRow label="NoLSAF Code" value={codeVisible} mono />
          <InfoRow label="Issued" value={issuedAt} />
          {paidAt ? <InfoRow label="Paid" value={paidAt} /> : null}
        </div>

        {/* Payout total */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Owner Payout</div>
            <div className="text-xs text-slate-400 mt-0.5">Amount to be released</div>
          </div>
          <div className="text-2xl font-black text-slate-900">{formattedTotal}</div>
        </div>
      </div>

      {/* ── Paid notice ── */}
      {status.toUpperCase() === "PAID" ? (
        <div className="relative overflow-hidden rounded-2xl bg-emerald-950 border border-emerald-900 p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70 mb-1">Payment Confirmed</div>
          <div className="text-sm font-bold text-emerald-300">This invoice has been paid. You can view the receipt from your Paid list.</div>
        </div>
      ) : null}

    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between gap-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex-shrink-0">{label}</div>
      <div className={`text-sm text-right text-slate-800 ${mono ? "font-mono font-bold tracking-widest" : "font-medium"}`}>{value}</div>
    </div>
  );
}

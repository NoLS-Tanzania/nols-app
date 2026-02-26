"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Clock, CheckCircle, Calendar, User, Phone,
  DollarSign, FileText, Building2, Lock, MapPin, Hash,
  Globe, Users, Sparkles,
} from "lucide-react";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export default function BookingDetail() {
  const routeParams = useParams<{ id?: string | string[] }>();
  const idParam = Array.isArray(routeParams?.id) ? routeParams?.id?.[0] : routeParams?.id;
  const [b, setB] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [invMeta, setInvMeta] = useState<{
    exists: boolean; invoiceId: number | null; status?: string | null;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get(`/api/owner/bookings/${idParam}`),
      api.get(`/api/owner/invoices/for-booking/${idParam}`),
    ])
      .then(([br, ir]) => {
        if (!mounted) return;
        setB(br.data);
        setInvMeta({
          exists: Boolean(ir.data?.exists),
          invoiceId: ir.data?.invoiceId ? Number(ir.data.invoiceId) : null,
          status: ir.data?.status ?? null,
        });
        setLoading(false);
      })
      .catch((err: any) => {
        if (!mounted) return;
        console.warn("Failed to load booking or invoice meta", err);
        setLoading(false);
      });

    return () => { mounted = false; };
  }, [idParam]);

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-4 py-8 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-5 w-32 bg-slate-200 rounded-full" />
          <div className="h-40 bg-slate-200 rounded-3xl" />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="h-64 bg-slate-200 rounded-3xl" />
            <div className="h-64 bg-slate-200 rounded-3xl" />
          </div>
          <div className="h-16 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (!b) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center">
            <span className="text-4xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Booking Not Found</h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            This booking doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Link
            href="/owner/bookings"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-0.5 transition-all duration-200 no-underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  const isCheckedIn = b.status === "CHECKED_IN";
  const isWaiting = !isCheckedIn && (b.status === "NEW" || b.status === "CONFIRMED");
  const bookingCode = b.code?.codeVisible ?? "-";
  const formatDate = (date: string | Date) =>
    new Date(date).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  const formatCurrency = (amount: number) =>
    `TZS ${Number(amount).toLocaleString("en-TZ")}`;

  const baseAmount = (() => {
    const oba = Number(b?.ownerBaseAmount ?? 0);
    if (Number.isFinite(oba) && oba > 0) return oba;
    const total = Number(b?.totalAmount ?? 0);
    const transport = Number(b?.transportFare ?? 0);
    if (!Number.isFinite(total) || !Number.isFinite(transport)) return 0;
    return Math.max(0, total - transport);
  })();

  const heroGradient = isCheckedIn
    ? "from-emerald-500 via-teal-500 to-cyan-500"
    : "from-amber-400 via-orange-400 to-amber-500";
  const heroShadow = isCheckedIn ? "shadow-emerald-500/30" : "shadow-amber-400/30";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100/80">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* ── Back link ── */}
        <Link
          href="/owner/bookings"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors duration-150 no-underline group"
        >
          <span className="w-7 h-7 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center group-hover:shadow-md group-hover:-translate-x-0.5 transition-all duration-200">
            <ArrowLeft className="h-3.5 w-3.5" />
          </span>
          Back to Bookings
        </Link>

        {/* ── Hero banner ── */}
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${heroGradient} p-8 shadow-2xl ${heroShadow} text-white`}>
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-16 -left-8 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute top-4 right-24 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-inner flex-shrink-0">
                {isCheckedIn
                  ? <CheckCircle className="h-8 w-8 text-white drop-shadow" />
                  : <Clock className="h-8 w-8 text-white drop-shadow" />}
              </div>
              <div>
                <p className="text-sm font-medium text-white/70 uppercase tracking-widest mb-1">Booking #{b.id}</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight drop-shadow-sm">
                  {isCheckedIn ? "Checked In" : "Awaiting Check-in"}
                </h1>
                {isWaiting && (
                  <p className="text-sm text-white/75 mt-1.5 max-w-xs leading-relaxed">
                    Guest needs to validate their booking code on arrival.
                  </p>
                )}
              </div>
            </div>
            <span className="px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase bg-white/20 border border-white/30 text-white backdrop-blur-sm">
              {b.status?.replace("_", " ")}
            </span>
          </div>

          {/* Quick stat strip */}
          <div className="relative mt-8 grid grid-cols-3 gap-3">
            {[
              { label: "Check-in", value: formatDate(b.checkIn).split(",")[0] },
              { label: "Check-out", value: formatDate(b.checkOut).split(",")[0] },
              { label: "Revenue", value: baseAmount > 0 ? `TZS ${Number(baseAmount).toLocaleString("en-TZ")}` : "—" },
            ].map((s) => (
              <div key={s.label} className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 border border-white/20 text-center">
                <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wider mb-0.5">{s.label}</p>
                <p className="text-sm font-bold text-white truncate">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Detail cards ── */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Details */}
          <div className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400" />
            <div className="px-6 pt-5 pb-3 flex items-center gap-3 border-b border-slate-50">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-md shadow-blue-500/20">
                <User className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">Personal Details</h2>
            </div>
            <div className="p-6 space-y-1">
              <InfoRow icon={<User className="h-3.5 w-3.5" />} iconColor="text-blue-500" label="Full Name" value={b.guestName ?? b.user?.name ?? "—"} />
              <InfoRow icon={<Phone className="h-3.5 w-3.5" />} iconColor="text-violet-500" label="Phone" value={b.guestPhone ?? b.user?.phone ?? "—"} mono />
              <InfoRow icon={<Globe className="h-3.5 w-3.5" />} iconColor="text-indigo-400" label="Nationality" value={b.nationality ?? "—"} />
              <InfoRow icon={<Users className="h-3.5 w-3.5" />} iconColor="text-purple-400" label="Sex" value={b.sex ?? "—"} />
              <InfoRow icon={<Sparkles className="h-3.5 w-3.5" />} iconColor="text-fuchsia-400" label="Age Group" value={b.ageGroup ?? "—"} />
            </div>
          </div>

          {/* Booking Details */}
          <div className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400" />
            <div className="px-6 pt-5 pb-3 flex items-center gap-3 border-b border-slate-50">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-md shadow-teal-500/20">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-base font-bold text-slate-800 tracking-tight">Booking Details</h2>
            </div>
            <div className="p-6 space-y-1">
              <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} iconColor="text-teal-500" label="Property" value={`${b.property?.title ?? "—"}  ·  ${b.property?.type ?? "—"}`} />
              <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} iconColor="text-cyan-500" label="Check-in" value={formatDate(b.checkIn)} />
              <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} iconColor="text-sky-400" label="Check-out" value={formatDate(b.checkOut)} />
              <InfoRow icon={<DollarSign className="h-3.5 w-3.5" />} iconColor="text-emerald-500" label="Base Amount" value={baseAmount > 0 ? formatCurrency(baseAmount) : "—"} highlight />
              <InfoRow icon={<Hash className="h-3.5 w-3.5" />} iconColor="text-slate-400" label="NoLSAF Code" value={bookingCode} mono />
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Actions</p>
          <div className="flex flex-wrap gap-3">
            {isCheckedIn && (
              invMeta?.exists ? (
                <>
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-400 cursor-not-allowed font-semibold text-sm"
                    title="Invoice already generated"
                  >
                    <Lock className="h-4 w-4" />
                    Invoice Generated
                  </button>
                  {invMeta.invoiceId && (
                    <Link
                      href={`/owner/invoices/${invMeta.invoiceId}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm no-underline"
                    >
                      <FileText className="h-4 w-4 text-teal-500" />
                      View Invoice
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  href={`/owner/invoices/new?bookingId=${b.id}`}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-0.5 transition-all duration-200 no-underline"
                >
                  <FileText className="h-4 w-4" />
                  Generate Invoice
                </Link>
              )
            )}
            <Link
              href="/owner/bookings"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm no-underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to List
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ── InfoRow sub-component ── */
function InfoRow({
  icon, iconColor, label, value, mono, highlight,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <span className={`flex-shrink-0 w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center ${iconColor}`}>
        {icon}
      </span>
      <span className="text-xs text-slate-400 font-medium w-28 flex-shrink-0">{label}</span>
      <span className={`text-sm flex-1 break-words ${
        highlight ? "font-bold text-teal-600" : "font-semibold text-slate-800"
      } ${mono ? "font-mono tracking-wide" : ""}`.trim()}>
        {value}
      </span>
    </div>
  );
}

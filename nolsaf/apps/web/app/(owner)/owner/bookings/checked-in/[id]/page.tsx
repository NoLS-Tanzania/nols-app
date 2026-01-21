"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, CheckCircle, Calendar, User, Phone, DollarSign, FileText, Building2, Lock } from "lucide-react";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export default function BookingDetail() {
  const routeParams = useParams<{ id?: string | string[] }>();
  const idParam = Array.isArray(routeParams?.id) ? routeParams?.id?.[0] : routeParams?.id;
  const [b, setB] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [invMeta, setInvMeta] = useState<{ exists: boolean; invoiceId: number | null; status?: string | null } | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get(`/owner/bookings/${idParam}`),
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
        console.warn('Failed to load booking or invoice meta', err);
        setLoading(false);
      });

    return () => { mounted = false; };
  }, [idParam]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-slate-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!b) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Booking Not Found</h2>
          <p className="text-sm text-slate-600 mb-6">The booking you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Link href="/owner/bookings" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Bookings</span>
          </Link>
        </div>
      </div>
    );
  }

  const isCheckedIn = b.status === "CHECKED_IN";
  const isWaiting = !isCheckedIn && (b.status === "NEW" || b.status === "CONFIRMED");
  const bookingCode = b.code?.codeVisible ?? "-";
  const formatDateTime = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };
  const formatCurrency = (amount: number) => {
    return `TZS ${Number(amount).toLocaleString("en-TZ")}`;
  };

  return (
    <div className="min-h-[60vh] px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/owner/bookings" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4 transition-colors no-underline">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Bookings</span>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {isCheckedIn ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <Clock className="h-6 w-6 text-amber-500" />
              )}
              <h1 className="text-2xl font-bold text-slate-900">
                {isCheckedIn ? "Checked-In" : "Waiting for Check-in"} • #{b.id}
              </h1>
            </div>
            {isWaiting && (
              <p className="text-sm text-slate-600 ml-9">
                This booking is waiting for the guest to arrive and validate their booking code.
              </p>
            )}
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${
            isCheckedIn 
              ? "bg-green-100 text-green-700 border border-green-300" 
              : "bg-amber-100 text-amber-700 border border-amber-300"
          }`}>
            {b.status}
          </div>
        </div>
      </div>

      {/* Main Content Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-white" />
              <h2 className="text-lg font-semibold text-white">Personal Details</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <DetailRow icon={<User className="h-4 w-4 text-slate-400" />} label="Full name" value={b.guestName ?? b.user?.name ?? "-"} />
            <DetailRow icon={<Phone className="h-4 w-4 text-slate-400" />} label="Phone" value={b.guestPhone ?? b.user?.phone ?? "-"} />
            <DetailRow label="Nationality" value={b.nationality ?? "-"} />
            <DetailRow label="Sex" value={b.sex ?? "-"} />
            <DetailRow label="Age Group" value={b.ageGroup ?? "-"} />
          </div>
        </div>

        {/* Booking Details Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-white" />
              <h2 className="text-lg font-semibold text-white">Booking Details</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <DetailRow icon={<Building2 className="h-4 w-4 text-slate-400" />} label="Property" value={`${b.property?.title ?? "-"} • ${b.property?.type ?? "-"}`} />
            <DetailRow icon={<Calendar className="h-4 w-4 text-slate-400" />} label="Check-in" value={formatDateTime(b.checkIn)} />
            <DetailRow icon={<Calendar className="h-4 w-4 text-slate-400" />} label="Check-out" value={formatDateTime(b.checkOut)} />
            <DetailRow icon={<DollarSign className="h-4 w-4 text-slate-400" />} label="Amount paid" value={b.totalAmount != null ? formatCurrency(Number(b.totalAmount)) : "-"} />
            <DetailRow icon={<FileText className="h-4 w-4 text-slate-400" />} label="NoLSAF Code" value={bookingCode} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        {isCheckedIn && (
          invMeta?.exists ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-200 text-slate-600 cursor-not-allowed transition-all duration-200 shadow-sm no-underline font-medium"
                title="Invoice already generated for this booking"
              >
                <Lock className="h-4 w-4" aria-hidden />
                <span>Invoice Generated</span>
              </button>
              {invMeta.invoiceId ? (
                <Link
                  href={`/owner/invoices/${invMeta.invoiceId}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] no-underline font-medium"
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  <span>View Invoice</span>
                </Link>
              ) : null}
            </div>
          ) : (
            <Link
              href={`/owner/invoices/new?bookingId=${b.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] no-underline font-medium"
            >
              <FileText className="h-4 w-4" aria-hidden />
              <span>Generate Invoice</span>
            </Link>
          )
        )}
        <Link
          href="/owner/bookings"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] no-underline font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to List</span>
        </Link>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      {icon && <div className="mt-0.5 flex-shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500 mb-1">{label}</div>
        <div className="text-sm font-medium text-slate-900 break-words">{value}</div>
      </div>
    </div>
  );
}

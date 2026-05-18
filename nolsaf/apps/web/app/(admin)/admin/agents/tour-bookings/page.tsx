"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  Info,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import apiClient from "@/lib/apiClient";

const api = apiClient;

type TourCommerceSummary = {
  operators: number;
  activeOperators: number;
  publicReadyOperators: number;
  packages: number;
  livePackages: number;
  paidBookings: number;
  grossBookingRevenue: number;
  nolsafCommission: number;
  operatorPayout: number;
  grossPackageFloor: number;
  currency: string;
};

type TourOperator = {
  id: number;
  status: string;
  isAvailable: boolean;
  name: string;
  email?: string | null;
  phone?: string | null;
  regions: string[];
  completedTrips: number;
  totalRevenueGenerated: number;
  readiness: {
    hasCompanyName: boolean;
    hasContact: boolean;
    approvedDocs: number;
    requiredDocs: number;
    packageCount: number;
    publicReady: boolean;
  };
};

type TourPackage = {
  id: string;
  agentId: number;
  operatorName: string;
  title: string;
  destination: string;
  category: string;
  duration: string;
  minPax: number;
  maxPax: number;
  pricePerPerson: number;
  estimatedGross: number;
  currency: string;
  nolsafPercent: number;
  bookingsCount: number;
  totalGenerated: number;
  status: string;
};

type TourBooking = {
  id: number;
  bookingCode: string;
  operatorName: string;
  customerName: string;
  title: string;
  destination?: string | null;
  travelerCount: number;
  startDate?: string | null;
  status: string;
  paymentStatus: string;
  payoutStatus: string;
  currency: string;
  grossAmount: number;
  commissionAmount: number;
  operatorPayoutAmount: number;
  createdAt: string;
};

type OverviewPayload = {
  ok: boolean;
  summary: TourCommerceSummary;
  operators: TourOperator[];
  packages: TourPackage[];
  bookings: TourBooking[];
};

function authify() {}

function money(value: number, currency = "TZS") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "TZS" }).format(Number(value || 0));
}

function packageStatusMeta(status: string) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "APPROVED" || normalized === "LIVE" || normalized === "PUBLISHED") {
    return {
      label: "Approved",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (normalized === "REJECTED") {
    return {
      label: "Rejected",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }
  if (normalized === "SUSPENDED") {
    return {
      label: "Suspended",
      className: "border-orange-200 bg-orange-50 text-orange-700",
    };
  }
  return {
    label: "Admin review",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  };
}

function bookingStatusBadge(status: string) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "PAID" || normalized === "CONFIRMED" || normalized === "COMPLETED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "CANCELLED" || normalized === "REJECTED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default function AdminAgentsTourBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      authify();
      const res = await api.get<OverviewPayload>("/api/admin/tour-commerce/overview");
      setOverview(res.data);
    } catch (e: any) {
      setOverview(null);
      setError(e?.response?.data?.error || e?.message || "Failed to load tour commerce");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = overview?.summary;
  const packages = overview?.packages ?? [];
  const bookings = overview?.bookings ?? [];
  const currency = summary?.currency || packages[0]?.currency || bookings[0]?.currency || "TZS";

  const kpis = [
    { label: "Operators", value: summary?.operators ?? 0, icon: Building2, color: "from-blue-500 to-blue-600" },
    { label: "Public Ready", value: summary?.publicReadyOperators ?? 0, icon: ShieldCheck, color: "from-emerald-500 to-emerald-600" },
    { label: "Packages", value: summary?.packages ?? 0, icon: PackageCheck, color: "from-amber-500 to-amber-600" },
    { label: "Paid Bookings", value: summary?.paidBookings ?? 0, icon: CheckCircle2, color: "from-cyan-500 to-cyan-600" },
    { label: "NoLSAF Commission", value: money(summary?.nolsafCommission ?? 0, currency), icon: BadgeDollarSign, color: "from-violet-500 to-violet-600" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 min-w-0">
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(135deg, #0e2a7a 0%, #0a5c82 38%, #02665e 100%)", boxShadow: "0 28px 65px -15px rgba(2,102,94,0.45), 0 8px 22px -8px rgba(14,42,122,0.50)" }}
      >
        <svg
          aria-hidden
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 900 220"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="860" cy="45" r="200" stroke="white" strokeOpacity="0.06" strokeWidth="1" fill="none" />
          <circle cx="860" cy="45" r="155" stroke="white" strokeOpacity="0.05" strokeWidth="1" fill="none" />
          <circle cx="820" cy="15" r="115" stroke="white" strokeOpacity="0.045" strokeWidth="1" fill="none" />
          <circle cx="28" cy="208" r="130" stroke="white" strokeOpacity="0.04" strokeWidth="1" fill="none" />
          {[44, 88, 132, 176].map((y) => (
            <line key={y} x1="0" y1={y} x2="900" y2={y} stroke="rgba(255,255,255,0.030)" strokeWidth="1" />
          ))}
          <polyline
            points="0,188 80,165 160,178 240,145 320,160 400,125 480,142 560,108 640,124 720,90 800,106 880,78"
            fill="none"
            stroke="white"
            strokeOpacity="0.16"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon
            points="0,188 80,165 160,178 240,145 320,160 400,125 480,142 560,108 640,124 720,90 800,106 880,78 900,220 0,220"
            fill="white"
            fillOpacity="0.026"
          />
          <polyline
            points="0,200 100,186 200,194 300,172 400,180 500,160 600,168 700,148 800,156 900,136"
            fill="none"
            stroke="white"
            strokeOpacity="0.07"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {([[720, 90], [560, 108], [880, 78], [240, 145]] as [number, number][]).map(([px, py]) => (
            <circle key={`${px}-${py}`} cx={px} cy={py} r="3" fill="white" fillOpacity="0.22" />
          ))}
          <radialGradient id="tourCommerceHeaderGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(10,92,130,0.45)" />
            <stop offset="100%" stopColor="rgba(10,92,130,0)" />
          </radialGradient>
          <ellipse cx="450" cy="110" rx="300" ry="140" fill="url(#tourCommerceHeaderGlow)" />
        </svg>

        <button
          type="button"
          onClick={() => void load()}
          className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition-all duration-150 hover:bg-white/15 focus:outline-none"
          style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
          title="Refresh tour commerce"
          aria-label="Refresh tour commerce"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>

        <div className="relative z-10 flex flex-col items-center text-center px-6 py-10 sm:py-14">
          <div
            className="mb-5 inline-flex items-center justify-center rounded-full"
            style={{
              width: 64,
              height: 64,
              background: "rgba(255,255,255,0.10)",
              border: "1.5px solid rgba(255,255,255,0.18)",
              boxShadow: "0 0 0 8px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.35)",
            }}
          >
            <Wallet className="h-7 w-7" style={{ color: "rgba(255,255,255,0.92)" }} aria-hidden />
          </div>

          <div className="text-xs font-black uppercase tracking-widest text-emerald-100">No4P Agents Platform</div>
          <h1
            className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ color: "#ffffff", textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
          >
            Tour Commerce Control
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base" style={{ color: "rgba(255,255,255,0.60)" }}>
            Verified operators, sellable packages, paid bookings, commissions and payouts.
          </p>

          <div className="mt-4 relative group/tooltip inline-flex">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-150 focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.70)",
              }}
              aria-label="Tour commerce info"
              onClick={(e) => {
                e.preventDefault();
                try {
                  (e.currentTarget as HTMLButtonElement).focus();
                } catch {
                  // ignore
                }
              }}
            >
              <Info className="h-3.5 w-3.5" aria-hidden />
              <span>Commerce overview</span>
            </button>
            <div
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 z-50 mb-2 w-72 max-w-[calc(100vw-1rem)] whitespace-normal break-words rounded-xl px-3 py-2.5 text-left text-xs opacity-0 shadow-2xl transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
              style={{ background: "#0b2a38", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.85)" }}
            >
              <div className="font-semibold mb-1" style={{ color: "#fff" }}>Tour commerce</div>
              <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.60)" }}>
                Track operator readiness, package inventory and the booking money flow from gross paid amount to NoLSAF commission and operator payout.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-5 transition-opacity duration-200`} />
              <div className="relative z-10">
                <div className={`inline-flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br ${item.color} text-white shadow-sm`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="mt-3 text-xl font-black text-gray-900">{item.value}</div>
                <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">{item.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gradient-to-r from-[#02665e]/10 to-emerald-50 rounded-xl border border-[#02665e]/20 p-4 sm:p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 sm:divide-x sm:divide-[#02665e]/15">
          <div className="text-center sm:pr-6">
            <div className="text-xs sm:text-sm font-medium text-gray-600">Gross Booking Revenue</div>
            <div className="mt-1 text-lg sm:text-xl font-bold text-gray-900">{money(summary?.grossBookingRevenue ?? 0, currency)}</div>
          </div>
          <div className="text-center sm:pl-6">
            <div className="text-xs sm:text-sm font-medium text-gray-600">Operator Payout</div>
            <div className="mt-1 text-lg sm:text-xl font-bold text-[#02665e]">{money(summary?.operatorPayout ?? 0, currency)}</div>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Package Inventory</h2>
            <p className="mt-1 text-xs text-gray-500">Tour packages ready for public listing</p>
          </div>
          <Link href="/admin/agents/tour-operators" className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 no-underline hover:bg-gray-50 transition-colors whitespace-nowrap">
            View Operators
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Package</th>
                <th className="px-4 py-3 whitespace-nowrap">Operator</th>
                <th className="px-4 py-3 whitespace-nowrap">Pax</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">From</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">NoLSAF %</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Bookings</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Generated</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">Loading packages...</td></tr>
              ) : packages.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-500">No tour packages have been added by operators yet.</td></tr>
              ) : (
                packages.slice(0, 12).map((pkg) => {
                  const status = packageStatusMeta(pkg.status);
                  return (
                    <tr key={pkg.id} className="hover:bg-sky-50 hover:shadow-sm transition duration-150 ease-in-out">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 truncate max-w-[260px]">{pkg.title}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[260px]">{[pkg.destination, pkg.duration, pkg.category].filter(Boolean).join(" / ") || "Details pending"}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{pkg.operatorName}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{pkg.minPax}-{pkg.maxPax}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">{money(pkg.pricePerPerson, pkg.currency)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-violet-700 whitespace-nowrap">{Number(pkg.nolsafPercent || 0)}%</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">{Number(pkg.bookingsCount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">{money(pkg.totalGenerated, pkg.currency)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Tour Bookings</h2>
            <p className="mt-1 text-xs text-gray-500">Paid bookings and commission tracking</p>
          </div>
          <div className="inline-flex rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 whitespace-nowrap">
            {bookings.length} records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Booking</th>
                <th className="px-4 py-3 whitespace-nowrap">Operator</th>
                <th className="px-4 py-3 whitespace-nowrap">Customer</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Gross</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">NoLSAF</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">Loading bookings...</td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-500">No direct tour bookings yet.</td></tr>
              ) : (
                bookings.slice(0, 12).map((booking) => (
                  <tr key={booking.id} className="hover:bg-sky-50 hover:shadow-sm transition duration-150 ease-in-out">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 whitespace-nowrap">{booking.bookingCode}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[240px]">{booking.title}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{booking.operatorName}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800 whitespace-nowrap">{booking.customerName}</div>
                      <div className="text-xs text-gray-500">{booking.travelerCount} travelers</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${bookingStatusBadge(booking.status)}`}>{booking.status}</span>
                        <div className="text-[11px] font-semibold text-gray-500">{booking.paymentStatus} / {booking.payoutStatus}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">{money(booking.grossAmount, booking.currency)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">{money(booking.commissionAmount, booking.currency)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-700 whitespace-nowrap">{money(booking.operatorPayoutAmount, booking.currency)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

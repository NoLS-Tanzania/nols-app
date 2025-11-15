"use client";
import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import Chart from "@/components/Chart";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });
function authify() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
  // Dev-friendly headers for API stubbed auth
  api.defaults.headers.common["x-role"] = "ADMIN";
  api.defaults.headers.common["x-user-id"] = "1";
}

// Accept both older analytics keys and the newer `overview` keys used elsewhere in the app.
type Stats = {
  // analytics-style
  propertiesCount?: number | null;
  ownersCount?: number | null;
  grossAmount?: number | null;
  companyRevenue?: number | null;

  // overview-style fallbacks
  propertyCount?: number | null;
  ownerCount?: number | null;
  revenue?: number | null;
  nolsRevenue?: number | null;

  activeUsersCount?: number | null;
  lastUpdated?: string | null;
  visibility?: { financeMasked?: boolean } | null;
};

export default function AdminAnalyticsClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const [revealRevenue, setRevealRevenue] = useState(false);

  const [otpOpen, setOtpOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await api.get<Stats>("/admin/stats/overview");
    setStats(r.data);
    setLoading(false);
  }

  useEffect(() => { authify(); load(); }, []);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "";
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const s: Socket = io(url, { transports: ['websocket'], auth: token ? { token } : undefined });
    const refresh = () => load();
    s.on("admin:invoice:paid", refresh);
    return () => { s.off("admin:invoice:paid", refresh); s.disconnect(); };
  }, []);

  const fmtMoney = (n: number | null | undefined) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "TZS", maximumFractionDigits: 0 })
      .format(Number(n || 0));

  const isFinanceMasked = Boolean(stats?.visibility?.financeMasked);

  async function sendOtp() {
    setOtpError(null);
    setOtpBusy(true);
    try {
      await api.post("/admin/2fa/otp/send", { purpose: "FINANCE_VIEW" });
      setOtpOpen(true);
    } catch (e: any) {
      setOtpError(e?.response?.data?.error || "Failed to send code");
    } finally {
      setOtpBusy(false);
    }
  }
  async function verifyOtp() {
    setOtpError(null);
    setOtpBusy(true);
    try {
      await api.post("/admin/2fa/otp/verify", { purpose: "FINANCE_VIEW", code: otpCode.trim() });
      setOtpOpen(false);
      setOtpCode("");
      await load();
      setRevealRevenue(true);
    } catch (e: any) {
      setOtpError(e?.response?.data?.error || "Invalid code");
    } finally {
      setOtpBusy(false);
    }
  }

  const cards = useMemo(() => {
    if (!stats) return [];
    // Resolve values with fallbacks to support both shapes
    const propsCount = Number(stats.propertiesCount ?? stats.propertyCount ?? 0);
    const ownersCount = Number(stats.ownersCount ?? stats.ownerCount ?? 0);
    const gross = Number(stats.grossAmount ?? 0);
    const nols = Number(stats.companyRevenue ?? stats.nolsRevenue ?? stats.revenue ?? 0);

    return [
      {
        key: "props",
        label: "Properties",
        value: String(propsCount),
        color: "violet" as const,
        href: "/admin/properties",
        Icon: BuildingIcon,
      },
      {
        key: "owners",
        label: "Owners",
        value: String(ownersCount),
        color: "emerald" as const,
        href: "/admin/owners",
        Icon: UsersIcon,
      },
      {
        key: "gross",
        label: "Gross Billed",
        value: fmtMoney(gross),
        color: "blue" as const,
        href: "/admin/revenue",
        Icon: CoinsIcon,
      },
      {
        key: "revenue",
        label: "NoLS Revenue",
        value: isFinanceMasked ? "**********" : (revealRevenue ? fmtMoney(nols) : "**********"),
        color: "rose" as const,
        onClick: () => { if (isFinanceMasked) sendOtp(); else setRevealRevenue(v => !v); },
        hint: isFinanceMasked ? "Click to reveal (admin OTP)" : "Click to reveal (admin only)",
        Icon: CoinsIcon,
      },
    ];
  }, [stats, revealRevenue, isFinanceMasked]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <a href="/admin" className="link">← Introduction</a>
        <h1 className="text-2xl font-semibold">Analytics</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && [...Array(3)].map((_, i) => <div key={i} className="card h-28 animate-pulse" />)}
        {!loading && cards.map(({ key, ...rest }) => (
          <StatCard key={key} {...rest} />
        ))}
      </div>

      {/* Chart.js bar with four colored bars (Properties, Owners, Gross, Revenue) */}
      {!loading && (
        <div className="card">
          <div className="card-section">
            <div className="font-medium">KPI Overview</div>
            <div className="mt-3">
              <Chart
                type="bar"
                height={260}
                data={{
                  labels: ["Properties", "Owners", "Gross", "Revenue"],
                  datasets: [
                    {
                      label: "Count / Amount",
                      data: [
                        // mirror the same fallbacks used for cards
                        Number(stats?.propertiesCount ?? stats?.propertyCount ?? 0),
                        Number(stats?.ownersCount ?? stats?.ownerCount ?? 0),
                        Number(stats?.grossAmount ?? 0),
                        Number(stats?.companyRevenue ?? stats?.nolsRevenue ?? stats?.revenue ?? 0),
                      ],
                      backgroundColor: [
                        "#7c3aed", // violet
                        "#059669", // emerald
                        "#2563eb", // blue
                        "#e11d48", // rose
                      ],
                    },
                  ],
                }}
                options={{
                  plugins: { legend: { display: false } },
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: { y: { ticks: { precision: 0 } } },
                }}
              />
            </div>
          </div>
        </div>
      )}

      {otpOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl p-4 w-full max-w-sm space-y-3 card">
            <div className="font-medium text-lg">Enter OTP to Reveal Finance</div>
            <div className="text-sm text-gray-600">We sent a 6-digit code to your registered channel.</div>

            <input
              className="input"
              placeholder="6-digit code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
            />

            {otpError && <div className="text-sm text-rose-600">{otpError}</div>}

            <div className="flex items-center justify-between">
              <button className="btn-ghost" onClick={() => setOtpOpen(false)} disabled={otpBusy}>Cancel</button>
              <div className="flex gap-2">
                <button className="btn-outline" onClick={sendOtp} disabled={otpBusy}>Resend</button>
                <button className="btn-solid" onClick={verifyOtp} disabled={otpBusy || otpCode.trim().length < 4}>
                  {otpBusy ? "Verifying…" : "Verify"}
                </button>
              </div>
            </div>

            <div className="text-[11px] text-gray-500">Access will auto-expire after a short time for security.</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Types & Components used inside ---------- */

type StatCardProps = {
  key?: string;
  label: string;
  value: string;
  hint?: string;
  href?: string;
  onClick?: () => void;
  color: "violet" | "emerald" | "rose" | "sky" | "blue";
  Icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
};

function StatCard({ label, value, hint, href, onClick, color, Icon }: StatCardProps) {
  const accent: Record<StatCardProps["color"], { bar: string; icon: string; value: string; }> = {
    violet:  { bar: "from-violet-500 to-fuchsia-600", icon: "text-violet-600",  value: "text-violet-600" },
    emerald: { bar: "from-emerald-600 to-green-600",  icon: "text-emerald-600", value: "text-emerald-600" },
    rose:    { bar: "from-rose-600 to-red-600",       icon: "text-rose-600",    value: "text-rose-600" },
    sky:     { bar: "from-sky-500 to-cyan-600",       icon: "text-sky-600",     value: "text-sky-600" },
    blue:    { bar: "from-blue-600 to-indigo-600",    icon: "text-blue-600",    value: "text-blue-600" },
  };

  const Inner = (
    <div
      className="relative card overflow-hidden text-left transition shadow-card hover:shadow-lg hover:-translate-y-0.5"
      onClick={href ? undefined : onClick}
      role="button"
      aria-label={label}
    >
      <div className={`absolute left-0 inset-y-0 w-2 rounded-l-xl bg-gradient-to-b ${accent[color].bar}`} />

      <div className="card-section pl-5">
        <div className="flex items-start gap-3">
          <div className={`h-9 w-9 rounded-lg bg-gray-50 border flex items-center justify-center ${accent[color].icon}`}>
            <Icon aria-hidden="true" className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-600">{label}</div>
            <div className={`mt-2 text-3xl font-semibold ${accent[color].value}`}>{value}</div>
            {hint && <div className="mt-2 text-xs text-gray-500">{hint}</div>}
          </div>
        </div>
      </div>
    </div>
  );

  return href ? (
    <a href={href} className="block">{Inner}</a>
  ) : (
    <button type="button" className="btn-none w-full text-left">{Inner}</button>
  );
}

function BuildingIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M4 20V7a2 2 0 0 1 2-2h4V4a2 2 0 0 1 2-2h6v18" />
      <path d="M8 9h2M8 13h2M8 17h2M14 7h4M14 11h4M14 15h4" />
      <path d="M2 20h20M10 20v-3h4v3" />
    </svg>
  );
}

function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="8" cy="8" r="3" />
      <circle cx="17" cy="7" r="3" />
      <path d="M2 20c0-3.314 2.686-6 6-6h0" />
      <path d="M12 20c0-3.038 2.462-5.5 5.5-5.5h0" />
    </svg>
  );
}

function CoinsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.66 3.134 3 7 3s7-1.34 7-3V6" />
      <path d="M5 12v6c0 1.66 3.134 3 7 3s7-1.34 7-3v-6" />
    </svg>
  );
}

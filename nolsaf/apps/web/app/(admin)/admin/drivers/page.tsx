"use client";
import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import DriversDashboard from "./dashboard/page";
import axios from "axios";

const api = axios.create({ baseURL: "", withCredentials: true });

type SummaryData = {
  totalDrivers?: number;
  activeDrivers?: number;
  suspendedDrivers?: number;
  topBookings?: number;
  bookingPerformance?: { high: number; medium: number; low: number; none: number };
};

export default function AdminDriversPage() {
  const [summary, setSummary] = useState<SummaryData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<SummaryData>("/api/admin/drivers/summary");
        if (r?.data) setSummary(r.data);
      } catch {
        // best-effort
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const kpis = [
    {
      label: "Total Drivers",
      value: loading ? null : (summary.totalDrivers ?? 0),
      bg: "rgba(56,189,248,0.18)",
      border: "rgba(56,189,248,0.32)",
      color: "#7dd3fc",
    },
    {
      label: "Active",
      value: loading ? null : (summary.activeDrivers ?? 0),
      bg: "rgba(16,185,129,0.18)",
      border: "rgba(16,185,129,0.32)",
      color: "#6ee7b7",
    },
    {
      label: "Suspended",
      value: loading ? null : (summary.suspendedDrivers ?? 0),
      bg: "rgba(239,68,68,0.18)",
      border: "rgba(239,68,68,0.32)",
      color: "#fca5a5",
    },
    {
      label: "Top Bookings",
      value: loading ? null : (summary.topBookings ?? 0),
      bg: "rgba(99,102,241,0.18)",
      border: "rgba(99,102,241,0.32)",
      color: "#a5b4fc",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Premium header banner */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0e2a7a 0%, #0a5c82 38%, #02665e 100%)",
          boxShadow: "0 28px 65px -15px rgba(2,102,94,0.45), 0 8px 22px -8px rgba(14,42,122,0.50)",
        }}
      >
        {/* Sparkline / road-route SVG decoration */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none select-none"
          viewBox="0 0 900 220"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Arc circles top-right */}
          <circle cx="860" cy="-20" r="130" fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth="1.2" />
          <circle cx="860" cy="-20" r="195" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
          {/* Arc circle bottom-left */}
          <circle cx="40" cy="240" r="110" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          {/* Faint horizontal grid lines */}
          <line x1="0" y1="55" x2="900" y2="55" stroke="rgba(255,255,255,0.045)" strokeWidth="0.8" />
          <line x1="0" y1="110" x2="900" y2="110" stroke="rgba(255,255,255,0.045)" strokeWidth="0.8" />
          <line x1="0" y1="165" x2="900" y2="165" stroke="rgba(255,255,255,0.03)" strokeWidth="0.8" />
          {/* Road/route dashed path */}
          <path
            d="M 0 185 Q 80 190 120 170 Q 200 145 260 150 Q 340 158 400 130 Q 480 95 540 110 Q 620 130 680 90 Q 740 55 800 70 Q 850 80 900 60"
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="1.5"
            strokeDasharray="8 5"
          />
          {/* Main sparkline wave */}
          <polyline
            points="0,170 80,155 160,140 240,145 320,120 400,105 480,118 560,92 640,75 720,88 800,60 900,48"
            fill="none"
            stroke="rgba(255,255,255,0.30)"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Filled area below main wave */}
          <polygon
            points="0,170 80,155 160,140 240,145 320,120 400,105 480,118 560,92 640,75 720,88 800,60 900,48 900,220 0,220"
            fill="rgba(255,255,255,0.04)"
          />
          {/* Secondary offset wave */}
          <polyline
            points="0,190 100,178 200,168 300,175 400,155 500,142 600,150 700,128 800,115 900,100"
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="1.4"
            strokeDasharray="5 4"
            strokeLinejoin="round"
          />
          {/* Truck icon dots — glowing points along route */}
          <circle cx="320" cy="120" r="4.5" fill="rgba(125,211,252,0.70)" />
          <circle cx="320" cy="120" r="9" fill="rgba(125,211,252,0.15)" />
          <circle cx="640" cy="75" r="4.5" fill="rgba(110,231,183,0.70)" />
          <circle cx="640" cy="75" r="9" fill="rgba(110,231,183,0.15)" />
          <circle cx="800" cy="60" r="4.5" fill="rgba(165,180,252,0.70)" />
          <circle cx="800" cy="60" r="9" fill="rgba(165,180,252,0.15)" />
          {/* Radial center glow */}
          <ellipse cx="450" cy="110" rx="260" ry="70" fill="url(#drvGlow)" />
          <defs>
            <radialGradient id="drvGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(2,102,94,0.18)" />
              <stop offset="100%" stopColor="rgba(2,102,94,0)" />
            </radialGradient>
          </defs>
        </svg>

        {/* Content */}
        <div className="relative z-10 px-6 pt-8 pb-7 sm:px-8 sm:pt-10">
          {/* Icon + title row */}
          <div className="flex items-center gap-4 mb-6">
            <div
              className="flex items-center justify-center rounded-xl flex-shrink-0"
              style={{
                width: 46, height: 46,
                background: "rgba(255,255,255,0.10)",
                border: "1.5px solid rgba(255,255,255,0.18)",
                boxShadow: "0 0 0 8px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.35)",
              }}
            >
              <Truck className="h-5 w-5" style={{ color: "rgba(255,255,255,0.92)" }} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: "#ffffff", textShadow: "0 2px 12px rgba(0,0,0,0.40)" }}>
                Drivers Control Dashboard 
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.58)" }}>
                Live overview of platform driver activity
              </p>
            </div>
          </div>

          {/* KPI chips */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl px-4 py-3"
                style={{
                  background: kpi.bg,
                  border: `1px solid ${kpi.border}`,
                  backdropFilter: "blur(8px)",
                }}
              >
                {loading ? (
                  <div className="animate-pulse rounded-lg h-10 w-full" style={{ background: "rgba(255,255,255,0.12)" }} />
                ) : (
                  <>
                    <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {kpi.label}
                    </div>
                    <div className="text-2xl font-black tabular-nums" style={{ color: kpi.color, textShadow: `0 0 18px ${kpi.color}55` }}>
                      {(kpi.value as number).toLocaleString()}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <DriversDashboard />
    </div>
  );
}

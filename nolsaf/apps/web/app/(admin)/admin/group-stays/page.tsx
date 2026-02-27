"use client";
import { Users } from "lucide-react";
import GroupStaysDashboard from "./dashboard/page";

export default function AdminGroupStaysPage() {
  return (
    <div className="space-y-6">
      {/* Premium Banner */}
      <div style={{ position: "relative", borderRadius: "1.25rem", overflow: "hidden", background: "linear-gradient(135deg, #3b0764 0%, #4c1d95 35%, #1e3a8a 100%)", boxShadow: "0 28px 65px -15px rgba(109,40,217,0.40), 0 8px 22px -8px rgba(30,58,138,0.45)", padding: "2rem 2rem 1.75rem" }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.12, pointerEvents: "none" }} viewBox="0 0 900 160" preserveAspectRatio="xMidYMid slice">
          <circle cx="820" cy="30" r="90" fill="none" stroke="white" strokeWidth="1.2" />
          <circle cx="820" cy="30" r="55" fill="none" stroke="white" strokeWidth="0.7" />
          <circle cx="60" cy="140" r="70" fill="none" stroke="white" strokeWidth="1.0" />
          <line x1="0" y1="40" x2="900" y2="40" stroke="white" strokeWidth="0.4" />
          <line x1="0" y1="80" x2="900" y2="80" stroke="white" strokeWidth="0.4" />
          <line x1="0" y1="120" x2="900" y2="120" stroke="white" strokeWidth="0.4" />
          <polyline points="0,130 90,110 180,95 270,78 360,62 450,85 540,50 630,65 720,34 810,48 900,30" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <polygon points="0,130 90,110 180,95 270,78 360,62 450,85 540,50 630,65 720,34 810,48 900,30 900,160 0,160" fill="white" opacity={0.05} />
          <circle cx="540" cy="50" r="5" fill="white" opacity={0.75} />
          <circle cx="720" cy="34" r="5" fill="white" opacity={0.75} />
        </svg>
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.22)", boxShadow: "0 0 0 8px rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Users style={{ width: 22, height: 22, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "white", margin: 0, letterSpacing: "-0.01em" }}>Group Stays</h1>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.62)", margin: "2px 0 0" }}>Manage group accommodation bookings and requests</p>
          </div>
        </div>
      </div>
      <GroupStaysDashboard />
    </div>
  );
}


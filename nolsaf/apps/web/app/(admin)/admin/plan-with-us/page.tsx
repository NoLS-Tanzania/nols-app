"use client";
import { ClipboardList } from "lucide-react";
import PlanWithUsDashboard from "./dashboard/page";

export default function AdminPlanWithUsPage() {
  return (
    <div className="space-y-6">
      {/* Premium Banner */}
      <div style={{ position: "relative", borderRadius: "1.25rem", overflow: "hidden", background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #0f766e 100%)", boxShadow: "0 24px 60px -12px rgba(30,58,138,0.45), 0 8px 20px -8px rgba(15,118,110,0.35)", padding: "2rem 2rem 1.75rem" }}>
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.10, pointerEvents: "none" }} viewBox="0 0 900 160" preserveAspectRatio="xMidYMid slice">
          <circle cx="820" cy="30" r="100" fill="none" stroke="white" strokeWidth="1.2" />
          <circle cx="820" cy="30" r="60" fill="none" stroke="white" strokeWidth="0.7" />
          <circle cx="60" cy="140" r="75" fill="none" stroke="white" strokeWidth="1.0" />
          <line x1="0" y1="40" x2="900" y2="40" stroke="white" strokeWidth="0.35" />
          <line x1="0" y1="80" x2="900" y2="80" stroke="white" strokeWidth="0.35" />
          <line x1="0" y1="120" x2="900" y2="120" stroke="white" strokeWidth="0.35" />
          <polyline points="0,140 120,118 240,100 360,82 480,95 600,60 720,42 840,55 900,38" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <polygon points="0,140 120,118 240,100 360,82 480,95 600,60 720,42 840,55 900,38 900,160 0,160" fill="white" opacity={0.05} />
          <circle cx="600" cy="60" r="5" fill="white" opacity={0.75} />
          <circle cx="720" cy="42" r="5" fill="white" opacity={0.75} />
        </svg>
        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.25)", boxShadow: "0 0 0 8px rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ClipboardList style={{ width: 24, height: 24, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "white", margin: 0, letterSpacing: "-0.01em" }}>Plan with US</h1>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.60)", margin: "3px 0 0" }}>Manage custom trip planning requests and proposals</p>
          </div>
        </div>
      </div>
      <PlanWithUsDashboard />
    </div>
  );
}


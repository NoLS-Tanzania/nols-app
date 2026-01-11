/* eslint-disable react/forbid-dom-props */
/* CSS custom properties via style prop are required for dynamic color/shape transitions based on countdown timer */
"use client";
import { useState, useEffect, useMemo } from "react";
import { Zap } from "lucide-react";

export interface CountdownClockProps {
  /** Deadline date/time string (ISO format or Date parsable) */
  deadline: string | null;
  /** Maximum duration in milliseconds to calculate shape/color progression (default: 7 days) */
  maxDuration?: number;
  /** Show deadline info and full countdown breakdown below clock */
  showDetails?: boolean;
  /** Show "Hot Auction" badge (if showDetails is true) */
  isHot?: boolean;
  /** Clock size: 'sm' (120px), 'md' (160px), 'lg' (200px) */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
  /** Custom label for days display (default: 'DAYS' or 'TIME LEFT') */
  label?: string;
}

interface TimeRemaining {
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

/**
 * Reusable CountdownClock component with morphing shape and color transitions.
 * Automatically morphs from circle to rounded square and transitions colors
 * from blue → cyan → teal → amber → orange → red as time decreases.
 */
export function CountdownClock({
  deadline,
  maxDuration = 7 * 24 * 60 * 60 * 1000, // 7 days default
  showDetails = true,
  isHot = false,
  size = "md",
  className = "",
  label,
}: CountdownClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    if (!deadline) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  // Calculate time remaining
  const timeRemaining = useMemo((): TimeRemaining | null => {
    if (!deadline) return null;

    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - currentTime.getTime();

    if (diff <= 0) {
      return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { expired: false, days, hours, minutes, seconds, totalMs: diff };
  }, [deadline, currentTime]);

  // Don't render if no deadline or expired
  if (!deadline || !timeRemaining || timeRemaining.expired) {
    return null;
  }

  // Calculate shape and color progression
  const totalMs = timeRemaining.totalMs || 0;
  const timeRatio = Math.min(totalMs / maxDuration, 1);
  const shapeProgress = 1 - timeRatio;
  const borderRadius = 50 - shapeProgress * 35; // 50% (circle) to 15% (rounded square)

  // Size mapping
  const sizeMap = {
    sm: { container: "w-32 h-32", text: "text-2xl", label: "text-xs", detail: "text-base" },
    md: { container: "w-40 h-40", text: "text-3xl", label: "text-xs", detail: "text-lg" },
    lg: { container: "w-52 h-52", text: "text-4xl", label: "text-sm", detail: "text-xl" },
  };
  const sizes = sizeMap[size];

  // Color calculation based on time ratio
  const getColor = (type: "bg" | "border" | "text" | "glow") => {
    const opacity = type === "glow" ? 0.2 : 1;
    if (timeRatio < 0.2) {
      // Blue
      if (type === "bg") {
        return "rgb(219, 234, 254), rgb(191, 219, 254), rgb(147, 197, 253)";
      } else if (type === "border") {
        return "rgb(59, 130, 246)";
      } else if (type === "text") {
        return "rgb(30, 58, 138)";
      } else {
        return `rgba(59, 130, 246, ${opacity})`;
      }
    } else if (timeRatio < 0.4) {
      // Cyan
      if (type === "bg") {
        return "rgb(207, 250, 254), rgb(165, 243, 252), rgb(103, 232, 249)";
      } else if (type === "border") {
        return "rgb(6, 182, 212)";
      } else if (type === "text") {
        return "rgb(22, 78, 99)";
      } else {
        return `rgba(6, 182, 212, ${opacity})`;
      }
    } else if (timeRatio < 0.6) {
      // Teal
      if (type === "bg") {
        return "rgb(204, 251, 241), rgb(153, 246, 228), rgb(94, 234, 212)";
      } else if (type === "border") {
        return "rgb(20, 184, 166)";
      } else if (type === "text") {
        return "rgb(19, 78, 74)";
      } else {
        return `rgba(20, 184, 166, ${opacity})`;
      }
    } else if (timeRatio < 0.8) {
      // Amber
      if (type === "bg") {
        return "rgb(254, 243, 199), rgb(253, 230, 138), rgb(252, 211, 77)";
      } else if (type === "border") {
        return "rgb(245, 158, 11)";
      } else if (type === "text") {
        return "rgb(120, 53, 15)";
      } else {
        return `rgba(245, 158, 11, ${opacity})`;
      }
    } else if (timeRatio < 0.95) {
      // Orange
      if (type === "bg") {
        return "rgb(255, 237, 213), rgb(254, 215, 170), rgb(251, 146, 60)";
      } else if (type === "border") {
        return "rgb(249, 115, 22)";
      } else if (type === "text") {
        return "rgb(154, 52, 18)";
      } else {
        return `rgba(249, 115, 22, ${opacity})`;
      }
    } else {
      // Red (urgent)
      if (type === "bg") {
        return "rgb(254, 226, 226), rgb(254, 202, 202), rgb(252, 165, 165)";
      } else if (type === "border") {
        return "rgb(239, 68, 68)";
      } else if (type === "text") {
        return "rgb(127, 29, 29)";
      } else {
        return `rgba(239, 68, 68, ${opacity})`;
      }
    }
  };

  const isUrgent = timeRatio < 0.05; // Less than 5% of max duration remaining

  // Prepare CSS custom properties for dynamic styling
  const cssVars = {
    "--clock-border-radius": `${borderRadius}%`,
    "--clock-bg-gradient": `linear-gradient(to bottom right, ${getColor("bg")})`,
    "--clock-border-color": getColor("border"),
    "--clock-shadow-color": getColor("border").replace("rgb", "rgba").replace(")", ", 0.3)"),
    "--clock-shadow-color-light": getColor("border").replace("rgb", "rgba").replace(")", ", 0.2)"),
    "--clock-glow-color": getColor("glow"),
    "--clock-glow-opacity": isUrgent ? 0.75 : 0.5,
    "--clock-text-color": getColor("text"),
    "--clock-pattern-border": getColor("glow").replace("0.2", "0.3"),
    "--clock-hands-color": getColor("glow").replace("0.2", "0.4"),
  } as React.CSSProperties;

  return (
    /* eslint-disable-next-line react/forbid-dom-props */
    <div className={`relative ${className}`} style={cssVars}>
      {/* Digital Clock Container with Morphing Shape & Color */}
      <div className={`relative ${sizes.container} mx-auto border-4 transition-all duration-[2000ms] ease-in-out shadow-xl hover:scale-[1.02] clock-container`}>
        {/* Soft Glow Ring with Color Transition */}
        <div className="absolute -inset-1 transition-all duration-[2000ms] ease-in-out clock-glow-ring"></div>

        {/* Clock Face with Digital Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10">
          {/* Days Label with Color Transition */}
          <div className={`${sizes.label} font-bold uppercase tracking-widest mb-2 transition-colors duration-[2000ms] ease-in-out clock-text`}>
            {label || (timeRemaining.days > 0 ? "DAYS" : "TIME LEFT")}
          </div>

          {/* Main Countdown Display with Smooth Number Updates & Color Transition */}
          <div className={`font-mono font-black leading-none text-center transition-all duration-[2000ms] ease-in-out clock-text`}>
            {timeRemaining.days > 0 ? (
              <div className="relative">
                <div className={`${sizes.text} transition-all duration-700 ease-out transform hover:scale-105`}>
                  {String(timeRemaining.days).padStart(2, "0")}
                </div>
                <div className={`${sizes.label} mt-1 font-bold transition-opacity duration-300`}>D</div>
              </div>
            ) : (
              <div className="relative">
                <div className={`text-2xl transition-all duration-700 ease-out transform hover:scale-105`}>
                  {String(timeRemaining.hours).padStart(2, "0")}:
                  {String(timeRemaining.minutes).padStart(2, "0")}
                </div>
                <div className="text-xs mt-0.5 transition-all duration-500 ease-out">
                  :{String(timeRemaining.seconds || 0).padStart(2, "0")}
                </div>
              </div>
            )}
          </div>

          {/* Clock Icon Background Pattern with Very Slow Rotation & Morphing Shape */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border-2 transition-all duration-[2000ms] ease-in-out clock-pattern"></div>

          {/* Clock Hands (Decorative) with Very Slow Rotation & Color Transition */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 origin-top transition-all duration-[2000ms] ease-in-out clock-hands">
            <div className="w-0.5 h-5 bg-current rotate-12 clock-hand-hour"></div>
            <div className="w-0.5 h-7 bg-current -rotate-45 mt-0.5 clock-hand-minute"></div>
          </div>
        </div>

        {/* Soft Pulsing Ring with Color & Shape Transition */}
        <div className="absolute inset-0 transition-all duration-[2000ms] ease-in-out animate-pulse-soft clock-pulse-ring"></div>
      </div>

      {/* Deadline Info Below Clock */}
      {showDetails && (
        <>
          <div className="mt-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
            <div className={`${sizes.label} font-bold uppercase tracking-wider mb-1 transition-colors duration-[2000ms] ease-in-out clock-text`}>
              Closure Date
            </div>
            <div className={`text-sm font-bold transition-colors duration-[2000ms] ease-in-out clock-border-text`}>
              {new Date(deadline).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
            </div>
            <div className={`text-xs font-medium mt-1 transition-colors duration-[2000ms] ease-in-out clock-border-text`}>
              {Intl.DateTimeFormat().resolvedOptions().timeZone}{" "}
              ({new Date().toString().match(/([A-Z]+[+-][0-9]+)/)?.[1] || "GMT+0300"})
            </div>
            {isHot && (
              <div className="inline-flex items-center gap-1 px-3 py-1.5 mt-3 bg-orange-100 border-2 border-orange-400 rounded-full transition-all duration-500 hover:scale-105">
                <Zap className="h-3.5 w-3.5 text-orange-600 transition-opacity duration-500" />
                <span className="text-xs font-bold text-orange-900">Hot Auction</span>
              </div>
            )}
          </div>

          {/* Full Countdown Display */}
          <div className={`mt-4 grid grid-cols-4 gap-2 px-4 animate-in fade-in slide-in-from-bottom-3 delay-300 transition-colors duration-[2000ms] ease-in-out clock-border-text`}>
            <div className="text-center transform transition-all duration-500 ease-out hover:scale-105">
              <div
                className={`${sizes.detail} font-mono font-black transition-all duration-[2000ms] ease-in-out clock-text`}
                key={`days-${timeRemaining.days}`}
              >
                {String(timeRemaining.days).padStart(2, "0")}
              </div>
              <div className={`${sizes.label} font-bold uppercase mt-0.5 transition-opacity duration-300`}>Days</div>
            </div>
            <div className="text-center transform transition-all duration-500 ease-out hover:scale-105">
              <div
                className={`${sizes.detail} font-mono font-black transition-all duration-[2000ms] ease-in-out clock-text`}
                key={`hours-${timeRemaining.hours}`}
              >
                {String(timeRemaining.hours).padStart(2, "0")}
              </div>
              <div className={`${sizes.label} font-bold uppercase mt-0.5 transition-opacity duration-300`}>Hours</div>
            </div>
            <div className="text-center transform transition-all duration-500 ease-out hover:scale-105">
              <div
                className={`${sizes.detail} font-mono font-black transition-all duration-[2000ms] ease-in-out clock-text`}
                key={`minutes-${timeRemaining.minutes}`}
              >
                {String(timeRemaining.minutes).padStart(2, "0")}
              </div>
              <div className={`${sizes.label} font-bold uppercase mt-0.5 transition-opacity duration-300`}>Minutes</div>
            </div>
            <div className="text-center transform transition-all duration-500 ease-out hover:scale-105">
              <div
                className={`${sizes.detail} font-mono font-black transition-all duration-[2000ms] ease-in-out clock-text`}
                key={`seconds-${timeRemaining.seconds}`}
              >
                {String(timeRemaining.seconds || 0).padStart(2, "0")}
              </div>
              <div className={`${sizes.label} font-bold uppercase mt-0.5 transition-opacity duration-300`}>Seconds</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


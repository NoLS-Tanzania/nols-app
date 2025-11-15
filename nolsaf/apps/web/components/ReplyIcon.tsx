"use client";
import React, { useState, useCallback } from "react";
import { CornerDownLeft } from "lucide-react";

type Props = {
  href: string;
  label?: string;
  className?: string;
};

export default function ReplyIcon({ href, label = "Reply", className = "" }: Props) {
  const [revealed, setRevealed] = useState(false);

  const onClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    // Detect touch capability at click-time to avoid SSR/window issues.
    let isTouchDevice = false;
    try {
      isTouchDevice = typeof navigator !== "undefined" && !!(navigator.maxTouchPoints || (typeof window !== "undefined" && "ontouchstart" in window));
    } catch (err) {
      isTouchDevice = false;
    }

    // If on a touch device, first tap should reveal the label; second tap should follow the link
    if (isTouchDevice && !revealed) {
      e.preventDefault();
      setRevealed(true);
      return;
    }
    // Otherwise allow default navigation
  }, [revealed]);

  return (
    <a
      href={href}
      onClick={onClick}
      onFocus={() => setRevealed(true)}
      className={`inline-flex items-center gap-2 group no-underline hover:no-underline ${className}`}
      aria-label={label}
    >
        <span className="inline-flex items-center justify-center p-2 rounded bg-white border border-gray-200 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300">
        <CornerDownLeft className="h-4 w-4 text-gray-700 group-hover:text-blue-600" aria-hidden />
      </span>

      <span className={`hidden group-hover:inline-block group-focus:inline-block transition-opacity text-sm text-black no-underline ${revealed ? "inline-block" : ""}`}>
        {label}
      </span>
    </a>
  );
}

"use client";
import React, { useState, useCallback } from "react";
import { Eye } from "lucide-react";

type Props = {
  onClick: () => void;
  label?: string;
  className?: string;
};

export default function MarkReadButton({ onClick, label = "Mark as read", className = "" }: Props) {
  const [revealed, setRevealed] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    // detect touch at click time to avoid SSR/window issues
    let isTouch = false;
    try {
      isTouch = typeof navigator !== "undefined" && !!(navigator.maxTouchPoints || (typeof window !== "undefined" && "ontouchstart" in window));
    } catch (err) {
      isTouch = false;
    }

    if (isTouch && !revealed) {
      e.preventDefault();
      setRevealed(true);
      return;
    }

    onClick();
  }, [onClick, revealed]);

  return (
    <button
      type="button"
      onClick={handleClick}
      onFocus={() => setRevealed(true)}
      className={`inline-flex items-center gap-2 group no-underline hover:no-underline ${className}`}
      aria-label={label}
    >
      {/* Icon only -- no background box. Icon is black by default and turns blue on hover/focus or when revealed (touched). */}
      <span className={`inline-flex items-center justify-center ${revealed ? "text-blue-600" : "text-black"} group-hover:text-blue-600 group-focus:text-blue-600`}>
        <Eye className="h-4 w-4" aria-hidden />
      </span>

      <span className={`hidden group-hover:inline-block group-focus:inline-block transition-opacity text-sm text-black no-underline ${revealed ? "inline-block" : ""}`}>
        {label}
      </span>
    </button>
  );
}

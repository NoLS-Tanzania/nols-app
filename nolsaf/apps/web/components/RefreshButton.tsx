"use client";
import React from "react";
import { RefreshCw } from "lucide-react";

export default function RefreshButton({ className = "" }: { className?: string }) {
  const handleClick = () => {
    try {
      window.location.reload();
    } catch (err) {
      // fallback
      window.location.href = window.location.href;
    }
  };

  return (
    <button
      aria-label="Refresh"
      title="Refresh"
      onClick={handleClick}
      className={`inline-flex items-center justify-center p-2 rounded-md border border-gray-200 hover:bg-gray-50 ${className}`}
    >
      <RefreshCw className="h-5 w-5" />
    </button>
  );
}

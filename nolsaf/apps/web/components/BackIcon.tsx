"use client";
import Link from "next/link";
import React from "react";
import { ChevronLeft } from "lucide-react";

type Props = {
  href: string;
  label?: string; // label shown on hover
  className?: string;
};

export default function BackIcon({ href, label = "Back", className = "" }: Props) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 group no-underline hover:no-underline ${className}`}
      aria-label={label}
    >
      <span className="inline-flex items-center justify-center p-2 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-300">
        <ChevronLeft className="h-4 w-4 text-gray-700 group-hover:text-blue-600" aria-hidden />
      </span>

      {/* Reveal label on hover/focus for pointer & keyboard users */}
      <span className="hidden group-hover:inline-block group-focus:inline-block transition-opacity text-sm text-black no-underline">
        {label}
      </span>
    </Link>
  );
}

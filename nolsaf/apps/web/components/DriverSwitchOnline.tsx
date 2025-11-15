"use client";
import React from "react";
import { Power } from "lucide-react";

export default function DriverSwitchOnline({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full max-w-xs mx-auto ${className}`}>
      <div className={`flex items-start gap-3 px-3 py-2 rounded-md text-sm shadow-sm border border-green-100 bg-green-50`}>
        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-green-600 text-white`}>
          <Power className="h-4 w-4" />
        </div>
        <div className="flex-1 text-left">
          <div className="font-medium text-gray-900">You&apos;re now live — available to accept rides</div>
          <div className="mt-1 text-xs text-gray-700">Drive safely, keep your documents ready, and follow local traffic laws.</div>
        </div>
      </div>
    </div>
  );
}

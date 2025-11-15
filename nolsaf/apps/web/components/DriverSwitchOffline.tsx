"use client";
import React from "react";
import { Power } from "lucide-react";

export default function DriverSwitchOffline({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full max-w-xs mx-auto ${className}`}>
      <div className={`flex items-start gap-3 px-3 py-2 rounded-md text-sm shadow-sm border border-gray-100 bg-white`}>
        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-red-600 text-white`}>
          <Power className="h-4 w-4" />
        </div>
        <div className="flex-1 text-left">
          <div className="font-medium text-gray-900">You&apos;re now offline — you will not receive new ride assignments</div>
          <div className="mt-1 text-xs text-gray-700">Take a break, check your vehicle, and contact support if you need assistance.</div>
        </div>
      </div>
    </div>
  );
}

"use client";
import React from "react";
import DriverDashboard from "@/components/DriverDashboard";

export default function DriverPage() {
  return (
    <div className="w-full py-6 pr-2">
      <div className="max-w-4xl ml-2 md:ml-4 lg:ml-6 px-2 space-y-6">
        <div className="pr-2 border-r border-gray-100">
          <DriverDashboard />
        </div>
      </div>
    </div>
  );
}

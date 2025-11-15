"use client";
import React from "react";
import { FileText } from "lucide-react";

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col items-center text-center gap-2 py-3">
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-600">Overview of reports and analytics</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* center the inner report content */}
        <div className="w-full flex flex-col items-center text-center">{children}</div>
      </div>
    </div>
  );
}

"use client";
import AdminPageHeader from "@/components/AdminPageHeader";
import { ClipboardList } from "lucide-react";
import PlanWithUsDashboard from "./dashboard/page";

export default function AdminPlanWithUsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-4">
            <ClipboardList className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Plan with US</h1>
          <p className="mt-1 text-sm text-gray-600">Manage custom trip planning requests and proposals</p>
        </div>
      </div>
      <PlanWithUsDashboard />
    </div>
  );
}


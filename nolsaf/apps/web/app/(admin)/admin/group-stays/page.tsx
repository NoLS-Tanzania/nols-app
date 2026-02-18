"use client";
import { Users } from "lucide-react";
import GroupStaysDashboard from "./dashboard/page";

export default function AdminGroupStaysPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Group Stays</h1>
          <p className="mt-1 text-sm text-gray-600">Manage group accommodation bookings and requests</p>
        </div>
      </div>
      <GroupStaysDashboard />
    </div>
  );
}


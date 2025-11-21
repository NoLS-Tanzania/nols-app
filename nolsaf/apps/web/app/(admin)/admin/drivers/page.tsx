"use client";
import AdminPageHeader from "@/components/AdminPageHeader";
import { LayoutDashboard } from "lucide-react";
import DriversDashboard from "./dashboard/page";

export default function AdminDriversPage() {
  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader title="Drivers" icon={<LayoutDashboard className="h-8 w-8" />} />
      <DriversDashboard />
    </div>
  );
}

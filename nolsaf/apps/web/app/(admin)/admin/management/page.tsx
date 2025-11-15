import AdminPageHeader from "@/components/AdminPageHeader";
import { Settings } from "lucide-react";

export default function Page() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Management"
        subtitle="Administrative tools and controls"
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Management" }]}
        icon={<Settings className="h-5 w-5" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a href="/admin/management/settings" className="block rounded-lg border bg-white p-4 hover:shadow">
          <div className="text-lg font-medium">System Settings</div>
          <div className="text-sm text-gray-600 mt-2">Configure system-wide settings, integrations and feature flags.</div>
        </a>

        <a href="/admin/management/audit-log" className="block rounded-lg border bg-white p-4 hover:shadow">
          <div className="text-lg font-medium">Audit Log</div>
          <div className="text-sm text-gray-600 mt-2">View immutable audit trails of important system actions.</div>
        </a>

        <a href="/admin/management/reports" className="block rounded-lg border bg-white p-4 hover:shadow">
          <div className="text-lg font-medium">History</div>
          <div className="text-sm text-gray-600 mt-2">Run reports and view historical operational data (30/60/90 day views).</div>
        </a>
      </div>
    </div>
  );
}

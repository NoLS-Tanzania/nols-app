import AdminAnalyticsClient from "@/components/AdminAnalyticsClient";
import AdminPageHeader from "@/components/AdminPageHeader";
import Button from "@/components/ui/Button";

export default function Page() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Analytics"
        subtitle="Key KPIs and trends across the platform"
        breadcrumb={[
          { label: "Admin", href: "/admin" },
          { label: "Analytics" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Export CSV</Button>
          </div>
        }
      />
      <AdminAnalyticsClient />
    </div>
  );
}

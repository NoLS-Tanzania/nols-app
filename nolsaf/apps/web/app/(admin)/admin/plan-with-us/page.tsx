import { redirect } from "next/navigation";

export default function LegacyAdminPlanningPage() {
  redirect("/admin/agents/tour-bookings");
}

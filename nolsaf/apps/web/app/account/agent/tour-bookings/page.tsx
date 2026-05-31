import { redirect } from "next/navigation";

export default function AgentTourBookingsIndexPage() {
  // Tour bookings are managed in the unified agent bookings screen.
  redirect("/account/agent/bookings");
}

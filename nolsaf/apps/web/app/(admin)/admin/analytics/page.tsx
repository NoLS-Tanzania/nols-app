import { redirect } from "next/navigation";

export default function Page() {
  // Analytics UI removed — redirect users to Admin Home
  redirect("/admin/home");
}

import AdminManagementPageClient from "./AdminManagementPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return <AdminManagementPageClient />;
}

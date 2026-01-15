import { redirect } from "next/navigation";

export default function RegisterRedirectPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const role = typeof searchParams?.role === "string" ? searchParams.role : undefined;
  const ref = typeof searchParams?.ref === "string" ? searchParams.ref : undefined;

  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (ref) params.set("ref", ref);

  const qs = params.toString();
  redirect(`/account/register${qs ? `?${qs}` : ""}`);
}

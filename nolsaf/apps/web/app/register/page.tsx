import { redirect } from "next/navigation";

export default async function RegisterRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const role = typeof resolvedSearchParams?.role === "string" ? resolvedSearchParams.role : undefined;
  const ref = typeof resolvedSearchParams?.ref === "string" ? resolvedSearchParams.ref : undefined;

  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (ref) params.set("ref", ref);

  const qs = params.toString();
  redirect(`/account/register${qs ? `?${qs}` : ""}`);
}

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function safeNextPath(raw: string | null): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  if (!v) return undefined;
  if (!v.startsWith("/") || v.startsWith("//")) return undefined;
  return v;
}

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AccountLoginRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const nextRaw =
    typeof resolvedSearchParams?.next === "string"
      ? resolvedSearchParams.next
      : Array.isArray(resolvedSearchParams?.next)
        ? resolvedSearchParams?.next[0]
        : null;
  const roleRaw =
    typeof resolvedSearchParams?.role === "string"
      ? resolvedSearchParams.role
      : Array.isArray(resolvedSearchParams?.role)
        ? resolvedSearchParams?.role[0]
        : undefined;
  const refRaw =
    typeof resolvedSearchParams?.ref === "string"
      ? resolvedSearchParams.ref
      : Array.isArray(resolvedSearchParams?.ref)
        ? resolvedSearchParams?.ref[0]
        : undefined;

  const nextPath = safeNextPath(nextRaw);
  const role = roleRaw?.trim() || undefined;
  const ref = refRaw?.trim() || undefined;

  const params = new URLSearchParams();
  params.set("mode", "login");
  if (nextPath) params.set("next", nextPath);
  if (role) params.set("role", role);
  if (ref) params.set("ref", ref);

  const qs = params.toString();
  redirect(`/account/register${qs ? `?${qs}` : ""}`);
}

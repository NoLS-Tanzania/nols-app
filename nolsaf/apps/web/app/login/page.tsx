import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

function safeNextPath(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  if (!v) return undefined;
  // Only allow same-site relative paths (avoid open redirects)
  if (!v.startsWith("/") || v.startsWith("//")) return undefined;
  return v;
}

export default async function LoginRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const next = safeNextPath(sp?.next);
  const role = typeof sp?.role === "string" ? sp.role : undefined;
  const ref = typeof sp?.ref === "string" ? sp.ref : undefined;

  const params = new URLSearchParams();
  params.set("mode", "login");
  if (next) params.set("next", next);
  if (role) params.set("role", role);
  if (ref) params.set("ref", ref);

  const qs = params.toString();
  redirect(`/account/register${qs ? `?${qs}` : ""}`);
}

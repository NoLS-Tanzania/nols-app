import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function safeNextPath(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  if (!v) return undefined;
  if (!v.startsWith("/") || v.startsWith("//")) return undefined;
  return v;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const next = safeNextPath(sp?.next) ?? "/admin/home";

  const params = new URLSearchParams();
  params.set("mode", "login");
  params.set("role", "admin");
  params.set("next", next);

  redirect(`/account/register?${params.toString()}`);
}

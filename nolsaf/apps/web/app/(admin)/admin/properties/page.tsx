import { redirect } from "next/navigation";

export default async function AdminPropertiesRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedSearchParams ?? {})) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v !== undefined) sp.append(key, v);
      }
    } else {
      sp.set(key, value);
    }
  }

  const qs = sp.toString();
  redirect(qs ? `/admin/properties/previews?${qs}` : "/admin/properties/previews");
}

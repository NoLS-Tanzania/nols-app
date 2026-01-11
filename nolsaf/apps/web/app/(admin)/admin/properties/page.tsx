import { redirect } from "next/navigation";

export default function AdminPropertiesRedirectPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
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

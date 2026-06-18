import type { MetadataRoute } from "next";
import { SITE_URL, destinationSeoRoutes, publicSeoRoutes } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let propertyRoutes: MetadataRoute.Sitemap = [];
  let tourPackageRoutes: MetadataRoute.Sitemap = [];

  try {
    const apiBase =
      process.env.API_ORIGIN ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:4000";

    const res = await fetch(
      `${apiBase}/api/public/properties?page=1&pageSize=500&status=APPROVED`,
      { next: { revalidate: 3600 } }
    );

    if (res.ok) {
      const json = await res.json();
      const properties: Array<{ slug: string; updatedAt?: string }> =
        json?.properties ?? json?.items ?? json?.data ?? [];

      propertyRoutes = properties
        .filter((p) => p.slug)
        .map((p) => ({
          url: `${SITE_URL}/public/properties/${p.slug}`,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.85,
        }));
    }
  } catch {
    // Static routes still serve when the API is not reachable during build.
  }

  try {
    const apiBase =
      process.env.API_ORIGIN ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:4000";

    const res = await fetch(`${apiBase}/api/public/tour-packages?page=1&pageSize=500`, {
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const json = await res.json();
      const packages: Array<{ id?: number | string; slug?: string; updatedAt?: string }> =
        json?.items ?? json?.packages ?? json?.data ?? [];

      tourPackageRoutes = packages
        .filter((pkg) => pkg.slug || pkg.id)
        .map((pkg) => ({
          url: `${SITE_URL}/public/tour-packages${pkg.slug ? `?package=${pkg.slug}` : `?packageId=${pkg.id}`}`,
          lastModified: pkg.updatedAt ? new Date(pkg.updatedAt) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        }));
    }
  } catch {
    // Keep sitemap resilient.
  }

  return [...publicSeoRoutes, ...destinationSeoRoutes, ...propertyRoutes, ...tourPackageRoutes];
}

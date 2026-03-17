import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://nolsaf.com";

// Static public routes
const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/public`,              lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
  { url: `${SITE_URL}/public/properties`,   lastModified: new Date(), changeFrequency: "hourly",  priority: 0.9 },
  { url: `${SITE_URL}/public/countries`,    lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
  { url: `${SITE_URL}/public/group-stays`,  lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
  { url: `${SITE_URL}/public/plan-with-us`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${SITE_URL}/about/who`,           lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${SITE_URL}/about/what`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${SITE_URL}/about/story`,         lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${SITE_URL}/help`,                lastModified: new Date(), changeFrequency: "weekly",  priority: 0.6 },
  { url: `${SITE_URL}/terms`,               lastModified: new Date("2026-01-01"), changeFrequency: "yearly", priority: 0.4 },
  { url: `${SITE_URL}/privacy`,             lastModified: new Date("2026-01-01"), changeFrequency: "yearly", priority: 0.4 },
  { url: `${SITE_URL}/cookies-policy`,      lastModified: new Date("2026-01-01"), changeFrequency: "yearly", priority: 0.3 },
  { url: `${SITE_URL}/cancellation-policy`, lastModified: new Date("2026-01-01"), changeFrequency: "yearly", priority: 0.4 },
  { url: `${SITE_URL}/disbursement-policy`, lastModified: new Date("2026-01-01"), changeFrequency: "yearly", priority: 0.3 },
  { url: `${SITE_URL}/verification-policy`, lastModified: new Date("2026-01-01"), changeFrequency: "yearly", priority: 0.3 },
  { url: `${SITE_URL}/property-owner-disbursement-policy`, lastModified: new Date("2026-01-01"), changeFrequency: "yearly", priority: 0.3 },
  { url: `${SITE_URL}/driver-disbursement-policy`,         lastModified: new Date("2026-01-01"), changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let propertyRoutes: MetadataRoute.Sitemap = [];

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
        json?.properties ?? json?.data ?? [];

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
    // Silently skip — static routes still serve
  }

  return [...STATIC_ROUTES, ...propertyRoutes];
}

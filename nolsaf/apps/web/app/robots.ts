import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://nolsaf.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Full public access for all crawlers
        userAgent: "*",
        allow: [
          "/",
          "/public/",
          "/about/",
          "/terms",
          "/privacy",
          "/cookies-policy",
          "/cancellation-policy",
          "/disbursement-policy",
          "/property-owner-disbursement-policy",
          "/driver-disbursement-policy",
          "/verification-policy",
          "/help/",
        ],
        disallow: [
          // Authenticated portals — never index
          "/admin/",
          "/owner/",
          "/driver/",
          // Auth flows
          "/account/",
          "/login",
          "/register",
          // Internal API
          "/api/",
          // Version page
          "/version",
          // Legal docs portal
          "/docs/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

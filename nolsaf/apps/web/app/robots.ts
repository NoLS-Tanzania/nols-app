import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/public/",
          "/tourism/",
          "/services/",
          "/about/",
          "/help/",
          "/updates/",
          "/careers",
          "/terms",
          "/privacy",
          "/cookies-policy",
          "/cancellation-policy",
          "/disbursement-policy",
          "/property-owner-disbursement-policy",
          "/driver-disbursement-policy",
          "/verification-policy",
          "/stay-safe",
          "/security",
        ],
        disallow: [
          "/admin/",
          "/owner/",
          "/driver/",
          "/account/",
          "/login",
          "/register",
          "/api/",
          "/version",
          "/docs/",
          "/maintenance",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

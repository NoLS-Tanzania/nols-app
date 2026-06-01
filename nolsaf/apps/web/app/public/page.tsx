import type { Metadata } from "next";
import { SITE_URL, seoKeywords } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Tanzania Tourism, Verified Stays, Tours & Transport",
  description:
    "Discover verified accommodation, Tanzania tour packages, airport transfers, group stays, travel planning and NoLScope cost estimates across Tanzania and East Africa.",
  keywords: seoKeywords,
  alternates: { canonical: `${SITE_URL}/public` },
  openGraph: {
    type: "website",
    title: "NoLSAF | Tanzania Tourism, Verified Stays, Tours & Transport",
    description:
      "Verified stays, tours, airport transfers, group accommodation and travel planning in one tourism platform built for Africa.",
    url: `${SITE_URL}/public`,
    images: [{ url: `${SITE_URL}/og-default.jpg`, width: 1200, height: 630, alt: "NoLSAF tourism services" }],
  },
};

export { default } from "./PublicHomeClient";

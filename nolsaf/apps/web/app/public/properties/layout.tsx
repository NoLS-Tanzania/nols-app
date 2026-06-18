import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_URL, seoKeywords } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Verified Accommodation in Tanzania & East Africa",
  description:
    "Search verified hotels, lodges, apartments, villas and guest houses across Tanzania and East Africa. Compare location, amenities, price and transport options on NoLSAF.",
  keywords: [
    "verified accommodation Tanzania",
    "hotel booking Tanzania",
    "Zanzibar accommodation",
    "Dar es Salaam hotels",
    "Arusha lodges",
    "East Africa accommodation",
    ...seoKeywords,
  ],
  alternates: { canonical: `${SITE_URL}/public/properties` },
  openGraph: {
    title: "Verified Accommodation in Tanzania & East Africa | NoLSAF",
    description: "Find and book verified hotels, lodges, apartments and guest houses across Tanzania.",
    url: `${SITE_URL}/public/properties`,
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NoLSAF | Quality Stay for Every Wallet",
  description:
    "Discover verified accommodation, book airport transfers, and plan end-to-end stays across Tanzania and East Africa. NoLSAF connects travellers, property owners and drivers.",
  alternates: { canonical: "https://nolsaf.com/public" },
  openGraph: {
    type: "website",
    title: "NoLSAF | Quality Stay for Every Wallet",
    description:
      "Verified stays, seamless transport and flexible payments — all in one platform built for Africa.",
    url: "https://nolsaf.com/public",
    images: [{ url: "https://nolsaf.com/og-default.jpg", width: 1200, height: 630, alt: "NoLSAF" }],
  },
};

export { default } from "./PublicHomeClient";

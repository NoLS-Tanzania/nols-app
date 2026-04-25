// apps/web/app/layout.tsx

import "@/styles/globals.css";
import "@/styles/property-visualization.css";
import { Suspense, type ReactNode } from "react";
import Script from "next/script";
import type { Metadata } from "next";
import ToastContainer from "../components/ToastContainer";
import SuspendedAccessOverlay from "../components/SuspendedAccessOverlay";
import MobilePublicNav from "../components/MobilePublicNav";
import CookieConsent from "../components/CookieConsent";
import GlobalAlertGuard from "../components/GlobalAlertGuard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://nolsaf.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NoLSAF | Quality Stay for Every Wallet",
    template: "%s | NoLSAF",
  },
  description:
    "NoLSAF is East Africa's verification-first travel platform — discover verified accommodation, book transport, and plan end-to-end stays across Tanzania and beyond.",
  keywords: [
    "accommodation Tanzania",
    "hotel booking Tanzania",
    "Dar es Salaam hotels",
    "Zanzibar accommodation",
    "East Africa travel",
    "NoLSAF",
    "verified stays",
    "group stays Tanzania",
    "airport transfer Tanzania",
  ],
  openGraph: {
    type: "website",
    siteName: "NoLSAF",
    title: "NoLSAF | Quality Stay for Every Wallet",
    description:
      "Verified accommodation, seamless transport and flexible payments — all in one platform built for Africa.",
    url: SITE_URL,
    images: [
      {
        url: `${SITE_URL}/og-default.jpg`,
        width: 1200,
        height: 630,
        alt: "NoLSAF — Quality Stay for Every Wallet",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NoLSAF | Quality Stay for Every Wallet",
    description:
      "Verified accommodation, seamless transport and flexible payments — built for Africa.",
    images: [`${SITE_URL}/og-default.jpg`],
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png", sizes: "64x64" }],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

/**
 * Root shell: keep it neutral (no role header, no sidebars).
 * Child segment layouts (/admin, /owner) will render their own header/sidebar.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* suppressHydrationWarning on <body> prevents browser-extension text/attribute
           injection (Grammarly, LastPass, etc.) from throwing React error #418. */}
      <body suppressHydrationWarning>
        <GlobalAlertGuard />
        {process.env.NODE_ENV !== "production" && (
          <Script id="performance-measure-guard" strategy="beforeInteractive">
            {`
(() => {
  try {
    if (typeof performance === 'undefined' || typeof performance.measure !== 'function') return;
    const original = performance.measure.bind(performance);
    performance.measure = function(name, optionsOrStart, end) {
      try {
        if (optionsOrStart && typeof optionsOrStart === 'object') {
          const opts = optionsOrStart;
          if ('end' in opts || 'start' in opts) {
            const normalized = { ...opts };
            if (typeof normalized.start === 'number' && normalized.start < 0) normalized.start = 0;
            if (typeof normalized.end === 'number' && normalized.end < 0) normalized.end = 0;
            return original(name, normalized);
          }
        }
        return original(name, optionsOrStart, end);
      } catch {
        return;
      }
    };
  } catch {
    // ignore
  }
})();
            `}
          </Script>
        )}
        <div className="min-h-screen bg-neutral-50 pb-16 md:pb-0">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
        <Suspense fallback={null}>
          <SuspendedAccessOverlay />
        </Suspense>
        <ToastContainer />
        <Suspense fallback={null}>
          <MobilePublicNav />
        </Suspense>
        <CookieConsent />
      </body>
    </html>
  );
}

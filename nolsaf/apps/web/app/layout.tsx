// apps/web/app/layout.tsx

import "@/styles/globals.css";
import "@/styles/property-visualization.css";
import { Suspense, type ReactNode } from "react";
import Script from "next/script";
import ToastContainer from "../components/ToastContainer";

/**
 * Root shell: keep it neutral (no role header, no sidebars).
 * Child segment layouts (/admin, /owner) will render their own header/sidebar.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
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
        <div className="min-h-screen bg-neutral-50">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
        <ToastContainer />
      </body>
    </html>
  );
}

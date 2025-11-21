// apps/web/app/layout.tsx

import "@/styles/globals.css";
import type { ReactNode } from "react";
import ToastContainer from "@/components/ToastContainer";

/**
 * Root shell: keep it neutral (no role header, no sidebars).
 * Child segment layouts (/admin, /owner) will render their own header/sidebar.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-neutral-50">
          {children}
        </div>
        <ToastContainer />
      </body>
    </html>
  );
}

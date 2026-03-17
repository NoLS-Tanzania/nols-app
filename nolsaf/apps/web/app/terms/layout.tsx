import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the NoLSAF Terms of Service — your rights and obligations when using our accommodation, transport, and planning platform across East Africa.",
  openGraph: {
    title: "Terms of Service | NoLSAF",
    description: "Read the NoLSAF Terms of Service governing accommodation bookings, transport, payments, and use of the platform.",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

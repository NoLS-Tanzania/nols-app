import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description:
    "Read NoLSAF's cancellation and refund policy — free cancellation windows, partial refunds, group stays, and exceptional circumstances.",
  openGraph: {
    title: "Cancellation Policy | NoLSAF",
    description: "NoLSAF cancellation terms: free cancellation periods, refund timelines, group bookings, and dispute procedures.",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

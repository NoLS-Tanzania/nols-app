import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Travel Cost Estimator",
  description: "Use NoLSAF's direct booking and cost-estimation tools for travel across East Africa.",
  openGraph: {
    title: "Travel Cost Estimator | NoLSAF",
    description: "Estimate trip costs and move toward direct NoLSAF bookings without custom request forms.",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

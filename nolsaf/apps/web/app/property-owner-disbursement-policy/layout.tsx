import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Property Owner Disbursement Policy",
  description:
    "NoLSAF's disbursement policy for Property Owners — payout schedules, commission rates, refund deductions, and earnings management.",
  openGraph: {
    title: "Property Owner Disbursement Policy | NoLSAF",
    description: "How NoLSAF pays Property Owners — payout schedules, commission structure, and dispute resolution.",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

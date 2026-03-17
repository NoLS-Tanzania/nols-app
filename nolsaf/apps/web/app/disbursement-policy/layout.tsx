import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Disbursement Policy",
  description:
    "NoLSAF disbursement policy — how payments are processed and paid out to Property Owners and Drivers registered on the platform.",
  openGraph: {
    title: "Disbursement Policy | NoLSAF",
    description: "How NoLSAF processes payouts to Property Owners and Drivers — schedules, commissions, and dispute resolution.",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

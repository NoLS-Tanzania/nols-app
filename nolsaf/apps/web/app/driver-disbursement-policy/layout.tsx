import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Driver Disbursement Policy",
  description:
    "NoLSAF's disbursement policy for Drivers — trip earnings, payout schedules, commission rates, and account management.",
  openGraph: {
    title: "Driver Disbursement Policy | NoLSAF",
    description: "How NoLSAF pays Drivers — earnings calculation, payout timelines, commissions, and dispute resolution.",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

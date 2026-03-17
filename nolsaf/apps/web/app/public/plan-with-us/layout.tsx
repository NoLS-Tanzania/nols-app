import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Plan With Us",
  description:
    "Let NoLSAF help plan your next trip — group travel, corporate stays, event logistics, and end-to-end journey planning across East Africa.",
  openGraph: {
    title: "Plan With Us | NoLSAF",
    description: "Need help planning? Submit your travel request and NoLSAF's team will coordinate accommodation, transport, and logistics for your group or event.",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

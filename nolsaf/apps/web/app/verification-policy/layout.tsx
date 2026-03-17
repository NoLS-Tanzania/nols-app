import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Verification Policy",
  description:
    "Learn how NoLSAF verifies properties — physical site visits, documentation review, GIS location validation, and continuous monitoring standards.",
  openGraph: {
    title: "Verification Policy | NoLSAF",
    description: "NoLSAF's property verification process: site visits, documentation, safety standards, and quality criteria.",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

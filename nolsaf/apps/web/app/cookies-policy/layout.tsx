import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Cookies Policy",
  description:
    "Understand how NoLSAF uses cookies and similar tracking technologies to improve your experience on the platform.",
  openGraph: {
    title: "Cookies Policy | NoLSAF",
    description: "How NoLSAF uses cookies — types, purpose, duration, and how you can manage your preferences.",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

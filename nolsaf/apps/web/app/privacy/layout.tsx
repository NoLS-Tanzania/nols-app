import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how NoLSAF collects, uses, and protects your personal data in accordance with applicable data protection laws.",
  openGraph: {
    title: "Privacy Policy | NoLSAF",
    description: "How NoLSAF handles your personal data — collection, usage, storage, and your rights as a user.",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

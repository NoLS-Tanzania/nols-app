import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Help Centre",
  description:
    "Get answers about NoLSAF — bookings, payments, account setup, driver tools, owner guides, refunds, and more.",
  openGraph: {
    title: "Help Centre | NoLSAF",
    description: "Everything you need to know about using NoLSAF — from booking your first stay to managing your property or driving.",
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

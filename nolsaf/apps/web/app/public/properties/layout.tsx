import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Browse Properties",
  description:
    "Search and filter verified hotels, apartments, and guesthouses across Tanzania and East Africa. Book with confidence on NoLSAF.",
  openGraph: {
    title: "Browse Properties | NoLSAF",
    description: "Find and book verified accommodation across Tanzania — filter by location, price, amenities, and property type.",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

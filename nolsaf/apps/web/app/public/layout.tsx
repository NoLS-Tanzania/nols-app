import type { ReactNode } from "react";
import PublicHeader from "@/components/PublicHeader";
import SiteFooter from "@/components/SiteFooter";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicHeader />
      {children}
      <SiteFooter withRail={false} />
    </>
  );
}

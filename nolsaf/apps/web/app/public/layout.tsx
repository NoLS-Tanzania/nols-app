"use client";

import type { ReactNode } from "react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import FloatingChatWidget from "@/components/FloatingChatWidget";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicHeader />
      {children}
      <PublicFooter withRail={false} />
      <FloatingChatWidget position="bottom-right" />
    </>
  );
}

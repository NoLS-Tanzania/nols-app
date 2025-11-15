"use client";
import React from "react";
import { usePathname } from "next/navigation";
import DriverWelcome from "@/components/DriverWelcome";
import { ListChecks, FileText, Gift, Lock } from "lucide-react";
import type { PageHeaderProps } from "@/components/ui/PageHeader";

export type DriverPageHeaderProps = Omit<PageHeaderProps, "variant"> & {
  /** Optional short title to render beside the icon for compact pages */
  title?: string;
};

// Render the full DriverWelcome (which includes the availability switch and map)
// only on the main Dashboard route (/driver). For other driver pages render a
// compact placeholder header to preserve spacing but avoid exposing the online/offline
// toggle outside of the Dashboard view.
export default function DriverPageHeader(props?: DriverPageHeaderProps): JSX.Element {
  const { title } = props || {};
  const pathname = usePathname() || "/";

  // Normalize trailing slash: treat '/driver' and '/driver/' the same
  const normalized = pathname.replace(/\/+$/, "");

  if (normalized === "/driver") {
    return <DriverWelcome />;
  }

  // Compact header for non-dashboard driver pages. Choose an icon based on route
  // Use the same Gift icon as the sidebar for the driver bonus page to keep UI consistent.
  const Icon = normalized.startsWith("/driver/security")
    ? Lock
    : normalized.startsWith("/driver/bonus")
    ? Gift
    : normalized.startsWith("/driver/invoices")
    ? FileText
    : ListChecks;

  return (
    <div className="py-6 text-center">
      <div className="inline-flex items-center justify-center gap-3">
        <div className="p-2 rounded-full bg-transparent inline-flex items-center justify-center">
          <Icon className="h-8 w-8 text-gray-800" aria-hidden />
        </div>
        {title ? (
          <h1 className="text-xl font-semibold">{title}</h1>
        ) : (
          <span className="sr-only">Driver</span>
        )}
      </div>
    </div>
  );
}

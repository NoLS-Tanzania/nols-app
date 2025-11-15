import * as React from "react";
import PageHeader, { type PageHeaderProps } from "@/components/ui/PageHeader";

export type OwnerPageHeaderProps = Omit<PageHeaderProps, "variant">;

export default function OwnerPageHeader(props: OwnerPageHeaderProps) {
  // Owners lean toward "info" rails by default to visually distinguish from admin
  return <PageHeader variant="info" {...props} />;
}

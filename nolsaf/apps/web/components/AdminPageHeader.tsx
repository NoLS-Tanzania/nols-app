import * as React from "react";
import PageHeader, {
  type PageHeaderProps,
  type PageHeaderVariant,
} from "@/components/ui/PageHeader";

export interface AdminPageHeaderProps extends Omit<PageHeaderProps, "variant"> {
  variant?: PageHeaderVariant;
}

export default function AdminPageHeader({ variant = "brand", ...props }: AdminPageHeaderProps) {
  return <PageHeader variant={variant} {...props} />;
}

import * as React from "react";
import { twMerge } from "tailwind-merge";

export type PageHeaderVariant = "brand" | "info" | "success" | "danger";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumb?: BreadcrumbItem[];
  variant?: PageHeaderVariant;
  className?: string;
}

const railClass: Record<PageHeaderVariant, string> = {
  brand: "rail-brand",
  info: "rail-info",
  success: "rail-success",
  danger: "rail-danger",
};

export default function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  breadcrumb,
  variant = "brand",
  className,
}: PageHeaderProps) {
  return (
    <section className={twMerge("card stat-card", railClass[variant], className)}>
      <div className="stat-body">
        {/* Breadcrumbs */}
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="mb-2 text-xs text-gray-500" aria-label="Breadcrumb">
            {breadcrumb.map((b, i) => (
              <span key={i}>
                {b.href ? (
                  <a href={b.href} className="link">
                    {b.label}
                  </a>
                ) : (
                  <span>{b.label}</span>
                )}
                {i < breadcrumb.length - 1 && <span className="mx-1">/</span>}
              </span>
            ))}
          </nav>
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="stat-icon flex-shrink-0 flex items-center">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-gray-600 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
        </div>
      </div>
    </section>
  );
}

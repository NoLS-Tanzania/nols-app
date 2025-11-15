"use client";
import { usePathname } from "next/navigation";

export default function MiniAnalyticsNav() {
  const path = usePathname();
  const link = (href: string, label: string) => (
    <a href={href}
       className={`px-3 py-1.5 rounded border text-sm ${path === href ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white hover:bg-gray-50 border-gray-200 text-gray-700"}`}>
      {label}
    </a>
  );
  return (
    <div className="flex flex-wrap gap-2">
  {link("/admin", "Overview")}
      {link("/admin/properties", "Properties")}
      {link("/admin/owners", "Owners")}
      {link("/admin/revenue", "Revenue")}
      {/* Extend with more quick filters/sections later */}
    </div>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Calendar, LineChart, Wallet, Settings } from "lucide-react";

type Item = {
  href: string;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const items: Item[] = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/owners", label: "Owners", Icon: Users },
  { href: "/admin/bookings", label: "Bookings", Icon: Calendar },
  { href: "/admin/revenue", label: "Revenues", Icon: LineChart },
  { href: "/admin/payments", label: "Payments", Icon: Wallet },
  { href: "/admin/management", label: "Management", Icon: Settings },
];

export default function AdminNav({ variant = "light" }: { variant?: "light" | "dark" }) {
  const path = usePathname();
  const base = "flex items-center gap-2 rounded px-3 py-2 text-sm";
  const active = variant === "dark" ? "bg-white/15 text-white" : "bg-emerald-50 text-emerald-700";
  const idle = variant === "dark" ? "hover:bg-white/10 text-white/90" : "hover:bg-gray-50 text-gray-700";

  return (
    <nav className="space-y-1">
      {items.map(({ href, label, Icon }) => {
        const isActive = (path ?? "").startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`${base} ${isActive ? active : idle}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

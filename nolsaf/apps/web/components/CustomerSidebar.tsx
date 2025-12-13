"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Calendar, Car, Users, Settings, LogOut } from "lucide-react";

export default function CustomerSidebar() {
  const pathname = usePathname();

  const menuItems = [
    {
      href: "/account",
      label: "My Account",
      icon: User,
      exact: true,
    },
    {
      href: "/account/bookings",
      label: "My Bookings",
      icon: Calendar,
    },
    {
      href: "/account/rides",
      label: "My Rides",
      icon: Car,
    },
    {
      href: "/account/group-stays",
      label: "My Group Stay",
      icon: Users,
    },
    {
      href: "/account/security",
      label: "Settings",
      icon: Settings,
    },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="space-y-1">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              active
                ? "bg-emerald-600 text-white font-medium"
                : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <div className="pt-4 mt-4 border-t border-slate-200">
        <Link
          href="/login"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors"
          onClick={() => {
            if (typeof window !== "undefined") {
              localStorage.removeItem("token");
            }
          }}
        >
          <LogOut className="w-5 h-5" />
          <span>Sign out</span>
        </Link>
      </div>
    </nav>
  );
}

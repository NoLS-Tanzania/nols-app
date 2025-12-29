"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Calendar, Car, Users, Settings, ChevronRight, ClipboardList } from "lucide-react";

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
      href: "/account/event-plans",
      label: "My Event Plan",
      icon: ClipboardList,
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
    <nav className="space-y-1.5">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
              active
                ? "bg-[#02665e] text-white shadow-sm shadow-[#02665e]/20"
                : "text-slate-700 hover:bg-[#02665e]/8 hover:text-[#02665e]"
            }`}
          >
            <Icon 
              className={`w-5 h-5 transition-transform duration-200 ${active ? '' : 'group-hover:scale-110'}`}
              strokeWidth={active ? 2.5 : 2}
            />
            <span className="flex-1">{item.label}</span>
            {active && (
              <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
            )}
            {!active && (
              <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-[-4px] group-hover:translate-x-0" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AboutNavItem = { href: string; label: string };

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export default function AboutNav({ items }: { items: readonly AboutNavItem[] }) {
  const pathname = normalizePath(usePathname() ?? "");

  return (
    <ul className="m-0 list-none p-0 flex flex-wrap justify-start sm:justify-end gap-2">
      {items.map((item) => {
        const href = normalizePath(item.href);
        const isActive = pathname === href;

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={classNames(
                "inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium no-underline ring-1 backdrop-blur-sm transition-colors duration-200 hover:no-underline",
                isActive
                  ? "bg-brand-500/28 text-white ring-brand-300/45"
                  : "bg-white/6 text-white/80 ring-white/10 hover:bg-brand-500/15 hover:text-white hover:ring-brand-300/30 active:bg-brand-500/20"
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

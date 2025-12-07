"use client";
import React from "react";

export type ArticleItem = {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
};

type Props = {
  title?: string;
  items: ArticleItem[];
  className?: string;
  compact?: boolean;
};

export default function Articles({ title = "Related Articles", items, className = "", compact = true }: Props) {
  const gridClass = compact ? "grid sm:grid-cols-2 gap-2" : "grid md:grid-cols-3 gap-3";
  return (
    <section className={`text-left ${className}`}>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <div className={`mt-3 ${gridClass}`}>
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <a
              key={idx}
              href={item.href}
              className="group no-underline inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm hover:shadow transition"
            >
              {Icon ? <Icon className="h-4 w-4 text-indigo-600" /> : <span aria-hidden className="h-4 w-4" />}
              <span className="font-medium">{item.title}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

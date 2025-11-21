"use client";
import React from "react";

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  onClick?: () => void;
  color?: "violet" | "emerald" | "rose" | "sky" | "blue" | "amber" | "purple";
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  size?: "sm" | "md";
};

export default function StatCard({ label, value, hint, href, onClick, color = "blue", Icon, size = "md" }: StatCardProps) {
  const accent: Record<string, { bar: string; icon: string; value: string; }> = {
    violet:  { bar: "from-violet-500 to-fuchsia-600", icon: "text-violet-600",  value: "text-violet-600" },
    emerald: { bar: "from-emerald-600 to-green-600",  icon: "text-emerald-600", value: "text-emerald-600" },
    rose:    { bar: "from-rose-600 to-red-600",       icon: "text-rose-600",    value: "text-rose-600" },
    sky:     { bar: "from-sky-500 to-cyan-600",       icon: "text-sky-600",     value: "text-sky-600" },
    blue:    { bar: "from-blue-600 to-indigo-600",    icon: "text-blue-600",    value: "text-blue-600" },
    amber:   { bar: "from-amber-400 to-amber-500",   icon: "text-amber-600",   value: "text-amber-600" },
    purple:  { bar: "from-purple-500 to-violet-600", icon: "text-purple-600",  value: "text-purple-600" },
  };

  const valueClass = size === "sm" ? "mt-2 text-2xl font-semibold" : "mt-2 text-3xl font-semibold";
  const labelClass = size === "sm" ? "text-base font-medium text-gray-700" : "text-lg font-medium text-gray-800";

  const Inner = (
    <div
      className="relative card overflow-hidden text-left transition shadow-card hover:shadow-lg hover:-translate-y-0.5"
      onClick={href ? undefined : onClick}
      role="button"
      aria-label={label}
    >
      <div className={`absolute left-0 inset-y-0 w-2 rounded-l-xl bg-gradient-to-b ${accent[color].bar}`} />

      <div className="card-section pl-4">
        <div className="flex items-start gap-3">
          <div className={`h-8 w-8 rounded-lg bg-gray-50 border flex items-center justify-center ${accent[color].icon}`}>
            {Icon ? <Icon aria-hidden="true" className="h-3 w-3" /> : null}
          </div>
          <div className="flex-1">
            <div className={labelClass}>{label}</div>
            <div className={`${valueClass} ${accent[color].value}`}>{value}</div>
            {hint && <div className="mt-2 text-xs text-gray-500">{hint}</div>}
          </div>
        </div>
      </div>
    </div>
  );

  return href ? (
    <a href={href} className="block no-underline">{Inner}</a>
  ) : (
    <button type="button" className="btn-none w-full text-left">{Inner}</button>
  );
}

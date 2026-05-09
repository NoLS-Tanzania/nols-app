"use client";

type FooterBridgeVariant = "public" | "portal" | "plain";

type FooterBridgeProps = {
  variant?: FooterBridgeVariant;
  className?: string;
};

const variantClass: Record<FooterBridgeVariant, string> = {
  public:
    "from-slate-50 via-white to-slate-950/0 before:bg-gradient-to-r before:from-transparent before:via-[#02665e]/18 before:to-transparent",
  portal:
    "from-neutral-50 via-white to-slate-50 before:bg-gradient-to-r before:from-transparent before:via-slate-300/90 before:to-transparent",
  plain:
    "from-neutral-50 via-white to-white before:bg-gradient-to-r before:from-transparent before:via-slate-200 before:to-transparent",
};

export default function FooterBridge({ variant = "plain", className = "" }: FooterBridgeProps) {
  return (
    <div
      aria-hidden
      className={[
        "relative h-10 w-full overflow-hidden bg-gradient-to-b",
        "before:absolute before:left-1/2 before:top-1/2 before:h-px before:w-[min(74rem,calc(100%-2rem))] before:-translate-x-1/2 before:-translate-y-1/2",
        "after:absolute after:left-1/2 after:top-1/2 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-white after:ring-1 after:ring-slate-200 after:shadow-sm",
        variantClass[variant],
        className,
      ].join(" ")}
    />
  );
}

"use client";
import React from "react";

type Props = React.ComponentPropsWithoutRef<"tr"> & {
  /** When false, disables the default hover/tint/shadow */
  hover?: boolean;
};

export default function TableRow({ children, className = "", hover = true, ...props }: Props) {
  const hoverClasses = hover ? "hover:bg-sky-50 hover:shadow-sm transition duration-150 ease-in-out" : "";
  const combined = `${hoverClasses} ${className}`.trim();
  return (
    // Using tr element so consumers can pass td elements as children as usual
    // eslint-disable-next-line react/jsx-props-no-spreading
    <tr className={combined} {...props}>
      {children}
    </tr>
  );
}

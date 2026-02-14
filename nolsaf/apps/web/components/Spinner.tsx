"use client";
import React from "react";
import LogoSpinner from "./LogoSpinner";

type Props = {
  size?: "sm" | "default";
  className?: string;
  ariaLabel?: string;
};

export default function Spinner({ size = "default", className = "", ariaLabel }: Props) {
  return (
    <LogoSpinner
      size={size === "sm" ? "xs" : "sm"}
      className={className}
      ariaLabel={ariaLabel || "Loading"}
    />
  );
}

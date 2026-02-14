"use client";
import React from "react";
import LogoSpinner from "./LogoSpinner";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  const mapped = size === "sm" ? "xs" : size === "lg" ? "lg" : "md";
  return <LogoSpinner size={mapped} className={className} ariaLabel="Loading" />;
}


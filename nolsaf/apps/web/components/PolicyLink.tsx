"use client";

import React from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

const POLICY_ROOTS = new Set([
  "/terms",
  "/privacy",
  "/cookies-policy",
  "/verification-policy",
  "/cancellation-policy",
  "/driver-disbursement-policy",
  "/property-owner-disbursement-policy",
  "/disbursement-policy",
]);

function getPolicyBasePath(pathname: string | null): "" | "/admin" | "/owner" {
  if (!pathname) return "";
  if (pathname.startsWith("/admin")) return "/admin";
  if (pathname.startsWith("/owner")) return "/owner";
  return "";
}

function resolveHref(href: string, basePath: "" | "/admin" | "/owner") {
  if (!basePath) return href;
  if (!href.startsWith("/")) return href;

  const match = href.match(/^([^?#]*)(.*)$/);
  const path = match?.[1] ?? href;
  const suffix = match?.[2] ?? "";

  if (!POLICY_ROOTS.has(path)) return href;
  if (href.startsWith(basePath + "/")) return href;

  return `${basePath}${path}${suffix}`;
}

type Props = React.ComponentProps<typeof NextLink>;

export default function PolicyLink(props: Props) {
  const pathname = usePathname();
  const basePath = getPolicyBasePath(pathname);

  const { href, ...rest } = props;

  if (typeof href !== "string") {
    return <NextLink href={href} {...rest} />;
  }

  const resolved = resolveHref(href, basePath);
  return <NextLink href={resolved} {...rest} />;
}

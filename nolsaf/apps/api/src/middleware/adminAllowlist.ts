import { Request, Response, NextFunction } from "express";
import { prisma } from "@nolsaf/prisma";
import CIDR from "ip-cidr";
import ipaddr from "ipaddr.js";

const CACHE_TTL_MS = 30_000;
let cachedList: string[] | null = null;
let cachedAtMs = 0;

// Helper: get client IP
function getIp(req: Request): string {
  const fwd = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();
  return fwd || req.socket.remoteAddress || "";
}

export async function adminAllowlist(req: Request, res: Response, next: NextFunction) {
  try {
    const now = Date.now();
    if (cachedList && now - cachedAtMs < CACHE_TTL_MS) {
      // Use cached allowlist
      if (cachedList.length === 0) return next();
      const list = cachedList;

      const ip = getIp(req);
      if (!ip) return res.status(403).json({ error: "IP blocked" });

      // Normalize IPv6/IPv4
      let normalized = ip;
      try {
        const addr = ipaddr.parse(ip);
        if (addr.kind() === "ipv6" && (addr as any).isIPv4MappedAddress && (addr as any).isIPv4MappedAddress()) {
          normalized = (addr as any).toIPv4Address().toString();
        } else {
          normalized = ip;
        }
      } catch {}

      const ok: boolean = list.some((cidrStr: string): boolean => {
        try {
          const cidr: InstanceType<typeof CIDR> = new CIDR(cidrStr);
          return cidr.contains(normalized);
        } catch {
          return false;
        }
      });

      if (!ok) return res.status(403).json({ error: "IP not allowed" });
      return next();
    }

    const s = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    interface SystemSetting {
      id: number;
      ipAllowlist?: string | null;
    }

    const list: string[] =
      ((s as SystemSetting | null)?.ipAllowlist
      ?.split(",")
      .map((x: string) => x.trim())
      .filter((v: string) => v !== "")) || [];

    cachedList = list;
    cachedAtMs = now;
    if (list.length === 0) return next(); // not configured

    const ip = getIp(req);
    if (!ip) return res.status(403).json({ error: "IP blocked" });

    // Normalize IPv6/IPv4
    let normalized = ip;
    try {
      const addr = ipaddr.parse(ip);
      if (addr.kind() === "ipv6" && (addr as any).isIPv4MappedAddress && (addr as any).isIPv4MappedAddress()) {
        normalized = (addr as any).toIPv4Address().toString();
      } else {
        normalized = ip;
      }
    } catch {}

    const ok: boolean = list.some((cidrStr: string): boolean => {
      try {
      const cidr: InstanceType<typeof CIDR> = new CIDR(cidrStr);
      return cidr.contains(normalized);
      } catch {
      return false;
      }
    });

    if (!ok) return res.status(403).json({ error: "IP not allowed" });
    next();
  } catch {
    // Fail-closed if you prefer; here we fail-open to avoid lockouts on DB issues.
    next();
  }
}

// apps/api/src/routes/fx.ts
//
// Public + authenticated display-currency endpoints.
//
//   GET  /api/fx/rates        public  — effective display rates + supported list
//   GET  /api/fx/preference   auth    — current user's preferred display currency
//   PUT  /api/fx/preference   auth    — set preferred display currency (persists + cookie)
//
// Everything here is presentation only. TZS remains the money of record.

import { Router, type Request, type Response } from "express";
import type { RequestHandler } from "express";
import { z } from "zod";
import { rateLimitWithRedis as rateLimit } from "../lib/redisRateLimitStore.js";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import {
  BASE_CURRENCY,
  SUPPORTED_CURRENCIES,
  SUPPORTED_CURRENCY_CODES,
  getFxRates,
} from "../lib/fx.js";

export const router = Router();

// Public rates endpoint is hit on most page loads; keep generous but bounded.
const limitFxRates = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || "unknown",
});

const limitFxPreference = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
  keyGenerator: (req) => {
    const user = (req as AuthedRequest).user;
    return user?.id ? `fxpref:user:${user.id}` : req.ip || req.socket.remoteAddress || "unknown";
  },
});

// GET /api/fx/rates — the effective display rates the frontend should use.
router.get("/rates", limitFxRates, (async (_req: Request, res: Response) => {
  const state = await getFxRates();
  res.json({
    base: state.base,
    // Frontend display = amountTZS / tzsPerUnit[code].
    tzsPerUnit: state.tzsPerUnit,
    updatedAt: state.updatedAt,
    source: state.source,
    stale: state.stale,
    currencies: SUPPORTED_CURRENCY_CODES.map((code) => SUPPORTED_CURRENCIES[code]),
  });
}) as RequestHandler);

// Graceful guard: user.preferredCurrency may not exist on an unmigrated DB.
let prefColumnAvailable: boolean | null = null;
async function hasPreferredCurrencyColumn(): Promise<boolean> {
  if (prefColumnAvailable !== null) return prefColumnAvailable;
  try {
    await prisma.user.findFirst({ select: { preferredCurrency: true } as any });
    prefColumnAvailable = true;
  } catch (err: any) {
    if (
      err?.code === "P2022" ||
      err?.code === "P2021" ||
      String(err?.message || "").includes("ColumnNotFound") ||
      String(err?.message || "").includes("Unknown field")
    ) {
      prefColumnAvailable = false;
    } else {
      throw err;
    }
  }
  return prefColumnAvailable;
}

function normalizeCurrency(code: string): string | null {
  const upper = String(code || "").toUpperCase().trim();
  return SUPPORTED_CURRENCY_CODES.includes(upper) ? upper : null;
}

function setPrefCookie(res: Response, currency: string): void {
  const isProd = process.env.NODE_ENV === "production";
  const cookieDomain = (process.env.COOKIE_DOMAIN || "").trim() || undefined;
  res.cookie("pref_currency", currency, {
    httpOnly: false, // client/SSR needs to read it to render the right currency
    secure: isProd,
    sameSite: isProd ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
}

// GET /api/fx/preference — the logged-in user's preferred display currency.
router.get("/preference", requireAuth as RequestHandler, (async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.id;
  let preferred = BASE_CURRENCY as string;
  try {
    if (await hasPreferredCurrencyColumn()) {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferredCurrency: true } as any,
      });
      const stored = (u as any)?.preferredCurrency;
      preferred = normalizeCurrency(stored) || BASE_CURRENCY;
    }
  } catch {
    preferred = BASE_CURRENCY;
  }
  res.json({ currency: preferred });
}) as RequestHandler);

const putPreferenceSchema = z.object({
  currency: z.string().min(2).max(3),
});

// PUT /api/fx/preference — persist the user's choice + set the cookie.
router.put("/preference", requireAuth as RequestHandler, limitFxPreference, (async (req: AuthedRequest, res: Response) => {
  const parsed = putPreferenceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid currency" });
  }
  const currency = normalizeCurrency(parsed.data.currency);
  if (!currency) {
    return res.status(400).json({ error: "Unsupported currency" });
  }

  const userId = req.user!.id;
  try {
    if (await hasPreferredCurrencyColumn()) {
      await prisma.user.update({
        where: { id: userId },
        data: { preferredCurrency: currency } as any,
      });
    }
  } catch {
    // Persisting is best-effort; the cookie below still carries the choice.
  }

  setPrefCookie(res, currency);
  res.json({ currency });
}) as RequestHandler);

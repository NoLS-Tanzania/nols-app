// apps/api/src/routes/owner.properties.layout.ts
import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { Layout } from "../lib/layoutTypes.js";
import { regenerateAndSaveLayout } from "../lib/autoLayout.js";

export const router = Router();
router.use(requireAuth, requireRole("OWNER"));

router.get("/:id/layout", async (req, res) => {
  const ownerId = (req as AuthedRequest).user!.id;
  const id = Number((req as any).params.id);
  const prop = await prisma.property.findFirst({
    where: { id, ownerId },
    select: { id: true, layout: true, totalFloors: true }
  });
  if (!prop) return res.status(404).json({ error: "Not found" });

  // If this is a multi-storey property but a legacy 1-floor layout was saved,
  // auto-upgrade it so owners can switch floors immediately.
  const desiredFloors = typeof prop.totalFloors === "number" && prop.totalFloors >= 2 ? prop.totalFloors : 1;
  if (desiredFloors > 1 && prop.layout) {
    try {
      const parsed = Layout.parse(prop.layout as any);
      if ((parsed.floors?.length ?? 0) < desiredFloors) {
        const layout = await regenerateAndSaveLayout(id);
        return res.json(layout);
      }
    } catch {
      // If parsing fails, leave as-is; owner can still force regenerate via POST.
    }
  }

  res.json(prop.layout ?? null);
});

router.post("/:id/layout/generate", async (req, res) => {
  const ownerId = (req as AuthedRequest).user!.id;
  const id = Number((req as any).params.id);
  const prop = await prisma.property.findFirst({
    where: { id, ownerId },
    select: { id: true }
  });
  if (!prop) return res.status(404).json({ error: "Not found" });

  const layout = await regenerateAndSaveLayout(id);
  res.json(layout);
});

router.get("/:id/availability", async (req, res) => {
  const ownerId = (req as AuthedRequest).user!.id;
  const id = Number((req as any).params.id);
  const prop = await prisma.property.findFirst({
    where: { id, ownerId },
    select: { id: true, layout: true }
  });
  if (!prop) return res.status(404).json({ error: "Not found" });
  if (!prop.layout) return res.status(400).json({ error: "No layout yet" });

  // parse window
  const from = (req as any).query.from ? new Date(String((req as any).query.from)) : new Date();
  const to   = (req as any).query.to   ? new Date(String((req as any).query.to))   : new Date(Date.now() + 86400000);
  if (!(from instanceof Date) || isNaN(+from) || !(to instanceof Date) || isNaN(+to) || +to <= +from) {
    return res.status(400).json({ error: "Invalid date range" });
  }

  // normalize to midnight to count nights cleanly
  const clipStart = startOfDay(from);
  const clipEnd   = startOfDay(to); // checkout-style; nights = days between
  const nightsTotal = Math.max(1, diffNights(clipStart, clipEnd)); // avoid zero

  // Which room codes exist in the layout?
  let layout: any;
  try { layout = Layout.parse(prop.layout as any); } catch { layout = prop.layout as any; }
  const roomCodes: string[] = (layout?.floors ?? [])
    .flatMap((f:any)=> (f.rooms ?? []).map((r:any)=> r.code))
    .filter(Boolean);

  // Fetch bookings that overlap the window for this property
  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        propertyId: id,
        checkIn:  { lt: clipEnd },
        checkOut: { gt: clipStart },
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
      select: { id: true, checkIn: true, checkOut: true, status: true, roomCode: true, guestName: true, totalAmount: true }
    }),
    prisma.propertyAvailabilityBlock.findMany({
      where: {
        propertyId: id,
        startDate: { lt: clipEnd },
        endDate:   { gt: clipStart },
      },
      select: { id: true, startDate: true, endDate: true, roomCode: true, source: true, bedsBlocked: true }
    }),
  ]);

  // Index bookings by roomCode + compute overlapped nights
  const byCode: Record<string, { id:number; checkIn:Date; checkOut:Date; status:string; nights:number; guestName?: string | null; totalAmount?: any }[]> = {};
  for (const b of bookings) {
    const code = (b as any).roomCode ?? "";
    if (!code) continue;
    const n = overlapNights(clipStart, clipEnd, b.checkIn, b.checkOut);
    if (n <= 0) continue;
    if (!byCode[code]) byCode[code] = [];
    byCode[code].push({ id: b.id, checkIn: b.checkIn, checkOut: b.checkOut, status: b.status, nights: n, guestName: (b as any).guestName, totalAmount: (b as any).totalAmount });
  }

  // Index blocks by roomCode (null roomCode = all rooms)
  const blocksByCode: Record<string, { id:number; startDate:Date; endDate:Date; source:string|null; nights:number }[]> = {};
  for (const bl of blocks) {
    const n = overlapNights(clipStart, clipEnd, bl.startDate, bl.endDate);
    if (n <= 0) continue;
    // A block with no roomCode affects every room in the layout
    const codes = bl.roomCode ? [bl.roomCode] : roomCodes;
    for (const code of codes) {
      if (!blocksByCode[code]) blocksByCode[code] = [];
      blocksByCode[code].push({ id: bl.id, startDate: bl.startDate, endDate: bl.endDate, source: bl.source, nights: n });
    }
  }

  // Build response: bookings + blocks both contribute to occupancy
  const rooms = roomCodes.map(code => {
    const bs  = byCode[code]      ?? [];
    const bls = blocksByCode[code] ?? [];
    const nightsBooked  = bs.reduce((s, x) => s + x.nights, 0);
    const nightsBlocked = bls.reduce((s, x) => s + x.nights, 0);
    const nightsOccupied = Math.min(nightsTotal, nightsBooked + nightsBlocked);
    const pct = (nightsOccupied / nightsTotal) * 100;
    return {
      code,
      busy: pct > 0,
      occupancyPct:   Math.round(pct),
      nightsBooked,
      nightsBlocked,
      nightsOccupied,
      nightsTotal,
      bookings: bs.map(b => ({
        id: b.id,
        checkIn:  b.checkIn  instanceof Date ? b.checkIn.toISOString()  : b.checkIn,
        checkOut: b.checkOut instanceof Date ? b.checkOut.toISOString() : b.checkOut,
        status: b.status,
        guestName: b.guestName,
        totalAmount: b.totalAmount,
      })),
      blocks: bls.map(bl => ({
        id: bl.id,
        startDate: bl.startDate instanceof Date ? bl.startDate.toISOString() : bl.startDate,
        endDate:   bl.endDate   instanceof Date ? bl.endDate.toISOString()   : bl.endDate,
        source: bl.source,
        nights: bl.nights,
      })),
    };
  });

  // Convert Date objects to ISO strings for JSON serialization
  res.json({ 
    window: { 
      from: clipStart instanceof Date ? clipStart.toISOString() : clipStart, 
      to: clipEnd instanceof Date ? clipEnd.toISOString() : clipEnd 
    }, 
    rooms, 
    nightsTotal 
  });
});

/* ----- local helpers (put at bottom of this file) ----- */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x;
}
function diffNights(a: Date, b: Date) {
  const MS = 24 * 60 * 60 * 1000;
  return Math.round((+b - +a) / MS);
}
function overlapNights(winStart: Date, winEnd: Date, bIn: Date, bOut: Date) {
  // Treat [checkIn, checkOut) like hotel nights
  const s = Math.max(+startOfDay(bIn), +winStart);
  const e = Math.min(+startOfDay(bOut), +winEnd);
  if (e <= s) return 0;
  return diffNights(new Date(s), new Date(e));
}

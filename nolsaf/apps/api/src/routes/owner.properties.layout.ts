// apps/api/src/routes/owner.properties.layout.ts
import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { Layout } from "../lib/layoutTypes.js";
import { regenerateAndSaveLayout } from "../lib/autoLayout.js";

export const router = Router();
router.use(requireAuth, requireRole("OWNER"));

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
  // IMPORTANT: expects Booking.roomCode (string) to match layout room "code".
  const bookings = await prisma.booking.findMany({
    where: {
      propertyId: id,
      checkIn: { lt: clipEnd },    // overlap condition
      checkOut: { gt: clipStart },
    // PENDING_CHECKIN is deprecated; treat as CHECKED_IN at UI/business-layer
    status: { in: ["CONFIRMED", "CHECKED_IN"] }
    },
    select: { id: true, checkIn: true, checkOut: true, status: true, roomCode: true }
  });

  // Index bookings by roomCode + compute overlapped nights
  const byCode: Record<string, { id:number; checkIn:Date; checkOut:Date; status:string; nights:number }[]> = {};
  for (const b of bookings) {
    const code = (b as any).roomCode ?? "";
    if (!code) continue;
    const n = overlapNights(clipStart, clipEnd, b.checkIn, b.checkOut);
    if (n <= 0) continue;
    if (!byCode[code]) byCode[code] = [];
    byCode[code].push({ id: b.id, checkIn: b.checkIn, checkOut: b.checkOut, status: b.status, nights: n });
  }

  // Build response for each code in the layout
  const rooms = roomCodes.map(code => {
    const bs = byCode[code] ?? [];
    const nightsBooked = bs.reduce((s, x) => s + x.nights, 0);
    // cap at nightsTotal (in case of overlapping bookings on same room)
    const capped = Math.min(nightsTotal, nightsBooked);
    const pct = (capped / nightsTotal) * 100; // 0..100
    return {
      code,
      busy: pct > 0, // backward compatible flag
      occupancyPct: Math.round(pct), // integer 0..100
      nightsBooked: capped,
      nightsTotal,
      // Convert Date objects to ISO strings for JSON serialization
      bookings: bs.map(b => ({ 
        id: b.id, 
        checkIn: b.checkIn instanceof Date ? b.checkIn.toISOString() : b.checkIn, 
        checkOut: b.checkOut instanceof Date ? b.checkOut.toISOString() : b.checkOut, 
        status: b.status 
      }))
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

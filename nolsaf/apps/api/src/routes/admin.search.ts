import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const router = Router();
// Protect this route for admins only
router.use(requireAuth as any, requireRole("ADMIN") as any);

/** GET /admin/search?q=term */
router.get("/", async (req, res) => {
  try {
    const q = String((req.query as any).q ?? "").trim();
    if (!q) return res.json([]);

    const whereText = (role?: string) => ({
      role,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ],
    });

    const [owners, drivers, users, properties, bookings] = await Promise.all([
      prisma.user.findMany({ where: whereText("OWNER"), select: { id: true, name: true, email: true, phone: true }, take: 5 }),
      prisma.user.findMany({ where: whereText("DRIVER"), select: { id: true, name: true, email: true, phone: true }, take: 5 }),
      prisma.user.findMany({ where: whereText("USER"), select: { id: true, name: true, email: true, phone: true }, take: 5 }),
      prisma.property.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { regionName: { contains: q, mode: "insensitive" } },
            { district: { contains: q, mode: "insensitive" } },
            { owner: { name: { contains: q, mode: "insensitive" } } },
          ],
        },
        select: { id: true, title: true, regionName: true, district: true, owner: { select: { id: true, name: true } } },
        take: 5,
      }),
      prisma.booking.findMany({
        where: {
          OR: [
            { guestName: { contains: q, mode: "insensitive" } },
            { property: { title: { contains: q, mode: "insensitive" } } },
            { code: { codeVisible: { contains: q, mode: "insensitive" } } },
          ],
        },
        select: { id: true, guestName: true, property: { select: { id: true, title: true } }, code: { select: { codeVisible: true } } },
        take: 5,
      }),
    ]);

    const suggestions = [
      ...owners.map((o) => ({ label: o.name ? `${o.name}${o.email ? ` — ${o.email}` : ''}` : `Owner ${o.id}`, href: `/admin/owners/${o.id}`, type: "Owner", meta: { email: o.email, phone: o.phone } })),
      ...drivers.map((d) => ({ label: d.name ? `${d.name}${d.email ? ` — ${d.email}` : ''}` : `Driver ${d.id}`, href: `/admin/drivers/${d.id}`, type: "Driver", meta: { email: d.email, phone: d.phone } })),
      ...users.map((u) => ({ label: u.name ? `${u.name}${u.email ? ` — ${u.email}` : ''}` : `User ${u.id}`, href: `/admin/users/${u.id}`, type: "User", meta: { email: u.email, phone: u.phone } })),
      ...properties.map((p) => ({ label: p.title ? `${p.title}${p.owner?.name ? ` — ${p.owner.name}` : p.regionName ? ` — ${p.regionName}` : p.district ? ` — ${p.district}` : ''}` : `Property ${p.id}`, href: `/admin/properties/${p.id}`, type: "Property", meta: { regionName: p.regionName, district: p.district, owner: p.owner } })),
      ...bookings.map((b) => ({ label: b.guestName ? `${b.guestName} — ${b.property?.title ?? 'Booking'}${b.code?.codeVisible ? ` (#${b.code.codeVisible})` : ''}` : `Booking ${b.id}`, href: `/admin/bookings/${b.id}`, type: "Booking", meta: { code: b.code?.codeVisible, property: b.property } })),
    ];

    return res.json(suggestions);
  } catch (err) {
    console.error("Error in /admin/search:", err);
    return res.status(500).json([]);
  }
});

export default router;

import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";

export const router = Router();
router.use(requireAuth as RequestHandler);

/**
 * GET /api/customer/group-stays
 * Get all group stay bookings for the authenticated customer
 * Query params: status, page, pageSize
 */
router.get("/", async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { status, page = "1", pageSize = "20" } = req.query as any;
    
    const where: any = { userId };
    if (status) {
      where.status = String(status);
    }

    const pageNum = Number(page);
    const pageSizeNum = Number(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    const [groupBookings, total] = await Promise.all([
      prisma.groupBooking.findMany({
        where,
        include: {
          arrangement: {
            include: {
              property: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                  regionName: true,
                  district: true,
                  city: true,
                },
              },
            },
          },
          passengers: {
            select: {
              id: true,
              name: true,
              phone: true,
              nationality: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSizeNum,
      }),
      prisma.groupBooking.count({ where }),
    ]);

    const now = new Date();
    const groupStaysWithValidity = groupBookings.map((gb) => {
      const checkOut = gb.checkOut ? new Date(gb.checkOut) : null;
      const isValid = checkOut ? checkOut >= now && gb.status !== "CANCELED" : true;
      
      return {
        id: gb.id,
        arrangement: gb.arrangement,
        checkIn: gb.checkIn,
        checkOut: gb.checkOut,
        status: gb.status,
        totalAmount: gb.totalAmount,
        numberOfGuests: gb.numberOfGuests || gb.passengers?.length || 0,
        passengers: gb.passengers,
        isValid,
        createdAt: gb.createdAt,
        updatedAt: gb.updatedAt,
      };
    });

    return res.json({
      items: groupStaysWithValidity,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (error: any) {
    console.error("GET /customer/group-stays error:", error);
    return res.status(500).json({ error: "Failed to fetch group stays" });
  }
});

export default router;

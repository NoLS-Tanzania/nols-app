// apps/api/src/routes/property.reviews.ts
import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

// Schema for creating a review
const createReviewSchema = z.object({
  propertyId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional().nullable(),
  comment: z.string().max(5000).optional().nullable(),
  categoryRatings: z.object({
    cleanliness: z.number().int().min(1).max(5).optional(),
    location: z.number().int().min(1).max(5).optional(),
    value: z.number().int().min(1).max(5).optional(),
    service: z.number().int().min(1).max(5).optional(),
    communication: z.number().int().min(1).max(5).optional(),
  }).optional().nullable(),
  bookingId: z.number().int().positive().optional().nullable(),
});

// Schema for owner response
const ownerResponseSchema = z.object({
  response: z.string().min(1).max(2000),
});

/**
 * GET /property-reviews/:propertyId
 * Get all published reviews for a property
 */
router.get("/:propertyId", async (req, res) => {
  try {
    const propertyId = Number(req.params.propertyId);
    if (!propertyId || isNaN(propertyId)) {
      return res.status(400).json({ error: "Invalid property ID" });
    }

    const reviews = await prisma.propertyReview.findMany({
      where: {
        propertyId,
        isPublished: true,
        isHidden: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to 50 most recent reviews
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        categoryRatings: true,
        isVerified: true,
        ownerResponse: true,
        ownerResponseAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            // Don't expose email/phone for privacy
          },
        },
      },
    });

    // Calculate aggregate statistics
    const stats = {
      totalReviews: reviews.length,
      averageRating: reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0,
      ratingDistribution: {
        5: reviews.filter((r) => r.rating === 5).length,
        4: reviews.filter((r) => r.rating === 4).length,
        3: reviews.filter((r) => r.rating === 3).length,
        2: reviews.filter((r) => r.rating === 2).length,
        1: reviews.filter((r) => r.rating === 1).length,
      },
      categoryAverages: reviews.length > 0 && reviews[0].categoryRatings
        ? (() => {
            const cats = ["cleanliness", "location", "value", "service", "communication"] as const;
            const avgs: Record<string, number> = {};
            cats.forEach((cat) => {
              const ratings = reviews
                .map((r) => (r.categoryRatings as any)?.[cat])
                .filter((r): r is number => typeof r === "number");
              avgs[cat] = ratings.length > 0
                ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
                : 0;
            });
            return avgs;
          })()
        : null,
    };

    res.json({
      reviews,
      stats,
    });
  } catch (err: any) {
    console.error("Get reviews error:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

/**
 * POST /property-reviews
 * Create a new review (requires authentication)
 */
router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.user!.id;
    const parsed = createReviewSchema.parse(req.body);

    // Check if user already reviewed this property
    const existing = await prisma.propertyReview.findFirst({
      where: {
        propertyId: parsed.propertyId,
        userId,
      },
    });

    if (existing) {
      return res.status(400).json({ error: "You have already reviewed this property" });
    }

    // Verify property exists
    const property = await prisma.property.findFirst({
      where: { id: parsed.propertyId },
      select: { id: true, status: true },
    });

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Verify booking if bookingId is provided
    if (parsed.bookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          id: parsed.bookingId,
          userId,
          propertyId: parsed.propertyId,
          status: { in: ["CHECKED_OUT", "CONFIRMED"] },
        },
      });

      if (!booking) {
        return res.status(400).json({ error: "Invalid booking ID or booking not found" });
      }
    }

    const review = await prisma.propertyReview.create({
      data: {
        propertyId: parsed.propertyId,
        userId,
        rating: parsed.rating,
        title: parsed.title ?? null,
        comment: parsed.comment ?? null,
        categoryRatings: parsed.categoryRatings ?? null,
        bookingId: parsed.bookingId ?? null,
        isVerified: !!parsed.bookingId, // Verified if associated with a booking
        isPublished: true,
        isHidden: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(review);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: err.errors });
    }
    console.error("Create review error:", err);
    res.status(500).json({ error: "Failed to create review" });
  }
});

/**
 * POST /property-reviews/:reviewId/owner-response
 * Property owner responds to a review (requires owner authentication)
 */
router.post("/:reviewId/owner-response", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const reviewId = Number(req.params.reviewId);
    const userId = req.user!.id;
    const parsed = ownerResponseSchema.parse(req.body);

    if (!reviewId || isNaN(reviewId)) {
      return res.status(400).json({ error: "Invalid review ID" });
    }

    // Get review and verify property ownership
    const review = await prisma.propertyReview.findFirst({
      where: { id: reviewId },
      include: {
        property: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    if (review.property.ownerId !== userId) {
      return res.status(403).json({ error: "You can only respond to reviews for your own properties" });
    }

    // Update review with owner response
    const updated = await prisma.propertyReview.update({
      where: { id: reviewId },
      data: {
        ownerResponse: parsed.response,
        ownerResponseAt: new Date(),
      },
    });

    res.json(updated);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: err.errors });
    }
    console.error("Owner response error:", err);
    res.status(500).json({ error: "Failed to add owner response" });
  }
});

export default router;

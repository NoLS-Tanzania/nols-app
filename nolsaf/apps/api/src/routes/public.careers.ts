// apps/api/src/routes/public.careers.ts
import { Router } from "express";
import { prisma } from "@nolsaf/prisma";

const router = Router();

/**
 * GET /api/public/careers
 * Get all ACTIVE jobs (public endpoint, no authentication required)
 * Query params: category, type, location, page, pageSize
 */
router.get("/", async (req, res) => {
  try {
    const { category, type, location, page = "1", pageSize = "100" } = req.query;
    
    const pageNum = parseInt(page as string, 10) || 1;
    const size = Math.min(parseInt(pageSize as string, 10) || 100, 100); // Max 100 per page
    const skip = (pageNum - 1) * size;

    const where: any = {
      status: "ACTIVE" // Only return active jobs
    };
    
    if (category) where.category = category;
    if (type) where.type = type;
    if (location) where.location = location;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: [
          { featured: "desc" }, // Featured jobs first
          { postedDate: "desc" } // Then by most recent
        ],
        skip,
        take: size,
        select: {
          id: true,
          title: true,
          department: true,
          category: true,
          type: true,
          location: true,
          locationDetail: true,
          salary: true,
          description: true,
          requirements: true,
          responsibilities: true,
          benefits: true,
          postedDate: true,
          applicationDeadline: true,
          experienceLevel: true,
          featured: true
          // Exclude internal fields like createdByUser, updatedByUser, etc.
        }
      }),
      prisma.job.count({ where })
    ]);

    return res.json({
      jobs,
      total,
      page: pageNum,
      pageSize: size,
      totalPages: Math.ceil(total / size)
    });
  } catch (error: any) {
    console.error("Error fetching public jobs:", error);
    return res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

/**
 * GET /api/public/careers/:id
 * Get a single ACTIVE job by ID (public endpoint)
 */
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid job ID" });
    }

    const job = await prisma.job.findFirst({
      where: {
        id,
        status: "ACTIVE" // Only return if active
      },
      select: {
        id: true,
        title: true,
        department: true,
        category: true,
        type: true,
        location: true,
        locationDetail: true,
        salary: true,
        description: true,
        requirements: true,
        responsibilities: true,
        benefits: true,
        postedDate: true,
        applicationDeadline: true,
        experienceLevel: true,
        featured: true
      }
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found or not available" });
    }

    return res.json(job);
  } catch (error: any) {
    console.error("Error fetching public job:", error);
    return res.status(500).json({ error: "Failed to fetch job" });
  }
});

export default router;


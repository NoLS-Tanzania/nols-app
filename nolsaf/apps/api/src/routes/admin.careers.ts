// apps/api/src/routes/admin.careers.ts
import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { audit } from "../lib/audit.js";

export const router = Router();
router.use(requireAuth as RequestHandler, requireAdmin as RequestHandler);

/**
 * GET /admin/careers
 * Get all jobs with optional filtering
 */
router.get("/", async (req: AuthedRequest, res) => {
  try {
    const { status, featured, category, type, location, page = "1", pageSize = "50" } = req.query;
    
    const pageNum = parseInt(page as string, 10) || 1;
    const size = parseInt(pageSize as string, 10) || 50;
    const skip = (pageNum - 1) * size;

    const where: any = {};
    
    if (status) where.status = status;
    if (featured !== undefined) where.featured = featured === "true";
    if (category) where.category = category;
    if (type) where.type = type;
    if (location) where.location = location;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { postedDate: "desc" },
        skip,
        take: size,
        include: {
          createdByUser: {
            select: { id: true, name: true, email: true }
          },
          updatedByUser: {
            select: { id: true, name: true, email: true }
          }
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
    console.error("Error fetching jobs:", error);
    return res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

/**
 * GET /admin/careers/:id
 * Get a single job by ID
 */
router.get("/:id", async (req: AuthedRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid job ID" });
    }

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        updatedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    return res.json(job);
  } catch (error: any) {
    console.error("Error fetching job:", error);
    return res.status(500).json({ error: "Failed to fetch job" });
  }
});

/**
 * POST /admin/careers
 * Create a new job posting
 */
router.post("/", async (req: AuthedRequest, res) => {
  try {
    const {
      title,
      category,
      type,
      location,
      locationDetail,
      department,
      description,
      responsibilities,
      requirements,
      benefits,
      experienceLevel,
      salary,
      applicationDeadline,
      featured,
      status = "ACTIVE"
    } = req.body;

    // Validation
    if (!title || !category || !type || !location || !department || !description) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!Array.isArray(responsibilities) || !Array.isArray(requirements) || !Array.isArray(benefits)) {
      return res.status(400).json({ error: "Responsibilities, requirements, and benefits must be arrays" });
    }

    const job = await prisma.job.create({
      data: {
        title,
        category,
        type,
        location,
        locationDetail,
        department,
        description,
        responsibilities: responsibilities || [],
        requirements: requirements || [],
        benefits: benefits || [],
        experienceLevel: experienceLevel || "ENTRY",
        salary: salary || null,
        applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : null,
        featured: featured || false,
        status,
        createdBy: req.user?.id,
        updatedBy: req.user?.id
      },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Audit log
    await audit(req as any, "JOB_CREATE", "JOB", undefined, job);

    return res.status(201).json(job);
  } catch (error: any) {
    console.error("Error creating job:", error);
    return res.status(500).json({ error: "Failed to create job" });
  }
});

/**
 * PATCH /admin/careers/:id
 * Update an existing job posting
 */
router.patch("/:id", async (req: AuthedRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid job ID" });
    }

    const existingJob = await prisma.job.findUnique({ where: { id } });
    if (!existingJob) {
      return res.status(404).json({ error: "Job not found" });
    }

    const {
      title,
      category,
      type,
      location,
      locationDetail,
      department,
      description,
      responsibilities,
      requirements,
      benefits,
      experienceLevel,
      salary,
      applicationDeadline,
      featured,
      status
    } = req.body;

    const updateData: any = {
      updatedBy: req.user?.id
    };

    if (title !== undefined) updateData.title = title;
    if (category !== undefined) updateData.category = category;
    if (type !== undefined) updateData.type = type;
    if (location !== undefined) updateData.location = location;
    if (locationDetail !== undefined) updateData.locationDetail = locationDetail;
    if (department !== undefined) updateData.department = department;
    if (description !== undefined) updateData.description = description;
    if (responsibilities !== undefined) updateData.responsibilities = responsibilities;
    if (requirements !== undefined) updateData.requirements = requirements;
    if (benefits !== undefined) updateData.benefits = benefits;
    if (experienceLevel !== undefined) updateData.experienceLevel = experienceLevel;
    if (salary !== undefined) updateData.salary = salary;
    if (applicationDeadline !== undefined) updateData.applicationDeadline = applicationDeadline ? new Date(applicationDeadline) : null;
    if (featured !== undefined) updateData.featured = featured;
    if (status !== undefined) updateData.status = status;

    const job = await prisma.job.update({
      where: { id },
      data: updateData,
      include: {
        updatedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Audit log
    await audit(req as any, "JOB_UPDATE", "JOB", existingJob, job);

    return res.json(job);
  } catch (error: any) {
    console.error("Error updating job:", error);
    return res.status(500).json({ error: "Failed to update job" });
  }
});

/**
 * DELETE /admin/careers/:id
 * Delete a job posting
 */
router.delete("/:id", async (req: AuthedRequest, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid job ID" });
    }

    const existingJob = await prisma.job.findUnique({ where: { id } });
    if (!existingJob) {
      return res.status(404).json({ error: "Job not found" });
    }

    await prisma.job.delete({ where: { id } });

    // Audit log
    await audit(req as any, "JOB_DELETE", "JOB", existingJob, undefined);

    return res.json({ message: "Job deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting job:", error);
    return res.status(500).json({ error: "Failed to delete job" });
  }
});

// apps/api/src/routes/admin.careers.stats.ts
import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

const router = Router();
router.use(requireAuth as RequestHandler, requireAdmin as RequestHandler);

/**
 * GET /admin/careers/stats
 * Get comprehensive statistics for careers and applications
 */
router.get("/", async (req: AuthedRequest, res) => {
  try {
    const { from, to } = req.query;
    
    const dateFilter: any = {};
    if (from || to) {
      dateFilter.submittedAt = {};
      if (from) {
        dateFilter.submittedAt.gte = new Date(from as string);
      }
      if (to) {
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.submittedAt.lte = toDate;
      }
    }

    // Total applications
    let totalApplications = 0;
    try {
      totalApplications = await prisma.jobApplication.count({
        where: dateFilter
      });
    } catch (countError: any) {
      console.error("Error counting applications:", countError);
      // Continue with 0 if count fails
    }

    // Applications by status - use findMany and group manually for better MySQL compatibility
    let allApplications: Array<{ status: string; jobId: number }> = [];
    try {
      allApplications = await prisma.jobApplication.findMany({
        where: dateFilter,
        select: { status: true, jobId: true }
      });
    } catch (findError: any) {
      console.error("Error fetching applications for grouping:", findError);
      // Continue with empty array if fetch fails
    }

    // Group by status manually
    const applicationsByStatusMap = new Map<string, number>();
    allApplications.forEach(app => {
      applicationsByStatusMap.set(app.status, (applicationsByStatusMap.get(app.status) || 0) + 1);
    });
    const applicationsByStatus = Array.from(applicationsByStatusMap.entries()).map(([status, count]) => ({
      status,
      _count: { status: count }
    }));

    // Group by job manually
    const applicationsByJobMap = new Map<number, number>();
    allApplications.forEach(app => {
      applicationsByJobMap.set(app.jobId, (applicationsByJobMap.get(app.jobId) || 0) + 1);
    });
    const applicationsByJob = Array.from(applicationsByJobMap.entries()).map(([jobId, count]) => ({
      jobId,
      _count: { jobId: count }
    }));

    // Get job details for applications by job
    const jobIds = applicationsByJob.length > 0 ? applicationsByJob.map(item => item.jobId) : [];
    const jobs = jobIds.length > 0 ? await prisma.job.findMany({
      where: { id: { in: jobIds } },
      select: { id: true, title: true, department: true }
    }) : [];

    const applicationsByJobWithDetails = applicationsByJob.map(item => {
      const job = jobs.find(j => j.id === item.jobId);
      return {
        jobId: item.jobId,
        jobTitle: job?.title || 'Unknown',
        jobDepartment: job?.department || 'Unknown',
        count: item._count.jobId
      };
    }).sort((a, b) => b.count - a.count);

    // Applications over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const timeFilter = {
      ...dateFilter,
      submittedAt: { gte: thirtyDaysAgo }
    };
    
    const applicationsOverTime = await prisma.jobApplication.findMany({
      where: timeFilter,
      select: {
        submittedAt: true,
        status: true
      },
      orderBy: { submittedAt: 'asc' }
    });

    // Group by date
    const dailyStats: Record<string, { date: string; total: number; byStatus: Record<string, number> }> = {};
    applicationsOverTime.forEach(app => {
      if (app.submittedAt) {
        const date = new Date(app.submittedAt).toISOString().split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = { date, total: 0, byStatus: {} };
        }
        dailyStats[date].total++;
        dailyStats[date].byStatus[app.status] = (dailyStats[date].byStatus[app.status] || 0) + 1;
      }
    });

    // Average time to review
    const reviewedApplications = await prisma.jobApplication.findMany({
      where: {
        ...dateFilter,
        reviewedAt: { not: null },
        submittedAt: { not: null }
      },
      select: {
        submittedAt: true,
        reviewedAt: true
      }
    });

    let avgTimeToReview = 0;
    if (reviewedApplications.length > 0) {
      const totalHours = reviewedApplications.reduce((sum, app) => {
        if (app.submittedAt && app.reviewedAt) {
          const hours = (new Date(app.reviewedAt).getTime() - new Date(app.submittedAt).getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }
        return sum;
      }, 0);
      avgTimeToReview = totalHours / reviewedApplications.length;
    }

    // Status distribution
    const statusDistribution = applicationsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);
    
    // Ensure all statuses are represented
    const allStatuses = ['PENDING', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED'];
    allStatuses.forEach(status => {
      if (!statusDistribution[status]) {
        statusDistribution[status] = 0;
      }
    });

    // Total jobs
    let totalJobs = 0;
    let activeJobs = 0;
    try {
      totalJobs = await prisma.job.count();
      activeJobs = await prisma.job.count({ where: { status: 'ACTIVE' } });
    } catch (jobCountError: any) {
      console.error("Error counting jobs:", jobCountError);
      // Continue with 0 if count fails
    }

    // Ensure we always return a valid structure even if there's no data
    const response = {
      overview: {
        totalApplications: totalApplications || 0,
        totalJobs: totalJobs || 0,
        activeJobs: activeJobs || 0,
        avgTimeToReview: Math.round(avgTimeToReview * 10) / 10 // Round to 1 decimal
      },
      statusDistribution: statusDistribution || {},
      applicationsByJob: (applicationsByJobWithDetails || []).slice(0, 10), // Top 10
      dailyStats: Object.values(dailyStats || {}).sort((a, b) => a.date.localeCompare(b.date)),
      timeRange: {
        from: from || null,
        to: to || null
      }
    };

    return res.json(response);
  } catch (error: any) {
    console.error("Error fetching careers statistics:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    
    // Check if it's a Prisma schema mismatch error (more specific checks)
    const isSchemaError = 
      error.code === 'P2021' || // Table does not exist
      error.code === 'P2022' || // Column does not exist
      error.message?.includes("Unknown model") ||
      error.message?.includes("jobApplication") ||
      error.message?.includes("JobApplication") ||
      (error.message?.includes("model") && error.message?.includes("does not exist"));
    
    if (isSchemaError) {
      return res.status(500).json({ 
        error: "Database schema not updated. Please stop the dev server, run 'npm run prisma:generate' from the root, then restart the server.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: error.code
      });
    }
    
    return res.status(500).json({ 
      error: "Failed to fetch statistics",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: error.code
    });
  }
});

export default router;

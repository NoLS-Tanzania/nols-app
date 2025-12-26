// apps/api/src/routes/admin.careers.applications.ts
import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { audit } from "../lib/audit.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sendMail } from "../lib/mailer.js";
import { generateApplicationStatusEmail, getApplicationEmailSubject } from "../lib/careersEmailTemplates.js";

const router = Router();
router.use(requireAuth as RequestHandler, requireAdmin as RequestHandler);

/**
 * GET /admin/careers/applications
 * Get all job applications with optional filtering
 */
router.get("/", async (req: AuthedRequest, res) => {
  try {
    const { 
      jobId, 
      status, 
      email,
      page = "1", 
      pageSize = "50" 
    } = req.query;
    
    const pageNum = parseInt(page as string, 10) || 1;
    const size = parseInt(pageSize as string, 10) || 50;
    const skip = (pageNum - 1) * size;

    const where: any = {};
    
    if (jobId) {
      const parsedJobId = parseInt(jobId as string, 10);
      if (!isNaN(parsedJobId)) {
        where.jobId = parsedJobId;
      }
    }
    if (status) where.status = status;
    if (email) {
      // MySQL doesn't support case-insensitive mode, use contains for case-sensitive search
      where.email = { contains: email as string };
    }
    
    // Search by applicant name
    const { search } = req.query;
    if (search) {
      where.OR = [
        { fullName: { contains: search as string } },
        { email: { contains: search as string } },
        { phone: { contains: search as string } }
      ];
    }

    const [applications, total] = await Promise.all([
      prisma.jobApplication.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        skip,
        take: size,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              department: true,
              status: true
            }
          },
          reviewedByUser: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.jobApplication.count({ where })
    ]);

    return res.json({
      applications,
      total,
      page: pageNum,
      pageSize: size,
      totalPages: Math.ceil(total / size)
    });
  } catch (error: any) {
    console.error("Error fetching applications:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    
    // Check if it's a Prisma schema mismatch error
    if (error.message?.includes('jobApplication') || error.message?.includes('JobApplication') || error.code === 'P2021' || error.code === 'P2022') {
      return res.status(500).json({ 
        error: "Database schema not updated. Please restart the server after running 'npx prisma generate'.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    return res.status(500).json({ 
      error: "Failed to fetch applications",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /admin/careers/applications/:id/resume
 * Get presigned URL for viewing/downloading resume
 * This route must come before /:id to avoid route conflicts
 */
router.get("/:id/resume", async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id, 10);
    
    if (isNaN(parsedId)) {
      return res.status(400).json({ error: "Invalid application ID" });
    }
    
    const application = await prisma.jobApplication.findUnique({
      where: { id: parsedId },
      select: {
        id: true,
        resumeStorageKey: true,
        resumeUrl: true,
        resumeFileName: true
      }
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (!application.resumeStorageKey && !application.resumeUrl) {
      return res.status(404).json({ error: "Resume not available" });
    }

    // If resumeUrl is already a public HTTP/HTTPS URL, return it directly
    if (application.resumeUrl && (application.resumeUrl.startsWith('http://') || application.resumeUrl.startsWith('https://'))) {
      return res.json({ url: application.resumeUrl });
    }

    // Generate presigned URL from S3 storage key
    // Priority: use resumeStorageKey if available, otherwise try to extract from resumeUrl (s3:// format)
    const storageKey = application.resumeStorageKey || (application.resumeUrl?.startsWith('s3://') 
      ? application.resumeUrl.replace(/^s3:\/\/[^/]+\//, '') 
      : null);

    if (storageKey) {
      const s3BucketName = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET;
      if (s3BucketName && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        try {
          const s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
          });

          const command = new GetObjectCommand({
            Bucket: s3BucketName,
            Key: storageKey,
          });

          const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiry
          return res.json({ url: presignedUrl });
        } catch (s3Error: any) {
          console.error("Error generating presigned URL:", s3Error);
          console.error("S3 Error details:", {
            message: s3Error.message,
            code: s3Error.code,
            name: s3Error.name,
            storageKey,
            bucket: s3BucketName
          });
          return res.status(500).json({ 
            error: "Failed to generate resume URL. Please check S3 configuration.",
            details: process.env.NODE_ENV === 'development' ? s3Error.message : undefined
          });
        }
      } else {
        // S3 credentials not configured
        console.warn("S3 credentials not configured for resume access");
        return res.status(500).json({ 
          error: "S3 storage not configured. Cannot generate resume URL.",
          details: process.env.NODE_ENV === 'development' ? "AWS credentials missing" : undefined
        });
      }
    }

    // Final fallback: return the stored URL if available (even if it's s3:// format, let frontend handle it)
    if (application.resumeUrl) {
      return res.json({ url: application.resumeUrl });
    }

    return res.status(404).json({ error: "Resume URL not available" });
  } catch (error: any) {
    console.error("Error fetching resume URL:", error);
    return res.status(500).json({ 
      error: "Failed to fetch resume URL",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /admin/careers/applications/:id
 * Get a single application by ID
 */
router.get("/:id", async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id, 10);
    
    if (isNaN(parsedId)) {
      return res.status(400).json({ error: "Invalid application ID" });
    }
    
    const application = await prisma.jobApplication.findUnique({
      where: { id: parsedId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
            category: true,
            type: true,
            location: true,
            status: true
          }
        },
        reviewedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    return res.json(application);
  } catch (error: any) {
    console.error("Error fetching application:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      name: error.name
    });
    
    if (error.message?.includes('jobApplication') || error.message?.includes('JobApplication') || error.code === 'P2021' || error.code === 'P2022') {
      return res.status(500).json({ 
        error: "Database schema not updated. Please restart the server after running 'npx prisma generate'.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    return res.status(500).json({ 
      error: "Failed to fetch application",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PATCH /admin/careers/applications/:id
 * Update application status and notes
 */
router.patch("/:id", async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id, 10);
    
    if (isNaN(parsedId)) {
      return res.status(400).json({ error: "Invalid application ID" });
    }
    
    const { status, adminNotes } = req.body;

    const existingApplication = await prisma.jobApplication.findUnique({
      where: { id: parsedId },
      include: { job: true }
    });

    if (!existingApplication) {
      return res.status(404).json({ error: "Application not found" });
    }

    const updateData: any = {};
    let statusChanged = false;
    let newStatus: string | null = null;
    
    if (status) {
      const validStatuses = ["PENDING", "REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      // Check if status is actually changing
      statusChanged = existingApplication.status !== status;
      newStatus = status;
      
      updateData.status = status;
      
      // Track used statuses to prevent duplicate status changes
      const usedStatuses: string[] = Array.isArray(existingApplication.usedStatuses) 
        ? [...(existingApplication.usedStatuses as string[])] 
        : [];
      
      // Add current status to used statuses if not already there
      if (existingApplication.status && !usedStatuses.includes(existingApplication.status)) {
        usedStatuses.push(existingApplication.status);
      }
      
      // Add new status to used statuses if not already there
      if (status && !usedStatuses.includes(status)) {
        usedStatuses.push(status);
      }
      
      updateData.usedStatuses = usedStatuses;
      
      // If status is being changed from PENDING, mark as reviewed
      if (status !== "PENDING" && !existingApplication.reviewedAt) {
        updateData.reviewedAt = new Date();
        updateData.reviewedBy = (req as any).user?.id;
      }
    }
    
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    const updatedApplication = await prisma.jobApplication.update({
      where: { id: parsedId },
      data: updateData,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true
          }
        },
        reviewedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Audit log
    await audit(req as any, "JOB_APPLICATION_UPDATE", "JOB_APPLICATION", existingApplication, updatedApplication);

    // Send email notification if status changed to a notifiable status
    if (statusChanged && newStatus && ["REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"].includes(newStatus)) {
      try {
        const emailData = {
          applicantName: updatedApplication.fullName,
          jobTitle: updatedApplication.job.title,
          jobDepartment: updatedApplication.job.department || undefined,
          status: newStatus as "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED",
          adminNotes: updatedApplication.adminNotes || undefined,
          companyName: process.env.COMPANY_NAME || "NoLSAF Inc Limited",
          supportEmail: process.env.SUPPORT_EMAIL || process.env.CAREERS_EMAIL || "careers@nolsapp.com"
        };

        const subject = getApplicationEmailSubject(emailData.status, emailData.jobTitle);
        const html = generateApplicationStatusEmail(emailData);

        await sendMail(updatedApplication.email, subject, html);
        
        console.log(`Application status email sent to ${updatedApplication.email} for status: ${newStatus}`);
      } catch (emailError: any) {
        // Log email error but don't fail the request
        console.error("Error sending application status email:", emailError);
        console.error("Email error details:", {
          message: emailError.message,
          applicationId: parsedId,
          applicantEmail: updatedApplication.email,
          status: newStatus
        });
        // Continue - the status update was successful even if email failed
      }
    }

    return res.json(updatedApplication);
  } catch (error: any) {
    console.error("Error updating application:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      name: error.name
    });
    
    if (error.message?.includes('jobApplication') || error.message?.includes('JobApplication') || error.code === 'P2021' || error.code === 'P2022') {
      return res.status(500).json({ 
        error: "Database schema not updated. Please restart the server after running 'npx prisma generate'.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    return res.status(500).json({ 
      error: "Failed to update application",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /admin/careers/applications/:id
 * Delete an application (soft delete by setting status to DELETED or hard delete)
 */
router.delete("/:id", async (req: AuthedRequest, res) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id, 10);
    
    if (isNaN(parsedId)) {
      return res.status(400).json({ error: "Invalid application ID" });
    }
    
    const existingApplication = await prisma.jobApplication.findUnique({
      where: { id: parsedId },
      include: { job: true }
    });

    if (!existingApplication) {
      return res.status(404).json({ error: "Application not found" });
    }

    await prisma.jobApplication.delete({
      where: { id: parsedId }
    });

    // Audit log
    await audit(req as any, "JOB_APPLICATION_DELETE", "JOB_APPLICATION", existingApplication, undefined);

    return res.json({ message: "Application deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting application:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      name: error.name
    });
    
    if (error.message?.includes('jobApplication') || error.message?.includes('JobApplication') || error.code === 'P2021' || error.code === 'P2022') {
      return res.status(500).json({ 
        error: "Database schema not updated. Please restart the server after running 'npx prisma generate'.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    return res.status(500).json({ 
      error: "Failed to delete application",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /admin/careers/applications/export
 * Export applications to CSV
 */
router.get("/export", async (req: AuthedRequest, res) => {
  try {
    const { 
      jobId, 
      status, 
      email,
      search,
      format = "csv"
    } = req.query;

    const where: any = {};
    
    if (jobId) {
      const parsedJobId = parseInt(jobId as string, 10);
      if (!isNaN(parsedJobId)) {
        where.jobId = parsedJobId;
      }
    }
    if (status) where.status = status;
    if (email) {
      where.email = { contains: email as string };
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search as string } },
        { email: { contains: search as string } },
        { phone: { contains: search as string } }
      ];
    }

    const applications = await prisma.jobApplication.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true
          }
        },
        reviewedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (format === "csv") {
      // Generate CSV
      const headers = [
        "ID",
        "Full Name",
        "Email",
        "Phone",
        "Job Title",
        "Department",
        "Status",
        "Submitted At",
        "Reviewed At",
        "Reviewed By",
        "Portfolio",
        "LinkedIn",
        "Referred By",
        "Resume File Name"
      ];

      const rows = applications.map(app => [
        app.id,
        app.fullName,
        app.email,
        app.phone,
        app.job?.title || "N/A",
        app.job?.department || "N/A",
        app.status,
        app.submittedAt.toISOString(),
        app.reviewedAt ? app.reviewedAt.toISOString() : "",
        app.reviewedByUser?.name || app.reviewedByUser?.email || "",
        app.portfolio || "",
        app.linkedIn || "",
        app.referredBy || "",
        app.resumeFileName || ""
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="applications-${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvContent);
    }

    return res.status(400).json({ error: "Unsupported format. Use 'csv'" });
  } catch (error: any) {
    console.error("Error exporting applications:", error);
    return res.status(500).json({ 
      error: "Failed to export applications",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PATCH /admin/careers/applications/bulk
 * Bulk update application statuses
 */
router.patch("/bulk", async (req: AuthedRequest, res) => {
  try {
    const { applicationIds, status, adminNotes } = req.body;

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ error: "applicationIds must be a non-empty array" });
    }

    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    const validStatuses = ["PENDING", "REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const parsedIds = applicationIds.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id));

    if (parsedIds.length === 0) {
      return res.status(400).json({ error: "No valid application IDs provided" });
    }

    // Get existing applications to check status changes
    const existingApplications = await prisma.jobApplication.findMany({
      where: { id: { in: parsedIds } },
      include: { job: true }
    });

    // Update applications
    const updateData: any = {
      status,
      reviewedAt: new Date(),
      reviewedBy: (req as any).user?.id
    };

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    // Track used statuses
    const updatePromises = existingApplications.map(async (app) => {
      const usedStatuses: string[] = Array.isArray(app.usedStatuses) 
        ? [...(app.usedStatuses as string[])] 
        : [];
      
      if (app.status && !usedStatuses.includes(app.status)) {
        usedStatuses.push(app.status);
      }
      if (status && !usedStatuses.includes(status)) {
        usedStatuses.push(status);
      }

      return prisma.jobApplication.update({
        where: { id: app.id },
        data: { ...updateData, usedStatuses }
      });
    });

    const updatedApplications = await Promise.all(updatePromises);

    // Send email notifications for status changes
    const emailPromises = existingApplications
      .filter(app => app.status !== status && ["REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"].includes(status))
      .map(async (app) => {
        try {
          const emailData = {
            applicantName: app.fullName,
            jobTitle: app.job?.title || "Position",
            jobDepartment: app.job?.department || undefined,
            status: status as "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED",
            adminNotes: adminNotes || undefined,
            companyName: process.env.COMPANY_NAME || "NoLSAF Inc Limited",
            supportEmail: process.env.SUPPORT_EMAIL || process.env.CAREERS_EMAIL || "careers@nolsapp.com"
          };

          const subject = getApplicationEmailSubject(emailData.status, emailData.jobTitle);
          const html = generateApplicationStatusEmail(emailData);

          await sendMail(app.email, subject, html);
        } catch (emailError: any) {
          console.error(`Error sending email to ${app.email}:`, emailError);
          // Continue with other emails even if one fails
        }
      });

    await Promise.all(emailPromises);

    // Audit log
    await audit(req as any, "JOB_APPLICATION_BULK_UPDATE", "JOB_APPLICATION", 
      { count: existingApplications.length, ids: parsedIds },
      { count: updatedApplications.length, status }
    );

    return res.json({
      success: true,
      updated: updatedApplications.length,
      applications: updatedApplications
    });
  } catch (error: any) {
    console.error("Error bulk updating applications:", error);
    return res.status(500).json({ 
      error: "Failed to bulk update applications",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /admin/careers/applications/bulk
 * Bulk delete applications
 */
router.delete("/bulk", async (req: AuthedRequest, res) => {
  try {
    const { applicationIds } = req.body;

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ error: "applicationIds must be a non-empty array" });
    }

    const parsedIds = applicationIds.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id));

    if (parsedIds.length === 0) {
      return res.status(400).json({ error: "No valid application IDs provided" });
    }

    const existingApplications = await prisma.jobApplication.findMany({
      where: { id: { in: parsedIds } },
      include: { job: true }
    });

    await prisma.jobApplication.deleteMany({
      where: { id: { in: parsedIds } }
    });

    // Audit log
    await audit(req as any, "JOB_APPLICATION_BULK_DELETE", "JOB_APPLICATION", 
      { count: existingApplications.length, ids: parsedIds },
      undefined
    );

    return res.json({
      success: true,
      deleted: parsedIds.length
    });
  } catch (error: any) {
    console.error("Error bulk deleting applications:", error);
    return res.status(500).json({ 
      error: "Failed to bulk delete applications",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

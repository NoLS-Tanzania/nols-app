// apps/api/src/routes/admin.careers.applications.ts
import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { audit } from "../lib/audit.js";
import crypto from "crypto";
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
router.get("/", async (req, res) => {
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
          },
          agent: {
            select: {
              id: true,
              userId: true,
              status: true
            }
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
router.get("/:id/resume", async (req, res) => {
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

          // Work around occasional AWS SDK v3 type mismatches caused by duplicate Smithy client types.
          // This does not affect runtime behavior.
          const presignedUrl = await getSignedUrl(s3Client as any, command as any, { expiresIn: 3600 }); // 1 hour expiry
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
router.get("/:id", async (req, res) => {
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
        },
        agent: {
          select: {
            id: true,
            userId: true,
            status: true,
            isAvailable: true
          }
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
router.patch("/:id", async (req, res) => {
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

      const isFinalized = existingApplication.status === "HIRED" || existingApplication.status === "REJECTED";
      if (isFinalized && existingApplication.status !== status) {
        return res.status(409).json({ error: "Application is finalized and cannot be changed" });
      }
      
      // Check if status is actually changing
      statusChanged = existingApplication.status !== status;
      newStatus = status;

      if (statusChanged) {
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
    }
    
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    if (Object.keys(updateData).length === 0) {
      const currentApplication = await prisma.jobApplication.findUnique({
        where: { id: parsedId },
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
      return res.json(currentApplication);
    }

    const updatedApplication = await prisma.jobApplication.update({
      where: { id: parsedId },
      data: updateData,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
            isTravelAgentPosition: true
          }
        },
        reviewedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // If status changed to HIRED, provision/link Agent profile from the job application.
    // This is the only supported recruitment method for agents.
    if (statusChanged && newStatus === "HIRED") {
      try {
        if (existingApplication.agentId) {
          // Already linked to an agent profile.
        } else {
          const agentData = (existingApplication.agentApplicationData ?? {}) as any;
          const appRegion = typeof (existingApplication as any).region === "string" ? String((existingApplication as any).region).trim() : "";
          const appDistrict = typeof (existingApplication as any).district === "string" ? String((existingApplication as any).district).trim() : "";
          const appNationality = typeof (existingApplication as any).nationality === "string" && String((existingApplication as any).nationality).trim()
            ? String((existingApplication as any).nationality).trim()
            : (typeof agentData.nationality === "string" ? String(agentData.nationality).trim() : "");

          // Business rule: only applicants who applied as an agent should be provisioned as Agents
          // and receive the Agent Portal onboarding email.
          // Source of truth signal: the Job flag (set by admin when announcing the job).
          const shouldProvisionAgent = Boolean((existingApplication.job as any)?.isTravelAgentPosition);
          if (shouldProvisionAgent) {
            const email = String(existingApplication.email || "").trim().toLowerCase();
            const phone = String(existingApplication.phone || "").trim();

            const userOr: any[] = [];
            if (email) userOr.push({ email });
            if (phone) userOr.push({ phone });

            await prisma.$transaction(async (tx) => {
              // Find or create user account
              let user = await tx.user.findFirst({
                where: userOr.length > 0 ? { OR: userOr } : undefined,
              });

              if (!user) {
                user = await tx.user.create({
                  data: {
                    email: email || undefined,
                    phone: phone || undefined,
                    name: existingApplication.fullName,
                    fullName: existingApplication.fullName,
                    role: "AGENT",
                    nationality: appNationality || undefined,
                    region: appRegion || undefined,
                    district: appDistrict || undefined,
                  } as any,
                });
              } else {
                const userUpdate: any = {};
                if ((user as any).role !== "AGENT") userUpdate.role = "AGENT";
                if (!(user as any).fullName && existingApplication.fullName) userUpdate.fullName = existingApplication.fullName;
                if (!(user as any).name && existingApplication.fullName) userUpdate.name = existingApplication.fullName;
                if (!(user as any).nationality && appNationality) userUpdate.nationality = appNationality;
                if (!(user as any).region && appRegion) userUpdate.region = appRegion;
                if (!(user as any).district && appDistrict) userUpdate.district = appDistrict;

                if (Object.keys(userUpdate).length > 0) {
                  user = await tx.user.update({
                    where: { id: user.id },
                    data: userUpdate as any,
                  });
                }
              }

              // Create a one-time password setup token/link (re-uses reset-password mechanism)
              // This avoids emailing plaintext temporary passwords.
              try {
                const raw = crypto.randomBytes(24).toString("hex");
                const hashed = crypto.createHash("sha256").update(raw).digest("hex");
                const expiresAt = Date.now() + 1000 * 60 * 60 * 24; // 24 hours

                await tx.user.update({
                  where: { id: user.id },
                  data: {
                    resetPasswordToken: hashed as any,
                    resetPasswordExpires: new Date(expiresAt) as any,
                  } as any,
                });

                const origin = process.env.WEB_ORIGIN || process.env.APP_ORIGIN || "http://localhost:3000";
                const next = encodeURIComponent("/account/agent");
                (req as any)._agentOnboarding = {
                  username: email || phone || "",
                  setupLink: `${origin}/account/reset-password?token=${raw}&id=${user.id}&next=${next}&reason=onboarding`,
                  expiresHours: 24,
                };
              } catch (e) {
                // token generation failure should not block hiring
              }

              // Ensure agent profile exists
              let agentProfile = await tx.agent.findUnique({
                where: { userId: user.id },
              });

              const normalizeLanguageStrings = (value: unknown): string[] => {
                if (!Array.isArray(value)) return [];
                const out: string[] = [];
                for (const item of value) {
                  if (typeof item === "string") {
                    const trimmed = item.trim();
                    if (trimmed) out.push(trimmed);
                    continue;
                  }
                  if (item && typeof item === "object") {
                    const maybeLanguage = (item as any).language;
                    if (typeof maybeLanguage === "string") {
                      const trimmed = maybeLanguage.trim();
                      if (trimmed) out.push(trimmed);
                    }
                  }
                }
                return Array.from(new Set(out));
              };

              const applicationEducationLevel = (existingApplication as any).educationLevel
                ? String((existingApplication as any).educationLevel)
                : null;

              const applicationYearsOfExperience = (existingApplication as any).yearsOfExperience != null
                ? Number((existingApplication as any).yearsOfExperience)
                : null;

              const applicationLanguages = normalizeLanguageStrings((existingApplication as any).languages);
              const agentDataLanguages = normalizeLanguageStrings((agentData as any).languages);

              const jobAreaOfOperationRaw = typeof (existingApplication.job as any)?.locationDetail === "string"
                ? String((existingApplication.job as any).locationDetail).trim()
                : "";

              const inferredAreasFromJob = Array.from(
                new Set(
                  jobAreaOfOperationRaw
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean)
                )
              );

              const normalizeAreas = (value: unknown): string[] => {
                if (!Array.isArray(value)) return [];
                return Array.from(
                  new Set(
                    value
                      .filter((v) => typeof v === "string")
                      .map((v) => v.trim())
                      .filter(Boolean)
                  )
                );
              };

              if (!agentProfile) {
                agentProfile = await tx.agent.create({
                  data: {
                    user: { connect: { id: user.id } },
                    status: agentData.status || "ACTIVE",
                    educationLevel: applicationEducationLevel || agentData.educationLevel || null,
                    yearsOfExperience: applicationYearsOfExperience != null
                      ? applicationYearsOfExperience
                      : (agentData.yearsOfExperience != null ? Number(agentData.yearsOfExperience) : null),
                    bio: agentData.bio || null,
                    maxActiveRequests: agentData.maxActiveRequests != null ? Number(agentData.maxActiveRequests) : 10,
                    isAvailable: agentData.isAvailable !== undefined ? Boolean(agentData.isAvailable) : true,
                    currentActiveRequests: 0,
                    areasOfOperation:
                      inferredAreasFromJob.length > 0
                        ? inferredAreasFromJob
                        : (Array.isArray(agentData.areasOfOperation) && agentData.areasOfOperation.length > 0 ? agentData.areasOfOperation : null),
                    certifications: Array.isArray(agentData.certifications) && agentData.certifications.length > 0 ? agentData.certifications : null,
                    languages: applicationLanguages.length > 0 ? applicationLanguages : (agentDataLanguages.length > 0 ? agentDataLanguages : null),
                    specializations: Array.isArray(agentData.specializations) && agentData.specializations.length > 0 ? agentData.specializations : null,
                  } as any,
                });
              } else {
                // Best-effort: fill missing agent profile fields from application data
                const agentUpdate: any = {};
                const incomingAreas = Array.isArray(agentData.areasOfOperation) ? agentData.areasOfOperation : [];
                const incomingSpecs = Array.isArray(agentData.specializations) ? agentData.specializations : [];
                const existingAreas = Array.isArray((agentProfile as any).areasOfOperation) ? (agentProfile as any).areasOfOperation : null;
                const existingSpecs = Array.isArray((agentProfile as any).specializations) ? (agentProfile as any).specializations : null;

                const existingLanguages = Array.isArray((agentProfile as any).languages) ? (agentProfile as any).languages : null;
                const existingEducation = (agentProfile as any).educationLevel ? String((agentProfile as any).educationLevel) : null;
                const existingYears = (agentProfile as any).yearsOfExperience != null ? Number((agentProfile as any).yearsOfExperience) : null;

                // Areas of Operation must match the job advert when set.
                if (inferredAreasFromJob.length > 0) {
                  const currentAreas = normalizeAreas(existingAreas);
                  const advertAreas = inferredAreasFromJob;
                  const same = currentAreas.length === advertAreas.length && currentAreas.every((v, idx) => v === advertAreas[idx]);
                  if (!same) agentUpdate.areasOfOperation = advertAreas;
                } else if ((!existingAreas || existingAreas.length === 0) && incomingAreas.length > 0) {
                  agentUpdate.areasOfOperation = incomingAreas;
                }
                if ((!existingSpecs || existingSpecs.length === 0) && incomingSpecs.length > 0) agentUpdate.specializations = incomingSpecs;

                if (!existingEducation && (applicationEducationLevel || agentData.educationLevel)) {
                  agentUpdate.educationLevel = applicationEducationLevel || agentData.educationLevel;
                }

                if (existingYears == null) {
                  const incomingYears = applicationYearsOfExperience != null
                    ? applicationYearsOfExperience
                    : (agentData.yearsOfExperience != null ? Number(agentData.yearsOfExperience) : null);
                  if (incomingYears != null) agentUpdate.yearsOfExperience = incomingYears;
                }

                if ((!existingLanguages || existingLanguages.length === 0)) {
                  const incomingLanguages = applicationLanguages.length > 0
                    ? applicationLanguages
                    : (agentDataLanguages.length > 0 ? agentDataLanguages : []);
                  if (incomingLanguages.length > 0) agentUpdate.languages = incomingLanguages;
                }

                if (Object.keys(agentUpdate).length > 0) {
                  agentProfile = await tx.agent.update({
                    where: { id: (agentProfile as any).id },
                    data: agentUpdate as any,
                  });
                }
              }

              // Link application to agent
              await tx.jobApplication.update({
                where: { id: parsedId },
                data: { agentId: agentProfile.id },
              });

              console.log(`Provisioned Agent profile (ID: ${agentProfile.id}) for HIRED application ${parsedId} (User ID: ${user.id})`);
            });
          }
        }
      } catch (agentError: any) {
        // Log error but don't fail the request - status update was successful
        console.error("Error provisioning Agent profile from HIRED application:", agentError);
        console.error("Agent provisioning error details:", {
          message: agentError.message,
          code: agentError.code,
          applicationId: parsedId,
          email: existingApplication.email,
        });
      }
    }

    // Re-fetch updated application with all relations (including agent if created)
    const finalApplication = await prisma.jobApplication.findUnique({
      where: { id: parsedId },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
            isTravelAgentPosition: true
          }
        },
        reviewedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        agent: {
          select: {
            id: true,
            userId: true,
            status: true
          }
        }
      }
    });

    if (!finalApplication) {
      return res.status(404).json({ error: "Application not found after update" });
    }

    // Audit log
    await audit(req as any, "JOB_APPLICATION_UPDATE", "JOB_APPLICATION", existingApplication, finalApplication);

    // Send email notification if status changed to a notifiable status
    if (statusChanged && newStatus && ["REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"].includes(newStatus)) {
      try {
        const onboarding = (req as any)._agentOnboarding as
          | { username?: string; setupLink?: string; expiresHours?: number }
          | undefined;

        const origin = process.env.WEB_ORIGIN || process.env.APP_ORIGIN || "http://localhost:3000";

        const isAgentHire = Boolean((finalApplication.job as any)?.isTravelAgentPosition);

        // For agent hires, guarantee HIRED emails include a one-time setup link (even if the agent profile already existed)
        let hiredSetupLink: string | undefined = onboarding?.setupLink;
        let hiredUsername: string | undefined = onboarding?.username;
        let hiredSetupExpiresHours: number | undefined = onboarding?.expiresHours;

        if (isAgentHire && newStatus === "HIRED" && (!hiredSetupLink || !hiredUsername)) {
          try {
            const email = String(finalApplication.email || "").trim().toLowerCase();
            const phone = String(finalApplication.phone || "").trim();

            hiredUsername = hiredUsername || email || phone;

            let userId: number | null = null;
            if ((finalApplication as any).agent?.userId) userId = Number((finalApplication as any).agent.userId);

            if (!userId && (finalApplication as any).agent?.id) {
              const a = await prisma.agent.findUnique({
                where: { id: Number((finalApplication as any).agent.id) },
                select: { userId: true },
              });
              if (a?.userId) userId = a.userId;
            }

            if (!userId && (email || phone)) {
              const u = await prisma.user.findFirst({
                where: {
                  OR: [
                    ...(email ? [{ email }] : []),
                    ...(phone ? [{ phone } as any] : []),
                  ],
                } as any,
                select: { id: true },
              });
              if (u?.id) userId = u.id;
            }

            if (userId) {
              const raw = crypto.randomBytes(24).toString("hex");
              const hashed = crypto.createHash("sha256").update(raw).digest("hex");
              const expiresAt = Date.now() + 1000 * 60 * 60 * 24; // 24 hours

              await prisma.user.update({
                where: { id: userId },
                data: {
                  resetPasswordToken: hashed as any,
                  resetPasswordExpires: new Date(expiresAt) as any,
                } as any,
                select: { id: true },
              });

              const next = encodeURIComponent("/account/agent");
              hiredSetupExpiresHours = 24;
              hiredSetupLink = `${origin}/account/reset-password?token=${raw}&id=${userId}&next=${next}&reason=onboarding`;
            }
          } catch {
            // Do not fail email sending if token generation fails
          }
        }

        const emailData = {
          applicantName: finalApplication.fullName,
          jobTitle: finalApplication.job.title,
          jobDepartment: finalApplication.job.department || undefined,
          status: newStatus as "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED",
          adminNotes: finalApplication.adminNotes || undefined,
          companyName: process.env.COMPANY_NAME || "NoLSAF Inc Limited",
          supportEmail: process.env.SUPPORT_EMAIL || process.env.CAREERS_EMAIL || "careers@nolsaf.com",
          ...(newStatus === "HIRED" && isAgentHire
            ? {
                portalUrl: `${origin}/account/agent`,
                loginUrl: `${origin}/account/login`,
                username: hiredUsername || String(finalApplication.email || "").trim().toLowerCase() || String(finalApplication.phone || "").trim(),
                setupLink: hiredSetupLink,
                setupLinkExpiresHours: hiredSetupExpiresHours,
              }
            : null),
        };

        const subject = getApplicationEmailSubject(emailData.status, emailData.jobTitle);
        const html = generateApplicationStatusEmail(emailData);

        if (newStatus === "HIRED" && isAgentHire && !hiredSetupLink) {
          console.warn("careers.hired-email.missing-setup-link", {
            applicationId: parsedId,
            applicantEmail: finalApplication.email,
            agentUserId: finalApplication.agent?.userId ?? null,
            origin,
            hasWebOrigin: Boolean(process.env.WEB_ORIGIN),
            hasAppOrigin: Boolean(process.env.APP_ORIGIN),
          });
        }

        await sendMail(finalApplication.email, subject, html);
        
        console.log(`Application status email sent to ${finalApplication.email} for status: ${newStatus}`);
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
router.delete("/:id", async (req, res) => {
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
router.get("/export", async (req, res) => {
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
router.patch("/bulk", async (req, res) => {
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

    const finalized = existingApplications.filter(
      (app) => (app.status === "HIRED" || app.status === "REJECTED") && app.status !== status
    );
    if (finalized.length > 0) {
      return res.status(409).json({
        error: "Some applications are finalized (HIRED/REJECTED) and cannot be changed",
        finalizedIds: finalized.map((a) => a.id),
      });
    }

    // Safety: Agent hires require provisioning + a one-time Agent Portal setup link.
    // Bulk HIRED does not provision agents, so block it for agent applications.
    if (status === "HIRED") {
      const agentJobApps = existingApplications.filter((app) => Boolean((app as any)?.job?.isTravelAgentPosition));
      if (agentJobApps.length > 0) {
        return res.status(409).json({
          error: "Some selected applications belong to Travel Agent recruitment jobs and cannot be bulk-marked HIRED. Hire them individually to trigger agent provisioning and onboarding email.",
          agentApplicationIds: agentJobApps.map((a) => a.id),
        });
      }
    }

    const applicationsToUpdate = existingApplications.filter((app) => app.status !== status || adminNotes !== undefined);
    if (applicationsToUpdate.length === 0) {
      return res.json({
        success: true,
        updated: 0,
        applications: [],
      });
    }

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
    const updatePromises = applicationsToUpdate.map(async (app) => {
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
            supportEmail: process.env.SUPPORT_EMAIL || process.env.CAREERS_EMAIL || "careers@nolsaf.com"
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
router.delete("/bulk", async (req, res) => {
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

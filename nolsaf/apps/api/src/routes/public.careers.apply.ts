// apps/api/src/routes/public.careers.apply.ts
import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { notifyAdmins } from "../lib/notifications.js";
import { AFRICA_NATIONALITY_VALUES, AGENT_SPECIALIZATION_VALUES } from "@nolsaf/shared";
// Generate unique filename
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

const router = Router();

function countWords(text: unknown): number {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Resume must be a PDF or Word document'));
    }
  }
});

// Initialize S3 client if credentials are available
// Check both AWS_S3_BUCKET and S3_BUCKET for compatibility
const s3BucketName = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET;
const s3Client = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && s3BucketName
  ? new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

/**
 * POST /api/careers/apply
 * Submit a job application
 */
router.post("/", upload.single('resume'), async (req, res) => {
  try {
    const {
      jobId,
      fullName,
      email,
      phone,
      region,
      district,
      nationality,
      educationLevel,
      languages,
      yearsOfExperience,
      coverLetter,
      portfolio,
      linkedIn,
      referredBy,
      // Agent-specific fields (for Travel Agent positions)
      agentApplicationData
    } = req.body;

    const resume = req.file;

    // Validation
    if (!jobId || !fullName || !email || !phone || !region || !district || !coverLetter) {
      return res.status(400).json({ 
        error: "Missing required fields: jobId, fullName, email, phone, region, district, and coverLetter are required" 
      });
    }

    const ABOUT_MIN_WORDS = 120;
    const ABOUT_MAX_WORDS = 250;
    const aboutWords = countWords(coverLetter);
    if (aboutWords < ABOUT_MIN_WORDS || aboutWords > ABOUT_MAX_WORDS) {
      return res.status(400).json({
        error: `Tell us about yourself must be between ${ABOUT_MIN_WORDS} and ${ABOUT_MAX_WORDS} words`,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Validate phone format: digits only, optional leading +
    const normalizedPhone = String(phone ?? "").trim();
    const phoneRegex = /^\+?[0-9]+$/;
    if (!phoneRegex.test(normalizedPhone)) {
      return res.status(400).json({
        error: "Invalid phone number format. Use digits only, optionally starting with +",
      });
    }

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id: parseInt(jobId, 10) }
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Check if job is still accepting applications
    if (job.status !== "ACTIVE") {
      return res.status(400).json({ error: "This job is no longer accepting applications" });
    }

    if (job.applicationDeadline) {
      const deadline = new Date(job.applicationDeadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      deadline.setHours(23, 59, 59, 999);
      if (today > deadline) {
        return res.status(400).json({ error: "Application deadline has passed" });
      }
    }

    // Upload resume to S3 if available
    let resumeStorageKey: string | null = null;
    let resumeUrl: string | null = null;

    if (resume && s3Client && s3BucketName) {
      try {
        const fileExtension = resume.originalname.split('.').pop() || 'pdf';
        const fileName = `careers/resumes/${generateUniqueId()}.${fileExtension}`;
        
        const uploadCommand = new PutObjectCommand({
          Bucket: s3BucketName,
          Key: fileName,
          Body: resume.buffer,
          ContentType: resume.mimetype,
        });

        await s3Client.send(uploadCommand);
        resumeStorageKey = fileName;
        resumeUrl = `s3://${s3BucketName}/${fileName}`;
      } catch (s3Error: any) {
        console.error("S3 upload error:", s3Error);
        // Continue without resume URL if S3 fails - application can still be saved
      }
    }

    const isAgentRecruitmentJob = Boolean((job as any)?.isTravelAgentPosition);
    const requiredEducationLevel = String((job as any)?.requiredEducationLevel || "").trim();

    // Parse agent application data if provided.
    // We use it for controlled fields like specializations.
    let parsedAgentData: any = null;
    if (agentApplicationData) {
      try {
        parsedAgentData = typeof agentApplicationData === 'string'
          ? JSON.parse(agentApplicationData)
          : agentApplicationData;
      } catch (parseError) {
        console.warn("Failed to parse agentApplicationData:", parseError);
        // Continue without agent data rather than failing
      }
    }

    if (parsedAgentData && typeof parsedAgentData === "object") {
      // Normalize specializations to a controlled list (array of strings)
      const rawSpecs = (parsedAgentData as any).specializations;
      const specs = Array.isArray(rawSpecs)
        ? rawSpecs.map((x: any) => String(x).trim()).filter(Boolean)
        : [];
      const filtered = Array.from(new Set(specs)).filter((s) => AGENT_SPECIALIZATION_VALUES.has(s));
      (parsedAgentData as any).specializations = filtered.length > 0 ? filtered : null;
    }

    // Normalize top-level nationality / education / languages
    const normalizedNationality = String(nationality ?? "").trim();
    const normalizedEducationLevel = String(educationLevel ?? "").trim();

    const normalizedYearsOfExperience = (() => {
      const raw = String(yearsOfExperience ?? "").trim();
      if (!raw) return null;
      const n = parseInt(raw, 10);
      if (Number.isNaN(n)) return null;
      if (n < 0) return 0;
      if (n > 80) return 80;
      return n;
    })();

    let normalizedLanguages: string[] = [];
    try {
      const raw = languages;
      if (typeof raw === "string" && raw.trim()) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) normalizedLanguages = parsed.map((x) => String(x).trim()).filter(Boolean);
      } else if (Array.isArray(raw)) {
        normalizedLanguages = raw.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch {
      // Ignore malformed languages payload
    }

    // Required for all job applications
    if (!normalizedNationality) {
      return res.status(400).json({ error: "Nationality is required" });
    }
    if (!AFRICA_NATIONALITY_VALUES.has(normalizedNationality)) {
      return res.status(400).json({ error: "Please select a valid nationality from the list" });
    }
    if (!normalizedEducationLevel) {
      return res.status(400).json({ error: "Education level is required" });
    }
    if (normalizedYearsOfExperience == null) {
      return res.status(400).json({ error: "Years of experience is required" });
    }
    if (!normalizedLanguages || normalizedLanguages.length === 0) {
      return res.status(400).json({ error: "Please provide at least one language" });
    }

    // Required for all job applications
    const selectedSpecializations = Array.isArray(parsedAgentData?.specializations)
      ? (parsedAgentData.specializations as any[]).map((x: any) => String(x).trim()).filter(Boolean)
      : [];
    if (selectedSpecializations.length === 0) {
      return res.status(400).json({ error: "Please provide at least one specialization" });
    }

    if (isAgentRecruitmentJob) {
      const selectedNationality = normalizedNationality || String(parsedAgentData?.nationality || "").trim();
      if (!selectedNationality) {
        return res.status(400).json({ error: "Nationality is required for Travel Agent positions" });
      }
      if (!AFRICA_NATIONALITY_VALUES.has(selectedNationality)) {
        return res.status(400).json({ error: "Please select a valid nationality from the list" });
      }

      const selectedEducationLevel = normalizedEducationLevel || String(parsedAgentData?.educationLevel || "").trim();
      if (!selectedEducationLevel) {
        return res.status(400).json({ error: "Education level is required for Travel Agent positions" });
      }

      const selectedYears = normalizedYearsOfExperience ?? (parsedAgentData?.yearsOfExperience != null ? Number(parsedAgentData.yearsOfExperience) : null);
      if (selectedYears == null || Number.isNaN(selectedYears)) {
        return res.status(400).json({ error: "Years of experience is required for Travel Agent positions" });
      }
      if (selectedYears < 0) {
        return res.status(400).json({ error: "Years of experience must be 0 or more" });
      }

      const agentLanguages = Array.isArray(parsedAgentData?.languages)
        ? parsedAgentData.languages.map((x: any) => String(x).trim()).filter(Boolean)
        : [];
      const selectedLanguages = normalizedLanguages.length > 0 ? normalizedLanguages : agentLanguages;
      if (!selectedLanguages || selectedLanguages.length === 0) {
        return res.status(400).json({ error: "Please provide at least one language" });
      }

      if (requiredEducationLevel) {
        if (selectedEducationLevel !== requiredEducationLevel) {
          return res.status(400).json({
            error: `Education level must match the job requirement (${requiredEducationLevel})`,
          });
        }
      }
    }

    // If advert specifies an education requirement, enforce it for all applicants
    if (requiredEducationLevel && normalizedEducationLevel !== requiredEducationLevel) {
      return res.status(400).json({
        error: `Education level must match the job requirement (${requiredEducationLevel})`,
      });
    }

    // Create application record
    const application = await prisma.jobApplication.create({
      data: {
        jobId: parseInt(jobId, 10),
        fullName,
        email,
        phone: normalizedPhone,
        region: String(region || "").trim() || null,
        district: String(district || "").trim() || null,
        nationality: normalizedNationality || (isAgentRecruitmentJob ? String(parsedAgentData?.nationality || "").trim() || null : null),
        educationLevel: (normalizedEducationLevel || (isAgentRecruitmentJob ? String(parsedAgentData?.educationLevel || "").trim() : "")) || null,
        yearsOfExperience: normalizedYearsOfExperience ?? (isAgentRecruitmentJob && parsedAgentData?.yearsOfExperience != null ? Number(parsedAgentData.yearsOfExperience) : null),
        languages: normalizedLanguages.length > 0 ? normalizedLanguages : null,
        coverLetter,
        portfolio: portfolio || null,
        linkedIn: linkedIn || null,
        referredBy: referredBy || null,
        resumeFileName: resume?.originalname || null,
        resumeStorageKey,
        resumeUrl,
        resumeSize: resume?.size || null,
        resumeType: resume?.mimetype || null,
        status: "PENDING",
        agentApplicationData: parsedAgentData
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true
          }
        }
      }
    });

    // Admin inbox notification (best-effort)
    try {
      await notifyAdmins("careers_application_submitted", {
        applicationId: application.id,
        jobId: application.job?.id,
        jobTitle: application.job?.title,
        department: application.job?.department,
        fullName,
        email,
        phone,
        type: "careers",
        link: "/admin/careers/applications",
      });
    } catch (notifyErr: any) {
      console.warn("Failed to notify admins for new career application:", notifyErr?.message || notifyErr);
    }

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      applicationId: application.id
    });
  } catch (error: any) {
    console.error("Error submitting application:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    
    if (error.message && error.message.includes("Resume must be")) {
      return res.status(400).json({ error: error.message });
    }
    
    // Check if it's a Prisma error (model not found, etc.)
    if (error.code === 'P2021' || error.code === 'P2022' || error.message?.includes('jobApplication') || error.message?.includes('JobApplication')) {
      console.error("Prisma schema mismatch - JobApplication model may not be generated");
      return res.status(500).json({ 
        error: "Database schema not updated. Please restart the server after running 'npx prisma generate'." 
      });
    }
    
    return res.status(500).json({ 
      error: error.message || "Failed to submit application. Please try again or email careers@nolsaf.com directly.",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

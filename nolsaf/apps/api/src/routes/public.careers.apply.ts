// apps/api/src/routes/public.careers.apply.ts
import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { notifyAdmins } from "../lib/notifications.js";
import { limitPublicCareerApply } from "../middleware/rateLimit.js";
// Inlined from @nolsaf/shared to avoid workspace dependency on EB
const AFRICA_NATIONALITY_VALUES = new Set(["Tanzania","Kenya","Uganda","Rwanda","Burundi","Democratic Republic of the Congo","Djibouti","Eritrea","Ethiopia","Somalia","South Sudan","Angola","Botswana","Eswatini","Lesotho","Madagascar","Malawi","Mauritius","Mozambique","Namibia","South Africa","Zambia","Zimbabwe"]);
const AGENT_SPECIALIZATION_VALUES = new Set(["Safari Tours","Beach Holidays","Cultural Tours","Mountain Trekking","City Tours","Group Travel","Honeymoon","Family Travel","Luxury Travel","Budget Travel","Corporate Travel","Adventure Travel"]);
// Generate unique filename
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

const router = Router();

const RESUME_MIME_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export function isCareerResumeFileTypeAllowed(mimetype: string): boolean {
  return Object.prototype.hasOwnProperty.call(RESUME_MIME_EXTENSIONS, mimetype);
}

function countWords(text: unknown): number {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    fieldSize: 128 * 1024,
    fields: 25,
    files: 1,
    parts: 30,
  },
  fileFilter: (req, file, cb) => {
    if (isCareerResumeFileTypeAllowed(file.mimetype)) {
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
router.post("/", limitPublicCareerApply as any, upload.single('resume'), async (req, res) => {
  try {
    const {
      jobId,
      fullName,
      email,
      phone,
      region,
      district,
      nationality,
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

    const ABOUT_MIN_WORDS = 60;
    const ABOUT_MAX_WORDS = 100;
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
        const fileExtension = RESUME_MIME_EXTENSIONS[resume.mimetype] || 'pdf';
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

    const normalizeOptionalText = (value: unknown, max = 255): string | null => {
      const text = String(value ?? "").trim();
      if (!text) return null;
      return text.slice(0, max);
    };

    const normalizeOptionalInteger = (value: unknown, min: number, max: number): number | null => {
      const raw = String(value ?? "").trim();
      if (!raw) return null;
      const n = Number.parseInt(raw, 10);
      if (Number.isNaN(n)) return null;
      return Math.max(min, Math.min(max, n));
    };

    if (parsedAgentData && typeof parsedAgentData === "object") {
      // Normalize specializations to a controlled list (array of strings)
      const rawSpecs = (parsedAgentData as any).specializations;
      const specs = Array.isArray(rawSpecs)
        ? rawSpecs.map((x: any) => String(x).trim()).filter(Boolean)
        : [];
      const filtered = Array.from(new Set(specs)).filter((s) => AGENT_SPECIALIZATION_VALUES.has(s));
      (parsedAgentData as any).specializations = filtered.length > 0 ? filtered : null;

      const rawPartnershipProfile = (parsedAgentData as any).partnershipProfile;
      const partnershipSource = rawPartnershipProfile && typeof rawPartnershipProfile === "object"
        ? rawPartnershipProfile
        : parsedAgentData;
      const rawServices = (partnershipSource as any).services;
      const partnershipServices = Array.isArray(rawServices)
        ? Array.from(new Set(rawServices.map((x: any) => String(x).trim()).filter(Boolean))).slice(0, 40)
        : [];
      const rawTourismTypes = (partnershipSource as any).tourismTypes;
      const tourismTypes = Array.isArray(rawTourismTypes)
        ? Array.from(new Set(rawTourismTypes.map((x: any) => String(x).trim()).filter(Boolean))).slice(0, 40)
        : [];
      const rawToolsAndAssets = (partnershipSource as any).toolsAndAssets;
      const toolsAndAssets = Array.isArray(rawToolsAndAssets)
        ? Array.from(new Set(rawToolsAndAssets.map((x: any) => String(x).trim()).filter(Boolean))).slice(0, 120)
        : [];
      const rawServiceClassification = (partnershipSource as any).serviceClassification;
      const serviceClassification = rawServiceClassification && typeof rawServiceClassification === "object" && !Array.isArray(rawServiceClassification)
        ? Object.fromEntries(
          Object.entries(rawServiceClassification as Record<string, unknown>)
            .map(([category, value]) => {
              const normalizedList = Array.isArray(value)
                ? Array.from(
                  new Set(
                    value
                      .map((x: any) => String(x).trim())
                      .filter((x: string) => x && partnershipServices.includes(x)),
                  ),
                ).slice(0, 80)
                : [];
              return [String(category).trim(), normalizedList] as const;
            })
            .filter(([category, list]) => Boolean(category) && list.length > 0),
        )
        : {};
      const rawRegisteredParks = (partnershipSource as any).registeredParks;
      const registeredParks = Array.isArray(rawRegisteredParks)
        ? Array.from(new Set(rawRegisteredParks.map((x: any) => String(x).trim()).filter(Boolean))).slice(0, 120)
        : [];
      const rawFleet = Array.isArray((partnershipSource as any).fleet)
        ? (partnershipSource as any).fleet
        : (Array.isArray((partnershipSource as any).vehicles) ? (partnershipSource as any).vehicles : []);
      const hasVehiclesRaw = (partnershipSource as any).hasVehicles;
      const hasVehicles = typeof hasVehiclesRaw === "boolean"
        ? hasVehiclesRaw
        : rawFleet.length > 0;
      const normalizedFleet = rawFleet
        .map((item: any) => {
          const type = normalizeOptionalText(item?.type, 120);
          const ownershipRaw = String(item?.ownership ?? "").trim().toLowerCase();
          const ownership = ownershipRaw === "rented" || ownershipRaw === "leased" ? ownershipRaw : "company_owned";
          const count = normalizeOptionalInteger(item?.count, 1, 1000);
          const capacity = normalizeOptionalInteger(item?.capacity, 1, 100);
          const condition = normalizeOptionalText(item?.condition, 240);
          const registrationNumber = normalizeOptionalText(item?.registrationNumber, 120);
          const serviceMode = normalizeOptionalText(item?.serviceMode, 120);
          if (!type || count === null || capacity === null) return null;
          return {
            type,
            ownership,
            count,
            capacity,
            condition,
            registrationNumber,
            serviceMode,
          };
        })
        .filter(Boolean)
        .slice(0, 120);

      (parsedAgentData as any).partnershipProfile = {
        companyName: normalizeOptionalText((partnershipSource as any).companyName, 200),
        businessAddress: normalizeOptionalText((partnershipSource as any).businessAddress, 500),
        companyEmail: normalizeOptionalText((partnershipSource as any).companyEmail, 255),
        companyPhone: normalizeOptionalText((partnershipSource as any).companyPhone, 40),
        companyWebsite: normalizeOptionalText((partnershipSource as any).companyWebsite, 500),
        businessRegistrationNumber: normalizeOptionalText((partnershipSource as any).businessRegistrationNumber, 120),
        tinNumber: normalizeOptionalText((partnershipSource as any).tinNumber, 120),
        businessLicenseNumber: normalizeOptionalText((partnershipSource as any).businessLicenseNumber, 120),
        tourismPermitNumber: normalizeOptionalText((partnershipSource as any).tourismPermitNumber, 120),
        vehiclePermitNumber: normalizeOptionalText((partnershipSource as any).vehiclePermitNumber, 120),
        yearsInOperation: normalizeOptionalInteger((partnershipSource as any).yearsInOperation, 0, 100),
        teamSize: normalizeOptionalInteger((partnershipSource as any).teamSize, 1, 100000),
        tourismTypes: tourismTypes.length > 0 ? tourismTypes : null,
        services: partnershipServices.length > 0 ? partnershipServices : null,
        serviceClassification: Object.keys(serviceClassification).length > 0 ? serviceClassification : null,
        toolsAndAssets: toolsAndAssets.length > 0 ? toolsAndAssets : null,
        registeredParks: registeredParks.length > 0 ? registeredParks : null,
        hasVehicles,
        fleet: normalizedFleet.length > 0 ? normalizedFleet : null,
      };
    }

    // Normalize top-level nationality / languages
    const normalizedNationality = String(nationality ?? "").trim();

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

      const agentLanguages = Array.isArray(parsedAgentData?.languages)
        ? parsedAgentData.languages.map((x: any) => String(x).trim()).filter(Boolean)
        : [];
      const selectedLanguages = normalizedLanguages.length > 0 ? normalizedLanguages : agentLanguages;
      if (!selectedLanguages || selectedLanguages.length === 0) {
        return res.status(400).json({ error: "Please provide at least one language" });
      }

      const partnershipProfile = parsedAgentData && typeof parsedAgentData === "object"
        ? (parsedAgentData as any).partnershipProfile
        : null;

      if (!partnershipProfile || typeof partnershipProfile !== "object") {
        return res.status(400).json({ error: "Partnership company information is required" });
      }

      if (!String(partnershipProfile.companyName || "").trim()) {
        return res.status(400).json({ error: "Company name is required for partnership applications" });
      }

      if (!String(partnershipProfile.businessAddress || "").trim()) {
        return res.status(400).json({ error: "Business address is required for partnership applications" });
      }

      const companyEmail = String(partnershipProfile.companyEmail || "").trim();
      if (companyEmail && !emailRegex.test(companyEmail)) {
        return res.status(400).json({ error: "Invalid company email format" });
      }

      const companyPhone = String(partnershipProfile.companyPhone || "").trim();
      if (!companyPhone) {
        return res.status(400).json({ error: "Company phone is required for partnership applications" });
      }
      if (!/^\+?[0-9]+$/.test(companyPhone)) {
        return res.status(400).json({ error: "Invalid company phone format. Use digits only, optionally starting with +" });
      }

      const services = Array.isArray(partnershipProfile.services)
        ? partnershipProfile.services.map((x: any) => String(x).trim()).filter(Boolean)
        : [];
      if (services.length === 0) {
        return res.status(400).json({ error: "Please provide at least one partnership service" });
      }

      const tourismTypes = Array.isArray(partnershipProfile.tourismTypes)
        ? partnershipProfile.tourismTypes.map((x: any) => String(x).trim()).filter(Boolean)
        : [];
      if (tourismTypes.length === 0) {
        return res.status(400).json({ error: "Please provide at least one tourism type" });
      }
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

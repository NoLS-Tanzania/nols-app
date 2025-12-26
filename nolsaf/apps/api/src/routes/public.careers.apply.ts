// apps/api/src/routes/public.careers.apply.ts
import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// Generate unique filename
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

const router = Router();

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
      coverLetter,
      portfolio,
      linkedIn,
      referredBy
    } = req.body;

    const resume = req.file;

    // Validation
    if (!jobId || !fullName || !email || !phone || !coverLetter) {
      return res.status(400).json({ 
        error: "Missing required fields: jobId, fullName, email, phone, and coverLetter are required" 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
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

    // Create application record
    const application = await prisma.jobApplication.create({
      data: {
        jobId: parseInt(jobId, 10),
        fullName,
        email,
        phone,
        coverLetter,
        portfolio: portfolio || null,
        linkedIn: linkedIn || null,
        referredBy: referredBy || null,
        resumeFileName: resume?.originalname || null,
        resumeStorageKey,
        resumeUrl,
        resumeSize: resume?.size || null,
        resumeType: resume?.mimetype || null,
        status: "PENDING"
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

    // TODO: Send email notification to admin/careers team
    // You can integrate with your email service here

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

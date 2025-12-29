import { Router, Request, Response } from "express";
import { prisma } from "@nolsaf/prisma";
import multer from "multer";
import { limitPlanRequestSubmit } from "../middleware/rateLimit.js";
import { sendMail } from "../lib/mailer.js";
import { getNewPlanRequestCustomerEmail, getNewPlanRequestAdminEmail } from "../lib/planRequestEmailTemplates.js";
import { notifyAdmins } from "../lib/notifications.js";

const router = Router();

// Use multer to parse multipart/form-data (FormData from browser)
// We don't actually store files, but multer is needed to parse the form data
const upload = multer();

/**
 * POST /api/plan-request
 * Public endpoint to submit a plan request (no authentication required)
 * Accepts multipart/form-data
 * Rate limited to prevent spam
 */
router.post("/", limitPlanRequestSubmit, upload.none(), async (req: Request, res: Response) => {
  try {
    // Ensure Content-Type is set for response
    res.setHeader('Content-Type', 'application/json');
    
    // Parse form data (multipart/form-data) - now parsed by multer
    const formData = req.body;
    
    // Log received data for debugging
    console.log('Plan request received:', {
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      contentType: req.headers['content-type'],
      role: formData?.role,
      fullName: formData?.fullName,
      'full-name': formData?.['full-name'],
      email: formData?.email,
      phone: formData?.phone,
      rawBody: req.body, // Log entire body for debugging
    });
    
    // Extract basic fields - tripType is required by schema
    const role = formData.role || null;
    // tripType is required, so default to "Other" if missing, null, undefined, or empty
    const tripTypeRaw = formData.tripType;
    const tripType = (tripTypeRaw && typeof tripTypeRaw === 'string' && tripTypeRaw.trim()) ? tripTypeRaw.trim() : "Other";
    const destinations = formData.destinations || null;
    const dateFrom = formData.dateFrom || null;
    const dateTo = formData.dateTo || null;
    const groupSize = formData.groupSize || null;
    const budget = formData.budget || null;
    const notes = formData.notes || null;
    
    // Contact information - fullName is required by schema
    // Check both 'fullName' and 'full-name' (form field name might be kebab-case)
    const fullNameRaw = formData.fullName || formData['full-name'] || null;
    const fullName = (fullNameRaw && String(fullNameRaw).trim()) ? String(fullNameRaw).trim() : null;
    const email = (formData.email && String(formData.email).trim()) ? String(formData.email).trim() : null;
    const phone = (formData.phone && String(formData.phone).trim()) ? String(formData.phone).trim() : null;
    
    // Transport information
    const transportRequired = formData.transportRequired || null;
    const vehicleType = formData.vehicleType || null;
    const pickupLocation = formData.pickupLocation || null;
    const dropoffLocation = formData.dropoffLocation || null;
    const vehiclesNeeded = formData.vehiclesNeeded || null;
    const passengerCount = formData.passengerCount || null;
    const vehicleRequirements = formData.vehicleRequirements || null;
    
    // Role-specific fields (Event planner, School, University, Community, Other)
    const roleSpecificData: any = {};
    
    // Event planner fields
    if (role === "Event planner") {
      if (formData.eventType) roleSpecificData.eventType = formData.eventType;
      if (formData.expectedAttendees) roleSpecificData.expectedAttendees = formData.expectedAttendees;
      if (formData.eventStartDate) roleSpecificData.eventStartDate = formData.eventStartDate;
      if (formData.eventEndDate) roleSpecificData.eventEndDate = formData.eventEndDate;
      if (formData.venuePreferences) roleSpecificData.venuePreferences = formData.venuePreferences;
      if (formData.accommodationNeeded) roleSpecificData.accommodationNeeded = formData.accommodationNeeded;
      if (formData.cateringRequired) roleSpecificData.cateringRequired = formData.cateringRequired;
      if (formData.avRequirements) roleSpecificData.avRequirements = formData.avRequirements;
      if (formData.budgetPerPerson) roleSpecificData.budgetPerPerson = formData.budgetPerPerson;
    }
    
    // School/Teacher fields
    if (role === "School / Teacher") {
      if (formData.studentsCount) roleSpecificData.studentsCount = formData.studentsCount;
      if (formData.chaperones) roleSpecificData.chaperones = formData.chaperones;
      if (formData.ageRange) roleSpecificData.ageRange = formData.ageRange;
      if (formData.learningObjectives) roleSpecificData.learningObjectives = formData.learningObjectives;
      if (formData.riskAssessment) roleSpecificData.riskAssessment = formData.riskAssessment;
      if (formData.specialNeedsSupport) roleSpecificData.specialNeedsSupport = formData.specialNeedsSupport;
    }
    
    // University fields
    if (role === "University") {
      if (formData.researchPurpose) roleSpecificData.researchPurpose = formData.researchPurpose;
      if (formData.staffCount) roleSpecificData.staffCount = formData.staffCount;
      if (formData.studentsCountUniv) roleSpecificData.studentsCountUniv = formData.studentsCountUniv;
      if (formData.ethicsApproval) roleSpecificData.ethicsApproval = formData.ethicsApproval;
      if (formData.sampleCollection) roleSpecificData.sampleCollection = formData.sampleCollection;
      if (formData.permitsNeeded) roleSpecificData.permitsNeeded = formData.permitsNeeded;
    }
    
    // Community group fields
    if (role === "Community group") {
      if (formData.communityObjectives) roleSpecificData.communityObjectives = formData.communityObjectives;
      if (formData.beneficiaries) roleSpecificData.beneficiaries = formData.beneficiaries;
      if (formData.projectDuration) roleSpecificData.projectDuration = formData.projectDuration;
      if (formData.localPartners) roleSpecificData.localPartners = formData.localPartners;
    }
    
    // Other fields
    if (role === "Other") {
      if (formData.otherDetails) roleSpecificData.otherDetails = formData.otherDetails;
      if (formData.attachments) roleSpecificData.attachments = formData.attachments;
    }
    
    // Validate required fields
    if (!role) {
      return res.status(400).json({
        error: "Role is required",
        message: "Please select a role for your plan request",
      });
    }
    
    // Validate fullName - it's required by the schema
    if (!fullName || (typeof fullName === 'string' && fullName.trim() === '')) {
      console.log('Validation failed: fullName is missing or empty', { fullName, fullNameRaw, formDataKeys: Object.keys(formData) });
      return res.status(400).json({
        error: "Full name is required",
        message: "Please provide your full name in the Contact & Transport section",
      });
    }

    // Create the plan request
    // Final validation: ensure tripType is always a non-empty string (required by schema)
    const finalTripType = (tripType && String(tripType).trim()) ? String(tripType).trim() : "Other";
    
    // Final validation - ensure fullName is a non-empty string (already validated above, but double-check)
    const finalFullName = (fullName && typeof fullName === 'string') ? fullName.trim() : null;
    if (!finalFullName || finalFullName === '') {
      return res.status(400).json({
        error: "Full name is required",
        message: "Please provide your full name in the Contact & Transport section",
      });
    }
    
    // Validate email - it's required by the schema
    // Normalize email to lowercase for consistent matching
    const finalEmail = (email && typeof email === 'string') ? email.trim().toLowerCase() : null;
    if (!finalEmail || finalEmail === '') {
      return res.status(400).json({
        error: "Email is required",
        message: "Please provide your email address in the Contact & Transport section",
      });
    }
    
    // Try to find existing user by email or phone (to link request to user account)
    let userId: number | null = null;
    try {
      if (finalEmail) {
        const userByEmail = await prisma.user.findUnique({
          where: { email: finalEmail },
          select: { id: true },
        });
        if (userByEmail) {
          userId = userByEmail.id;
        }
      }
      // If not found by email, try phone
      if (!userId && phone) {
        const normalizedPhone = phone.trim().replace(/[-\s]/g, '');
        const userByPhone = await prisma.user.findUnique({
          where: { phone: normalizedPhone },
          select: { id: true },
        });
        if (userByPhone) {
          userId = userByPhone.id;
        }
      }
    } catch (userLookupError) {
      // If user lookup fails, continue without userId (anonymous submission)
      console.warn('Failed to lookup user for plan request:', userLookupError);
    }
    
    console.log('Creating plan request:', {
      tripType: finalTripType,
      fullName: finalFullName.substring(0, 50), // Log first 50 chars only
      email: finalEmail.substring(0, 30),
      userId: userId || 'anonymous',
      role,
    });
    
    // Validate and convert types to match Prisma schema
    const groupSizeNum = groupSize ? parseInt(String(groupSize), 10) : null;
    const budgetDecimal = budget ? parseFloat(String(budget)) : null;
    const vehiclesNeededNum = vehiclesNeeded ? parseInt(String(vehiclesNeeded), 10) : null;
    const passengerCountNum = passengerCount ? parseInt(String(passengerCount), 10) : null;
    
    const planRequest = await (prisma as any).planRequest.create({
      data: {
        role,
        tripType: finalTripType, // Always a valid non-empty string
        destinations,
        dateFrom: dateFrom ? new Date(dateFrom) : null,
        dateTo: dateTo ? new Date(dateTo) : null,
        groupSize: groupSizeNum && !isNaN(groupSizeNum) ? groupSizeNum : null,
        budget: budgetDecimal && !isNaN(budgetDecimal) ? budgetDecimal : null,
        notes,
        fullName: finalFullName, // Use validated fullName - always a non-empty string
        email: finalEmail, // Use validated email - always a non-empty string
        phone: phone ? phone.trim() : null,
        userId, // Link to user if found, null for anonymous submissions
        transportRequired: transportRequired === "yes" || transportRequired === true || transportRequired === "true" ? true : transportRequired === "no" || transportRequired === "false" ? false : null,
        vehicleType,
        pickupLocation,
        dropoffLocation,
        vehiclesNeeded: vehiclesNeededNum && !isNaN(vehiclesNeededNum) ? vehiclesNeededNum : null,
        passengerCount: passengerCountNum && !isNaN(passengerCountNum) ? passengerCountNum : null,
        vehicleRequirements,
        roleSpecificData: Object.keys(roleSpecificData).length > 0 ? roleSpecificData : null,
        status: "NEW",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    console.log(`Plan request created: ID ${planRequest.id}, Role: ${role}, Email: ${email}`);
    
    // Send email notifications (non-blocking)
    try {
      // Email to customer
      const customerEmail = getNewPlanRequestCustomerEmail({
        customerName: finalFullName,
        requestId: planRequest.id,
        role,
        tripType: finalTripType,
        destinations: destinations || undefined,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
      });
      
      await sendMail(finalEmail, customerEmail.subject, customerEmail.html);
      console.log(`Email notification sent to customer: ${finalEmail}`);
    } catch (emailError: any) {
      console.error("Failed to send customer email notification:", emailError);
      // Don't fail the request if email fails
    }
    
    // Notify admins (creates notification and can send emails to admins)
    try {
      await notifyAdmins('plan_request_submitted', {
        requestId: planRequest.id,
        customerName: finalFullName,
        customerEmail: finalEmail,
        role,
        tripType: finalTripType,
        destinations: destinations || null,
      });
      
      // Also send email to admin team (you can add admin emails from env or database)
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);
      if (adminEmails.length > 0) {
        const adminEmail = getNewPlanRequestAdminEmail({
          customerName: finalFullName,
          requestId: planRequest.id,
          role,
          tripType: finalTripType,
          destinations: destinations || undefined,
          dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
          dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
        });
        
        // Send to all admin emails
        await Promise.all(adminEmails.map(email => 
          sendMail(email.trim(), adminEmail.subject, adminEmail.html).catch(err => 
            console.error(`Failed to send admin email to ${email}:`, err)
          )
        ));
      }
      
      // Emit real-time update via Socket.IO (non-blocking)
      try {
        const io = (global as any).io;
        if (io && typeof io.emit === 'function') {
          io.to('admin').emit('plan-request:new', {
            id: planRequest.id,
            customerName: finalFullName,
            role,
            tripType: finalTripType,
            status: 'NEW',
            createdAt: new Date().toISOString(),
          });
        }
      } catch (socketError: any) {
        console.error("Failed to emit Socket.IO new request event:", socketError);
        // Don't fail the request if socket fails
      }
    } catch (notifyError: any) {
      console.error("Failed to notify admins:", notifyError);
      // Don't fail the request if notification fails
    }
    
    return res.status(201).json({
      success: true,
      id: planRequest.id,
      message: "Plan request submitted successfully",
    });
  } catch (err: any) {
    console.error("Failed to create plan request:", err);
    console.error("Error details:", {
      message: err?.message,
      stack: err?.stack,
      code: err?.code,
      name: err?.name,
    });
    
    // Check if it's a Prisma schema error
    if (err instanceof Error && (err.message.includes("planRequest") || err.message.includes("PlanRequest"))) {
      return res.status(500).json({
        error: "Plan request feature is not available yet",
        message: err.message,
      });
    }
    
    return res.status(500).json({
      error: "Failed to submit plan request",
      message: err?.message || "Internal server error",
    });
  }
});

export default router;


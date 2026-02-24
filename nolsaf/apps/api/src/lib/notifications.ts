import { prisma } from "@nolsaf/prisma";

/**
 * Notify all admins (creates notification with userId=null, ownerId=null so it appears in admin notifications)
 */
export async function notifyAdmins(template: string, data: any) {
  try {
    const notificationTemplates: Record<string, { title: string; body: string }> = {
      careers_application_submitted: {
        title: "New Career Application",
        body: `A new application was submitted${data.jobTitle ? ` for "${data.jobTitle}"` : ""}${data.fullName ? ` by ${data.fullName}` : ""}${data.email ? ` (${data.email})` : ""}.`
      },
      property_submitted: {
        title: "Property Submitted for Review",
        body: `A new property "${data.propertyTitle || 'Property'}" has been submitted for review and is awaiting your approval.`
      },
      property_approved: {
        title: "Property Approved",
        body: `Property "${data.propertyTitle || 'Property'}" has been approved${data.approvedByName ? ` by ${data.approvedByName}` : ''}.`
      },
      property_rejected: {
        title: "Property Review Update",
        body: `Property "${data.propertyTitle || 'Property'}" has been rejected. ${data.reasons ? `Reasons: ${Array.isArray(data.reasons) ? data.reasons.join(', ') : data.reasons}.` : ''}`
      },
      cancellation_submitted: {
        title: "New Cancellation Claim Submitted",
        body: `A customer submitted a cancellation claim${data.bookingCode ? ` (code: ${data.bookingCode})` : ""}.`
      },
      cancellation_message: {
        title: "New Cancellation Message",
        body: `There is a new message on cancellation claim${data.requestId ? ` #${data.requestId}` : ""}${data.bookingCode ? ` (code: ${data.bookingCode})` : ""}.`
      },
      plan_request_submitted: {
        title: "New Plan Request Submitted",
        body: `A new plan request${data.requestId ? ` #${data.requestId}` : ""} has been submitted${data.customerName ? ` by ${data.customerName}` : ""}${data.role ? ` (${data.role})` : ""}.`
      },
      booking_created: {
        title: "New Booking Created",
        body: `A new booking${data.bookingId ? ` #${data.bookingId}` : ""} has been created${data.propertyTitle ? ` for "${data.propertyTitle}"` : ""}${data.checkIn ? ` (check-in: ${data.checkIn})` : ""}.`
      },

      // Transport (driver allocation) escalations
      transport_auto_dispatch_no_drivers_2m: {
        title: "No Driver Acceptance Yet (2 min)",
        body: `A transport trip${data.transportBookingId ? ` #${data.transportBookingId}` : ""} has no driver acceptance after 2 minutes. The system will keep scanning/offering, but you may start preparing manual assignment.`
      },
      transport_auto_dispatch_warning: {
        title: "Trip Allocation Delay (5 min)",
        body: `A transport trip${data.transportBookingId ? ` #${data.transportBookingId}` : ""} has not been assigned after 5 minutes. Prepare for manual assignment if no driver accepts by 10 minutes.`
      },
      transport_auto_dispatch_takeover: {
        title: "Manual Assignment Required (10 min)",
        body: `A transport trip${data.transportBookingId ? ` #${data.transportBookingId}` : ""} was not assigned within 10 minutes. Admin manual assignment is now required.`
      },
    };

    const templateData = notificationTemplates[template] || {
      title: "Admin Notification",
      body: `Update: ${JSON.stringify(data)}`
    };

    try {
      // Create notification for admins (no userId/ownerId = visible to all admins)
      await prisma.notification.create({
        data: {
          userId: null,
          ownerId: null,
          title: templateData.title,
          body: templateData.body,
          unread: true,
          meta: data,
          type: template.startsWith("transport")
            ? "ride"
            : template.startsWith("careers")
              ? "careers"
            : template.startsWith("cancellation")
              ? "cancellation"
              : template.startsWith("booking")
                ? "booking"
                : "property"
        }
      });
    } catch (err: any) {
      console.error("[notify] admins - failed to create notification", err?.message || err, template);
    }
  } catch (err: any) {
    console.error("[notify] admins failed", err?.message || err);
  }
}

export async function notifyOwner(ownerId: number, template: string, data: any) {
  try {
    // Create notification in database if Notification model exists
    const notificationTemplates: Record<string, { title: string; body: string }> = {
      property_submitted: {
        title: "Property Submitted for Review",
        body: `Your property "${data.propertyTitle || 'Property'}" has been submitted and is now under review by our team. You will be notified once the review is complete.`
      },
      property_approved: {
        title: "Property Approved",
        body: `Great news! Your property "${data.propertyTitle || 'Property'}" has been approved and is now live on the platform.`
      },
      property_rejected: {
        title: "Property Review Update",
        body: `Your property "${data.propertyTitle || 'Property'}" requires some changes. ${data.reasons ? `Reasons: ${Array.isArray(data.reasons) ? data.reasons.join(', ') : data.reasons}.` : ''} ${data.note ? `Note: ${data.note}` : ''}`
      },
      property_suspended: {
        title: "Property Suspended",
        body: `Your property "${data.propertyTitle || 'Property'}" has been temporarily suspended. ${data.reason ? `Reason: ${data.reason}` : ''}`
      },
      property_unsuspended: {
        title: "Property Reinstated",
        body: `Your property "${data.propertyTitle || 'Property'}" has been reinstated and is now live again.`
      },
      cancellation_status_update: {
        title: "Cancellation Claim Update",
        body: `Your cancellation claim${data.requestId ? ` #${data.requestId}` : ""}${data.bookingCode ? ` (code: ${data.bookingCode})` : ""} is now "${data.status || "UPDATED"}". ${data.decisionNote ? `Note: ${data.decisionNote}` : ""}`
      },
      cancellation_message: {
        title: "New Message on Cancellation Claim",
        body: `You have a new message on your cancellation claim${data.requestId ? ` #${data.requestId}` : ""}${data.bookingCode ? ` (code: ${data.bookingCode})` : ""}.`
      },
      booking_created: {
        title: "New Booking Received",
        body: `You have a new booking${data.bookingId ? ` #${data.bookingId}` : ""}${data.propertyTitle ? ` for "${data.propertyTitle}"` : ""}${data.checkIn ? ` (check-in: ${data.checkIn})` : ""}. Open your bookings to view details and prepare for check-in.`
      },
      booking_cancelled_by_guest: {
        title: "Booking Cancelled",
        body: `A guest's cancellation request for booking${data.bookingId ? ` #${data.bookingId}` : ""}${data.propertyTitle ? ` at "${data.propertyTitle}"` : ""}${data.bookingCode ? ` (code: ${data.bookingCode})` : ""} has been approved by admin. The check-in code has been voided and the booking is now cancelled.`
      },
    };

    const templateData = notificationTemplates[template] || {
      title: "Notification",
      body: `Update regarding your property.`
    };

    // Create notification in database (this is the "on-site inbox")
    try {
      const created = await prisma.notification.create({
        data: {
          ownerId: Number(ownerId),
          userId: Number(ownerId), // Also set userId for consistency
          title: templateData.title,
          body: templateData.body,
          unread: true,
          meta: data,
          type: template.startsWith("cancellation")
            ? "cancellation"
            : template.startsWith("booking")
              ? "booking"
              : "property"
        }
      });

      // Best-effort realtime emit (if clients join rooms)
      try {
        const io = (global as any).io;
        if (io && typeof io.to === "function") {
          io.to(`owner:${ownerId}`).emit("notification:new", { id: created.id, ownerId, type: created.type, title: created.title, body: created.body, createdAt: created.createdAt });
          io.to(`user:${ownerId}`).emit("notification:new", { id: created.id, userId: ownerId, type: created.type, title: created.title, body: created.body, createdAt: created.createdAt });
        }
      } catch {
        // ignore
      }
    } catch (err: any) {
      // Log error but don't fail the main operation
      console.error("[notify] owner - failed to create notification", err?.message || err, ownerId, template);
    }
  } catch (err: any) {
    console.error("[notify] owner failed", err?.message || err);
  }
}

/**
 * Notify a user (customer) by userId
 */
export async function notifyUser(userId: number, template: string, data: any) {
  try {
    const notificationTemplates: Record<string, { title: string; body: string }> = {
      agent_assignment_assigned: {
        title: "New assignment assigned",
        body: `You have a new assignment${data.requestId ? ` #${data.requestId}` : ""}${data.tripType ? ` (${data.tripType})` : ""}. Open your dashboard to view details.`
      },
      agent_assignment_updated: {
        title: "Assignment updated by admin",
        body: `Your assignment${data.requestId ? ` #${data.requestId}` : ""} has an update from the admin team. Open the assignment to review the latest details.`
      },
      agent_assignment_completed: {
        title: "Assignment marked completed",
        body: `Assignment${data.requestId ? ` #${data.requestId}` : ""} was marked COMPLETED. Check the assignment for the final response and outputs.`
      },
      cancellation_status_update: {
        title: "Cancellation Claim Update",
        body: `Your cancellation claim${data.requestId ? ` #${data.requestId}` : ""}${data.bookingCode ? ` (code: ${data.bookingCode})` : ""} is now "${data.status || "UPDATED"}". ${data.decisionNote ? `Note: ${data.decisionNote}` : ""}`
      },
      cancellation_message: {
        title: "New Message on Cancellation Claim",
        body: `You have a new message on your cancellation claim${data.requestId ? ` #${data.requestId}` : ""}${data.bookingCode ? ` (code: ${data.bookingCode})` : ""}.`
      },
      group_stay_update: {
        title: data.title || "Group Stay Update",
        body: data.body || data.message || "You have an update on your group stay booking."
      },
    };

    const templateData = notificationTemplates[template] || {
      title: "Notification",
      body: "You have an update."
    };

    const created = await prisma.notification.create({
      data: {
        userId: Number(userId),
        ownerId: null,
        title: templateData.title,
        body: templateData.body,
        unread: true,
        meta: data,
        type: template.startsWith("agent_")
          ? "agent"
          : template.startsWith("cancellation")
            ? "cancellation"
            : "system"
      }
    });

    // Best-effort realtime emit
    try {
      const io = (global as any).io;
      if (io && typeof io.to === "function") {
        io.to(`user:${userId}`).emit("notification:new", { id: created.id, userId, type: created.type, title: created.title, body: created.body, createdAt: created.createdAt });
      }
    } catch {
      // ignore
    }
  } catch (err: any) {
    console.error("[notify] user failed", err?.message || err);
  }
}

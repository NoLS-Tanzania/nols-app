import { prisma } from "@nolsaf/prisma";

/**
 * Notify all admins (creates notification with userId=null, ownerId=null so it appears in admin notifications)
 */
export async function notifyAdmins(template: string, data: any) {
  try {
    const notificationTemplates: Record<string, { title: string; body: string }> = {
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
          type: 'property'
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
      }
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
          type: 'property' // Default type for property-related notifications
        }
      });

      // Best-effort realtime emit (if clients join rooms)
      try {
        const io = (global as any).io;
        if (io && typeof io.to === "function") {
          io.to(`owner:${ownerId}`).emit("notification:new", { id: created.id, ownerId, title: created.title, body: created.body, createdAt: created.createdAt });
          io.to(`user:${ownerId}`).emit("notification:new", { id: created.id, userId: ownerId, title: created.title, body: created.body, createdAt: created.createdAt });
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

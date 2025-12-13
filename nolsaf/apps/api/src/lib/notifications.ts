import { prisma } from "@nolsaf/prisma";

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

    // Create notification in database
    try {
      await prisma.notification.create({
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
    } catch (err: any) {
      // Log error but don't fail the main operation
      console.error("[notify] owner - failed to create notification", err?.message || err, ownerId, template);
    }

    // TODO: integrate with email/SMS/on-site inbox
    console.log("[notify] owner", ownerId, template, data);
  } catch (err: any) {
    console.error("[notify] owner failed", err?.message || err);
  }
}

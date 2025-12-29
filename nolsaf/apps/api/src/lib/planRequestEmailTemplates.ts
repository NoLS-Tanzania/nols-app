/**
 * Email templates for Plan Request notifications
 */

export interface PlanRequestEmailData {
  customerName: string;
  requestId: number;
  role?: string;
  tripType?: string;
  destinations?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PlanRequestResponseEmailData {
  customerName: string;
  requestId: number;
  adminName?: string;
  hasItineraries?: boolean;
  hasPermits?: boolean;
  hasTimeline?: boolean;
}

export interface PlanRequestAgentAssignmentEmailData {
  agentName: string;
  requestId: number;
  customerName: string;
  role?: string;
  tripType?: string;
}

/**
 * Email template for new plan request submission (to customer)
 */
export function getNewPlanRequestCustomerEmail(data: PlanRequestEmailData): { subject: string; html: string } {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const customerPortalUrl = `${appUrl}/account/event-plans`;
  
  return {
    subject: "Your Event Plan Request Has Been Received - NoLSAF",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Plan Request Received</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #02665e 0%, #014d47 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Request Received! 🎉</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-top: 0;">Hello ${data.customerName},</p>
            
            <p>Thank you for planning your event with NoLSAF! We have successfully received your request <strong>#${data.requestId}</strong> and our team is currently reviewing it.</p>
            
            ${data.role ? `<p><strong>Request Type:</strong> ${data.role}</p>` : ''}
            ${data.tripType ? `<p><strong>Trip Type:</strong> ${data.tripType}</p>` : ''}
            ${data.destinations ? `<p><strong>Destination(s):</strong> ${data.destinations}</p>` : ''}
            ${data.dateFrom && data.dateTo ? `<p><strong>Travel Dates:</strong> ${new Date(data.dateFrom).toLocaleDateString()} - ${new Date(data.dateTo).toLocaleDateString()}</p>` : ''}
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #02665e; margin: 20px 0;">
              <p style="margin: 0; font-weight: 600; color: #02665e;">⏰ What's Next?</p>
              <p style="margin: 10px 0 0 0;">Our travel experts are working on your request and will get back to you within <strong>48 hours</strong> with a detailed itinerary, pricing, and all the information you need.</p>
            </div>
            
            <p>You can track your request and view updates at any time:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${customerPortalUrl}" style="background: #02665e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View My Event Plans</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you have any questions or need to provide additional information, please don't hesitate to contact us or send a follow-up message through your event plans portal.</p>
            
            <p style="margin-top: 30px;">Best regards,<br><strong>The NoLSAF Team</strong></p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} NoLSAF. All rights reserved.</p>
          </div>
        </body>
      </html>
    `
  };
}

/**
 * Email template for new plan request notification (to admins)
 */
export function getNewPlanRequestAdminEmail(data: PlanRequestEmailData): { subject: string; html: string } {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const adminPortalUrl = `${appUrl}/admin/plan-with-us/requests?status=NEW`;
  
  return {
    subject: `New Plan Request #${data.requestId} - ${data.role || 'Event Planning'}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Plan Request</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Plan Request 🔔</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-top: 0;">A new plan request has been submitted:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Request ID:</strong> #${data.requestId}</p>
              <p style="margin: 0 0 10px 0;"><strong>Customer:</strong> ${data.customerName}</p>
              ${data.role ? `<p style="margin: 0 0 10px 0;"><strong>Role:</strong> ${data.role}</p>` : ''}
              ${data.tripType ? `<p style="margin: 0 0 10px 0;"><strong>Trip Type:</strong> ${data.tripType}</p>` : ''}
              ${data.destinations ? `<p style="margin: 0 0 10px 0;"><strong>Destination(s):</strong> ${data.destinations}</p>` : ''}
              ${data.dateFrom && data.dateTo ? `<p style="margin: 0;"><strong>Travel Dates:</strong> ${new Date(data.dateFrom).toLocaleDateString()} - ${new Date(data.dateTo).toLocaleDateString()}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${adminPortalUrl}" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Review Request</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">Please review and respond to this request within 48 hours.</p>
          </div>
        </body>
      </html>
    `
  };
}

/**
 * Email template for admin response notification (to customer)
 */
export function getPlanRequestResponseEmail(data: PlanRequestResponseEmailData): { subject: string; html: string } {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const customerPortalUrl = `${appUrl}/account/event-plans`;
  
  return {
    subject: `Response to Your Event Plan Request #${data.requestId} - NoLSAF`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Plan Request Response</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Response Ready! ✨</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-top: 0;">Hello ${data.customerName},</p>
            
            <p>Great news! We have reviewed your event plan request <strong>#${data.requestId}</strong> and prepared a detailed response for you.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
              <p style="margin: 0 0 15px 0; font-weight: 600; color: #10b981;">📋 What's Included:</p>
              <ul style="margin: 0; padding-left: 20px;">
                ${data.hasItineraries ? '<li style="margin: 5px 0;">✅ Suggested itineraries with prices</li>' : ''}
                ${data.hasPermits ? '<li style="margin: 5px 0;">✅ Checklist of required permits and documents</li>' : ''}
                ${data.hasTimeline ? '<li style="margin: 5px 0;">✅ Estimated timelines and booking windows</li>' : ''}
                <li style="margin: 5px 0;">✅ Additional recommendations and notes</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${customerPortalUrl}" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Response</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">If you have any questions or need clarifications, you can send a follow-up message directly from your event plans portal.</p>
            
            <p style="margin-top: 30px;">Best regards,<br><strong>${data.adminName || 'The NoLSAF Team'}</strong></p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} NoLSAF. All rights reserved.</p>
          </div>
        </body>
      </html>
    `
  };
}

/**
 * Email template for agent assignment notification
 */
export function getPlanRequestAgentAssignmentEmail(data: PlanRequestAgentAssignmentEmailData): { subject: string; html: string } {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const adminPortalUrl = `${appUrl}/admin/plan-with-us/requests`;
  
  return {
    subject: `You've Been Assigned to Plan Request #${data.requestId}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Agent Assignment</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Assignment 🎯</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-top: 0;">Hello ${data.agentName},</p>
            
            <p>You have been assigned to work on plan request <strong>#${data.requestId}</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #8b5cf6; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Request ID:</strong> #${data.requestId}</p>
              <p style="margin: 0 0 10px 0;"><strong>Customer:</strong> ${data.customerName}</p>
              ${data.role ? `<p style="margin: 0 0 10px 0;"><strong>Role:</strong> ${data.role}</p>` : ''}
              ${data.tripType ? `<p style="margin: 0;"><strong>Trip Type:</strong> ${data.tripType}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${adminPortalUrl}" style="background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Request Details</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">Please review the request details and coordinate with the admin team to provide the best service to our customer.</p>
            
            <p style="margin-top: 30px;">Best regards,<br><strong>The NoLSAF Team</strong></p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} NoLSAF. All rights reserved.</p>
          </div>
        </body>
      </html>
    `
  };
}


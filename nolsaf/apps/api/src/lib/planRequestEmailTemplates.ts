/**
 * Email templates for Plan Request notifications
 * Premium, branded HTML emails — uses shared emailBase.ts design system
 */
import { BRAND_TEAL, BRAND_DARK, TEXT_MUTED, TEXT_MAIN, baseEmail, infoCard, calloutBox, ctaButton } from "./emailBase.js";

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

// ─── 1. Customer: Request received ───────────────────────────────────────────
export function getNewPlanRequestCustomerEmail(data: PlanRequestEmailData): { subject: string; html: string } {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const portalUrl = `${appUrl}/account/event-plans`;

  const rows: Array<[string, string]> = [["Request ID", `#${data.requestId}`]];
  if (data.role)        rows.push(["Request Type", data.role]);
  if (data.tripType)    rows.push(["Trip Type", data.tripType]);
  if (data.destinations) rows.push(["Destination(s)", data.destinations]);
  if (data.dateFrom && data.dateTo)
    rows.push(["Travel Dates", `${new Date(data.dateFrom).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })} – ${new Date(data.dateTo).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}`]);

  const body = `
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${BRAND_TEAL};">Hello ${data.customerName},</p>
    <p style="margin:0 0 16px;">Thank you for choosing NoLSAF to plan your Africa experience. We have successfully received your request and our travel experts are reviewing it now.</p>
    ${infoCard(BRAND_TEAL, rows)}
    ${calloutBox(BRAND_TEAL, "⏱️", "What happens next?", `Our specialists will prepare a personalised itinerary, pricing, and all the details you need — typically within <strong>48 hours</strong>. You'll receive another email the moment your response is ready.`)}
    <p style="margin:16px 0 4px;font-size:14px;color:${TEXT_MUTED};">Track your request and view updates at any time from your portal:</p>
    ${ctaButton(portalUrl, "View My Event Plans", BRAND_TEAL)}
    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_MUTED};">Need to add details? Reply to this email or use the portal messaging feature.</p>
    <p style="margin:20px 0 0;">Warm regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Team</strong></p>
  `;

  return {
    subject: `We've received your plan request #${data.requestId} — NoLSAF`,
    html: baseEmail(BRAND_TEAL, BRAND_DARK, "Request Received", "🎉", body),
  };
}

// ─── 2. Admin: New inbound request ───────────────────────────────────────────
export function getNewPlanRequestAdminEmail(data: PlanRequestEmailData): { subject: string; html: string } {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const adminUrl = `${appUrl}/admin/plan-with-us/requests?status=NEW`;

  const rows: Array<[string, string]> = [
    ["Request ID", `#${data.requestId}`],
    ["Customer", data.customerName],
  ];
  if (data.role)        rows.push(["Role", data.role]);
  if (data.tripType)    rows.push(["Trip Type", data.tripType]);
  if (data.destinations) rows.push(["Destination(s)", data.destinations]);
  if (data.dateFrom && data.dateTo)
    rows.push(["Travel Dates", `${new Date(data.dateFrom).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })} – ${new Date(data.dateTo).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}`]);

  const ADMIN_BLUE = "#1d4ed8";
  const body = `
    <p style="margin:0 0 16px;font-size:15px;">A new plan request has just been submitted and is awaiting review.</p>
    ${infoCard(ADMIN_BLUE, rows)}
    ${calloutBox(ADMIN_BLUE, "⚡", "Action required", "Please review this request and assign it to an agent within <strong>48 hours</strong>. The customer is expecting an initial response.")}
    ${ctaButton(adminUrl, "Review Request in Admin Panel", ADMIN_BLUE)}
  `;

  return {
    subject: `[NoLSAF Admin] New Plan Request #${data.requestId} — ${data.role || "Event Planning"}`,
    html: baseEmail(ADMIN_BLUE, "#1e3a8a", "New Plan Request", "🔔", body),
  };
}

// ─── 3. Customer: Admin/agent response ready ──────────────────────────────────
export function getPlanRequestResponseEmail(data: PlanRequestResponseEmailData): { subject: string; html: string } {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const portalUrl = `${appUrl}/account/event-plans`;

  const included: string[] = [];
  if (data.hasItineraries) included.push("✅&nbsp; Suggested itineraries with pricing");
  if (data.hasPermits)     included.push("✅&nbsp; Required permits &amp; document checklist");
  if (data.hasTimeline)    included.push("✅&nbsp; Estimated timelines &amp; booking windows");
  included.push("✅&nbsp; Expert recommendations &amp; notes");

  const EMERALD = "#059669";
  const body = `
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${EMERALD};">Hello ${data.customerName},</p>
    <p style="margin:0 0 16px;">Great news — ${data.adminName ? `<strong>${data.adminName}</strong> has` : "our team has"} reviewed your event plan request <strong>#${data.requestId}</strong> and prepared a detailed response just for you.</p>
    ${calloutBox(EMERALD, "📋", "What's included in your response:", included.map(i => `<span style="display:block;margin:4px 0;">${i}</span>`).join(""))}
    <p style="margin:16px 0 4px;font-size:14px;color:${TEXT_MUTED};">Log in to your portal to read the full response, ask questions, and proceed with your booking:</p>
    ${ctaButton(portalUrl, "View My Response", EMERALD)}
    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_MUTED};">Have questions? Use the portal messaging feature to get in touch directly with your travel specialist.</p>
    <p style="margin:20px 0 0;">Warm regards,<br><strong style="color:${BRAND_DARK};">${data.adminName || "The NoLSAF Team"}</strong></p>
  `;

  return {
    subject: `Your NoLSAF travel plan is ready — Request #${data.requestId}`,
    html: baseEmail(EMERALD, "#047857", "Response Ready", "✨", body),
  };
}

// ─── 4. Agent: New assignment ─────────────────────────────────────────────────
export function getPlanRequestAgentAssignmentEmail(data: PlanRequestAgentAssignmentEmailData): { subject: string; html: string } {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  // Link to agent portal, not admin panel
  const agentUrl = `${appUrl}/account/agent/assignments`;

  const rows: Array<[string, string]> = [
    ["Request ID", `#${data.requestId}`],
    ["Customer", data.customerName],
  ];
  if (data.role)     rows.push(["Request Type", data.role]);
  if (data.tripType) rows.push(["Trip Type", data.tripType]);

  const VIOLET = "#7c3aed";
  const body = `
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${VIOLET};">Hello ${data.agentName},</p>
    <p style="margin:0 0 16px;">You have been assigned to a new travel planning request. Please review the details below and begin preparing the best Africa experience for this guest.</p>
    ${infoCard(VIOLET, rows)}
    ${calloutBox(VIOLET, "🎯", "Your responsibility", `Review the full request details, prepare an itinerary and pricing, and submit your response through the agent portal. The client is expecting a reply within <strong>48 hours</strong>.`)}
    ${ctaButton(agentUrl, "Open My Assignments", VIOLET)}
    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_MUTED};">Questions about this assignment? Contact the admin team through the portal or reply to this email.</p>
    <p style="margin:20px 0 0;">Best regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Admin Team</strong></p>
  `;

  return {
    subject: `[NoLSAF] New Assignment — Plan Request #${data.requestId}`,
    html: baseEmail(VIOLET, "#6d28d9", "New Assignment", "🎯", body),
  };
}

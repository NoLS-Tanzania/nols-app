/**
 * Email templates for job application status updates
 * Uses shared emailBase.ts design system
 */
import { BRAND_TEAL, BRAND_DARK, TEXT_MUTED, TEXT_MAIN, baseEmail, infoCard, calloutBox, ctaButton } from "./emailBase.js";

export interface ApplicationEmailData {
  applicantName: string;
  jobTitle: string;
  jobDepartment?: string;
  status: "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED";
  adminNotes?: string | null;
  companyName?: string;
  supportEmail?: string;
  // Onboarding details (used for HIRED)
  portalUrl?: string;
  loginUrl?: string;
  username?: string;
  setupLink?: string;
  setupLinkExpiresHours?: number;
}

export function getApplicationEmailSubject(status: ApplicationEmailData["status"], jobTitle: string): string {
  switch (status) {
    case "REVIEWING":   return `Your application for ${jobTitle} is under review — NoLSAF`;
    case "SHORTLISTED": return `You've been shortlisted for ${jobTitle} — NoLSAF`;
    case "REJECTED":    return `Update on your application for ${jobTitle} — NoLSAF`;
    case "HIRED":       return `🎉 Congratulations! You've been hired — ${jobTitle} at NoLSAF`;
    default:            return `Update on your application for ${jobTitle} — NoLSAF`;
  }
}

export function generateApplicationStatusEmail(data: ApplicationEmailData): string {
  const {
    applicantName,
    jobTitle,
    jobDepartment,
    status,
    adminNotes,
    supportEmail = "careers@nolsaf.com",
    portalUrl,
    loginUrl,
    username,
    setupLink,
    setupLinkExpiresHours,
  } = data;

  // ── Per-status colours, badge, icon ──────────────────────────────────────
  const config: Record<ApplicationEmailData["status"], { accent: string; to: string; badge: string; icon: string }> = {
    REVIEWING:   { accent: "#1d4ed8", to: "#1e3a8a", badge: "Application Under Review", icon: "🔍" },
    SHORTLISTED: { accent: BRAND_TEAL, to: BRAND_DARK, badge: "You've Been Shortlisted!", icon: "⭐" },
    REJECTED:    { accent: "#64748b", to: "#475569",  badge: "Application Update",       icon: "📋" },
    HIRED:       { accent: "#7c3aed", to: "#6d28d9",  badge: "Welcome to the Team!",    icon: "🎉" },
  };
  const { accent, to, badge, icon } = config[status];

  // ── Job info card ─────────────────────────────────────────────────────────
  const jobRows: Array<[string, string]> = [["Position", jobTitle]];
  if (jobDepartment) jobRows.push(["Department", jobDepartment]);
  jobRows.push(["Status", badge]);

  // ── Status-specific body content ──────────────────────────────────────────
  let statusContent = "";
  let cta = "";

  if (status === "REVIEWING") {
    statusContent = `
      <p style="margin:0 0 16px;">We have received your application and our hiring team is now reviewing it. We appreciate your interest in joining NoLSAF.</p>
      <p style="margin:0 0 16px;">This process typically takes a few business days. We will keep you updated at every step.</p>
    `;
    cta = ctaButton(`mailto:${supportEmail}`, "Contact Careers Team", accent);
  }

  if (status === "SHORTLISTED") {
    statusContent = `
      <p style="margin:0 0 16px;font-weight:600;color:${BRAND_TEAL};">Congratulations, ${applicantName}!</p>
      <p style="margin:0 0 16px;">Your application for <strong>${jobTitle}</strong> has impressed our hiring team and you have been shortlisted for the role.</p>
      <p style="margin:0 0 16px;">Our team will be in touch shortly with the next steps — this may include an interview or additional assessment. Please watch your inbox carefully.</p>
    `;
    cta = ctaButton(`mailto:${supportEmail}`, "Contact Us", accent);
  }

  if (status === "REJECTED") {
    statusContent = `
      <p style="margin:0 0 16px;">Thank you for your interest in the <strong>${jobTitle}</strong> position and for the time you invested in your application.</p>
      <p style="margin:0 0 16px;">After careful consideration, we have decided to move forward with candidates whose experience more closely matches our current requirements.</p>
      <p style="margin:0 0 16px;">We encourage you to watch for future opportunities — we genuinely appreciate your interest in being part of the NoLSAF team.</p>
    `;
  }

  if (status === "HIRED") {
    statusContent = `
      <p style="margin:0 0 16px;font-weight:600;color:#7c3aed;">Welcome to the NoLSAF Family, ${applicantName}!</p>
      <p style="margin:0 0 16px;">We are thrilled to offer you the position of <strong>${jobTitle}</strong>. Your profile stood out and we are confident you will make a great contribution to our team.</p>
      <p style="margin:0 0 16px;">Your agent portal access has been set up. Please follow the steps below to get started:</p>
    `;

    const onboardingRows: Array<[string, string]> = [];
    if (username)  onboardingRows.push(["Username", username]);
    if (loginUrl)  onboardingRows.push(["Login URL", `<a href="${loginUrl}" style="color:${accent};text-decoration:none;">${loginUrl}</a>`]);
    if (portalUrl) onboardingRows.push(["Agent Portal", `<a href="${portalUrl}" style="color:${accent};text-decoration:none;">${portalUrl}</a>`]);

    const onboardingCard = onboardingRows.length > 0 ? infoCard(accent, onboardingRows) : "";

    const uploadBox = calloutBox(accent, "📂", "Documents to prepare for upload:", `
      <span style="display:block;margin:4px 0;">✅&nbsp; Academic certificates (PDF/JPG/PNG, clear scan)</span>
      <span style="display:block;margin:4px 0;">✅&nbsp; Signed NDA — we will share the template if not yet received</span>
      <span style="display:block;margin:4px 0;">✅&nbsp; Any additional documents requested in your onboarding notes</span>
    `);

    statusContent += onboardingCard + uploadBox;

    if (setupLink) {
      const expiryNote = setupLinkExpiresHours ? ` (expires in ${setupLinkExpiresHours} hours)` : "";
      cta = ctaButton(setupLink, `Set Your Password${expiryNote}`, accent);
    } else if (loginUrl) {
      cta = ctaButton(loginUrl, "Sign In to Agent Portal", accent);
    } else if (portalUrl) {
      cta = ctaButton(portalUrl, "Open Agent Portal", accent);
    } else {
      cta = ctaButton(`mailto:${supportEmail}`, "Contact HR Team", accent);
    }
  }

  // ── Admin notes ───────────────────────────────────────────────────────────
  const notesSection = adminNotes
    ? calloutBox("#f59e0b", "📝", "Additional notes from our team:", adminNotes.replace(/\n/g, "<br>"))
    : "";

  // ── Full body ─────────────────────────────────────────────────────────────
  const body = `
    <p style="margin:0 0 20px;font-size:15px;">Dear <strong>${applicantName}</strong>,</p>
    ${statusContent}
    ${infoCard(accent, jobRows)}
    ${notesSection}
    ${cta}
    <p style="margin:20px 0 0;font-size:13px;color:${TEXT_MUTED};">Questions? Contact our careers team at <a href="mailto:${supportEmail}" style="color:${BRAND_TEAL};text-decoration:none;">${supportEmail}</a>.</p>
    <p style="margin:16px 0 0;">Warm regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Careers Team</strong></p>
  `;

  return baseEmail(accent, to, badge, icon, body);
}

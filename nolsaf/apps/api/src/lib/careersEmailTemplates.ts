/**
 * Email templates for job application status updates
 * Uses shared emailBase.ts design system
 */
import { BRAND_TEAL, BRAND_DARK, TEXT_MAIN, TEXT_MUTED, careersEmail, ctaButton } from "./emailBase.js";

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
    case "REVIEWING":   return `Application received — ${jobTitle} at NoLSAF`;
    case "SHORTLISTED": return `You've been shortlisted — ${jobTitle} at NoLSAF`;
    case "REJECTED":    return `Update on your application — ${jobTitle} at NoLSAF`;
    case "HIRED":       return `Congratulations! You've been hired — ${jobTitle} at NoLSAF`;
    default:            return `Update on your application — ${jobTitle} at NoLSAF`;
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

  const positionLabel = jobDepartment ? `${jobTitle} · ${jobDepartment}` : jobTitle;

  // ── Per-status config ─────────────────────────────────────────────────────
  const config: Record<ApplicationEmailData["status"], { accent: string; headlineIcon: string; headlineText: string }> = {
    REVIEWING:   { accent: "#1d4ed8", headlineIcon: "🔍", headlineText: "Application Received"        },
    SHORTLISTED: { accent: BRAND_TEAL, headlineIcon: "⭐", headlineText: "You've Been Shortlisted!"    },
    REJECTED:    { accent: "#64748b", headlineIcon: "📋", headlineText: "Update on Your Application"  },
    HIRED:       { accent: "#7c3aed", headlineIcon: "🎉", headlineText: "Welcome to the Team!"        },
  };
  const { accent, headlineIcon, headlineText } = config[status];

  // ── Status-specific body ─────────────────────────────────────────────────
  let body = "";

  // ── REVIEWING ─────────────────────────────────────────────────────────────
  if (status === "REVIEWING") {
    body = `
      <p style="margin:0 0 18px;font-size:16px;font-weight:700;color:${TEXT_MAIN};">Dear ${applicantName},</p>

      <p style="margin:0 0 16px;">Thank you for applying for the <strong>${jobTitle}</strong> position at NoLSAF. We are genuinely excited about the calibre of talent we receive, and we want you to know your application has been safely received and is now in the hands of our hiring team.</p>

      <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:${TEXT_MAIN};">What happens next?</p>
      <p style="margin:0 0 8px;font-size:14px;color:${TEXT_MAIN};">Our team carefully reviews every application against the role requirements — no automated filtering. This review typically takes <strong>3 to 5 business days</strong>, and you will receive an email update at each stage regardless of the outcome. Keep an eye on your inbox and your spam folder, just in case.</p>

      <p style="margin:0 0 16px;color:${TEXT_MUTED};font-size:14px;">You do not need to take any action at this stage. If we require anything further from you, we will reach out directly.</p>

      <p style="margin:24px 0 0;">Warm regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Careers Team</strong></p>
    `;
  }

  // ── SHORTLISTED ────────────────────────────────────────────────────────────
  if (status === "SHORTLISTED") {
    body = `
      <p style="margin:0 0 18px;font-size:16px;font-weight:700;color:${BRAND_TEAL};">Congratulations, ${applicantName}!</p>

      <p style="margin:0 0 16px;">We are delighted to let you know that your application for <strong>${jobTitle}</strong> has successfully passed our initial review. Your background and experience made a strong impression on our hiring team — reaching this stage is a genuine achievement in what is a competitive process.</p>

      <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:${TEXT_MAIN};">What happens next?</p>
      <p style="margin:0 0 16px;font-size:14px;color:${TEXT_MAIN};">A member of our team will contact you within <strong>2 to 5 business days</strong> with the details of the next step. This may include a phone screening, a video or in-person interview, or a short skills assessment — we will give you enough notice and all the information you need to prepare. Please ensure your contact details are current and keep your schedule flexible where possible. All communication from our team will come from <strong>${supportEmail}</strong>.</p>

      <p style="margin:0 0 16px;">We look forward to the next conversation with you. Well done for making it this far!</p>

      <p style="margin:24px 0 0;">Warm regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Careers Team</strong></p>
    `;
  }

  // ── REJECTED ───────────────────────────────────────────────────────────────
  if (status === "REJECTED") {
    body = `
      <p style="margin:0 0 18px;font-size:15px;">Dear <strong>${applicantName}</strong>,</p>

      <p style="margin:0 0 16px;">Thank you sincerely for your interest in the <strong>${jobTitle}</strong> role at NoLSAF and for the time and effort you put into your application. We review every submission carefully and we want to acknowledge the energy it takes to apply.</p>

      <p style="margin:0 0 16px;">After thorough consideration of all candidates, we have chosen to move forward with applicants whose experience most closely matched our requirements for this particular role at this time. This was not an easy decision — many strong applications came through, and we are grateful for yours.</p>

      <p style="margin:0 0 16px;font-size:14px;color:${TEXT_MAIN};">This outcome is specific to this role and this moment — it is not a reflection of your overall ability or potential. We actively welcome you to apply again for future openings that match your profile. Visit <a href="https://nolsaf.com/careers" style="color:${BRAND_TEAL};text-decoration:none;">nolsaf.com/careers</a> to see what becomes available. We hold all applications in confidence and your information will not be shared.</p>

      <p style="margin:0 0 16px;">We genuinely wish you every success in your career journey and hope our paths cross again in the future.</p>

      <p style="margin:24px 0 0;">Kind regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Careers Team</strong></p>
    `;
  }

  // ── HIRED ──────────────────────────────────────────────────────────────────
  if (status === "HIRED") {
    // Build the setup / login CTA button
    let cta = "";
    if (setupLink) {
      const expiryNote = setupLinkExpiresHours ? ` — link expires in ${setupLinkExpiresHours} hours` : "";
      cta = ctaButton(setupLink, `Click here to set your password${expiryNote}`, accent);
    } else if (loginUrl) {
      cta = ctaButton(loginUrl, "Sign in to your account", accent);
    } else if (portalUrl) {
      cta = ctaButton(portalUrl, "Open Agent Portal", accent);
    } else {
      cta = ctaButton(`mailto:${supportEmail}`, "Contact the HR Team", accent);
    }

    // Username line — shown only when provided
    const usernameNote = username
      ? `<p style="margin:0 0 16px;font-size:14px;color:${TEXT_MAIN};">Your username / login email: <strong>${username}</strong></p>`
      : "";

    // Inline links for login and portal
    const loginLine = loginUrl
      ? `<p style="margin:0 0 10px;font-size:14px;color:${TEXT_MAIN};">Once your password is set, sign in at: <a href="${loginUrl}" style="color:${accent};text-decoration:none;font-weight:600;">${loginUrl}</a></p>`
      : "";

    const portalLine = portalUrl
      ? `<p style="margin:0 0 16px;font-size:14px;color:${TEXT_MAIN};">Your agent dashboard is available at: <a href="${portalUrl}" style="color:${accent};text-decoration:none;font-weight:600;">${portalUrl}</a></p>`
      : "";

    body = `
      <p style="margin:0 0 18px;font-size:16px;font-weight:700;color:#7c3aed;">Welcome to the NoLSAF family, ${applicantName}!</p>

      <p style="margin:0 0 16px;">We are thrilled to offer you the position of <strong>${jobTitle}</strong> at NoLSAF. After reviewing many outstanding applications, your profile, experience, and drive stood out we are confident you will bring real value to our team and our customers across Africa.</p>

      <p style="margin:0 0 16px;">Your agent account has been created. To get started, please set your password using the button below, then sign in to access your dashboard and complete your onboarding.</p>

      ${usernameNote}

      ${cta}

      ${loginLine}
      ${portalLine}

      <p style="margin:20px 0 10px;font-size:14px;font-weight:700;color:${TEXT_MAIN};">Documents to upload within your first week:</p>
      <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;color:${TEXT_MAIN};line-height:1.8;">
        <li><strong>Academic certificates</strong> (PDF, JPG, or PNG &mdash; clear, legible scan)</li>
        <li>Signed <strong>NDA</strong> &mdash; our team will share the template if not yet received</li>
        <li>Any additional documents noted in your onboarding communication</li>
      </ul>

      <p style="margin:0 0 16px;font-size:14px;color:${TEXT_MUTED};">Our HR team is here to help. Reply to this email or reach us at <a href="mailto:${supportEmail}" style="color:${BRAND_TEAL};text-decoration:none;">${supportEmail}</a> and we will get back to you promptly.</p>

      <p style="margin:24px 0 0;">Congratulations again — we cannot wait to see what you accomplish with us.<br><br>Warm regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Careers Team</strong></p>
    `;
  }

  // ── Admin notes (appended to all statuses) ────────────────────────────────
  const notesSection = adminNotes
    ? `<p style="margin:24px 0 8px;font-size:14px;font-weight:700;color:#92400e;">A note from our team:</p><p style="margin:0 0 16px;font-size:14px;color:${TEXT_MAIN};">${adminNotes.replace(/\n/g, "<br>")}</p>`
    : "";

  const fullBody = `${body}${notesSection}`;

  return careersEmail(headlineIcon, headlineText, positionLabel, fullBody, supportEmail);
}


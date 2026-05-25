/**
 * Email templates for career and partnership application status updates.
 */
import {
  BRAND_DARK,
  BRAND_TEAL,
  TEXT_MAIN,
  TEXT_MUTED,
  careersEmail,
  ctaButton,
  partnershipEmail,
} from "./emailBase.js";

export interface ApplicationEmailData {
  applicantName: string;
  jobTitle: string;
  jobDepartment?: string;
  status: "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED";
  adminNotes?: string | null;
  companyName?: string;
  supportEmail?: string;
  isPartnership?: boolean;
  portalUrl?: string;
  loginUrl?: string;
  username?: string;
  setupLink?: string;
  setupLinkExpiresHours?: number;
}

export function getApplicationEmailSubject(
  status: ApplicationEmailData["status"],
  jobTitle: string,
  isPartnership = false
): string {
  if (isPartnership) {
    switch (status) {
      case "REVIEWING":
        return `Partnership application received: ${jobTitle}`;
      case "SHORTLISTED":
        return `Partnership verification in progress: ${jobTitle}`;
      case "REJECTED":
        return `Update on your NoLSAF partnership application`;
      case "HIRED":
        return `Your NoLSAF partner workspace is approved`;
      default:
        return `NoLSAF partnership application update`;
    }
  }

  switch (status) {
    case "REVIEWING":
      return `Application received: ${jobTitle} at NoLSAF`;
    case "SHORTLISTED":
      return `You've been shortlisted: ${jobTitle} at NoLSAF`;
    case "REJECTED":
      return `Update on your application: ${jobTitle} at NoLSAF`;
    case "HIRED":
      return `Congratulations, you've been hired: ${jobTitle} at NoLSAF`;
    default:
      return `Update on your application: ${jobTitle} at NoLSAF`;
  }
}

function adminNotesBlock(adminNotes: string | null | undefined): string {
  if (!adminNotes) return "";
  return `
    <div style="margin:24px 0 0;padding:16px 18px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:0.6px;">A note from our team</p>
      <p style="margin:0;font-size:14px;color:${TEXT_MAIN};line-height:1.75;">${adminNotes.replace(/\n/g, "<br>")}</p>
    </div>`;
}

function partnerList(items: string[]): string {
  return `
    <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;color:${TEXT_MAIN};line-height:1.9;">
      ${items.map((item) => `<li>${item}</li>`).join("")}
    </ul>`;
}

function generatePartnershipStatusEmail(data: ApplicationEmailData): string {
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

  const contextLabel = jobDepartment ? `${jobTitle} | ${jobDepartment}` : jobTitle;
  const setupExpiry = setupLink && setupLinkExpiresHours
    ? `<p style="margin:10px 0 18px;font-size:13px;color:${TEXT_MUTED};text-align:center;">For security, this password setup link expires in ${setupLinkExpiresHours} hours.</p>`
    : "";
  const usernameNote = username
    ? `<p style="margin:0 0 16px;font-size:14px;color:${TEXT_MAIN};">Login email: <strong>${username}</strong></p>`
    : "";
  const loginLine = loginUrl
    ? `<p style="margin:0 0 10px;font-size:13px;color:${TEXT_MUTED};">Sign in page: <a href="${loginUrl}" style="color:${BRAND_TEAL};text-decoration:none;font-weight:700;">${loginUrl}</a></p>`
    : "";
  const portalLine = portalUrl
    ? `<p style="margin:0 0 18px;font-size:13px;color:${TEXT_MUTED};">Partner workspace: <a href="${portalUrl}" style="color:${BRAND_TEAL};text-decoration:none;font-weight:700;">${portalUrl}</a></p>`
    : "";

  const actionCta = setupLink
    ? ctaButton(setupLink, "Set partner password", BRAND_TEAL)
    : loginUrl
      ? ctaButton(loginUrl, "Sign in to partner workspace", BRAND_TEAL)
      : portalUrl
        ? ctaButton(portalUrl, "Open partner workspace", BRAND_TEAL)
        : ctaButton(`mailto:${supportEmail}`, "Contact NoLSAF partnerships", BRAND_TEAL);

  let badgeLabel = "Partnership application";
  let body = "";

  if (status === "REVIEWING") {
    badgeLabel = "Application received";
    body = `
      <p style="margin:0 0 18px;font-size:16px;font-weight:800;color:${TEXT_MAIN};">Hello ${applicantName},</p>
      <p style="margin:0 0 16px;">Thank you for submitting your NoLSAF partnership application for <strong>${jobTitle}</strong>. Your company profile has been received and is now in partner verification.</p>
      <p style="margin:0 0 12px;font-size:14px;font-weight:800;color:${TEXT_MAIN};">What our team reviews</p>
      ${partnerList([
        "Company identity, contact details, and operating coverage.",
        "Permitted parks, tour sites, service categories, languages, and team capacity.",
        "Tourism permits, business documents, fleet or guide details where applicable.",
        "How your services can connect to NoLSAF bookings, timelines, support, and traveller records.",
      ])}
      <p style="margin:0 0 16px;color:${TEXT_MUTED};font-size:14px;">No action is required right now. If we need a permit, clarification, or an updated company detail, the partnerships team will contact you directly.</p>
      <p style="margin:24px 0 0;">Warm regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Partnerships Team</strong></p>
    `;
  }

  if (status === "SHORTLISTED") {
    badgeLabel = "Verification stage";
    body = `
      <p style="margin:0 0 18px;font-size:16px;font-weight:800;color:${BRAND_TEAL};">Good news, ${applicantName}.</p>
      <p style="margin:0 0 16px;">Your NoLSAF partnership application for <strong>${jobTitle}</strong> has moved into the verification stage. This means your profile looks relevant for the NoLSAF partner network, but final approval is still pending document and service checks.</p>
      <p style="margin:0 0 12px;font-size:14px;font-weight:800;color:${TEXT_MAIN};">Please keep these ready</p>
      ${partnerList([
        "Business registration, TIN, licences, and tourism or park permits.",
        "Operating regions, permitted tour sites, and services your team can deliver.",
        "Fleet, guide, language, or safety information where it applies to your services.",
      ])}
      <p style="margin:0 0 16px;color:${TEXT_MUTED};font-size:14px;">A NoLSAF team member may contact you to confirm details before your partner workspace is activated.</p>
      <p style="margin:24px 0 0;">Warm regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Partnerships Team</strong></p>
    `;
  }

  if (status === "REJECTED") {
    badgeLabel = "Application update";
    body = `
      <p style="margin:0 0 18px;font-size:15px;">Hello <strong>${applicantName}</strong>,</p>
      <p style="margin:0 0 16px;">Thank you for applying to join NoLSAF as a partner for <strong>${jobTitle}</strong>. We reviewed your company profile, service scope, and submitted details carefully.</p>
      <p style="margin:0 0 16px;">At this time, we are not able to approve this partnership application. This may be due to missing documents, service coverage, permit readiness, or fit with the current NoLSAF operating requirements.</p>
      <p style="margin:0 0 16px;color:${TEXT_MUTED};font-size:14px;">You may apply again when your company information, permits, or operating details are ready. If our team included a note below, use it as the first correction point before resubmitting.</p>
      <p style="margin:24px 0 0;">Kind regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Partnerships Team</strong></p>
    `;
  }

  if (status === "HIRED") {
    badgeLabel = "Partner approved";
    body = `
      <p style="margin:0 0 18px;font-size:16px;font-weight:800;color:${BRAND_TEAL};">Welcome to the NoLSAF partner network, ${applicantName}.</p>
      <p style="margin:0 0 16px;">Your partnership application for <strong>${jobTitle}</strong> has been approved. This activates your NoLSAF partner workspace so your company can manage verified tourism services through clear booking records, traveller support, and delivery timelines.</p>
      <p style="margin:0 0 16px;">Start by setting your password, then sign in to complete your partner profile and onboarding checklist.</p>
      ${usernameNote}
      ${actionCta}
      ${setupExpiry}
      ${loginLine}
      ${portalLine}
      <p style="margin:22px 0 12px;font-size:14px;font-weight:800;color:${TEXT_MAIN};">What your workspace is used for</p>
      ${partnerList([
        "Maintain company details, operating regions, permits, service categories, languages, fleet, and team information.",
        "Publish and manage tour packages, permitted parks, tour sites, inclusions, exclusions, prices, and availability.",
        "Receive bookings, validate meetups, control tour timelines, support travellers, and track service delivery.",
        "Review traveller ratings, improvement signals, reports, and payout records where applicable.",
      ])}
      <p style="margin:0 0 12px;font-size:14px;font-weight:800;color:${TEXT_MAIN};">Documents to prepare</p>
      ${partnerList([
        "Business registration, TIN, business licence, and tourism or park permits.",
        "Fleet, guide, safety, insurance, or service documents where they apply.",
        "Signed partnership agreement or NDA if requested by the NoLSAF team.",
      ])}
      <p style="margin:0 0 16px;font-size:14px;color:${TEXT_MUTED};">For help, reply to this email or contact <a href="mailto:${supportEmail}" style="color:${BRAND_TEAL};text-decoration:none;font-weight:700;">${supportEmail}</a>.</p>
      <p style="margin:24px 0 0;">Warm regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Partnerships Team</strong></p>
    `;
  }

  return partnershipEmail(
    badgeLabel,
    contextLabel,
    `${body}${adminNotesBlock(adminNotes)}`,
    supportEmail
  );
}

export function generateApplicationStatusEmail(data: ApplicationEmailData): string {
  if (data.isPartnership) {
    return generatePartnershipStatusEmail(data);
  }

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

  const positionLabel = jobDepartment ? `${jobTitle} | ${jobDepartment}` : jobTitle;
  const config: Record<ApplicationEmailData["status"], { accent: string; headlineIcon: string; headlineText: string }> = {
    REVIEWING: { accent: "#1d4ed8", headlineIcon: "Review", headlineText: "Application Received" },
    SHORTLISTED: { accent: BRAND_TEAL, headlineIcon: "Star", headlineText: "You've Been Shortlisted" },
    REJECTED: { accent: "#64748b", headlineIcon: "Update", headlineText: "Update on Your Application" },
    HIRED: { accent: BRAND_TEAL, headlineIcon: "Welcome", headlineText: "Welcome to the Team" },
  };
  const { accent, headlineIcon, headlineText } = config[status];

  let body = "";

  if (status === "REVIEWING") {
    body = `
      <p style="margin:0 0 18px;font-size:16px;font-weight:700;color:${TEXT_MAIN};">Dear ${applicantName},</p>
      <p style="margin:0 0 16px;">Thank you for applying for the <strong>${jobTitle}</strong> position at NoLSAF. Your application has been received and is now being reviewed by our team.</p>
      <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:${TEXT_MAIN};">What happens next?</p>
      <p style="margin:0 0 16px;font-size:14px;color:${TEXT_MAIN};">Our team reviews every application against the role requirements. This usually takes <strong>3 to 5 business days</strong>, and we will send an update at each stage.</p>
      <p style="margin:0 0 16px;color:${TEXT_MUTED};font-size:14px;">You do not need to take any action right now. If we need anything else, we will contact you directly.</p>
      <p style="margin:24px 0 0;">Warm regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Careers Team</strong></p>
    `;
  }

  if (status === "SHORTLISTED") {
    body = `
      <p style="margin:0 0 18px;font-size:16px;font-weight:700;color:${BRAND_TEAL};">Congratulations, ${applicantName}.</p>
      <p style="margin:0 0 16px;">Your application for <strong>${jobTitle}</strong> has passed our initial review. A member of our team will contact you with the next step.</p>
      <p style="margin:0 0 16px;font-size:14px;color:${TEXT_MAIN};">The next step may include a phone screening, interview, or short assessment. We will share the details before anything is scheduled.</p>
      <p style="margin:24px 0 0;">Warm regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Careers Team</strong></p>
    `;
  }

  if (status === "REJECTED") {
    body = `
      <p style="margin:0 0 18px;font-size:15px;">Dear <strong>${applicantName}</strong>,</p>
      <p style="margin:0 0 16px;">Thank you for your interest in the <strong>${jobTitle}</strong> role at NoLSAF and for the time you put into your application.</p>
      <p style="margin:0 0 16px;">After reviewing all applications, we have decided to move forward with candidates whose experience more closely matched this role at this time.</p>
      <p style="margin:0 0 16px;font-size:14px;color:${TEXT_MAIN};">We welcome you to apply again for future roles that match your profile.</p>
      <p style="margin:24px 0 0;">Kind regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Careers Team</strong></p>
    `;
  }

  if (status === "HIRED") {
    const expiryNote = setupLink && setupLinkExpiresHours
      ? `<p style="margin:10px 0 18px;font-size:13px;color:${TEXT_MUTED};text-align:center;">This setup link expires in ${setupLinkExpiresHours} hours.</p>`
      : "";
    const cta = setupLink
      ? ctaButton(setupLink, "Set your password", accent)
      : loginUrl
        ? ctaButton(loginUrl, "Sign in to your account", accent)
        : portalUrl
          ? ctaButton(portalUrl, "Open Agent Portal", accent)
          : ctaButton(`mailto:${supportEmail}`, "Contact the HR team", accent);
    const usernameNote = username
      ? `<p style="margin:0 0 16px;font-size:14px;color:${TEXT_MAIN};">Your username / login email: <strong>${username}</strong></p>`
      : "";
    const loginLine = loginUrl
      ? `<p style="margin:0 0 10px;font-size:14px;color:${TEXT_MAIN};">Once your password is set, sign in at: <a href="${loginUrl}" style="color:${accent};text-decoration:none;font-weight:600;">${loginUrl}</a></p>`
      : "";
    const portalLine = portalUrl
      ? `<p style="margin:0 0 16px;font-size:14px;color:${TEXT_MAIN};">Your dashboard is available at: <a href="${portalUrl}" style="color:${accent};text-decoration:none;font-weight:600;">${portalUrl}</a></p>`
      : "";

    body = `
      <p style="margin:0 0 18px;font-size:16px;font-weight:700;color:${BRAND_TEAL};">Welcome to NoLSAF, ${applicantName}.</p>
      <p style="margin:0 0 16px;">We are pleased to offer you the <strong>${jobTitle}</strong> position at NoLSAF. Your account has been created so you can complete onboarding and access your dashboard.</p>
      ${usernameNote}
      ${cta}
      ${expiryNote}
      ${loginLine}
      ${portalLine}
      <p style="margin:20px 0 10px;font-size:14px;font-weight:700;color:${TEXT_MAIN};">Documents to upload during onboarding:</p>
      ${partnerList([
        "Academic certificates or professional documents requested by the team.",
        "Signed NDA or agreement if requested.",
        "Any additional documents noted in your onboarding communication.",
      ])}
      <p style="margin:0 0 16px;font-size:14px;color:${TEXT_MUTED};">Our team is here to help. Reply to this email or reach us at <a href="mailto:${supportEmail}" style="color:${BRAND_TEAL};text-decoration:none;">${supportEmail}</a>.</p>
      <p style="margin:24px 0 0;">Warm regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Careers Team</strong></p>
    `;
  }

  return careersEmail(
    headlineIcon,
    headlineText,
    positionLabel,
    `${body}${adminNotesBlock(adminNotes)}`,
    supportEmail
  );
}

/**
 * Email templates for job application status updates
 */

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

/**
 * Generate email subject based on status
 */
export function getApplicationEmailSubject(status: ApplicationEmailData["status"], jobTitle: string): string {
  switch (status) {
    case "REVIEWING":
      return `Your Application for ${jobTitle} is Under Review`;
    case "SHORTLISTED":
      return `Congratulations! You've Been Shortlisted for ${jobTitle}`;
    case "REJECTED":
      return `Update on Your Application for ${jobTitle}`;
    case "HIRED":
      return `Congratulations! Job Offer for ${jobTitle}`;
    default:
      return `Update on Your Application for ${jobTitle}`;
  }
}

/**
 * Generate HTML email content based on status
 */
export function generateApplicationStatusEmail(data: ApplicationEmailData): string {
  const {
    applicantName,
    jobTitle,
    jobDepartment,
    status,
    adminNotes,
    companyName = "NoLSAF Inc Limited",
    supportEmail = "careers@nolsaf.com",
    portalUrl,
    loginUrl,
    username,
    setupLink,
    setupLinkExpiresHours,
  } = data;

  const baseStyles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
      .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
      .header { background: linear-gradient(135deg, #02665e 0%, #024d47 100%); color: #ffffff; padding: 30px 20px; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
      .content { padding: 30px 20px; }
      .greeting { font-size: 16px; margin-bottom: 20px; }
      .message { font-size: 15px; color: #555; margin-bottom: 20px; line-height: 1.8; }
      .job-info { background-color: #f8f9fa; border-left: 4px solid #02665e; padding: 15px; margin: 20px 0; border-radius: 4px; }
      .job-title { font-size: 18px; font-weight: 600; color: #02665e; margin-bottom: 5px; }
      .job-department { font-size: 14px; color: #666; }
      .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin: 15px 0; }
      .notes-section { background-color: #fff9e6; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
      .notes-title { font-weight: 600; color: #92400e; margin-bottom: 10px; font-size: 14px; }
      .notes-content { color: #78350f; font-size: 14px; line-height: 1.6; }
      .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; }
      .footer-text { font-size: 12px; color: #6b7280; margin: 5px 0; }
      .footer-link { color: #02665e; text-decoration: none; }
      .cta-button { display: inline-block; padding: 12px 24px; background-color: #02665e; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
      .cta-button:hover { background-color: #024d47; }
    </style>
  `;

  let statusBadge = "";
  let statusMessage = "";
  let ctaButton = "";
  let onboardingPanel = "";

  switch (status) {
    case "REVIEWING":
      statusBadge = `<span class="status-badge" style="background-color: #dbeafe; color: #1e40af;">Under Review</span>`;
      statusMessage = `
        <p>We wanted to let you know that we have received your application and our team is currently reviewing it. We appreciate your interest in joining our team.</p>
        <p>We will keep you updated on the progress of your application. This process typically takes a few business days.</p>
      `;
      break;

    case "SHORTLISTED":
      statusBadge = `<span class="status-badge" style="background-color: #d1fae5; color: #065f46;">Shortlisted</span>`;
      statusMessage = `
        <p><strong>Congratulations!</strong> We are pleased to inform you that your application has been shortlisted for the position of <strong>${jobTitle}</strong>.</p>
        <p>Your qualifications and experience have impressed our hiring team. We will be in touch soon to discuss the next steps in our hiring process, which may include interviews or additional assessments.</p>
        <p>Please keep an eye on your email for further communication from our team.</p>
      `;
      ctaButton = `<a href="mailto:${supportEmail}" class="cta-button">Contact Us</a>`;
      break;

    case "REJECTED":
      statusBadge = `<span class="status-badge" style="background-color: #fee2e2; color: #991b1b;">Not Selected</span>`;
      statusMessage = `
        <p>Thank you for your interest in the <strong>${jobTitle}</strong> position and for taking the time to apply with us.</p>
        <p>After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.</p>
        <p>We encourage you to apply for future positions that may be a better fit for your skills and experience. We appreciate your interest in our organization.</p>
      `;
      break;

    case "HIRED":
      statusBadge = `<span class="status-badge" style="background-color: #ddd6fe; color: #5b21b6;">Hired</span>`;
      statusMessage = `
        <p><strong>Congratulations!</strong> We are thrilled to offer you the position of <strong>${jobTitle}</strong> at ${companyName}.</p>
        <p>Your application stood out among many, and we believe you will be a valuable addition to our team.</p>
        <p>To help you get started immediately, your portal access details are included below. Our HR team will still follow up with the remaining onboarding coordination (start date, internal briefings, and any role-specific documents).</p>
      `;
      if (setupLink) {
        ctaButton = `<a href="${setupLink}" class="cta-button">Set Your Password</a>`;
      } else if (loginUrl) {
        ctaButton = `<a href="${loginUrl}" class="cta-button">Sign In</a>`;
      } else if (portalUrl) {
        ctaButton = `<a href="${portalUrl}" class="cta-button">Open Agent Portal</a>`;
      } else {
        ctaButton = `<a href="mailto:${supportEmail}" class="cta-button">Contact HR Team</a>`;
      }

      onboardingPanel = `
        <div class="job-info" style="border-left-color:#5b21b6;">
          <div class="job-title" style="color:#5b21b6;">Agent Portal Access</div>
          <div class="message" style="margin: 12px 0 0;">
            <p style="margin:0 0 10px;">Follow these steps to start using the portal:</p>

            <ol style="margin:0 0 12px; padding-left: 18px;">
              <li style="margin:0 0 6px;">
                <strong>Set your password</strong>
                ${setupLink
                  ? ` using this one-time link: <a href="${setupLink}" class="footer-link">Set password</a>${setupLinkExpiresHours ? ` <span style=\"color:#6b7280; font-size:12px;\">(expires in ${setupLinkExpiresHours} hours)</span>` : ""}`
                  : ". If you already have a password, skip this step."}
              </li>
              <li style="margin:0 0 6px;"><strong>Sign in</strong> with your username and password.</li>
              <li style="margin:0;"><strong>Open the Agent Portal</strong> and complete your onboarding uploads.</li>
            </ol>

            <p style="margin:0 0 6px;"><strong>Username:</strong> ${username ? String(username) : "(your application email/phone)"}</p>
            ${loginUrl ? `<p style="margin:0 0 6px;"><strong>Login:</strong> <a href="${loginUrl}" class="footer-link">${loginUrl}</a></p>` : ""}
            ${portalUrl ? `<p style="margin:0 0 12px;"><strong>Portal:</strong> <a href="${portalUrl}" class="footer-link">${portalUrl}</a></p>` : ""}

            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
              <div style="font-weight: 600; color: #111827; margin-bottom: 8px;">Documents to prepare for upload</div>
              <ul style="margin: 0; padding-left: 18px; color: #374151;">
                <li style="margin: 0 0 6px;">Academic certificates (clear scan/photo, PDF/JPG/PNG).</li>
                <li style="margin: 0 0 6px;">Signed NDA (Non-Disclosure Agreement) — we will share the NDA template if you haven’t received it yet.</li>
                <li style="margin: 0;">Any additional documents requested by HR in your onboarding notes.</li>
              </ul>
            </div>
          </div>
        </div>
      `;
      break;
  }

  const notesSection = adminNotes
    ? `
      <div class="notes-section">
        <div class="notes-title">Additional Notes from Our Team:</div>
        <div class="notes-content">${adminNotes.replace(/\n/g, "<br>")}</div>
      </div>
    `
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Application Status Update</title>
      ${baseStyles}
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>${companyName}</h1>
        </div>
        
        <div class="content">
          <div class="greeting">
            <p>Dear ${applicantName},</p>
          </div>
          
          <div class="message">
            ${statusMessage}
          </div>
          
          <div class="job-info">
            <div class="job-title">${jobTitle}</div>
            ${jobDepartment ? `<div class="job-department">${jobDepartment}</div>` : ""}
            ${statusBadge}
          </div>

          ${onboardingPanel}
          
          ${notesSection}
          
          ${ctaButton}
        </div>
        
        <div class="footer">
          <p class="footer-text">This is an automated message. Please do not reply directly to this email.</p>
          <p class="footer-text">
            If you have any questions, please contact us at 
            <a href="mailto:${supportEmail}" class="footer-link">${supportEmail}</a>
          </p>
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p class="footer-text" style="font-size: 11px; color: #9ca3af; line-height: 1.6; text-align: left; max-width: 550px; margin: 0 auto;">
              <strong>Disclaimer:</strong> This email and any attachments are confidential and intended solely for the use of the individual or entity to whom they are addressed. If you have received this email in error, please notify the sender immediately and delete this message from your system. Any unauthorized use, disclosure, copying, or distribution of this email or its contents is strictly prohibited. ${companyName} does not accept any liability for any errors or omissions in the contents of this message, which arise as a result of email transmission. The information contained in this email is subject to change without notice.
            </p>
          </div>
          
          <p class="footer-text" style="margin-top: 15px; color: #9ca3af;">
            &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

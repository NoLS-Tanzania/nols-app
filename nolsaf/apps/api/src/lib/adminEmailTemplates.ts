/**
 * adminEmailTemplates.ts
 * Admin-specific transactional email templates
 */
import { BRAND_TEAL, BRAND_DARK, TEXT_MUTED, TEXT_MAIN, baseEmail, infoCard, calloutBox, ctaButton } from "./emailBase.js";

const ADMIN_BLUE = "#1e40af";
const ADMIN_GRADIENT = "#1e3a8a";

/**
 * Admin welcome email - sent when user is promoted to or created as ADMIN
 */
export function getAdminWelcomeEmail(data: {
  name: string;
  email: string;
  isNewlyCreated: boolean;
}): { subject: string; html: string } {
  const action = data.isNewlyCreated ? "created as" : "promoted to";
  const greetingName = data.name || "Admin";
  const appUrl = process.env.WEB_ORIGIN || process.env.APP_ORIGIN || "https://www.nolsaf.com";
  const adminDashboardUrl = `${appUrl}/admin`;

  const body = `
    <p style="margin:0 0 18px;font-size:17px;font-weight:600;color:${ADMIN_BLUE};">
      Jambo ${greetingName}! 👋
    </p>
    
    <p style="margin:0 0 16px;font-size:15px;color:${TEXT_MAIN};line-height:1.6;">
      You have been <strong>${action} Administrator</strong> for NoLSAF, East Africa's leading accommodation and tourism access platform. This is a position of trust and responsibility.
    </p>

    ${calloutBox(
      BRAND_TEAL,
      "🛡️",
      "Your Core Responsibilities",
      `
        <ul style="margin:8px 0 0;padding-left:20px;line-height:1.8;">
          <li><strong>Property Verification:</strong> Review and approve listings, photos, and owner documentation</li>
          <li><strong>Driver & Agent Management:</strong> Conduct KYC reviews and background checks</li>
          <li><strong>Platform Safety:</strong> Monitor integrity, investigate fraud reports, manage suspensions</li>
          <li><strong>Support Escalation:</strong> Resolve complex booking disputes and customer issues</li>
          <li><strong>Financial Oversight:</strong> Review transactions, process refunds, manage payouts</li>
          <li><strong>Data Protection:</strong> Handle sensitive information with strict confidentiality</li>
        </ul>
      `
    )}

    ${calloutBox(
      "#dc2626",
      "⚠️",
      "Critical Security & Compliance Policies",
      `
        <ul style="margin:8px 0 0;padding-left:20px;line-height:1.8;">
          <li><strong>Enable 2FA Immediately:</strong> Two-Factor Authentication is required for all admin accounts</li>
          <li><strong>Credential Security:</strong> Never share your login details with anyone</li>
          <li><strong>Audit Trail:</strong> Every admin action is logged and audited</li>
          <li><strong>Data Privacy:</strong> Comply with GDPR and Tanzania Data Protection Act</li>
          <li><strong>Conflict of Interest:</strong> Do not approve your own properties or transactions</li>
          <li><strong>Session Management:</strong> Always log out when finished</li>
        </ul>
      `
    )}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;">
      <tr>
        <td style="background:linear-gradient(135deg, ${ADMIN_BLUE} 0%, #1e3a8a 100%);border-radius:12px;padding:24px;text-align:center;">
          <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#ffffff;">
            📊 Access Your Admin Dashboard
          </p>
          <p style="margin:0 0 18px;font-size:14px;color:rgba(255,255,255,0.9);">
            Manage users, properties, bookings, and system settings
          </p>
          ${ctaButton(adminDashboardUrl, "Go to Admin Dashboard →", "#ffffff")}
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="16" border="0"
      style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;margin:24px 0;">
      <tr><td>
        <p style="margin:0;font-size:14px;color:#92400e;">
          <strong>⚡ Action Required:</strong> Log in within 24 hours and enable Two-Factor Authentication (2FA) in your account security settings.
        </p>
      </td></tr>
    </table>

    ${infoCard(ADMIN_BLUE, [
      ["Login URL", `<a href="${adminDashboardUrl}" style="color:${BRAND_TEAL};text-decoration:none;">${adminDashboardUrl}</a>`],
      ["Your Email", data.email],
      ["Support", `<a href="mailto:support@nolsaf.com" style="color:${BRAND_TEAL};text-decoration:none;">support@nolsaf.com</a>`]
    ])}

    <p style="margin:24px 0 0;font-size:14px;color:${TEXT_MUTED};line-height:1.7;">
      Welcome to the team! Together, we're making Africa more accessible to travelers worldwide. 🌍
    </p>

    <p style="margin:20px 0 0;font-size:14px;color:${TEXT_MAIN};">
      Karibu sana!<br>
      <strong style="color:${BRAND_DARK};">NoLSAF Admin Team</strong>
    </p>
  `;

  return {
    subject: "🎉 Welcome to NoLSAF Admin Team – Action Required",
    html: baseEmail(ADMIN_BLUE, ADMIN_GRADIENT, "Admin Access Granted", "🔐", body),
  };
}

/**
 * Get SMS message for admin welcome
 */
export function getAdminWelcomeSms(data: {
  name: string;
  isNewlyCreated: boolean;
}): string {
  const action = data.isNewlyCreated ? "created as" : "promoted to";
  const greetingName = data.name || "Admin";

  return `Jambo ${greetingName}! You have been ${action} ADMIN at NoLSAF 🎉

Your responsibilities:
✓ Verify properties & drivers
✓ Monitor platform security
✓ Handle support escalations
✓ Protect user data

CRITICAL:
• Enable 2FA immediately
• Never share credentials
• All actions are audited
• Follow data protection laws

Login: www.nolsaf.com/admin

Karibu! 🌍
- NoLSAF Admin Team`;
}

/**
 * Admin revocation email - sent when admin privileges are removed
 */
export function getAdminRevocationEmail(data: {
  name: string;
  email: string;
  reason?: string;
  revokedBy?: string;
  effectiveDate?: string;
}): { subject: string; html: string } {
  const greetingName = data.name || "User";
  const appUrl = process.env.WEB_ORIGIN || process.env.APP_ORIGIN || "https://www.nolsaf.com";
  const loginUrl = `${appUrl}/login`;
  const effectiveDate = data.effectiveDate || new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const body = `
    <p style="margin:0 0 18px;font-size:17px;font-weight:600;color:#dc2626;">
      Important: Admin Access Revoked
    </p>
    
    <p style="margin:0 0 16px;font-size:15px;color:${TEXT_MAIN};line-height:1.6;">
      Dear ${greetingName},
    </p>

    <p style="margin:0 0 16px;font-size:15px;color:${TEXT_MAIN};line-height:1.6;">
      Your Administrator privileges for the NoLSAF platform have been revoked effective <strong>${effectiveDate}</strong>.
    </p>

    ${data.reason ? calloutBox(
      "#dc2626",
      "📋",
      "Reason for Revocation",
      `<p style="margin:0;font-size:14px;color:${TEXT_MAIN};">${data.reason}</p>`
    ) : ""}

    ${infoCard("#dc2626", [
      ["Effective Date", effectiveDate],
      ["Your Account Status", "Active (Standard User)"],
      ["Admin Access", "Revoked"],
      ...(data.revokedBy ? [["Revoked By", data.revokedBy] as [string, string]] : [])
    ])}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="16" border="0"
      style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:8px;margin:24px 0;">
      <tr><td>
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1e40af;">
          ℹ️ What This Means for You
        </p>
        <ul style="margin:8px 0 0;padding-left:20px;font-size:14px;color:${TEXT_MAIN};line-height:1.8;">
          <li>You no longer have access to the admin dashboard</li>
          <li>Your account remains active as a standard user</li>
          <li>You can still use NoLSAF services normally</li>
          <li>All bookings and account data are preserved</li>
          <li>Previous admin actions remain in audit logs</li>
        </ul>
      </td></tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="16" border="0"
      style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;margin:24px 0;">
      <tr><td>
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#92400e;">
          🔐 Important Security Notice
        </p>
        <p style="margin:0;font-size:14px;color:#92400e;line-height:1.6;">
          If you still have access to any admin credentials, please destroy them immediately. Attempting to access admin features with a revoked account may result in account suspension.
        </p>
      </td></tr>
    </table>

    <p style="margin:24px 0 12px;font-size:15px;color:${TEXT_MAIN};line-height:1.6;">
      You can continue to access your account and use NoLSAF services:
    </p>

    ${ctaButton(loginUrl, "Continue to Your Account", BRAND_TEAL)}

    <p style="margin:28px 0 12px;font-size:14px;color:${TEXT_MUTED};line-height:1.7;">
      If you believe this was done in error or have questions about this decision, please contact our support team at <a href="mailto:support@nolsaf.com" style="color:${BRAND_TEAL};text-decoration:none;">support@nolsaf.com</a>.
    </p>

    <p style="margin:24px 0 0;font-size:14px;color:${TEXT_MAIN};">
      Regards,<br>
      <strong style="color:${BRAND_DARK};">NoLSAF Admin Team</strong>
    </p>
  `;

  return {
    subject: "Admin Access Revoked – NoLSAF",
    html: baseEmail("#dc2626", "#991b1b", "Access Revoked", "🔒", body),
  };
}

/**
 * Get SMS message for admin revocation
 */
export function getAdminRevocationSms(data: {
  name: string;
  reason?: string;
}): string {
  const greetingName = data.name || "User";

  return `NoLSAF: Admin Access Revoked

Dear ${greetingName},

Your Administrator privileges have been revoked.

${data.reason ? `Reason: ${data.reason}` : ""}

What this means:
• No admin dashboard access
• Standard user account remains active
• All bookings & data preserved

Questions? Email support@nolsaf.com

You can still use NoLSAF services normally at www.nolsaf.com

- NoLSAF Admin Team`;
}

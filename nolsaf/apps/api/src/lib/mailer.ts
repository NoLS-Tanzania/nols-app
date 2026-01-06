import { Resend } from "resend";
import nodemailer from "nodemailer";
import sanitizeHtml from "sanitize-html";

// Initialize Resend if API key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Initialize SMTP transporter as fallback
const smtpTransporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! } : undefined,
}) : null;

/**
 * Send email using Resend (preferred) or SMTP (fallback)
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - Email HTML content
 */
export async function sendMail(to: string, subject: string, html: string) {
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_DOMAIN || "no-reply@nolsapp.com";
  
  // Sanitize HTML content
  const clean = sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "table", "thead", "tbody", "tfoot", "tr", "td", "th"]),
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "width", "height", "style"],
      td: ["style", "colspan", "rowspan"],
      th: ["style", "colspan", "rowspan"],
      table: ["style", "width", "border", "cellpadding", "cellspacing"],
      '*': ["style"]
    },
    allowedSchemes: ["http", "https", "data", "mailto"],
  });

  // Try Resend first (if configured)
  if (resend && process.env.RESEND_API_KEY) {
    try {
      const { data, error } = await resend.emails.send({
        from: from,
        to: [to],
        subject: subject,
        html: clean,
      });

      if (error) {
        console.error('[Resend] Email send error:', error);
        throw new Error(`Resend error: ${error.message || 'Unknown error'}`);
      }

      return { success: true, messageId: data?.id, provider: 'resend' };
    } catch (error: any) {
      console.error('[Resend] Failed to send email, falling back to SMTP:', error.message);
      // Fall through to SMTP fallback
    }
  }

  // Fallback to SMTP if Resend fails or is not configured
  if (smtpTransporter && process.env.SMTP_HOST) {
    try {
      const info = await smtpTransporter.sendMail({ from, to, subject, html: clean });
      return { success: true, messageId: info.messageId, provider: 'smtp' };
    } catch (error: any) {
      console.error('[SMTP] Failed to send email:', error.message);
      throw new Error(`Email send failed: ${error.message}`);
    }
  }

  // Development mode: just log if no provider is configured
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Email] -> ${to}: ${subject}`);
    console.log(`[Email] Content: ${clean.substring(0, 100)}...`);
    return { success: true, messageId: `dev-${Date.now()}`, provider: 'console' };
  }

  throw new Error('No email provider configured. Please set RESEND_API_KEY or SMTP_HOST');
}

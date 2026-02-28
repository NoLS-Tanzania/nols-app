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

export interface MailAttachment {
  /** Filename shown to the recipient (e.g. "Booking-ABCD1234.pdf") */
  filename: string;
  /** Raw binary content — use Buffer from pdfkit or similar */
  content: Buffer;
}

/**
 * Send email using Resend (preferred) or SMTP (fallback)
 * @param to          - Recipient email address
 * @param subject     - Email subject
 * @param html        - Email HTML content
 * @param attachments - Optional PDF/file attachments
 */
export async function sendMail(
  to: string,
  subject: string,
  html: string,
  attachments?: MailAttachment[]
) {
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_DOMAIN || "no-reply@nolsaf.com";
  
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

  // Try Resend (if configured) — if Resend key is set but send fails, throw immediately
  // rather than silently falling through; this surfaces domain-verification errors to callers
  if (resend && process.env.RESEND_API_KEY) {
    console.log(`[Resend] Sending email from=${from} to=${to} subject="${subject}"`);
    const { data, error } = await resend.emails.send({
      from: from,
      to: [to],
      subject: subject,
      html: clean,
      ...(attachments?.length ? {
        attachments: attachments.map(a => ({
          filename: a.filename,
          content: a.content,
        })),
      } : {}),
    });

    if (error) {
      console.error('[Resend] Email send error:', { from, to, error });
      throw new Error(`Resend error: ${(error as any).message || JSON.stringify(error)}`);
    }

    console.log(`[Resend] Email sent successfully id=${data?.id} from=${from} to=${to}`);
    return { success: true, messageId: data?.id, provider: 'resend' };
  }

  // Fallback to SMTP only when Resend is not configured at all
  if (smtpTransporter && process.env.SMTP_HOST) {
    try {
      const info = await smtpTransporter.sendMail({
        from,
        to,
        subject,
        html: clean,
        ...(attachments?.length ? {
          attachments: attachments.map(a => ({
            filename: a.filename,
            content: a.content,
            contentType: 'application/pdf',
          })),
        } : {}),
      });
      return { success: true, messageId: info.messageId, provider: 'smtp' };
    } catch (error: any) {
      console.error('[SMTP] Failed to send email:', error.message);
      throw new Error(`Email send failed: ${error.message}`);
    }
  }

  // Development mode: log instead of sending — but ONLY when no provider is configured at all
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Email:DEV] No provider configured — logging only. from=${from} to=${to} subject="${subject}"`);
    console.log(`[Email:DEV] Content: ${clean.substring(0, 200)}...`);
    return { success: true, messageId: `dev-${Date.now()}`, provider: 'console' };
  }

  throw new Error('No email provider configured. Set RESEND_API_KEY or SMTP_HOST environment variables.');
}

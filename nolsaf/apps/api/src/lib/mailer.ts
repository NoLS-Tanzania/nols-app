import nodemailer from "nodemailer";
import sanitizeHtml from "sanitize-html";

const transporter = nodemailer.createTransport({
  // Swap for your SMTP/SES transporter; this works with local/dev SMTP too
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! } : undefined,
});

export async function sendMail(to: string, subject: string, html: string) {
  const from = process.env.EMAIL_FROM || "no-reply@nolsapp.com";
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
  await transporter.sendMail({ from, to, subject, html: clean });
}

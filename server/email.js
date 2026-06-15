import nodemailer from "nodemailer";
import sanitizeHtml from "sanitize-html";
import { generateUnsubscribeToken } from "./unsubscribe.js";
import { linkifyUrls } from "./linkify.js";

const transport = nodemailer.createTransport({
  host: process.env.SES_SMTP_HOST,
  port: parseInt(process.env.SES_SMTP_PORT || "587", 10),
  secure: false,
  auth: {
    user: process.env.SES_SMTP_USER,
    pass: process.env.SES_SMTP_PASS,
  },
});

// Replace recipient-specific placeholders AND sender identity placeholders.
// senderProfile defaults to {} so callers that don't pass it continue to work.
function replacePlaceholders(text, contact, senderProfile = {}) {
  return text
    .replace(/\{\{name\}\}/gi,           contact.name     || "")
    .replace(/\{\{email\}\}/gi,          contact.email    || "")
    .replace(/\{\{company\}\}/gi,        contact.company  || "")
    .replace(/\{\{category\}\}/gi,       contact.category || "")
    .replace(/\{\{sender_name\}\}/gi,    senderProfile.name    || "")
    .replace(/\{\{sender_title\}\}/gi,   senderProfile.title   || "")
    .replace(/\{\{sender_company\}\}/gi, senderProfile.company || "")
    .replace(/\{\{sender_phone\}\}/gi,   senderProfile.phone   || "");
}

// Convert plain-text template body to HTML for email delivery.
// Templates are authored as plain text (textarea, no rich editor).
// HTML email clients collapse \n to whitespace, so we must convert explicitly:
//   \n\n  → paragraph break (<p>)
//   \n    → line break within a paragraph (<br>)
function plainTextToHtml(text) {
  if (!text) return "";
  return text
    .split(/\n{2,}/)
    .filter(para => para.trim().length > 0)
    .map(para => {
      // linkifyUrls operates on plain text (before any <br> insertion) so the
      // regex scans raw text with no pre-existing HTML tags.
      const linked     = linkifyUrls(para);
      const withBreaks = linked.replace(/\n/g, "<br>");
      return `<p style="margin:0 0 16px 0;">${withBreaks}</p>`;
    })
    .join("");
}

const EMAIL_SANITIZE_OPTIONS = {
  allowedTags: [
    "h1","h2","h3","h4","h5","h6",
    "p","br","hr",
    "div","span","center",
    "strong","b","em","i","u","s","small",
    "a","img",
    "ul","ol","li",
    "table","thead","tbody","tr","th","td",
    "blockquote","pre","code",
  ],
  allowedAttributes: {
    "*": ["style","class"],
    "a": ["href","target","rel"],
    "img": ["src","alt","width","height","style"],
    "table": ["cellpadding","cellspacing","border","width","align"],
    "td": ["colspan","rowspan","width","align","valign","style"],
    "th": ["colspan","rowspan","width","align","valign","style"],
    "div": ["align"],
  },
  allowedSchemes: ["http","https","mailto"],
  allowedSchemesByTag: { img: ["http","https","data"] },
};

// senderProfile: { name, title, company, phone, replyToEmail } — from user.sender* fields
export async function sendCampaignEmail(contact, template, userId, campaignEmailId, senderProfile = {}) {
  const subject = sanitizeHtml(
    replacePlaceholders(template.subject || "", contact, senderProfile),
    { allowedTags: [], allowedAttributes: {} }
  );

  // bodyRaw: plain-text body with placeholders substituted — kept for the plain-text part
  const bodyRaw = replacePlaceholders(template.body || "", contact, senderProfile);

  // bodyHtml: convert newlines to HTML paragraph/line-break structure, then sanitize
  const bodyHtml = sanitizeHtml(plainTextToHtml(bodyRaw), EMAIL_SANITIZE_OPTIONS);

  const unsubscribeFooter = buildUnsubscribeFooter(userId, contact.email);

  // Full HTML email document — improves rendering consistency across Gmail, Outlook, Apple Mail
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.6;background-color:#ffffff;">
<div style="max-width:600px;">
${bodyHtml}
${unsubscribeFooter.html}
</div>
</body>
</html>`;

  // Plain-text fallback: preserve actual body content for clients that render text/plain
  const text = `${bodyRaw}${unsubscribeFooter.text}`;

  // From: use sender's configured display name, fall back to platform name
  const fromName = senderProfile.name
    ? senderProfile.name
    : (process.env.SES_FROM_NAME || "RepMail");

  const mailOptions = {
    from: `"${fromName}" <${process.env.SES_FROM_EMAIL}>`,
    to: contact.email,
    subject,
    html,
    text,
  };

  // Reply-To: route replies to the sender's own email if configured
  if (senderProfile.replyToEmail) {
    mailOptions.replyTo = senderProfile.replyToEmail;
  }

  // Attach SES configuration set and message tag so SNS receives Open/Click events
  // tagged with the campaign_emails.id UUID — only when the env var is configured.
  if (process.env.SES_CONFIGURATION_SET && campaignEmailId) {
    mailOptions.headers = {
      "X-SES-CONFIGURATION-SET": process.env.SES_CONFIGURATION_SET,
      "X-SES-MESSAGE-TAGS": `campaign-email-id=${campaignEmailId}`,
    };
  }

  const info = await transport.sendMail(mailOptions);
  return info; // caller reads info.messageId for the SES Message-ID
}

function buildUnsubscribeFooter(userId, email) {
  if (!userId || !email) return { html: "", text: "" };
  const token = generateUnsubscribeToken(userId, email);
  const base = process.env.APP_URL || "http://localhost:5000";
  const url = `${base}/api/unsubscribe?uid=${encodeURIComponent(userId)}&email=${encodeURIComponent(email)}&token=${token}`;
  return {
    html: `<p style="margin-top:32px;font-size:12px;color:#6b7280;">If you'd prefer not to hear from me, <a href="${url}" style="color:#6b7280;">unsubscribe</a>.</p>`,
    text: `\n\nIf you'd prefer not to hear from me, unsubscribe: ${url}`,
  };
}

export async function sendTransactionalEmail(to, subject, text) {
  await transport.sendMail({
    from: `"${process.env.SES_FROM_NAME || "RepMail"}" <${process.env.SES_FROM_EMAIL}>`,
    to,
    subject,
    text,
  });
}

export async function verifySesConnection() {
  try {
    await transport.verify();
  } catch (err) {
    console.error("[SMTP-VERIFY] Failed:", {
      code:     err.code,
      command:  err.command,
      response: err.response,
      message:  err.message,
    });
    throw err;
  }
}

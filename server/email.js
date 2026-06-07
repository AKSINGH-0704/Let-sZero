import nodemailer from "nodemailer";
import sanitizeHtml from "sanitize-html";
import { generateUnsubscribeToken } from "./unsubscribe.js";

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
// Called once per email — order matters: recipient fields first, then sender fields.
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
  const bodyHtml = sanitizeHtml(
    replacePlaceholders(template.body || "", contact, senderProfile),
    EMAIL_SANITIZE_OPTIONS
  );

  const unsubscribeFooter = buildUnsubscribeFooter(userId, contact.email);
  const html = `${bodyHtml}${unsubscribeFooter.html}`;
  const text = unsubscribeFooter.text;

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
    html: `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
You received this email as part of an outreach campaign.
<br>To stop receiving emails from this sender, <a href="${url}" style="color:#6b7280;">unsubscribe here</a>.
</div>`,
    text: `\n\n---\nTo unsubscribe: ${url}`,
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

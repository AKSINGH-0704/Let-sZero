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

  const headers = {};

  // RFC 2369 List-Unsubscribe — required by Gmail 2024 bulk sender policy.
  // RFC 8058 List-Unsubscribe-Post — enables Gmail's native one-click unsubscribe button.
  // Reuses the URL already computed by buildUnsubscribeFooter — no second token generation.
  if (unsubscribeFooter.url) {
    headers["List-Unsubscribe"]      = `<${unsubscribeFooter.url}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  // Feedback-ID: ties complaint feedback to a specific send for Gmail Postmaster Tools.
  if (campaignEmailId) {
    headers["Feedback-ID"] = `${campaignEmailId}:repmail`;
  }

  // SES configuration set and per-message tag so SNS receives Open/Click events
  // keyed on the campaign_emails.id UUID — only when the env var is configured.
  if (process.env.SES_CONFIGURATION_SET && campaignEmailId) {
    headers["X-SES-CONFIGURATION-SET"] = process.env.SES_CONFIGURATION_SET;
    headers["X-SES-MESSAGE-TAGS"]      = `campaign-email-id=${campaignEmailId}`;
  }

  if (Object.keys(headers).length > 0) {
    mailOptions.headers = headers;
  }

  const info = await transport.sendMail(mailOptions);
  return info; // caller reads info.messageId for the SES Message-ID
}

function buildUnsubscribeFooter(userId, email) {
  if (!userId || !email) return { url: null, html: "", text: "" };
  const token = generateUnsubscribeToken(userId, email);
  const base = process.env.APP_URL || "http://localhost:5000";
  const url = `${base}/api/unsubscribe?uid=${encodeURIComponent(userId)}&email=${encodeURIComponent(email)}&token=${token}`;
  return {
    url,
    html: `<p style="margin-top:32px;font-size:12px;color:#6b7280;">If you'd prefer not to hear from me, <a href="${url}" style="color:#6b7280;">unsubscribe</a>.</p>`,
    text: `\n\nIf you'd prefer not to hear from me, unsubscribe: ${url}`,
  };
}

export async function sendPaymentReceiptEmail(to, username, payment, creditsBalance) {
  const creditsAdded = (payment.credits || 0).toLocaleString("en-IN");
  const amountPaid = `₹${(payment.amountInr || payment.amountLocal || 0).toLocaleString("en-IN")}`;
  const planName = payment.planName || "Credits";
  const invoiceRef = payment.invoiceNumber || payment.id;
  const paymentRef = payment.transactionId || null;
  const balanceAfter = creditsBalance != null ? creditsBalance.toLocaleString("en-IN") : null;
  const appUrl = process.env.APP_URL || "https://repmail.in";
  const displayName = username || "there";

  const subject = `Your ${planName} credits are ready — RepMail`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#06060B;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:40px 24px;">
  <div style="text-align:center;margin-bottom:28px;">
    <span style="font-size:12px;font-weight:700;letter-spacing:0.1em;color:#00E5C8;">REPMAIL</span>
    <span style="font-size:12px;color:#3A3A55;margin-left:6px;">by LetsZero</span>
  </div>
  <h1 style="color:#F0F0F5;font-size:22px;font-weight:700;margin:0 0 6px 0;text-align:center;">Payment confirmed ✓</h1>
  <p style="color:#7878A0;font-size:14px;text-align:center;margin:0 0 32px 0;">Hi ${displayName}, your credits are ready to use.</p>
  <div style="background:#0C0C14;border:1px solid #1A1A2E;border-radius:16px;overflow:hidden;margin-bottom:28px;">
    <div style="display:flex;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #1A1A2E;">
      <span style="color:#7878A0;font-size:13px;">Plan</span>
      <span style="color:#F0F0F5;font-size:13px;font-weight:600;">${planName}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-bottom:1px solid #1A1A2E;background:rgba(0,229,200,0.03);">
      <span style="color:#7878A0;font-size:13px;">Credits added</span>
      <span style="color:#00E5C8;font-size:20px;font-weight:700;font-family:'Courier New',monospace;">${creditsAdded}</span>
    </div>
    ${balanceAfter ? `
    <div style="display:flex;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #1A1A2E;">
      <span style="color:#7878A0;font-size:13px;">Current balance</span>
      <span style="color:#B8B8D0;font-size:13px;font-weight:600;">${balanceAfter} credits</span>
    </div>` : ""}
    <div style="display:flex;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #1A1A2E;">
      <span style="color:#7878A0;font-size:13px;">Amount paid</span>
      <span style="color:#F0F0F5;font-size:13px;font-weight:600;">${amountPaid}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:14px 20px;${paymentRef ? "border-bottom:1px solid #1A1A2E;" : ""}">
      <span style="color:#7878A0;font-size:13px;">Invoice</span>
      <span style="color:#55556A;font-size:12px;font-family:'Courier New',monospace;">${invoiceRef}</span>
    </div>
    ${paymentRef ? `
    <div style="display:flex;justify-content:space-between;padding:14px 20px;">
      <span style="color:#7878A0;font-size:13px;">Payment ref</span>
      <span style="color:#55556A;font-size:12px;font-family:'Courier New',monospace;">${paymentRef}</span>
    </div>` : ""}
  </div>
  <div style="text-align:center;margin-bottom:28px;">
    <a href="${appUrl}/app/campaigns/new"
       style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#00E5C8,#00B8A3);color:#06060B;font-weight:700;font-size:14px;text-decoration:none;border-radius:12px;">
      Create Campaign →
    </a>
  </div>
  <p style="color:#3A3A55;font-size:12px;text-align:center;margin:0 0 8px 0;">
    Questions? Email <a href="mailto:support@letszero.in" style="color:#55556A;">support@letszero.in</a>
  </p>
  <p style="color:#2A2A40;font-size:12px;text-align:center;margin:0;">
    This is a receipt for your RepMail purchase. Keep it for your records.
  </p>
</div>
</body>
</html>`;

  const text = `Payment confirmed — RepMail by LetsZero

Hi ${displayName},

Your ${planName} credits are ready.

Plan:           ${planName}
Credits added:  ${creditsAdded}${balanceAfter ? `\nCurrent balance: ${balanceAfter} credits` : ""}
Amount paid:    ${amountPaid}
Invoice:        ${invoiceRef}${paymentRef ? `\nPayment ref:    ${paymentRef}` : ""}

Create your first campaign: ${appUrl}/app/campaigns/new

Questions? Email support@letszero.in

This is a receipt for your RepMail purchase.`;

  await transport.sendMail({
    from: `"RepMail" <${process.env.SES_FROM_EMAIL}>`,
    to,
    subject,
    html,
    text,
  });
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

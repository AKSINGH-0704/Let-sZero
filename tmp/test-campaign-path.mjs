// Production-path deliverability test.
// Calls sendCampaignEmail() — the exact function used by the campaign worker.
// Run via: railway run node tmp/test-campaign-path.mjs
import { sendCampaignEmail } from "../server/email.js";

const contact = {
  name: "Abhishek",
  email: "singh.abhishek73821@gmail.com",
  company: "RepMail",
  category: "",
};

const template = {
  subject: "a note from the RepMail team",
  body: `Hi {{name}},

I'm {{sender_name}}, {{sender_title}} at {{sender_company}}.

We recently updated our email infrastructure and I wanted to send a direct note to confirm delivery is working correctly on our end.

Nothing is required from you. If you have any questions about your account, reply directly to this email.

{{sender_name}}
{{sender_title}}, {{sender_company}}`,
};

const senderProfile = {
  name: "Abhishek Singh",
  title: "Founder",
  company: "RepMail",
  phone: null,
  replyToEmail: "support@letszero.in",
};

// Use a stable test userId so the unsubscribe URL is deterministic across runs.
// The token is HMAC-signed — safe to use for a test without a real DB record.
const userId = "deliverability-test-20260616";
const campaignEmailId = "00000000-0000-0000-0000-test00000001";

console.log("--- Production-path deliverability test ---");
console.log("SES_FROM_EMAIL     :", process.env.SES_FROM_EMAIL);
console.log("SES_CONFIGURATION_SET:", process.env.SES_CONFIGURATION_SET ?? "(not set)");
console.log("APP_URL            :", process.env.APP_URL ?? "(not set)");
console.log("To                 :", contact.email);
console.log("Subject            :", template.subject);
console.log();

const info = await sendCampaignEmail(contact, template, userId, campaignEmailId, senderProfile);

console.log("Send result:");
console.log("  messageId:", info.messageId);
console.log("  response :", info.response);
console.log("  accepted :", info.accepted);
console.log("  rejected :", info.rejected);

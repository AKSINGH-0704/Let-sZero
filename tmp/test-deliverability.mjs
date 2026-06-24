import nodemailer from "nodemailer";

const {
  SES_SMTP_HOST,
  SES_SMTP_PORT,
  SES_SMTP_USER,
  SES_SMTP_PASS,
  SES_FROM_EMAIL,
  SES_CONFIGURATION_SET,
} = process.env;

const required = { SES_SMTP_HOST, SES_SMTP_PORT, SES_SMTP_USER, SES_SMTP_PASS, SES_FROM_EMAIL };
const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error("Missing required env vars:", missing.join(", "));
  process.exit(1);
}

console.log("SES_SMTP_HOST:", SES_SMTP_HOST);
console.log("SES_SMTP_PORT:", SES_SMTP_PORT);
console.log("SES_FROM_EMAIL:", SES_FROM_EMAIL);
console.log("SES_CONFIGURATION_SET:", SES_CONFIGURATION_SET ?? "(not set)");

const transporter = nodemailer.createTransport({
  host: SES_SMTP_HOST,
  port: parseInt(SES_SMTP_PORT, 10),
  secure: false,
  auth: { user: SES_SMTP_USER, pass: SES_SMTP_PASS },
  tls: { rejectUnauthorized: true },
});

const headers = {};
if (SES_CONFIGURATION_SET) {
  headers["X-SES-CONFIGURATION-SET"] = SES_CONFIGURATION_SET;
}

const info = await transporter.sendMail({
  from: `"Abhishek from RepMail" <${SES_FROM_EMAIL}>`,
  to: "singh.abhishek73821@gmail.com",
  subject: "wanted to follow up with you",
  text: `Hey,

Hope you're doing well. I wanted to check in and see how things have been going on your end.

We have been working on improving how our platform handles email deliverability and I wanted to run a quick test to make sure everything is reaching the inbox properly.

If you get a moment, let me know if this landed in your inbox.

Thanks,
Abhishek`,
  headers,
});

console.log("\nSend result:");
console.log("  messageId:", info.messageId);
console.log("  response:", info.response);
console.log("  accepted:", info.accepted);
console.log("  rejected:", info.rejected);

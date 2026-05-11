/**
 * SNS message signature verification.
 * Fetches the signing cert (HTTPS, must be *.amazonaws.com), builds the
 * canonical string-to-sign per the SNS spec, and verifies with RSA-SHA1.
 * Certs are cached in-process for the lifetime of the server.
 */
import crypto from "crypto";
import https from "https";

const certCache = new Map(); // stores { pem, expiresAt } — evicted after 24 h so AWS cert rotations don't strand us
const CERT_TTL_MS = 24 * 60 * 60 * 1000;
const CERT_HOST_RE = /^sns\.[a-z0-9-]+\.amazonaws\.com$/;

async function fetchCert(certUrl) {
  const cached = certCache.get(certUrl);
  if (cached && cached.expiresAt > Date.now()) return cached.pem;
  const parsed = new URL(certUrl);
  if (parsed.protocol !== "https:" || !CERT_HOST_RE.test(parsed.hostname)) {
    throw new Error(`SNS cert from untrusted host: ${parsed.hostname}`);
  }
  return new Promise((resolve, reject) => {
    https.get(certUrl, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const pem = Buffer.concat(chunks).toString();
        certCache.set(certUrl, { pem, expiresAt: Date.now() + CERT_TTL_MS });
        resolve(pem);
      });
    }).on("error", reject);
  });
}

const NOTIFICATION_FIELDS = ["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"];
const CONFIRM_FIELDS = ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];

function buildStringToSign(msg) {
  const fields = msg.Type === "SubscriptionConfirmation" ? CONFIRM_FIELDS : NOTIFICATION_FIELDS;
  return fields
    .filter((f) => msg[f] !== undefined)
    .map((f) => `${f}\n${msg[f]}\n`)
    .join("");
}

export async function verifySnsMessage(msg) {
  if (msg.SignatureVersion !== "1") {
    throw new Error(`Unsupported SNS SignatureVersion: ${msg.SignatureVersion}`);
  }
  const pem = await fetchCert(msg.SigningCertURL);
  const stringToSign = buildStringToSign(msg);
  const ok = crypto
    .createVerify("sha1WithRSAEncryption")
    .update(stringToSign)
    .verify(pem, msg.Signature, "base64");
  if (!ok) throw new Error("SNS signature mismatch — possible forged request");
}

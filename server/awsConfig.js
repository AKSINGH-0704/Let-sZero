/**
 * Shared AWS configuration helpers.
 *
 * Returns the AWS region by checking AWS_REGION first, then parsing it from
 * SES_SMTP_HOST (format: email-smtp.{region}.amazonaws.com). Returns undefined
 * if neither is set — callers that require a region should validate the return
 * value and throw an appropriate structured error. Callers using best-effort
 * operations (e.g. S3 uploads) may pass undefined to the SDK; it will fail
 * lazily on first call rather than crashing at startup.
 */
export function getAwsRegion() {
  if (process.env.AWS_REGION) return process.env.AWS_REGION;
  const smtpHost = process.env.SES_SMTP_HOST || "";
  const match = smtpHost.match(/^email-smtp\.(.+)\.amazonaws\.com$/);
  return match ? match[1] : undefined;
}

import crypto from "crypto";

const SECRET = (() => {
  const s = process.env.UNSUBSCRIBE_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("UNSUBSCRIBE_SECRET must be set in production");
    }
    console.warn("[UNSUBSCRIBE] UNSUBSCRIBE_SECRET not set — using dev fallback. Set this in production.");
    return "dev-unsubscribe-secret-change-me";
  }
  return s;
})();

export function generateUnsubscribeToken(userId, email) {
  return crypto
    .createHmac("sha256", SECRET)
    .update(`${userId}:${email.toLowerCase()}`)
    .digest("hex");
}

export function verifyUnsubscribeToken(userId, email, token) {
  const expected = generateUnsubscribeToken(userId, email);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(token, "hex")
    );
  } catch {
    return false;
  }
}

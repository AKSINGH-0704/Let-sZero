import Razorpay from "razorpay";

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || null;
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || null;

export const rzp = (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET)
  ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
  : null;

if (process.env.NODE_ENV === "production") {
  if (!rzp) console.warn("[GATEWAYS] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set — payments disabled");
}

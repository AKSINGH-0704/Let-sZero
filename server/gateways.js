import Razorpay from "razorpay";
import Stripe from "stripe";

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || null;
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || null;

export const rzp = (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET)
  ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
  : null;

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

if (process.env.NODE_ENV === "production") {
  if (!rzp) console.warn("[GATEWAYS] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set — INR payments disabled");
  if (!stripe) console.warn("[GATEWAYS] STRIPE_SECRET_KEY not set — USD payments disabled");
}

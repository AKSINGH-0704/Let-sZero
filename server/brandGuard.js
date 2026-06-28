/**
 * Brand Impersonation Guard — Layer 1 (TRUST-009)
 *
 * Hard denylist for platform-identity senders. Custom-domain users are exempt because
 * their verified domain provides the actual trust signal (you can't register apple.com
 * unless you're Apple). Platform-identity users send from the RepMail shared domain, so
 * impersonation of major brands is a direct deliverability and legal risk.
 *
 * This denylist is intentionally conservative — exact substring matches, case-insensitive.
 * False positives ("Apple Tree Farm") are addressed by the admin review queue (Layer 2, TRUST-010).
 */

const BRAND_DENYLIST = [
  "apple", "google", "microsoft", "amazon", "facebook", "meta", "instagram", "whatsapp",
  "twitter", "x.com", "linkedin", "netflix", "spotify", "paypal", "stripe", "shopify",
  "adobe", "salesforce", "slack", "zoom", "dropbox", "atlassian", "jira", "confluence",
  "github", "gitlab", "bitbucket", "openai", "chatgpt", "anthropic", "hugging face",
  "bank of america", "chase", "citibank", "wells fargo", "jpmorgan", "goldman sachs",
  "hsbc", "barclays", "standard chartered", "hdfc", "icici", "sbi", "axis bank",
  "irs", "income tax", "government", "federal reserve", "rbi", "sebi",
  "flipkart", "swiggy", "zomato", "paytm", "phonepe", "razorpay", "zerodha",
  "airbnb", "uber", "lyft", "ola", "doordash",
  "youtube", "tiktok", "snapchat", "pinterest", "reddit",
  "ebay", "walmart", "target", "costco", "bestbuy",
  "fedex", "ups", "dhl", "usps",
];

/**
 * Check whether a sender name appears to impersonate a major brand.
 * Only enforced for platform-identity users.
 *
 * @param {string} senderName
 * @param {string|null} sendingIdentityType — 'platform' | 'custom_domain' | null
 * @returns {{ blocked: boolean, matchedTerm?: string }}
 */
export function checkBrandImpersonation(senderName, sendingIdentityType) {
  if (!senderName || sendingIdentityType !== "platform") return { blocked: false };
  const lower = senderName.trim().toLowerCase();
  const match = BRAND_DENYLIST.find(term => lower.includes(term));
  return match ? { blocked: true, matchedTerm: match } : { blocked: false };
}

// User-agent classification for email tracking analytics.
// Distinguishes machine-generated requests (mail clients, security gateways)
// from genuine human engagement so counters reflect actual recipient activity.

const MACHINE_CATEGORIES = new Set([
  "apple_mpp",
  "gmail_proxy",
  "proofpoint",
  "barracuda",
  "mimecast",
  "abnormal_security",
  "link_scanner",
]);

export function classifyUserAgent(ua) {
  if (!ua) return "unknown";
  // Known email security gateway products — detectable by UA string
  if (/ProofpointURLDefense|PPSE|ppdefense/i.test(ua)) return "proofpoint";
  if (/BarracudaURLDefense|barracuda/i.test(ua)) return "barracuda";
  if (/Mimecast/i.test(ua)) return "mimecast";
  if (/AbnormalSecurity|Abnormal-/i.test(ua)) return "abnormal_security";
  // Apple Mail Privacy Protection: loads images via Apple iCloud proxy
  // Full IP-range detection (17.0.0.0/8) is deferred to M11; UA hint only here
  if (/AppleMailDo|iCloud.*Mail|apple.*mail.*privacy/i.test(ua)) return "apple_mpp";
  // Gmail Image Proxy: loads images on behalf of Gmail recipients
  if (/GoogleImageProxy|Feedfetcher-Google/i.test(ua)) return "gmail_proxy";
  // Generic bots, crawlers, monitoring tools
  if (/spider|crawler|bot|scan|monitor|checker|wget|curl|python-requests|Go-http/i.test(ua)) return "link_scanner";
  // Human device categories
  if (/iPhone|iPad|Android.*Mobile|BlackBerry/i.test(ua)) return "mobile";
  if (/Android/i.test(ua)) return "android_tablet";
  if (/Macintosh|Windows NT|Linux/i.test(ua)) return "desktop";
  return "unknown";
}

export function isMachineCategory(category) {
  return MACHINE_CATEGORIES.has(category);
}

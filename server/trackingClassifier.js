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

// Apple iCloud proxy IP range: 17.0.0.0/8 (Apple-owned since 1990, stable).
// Apple Mail Privacy Protection (MPP) routes pixel fetches through these servers.
// Some MPP client versions send a generic browser UA rather than an Apple-specific
// string, so IP-range detection is required to catch all MPP opens.
const APPLE_IP_PREFIX = 17; // first octet of 17.0.0.0/8

export function isAppleMppIp(ip) {
  if (!ip) return false;
  // Strip IPv4-mapped IPv6 prefix (::ffff:17.x.x.x) present on dual-stack servers
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  const firstOctet = parseInt(v4.split(".")[0], 10);
  return firstOctet === APPLE_IP_PREFIX;
}

// ip parameter is optional for callers that don't have access to the real client IP.
// IP-range detection takes precedence: an Apple proxy IP is always apple_mpp regardless
// of what UA string it sends.
export function classifyUserAgent(ua, ip = null) {
  if (ip && isAppleMppIp(ip)) return "apple_mpp";
  if (!ua) return "unknown";
  // Known email security gateway products — detectable by UA string
  if (/ProofpointURLDefense|PPSE|ppdefense/i.test(ua)) return "proofpoint";
  if (/BarracudaURLDefense|barracuda/i.test(ua)) return "barracuda";
  if (/Mimecast/i.test(ua)) return "mimecast";
  if (/AbnormalSecurity|Abnormal-/i.test(ua)) return "abnormal_security";
  // Apple Mail Privacy Protection: also detectable by UA string (belt-and-suspenders)
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

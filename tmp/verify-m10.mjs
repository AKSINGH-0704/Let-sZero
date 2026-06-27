// Behavioural Verification — M10 Email Analytics
import { generateTrackingToken, TOKEN_RE, TRACKING_PIXEL_GIF, hashIp, extractTemplateLinks } from "../server/trackingUtils.js";
import { classifyUserAgent, isMachineCategory } from "../server/trackingClassifier.js";

let failures = 0;
function check(label, condition) {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    failures++;
  } else {
    console.log(`pass: ${label}`);
  }
}

// ── generateTrackingToken
const token = generateTrackingToken();
check("token is 22 chars", token.length === 22);
check("TOKEN_RE matches generated token", TOKEN_RE.test(token));

// ── TRACKING_PIXEL_GIF
check("TRACKING_PIXEL_GIF is Buffer", TRACKING_PIXEL_GIF instanceof Buffer);
check("TRACKING_PIXEL_GIF is 42 bytes", TRACKING_PIXEL_GIF.length === 42);

// ── hashIp
const hash = hashIp("1.2.3.4");
check("hashIp returns 64-char hex", typeof hash === "string" && hash.length === 64);
check("hashIp(null) returns null", hashIp(null) === null);
check("hashIp is deterministic", hashIp("1.2.3.4") === hashIp("1.2.3.4"));
check("hashIp different IPs produce different hashes", hashIp("1.2.3.4") !== hashIp("5.6.7.8"));

// ── extractTemplateLinks
process.env.TRACK_BASE_URL = "https://track.example.com";
const links = extractTemplateLinks("Visit https://example.com/page and https://track.example.com/t/abc");
check("extractTemplateLinks skips tracking-prefix URLs", links.length === 1);
check("extractTemplateLinks returns correct URL", links[0] === "https://example.com/page");

const emptyLinks = extractTemplateLinks("No URLs here");
check("extractTemplateLinks returns [] when no URLs", emptyLinks.length === 0);

const wwwLink = extractTemplateLinks("Check www.example.com/test");
check("extractTemplateLinks normalises www. to https://", wwwLink[0] === "https://www.example.com/test");
delete process.env.TRACK_BASE_URL;

// ── classifyUserAgent
check("proofpoint UA", classifyUserAgent("ProofpointURLDefense/10.0") === "proofpoint");
check("PPSE UA", classifyUserAgent("PPSE/1.0") === "proofpoint");
check("barracuda UA", classifyUserAgent("BarracudaURLDefense") === "barracuda");
check("mimecast UA", classifyUserAgent("Mozilla/5.0 Mimecast/1.0") === "mimecast");
check("abnormal UA", classifyUserAgent("AbnormalSecurity/2.0") === "abnormal_security");
check("gmail_proxy UA", classifyUserAgent("GoogleImageProxy") === "gmail_proxy");
check("link_scanner — bot", classifyUserAgent("Googlebot/2.1") === "link_scanner");
check("link_scanner — curl", classifyUserAgent("curl/7.68.0") === "link_scanner");
check("mobile — iPhone", classifyUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)") === "mobile");
check("desktop — Windows", classifyUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)") === "desktop");
check("desktop — Mac", classifyUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)") === "desktop");
check("empty UA returns unknown", classifyUserAgent("") === "unknown");
check("null UA returns unknown", classifyUserAgent(null) === "unknown");

// ── isMachineCategory
check("proofpoint is machine", isMachineCategory("proofpoint") === true);
check("apple_mpp is machine", isMachineCategory("apple_mpp") === true);
check("gmail_proxy is machine", isMachineCategory("gmail_proxy") === true);
check("barracuda is machine", isMachineCategory("barracuda") === true);
check("mimecast is machine", isMachineCategory("mimecast") === true);
check("abnormal_security is machine", isMachineCategory("abnormal_security") === true);
check("link_scanner is machine", isMachineCategory("link_scanner") === true);
check("desktop is NOT machine", isMachineCategory("desktop") === false);
check("mobile is NOT machine", isMachineCategory("mobile") === false);
check("unknown is NOT machine", isMachineCategory("unknown") === false);

// ── TOKEN_RE boundary checks
check("TOKEN_RE rejects short string", !TOKEN_RE.test("abc"));
check("TOKEN_RE rejects 23-char string", !TOKEN_RE.test("a".repeat(23)));
check("TOKEN_RE rejects special chars", !TOKEN_RE.test("!@#$%^&*()+=/abcdefghijk"));
check("TOKEN_RE accepts 22 lowercase alpha", TOKEN_RE.test("abcdefghijklmnopqrstuv"));
check("TOKEN_RE accepts 22 uppercase alpha", TOKEN_RE.test("ABCDEFGHIJKLMNOPQRSTUV"));
check("TOKEN_RE accepts mixed base64url", TOKEN_RE.test("0123456789_-ABCDEFGH12"));
check("TOKEN_RE rejects + (base64 but not base64url)", !TOKEN_RE.test("0123456789+/ABCDEFGH12"));

// ── Token uniqueness
const tokenSet = new Set(Array.from({ length: 1000 }, generateTrackingToken));
check("1000 generated tokens are all unique", tokenSet.size === 1000);

if (failures === 0) {
  console.log("\n[PASS] All M10 behavioural verification checks passed");
} else {
  console.error(`\n[FAIL] ${failures} check(s) failed`);
  process.exit(1);
}

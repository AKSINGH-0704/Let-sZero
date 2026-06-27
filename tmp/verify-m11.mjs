// Behavioural Verification — M11
import { classifyUserAgent, isMachineCategory, isAppleMppIp } from "../server/trackingClassifier.js";
import { validateEnv } from "../server/validateEnv.js";

let failures = 0;
function check(label, condition) {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    failures++;
  } else {
    console.log(`pass: ${label}`);
  }
}

// ── isAppleMppIp ─────────────────────────────────────────────────────────────
check("17.0.0.0 is Apple MPP", isAppleMppIp("17.0.0.0") === true);
check("17.1.2.3 is Apple MPP", isAppleMppIp("17.1.2.3") === true);
check("17.255.255.255 is Apple MPP", isAppleMppIp("17.255.255.255") === true);
check("17.58.100.1 is Apple MPP (real Apple proxy)", isAppleMppIp("17.58.100.1") === true);
check("18.0.0.0 is NOT Apple MPP", isAppleMppIp("18.0.0.0") === false);
check("16.255.255.255 is NOT Apple MPP", isAppleMppIp("16.255.255.255") === false);
check("1.1.1.1 is NOT Apple MPP", isAppleMppIp("1.1.1.1") === false);
check("null returns false", isAppleMppIp(null) === false);
check("empty string returns false", isAppleMppIp("") === false);
// IPv4-mapped IPv6 form
check("::ffff:17.1.2.3 is Apple MPP", isAppleMppIp("::ffff:17.1.2.3") === true);
check("::ffff:18.1.2.3 is NOT Apple MPP", isAppleMppIp("::ffff:18.1.2.3") === false);

// ── classifyUserAgent with IP (IP takes priority over UA) ────────────────────
check("Apple proxy IP → apple_mpp regardless of generic UA",
  classifyUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "17.58.100.1") === "apple_mpp");
check("Apple proxy IP → apple_mpp even with proofpoint UA",
  classifyUserAgent("ProofpointURLDefense/10.0", "17.0.0.1") === "apple_mpp");
check("Non-Apple IP + Apple UA still → apple_mpp (UA match)",
  classifyUserAgent("AppleMailDo/1.0", "1.2.3.4") === "apple_mpp");
check("Non-Apple IP + Windows UA → desktop",
  classifyUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "1.2.3.4") === "desktop");
check("null IP falls back to UA classification",
  classifyUserAgent("ProofpointURLDefense/10.0", null) === "proofpoint");
check("no IP arg still classifies UA",
  classifyUserAgent("BarracudaURLDefense") === "barracuda");

// ── isMachineCategory unchanged ──────────────────────────────────────────────
check("apple_mpp is machine", isMachineCategory("apple_mpp") === true);
check("proofpoint is machine", isMachineCategory("proofpoint") === true);
check("desktop is NOT machine", isMachineCategory("desktop") === false);

// ── validateEnv M10 additions ────────────────────────────────────────────────
// Test TRACK_BASE_URL trailing slash normalization
process.env.TRACK_BASE_URL = "https://track.example.com/";
process.env.NODE_ENV = "production";
// Don't call process.exit — patch it
const origExit = process.exit;
let exitCalled = false;
process.exit = (code) => { exitCalled = true; };
validateEnv();
process.exit = origExit;
check("validateEnv strips trailing slash from TRACK_BASE_URL",
  process.env.TRACK_BASE_URL === "https://track.example.com");
check("validateEnv did not exit on valid TRACK_BASE_URL", exitCalled === false);

// Test with double trailing slash
process.env.TRACK_BASE_URL = "https://track.example.com//";
exitCalled = false;
process.exit = (code) => { exitCalled = true; };
validateEnv();
process.exit = origExit;
check("validateEnv strips double trailing slash", process.env.TRACK_BASE_URL === "https://track.example.com");

// Test invalid URL causes exit in production
process.env.TRACK_BASE_URL = "not-a-valid-url";
exitCalled = false;
process.exit = (code) => { exitCalled = true; };
validateEnv();
process.exit = origExit;
check("validateEnv exits on invalid TRACK_BASE_URL in production", exitCalled === true);

// Test valid URL with no trailing slash
process.env.TRACK_BASE_URL = "https://track.example.com";
exitCalled = false;
process.exit = (code) => { exitCalled = true; };
validateEnv();
process.exit = origExit;
check("validateEnv passes for clean HTTPS URL", exitCalled === false);
check("validateEnv preserves clean URL unchanged", process.env.TRACK_BASE_URL === "https://track.example.com");

// Test TRACKING_TOKEN_RETENTION_DAYS validation
delete process.env.TRACK_BASE_URL;
process.env.TRACKING_TOKEN_RETENTION_DAYS = "abc";
exitCalled = false;
process.exit = (code) => { exitCalled = true; };
validateEnv();
process.exit = origExit;
check("validateEnv exits on non-numeric TRACKING_TOKEN_RETENTION_DAYS", exitCalled === true);

process.env.TRACKING_TOKEN_RETENTION_DAYS = "0";
exitCalled = false;
process.exit = (code) => { exitCalled = true; };
validateEnv();
process.exit = origExit;
check("validateEnv exits on TRACKING_TOKEN_RETENTION_DAYS=0", exitCalled === true);

process.env.TRACKING_TOKEN_RETENTION_DAYS = "730";
exitCalled = false;
process.exit = (code) => { exitCalled = true; };
validateEnv();
process.exit = origExit;
check("validateEnv passes for TRACKING_TOKEN_RETENTION_DAYS=730", exitCalled === false);

delete process.env.TRACKING_TOKEN_RETENTION_DAYS;
delete process.env.NODE_ENV;

// ── Result ────────────────────────────────────────────────────────────────────
if (failures === 0) {
  console.log("\n[PASS] All M11 behavioural verification checks passed");
} else {
  console.error(`\n[FAIL] ${failures} check(s) failed`);
  process.exit(1);
}

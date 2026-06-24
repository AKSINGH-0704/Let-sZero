// Minimal runner for schemaCheck.js. Used for negative-path test only.
// railway run node tmp/test-schema-runner.mjs
import "../server/env.js";
import { runSchemaCheck } from "../server/schemaCheck.js";

try {
  await runSchemaCheck();
  console.log("[TEST] runSchemaCheck returned — no exit(1) called. This is the PASS path.");
} catch (err) {
  console.error("[TEST] runSchemaCheck threw:", err.message);
  process.exit(1);
}

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    // RC-1 — several DB-backed suites (tenant-isolation, teams-end-to-end,
    // m20-workspace, contact-list-import, team-plan-propagation) time out on
    // their beforeAll hooks under full parallel load, while passing reliably in
    // isolation. It is resource contention, not a defect, but a suite that fails
    // differently on each run is useless as a release gate. `npm test` therefore
    // runs serially (352/352, ~100s); `npm run test:parallel` keeps the fast
    // path for local iteration.
    hookTimeout: 30000,
    testTimeout: 30000,
  },
  // Match the app's automatic JSX runtime so .jsx renders without an explicit React import.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@": path.resolve(import.meta.dirname, "client/src"),
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    // M31-A — marketing/LFP_final is a standalone sub-project with its own
    // package.json, so `npm install` inside it creates a nested node_modules
    // holding a second copy of react, react-dom and the motion packages. The
    // main app imports that folder through the @marketing alias, so
    // AnimatePresence would call hooks against the nested React while
    // react-dom/server rendered with the root one. Two React copies means
    // ReactCurrentDispatcher.current is null in the second, which surfaced as
    // "Cannot read properties of null (reading 'useContext')" and made the
    // prerender of "/" fall back to an empty SPA shell.
    //
    // That nested folder is gitignored, so Railway never had it and production
    // "/" has always prerendered correctly. But it breaks the build for any
    // developer who has installed it, and it reports as a SKIP rather than a
    // failure, so the build looks fine while silently shipping one fewer
    // prerendered page. dedupe makes single-instance resolution a property of
    // the config instead of a property of whoever's machine is building, and
    // it also guarantees the client bundle can never ship React twice.
    dedupe: ["react", "react-dom", "framer-motion", "motion", "lucide-react"],
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      "@marketing": path.resolve(import.meta.dirname, "marketing"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // PERF-007 — the prerender step needs to know which chunk backs each route
    // component so it can emit a modulepreload hint for it. Without the
    // manifest it would have to guess at hashed filenames. Written to
    // dist/public/.vite/manifest.json, which script/prerender.js reads after
    // the client build and before it renders any route.
    manifest: true,
  },
  server: {
    fs: {
      strict: false,
      allow: [
        path.resolve(import.meta.dirname),
        path.resolve(import.meta.dirname, "marketing"),
      ],
    },
    proxy: {
      "/api": {
        target: "http://localhost:8083",
        changeOrigin: true,
        credentials: true
      }
    }
  },
});


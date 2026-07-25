// M39 post-deploy fix — Investigation 1: the missing credit slider.
//
// Root cause: the shared PricingCalculator was imported ONLY by PublicPricing.jsx,
// never by the authenticated Payments page, so the in-app purchase surface had no
// slider at all. This proves the fix at the level the defect lived — the RENDERED
// authenticated page — by SSR-rendering the real Payments component inside the same
// provider stack App.jsx uses, and asserting the shared estimator is present.
//
// Rendered through Vite's SSR module loader + renderToString, the mechanism
// tests/unit/plan-purchase-card-render.test.js already uses for this page.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "vite";
import { renderToString } from "react-dom/server";
import React from "react";

let vite, Payments, Providers;

// The app is a client-only SPA, so a couple of its components touch browser globals
// at render time (AppLayout's preview banner reads sessionStorage). Rendering the
// real page in node needs those shimmed — a plain in-memory store is enough.
function shimStorage() {
  const make = () => {
    const m = new Map();
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k),
      clear: () => m.clear(),
    };
  };
  if (typeof globalThis.sessionStorage === "undefined") globalThis.sessionStorage = make();
  if (typeof globalThis.localStorage === "undefined") globalThis.localStorage = make();
}

beforeAll(async () => {
  shimStorage();
  // noExternal keeps react-query/wouter inside Vite's SSR module graph so the
  // QueryClientProvider we create and the useQuery calls inside the page resolve
  // to ONE react-query instance (externalized deps would be separate instances,
  // and the provider context would not reach the hooks).
  vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent",
    ssr: { noExternal: ["@tanstack/react-query", "wouter"] },
  });

  Payments = (await vite.ssrLoadModule("/src/pages/Payments.jsx")).default;

  const { QueryClient, QueryClientProvider } = await vite.ssrLoadModule("@tanstack/react-query");
  const { ThemeProvider } = await vite.ssrLoadModule("/src/context/ThemeContext.jsx");
  const { AuthProvider } = await vite.ssrLoadModule("/src/context/AuthContext.jsx");
  const { TooltipProvider } = await vite.ssrLoadModule("/src/components/ui/tooltip.jsx");
  const { Router } = await vite.ssrLoadModule("wouter");

  // Mirror App.jsx's provider order so Payments renders exactly as it does in the app.
  // A fresh QueryClient keeps queries pending (SSR runs no effects), which the page
  // already tolerates (balance shows "—", lists empty).
  Providers = ({ children }) =>
    React.createElement(QueryClientProvider, { client: new QueryClient() },
      React.createElement(ThemeProvider, null,
        React.createElement(AuthProvider, null,
          React.createElement(TooltipProvider, null,
            React.createElement(Router, { ssrPath: "/app/payments" }, children)))));
}, 60000);

afterAll(async () => {
  await vite?.close();
});

describe("Investigation 1 — the authenticated Payments page exposes the shared credit slider", () => {
  let html;
  beforeAll(() => {
    html = renderToString(React.createElement(Providers, null, React.createElement(Payments)));
  });

  it("renders the shared PricingCalculator estimator (its section label)", () => {
    expect(html).toContain("Estimate Your Cost");
  });

  it("renders the slider's exact-amount input — the estimator's own control", () => {
    expect(html).toContain('id="credit-input"');
  });

  it("renders the estimator's live result panel (its labels are unique to the calculator)", () => {
    // These three labels appear only in PricingCalculator's result panel — never on
    // the preset plan cards — so their presence proves the calculator's buy surface
    // rendered, not just a heading. (The Buy button's own text is split by SSR
    // comment nodes between "Buy", the number and "Credits", so assert the panel.)
    expect(html).toContain("Total cost");
    expect(html).toContain("Cost per email");
    expect(html).toContain("Bonus credits");
  });

  it("still renders the preset Starting Pack cards — the slider is added, not a replacement", () => {
    expect(html).toContain("Choose Your Starting Pack");
  });
});

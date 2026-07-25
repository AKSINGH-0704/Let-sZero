// M39 post-deploy fix — Investigation 4: the modal close button overlapped the
// title/date on mobile (reported Campaign-detail screenshots).
//
// Root cause was in the SHARED DialogHeader: it was `text-center sm:text-left`
// with no gutter reserved for the absolutely-positioned close affordance
// (`right-4 top-4`). Centred text expands toward both edges, driving a long
// title's right end straight under the X. The fix reserves `pr-8` and left-aligns
// the header for every content Dialog at once. DialogHeader is a plain div (no
// Radix portal), so it renders to static markup without a DOM.

import { describe, it, expect } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DialogHeader } from "@/components/ui/dialog";

describe("Investigation 4 — DialogHeader reserves space for the close button", () => {
  const html = renderToStaticMarkup(h(DialogHeader, null, "content"));

  it("reserves a right gutter (pr-8) so header content clears the close affordance", () => {
    expect(html).toContain("pr-8");
  });

  it("left-aligns the header so the title/date never expand into the top-right corner", () => {
    expect(html).toContain("text-left");
  });

  it("no longer centres the header on mobile (the cause of the symmetric overlap)", () => {
    expect(html).not.toContain("text-center");
  });
});

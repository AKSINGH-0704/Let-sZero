// M58 — the ownership-transfer dialog spilled sideways on a phone.
//
// Found by MEASURING the dialog rather than reading it (M50-C), while reviewing
// it for IDENT-010. At a 375px viewport the AlertDialog's content had
// scrollWidth 480 inside clientWidth 341 — 139px of horizontal spill.
//
// ⚠️ PRE-EXISTING, NOT INTRODUCED BY M58. The same measurement on the M57 markup
// (the picker nested inside AlertDialogDescription) gives the identical 480/341,
// so the a11y restructuring neither caused nor cured it. Recorded here because
// the milestone's own review is what found it.
//
// TWO CAUSES, both already solved elsewhere in this codebase:
//
//  1. `AlertDialogContent` used a bare `grid`. Its implicit `auto` column sizes
//     to its items' MAX-CONTENT, so one unbreakable string widens the whole
//     dialog. M39 Investigation 4/5 fixed exactly this on `DialogContent` with
//     `grid-cols-1` (`minmax(0,1fr)`) plus an `overflow-x-hidden` backstop. The
//     comment on AlertDialogContent had said since M37 that it "carries the
//     defect identically" — and the fix was never applied to it.
//
//  2. `SelectTrigger` already carried `[&>span]:line-clamp-1` to keep a long
//     value on one line, and it could not work: the span is a flex item, whose
//     default `min-width: auto` refuses to shrink below max-content. An email
//     address has no break opportunity, so it widened the button instead of
//     being clipped. `min-w-0` restores the shrink the clamp depends on.
//
// After both: scrollWidth 326 == clientWidth 326 at 375 and 341 == 341 at 390.
//
// These are class assertions, not a re-measurement: the measurement was done
// once, in a real browser, and what a regression would look like is one of these
// classes going missing.

import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("AlertDialogContent cannot be widened by its own content", () => {
  // AlertDialogContent portals through Radix and needs a DOM, so the class list
  // is read from source — the same thing the browser was given.
  it("uses a 1fr column, not the implicit max-content one", async () => {
    const src = await readFile(join(root, "client/src/components/ui/alert-dialog.jsx"), "utf8");
    const content = src.slice(src.indexOf("AlertDialogContent"), src.indexOf("AlertDialogHeader"));
    expect(content).toMatch(/\bgrid grid-cols-1\b/);
  });

  it("keeps the horizontal backstop", async () => {
    const src = await readFile(join(root, "client/src/components/ui/alert-dialog.jsx"), "utf8");
    const content = src.slice(src.indexOf("AlertDialogContent"), src.indexOf("AlertDialogHeader"));
    expect(content).toMatch(/\boverflow-x-hidden\b/);
  });

  it("still caps its height and scrolls internally (M37, unchanged)", async () => {
    const src = await readFile(join(root, "client/src/components/ui/alert-dialog.jsx"), "utf8");
    const content = src.slice(src.indexOf("AlertDialogContent"), src.indexOf("AlertDialogHeader"));
    expect(content).toMatch(/\bdialog-viewport-fit\b/);
    expect(content).toMatch(/w-\[calc\(100%-2rem\)\]/);
  });
});

describe("a long selected value is clipped, not allowed to push the layout", () => {
  // SelectTrigger throws outside a Select provider, so — as above — the class
  // list is read from the source it is compiled from.
  let trigger;
  beforeAll(async () => {
    const src = await readFile(join(root, "client/src/components/ui/select.jsx"), "utf8");
    trigger = src.slice(src.indexOf("const SelectTrigger"), src.indexOf("const SelectScrollUpButton"));
  });

  it("clamps the value to one line", () => {
    expect(trigger).toContain("[&>span]:line-clamp-1");
  });

  it("lets the value shrink, which is what makes the clamp effective", () => {
    // Without this the clamp is inert: a flex item's default min-width is auto.
    expect(trigger).toContain("[&>span]:min-w-0");
  });
});

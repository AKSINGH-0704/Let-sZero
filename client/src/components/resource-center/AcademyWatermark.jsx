// M30 — the decorative Academy mark that sits in a hub header.
//
// It previously rendered as a bare lucide icon at `absolute -right-6 -top-6
// h-40 w-40` inside an `overflow-hidden` header. Negative offsets plus a
// clipping ancestor meant it was cut on two edges at every single breakpoint
// (measured: 23px off the right, 23px off the top, from 375px through 2560px).
// A soft blob bleeding off a corner reads as intentional; a line-art shield
// sliced through its own outline reads as a rendering bug, which is exactly
// how it looked.
//
// This exists as its own component rather than as classes inline in
// AcademyHubTemplate so the containment rule lives in one place. Any future
// hub, banner, or card that wants an Academy mark gets a guaranteed-contained
// one instead of re-deriving the offsets and re-introducing the same defect.
//
// The containment guarantees, all structural rather than tuned per icon:
//   - no negative offsets, so nothing depends on the parent's overflow
//   - inset-y-0 with my own centring, so height never exceeds the header
//   - responsive sizing that shrinks before it would collide with the text
//   - hidden below `sm`, where a header is too narrow for art and text both
//   - aria-hidden and pointer-events-none: it is decoration, not content
export default function AcademyWatermark({ Icon, className = "" }) {
  if (!Icon) return null;
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-y-0 right-5 hidden select-none items-center sm:flex lg:right-8 ${className}`}
    >
      <Icon
        strokeWidth={1}
        // h-* only, with w-auto, so the icon scales on its own aspect ratio and
        // can never be squashed by a flex parent. The max-h keeps it inside the
        // header's padding box on short headers.
        className="h-24 w-auto max-h-[70%] text-[color:var(--academy-accent)]/[0.10] md:h-32 lg:h-40"
      />
    </span>
  );
}

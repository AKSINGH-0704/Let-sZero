// M21-E — injects/removes JSON-LD <script> tag(s) in document.head for
// client-rendered routes (the Resource Center pages aren't prerendered yet,
// per M21-D's deliberate no-content-yet decision, so they need this
// runtime mechanism rather than M21-B's build-time injection). Mirrors the
// existing document.head-manipulation pattern already used by App.jsx's
// BrandingManager (title/favicon) — not a new pattern introduced solely
// for this.
//
// Accepts either one JSON-LD object or an array of them — a page with both
// an Article and a BreadcrumbList gets two separate <script> tags (Google's
// documented pattern for multiple structured-data types on one page), not
// one script containing a raw, non-standard top-level array.
import { useEffect } from "react";

export default function useJsonLd(data) {
  useEffect(() => {
    if (!data) return undefined;
    const items = Array.isArray(data) ? data : [data];
    const scripts = items.map((item) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(item);
      script.dataset.resourceCenterJsonLd = "true";
      document.head.appendChild(script);
      return script;
    });
    return () => {
      scripts.forEach((s) => document.head.removeChild(s));
    };
  }, [data]);
}

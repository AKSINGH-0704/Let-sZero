// M39 Phase 1C — shared commerce formatters.
//
// One copy of the number/currency formatting the pricing surfaces render, so a
// change to how a credit count or a price reads happens in one place. Pure and
// framework-free (safe in SSR/prerender and unit tests). These format DISPLAY
// values only — the authoritative charge is always the server quote (MD-003).

/** Credit / plain integer count, Indian digit grouping. "—" when nullish. */
export function fmtNum(n) {
  return n == null ? "—" : n.toLocaleString("en-IN");
}

/** INR amount with the ₹ symbol. "—" when nullish. */
export function fmtINR(n) {
  return n == null ? "—" : `₹${n.toLocaleString("en-IN")}`;
}

/** USD amount (display-only conversion). "—" when nullish. */
export function fmtUSD(n) {
  if (n == null) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

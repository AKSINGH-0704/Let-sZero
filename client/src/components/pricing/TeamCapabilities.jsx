import { Check, X } from "lucide-react";

// M38 — shared Team Capacity + Role Capabilities block.
//
// This two-column block ("Team Capacity by Plan" + "Role capabilities") was
// duplicated near-verbatim between the public pricing page (PublicPricing.jsx)
// and the authenticated purchase page (Payments.jsx). Both copies carried the
// same two defects the M38 mobile walkthrough surfaced:
//   1. the capacity rows laid the plan name and its price/credit detail out with
//      `justify-between` on one line, so the detail wrapped and orphaned the word
//      "credits" on a line of its own at narrow widths; and
//   2. every caption used #55556A, which measures ~2.7:1 on the panel background
//      and fails WCAG 1.4.3 (4.5:1). It read as an unfinished grey smudge.
//
// Centralising the block fixes both classes once for both products and removes
// the drift risk of two copies. The two callers differ only in how a plan's
// price token is formatted (INR-only on the public page, currency-aware on the
// authenticated page) and in the roles caption, so those are props; everything
// else — including the capacity caption, which was byte-identical — lives here.
//
// TEXT_MUTED is the page's established WCAG floor (#7878A0 ≈ 4.7:1), the same
// colour M35-F standardised on for the footer links and slider presets. Nothing
// dimmer is used for text in this component.
const TEXT_MUTED = "#7878A0";
const TEXT_LABEL = "#B8B8D0";

const CAPACITY_ROWS = [
  { plan: "Free Trial", seats: "25", color: "#9CA3AF" },
  { plan: "Starter", seats: "25", color: "#60A5FA" },
  { plan: "Growth", seats: "25", color: "#00E5C8" },
  { plan: "Scale", seats: "25", color: "#A78BFA" },
  { plan: "Enterprise", seats: "Custom", color: "#F59E0B" },
];

const ROLE_MATRIX = [
  ["Purchase credits", true, false, false],
  ["Allocate credits", true, true, false],
  ["Create team members", true, true, false],
  ["View all campaigns", true, "Own team", "Own only"],
  ["View audit logs", true, "Own team", "Own only"],
  ["Send campaigns", true, true, true],
  ["Manage templates", true, true, true],
];

const fmtNum = (n) => (n == null ? "—" : n.toLocaleString("en-IN"));

/**
 * @param {object[]} plans           the page's PLANS array (matched by `name`)
 * @param {(plan) => string} formatPlanPrice  price token for a non-custom plan
 * @param {string} rolesNote         caption rendered beneath the role table
 */
export default function TeamCapabilities({ plans, formatPlanPrice, rolesNote }) {
  return (
    <div className="grid md:grid-cols-2 gap-10">
      {/* Left: plan capacity */}
      <div>
        <div className="text-xs uppercase tracking-widest mb-4" style={{ color: TEXT_MUTED }}>
          Team Capacity by Plan
        </div>
        <div className="space-y-2">
          {CAPACITY_ROWS.map(({ plan, seats, color }) => {
            // Price/credits come from the same PLANS array the plan cards render
            // from — the Teams tab shouldn't require switching tabs just to see
            // what a plan actually costs.
            const planData = plans.find((p) => p.name === plan);
            const detail =
              planData && !planData.isCustom
                ? `${formatPlanPrice(planData)} · ${fmtNum(planData.totalCredits)} credits`
                : "Custom pricing";
            return (
              <div
                key={plan}
                // M38 — stack on narrow widths so the price/credit detail never
                // wraps mid-phrase; go inline only at lg, where the two-column
                // grid finally leaves each column wide enough for one line.
                className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between py-2.5 px-4 rounded-xl"
                style={{ background: "#0A0A12", border: "1px solid #1A1A2E" }}
              >
                <span className="text-xs font-semibold" style={{ color }}>
                  {plan}
                </span>
                <span className="text-xs text-left lg:text-right" style={{ color: TEXT_LABEL }}>
                  {seats === "Custom" ? "Custom team size" : `Up to ${seats} team members`}
                  {planData && (
                    <span style={{ color: TEXT_MUTED }}>
                      {" · "}
                      {detail}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs mt-4" style={{ color: TEXT_MUTED }}>
          Every plan — including the free trial — includes up to 25 team seats at no additional cost.
        </p>
      </div>

      {/* Right: role comparison table */}
      <div>
        <div className="text-xs uppercase tracking-widest mb-5" style={{ color: TEXT_MUTED }}>
          Role capabilities
        </div>
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1A1A2E" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "#08080F" }}>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: TEXT_MUTED }}>
                  Capability
                </th>
                <th className="px-3 py-3 text-center font-semibold" style={{ color: "#00E5C8" }}>
                  Admin
                </th>
                <th className="px-3 py-3 text-center font-semibold" style={{ color: "#60A5FA" }}>
                  Manager
                </th>
                <th className="px-3 py-3 text-center font-semibold" style={{ color: "#A78BFA" }}>
                  Member
                </th>
              </tr>
            </thead>
            <tbody>
              {ROLE_MATRIX.map(([cap, a, m, u], i) => (
                <tr
                  key={cap}
                  style={{
                    background: i % 2 === 0 ? "#0C0C14" : "#0A0A12",
                    borderTop: "1px solid rgba(26,26,46,0.5)",
                  }}
                >
                  <td className="px-4 py-2.5" style={{ color: TEXT_LABEL }}>
                    {cap}
                  </td>
                  {[a, m, u].map((v, j) => (
                    <td key={j} className="px-3 py-2.5 text-center">
                      {v === true ? (
                        <Check className="w-3.5 h-3.5 mx-auto" style={{ color: "#34D399" }} />
                      ) : v === false ? (
                        <X className="w-3.5 h-3.5 mx-auto" style={{ color: "#F87171" }} />
                      ) : (
                        // 11px, not 10px: 10px measured under the readable floor
                        // for this dim label; 11px keeps it compact but legible.
                        <span style={{ color: "#9898B8", fontSize: "11px" }}>{v}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs mt-4" style={{ color: TEXT_MUTED }}>
          {rolesNote}
        </p>
      </div>
    </div>
  );
}

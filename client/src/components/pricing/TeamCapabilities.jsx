import { Check, X } from "lucide-react";
import { useCommercialModel, seatCapacityValue, seatModelSummary } from "@/lib/commerce/commercialModel";

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

// M43 — display identity only (label + brand colour). The seat allowance is NOT
// listed here: it is server state (`/api/pricing/plans` → maxTeamMembers) and,
// once seat billing is enabled, a plan no longer bundles seats at all. `planId`
// keys the row to the server's plan; Free Trial reads the trial allowance, which
// the plans list omits because it is not purchasable.
const CAPACITY_ROWS = [
  { plan: "Free Trial", planId: "trial", color: "#9CA3AF" },
  { plan: "Starter", planId: "starter", color: "#60A5FA" },
  { plan: "Growth", planId: "growth", color: "#00E5C8" },
  { plan: "Scale", planId: "scale", color: "#A78BFA" },
  { plan: "Enterprise", planId: "enterprise", color: "#F59E0B" },
];

// M43-FIX — the caption under the role table. It used to be a `rolesNote` prop,
// and both callers filled it with a seat claim ("included in every plan … up to
// 25 members each") rendered verbatim — a hardcoded seat count sitting directly
// beneath the server-derived one, and the last place either surface still
// asserted how seats are sold. The caption belongs to the ROLE table, so it now
// says something about roles and is stated once. How seats are sold is the left
// column's job (`seatModelSummary`), which reads it from the server.
const ROLES_NOTE =
  "Every person you invite holds one of these roles. Roles control visibility and permissions only — they never change what a workspace is charged.";

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
 */
export default function TeamCapabilities({ plans, formatPlanPrice }) {
  // M43 — seat capacity and how seats are sold are SERVER state. Nothing about
  // team capacity is asserted by this component; it renders what the authorities
  // report, and stays silent until they answer.
  const model = useCommercialModel();
  const { seatBillingEnabled, planSeatAllowance, freeTrialSeatAllowance } = model;

  const allowanceFor = (planId) => {
    if (planId === "trial") return freeTrialSeatAllowance;
    return planSeatAllowance ? planSeatAllowance[planId] ?? null : null;
  };

  return (
    <div className="grid md:grid-cols-2 gap-10">
      {/* Left: plan capacity */}
      <div>
        <div className="text-xs uppercase tracking-widest mb-4" style={{ color: TEXT_MUTED }}>
          Team Capacity by Plan
        </div>
        <div className="space-y-2">
          {CAPACITY_ROWS.map(({ plan, planId, color }) => {
            const capacity = seatCapacityValue(allowanceFor(planId), seatBillingEnabled);
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
                  {/* M43 — server-sourced. `null` while the commercial state is
                      still loading, so the row says nothing rather than
                      guessing; "Unlimited" for Enterprise; "Sold separately"
                      once seats are their own product. */}
                  {capacity == null
                    ? "—"
                    : capacity === "Unlimited"
                      ? "Unlimited team members"
                      : capacity === "Sold separately"
                        ? "Team seats sold separately"
                        : `Up to ${capacity} team members`}
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
        {/* M43 — the one sentence describing how team capacity is SOLD, derived
            from the server's commercial state. It was previously a hardcoded
            claim that every plan bundled a fixed number of seats for free, which
            becomes false the moment seat billing is enabled. No seat figure or
            pricing claim may be written literally in this file. */}
        {seatModelSummary(model) && (
          <p className="text-xs mt-4" style={{ color: TEXT_MUTED }} data-testid="seat-model-summary">
            {seatModelSummary(model)}
          </p>
        )}
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
        <p className="text-xs mt-4" style={{ color: TEXT_MUTED }} data-testid="roles-note">
          {ROLES_NOTE}
        </p>
      </div>
    </div>
  );
}

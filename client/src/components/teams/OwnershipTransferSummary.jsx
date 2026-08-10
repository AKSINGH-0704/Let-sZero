/**
 * OWNERSHIP TRANSFER SUMMARY — the body of the transfer confirmation (M57).
 *
 * Extracted for the same reason SeatChangeSummary was (M52): it only mounts
 * behind a state change, so inside the page it could not be rendered by this
 * repository's SSR test harness — and every claim it makes is a claim about
 * somebody's money and access. M50-C: a UI change is not verified until it has
 * been rendered and looked at.
 *
 * Purely presentational. It states what the SERVER already does (Audit 220) and
 * decides nothing: the transaction owns validation, RBAC, tenant isolation and
 * every commercial rule.
 *
 * The three claims that must never drift from the transaction:
 *   • AutoPay and the saved payment method are removed — a mandate is a personal
 *     banking authorisation and is revoked in the same transaction.
 *   • The subscription, seats, renewal date and amount are untouched.
 *   • Verified sending domains follow the workspace, so sending keeps working.
 */

export default function OwnershipTransferSummary({ newOwnerName }) {
  // "This person" rather than "They", so the sentence stays grammatical before
  // a teammate has been chosen ("They becomes..." is not English).
  const them = newOwnerName || "This person";
  return (
    <div className="space-y-4 text-left" data-testid="transfer-summary">
      <div className="rounded-lg border border-border p-3">
        <p className="text-sm font-medium text-foreground">What changes</p>
        <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
          <li data-testid="transfer-change-owner">
            {them} becomes the workspace owner and takes over billing.
          </li>
          <li>You become a regular member. You keep your access and your work, but not the billing controls.</li>
          {/* The single most surprising consequence, and the one a customer is
              most likely to discover the wrong way — at a renewal that did not
              happen. Stated in full, not softened. */}
          <li data-testid="transfer-change-autopay">
            <span className="text-foreground">Automatic renewal is switched off and your saved payment method is removed.</span>{" "}
            Your card is never charged for a workspace you no longer own, so the new owner sets up their own.
          </li>
        </ul>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="text-sm font-medium text-foreground">What stays exactly as it is</p>
        <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
          <li data-testid="transfer-keep-subscription">Your subscription, seats, renewal date and amount.</li>
          <li data-testid="transfer-keep-domains">Your verified sending domains, and everyone&apos;s ability to send.</li>
          <li>Every campaign, its history and who sent it.</li>
          <li data-testid="transfer-keep-credits">Your own credits stay yours. Billing history and receipts are kept.</li>
          <li>Pending invitations, and everyone else&apos;s access.</li>
        </ul>
      </div>

      {/* Not reversible BY YOU. The customer must understand this before they
          commit, because the recovery path runs through another person. */}
      <p className="text-xs text-muted-foreground" data-testid="transfer-irreversible">
        Only the new owner can transfer the workspace back, so make sure they are expecting this.
      </p>
    </div>
  );
}

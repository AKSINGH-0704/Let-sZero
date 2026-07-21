/**
 * One record of "this admin has already had Teams explained to them".
 *
 * M37. Two independent surfaces introduce Teams, and neither knew about the
 * other:
 *
 *   PostPurchaseActivation (FULL variant)  after a successful payment, to a
 *                                          paid workspace with no members yet.
 *   TeamsWelcomeModal                      on first dashboard visit, to any
 *                                          ROOT_ADMIN who has not seen it.
 *
 * A customer who signs up and buys credits in the same session met both, back
 * to back — the activation panel explaining shared domains and roles, then the
 * dashboard immediately asking "How many people do you plan to work with?" and
 * explaining shared domains and roles again. M26 had already decided that
 * nobody should be educated about Teams twice, but that guarantee only held
 * inside PostPurchaseActivation, which could not see the other modal's state.
 *
 * Both now read and write the same flag, so whichever arrives first is the one
 * that teaches.
 *
 * Per-user and in localStorage rather than a DB column, keeping this a
 * frontend-only concern — the original TeamsWelcomeModal decision, preserved
 * deliberately: this is education state, not configuration, and there is
 * nothing on the server that depends on it.
 */
const SEEN_KEY_PREFIX = "repmail_teams_welcome_seen_";

function keyFor(userId) {
  return SEEN_KEY_PREFIX + userId;
}

export function hasSeenTeamsEducation(userId) {
  if (!userId) return false;
  try {
    return localStorage.getItem(keyFor(userId)) === "1";
  } catch {
    // Private-mode / disabled storage: treat as "not seen" rather than throwing.
    // The cost of being wrong is showing the education once more, which is the
    // safe direction to fail in.
    return false;
  }
}

export function markTeamsEducationSeen(userId) {
  if (!userId) return;
  try {
    localStorage.setItem(keyFor(userId), "1");
  } catch {
    // Nothing to do — see above.
  }
}

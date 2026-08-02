// Executes the REAL production gate against the REAL production DB/env.
import { storage } from '../server/storage.js';
import { autopayAllowedFor, isAutopayLive, renewalModeFor } from '../shared/autopay.js';

const cfg = await storage.getAutopayConfig();
console.log('getAutopayConfig() ->', JSON.stringify(cfg));

const seatCfg = await storage.getSeatCommerceConfig();
console.log('billingEnabled ->', seatCfg.billingEnabled);

const rootIds = process.argv.slice(2);
for (const id of rootIds) {
  const allowed = autopayAllowedFor(id, cfg);
  const sub = await storage.getWorkspaceSubscription(id);
  const mandate = sub?.mandateId ? await storage.getMandate(sub.mandateId) : null;
  console.log(`\nroot ${id}`);
  console.log('  autopayAllowedFor ->', allowed);
  console.log('  subscription      ->', sub ? `${sub.status} ${sub.term} seats=${sub.seats} renewal=${sub.renewalAmountMinor}` : 'NONE');
  console.log('  isAutopayLive     ->', sub ? isAutopayLive(sub, mandate) : 'n/a');
  console.log('  renewalMode       ->', sub ? renewalModeFor(sub, mandate) : 'n/a');
}
process.exit(0);

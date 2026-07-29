import { resetDemoData } from '@/lib/demo/reset';
import { withCronSecret } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

// Nightly demo reset (Phase C). Clears the demo customer's owned state
// (orders, cart, saved cards, notifications, reviews), restores the shared
// catalog and shop config from the seed snapshot, then re-seeds the account:
// order history, saved cuts, saved cards, addresses and the points ledger.
//
// An earlier note here claimed the catalog restore "was retired". It was
// reinstated once the restore switched to upserting on a natural key (which
// preserves product ids, so reviews and ratings survive), and `resetDemoData`
// has called it since — the comment described the opposite of the behaviour.
// Vercel Cron invokes this with GET + Bearer secret; POST mirrors it for
// ad-hoc admin or test triggering. The shared cron wrapper handles 503/401
// envelopes, success message, and 500 fall-through identically to the other
// crons.
const handler = withCronSecret(resetDemoData, 'Demo data reset');
export const GET = handler;
export const POST = handler;

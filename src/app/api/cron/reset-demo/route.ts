import { resetDemoData } from '@/lib/demo/reset';
import { withCronSecret } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

// The heaviest of the three crons by a wide margin — roughly 110 sequential
// round-trips, most of them a per-product find-and-save loop. Declared rather
// than inherited so the ceiling survives a change to the project default.
// 300s is the default on every plan and the ceiling on Hobby; Pro and
// Enterprise can go higher, so this is a safe value everywhere rather than a
// platform maximum.
export const maxDuration = 300;

// Nightly demo reset (Phase C). Clears the demo customer's owned state
// (orders, cart, saved cards, messages, notifications, reviews), restores the shared
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
//
// `failureCount` was previously omitted here, on the stated grounds that this
// job either succeeds or throws outright. It does not: the rating recompute
// swallows per-product failures on purpose, so the ~100 restore round-trips
// behind it still run. Without this, a night where every recompute failed
// answered 200 with a clean-looking count — the same "reported success on a
// fully failed run" defect the other two crons already fixed.
const handler = withCronSecret(resetDemoData, 'Demo data reset', {
  failureCount: (r) => r.ratingRecomputeFailures,
});
export const GET = handler;
export const POST = handler;

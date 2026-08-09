import { ensureDeclaredIndexes } from '@/lib/db/ensure-indexes';
import { withCronSecret } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

// One `createIndex` round-trip per declared index (a no-op once built) plus one
// `diffIndexes` read-back per model — see `src/models/indexes.test.ts` for the
// declared set rather than a number restated here to go stale.
//
// 300 rather than a tighter figure, matching `reset-demo` (the only sibling that
// declares this at all). 300 is the platform default, so a smaller number here
// would LOWER the ceiling rather than protect it — which is the opposite of the
// stated reason for declaring it. `createIndex` blocks until the build finishes,
// so the headroom is not free.
export const maxDuration = 300;

// Builds every declared index and reports declared-vs-actual in both directions.
//
// Deliberately NOT in `vercel.json`. Vercel's Hobby plan caps cron jobs and
// three schedules are already declared, so a fourth risks discovering the limit
// at deploy time. The nightly demo reset calls `ensureDeclaredIndexes` directly
// instead, which gets the same daily coverage for free. This route exists for
// the on-demand case: call it right after deploying a new index declaration
// rather than waiting for the next night.
//
// GET and POST both, matching the sibling crons — GET because that is what
// Vercel Cron issues if this is ever scheduled, POST for ad-hoc triggering.
//
// `failureCount` reports models whose BUILD threw, not models with a gap.
//
// An earlier version justified that with "on a fresh database it usually means
// nothing has imported that model yet". That is the `autoIndex` failure mode and
// it cannot happen here: this function imports every model and awaits a build on
// each, so lazy import is the one cause it rules out. The real reason is that a
// gap is a finding rather than a failed run — it needs a human to look, and the
// run already did everything it could. A 500 that is routinely noise is a 500
// nobody reads.
const handler = withCronSecret(
  ensureDeclaredIndexes,
  'Declared indexes ensured',
  {
    failureCount: (r) => r.failureCount,
  },
);

export const GET = handler;
export const POST = handler;

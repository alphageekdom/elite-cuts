import {
  resetDemoData,
  DemoResetInProgressError,
  emptyDemoResetCounts,
} from '@/lib/demo/reset';
import { ensureDeclaredIndexes } from '@/lib/db/ensure-indexes';
import { withCronSecret } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

// The heaviest cron by a wide margin — roughly 110 sequential round-trips for
// the reset itself, most of them a per-product find-and-save loop, plus the
// index pass this route now also runs. Declared rather
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
// Index maintenance rides on this schedule rather than taking a fourth entry in
// `vercel.json` — see `/api/cron/ensure-indexes`, which owns that reasoning and
// exposes the same function for the on-demand case.
//
// It runs BEFORE the reset so a contended lock cannot skip it, and the reset is
// wrapped rather than awaited bare so a contended lock cannot DISCARD it either.
// That second half was missing: `resetDemoData` signals contention by throwing,
// and the shared wrapper's catch returns a bare 500 with no body — so the index
// work ran and its answer went in the bin, on exactly the nights something else
// was already running. Rethrowing anything that is not contention keeps the
// pre-existing 500-on-real-failure behaviour unchanged.
async function nightlyJob() {
  const indexes = await ensureDeclaredIndexes();

  // Counts reach the response body; the per-model detail reaches nothing, and
  // Vercel does not persist response bodies. Without this, a nightly failure
  // says "4 failure(s)" and nothing anywhere names which model or why — which
  // makes the daily coverage answerable only by someone re-running it by hand.
  for (const m of indexes.models) {
    if (m.error) console.error(`[ensure-indexes] ${m.model}: ${m.error}`);
    if (m.missing.length)
      console.warn(`[ensure-indexes] ${m.model} missing: ${m.missing.join(', ')}`);
    if (m.extra.length)
      console.warn(`[ensure-indexes] ${m.model} extra: ${m.extra.join(', ')}`);
  }

  const indexCounts = {
    indexesDeclared: indexes.declaredTotal,
    indexesMissing: indexes.missingTotal,
    indexesExtra: indexes.extraTotal,
    indexBuildFailures: indexes.failureCount,
  };

  try {
    return { ...(await resetDemoData()), ...indexCounts, resetSkipped: false };
  } catch (error) {
    if (error instanceof DemoResetInProgressError) {
      console.warn('[cron reset-demo] another run holds the lock; reset skipped');
      return { ...emptyDemoResetCounts(), ...indexCounts, resetSkipped: true };
    }
    throw error;
  }
}

// Both failure sources count. `indexesMissing` deliberately does not — but not
// for the reason first written here, which was "nothing has imported that model
// yet". That is the `autoIndex` failure mode and it is impossible inside
// `ensureDeclaredIndexes`, which imports every model and awaits a build on each.
// The real reason is that a gap is a finding, not a failure: it needs a human to
// look, and the run itself did everything it could.
const handler = withCronSecret(nightlyJob, 'Demo data reset', {
  failureCount: (r) => r.ratingRecomputeFailures + r.indexBuildFailures,
});
export const GET = handler;
export const POST = handler;

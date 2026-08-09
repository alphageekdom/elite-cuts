import type { NextRequest } from 'next/server';

import {
  resetDemoData,
  DemoResetInProgressError,
  emptyDemoResetCounts,
} from '@/lib/demo/reset';
import { assertDemoResetTarget } from '@/lib/demo/target-guard';
import { ensureDeclaredIndexes } from '@/lib/db/ensure-indexes';
import { withCronSecret } from '@/lib/api-handler';
import connectDB from '@/config/database';

export const dynamic = 'force-dynamic';

// ── Schedule: `0 8 * * *` in vercel.json, and that is UTC ───────────────
// Vercel Cron has no timezone setting; every expression is interpreted as UTC,
// always. So this fires at 08:00 UTC, which is **03:00 EST in winter and 04:00
// EDT in summer** — the wall-clock hour moves by one twice a year, and nothing
// re-anchors it. That is intended: the point is a quiet hour, and both are.
//
// This is recorded here, beside the route, because `vercel.json` is strict JSON
// and cannot carry a comment — a top-level `"//"` key is not in Vercel's schema
// and risks failing the deploy, so the note has to live somewhere it will
// actually be read. It previously existed only in a project History entry,
// which is the one place nobody checks when asking what time this runs.
//
// If the hour ever has to be exact in a US timezone, the expression has to
// change twice a year or the job has to no-op outside a window it computes
// itself. Neither is worth it for a demo reset.
//
// A comment can drift from the file it describes, so `route.test.ts` reads
// `vercel.json` and pins the expression. Change the schedule and that test
// fails, which is the prompt to come back and correct this paragraph.
//
// Deliberately not an exported constant: Next validates the export surface of
// a route module, and an unrecognised export is a build error rather than a
// note.

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
async function nightlyJob(request: NextRequest) {
  // `?trigger=cli` labels the row the run history writes, so a hand-fired run
  // is distinguishable afterwards from the nightly one. Anything else reads as
  // `cron`, including a typo — this only names a row, and guessing wrong is
  // cheaper than refusing a run over a query string.
  //
  // The DRY RUN IS NOT HERE. It lives at `./dry-run`, and that is a safety
  // property rather than tidiness — see the note on that route.
  const trigger = request.nextUrl.searchParams.get('trigger') === 'cli' ? 'cli' : 'cron';

  // Verify the target BEFORE the index pass, not just before the reset.
  //
  // `ensureDeclaredIndexes` issues `createIndexes()` against every model, which
  // is DDL — so in the exact stale-connection scenario this feature exists for,
  // the nightly cron was writing indexes to the database it was about to
  // refuse. Harmless in itself, but it contradicted the rule `run-history.ts`
  // states for its own writes: do not touch a database you have just refused.
  // Two modules disagreeing about that rule is how the rule stops being one.
  //
  // `resetDemoData` checks again. The call is a string comparison against an
  // env var, so the duplication costs nothing and neither entry point has to
  // trust the other.
  await connectDB();
  assertDemoResetTarget();

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
    return {
      ...(await resetDemoData({ trigger })),
      ...indexCounts,
      resetSkipped: false,
    };
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
//
// `validationFailures` counts too, and it is the one that matters most: it is
// the difference between "every step ran" and "the demo works". A run whose
// writes all succeed against a catalog that ends up missing a cut is a failed
// night, and before this it answered 200.
const handler = withCronSecret(nightlyJob, 'Demo data reset', {
  failureCount: (r) =>
    r.ratingRecomputeFailures + r.indexBuildFailures + r.validationFailures.length,
});
export const GET = handler;
export const POST = handler;

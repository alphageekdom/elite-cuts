import type { NextRequest } from 'next/server';

import { dryRunDemoReset } from '@/lib/demo/reset';
import { withCronSecret } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

// Around a dozen reads — counts plus a handful of projected finds; take the
// exact shape from `planDemoReset` rather than a number restated here to go
// stale, which is what the first version of this line did. Nowhere near the
// sibling's ~110 round-trips, so it does not need that route's 300s ceiling —
// but 300 is the platform default, and declaring anything lower would REDUCE
// the ceiling rather than protect it. Left undeclared on purpose.

// ── Why the dry run is its own route ────────────────────────────────────
// This started as `?dryRun=1` on the sibling route, and that was a real defect
// rather than an untidy one: **an unknown query parameter fails open.** A
// deployment that predates the flag ignores it completely, and the POST does
// what POST has always done there — a full destructive reset.
//
// That is not hypothetical. On 2026-08-09 a `--dry-run` invocation was pointed
// at production while production was still running the older code. The flag
// was silently dropped and a real reset ran. Nothing in the response said so;
// it looked like an ordinary success. The blast radius was the usual one: the
// customer-owned half of the wipe is scoped by ownership, so it amounted to the
// nightly reset arriving about twelve hours early. Only that half, though —
// staff, shifts, grill events and shop settings are replaced with no owner
// predicate at all (see `restore.ts`). Either way the safety flag had provided
// exactly zero safety, and there was no way to tell from the caller's side.
//
// A distinct path cannot fail that way. An older deployment has no such route,
// so the request never reaches a reset handler at all: nothing ran. The safety
// property is structural — it holds because of how the URL resolves, not
// because a parameter was read correctly.
//
// What that failure LOOKS like was got wrong here at first, and the correction
// is worth keeping. This paragraph claimed an older deployment "answers 404".
// Measured against the live deployment on 2026-08-09, it does not: a POST to an
// unmatched path renders the not-found page, which Vercel serves as **HTTP 200,
// `content-type: text/html`** (`x-matched-path: /_not-found`). The safety
// property was unaffected — no handler ran either way — but the CLI's detection
// keyed on the status code and so took the wrong branch in the one scenario it
// was written for. It now keys on whether a reset handler answered at all,
// which is a property of these routes rather than of the platform: every path
// through `withCronSecret` returns JSON.
//
// The general rule, worth keeping: a safety flag whose absence is
// indistinguishable from success is worse than no flag at all. Make the unsafe
// path the one that needs something extra to exist, not the one you fall into
// when something is missing.
//
// Deliberately NOT in `vercel.json`. Nothing schedules a dry run; this exists
// for a human, and it shares the sibling's bearer gate because that is the
// right credential for a CLI — no session, no cookie.
async function dryRunJob(request: NextRequest) {
  const trigger = request.nextUrl.searchParams.get('trigger') === 'cli' ? 'cli' : 'cron';

  // No index pass here, unlike the sibling — `ensureDeclaredIndexes` BUILDS
  // indexes, which is a deliberate, whole-schema write and has no place on a
  // route whose product is a prediction.
  //
  // "Writes nothing" is the shorthand, and it is not literally true: this
  // records one history row (`reset.ts` is explicit about that exception), and
  // `autoIndex` builds an index the first time a process imports a model, which
  // a cold lambda serving this route will do. What holds is the claim that
  // matters — **it changes no record the reset would change.** Every query in
  // `planDemoReset` is a `countDocuments` or a projected read.
  //
  // `dryRun: true` is in the body so a caller can assert on it rather than
  // trusting that it reached the route it aimed at. `tools/demo-reset.mjs`
  // does exactly that — belt and braces over its route-is-absent check, since
  // the two failures they guard are independent: one catches "no handler
  // answered", this one catches "a handler answered, but not this one".
  return { dryRun: true, ...(await dryRunDemoReset({ trigger })) };
}

// No `failureCount`. A plan cannot fail partway — `planDemoReset` either
// returns a complete plan or throws, and a throw is already the wrapper's 500.
// Passing a selector that always returns 0 would imply a partial-failure mode
// that does not exist here.
const handler = withCronSecret(
  dryRunJob,
  // Not "nothing was written": this records one history row, and the operator
  // reads this string first. "Changed" is the accurate word — no record the
  // reset would touch is touched.
  'Demo reset dry run — nothing was changed (one history row written)',
);

export const GET = handler;
export const POST = handler;

import { runDormancyScan } from '@/jobs/dormancyScan';
import { withCronSecret } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

// Runs the dormancy scan (warn-pass + soft-delete-pass). Vercel Cron invokes
// this with GET + Bearer secret; POST mirrors it for ad-hoc admin / test
// triggering.
//
// `runDormancyScan` takes an optional `now` for tests. It is wrapped in an
// explicit zero-arg arrow rather than passed by reference, so whatever the
// cron wrapper hands its job cannot land in `now`. That used to be implicit —
// the wrapper called with no arguments and this comment said so — and it broke
// the moment the wrapper started passing the request through for
// `reset-demo`'s `?trigger=cli`. Structurally invisible to the type checker in
// the one direction that matters, because a `Date` parameter and a
// `NextRequest` argument are only incompatible by luck.
//
// `failureCount` is what turns a run where users failed into a 500 instead of
// a green 200 — see withCronSecret.
const handler = withCronSecret(() => runDormancyScan(), 'Dormancy scan complete', {
  failureCount: (r) => r.failed,
});
export const GET = handler;
export const POST = handler;

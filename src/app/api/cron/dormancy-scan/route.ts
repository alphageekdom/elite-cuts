import { runDormancyScan } from '@/jobs/dormancyScan';
import { withCronSecret } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

// Runs the dormancy scan (warn-pass + soft-delete-pass). Vercel Cron invokes
// this with GET + Bearer secret; POST mirrors it for ad-hoc admin / test
// triggering.
//
// `runDormancyScan` takes an optional `now` for tests; the wrapper's zero-arg
// call leaves it defaulted. `failureCount` is what turns a run where users
// failed into a 500 instead of a green 200 — see withCronSecret.
const handler = withCronSecret(runDormancyScan, 'Dormancy scan complete', {
  failureCount: (r) => r.failed,
});
export const GET = handler;
export const POST = handler;

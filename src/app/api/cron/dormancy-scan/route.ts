import { runDormancyScanJob } from '@/jobs/dormancyScan';
import { withCronSecret } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

// Runs the dormancy scan (warn-pass + soft-delete-pass). Vercel Cron invokes
// this with GET + Bearer secret; POST mirrors it for ad-hoc admin / test
// triggering.
const handler = withCronSecret(runDormancyScanJob, 'Dormancy scan complete');
export const GET = handler;
export const POST = handler;

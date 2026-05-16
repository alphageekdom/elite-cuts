import { runPurgeDeletedAccountsJob } from '@/jobs/purgeDeletedAccounts';
import { withCronSecret } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

// Runs the hard-delete cascade for every soft-deleted account whose 30-day
// grace has elapsed. Vercel Cron invokes this with GET + Bearer secret; POST
// mirrors it for ad-hoc admin / test triggering.
const handler = withCronSecret(runPurgeDeletedAccountsJob, 'Purge complete');
export const GET = handler;
export const POST = handler;

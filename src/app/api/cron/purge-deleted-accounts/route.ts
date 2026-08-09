import { purgeDueSoftDeletes } from '@/lib/auth/account-deletion';
import { withCronSecret } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

// Runs the hard-delete cascade for every soft-deleted account whose 30-day
// grace has elapsed. Vercel Cron invokes this with GET + Bearer secret; POST
// mirrors it for ad-hoc admin / test triggering.
//
// Imported straight from the deletion cascade it belongs to, alongside
// `softDeleteUser` and `hardDeleteUser` — the same shape `reset-demo` uses.
// `skipped` (accounts restored between the due-list read and their turn) is
// deliberately NOT counted as a failure: that is the grace period working.
//
// Wrapped in an explicit zero-arg arrow for the same reason as the dormancy
// scan next door: this also takes an optional `now`, and passing it by
// reference would let whatever the cron wrapper hands its job land there.
const handler = withCronSecret(() => purgeDueSoftDeletes(), 'Purge complete', {
  failureCount: (r) => r.failed,
});
export const GET = handler;
export const POST = handler;

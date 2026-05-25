import { purgeDueSoftDeletes } from '@/lib/auth/account-deletion';

// Thin job wrapper around the cascade helper. Exposed separately so the cron
// route and any future ad-hoc trigger (admin button, test script) share the
// same entry point.
export async function runPurgeDeletedAccountsJob() {
  return purgeDueSoftDeletes();
}

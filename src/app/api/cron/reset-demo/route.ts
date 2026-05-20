import { resetDemoCustomerState } from '@/lib/demo/reset';
import { withCronSecret } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

// Nightly wipe of demo-customer-owned data (Phase C1). Vercel Cron invokes
// this with GET + Bearer secret; POST mirrors it for ad-hoc admin or test
// triggering. The shared cron wrapper handles 503/401 envelopes, success
// message, and 500 fall-through identically to the other crons.
const handler = withCronSecret(
  resetDemoCustomerState,
  'Demo customer state reset',
);
export const GET = handler;
export const POST = handler;

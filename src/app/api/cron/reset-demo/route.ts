import { resetDemoData } from '@/lib/demo/reset';
import { withCronSecret } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

// Nightly demo reset (Phase C). Wipes the demo customer's owned state
// (orders, cart, saved cards, notifications, rewards, addresses) AND
// restores the shared catalog / config (products, promos, staff, shifts,
// settings, events) from the TypeScript seed snapshot. Vercel Cron
// invokes this with GET + Bearer secret; POST mirrors it for ad-hoc
// admin or test triggering. The shared cron wrapper handles 503/401
// envelopes, success message, and 500 fall-through identically to the
// other crons.
const handler = withCronSecret(resetDemoData, 'Demo data reset');
export const GET = handler;
export const POST = handler;

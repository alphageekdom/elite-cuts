import 'server-only';

import type { Types } from 'mongoose';

import connectDB from '@/config/database';
import User from '@/models/User';

// A Mongo filter fragment that excludes the demo customer's owned
// documents — spread it into any Order/Cart/etc. `find` or aggregate
// `$match` to keep the demo from skewing admin metrics. Shape is
// `{ user: { $ne: demoId } }` (or `{}` when no demo customer exists,
// so callers can `{ ...await excludeDemoOrders() }` safely on a fresh
// DB without changing their query).
//
// One result is cached at module scope so a single page that fires
// several admin aggregations only does the User lookup once. On a warm
// serverless lambda the cache persists across requests on the same
// instance, which is intentional — the demo customer's `_id` is
// immutable once seeded, so a long-lived cache is strictly better than
// re-querying. Cold starts and dev hot-reload reset it naturally.
export type DemoExclusionFilter =
  | Record<string, never>
  | { user: { $ne: Types.ObjectId } };

let cachedDemoId: Types.ObjectId | null | undefined;

async function resolveDemoCustomerId(): Promise<Types.ObjectId | null> {
  if (cachedDemoId !== undefined) return cachedDemoId;
  await connectDB();
  const demo = await User.findOne({
    isDemo: true,
    demoType: 'customer',
  }).select('_id').lean<{ _id: Types.ObjectId } | null>();
  cachedDemoId = demo?._id ?? null;
  return cachedDemoId;
}

// Filter fragment for any Order query keyed by the `user` ref. Returns
// an empty object when no demo customer exists so the spread stays a
// no-op on a fresh database where the seed hasn't run yet.
export async function excludeDemoOrders(): Promise<DemoExclusionFilter> {
  const demoId = await resolveDemoCustomerId();
  if (!demoId) return {};
  return { user: { $ne: demoId } };
}

// Same helper, exposed as a Mongo `$match`-friendly object for
// aggregate pipelines (identical shape; named alias for readability
// at the callsite).
export async function excludeDemoOrdersMatch(): Promise<DemoExclusionFilter> {
  return excludeDemoOrders();
}

// Looks up the demo customer's id directly. Useful for callers that
// already filter in memory by `user._id` (the customers dashboard's
// stat-chip count) and just need the id to compare against.
export async function getDemoCustomerId(): Promise<Types.ObjectId | null> {
  return resolveDemoCustomerId();
}

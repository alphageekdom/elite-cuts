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
  | { user: { $nin: Types.ObjectId[] } };

let cachedDemoIds: Types.ObjectId[] | undefined;
let cachedDemoCustomerId: Types.ObjectId | null | undefined;

// Both demo accounts, not just the customer.
//
// The storefront is open to any signed-in session, and the no-charge checkout
// tile enables itself for any `isDemo` user — so a visitor exploring the
// admin demo can place orders too, under the demo ADMIN's id. Resolving only
// the customer left those orders counting toward every revenue, AOV and
// repeat-rate number a real admin reads.
async function resolveDemoIds(): Promise<Types.ObjectId[]> {
  if (cachedDemoIds !== undefined) return cachedDemoIds;
  await connectDB();
  const demos = await User.find({ isDemo: true })
    .select('_id demoType')
    .lean<{ _id: Types.ObjectId; demoType?: string }[]>();
  cachedDemoIds = demos.map((d) => d._id);
  cachedDemoCustomerId =
    demos.find((d) => d.demoType === 'customer')?._id ?? null;
  return cachedDemoIds;
}

async function resolveDemoCustomerId(): Promise<Types.ObjectId | null> {
  if (cachedDemoCustomerId !== undefined) return cachedDemoCustomerId;
  await resolveDemoIds();
  return cachedDemoCustomerId ?? null;
}

// Filter fragment for any Order query keyed by the `user` ref. Returns
// an empty object when no demo account exists so the spread stays a
// no-op on a fresh database where the seed hasn't run yet.
export async function excludeDemoOrders(): Promise<DemoExclusionFilter> {
  const demoIds = await resolveDemoIds();
  if (demoIds.length === 0) return {};
  return { user: { $nin: demoIds } };
}

// Looks up the demo customer's id directly. Useful for callers that
// already filter in memory by `user._id` (the customers dashboard's
// stat-chip count) and just need the id to compare against.
export async function getDemoCustomerId(): Promise<Types.ObjectId | null> {
  return resolveDemoCustomerId();
}

// Every demo account id — the customer and the admin. For callers that need
// to scope a wipe or an in-memory filter to all demo-owned rows rather than
// just the customer's.
export async function getDemoOwnerIds(): Promise<Types.ObjectId[]> {
  return resolveDemoIds();
}

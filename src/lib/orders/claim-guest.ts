import type { Types } from 'mongoose';

import connectDB from '@/config/database';
import Order from '@/models/Order';
import { guestOrderClaimFilter } from './guest-claim-filter';

// Attaches every prior guest order with a matching email to a freshly-created
// user account. Run once, immediately after the User document is created.
//
// Idempotent — the `user: null` filter means re-running over already-claimed
// orders is a no-op, so this is safe to call from multiple entry points
// without coordinating state.
//
// **No retroactive rewards.** The earn-on-fulfillment hook
// (`awardOrderCompletion`) fires at order completion time, not at claim time
// — so the orders simply get linked by `user` id and the rewards path is
// never re-entered. Tier/qualifying-points calculations look at orders'
// `createdAt` against the user's signup-anchored window, so claimed orders
// (created before signup) won't sit inside any qualifying window either.
//
// **Failure is non-fatal.** Callers (the credentials register route, and a
// future OAuth-first-sign-in hook) should not abort registration if the
// claim fails — the user can still browse and place new orders, and the
// orders stay linkable later. Wrap calls in try/catch and log.
//
// **OAuth callers (deferred).** This project currently only wires the
// `CredentialsProvider` in `authOptions.ts`. When Google/GitHub OAuth get
// wired later, call this helper from NextAuth's `events.createUser` callback
// (which requires a database adapter) or from the `signIn` callback's
// first-sign-in branch. The query and contract stay identical.
export async function claimGuestOrdersForUser(
  userId: Types.ObjectId | string,
  email: string,
): Promise<{ matchedCount: number; modifiedCount: number }> {
  // Idempotent — connectDB returns the cached connection when already
  // connected. Calling it explicitly here lets cron jobs / workers / admin
  // re-run scripts invoke this helper cold without each remembering to
  // wire the connection themselves.
  await connectDB();

  // Guest emails are lowercased on save (see Order schema's guestContact
  // path), so match in the same casing regardless of how the register form
  // captured the input.
  const normalized = email.toLowerCase().trim();

  const result = await Order.updateMany(guestOrderClaimFilter(normalized), {
    $set: { user: userId },
  });

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
}

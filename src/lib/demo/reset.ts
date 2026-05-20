import 'server-only';

import connectDB from '@/config/database';
import User from '@/models/User';
import Order from '@/models/Order';
import Cart from '@/models/Cart';
import SavedCard from '@/models/SavedCard';
import Notification from '@/models/Notification';

// Per-collection touch counts returned by `resetDemoCustomerState`. The
// values are surfaced verbatim in the cron + admin endpoints so a manual
// trigger can confirm a normal reset ran without combing the server logs.
export type ResetCounts = {
  ordersDeleted: number;
  cartDeleted: number;
  savedCardsDeleted: number;
  notificationsDeleted: number;
  // The User document itself stays — only its derived state is reset. `true`
  // when the demo customer's saved cuts / addresses / rewards / dormancy
  // fields were reset to the zero state on this run.
  userReset: boolean;
};

// Idempotent wipe of every Mongo record owned by the seeded demo customer.
// Phase B's nightly reset (Phase C1) calls this from the cron route and the
// admin "Reset demo data" button alike, so the two paths can't drift.
//
// Scope is by document ownership (`user === demoCustomerId`,
// `userId === demoCustomerId`) — no per-record `isDemo` flag is added to
// owned collections. Audit logs (AccountDeletionAudit) are deliberately
// untouched per the Phase C spec.
//
// Returns zeros on every count if the demo customer doesn't exist
// (a fresh DB where the seed hasn't run yet) so the cron / admin call
// succeeds gracefully instead of throwing.
export async function resetDemoCustomerState(): Promise<ResetCounts> {
  await connectDB();

  const demo = await User.findOne({
    isDemo: true,
    demoType: 'customer',
  }).select('_id');

  if (!demo) {
    return {
      ordersDeleted: 0,
      cartDeleted: 0,
      savedCardsDeleted: 0,
      notificationsDeleted: 0,
      userReset: false,
    };
  }

  const demoId = demo._id;

  // Owned collections — straight deleteMany by owner field.
  const [ordersRes, cartRes, savedCardsRes, notificationsRes] = await Promise.all([
    Order.deleteMany({ user: demoId }),
    Cart.deleteMany({ user: demoId }),
    SavedCard.deleteMany({ user: demoId }),
    Notification.deleteMany({ userId: demoId }),
  ]);

  // Embedded state on the User doc. Clearing here also resets the dormancy
  // bookkeeping so a long stretch with no demo activity doesn't trip
  // Phase B's scan exclusion into anything unexpected. `isDemo` and
  // `demoType` are immutable in the schema, so they don't need to be set.
  await User.updateOne(
    { _id: demoId },
    {
      $set: {
        savedCuts: [],
        addresses: [],
        rewardPoints: 0,
        lifetimePoints: 0,
        pointsHistory: [],
        tierAnniversaryAt: null,
        currentTier: null,
        dormancyWarnedAt: null,
        lastActiveAt: null,
        adminNote: 'Portfolio demo account — guarded by isDemo flag.',
      },
    },
  );

  return {
    ordersDeleted: ordersRes.deletedCount ?? 0,
    cartDeleted: cartRes.deletedCount ?? 0,
    savedCardsDeleted: savedCardsRes.deletedCount ?? 0,
    notificationsDeleted: notificationsRes.deletedCount ?? 0,
    userReset: true,
  };
}

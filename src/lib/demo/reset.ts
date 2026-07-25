import 'server-only';

import connectDB from '@/config/database';
import User from '@/models/User';
import Order from '@/models/Order';
import Cart from '@/models/Cart';
import SavedCard from '@/models/SavedCard';
import Notification from '@/models/Notification';
import Review from '@/models/Review';
import { recomputeProductRating } from '@/lib/reviews/recompute';
import {
  restoreDemoCatalog,
  emptyCatalogCounts,
  type CatalogCounts,
} from './restore';

// Per-collection touch counts returned by `resetDemoCustomerState`. The
// values are surfaced verbatim in the cron + admin endpoints so a manual
// trigger can confirm a normal reset ran without combing the server logs.
// Balance the demo customer starts each day with. Chosen against the default
// thresholds (Connoisseur 250, Master Cut 1000) so the demo opens mid-ladder:
// far enough in to hold a tier, far enough out that the progress bar toward
// the next one is visibly partial rather than empty or full. At the default
// 100 points = $5 rate it is also worth a real discount at checkout, so the
// redemption flow has something to bite on.
//
// Exported so /demo can quote the figure instead of hardcoding a second copy.
export const DEMO_STARTING_POINTS = 420;

export type ResetCounts = {
  ordersDeleted: number;
  cartDeleted: number;
  savedCardsDeleted: number;
  notificationsDeleted: number;
  reviewsDeleted: number;
  // The User document itself stays — only its derived state is reset. `true`
  // when the demo customer's saved cuts / addresses / rewards / dormancy
  // fields were reset to the zero state on this run.
  userReset: boolean;
};

// Shape returned by `resetDemoData` — surfaced by the cron + admin endpoint
// so the toast / log can report what the run actually cleared.
export type DemoResetCounts = ResetCounts & CatalogCounts;

// Idempotent wipe of every Mongo record owned by the seeded demo customer.
// Composed by `resetDemoData` below alongside `restoreDemoCatalog`; the
// cron route and admin "Reset demo data" button both call the top-level
// orchestrator so the two paths can't drift on either side.
//
// Scope is by document ownership (`user === demoCustomerId`,
// `userId === demoCustomerId`) — the owned collections don't carry their
// own `isDemo` column; admin surfaces that need to flag a row as demo
// (e.g. the orders table) read it from the populated user instead. Audit
// logs (AccountDeletionAudit) are deliberately untouched per the Phase
// C spec.
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
      reviewsDeleted: 0,
      userReset: false,
    };
  }

  const demoId = demo._id;

  // Reviews the demo customer *authored*. These are public — they render on
  // the product page for every later visitor — and nothing else in the reset
  // removed them, so a single demo session used to leave a permanent mark on
  // the catalog. Collect the affected product ids before the delete so their
  // ratings can be recomputed from what survives.
  const authoredReviews = await Review.find({ user: demoId })
    .select('product')
    .lean<{ product: typeof demoId }[]>();
  const reviewedProductIds = [
    ...new Set(authoredReviews.map((r) => String(r.product))),
  ];
  const reviewsRes = await Review.deleteMany({ user: demoId });

  // Owned collections — straight deleteMany by owner field. Helpful votes are
  // the exception: they don't belong to the demo customer, they live on shared
  // Review docs (which survive the reset), so a demo session's votes would
  // otherwise permanently reshuffle the "Most helpful" badge for every later
  // visitor. Pull the demo id out of every review's voter list.
  const [ordersRes, cartRes, savedCardsRes, notificationsRes] =
    await Promise.all([
      Order.deleteMany({ user: demoId }),
      Cart.deleteMany({ user: demoId }),
      SavedCard.deleteMany({ user: demoId }),
      Notification.deleteMany({ userId: demoId }),
      Review.updateMany(
        { helpfulVoters: demoId },
        { $pull: { helpfulVoters: demoId } },
      ),
    ]);

  // Embedded state on the User doc. Clearing here also resets the dormancy
  // bookkeeping so a long stretch with no demo activity doesn't trip
  // Phase B's scan exclusion into anything unexpected. `isDemo` and
  // `demoType` are immutable in the schema, so they don't need to be set.
  //
  // Rewards are seeded rather than zeroed. Points are only ever awarded when
  // an admin fulfils an order, and order writes stay closed to demo admins,
  // so a demo customer starting at zero could never earn a single point —
  // which would make the rewards half of the shop undemonstrable and the
  // "earn and redeem points" claim on /demo false. A seeded balance lets a
  // visitor actually redeem at checkout and watch the tier bar move.
  const now = new Date();
  await User.updateOne(
    { _id: demoId },
    {
      $set: {
        savedCuts: [],
        addresses: [],
        rewardPoints: DEMO_STARTING_POINTS,
        lifetimePoints: DEMO_STARTING_POINTS,
        // `order_fulfilled` is the only reason that counts toward tier
        // qualification, and the entry is dated now so it falls inside the
        // rolling window that `tierAnniversaryAt` opens. `expiresAt: null`
        // keeps it out of the expiry sweep — the balance is rewritten nightly
        // anyway, so an expiry date would only ever be noise.
        pointsHistory: [
          {
            delta: DEMO_STARTING_POINTS,
            reason: 'order_fulfilled',
            expiresAt: null,
            createdAt: now,
          },
        ],
        tierAnniversaryAt: now,
        currentTier: null,
        dormancyWarnedAt: null,
        lastActiveAt: null,
        adminNote: 'Portfolio demo account — guarded by isDemo flag.',
      },
    },
  );

  // Ratings are an average over surviving reviews, so every product the demo
  // customer reviewed needs one recompute now that those rows are gone.
  await Promise.all(reviewedProductIds.map((id) => recomputeProductRating(id)));

  return {
    ordersDeleted: ordersRes.deletedCount ?? 0,
    cartDeleted: cartRes.deletedCount ?? 0,
    savedCardsDeleted: savedCardsRes.deletedCount ?? 0,
    notificationsDeleted: notificationsRes.deletedCount ?? 0,
    reviewsDeleted: reviewsRes.deletedCount ?? 0,
    userReset: true,
  };
}

// Top-level orchestrator for the nightly cron + admin "Reset demo data"
// button. Wipes the demo customer's owned state, then restores the shared
// catalog and shop config from the seed snapshot.
//
// This file previously carried a note claiming a catalog restore was not
// viable, because re-seeding products "orphans the reviews that point at
// those product ids". That reasoning generalized from one implementation —
// delete and re-insert — to the whole problem. `restoreDemoCatalog` upserts
// on the natural key instead, so every restored row keeps its `_id` and
// nothing orphans. See the comment there for the full reference map.
//
// Order matters: the customer wipe recomputes ratings for products it removed
// reviews from, and the restore must not run before those reviews are gone.
export async function resetDemoData(): Promise<DemoResetCounts> {
  const customer = await resetDemoCustomerState();

  // No demo customer means the demo seed has never run here, and the catalog
  // restore would be doing something nobody asked for: overwriting this
  // install's products, staff, shifts and shop settings with a snapshot meant
  // for a demo that doesn't exist. Bail with zeroed catalog counts instead.
  if (!customer.userReset) {
    return { ...customer, ...emptyCatalogCounts() };
  }

  const catalog = await restoreDemoCatalog();
  return { ...customer, ...catalog };
}

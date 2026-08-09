import 'server-only';

import type { Types } from 'mongoose';

import connectDB from '@/config/database';
import Cart from '@/models/Cart';
import Event from '@/models/Event';
import Message from '@/models/Message';
import Notification from '@/models/Notification';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Promo from '@/models/Promo';
import Review from '@/models/Review';
import SavedCard from '@/models/SavedCard';
import Shift from '@/models/Shift';
import StaffMember from '@/models/StaffMember';
import User from '@/models/User';
import { DEMO_ADMIN_FILTER, DEMO_CUSTOMER_FILTER, demoOwnerIds } from './accounts';
import { expectedProductSlugs, expectedPromoCodes } from './natural-keys';
import { DEMO_SHOP_SETTINGS } from './seed/settings';
import { DEMO_SHIFTS, currentWeekStartUtc } from './seed/shifts';
import { DEMO_STAFF } from './seed/staff';

// ── What the reset would do, without doing any of it ────────────────────
// Read-only by construction: every query below is a `countDocuments` or a
// projected `find`. Its caller, `dryRunDemoReset`, runs the same
// `assertDemoResetTarget` check `resetDemoData` does — as its OWN call, not by
// routing through it, which an earlier version of this line got wrong. So a dry
// run cannot be pointed somewhere the real thing would refuse, and the reason
// is that both entry points check rather than that one delegates.
//
// It deliberately does NOT claim the advisory lock. The lock is a write, and a
// dry run that took it would block the nightly cron for the duration — so a
// plan can be produced while a real run is in flight, and the numbers it
// reports are a snapshot that run is actively invalidating. That is one of the
// things `cannotPredict` says out loud.

export type DemoResetPlan = {
  /** The verified target, echoed so a plan is never ambiguous about where. */
  database: string;
  /** Rows that exist now and would be removed. */
  wouldDelete: Record<string, number>;
  /** Rows the snapshot would write, split by whether they exist yet. */
  wouldRestore: Record<string, number>;
  /**
   * Things this plan genuinely cannot tell you. Listed rather than omitted —
   * a dry run that only reports what it is confident about reads as complete
   * and is the more misleading of the two.
   */
  cannotPredict: string[];
};

export async function planDemoReset(database: string): Promise<DemoResetPlan> {
  await connectDB();

  const [demoCustomer, demoAdmin] = await Promise.all([
    User.findOne(DEMO_CUSTOMER_FILTER)
      .select('_id stripeCustomerId')
      .lean<{ _id: Types.ObjectId; stripeCustomerId?: string } | null>(),
    User.findOne(DEMO_ADMIN_FILTER)
      .select('_id stripeCustomerId')
      .lean<{ _id: Types.ObjectId; stripeCustomerId?: string } | null>(),
  ]);

  // Mirrors the real run's early return: with no demo customer the reset
  // restores nothing, and a plan that listed 39 products would be describing
  // a job that will not happen.
  if (!demoCustomer) {
    return {
      database,
      wouldDelete: {},
      wouldRestore: {},
      cannotPredict: [
        'No demo customer exists in this database, so a real run would wipe and restore nothing. Seed the demo first.',
      ],
    };
  }

  const ownerIds = demoOwnerIds(demoCustomer, demoAdmin);
  const demoAdminId = demoAdmin?._id ?? null;

  const [orders, carts, savedCards, notifications, reviews, messages, events] =
    await Promise.all([
      Order.countDocuments({ user: { $in: ownerIds } }),
      Cart.countDocuments({ user: { $in: ownerIds } }),
      SavedCard.countDocuments({ user: { $in: ownerIds } }),
      Notification.countDocuments({ userId: { $in: ownerIds } }),
      Review.countDocuments({ user: { $in: ownerIds } }),
      Message.countDocuments({ user: { $in: ownerIds } }),
      Event.countDocuments({}),
    ]);

  const [productsAdded, promosAdded] = await Promise.all([
    demoAdminId ? Product.countDocuments({ createdBy: demoAdminId }) : 0,
    demoAdminId ? Promo.countDocuments({ createdBy: demoAdminId }) : 0,
  ]);

  // Split the restore into "already there, would be overwritten" and "absent,
  // would be created". The second number is the interesting one: on a healthy
  // demo it is zero every night, and anything else means the catalog lost a row.
  const expectedSlugs = expectedProductSlugs();
  const liveSlugs = await Product.find({ slug: { $in: expectedSlugs } })
    .select('slug')
    .lean<{ slug: string }[]>();
  const productsExisting = new Set(liveSlugs.map((p) => p.slug)).size;

  const expectedCodes = expectedPromoCodes();
  const livePromos = await Promo.find({ code: { $in: expectedCodes } })
    .select('code')
    .lean<{ code: string }[]>();
  const promosExisting = new Set(livePromos.map((p) => p.code)).size;

  const stripeCustomers = [demoCustomer, demoAdmin].filter(
    (u) => u?.stripeCustomerId,
  ).length;

  // ── The two prunes that are NOT ownership-scoped ──────────────────────
  // These were missing, and their absence was the worst thing about this plan.
  // A dry run exists to answer "what will this destroy", and it was silent on
  // exactly the two collections where an unintended target does the most
  // damage — while reporting `wouldRestore.staff: 6` with no matching deletion,
  // which reads as additive.
  //
  // Staff: `restore.ts` inserts the six seeded rows and THEN deletes everything
  // that is not one of them. So every pre-existing row dies, including last
  // night's seeded six — they are re-created with fresh ids each run. The
  // number to report is therefore the whole collection, not "the ones you
  // added". Put beside `wouldRestore.staff`, an operator reads 6-vs-6 as a
  // clean replace and 7-vs-6 as "you are about to lose someone".
  const staffDeleted = await StaffMember.countDocuments({});

  // Shifts: the seeded week is upserted, then everything else is deleted —
  // every other week entirely, plus any non-seeded slot inside this week.
  // Survivors are exactly the rows matching a seeded {day, hour} in the current
  // week, so the difference is what dies.
  //
  // The zone comes from the snapshot, matching `restore.ts` — reading the live
  // settings document would key this to a zone the restore is about to
  // overwrite.
  const weekStart = currentWeekStartUtc(DEMO_SHOP_SETTINGS.timezone);
  const [shiftsTotal, shiftsSurviving] = await Promise.all([
    Shift.countDocuments({}),
    Shift.countDocuments({
      weekStart,
      $or: DEMO_SHIFTS.map(({ dayOfWeek, hourIndex }) => ({ dayOfWeek, hourIndex })),
    }),
  ]);

  return {
    database,
    wouldDelete: {
      orders,
      carts,
      savedCards,
      notifications,
      reviews,
      messages,
      grillEvents: events,
      demoCreatedProducts: productsAdded,
      demoCreatedPromos: promosAdded,
      stripeCustomers,
      // Compare each against its `wouldRestore` twin — equal is a clean
      // replace, higher means rows die that the snapshot will not put back.
      staff: staffDeleted,
      // Floored. The two counts run concurrently, so a write landing between
      // them can make `surviving` exceed `total` — rare, but a negative "would
      // delete" is nonsense on a plan an operator acts on, and reads as a bug
      // in the tool rather than a race in the data.
      shifts: Math.max(0, shiftsTotal - shiftsSurviving),
    },
    wouldRestore: {
      productsOverwritten: productsExisting,
      productsCreated: expectedSlugs.length - productsExisting,
      promosOverwritten: promosExisting,
      promosCreated: expectedCodes.length - promosExisting,
      staff: DEMO_STAFF.length,
      shifts: DEMO_SHIFTS.length,
      shopSettings: 1,
    },
    cannotPredict: [
      'Product rating recomputes — the worklist is derived from reviews the real run deletes as it goes, and per-product failures are swallowed by design.',
      'Cloudinary image deletions — the assets attached at run time are not known now, and the call is to a third party that may fail independently.',
      'Whether the Stripe Customer deletions succeed — an external call that never throws, so a failure leaves the object orphaned and is only visible in the log.',
      'Seeded order totals and points awards — both are computed from live product prices at seed time, so repricing a cut between now and the run changes them.',
      'Anything a demo visitor changes between this plan and the real run. These counts are a snapshot, not a reservation.',
      'Whether the advisory lock will be free. A dry run does not take it, so a real run starting first would make it skip.',
    ],
  };
}

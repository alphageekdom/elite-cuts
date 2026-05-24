import 'server-only';

import connectDB from '@/config/database';
import User from '@/models/User';
import Order from '@/models/Order';
import Cart from '@/models/Cart';
import SavedCard from '@/models/SavedCard';
import Notification from '@/models/Notification';
import Product from '@/models/Product';
import Promo from '@/models/Promo';
import StaffMember from '@/models/StaffMember';
import Shift from '@/models/Shift';
import ShopSettings from '@/models/ShopSettings';
import Event from '@/models/Event';

import { deleteCloudinaryImages } from '@/lib/products/cloudinary-cleanup';

import { DEMO_PRODUCTS } from './seed/products';
import { DEMO_PROMOS } from './seed/promos';
import { DEMO_STAFF } from './seed/staff';
import { DEMO_SHIFTS, currentWeekStartUtc } from './seed/shifts';
import { DEMO_SHOP_SETTINGS } from './seed/settings';

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

// Per-collection touch counts returned by `restoreDemoCatalog`. Each
// `*Restored` counts how many docs were re-inserted from seed; the
// `*Deleted` counts are the number of pre-existing docs cleared first.
// `settingsRestored` is a boolean because settings is a singleton.
// `eventsRestored` stays in the shape (always 0) so consumers can read
// the catalog envelope uniformly — no seeded grill events ship, but the
// admin can schedule one during a demo session and the reset clears it.
export type CatalogCounts = {
  productsDeleted: number;
  productsRestored: number;
  promosDeleted: number;
  promosRestored: number;
  staffDeleted: number;
  staffRestored: number;
  shiftsDeleted: number;
  shiftsRestored: number;
  eventsDeleted: number;
  eventsRestored: number;
  settingsRestored: boolean;
};

// Union shape returned by `resetDemoData` — the cron + admin endpoint
// both surface this so the toast / log can report customer-side and
// catalog-side counts in one shot.
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

// Idempotent restore of the shared catalog + config collections from the
// TypeScript seed snapshot at `src/lib/demo/seed/`. Each step is delete-all
// then re-insert from seed — running it twice in a row produces the same
// end state. Settings is upserted (singleton), and shifts are scoped to
// the current week so historical shifts on prior weeks aren't touched.
//
// Products go through `Model.create(...)` instead of `insertMany` so the
// pre-validate hook fires and stamps `slug` + the display labels + the
// backcompat `price` / `unit` from the canonical per-pricingType fields.
// Promos / staff / shifts have no such hook and use `insertMany`.
export async function restoreDemoCatalog(): Promise<CatalogCounts> {
  await connectDB();

  // Products — pre-validate hook stamps slug + display labels. Collect every
  // image URL before the bulk delete so admin-uploaded Cloudinary assets get
  // purged alongside the Mongo docs; seeded local filenames return null from
  // the extractor and are silently skipped.
  const existingProducts = await Product.find({}).select('images').lean<{ images: string[] }[]>();
  const allImageUrls = existingProducts.flatMap((p) => p.images ?? []);
  await deleteCloudinaryImages(allImageUrls);

  const productsDelRes = await Product.deleteMany({});
  const insertedProducts = await Product.create(DEMO_PRODUCTS);

  // Promos — fresh usageCount=0 on every restore so the savings-to-date
  // column on the admin dashboard reads cleanly.
  const promosDelRes = await Promo.deleteMany({});
  const insertedPromos = await Promo.insertMany(
    DEMO_PROMOS.map((p) => ({ ...p, usageCount: 0 })),
  );

  // Staff roster.
  const staffDelRes = await StaffMember.deleteMany({});
  const insertedStaff = await StaffMember.insertMany(DEMO_STAFF);

  // Shifts — scoped to the current week so historical shifts on prior
  // weeks survive a reset. The seed only carries (dayOfWeek, hourIndex,
  // staffName, role, color); weekStart gets stamped at insert time so the
  // restored shifts always land on whichever Monday-UTC the cron runs.
  const weekStart = currentWeekStartUtc();
  const shiftsDelRes = await Shift.deleteMany({ weekStart });
  const insertedShifts = await Shift.insertMany(
    DEMO_SHIFTS.map((s) => ({ ...s, weekStart })),
  );

  // Events — delete all grill events; no seeded events ship (admins can
  // schedule one during a demo session and the next reset clears it).
  const eventsDelRes = await Event.deleteMany({});

  // Settings — singleton overwrite. `findOneAndUpdate({}, ..., { upsert })`
  // collapses "first run, no doc yet" and "subsequent run, overwrite"
  // into one round trip.
  await ShopSettings.findOneAndUpdate({}, DEMO_SHOP_SETTINGS, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });

  return {
    productsDeleted: productsDelRes.deletedCount ?? 0,
    productsRestored: insertedProducts.length,
    promosDeleted: promosDelRes.deletedCount ?? 0,
    promosRestored: insertedPromos.length,
    staffDeleted: staffDelRes.deletedCount ?? 0,
    staffRestored: insertedStaff.length,
    shiftsDeleted: shiftsDelRes.deletedCount ?? 0,
    shiftsRestored: insertedShifts.length,
    eventsDeleted: eventsDelRes.deletedCount ?? 0,
    eventsRestored: 0,
    settingsRestored: true,
  };
}

// Top-level orchestrator for the nightly cron + admin "Reset demo data"
// button. Wipes the demo customer's owned state only — the catalog
// restore is deliberately skipped so seeded products, reviews, ratings,
// promos, staff, and shifts persist across resets (otherwise a curated
// demo population would silently revert to the bare seed snapshot every
// night). `restoreDemoCatalog` is still exported above if a future
// caller needs to opt in to the destructive reset behavior — but the
// cron + admin button no longer trigger it.
//
// The returned envelope keeps the union shape so existing consumers
// (cron route, admin card toast, tests) don't need to change their
// type expectations — catalog counts always read zero on this path.
export async function resetDemoData(): Promise<DemoResetCounts> {
  const customer = await resetDemoCustomerState();
  return {
    ...customer,
    productsDeleted: 0,
    productsRestored: 0,
    promosDeleted: 0,
    promosRestored: 0,
    staffDeleted: 0,
    staffRestored: 0,
    shiftsDeleted: 0,
    shiftsRestored: 0,
    eventsDeleted: 0,
    eventsRestored: 0,
    settingsRestored: false,
  };
}

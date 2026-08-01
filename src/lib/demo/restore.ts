import 'server-only';

import type { Types } from 'mongoose';

import connectDB from '@/config/database';
import Event from '@/models/Event';
import Product from '@/models/Product';
import Promo from '@/models/Promo';
import Shift from '@/models/Shift';
import ShopSettings from '@/models/ShopSettings';
import StaffMember from '@/models/StaffMember';
import User from '@/models/User';
import { deleteCloudinaryImages } from '@/lib/products/cloudinary-cleanup';
import { slugify } from '@/lib/slugify';
import { DEMO_PRODUCTS } from './seed/products';
import { DEMO_PROMOS } from './seed/promos';
import { DEMO_SHOP_SETTINGS } from './seed/settings';
import { DEMO_SHIFTS, currentWeekStartUtc } from './seed/shifts';
import { DEMO_STAFF } from './seed/staff';

// Per-collection touch counts for the catalog + shop-config half of the
// nightly demo reset. Surfaced verbatim by the cron and admin endpoints.
export type CatalogCounts = {
  productsRestored: number;
  productsDeleted: number;
  promosRestored: number;
  promosDeleted: number;
  staffRestored: number;
  shiftsRestored: number;
  eventsDeleted: number;
  settingsRestored: boolean;
};

export const emptyCatalogCounts = (): CatalogCounts => ({
  productsRestored: 0,
  productsDeleted: 0,
  promosRestored: 0,
  promosDeleted: 0,
  staffRestored: 0,
  shiftsRestored: 0,
  eventsDeleted: 0,
  settingsRestored: false,
});

// Products and promos restore by **upsert on their natural key**, never by
// delete-and-reinsert. Six collections reference a Product `_id` — Review,
// Cart, Order, User.savedCuts, Stocktake, Delivery — and Order references a
// Promo `_id`. Re-inserting would hand every restored row a fresh id and
// silently orphan all of them: reviews and the ratings computed from them,
// every customer's saved cuts, every historical order line.
//
// Upserting keeps the id, so those references stay live across a restore.
// Staff, shifts and grill events have no inbound references at all (Shift
// stores `staffName` as a plain string), so those are replaced wholesale.

// Every field a seed entry is allowed to leave out, at the value a restored
// product should hold when it does.
//
// `set()` only writes the keys handed to it, so restoring straight from a seed
// entry silently preserves whatever the demo session left behind on every
// field the entry omits — and most entries omit most of these. Only 7 of the
// 39 seeds set `isFeatured`, one sets `isAged`, none set the inventory fields.
// Without this floor, a demo admin who featured the whole case, deactivated a
// cut, or typed a supplier onto one would have it survive every future
// restore. Spread this first, then the seed's own values on top.
const seedProductDefaults = () => ({
  isFeatured: false,
  isAged: false,
  isNewArrival: false,
  isActive: true,
  sku: '',
  gradeBreed: '',
  supplier: '',
  parLevel: 0,
  reorderPoint: 0,
});

async function restoreProducts(
  demoAdminId: Types.ObjectId | null,
): Promise<{ restored: number; deleted: number }> {
  // Products a demo admin invented during a session. Scoped by ownership the
  // same way the customer wipe is, so a product a *real* admin added is never
  // collateral. Rows with no `createdBy` pre-date the field and are seeded.
  const demoCreated = demoAdminId
    ? await Product.find({ createdBy: demoAdminId })
        .select('images')
        .lean<{ images: string[] }[]>()
    : [];

  let deleted = 0;
  if (demoCreated.length > 0) {
    // Database first, assets second. Destroying the images before the rows
    // that reference them means a failure in between leaves live products
    // pointing at assets that no longer exist. Reversed, the same failure
    // leaks an orphaned asset instead — the cheaper of the two, and one the
    // next successful run doesn't need to know about.
    const orphaned = demoCreated.flatMap((p) => p.images ?? []);
    const res = await Product.deleteMany({ createdBy: demoAdminId });
    deleted = res.deletedCount ?? 0;
    await deleteCloudinaryImages(orphaned);
  }

  let restored = 0;
  for (const seed of DEMO_PRODUCTS) {
    // The seed carries no slug — the model derives it from `name`. Deriving
    // it the same way here gives the upsert its key.
    const slug = slugify(seed.name);
    const existing = await Product.findOne({ slug });

    if (!existing) {
      await Product.create(seed);
      restored += 1;
      continue;
    }

    // Any Cloudinary image the demo admin uploaded onto a seeded product is
    // about to be replaced by the seed's local filename — purge it so the
    // asset doesn't leak. `deleteCloudinaryImages` skips local filenames.
    //
    // Captured now, destroyed after the save, for the same reason as the
    // delete branch above: destroying first leaves a live catalog product
    // pointing at a dead image whenever the save fails.
    const staleImages = [...(existing.images ?? [])];

    // Assign-then-save rather than `updateOne`, so the pre-validate hook
    // re-stamps `price`, `unit` and the display labels from the canonical
    // per-pricingType fields.
    //
    // `rating` is deliberately excluded: it is derived from reviews by
    // `recomputeProductRating`, and the seed's value is only ever a starting
    // display value for a product nobody has reviewed yet. Writing it back
    // would discard real review data on every restore — the exact failure the
    // upsert exists to avoid.
    const { rating: _seedRating, ...restorable } = seed;
    existing.set({ ...seedProductDefaults(), ...restorable });
    await existing.save();
    await deleteCloudinaryImages(staleImages);
    restored += 1;
  }

  return { restored, deleted };
}

// Optional promo fields carrying no schema default — the ones a seed can leave
// out and an admin can fill in. Anything omitted by a given seed is cleared on
// restore so the code goes back to exactly the campaign the snapshot describes.
const OPTIONAL_PROMO_FIELDS = [
  'startsAt',
  'endsAt',
  'usageLimit',
  'minSubtotal',
  'maxDiscount',
] as const;

async function restorePromos(
  demoAdminId: Types.ObjectId | null,
): Promise<{ restored: number; deleted: number }> {
  let deleted = 0;
  if (demoAdminId) {
    const res = await Promo.deleteMany({ createdBy: demoAdminId });
    deleted = res.deletedCount ?? 0;
  }

  // `usageCount: 0` on every restore so the admin dashboard's used-vs-limit
  // and savings-to-date columns read cleanly the next morning.
  //
  // The `$unset` is the promo equivalent of `seedProductDefaults`. These five
  // fields are optional with no schema default, and most seeds omit most of
  // them — an update only writes the keys it is handed, so anything a demo
  // admin typed into an omitted field survived every future restore. Setting
  // `endsAt` to yesterday on WELCOME10 would have killed the public checkout
  // chip permanently.
  for (const seed of DEMO_PROMOS) {
    const toClear = OPTIONAL_PROMO_FIELDS.filter((f) => seed[f] === undefined);
    await Promo.findOneAndUpdate(
      { code: seed.code },
      {
        $set: { ...seed, usageCount: 0 },
        ...(toClear.length > 0 && {
          $unset: Object.fromEntries(toClear.map((f) => [f, ''])),
        }),
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  return { restored: DEMO_PROMOS.length, deleted };
}

// Idempotent restore of the shared catalog and shop config from the seed
// snapshot in `./seed`. Running it twice in a row produces the same end state.
export async function restoreDemoCatalog(): Promise<CatalogCounts> {
  await connectDB();

  const demoAdmin = await User.findOne({
    isDemo: true,
    demoType: 'admin',
  }).select('_id');
  const demoAdminId = (demoAdmin?._id as Types.ObjectId | undefined) ?? null;

  const products = await restoreProducts(demoAdminId);
  const promos = await restorePromos(demoAdminId);

  // Staff has no inbound references, so a clean replace keeps the roster
  // exactly as seeded — but insert BEFORE delete, not after. Nothing in this
  // orchestrator is wrapped in a transaction and Vercel does not retry a
  // failed cron, so `deleteMany` followed by a throwing `insertMany` left the
  // roster empty for a full day: the staff tab, the "On today" card and the
  // shift drawer's picker all read this collection. Reversed, the same failure
  // leaves the old roster sitting alongside the new one, which the next line
  // (and the next night's run) prunes back. `StaffMember` carries no unique
  // index of any kind, so nothing at the database layer would have caught the
  // duplication either.
  const staff = await StaffMember.insertMany(DEMO_STAFF);
  await StaffMember.deleteMany({ _id: { $nin: staff.map((s) => s._id) } });

  // The seeded week is replaced wholesale so a restore always lands on the
  // week the demo visitor is actually looking at. Every other week is cleared
  // rather than left alone: the schedule lets an admin navigate to any week and
  // book there, so a shift planted outside the current week used to survive
  // every future restore — permanently, for a past week the seed never revisits.
  // Shifts carry no inbound references, and the seed only ever describes the
  // current week, so "no shifts outside this week" is the correct rest state.
  //
  // The zone comes from the snapshot this restore INSTALLS, not from the
  // settings document it overwrites a few lines below. A demo admin can change
  // the shop's timezone — the settings PUT is deliberately open to them — so
  // reading the live document keyed the roster to a zone that stopped applying
  // the moment the restore finished. Setting the shop to Honolulu and letting
  // the cron fire planted the whole week under a key the schedule never
  // queries, leaving the grid, the "On today" card and the staff column empty
  // until the following night.
  //
  // Upsert-then-prune rather than delete-then-insert, for the same reason as
  // the roster above — a wholesale delete followed by a throwing insert blanks
  // the entire week's calendar until the next night. Insert-first isn't
  // available here: {weekStart, dayOfWeek, hourIndex} is unique and the
  // previous run installed this same week, so the new rows would collide with
  // the old. Upserting on that natural key is the pattern the product and
  // promo paths already use, and two overlapping runs converge on it instead
  // of one of them dying on a duplicate key.
  const weekStart = currentWeekStartUtc(DEMO_SHOP_SETTINGS.timezone);
  const seededShifts = DEMO_SHIFTS.map((shift) => ({ ...shift, weekStart }));

  await Shift.bulkWrite(
    seededShifts.map((shift) => ({
      updateOne: {
        filter: { weekStart, dayOfWeek: shift.dayOfWeek, hourIndex: shift.hourIndex },
        update: { $set: shift },
        upsert: true,
      },
    })),
  );

  const shifts = await Shift.find({
    weekStart,
    $or: seededShifts.map(({ dayOfWeek, hourIndex }) => ({ dayOfWeek, hourIndex })),
  })
    .select('_id')
    .lean<{ _id: Types.ObjectId }[]>();
  await Shift.deleteMany({ _id: { $nin: shifts.map((s) => s._id) } });

  // No grill events ship in the seed — an admin can schedule one during a
  // session and the next restore clears it.
  //
  // The delete is UNSCOPED, and unlike products and promos that is accepted
  // rather than an oversight: Event carries no `createdBy` to scope by, and on
  // this deploy the demo admin is the only author events realistically have.
  // The accepted collateral is that a real admin's scheduled grill event also
  // dies at the nightly reset. If this app ever runs with a real authoring
  // admin alongside the demo, Event needs the `createdBy` treatment products
  // got — don't discover that here the hard way.
  const eventsRes = await Event.deleteMany({});

  // `dormancyWarningMonths` is held back from the restore. Every other setting
  // reverting nightly is the point of the demo; this one decides whether the
  // shop auto-deletes inactive customer accounts, and `0` is the documented
  // way to switch that off. Restoring it put the shop back to 18 months every
  // night, so an operator who deliberately disabled the sweep had it silently
  // re-armed and real accounts warned the following morning — the only
  // restored value that destroys data rather than just resetting a demo.
  // On a first-ever insert the schema default still applies via
  // `setDefaultsOnInsert`, so a fresh shop is unaffected.
  const { dormancyWarningMonths: _operatorControlled, ...restorableSettings } =
    DEMO_SHOP_SETTINGS;

  // No `returnDocument` option: the result is discarded, so asking for the
  // after-image (the old `new: true` here, which Mongoose now deprecates)
  // bought nothing.
  await ShopSettings.findOneAndUpdate({}, restorableSettings, {
    upsert: true,
    setDefaultsOnInsert: true,
  });

  return {
    productsRestored: products.restored,
    productsDeleted: products.deleted,
    promosRestored: promos.restored,
    promosDeleted: promos.deleted,
    staffRestored: staff.length,
    shiftsRestored: shifts.length,
    eventsDeleted: eventsRes.deletedCount ?? 0,
    settingsRestored: true,
  };
}

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
    await deleteCloudinaryImages(demoCreated.flatMap((p) => p.images ?? []));
    const res = await Product.deleteMany({ createdBy: demoAdminId });
    deleted = res.deletedCount ?? 0;
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
    await deleteCloudinaryImages(existing.images ?? []);

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
    restored += 1;
  }

  return { restored, deleted };
}

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
  for (const seed of DEMO_PROMOS) {
    await Promo.findOneAndUpdate(
      { code: seed.code },
      { ...seed, usageCount: 0 },
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

  // Staff has no inbound references, so a clean replace is safe and keeps the
  // roster exactly as seeded.
  await StaffMember.deleteMany({});
  const staff = await StaffMember.insertMany(DEMO_STAFF);

  // Shifts are scoped to the current week so a restore always lands on the
  // week the demo visitor is actually looking at, and historical weeks are
  // left alone.
  const weekStart = currentWeekStartUtc();
  await Shift.deleteMany({ weekStart });
  const shifts = await Shift.insertMany(
    DEMO_SHIFTS.map((shift) => ({ ...shift, weekStart })),
  );

  // No grill events ship in the seed — an admin can schedule one during a
  // session and the next restore clears it.
  const eventsRes = await Event.deleteMany({});

  await ShopSettings.findOneAndUpdate({}, DEMO_SHOP_SETTINGS, {
    upsert: true,
    new: true,
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

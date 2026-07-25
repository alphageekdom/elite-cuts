import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEMO_PRODUCTS } from './seed/products';
import { DEMO_PROMOS } from './seed/promos';
import { DEMO_STAFF } from './seed/staff';
import { DEMO_SHIFTS, currentWeekStartUtc } from './seed/shifts';
import { slugify } from '@/lib/slugify';

// `restore.ts` pulls in `server-only`, `connectDB` and eight Mongoose models,
// none of which run outside Next's bundler / a live DB, so each is stubbed.
//
// What these tests are actually guarding is the property the whole restore
// design rests on: **a restored row keeps its `_id`**. Six collections point
// at a Product `_id` and one points at a Promo `_id`, so a restore that
// re-inserted instead of upserting would silently orphan every review, cart
// line, order line, saved cut, stocktake row and delivery. That failure is
// invisible at runtime — nothing throws, the ids just stop resolving — so it
// has to be caught here.

vi.mock('server-only', () => ({}));

vi.mock('@/config/database', () => ({
  default: vi.fn(async () => undefined),
}));

vi.mock('@/lib/products/cloudinary-cleanup', () => ({
  deleteCloudinaryImages: vi.fn(async () => undefined),
}));

const mocks = vi.hoisted(() => ({
  userFindOne: vi.fn(),
  productFind: vi.fn(),
  productFindOne: vi.fn(),
  productDeleteMany: vi.fn(),
  productCreate: vi.fn(),
  promoDeleteMany: vi.fn(),
  promoFindOneAndUpdate: vi.fn(),
  staffDeleteMany: vi.fn(),
  staffInsertMany: vi.fn(),
  shiftDeleteMany: vi.fn(),
  shiftInsertMany: vi.fn(),
  eventDeleteMany: vi.fn(),
  settingsFindOneAndUpdate: vi.fn(),
}));

vi.mock('@/models/User', () => ({
  default: { findOne: mocks.userFindOne },
}));

vi.mock('@/models/Product', () => ({
  default: {
    find: mocks.productFind,
    findOne: mocks.productFindOne,
    deleteMany: mocks.productDeleteMany,
    create: mocks.productCreate,
  },
}));

vi.mock('@/models/Promo', () => ({
  default: {
    deleteMany: mocks.promoDeleteMany,
    findOneAndUpdate: mocks.promoFindOneAndUpdate,
  },
}));

vi.mock('@/models/StaffMember', () => ({
  default: {
    deleteMany: mocks.staffDeleteMany,
    insertMany: mocks.staffInsertMany,
  },
}));

vi.mock('@/models/Shift', () => ({
  default: {
    deleteMany: mocks.shiftDeleteMany,
    insertMany: mocks.shiftInsertMany,
  },
}));

vi.mock('@/models/Event', () => ({
  default: { deleteMany: mocks.eventDeleteMany },
}));

vi.mock('@/models/ShopSettings', () => ({
  default: { findOneAndUpdate: mocks.settingsFindOneAndUpdate },
}));

const DEMO_ADMIN_ID = 'demo-admin-id';

// Stand-in for a persisted product doc: records what `.set()` was handed so a
// test can assert on the restore payload, and keeps `_id` fixed so an
// accidental re-insert shows up as a changed id.
function fakeProductDoc(id: string, images: string[] = []) {
  return {
    _id: id,
    images,
    setPayload: null as Record<string, unknown> | null,
    saved: false,
    set(payload: Record<string, unknown>) {
      this.setPayload = payload;
    },
    async save() {
      this.saved = true;
    },
  };
}

// Chained `.select('_id')` / `.select('images').lean()` shapes.
const selectChain = (result: unknown) => ({
  select: () => Promise.resolve(result),
});
const selectLeanChain = (result: unknown) => ({
  select: () => ({ lean: async () => result }),
});

function stubHappyPath({ withDemoAdmin = true } = {}): void {
  mocks.userFindOne.mockReturnValue(
    selectChain(withDemoAdmin ? { _id: DEMO_ADMIN_ID } : null),
  );
  mocks.productFind.mockReturnValue(selectLeanChain([]));
  mocks.productDeleteMany.mockResolvedValue({ deletedCount: 0 });
  // Default: every seeded slug already exists, so the restore takes the
  // upsert-in-place branch rather than creating.
  mocks.productFindOne.mockImplementation(async () => fakeProductDoc('stable-id'));
  mocks.productCreate.mockResolvedValue({});
  mocks.promoDeleteMany.mockResolvedValue({ deletedCount: 0 });
  mocks.promoFindOneAndUpdate.mockResolvedValue({});
  mocks.staffDeleteMany.mockResolvedValue({ deletedCount: 6 });
  mocks.staffInsertMany.mockResolvedValue(new Array(DEMO_STAFF.length).fill({}));
  mocks.shiftDeleteMany.mockResolvedValue({ deletedCount: 49 });
  mocks.shiftInsertMany.mockResolvedValue(
    new Array(DEMO_SHIFTS.length).fill({}),
  );
  mocks.eventDeleteMany.mockResolvedValue({ deletedCount: 1 });
  mocks.settingsFindOneAndUpdate.mockResolvedValue({});
}

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
  stubHappyPath();
});

describe('restoreDemoCatalog — products keep their identity', () => {
  it('updates an existing cut in place instead of re-inserting it', async () => {
    const existing = fakeProductDoc('ribeye-object-id');
    mocks.productFindOne.mockResolvedValue(existing);

    const { restoreDemoCatalog } = await import('./restore');
    await restoreDemoCatalog();

    // The property everything else depends on: no create call for a slug that
    // already exists, so the `_id` reviews point at is still the same one.
    expect(mocks.productCreate).not.toHaveBeenCalled();
    expect(existing._id).toBe('ribeye-object-id');
    expect(existing.saved).toBe(true);
  });

  it('never writes the seed rating back over a review-computed one', async () => {
    const existing = fakeProductDoc('ribeye-object-id');
    mocks.productFindOne.mockResolvedValue(existing);

    const { restoreDemoCatalog } = await import('./restore');
    await restoreDemoCatalog();

    // `rating` is an average over surviving reviews, maintained by
    // `recomputeProductRating`. The seed's value is only a starting display
    // number for a cut nobody has reviewed. Writing it back on every restore
    // would discard real review data nightly.
    expect(existing.setPayload).not.toBeNull();
    expect(existing.setPayload).not.toHaveProperty('rating');
    // Everything else from the seed still lands.
    expect(existing.setPayload).toHaveProperty('name');
    expect(existing.setPayload).toHaveProperty('stockCount');
  });

  it('resets flags the seed entry leaves out', async () => {
    const existing = fakeProductDoc('ribeye-object-id');
    mocks.productFindOne.mockResolvedValue(existing);

    const { restoreDemoCatalog } = await import('./restore');
    await restoreDemoCatalog();

    // `set()` only writes the keys handed to it, and most seed entries omit
    // most of these — 7 of 39 set `isFeatured`, one sets `isAged`, none set
    // the inventory fields. Restoring straight from a seed entry would let a
    // demo session's "feature everything" or "deactivate this cut" survive
    // every future restore.
    const payload = existing.setPayload!;
    expect(payload).toHaveProperty('isFeatured');
    expect(payload).toHaveProperty('isAged');
    expect(payload).toHaveProperty('isNewArrival');
    expect(payload).toHaveProperty('isActive');
    expect(payload).toHaveProperty('supplier');
    expect(payload).toHaveProperty('parLevel');
  });

  it('lets a seed entry override the reset floor', async () => {
    // One doc per slug, each remembering what it was handed, so the two
    // cases can be compared against the seed they came from.
    const docs = new Map<string, ReturnType<typeof fakeProductDoc>>();
    mocks.productFindOne.mockImplementation(async ({ slug }) => {
      const doc = fakeProductDoc(`id-${slug}`);
      docs.set(slug, doc);
      return doc;
    });

    const { restoreDemoCatalog } = await import('./restore');
    await restoreDemoCatalog();

    // The floor is spread first and the seed's own values land on top, so a
    // genuinely featured cut still restores as featured. Without this, a fix
    // for the previous test could blanket-reset and flatten the catalog.
    const featured = DEMO_PRODUCTS.find((p) => p.isFeatured);
    const plain = DEMO_PRODUCTS.find((p) => !p.isFeatured);
    expect(featured && plain).toBeTruthy();

    expect(docs.get(slugify(featured!.name))!.setPayload!.isFeatured).toBe(true);
    expect(docs.get(slugify(plain!.name))!.setPayload!.isFeatured).toBe(false);
  });

  it('creates a cut that is missing entirely', async () => {
    mocks.productFindOne.mockResolvedValue(null);

    const { restoreDemoCatalog } = await import('./restore');
    const counts = await restoreDemoCatalog();

    expect(mocks.productCreate).toHaveBeenCalledTimes(DEMO_PRODUCTS.length);
    expect(counts.productsRestored).toBe(DEMO_PRODUCTS.length);
  });

  it('looks each cut up by the slug derived from its seed name', async () => {
    const { restoreDemoCatalog } = await import('./restore');
    await restoreDemoCatalog();

    // The seed carries no slug — the model derives it from `name`. If the two
    // derivations ever diverge, every lookup misses and the restore quietly
    // starts duplicating the whole catalog.
    const firstCall = mocks.productFindOne.mock.calls[0][0];
    expect(firstCall).toHaveProperty('slug');
    expect(typeof firstCall.slug).toBe('string');
    expect(firstCall.slug.length).toBeGreaterThan(0);
  });
});

describe('restoreDemoCatalog — ownership scoping', () => {
  it('deletes only the cuts the demo admin created', async () => {
    mocks.productFind.mockReturnValue(
      selectLeanChain([{ images: ['https://res.cloudinary.com/x/upload/a.jpg'] }]),
    );
    mocks.productDeleteMany.mockResolvedValue({ deletedCount: 2 });

    const { restoreDemoCatalog } = await import('./restore');
    const counts = await restoreDemoCatalog();

    // Scoped by `createdBy`, never a bare deleteMany({}) — a product a real
    // admin added must survive the nightly run.
    expect(mocks.productDeleteMany).toHaveBeenCalledWith({
      createdBy: DEMO_ADMIN_ID,
    });
    expect(mocks.promoDeleteMany).toHaveBeenCalledWith({
      createdBy: DEMO_ADMIN_ID,
    });
    expect(counts.productsDeleted).toBe(2);
  });

  it('skips the ownership-scoped deletes when no demo admin exists', async () => {
    stubHappyPath({ withDemoAdmin: false });

    const { restoreDemoCatalog } = await import('./restore');
    const counts = await restoreDemoCatalog();

    // A fresh DB where the demo seed hasn't run. Without the guard, a
    // `{ createdBy: null }` filter would match every seeded product.
    expect(mocks.productDeleteMany).not.toHaveBeenCalled();
    expect(mocks.promoDeleteMany).not.toHaveBeenCalled();
    expect(counts.productsDeleted).toBe(0);
    expect(counts.promosDeleted).toBe(0);
    // The restore half still runs.
    expect(counts.productsRestored).toBe(DEMO_PRODUCTS.length);
  });
});

describe('restoreDemoCatalog — promos, staff, shifts, settings', () => {
  it('upserts each promo by code with a fresh usage count', async () => {
    const { restoreDemoCatalog } = await import('./restore');
    await restoreDemoCatalog();

    expect(mocks.promoFindOneAndUpdate).toHaveBeenCalledTimes(
      DEMO_PROMOS.length,
    );
    const [filter, update, options] = mocks.promoFindOneAndUpdate.mock.calls[0];
    // Upsert by `code` for the same reason products upsert by slug: Order
    // carries a `promoId` reference.
    expect(filter).toEqual({ code: DEMO_PROMOS[0].code });
    expect(update.usageCount).toBe(0);
    expect(options.upsert).toBe(true);
  });

  it('scopes the shift replace to the current week', async () => {
    const { restoreDemoCatalog } = await import('./restore');
    await restoreDemoCatalog();

    const weekStart = currentWeekStartUtc();
    expect(mocks.shiftDeleteMany).toHaveBeenCalledWith({ weekStart });
    // Historical weeks are left alone; the seed carries no weekStart of its
    // own so the restored week is always the one being looked at.
    const inserted = mocks.shiftInsertMany.mock.calls[0][0];
    expect(inserted).toHaveLength(DEMO_SHIFTS.length);
    expect(inserted[0].weekStart).toEqual(weekStart);
  });

  it('replaces staff wholesale and upserts the settings singleton', async () => {
    const { restoreDemoCatalog } = await import('./restore');
    const counts = await restoreDemoCatalog();

    // Nothing references a StaffMember `_id` — Shift stores `staffName` as a
    // plain string — so a clean replace is safe here.
    expect(mocks.staffDeleteMany).toHaveBeenCalledWith({});
    expect(counts.staffRestored).toBe(DEMO_STAFF.length);
    expect(mocks.settingsFindOneAndUpdate).toHaveBeenCalledOnce();
    expect(counts.settingsRestored).toBe(true);
  });

  it('clears grill events', async () => {
    const { restoreDemoCatalog } = await import('./restore');
    const counts = await restoreDemoCatalog();

    expect(mocks.eventDeleteMany).toHaveBeenCalledWith({});
    expect(counts.eventsDeleted).toBe(1);
  });
});

describe('restoreDemoCatalog — idempotency', () => {
  it('produces the same counts when run twice in a row', async () => {
    const { restoreDemoCatalog } = await import('./restore');
    const first = await restoreDemoCatalog();
    const second = await restoreDemoCatalog();
    expect(second).toEqual(first);
  });
});

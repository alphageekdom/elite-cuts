import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/config/database', () => ({ default: vi.fn(async () => undefined) }));

const mocks = vi.hoisted(() => ({
  userFindOne: vi.fn(),
  productFind: vi.fn(),
  promoFind: vi.fn(),
  staffFind: vi.fn(),
  shiftFind: vi.fn(),
  settingsFindOne: vi.fn(),
  reviewCount: vi.fn(),
  messageCount: vi.fn(),
  cartCount: vi.fn(),
  orderFind: vi.fn(),
}));

vi.mock('@/models/User', () => ({ default: { findOne: mocks.userFindOne } }));
vi.mock('@/models/Product', () => ({ default: { find: mocks.productFind } }));
vi.mock('@/models/Promo', () => ({ default: { find: mocks.promoFind } }));
vi.mock('@/models/StaffMember', () => ({ default: { find: mocks.staffFind } }));
vi.mock('@/models/Shift', () => ({ default: { find: mocks.shiftFind } }));
vi.mock('@/models/ShopSettings', () => ({
  default: { findOne: mocks.settingsFindOne },
}));
vi.mock('@/models/Review', () => ({
  default: { countDocuments: mocks.reviewCount },
}));
vi.mock('@/models/Message', () => ({
  default: { countDocuments: mocks.messageCount },
}));
vi.mock('@/models/Cart', () => ({ default: { countDocuments: mocks.cartCount } }));
vi.mock('@/models/Order', () => ({ default: { find: mocks.orderFind } }));

const { verifyDemoState } = await import('./verify');
const { DEMO_PRODUCTS } = await import('./seed/products');
const { DEMO_PROMOS } = await import('./seed/promos');
const { DEMO_SHOP_SETTINGS } = await import('./seed/settings');
const { DEMO_SHIFTS } = await import('./seed/shifts');
const { DEMO_STAFF } = await import('./seed/staff');
const { slugify } = await import('@/lib/slugify');

// ── Why the seeds are used rather than fixtures ─────────────────────────
// The point of this module is that it compares against the snapshot. A fixture
// list would let the two drift and still pass — which is the failure mode, not
// a convenience.
const allSlugs = DEMO_PRODUCTS.map((p) => ({ slug: slugify(p.name), isActive: true }));
const allCodes = DEMO_PROMOS.map((p) => ({ code: p.code }));
const allStaff = DEMO_STAFF.map((s) => ({ name: s.name }));
const allShifts = DEMO_SHIFTS.map((s) => ({
  dayOfWeek: s.dayOfWeek,
  hourIndex: s.hourIndex,
}));

/**
 * Honours the projection, which a stub that ignored it could not.
 *
 * `verify.ts:94` reads `.select('slug isActive')`. With a projection-blind stub
 * the fixture arrives complete regardless, so dropping `isActive` from that
 * string left every product with `isActive === undefined`, the active filter
 * kept none, and the nightly cron would report all 39 slugs missing and answer
 * 500 — with all sixteen tests in this file still green.
 *
 * Mongoose projections here are always space-separated inclusive field lists,
 * so splitting on whitespace is sufficient; `_id` is implicit and kept.
 *
 * Dotted paths (`orderItems.product`) are matched on their top-level segment —
 * a real projection returns the parent with only that subfield, and the fixture
 * rows already carry exactly the subfield under test, so keeping the whole
 * parent is equivalent here and avoids reimplementing sub-document projection.
 */
const selectLean = (rows: unknown) => ({
  select: (fields?: string) => ({
    lean: async () => {
      if (!fields || !Array.isArray(rows)) return rows;
      const keep = new Set([
        ...fields
          .split(/\s+/)
          .filter(Boolean)
          .map((f) => f.split('.')[0]),
        '_id',
      ]);
      return (rows as Record<string, unknown>[]).map((row) =>
        Object.fromEntries(Object.entries(row).filter(([k]) => keep.has(k))),
      );
    },
  }),
});

/** Puts every collection in the state a healthy run leaves behind. */
function healthy() {
  mocks.userFindOne.mockImplementation((filter: { demoType?: string }) =>
    selectLean(
      filter.demoType === 'admin'
        ? { _id: 'demo-admin' }
        : { _id: 'demo-customer', savedCuts: [] },
    ),
  );
  mocks.productFind.mockReturnValue(selectLean(allSlugs));
  mocks.promoFind.mockReturnValue(selectLean(allCodes));
  mocks.staffFind.mockReturnValue(selectLean(allStaff));
  mocks.shiftFind.mockReturnValue(selectLean(allShifts));
  mocks.settingsFindOne.mockReturnValue(
    selectLean({ shopName: DEMO_SHOP_SETTINGS.shopName }),
  );
  mocks.reviewCount.mockResolvedValue(0);
  mocks.messageCount.mockResolvedValue(0);
  mocks.cartCount.mockResolvedValue(0);
  mocks.orderFind.mockReturnValue(selectLean([]));
}

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
  healthy();
});

describe('verifyDemoState — healthy demo', () => {
  it('reports no failures', async () => {
    await expect(verifyDemoState()).resolves.toEqual([]);
  });
});

describe('verifyDemoState — accounts', () => {
  it('names the missing demo customer and stops, rather than reporting the whole catalog', async () => {
    // With no demo customer the reset deliberately restores nothing, so every
    // catalog identifier really is absent — reporting all 39 would be true and
    // would drown the one finding that is actionable.
    mocks.userFindOne.mockReturnValue(selectLean(null));
    // The catalog is EMPTY here, which is the state a database with no demo
    // customer is actually in. Without this the assertion below was vacuous:
    // `healthy()` had already stocked the catalog, so "no product failures" was
    // true whether or not the early return existed. It failed today only
    // incidentally, by dereferencing null — so the most likely form of the
    // regression (`demoCustomer?._id`, or moving the return below the catalog
    // block) would have kept it green.
    mocks.productFind.mockReturnValue(selectLean([]));
    mocks.promoFind.mockReturnValue(selectLean([]));
    mocks.staffFind.mockReturnValue(selectLean([]));

    const failures = await verifyDemoState();

    expect(failures).toContain('account:demo-customer');
    expect(failures).toContain('account:demo-admin');
    expect(failures.some((f) => f.startsWith('product:'))).toBe(false);
  });

  it('names a missing demo admin while still checking everything else', async () => {
    mocks.userFindOne.mockImplementation((filter: { demoType?: string }) =>
      selectLean(
        filter.demoType === 'admin' ? null : { _id: 'demo-customer', savedCuts: [] },
      ),
    );

    const failures = await verifyDemoState();

    expect(failures).toEqual(['account:demo-admin']);
  });
});

describe('verifyDemoState — catalog', () => {
  it('names a product missing by slug', async () => {
    const gone = allSlugs[0].slug;
    mocks.productFind.mockReturnValue(selectLean(allSlugs.slice(1)));

    const failures = await verifyDemoState();

    expect(failures).toEqual([`product:${gone}`]);
  });

  it('treats a deactivated product as missing', async () => {
    // Present in the collection and absent from the shop. From a visitor's
    // side those are the same failure, so a bare existence check would report
    // a catalog that is missing a cut as healthy.
    const hidden = allSlugs[2].slug;
    mocks.productFind.mockReturnValue(
      selectLean(
        allSlugs.map((p) => (p.slug === hidden ? { ...p, isActive: false } : p)),
      ),
    );

    const failures = await verifyDemoState();

    expect(failures).toEqual([`product:${hidden}`]);
  });

  it('names a promo missing by code', async () => {
    const gone = allCodes[0].code;
    mocks.promoFind.mockReturnValue(selectLean(allCodes.slice(1)));

    const failures = await verifyDemoState();

    expect(failures).toEqual([`promo:${gone}`]);
  });
});

describe('verifyDemoState — roster and schedule', () => {
  it('names every staff member when the insert-then-prune pair blanked the roster', async () => {
    // The specific outage the restore's ordering was chosen to avoid: an empty
    // roster blanks the staff tab, the "On today" card and the shift drawer's
    // picker at once.
    mocks.staffFind.mockReturnValue(selectLean([]));

    const failures = await verifyDemoState();

    expect(failures).toHaveLength(DEMO_STAFF.length);
    expect(failures[0]).toBe(`staff:${DEMO_STAFF[0].name}`);
  });

  it('names a missing shift slot by its day and hour coordinate', async () => {
    const gone = allShifts[0];
    mocks.shiftFind.mockReturnValue(selectLean(allShifts.slice(1)));

    const failures = await verifyDemoState();

    expect(failures).toEqual([`shift:${gone.dayOfWeek}-${gone.hourIndex}`]);
  });
});

describe('verifyDemoState — shop configuration', () => {
  it('names a missing settings document', async () => {
    mocks.settingsFindOne.mockReturnValue(selectLean(null));

    const failures = await verifyDemoState();

    expect(failures).toEqual(['settings:missing']);
  });

  it('rejects a settings document that is not the restored one', async () => {
    // An upsert that never ran leaves the PREVIOUS document in place, which
    // satisfies an existence check while the demo shows somebody else's shop.
    mocks.settingsFindOne.mockReturnValue(selectLean({ shopName: 'Some Other Shop' }));

    const failures = await verifyDemoState();

    expect(failures).toEqual(['settings:not-restored']);
  });
});

describe('verifyDemoState — residue the wipe should have cleared', () => {
  it('names surviving reviews, messages and carts', async () => {
    // Reviews and messages are publicly visible to the next visitor, which the
    // privacy page promises against by name.
    mocks.reviewCount.mockResolvedValue(2);
    mocks.messageCount.mockResolvedValue(1);
    mocks.cartCount.mockResolvedValue(1);

    const failures = await verifyDemoState();

    expect(failures).toEqual(['residue:reviews', 'residue:messages', 'residue:cart']);
  });
});

describe('verifyDemoState — orphans', () => {
  it('names a saved cut pointing at a product that no longer exists', async () => {
    // The restore's whole design is that product ids survive. If one did not,
    // the damage is silent — a saved cut that renders nothing.
    mocks.userFindOne.mockImplementation((filter: { demoType?: string }) =>
      selectLean(
        filter.demoType === 'admin'
          ? { _id: 'demo-admin' }
          : { _id: 'demo-customer', savedCuts: ['prod-gone'] },
      ),
    );
    // First call resolves slugs, second resolves referenced ids.
    mocks.productFind
      .mockReturnValueOnce(selectLean(allSlugs))
      .mockReturnValueOnce(selectLean([]));

    const failures = await verifyDemoState();

    expect(failures).toEqual(['orphan:saved-cut']);
  });

  it('names an order line pointing at a product that no longer exists', async () => {
    mocks.orderFind.mockReturnValue(
      selectLean([{ orderItems: [{ product: 'prod-gone' }] }]),
    );
    mocks.productFind
      .mockReturnValueOnce(selectLean(allSlugs))
      .mockReturnValueOnce(selectLean([]));

    const failures = await verifyDemoState();

    expect(failures).toEqual(['orphan:order-line']);
  });

  it('names an order line carrying no product reference at all', async () => {
    // Already an orphan with nothing to look up, so the resolve pass below
    // cannot catch it — it needs its own branch.
    mocks.orderFind.mockReturnValue(selectLean([{ orderItems: [{ product: null }] }]));

    const failures = await verifyDemoState();

    expect(failures).toEqual(['orphan:order-line']);
  });

  it('reports orphan:order-line once when both branches fire', async () => {
    mocks.orderFind.mockReturnValue(
      selectLean([{ orderItems: [{ product: null }, { product: 'prod-gone' }] }]),
    );
    mocks.productFind
      .mockReturnValueOnce(selectLean(allSlugs))
      .mockReturnValueOnce(selectLean([]));

    const failures = await verifyDemoState();

    expect(failures).toEqual(['orphan:order-line']);
  });

  it('passes when every reference resolves', async () => {
    mocks.userFindOne.mockImplementation((filter: { demoType?: string }) =>
      selectLean(
        filter.demoType === 'admin'
          ? { _id: 'demo-admin' }
          : { _id: 'demo-customer', savedCuts: ['prod-1'] },
      ),
    );
    mocks.orderFind.mockReturnValue(
      selectLean([{ orderItems: [{ product: 'prod-2' }] }]),
    );
    mocks.productFind
      .mockReturnValueOnce(selectLean(allSlugs))
      .mockReturnValueOnce(selectLean([{ _id: 'prod-1' }, { _id: 'prod-2' }]));

    await expect(verifyDemoState()).resolves.toEqual([]);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/config/database', () => ({ default: vi.fn(async () => undefined) }));

const mocks = vi.hoisted(() => ({
  userFindOne: vi.fn(),
  orderCount: vi.fn(),
  cartCount: vi.fn(),
  savedCardCount: vi.fn(),
  notificationCount: vi.fn(),
  reviewCount: vi.fn(),
  messageCount: vi.fn(),
  eventCount: vi.fn(),
  productCount: vi.fn(),
  productFind: vi.fn(),
  promoCount: vi.fn(),
  promoFind: vi.fn(),
  staffCount: vi.fn(),
  shiftCount: vi.fn(),
}));

vi.mock('@/models/User', () => ({ default: { findOne: mocks.userFindOne } }));
vi.mock('@/models/Order', () => ({ default: { countDocuments: mocks.orderCount } }));
vi.mock('@/models/Cart', () => ({ default: { countDocuments: mocks.cartCount } }));
vi.mock('@/models/SavedCard', () => ({
  default: { countDocuments: mocks.savedCardCount },
}));
vi.mock('@/models/Notification', () => ({
  default: { countDocuments: mocks.notificationCount },
}));
vi.mock('@/models/Review', () => ({ default: { countDocuments: mocks.reviewCount } }));
vi.mock('@/models/Message', () => ({
  default: { countDocuments: mocks.messageCount },
}));
vi.mock('@/models/Event', () => ({ default: { countDocuments: mocks.eventCount } }));
vi.mock('@/models/Product', () => ({
  default: { countDocuments: mocks.productCount, find: mocks.productFind },
}));
vi.mock('@/models/Promo', () => ({
  default: { countDocuments: mocks.promoCount, find: mocks.promoFind },
}));
vi.mock('@/models/StaffMember', () => ({
  default: { countDocuments: mocks.staffCount },
}));
vi.mock('@/models/Shift', () => ({ default: { countDocuments: mocks.shiftCount } }));

const { planDemoReset } = await import('./dry-run');
const { DEMO_PRODUCTS } = await import('./seed/products');
const { DEMO_PROMOS } = await import('./seed/promos');
const { DEMO_SHIFTS } = await import('./seed/shifts');
const { DEMO_STAFF } = await import('./seed/staff');
const { slugify } = await import('@/lib/slugify');

// ── Why this file exists ────────────────────────────────────────────────
// G4 requires that a dry run must not write. That property was previously
// asserted only about the ORCHESTRATOR (`reset.test.ts`), with this module
// stubbed out — so an `updateOne` added in here was caught by nothing.
//
// The numbers matter as much as the absence of writes: this plan is what an
// operator reads before typing `--yes`, so a wrong count does not fail, it
// lies.

const selectLean = (rows: unknown) => ({
  select: () => ({ lean: async () => rows }),
});

const allSlugs = DEMO_PRODUCTS.map((p) => ({ slug: slugify(p.name) }));
const allCodes = DEMO_PROMOS.map((p) => ({ code: p.code }));

/** A healthy demo: everything seeded, nothing extra, nothing missing. */
function healthy() {
  mocks.userFindOne.mockImplementation((filter: { demoType?: string }) =>
    selectLean(
      filter.demoType === 'admin'
        ? { _id: 'demo-admin' }
        : { _id: 'demo-customer' },
    ),
  );
  for (const c of [
    mocks.orderCount,
    mocks.cartCount,
    mocks.savedCardCount,
    mocks.notificationCount,
    mocks.reviewCount,
    mocks.messageCount,
    mocks.eventCount,
    mocks.productCount,
    mocks.promoCount,
  ]) {
    c.mockResolvedValue(0);
  }
  mocks.productFind.mockReturnValue(selectLean(allSlugs));
  mocks.promoFind.mockReturnValue(selectLean(allCodes));
  mocks.staffCount.mockResolvedValue(DEMO_STAFF.length);
  // Total equals surviving — every shift is a seeded slot in the current week.
  mocks.shiftCount.mockResolvedValue(DEMO_SHIFTS.length);
}

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
  healthy();
});

describe('planDemoReset — writes nothing', () => {
  it('uses only counts and projected reads', async () => {
    // The mocks expose ONLY read methods. If this module ever gains a
    // `create`, `updateOne`, `deleteMany` or `bulkWrite`, the call throws
    // "not a function" and this test fails — which is the point. A test that
    // merely asserted "no writes happened" against a mock that offered write
    // methods would pass while writing.
    await expect(planDemoReset('elite-cuts-dev')).resolves.toBeTruthy();
  });

  it('echoes the verified database back, so a plan is never ambiguous about where', async () => {
    const plan = await planDemoReset('elite-cuts-dev');
    expect(plan.database).toBe('elite-cuts-dev');
  });
});

describe('planDemoReset — the two unscoped prunes', () => {
  it('reports every staff row as deleted, because the restore replaces them wholesale', async () => {
    // `restore.ts` inserts the six seeded rows and THEN deletes everything that
    // is not one of them, so last night's seeded six die too. Reporting only
    // "extra" staff would under-count by six and hide the mechanism.
    mocks.staffCount.mockResolvedValue(7);

    const plan = await planDemoReset('elite-cuts-dev');

    expect(plan.wouldDelete.staff).toBe(7);
    expect(plan.wouldRestore.staff).toBe(DEMO_STAFF.length);
  });

  it('reads 6-against-6 on a clean demo, so the extra row is what stands out', async () => {
    const plan = await planDemoReset('elite-cuts-dev');
    expect(plan.wouldDelete.staff).toBe(plan.wouldRestore.staff);
  });

  it('counts shifts outside the seeded set as deleted', async () => {
    // Survivors are exactly the seeded slots in the current week. Everything
    // else — other weeks entirely, and non-seeded slots this week — is deleted.
    mocks.shiftCount
      .mockResolvedValueOnce(DEMO_SHIFTS.length + 4) // total
      .mockResolvedValueOnce(DEMO_SHIFTS.length); // surviving

    const plan = await planDemoReset('elite-cuts-dev');

    expect(plan.wouldDelete.shifts).toBe(4);
  });

  it('reports zero shift deletions when only the seeded week exists', async () => {
    const plan = await planDemoReset('elite-cuts-dev');
    expect(plan.wouldDelete.shifts).toBe(0);
  });

  it('does not go negative if a seeded slot is somehow counted twice', async () => {
    // The two counts run concurrently, so a write landing between them can
    // make `surviving` exceed `total`. Rare, but a negative "would delete" is
    // nonsense on a plan an operator acts on — and this test found the missing
    // floor rather than confirming one that was already there.
    mocks.shiftCount
      .mockResolvedValueOnce(DEMO_SHIFTS.length)
      .mockResolvedValueOnce(DEMO_SHIFTS.length + 2);

    const plan = await planDemoReset('elite-cuts-dev');

    expect(plan.wouldDelete.shifts).toBeGreaterThanOrEqual(0);
  });
});

describe('planDemoReset — catalog split', () => {
  it('reports a missing seeded product as one that would be created', async () => {
    // The interesting number: zero every night on a healthy demo, non-zero
    // means the catalog lost a row. An off-by-one here makes the plan lie
    // rather than fail.
    mocks.productFind.mockReturnValue(selectLean(allSlugs.slice(1)));

    const plan = await planDemoReset('elite-cuts-dev');

    expect(plan.wouldRestore.productsCreated).toBe(1);
    expect(plan.wouldRestore.productsOverwritten).toBe(allSlugs.length - 1);
  });

  it('reports every seeded product as overwritten on a healthy demo', async () => {
    const plan = await planDemoReset('elite-cuts-dev');
    expect(plan.wouldRestore.productsCreated).toBe(0);
    expect(plan.wouldRestore.productsOverwritten).toBe(DEMO_PRODUCTS.length);
  });

  it('does the same split for promos', async () => {
    mocks.promoFind.mockReturnValue(selectLean(allCodes.slice(2)));

    const plan = await planDemoReset('elite-cuts-dev');

    expect(plan.wouldRestore.promosCreated).toBe(2);
    expect(plan.wouldRestore.promosOverwritten).toBe(allCodes.length - 2);
  });

  it('deduplicates before counting, so a duplicate row cannot inflate the split', async () => {
    mocks.productFind.mockReturnValue(selectLean([...allSlugs, allSlugs[0]]));

    const plan = await planDemoReset('elite-cuts-dev');

    expect(plan.wouldRestore.productsOverwritten).toBe(DEMO_PRODUCTS.length);
    expect(plan.wouldRestore.productsCreated).toBe(0);
  });
});

describe('planDemoReset — no demo customer', () => {
  it('reports nothing and says why, rather than listing a restore that will not happen', async () => {
    // Mirrors the real run's early return. A plan listing 39 products would be
    // describing a job that `runDemoReset` refuses to do.
    mocks.userFindOne.mockReturnValue(selectLean(null));

    const plan = await planDemoReset('elite-cuts-dev');

    expect(plan.wouldDelete).toEqual({});
    expect(plan.wouldRestore).toEqual({});
    expect(plan.cannotPredict.join(' ')).toContain('No demo customer');
  });

  it('does not query the catalog at all in that case', async () => {
    mocks.userFindOne.mockReturnValue(selectLean(null));

    await planDemoReset('elite-cuts-dev');

    expect(mocks.productFind).not.toHaveBeenCalled();
    expect(mocks.staffCount).not.toHaveBeenCalled();
  });
});

describe('planDemoReset — the demo admin may be absent', () => {
  it('skips owner-scoped catalog counts when there is no demo admin', async () => {
    // The admin account post-dates some installs, so `restore.ts` builds its
    // owner list defensively. The plan has to tolerate the same shape.
    mocks.userFindOne.mockImplementation((filter: { demoType?: string }) =>
      selectLean(filter.demoType === 'admin' ? null : { _id: 'demo-customer' }),
    );

    const plan = await planDemoReset('elite-cuts-dev');

    expect(plan.wouldDelete.demoCreatedProducts).toBe(0);
    expect(plan.wouldDelete.demoCreatedPromos).toBe(0);
    expect(mocks.productCount).not.toHaveBeenCalled();
  });
});

describe('planDemoReset — Stripe', () => {
  it('counts only the demo accounts that actually carry a Stripe Customer', async () => {
    mocks.userFindOne.mockImplementation((filter: { demoType?: string }) =>
      selectLean(
        filter.demoType === 'admin'
          ? { _id: 'demo-admin' }
          : { _id: 'demo-customer', stripeCustomerId: 'cus_x' },
      ),
    );

    const plan = await planDemoReset('elite-cuts-dev');

    expect(plan.wouldDelete.stripeCustomers).toBe(1);
  });
});

describe('planDemoReset — honesty about what it cannot know', () => {
  it('names the unpredictable parts rather than omitting them', async () => {
    // A plan reporting only its confident half reads as complete, which is the
    // more dangerous of the two failures.
    const plan = await planDemoReset('elite-cuts-dev');

    expect(plan.cannotPredict.length).toBeGreaterThan(0);
    const joined = plan.cannotPredict.join(' ');
    expect(joined).toContain('rating');
    expect(joined).toContain('Cloudinary');
    expect(joined).toContain('lock');
  });
});

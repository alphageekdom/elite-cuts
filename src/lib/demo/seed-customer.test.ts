import { beforeEach, describe, expect, it, vi } from 'vitest';

// `seed-customer.ts` pulls in `server-only`, `connectDB` and two Mongoose
// models, none of which run outside Next's bundler or a live DB. The Product
// lookup and the Order insert are stubbed so the tests can exercise the parts
// that actually carry risk: awards derived through the production earn path,
// slug resolution, the back-dated timestamps, and the ledger entries built
// from the inserted ids.

vi.mock('server-only', () => ({}));

vi.mock('@/config/database', () => ({
  default: vi.fn(async () => undefined),
}));

const mocks = vi.hoisted(() => ({
  productFind: vi.fn(),
  orderInsertMany: vi.fn(),
  cardInsertMany: vi.fn(),
}));

vi.mock('@/models/Product', () => ({
  default: { find: mocks.productFind },
}));

vi.mock('@/models/Order', () => ({
  default: { insertMany: mocks.orderInsertMany },
}));

vi.mock('@/models/SavedCard', () => ({
  default: { insertMany: mocks.cardInsertMany },
}));

// Two real cuts from the seed catalog, priced the two different ways the
// pricing model supports, so the per-unit snapshot is exercised on both.
const PRODUCTS = [
  {
    _id: 'p-mince',
    slug: 'ground-beef-pack-80-20',
    name: 'Ground Beef Pack (80/20)',
    images: ['mince.jpg'],
    category: 'Beef',
    pricingType: 'fixed_package',
    packagePrice: 9.99,
    price: 9.99,
  },
  {
    _id: 'p-prosciutto',
    slug: 'prosciutto-di-parma',
    name: 'Prosciutto di Parma',
    images: ['prosciutto.jpg'],
    category: 'Charcuterie',
    pricingType: 'fixed_package',
    packagePrice: 16.99,
    price: 16.99,
  },
  {
    _id: 'p-marrow',
    slug: 'beef-bone-marrow',
    name: 'Beef Bone Marrow',
    images: ['marrow.jpg'],
    category: 'Beef',
    pricingType: 'fixed_package',
    packagePrice: 9.99,
    price: 9.99,
  },
  {
    _id: 'p-cookout',
    slug: 'backyard-cookout-bundle',
    name: 'Backyard Cookout Bundle',
    images: ['cookout.jpg'],
    category: 'Bundles',
    pricingType: 'bundle',
    bundlePrice: 89.99,
    price: 89.99,
  },
  {
    _id: 'p-sampler',
    slug: 'steakhouse-beef-sampler-bundle',
    name: 'Steakhouse Beef Sampler Bundle',
    images: ['sampler.jpg'],
    category: 'Bundles',
    pricingType: 'bundle',
    bundlePrice: 159.99,
    price: 159.99,
  },
];

const NOW = new Date('2026-07-28T12:00:00.000Z');
const DEMO_ID = 'demo-customer-id' as unknown as Parameters<
  Awaited<typeof import('./seed-customer')>['seedDemoOrders']
>[0];

// Two call shapes: the order seed uses `.lean()`, the saved-cuts resolver
// narrows with `.select('_id slug').lean()`.
function mockCatalog(products: typeof PRODUCTS) {
  mocks.productFind.mockReturnValue({
    lean: async () => products,
    select: () => ({ lean: async () => products }),
  });
}

// insertMany echoes back a doc per input, with a synthetic id, so the ledger
// mapping has something id-shaped to point at.
function mockInsert() {
  mocks.orderInsertMany.mockImplementation(
    async (docs: Record<string, unknown>[]) =>
      docs.map((_, i) => ({ _id: `order-${i}` })),
  );
}

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
  mockCatalog(PRODUCTS);
  mockInsert();
  mocks.cardInsertMany.mockImplementation(
    async (docs: Record<string, unknown>[]) => docs,
  );
});

describe('seedDemoOrders — qualifying window', () => {
  it('reaches back far enough to cover the whole history', async () => {
    const { DEMO_HISTORY_DAYS, DEMO_ORDERS } = await import('./seed/orders');
    const oldest = Math.max(...DEMO_ORDERS.map((o) => o.daysAgo));
    // The qualifying window opens at `now - DEMO_HISTORY_DAYS`. An award dated
    // before that is not counted, so the tier bar would under-read.
    expect(DEMO_HISTORY_DAYS).toBeGreaterThan(oldest);
  });
});

describe('seedDemoOrders — documents', () => {
  it('writes one order per spec, owned by the demo customer', async () => {
    const { seedDemoOrders } = await import('./seed-customer');
    const { DEMO_ORDERS } = await import('./seed/orders');

    const result = await seedDemoOrders(DEMO_ID, NOW);

    expect(result.counts.ordersSeeded).toBe(DEMO_ORDERS.length);
    const [docs] = mocks.orderInsertMany.mock.calls[0];
    expect(docs.every((d: { user: unknown }) => d.user === DEMO_ID)).toBe(true);
  });

  it('back-dates each order and preserves those dates through insert', async () => {
    const { seedDemoOrders } = await import('./seed-customer');
    await seedDemoOrders(DEMO_ID, NOW);

    const [docs, options] = mocks.orderInsertMany.mock.calls[0];
    // Without `timestamps: false` Mongoose stamps every doc "now" and the
    // whole history collapses onto one day — taking the habit stats, the
    // ledger dates and the "orders this year" count with it.
    expect(options).toEqual({ timestamps: false });

    const dates = docs.map((d: { createdAt: Date }) => d.createdAt.getTime());
    // Strictly ascending — see the insertion-order test below for why.
    for (let i = 1; i < dates.length; i += 1) {
      expect(dates[i]).toBeGreaterThan(dates[i - 1]);
    }
    // The live order is the newest, so it lands last.
    expect(dates[dates.length - 1]).toBe(NOW.getTime());
  });

  it('inserts oldest-first so order references ascend with time', async () => {
    const { seedDemoOrders } = await import('./seed-customer');
    await seedDemoOrders(DEMO_ID, NOW);

    const [docs] = mocks.orderInsertMany.mock.calls[0];
    // An ObjectId carries an incrementing counter and insertMany allocates
    // them in array order, so array position *is* reference order. Seeding
    // newest-first gave the newest order the lowest reference — a customer's
    // May order read #EC-5DA0 beside a July order reading #EC-5D9B.
    const first = docs[0].createdAt.getTime();
    const last = docs[docs.length - 1].createdAt.getTime();
    expect(first).toBeLessThan(last);
  });

  it('leaves exactly one order in flight so the active-order card has content', async () => {
    const { seedDemoOrders } = await import('./seed-customer');
    await seedDemoOrders(DEMO_ID, NOW);

    const [docs] = mocks.orderInsertMany.mock.calls[0];
    const live = docs.filter(
      (d: { orderStatus: string }) =>
        d.orderStatus !== 'Completed' && d.orderStatus !== 'Cancelled',
    );
    expect(live).toHaveLength(1);
    // A live order needs a pickup window; the collected ones are historical.
    expect(live[0].pickupSlot).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('marks collected orders picked up and stamps their fulfilment times', async () => {
    const { seedDemoOrders } = await import('./seed-customer');
    await seedDemoOrders(DEMO_ID, NOW);

    const [docs] = mocks.orderInsertMany.mock.calls[0];
    const done = docs.filter(
      (d: { orderStatus: string }) => d.orderStatus === 'Completed',
    );
    expect(done.length).toBeGreaterThan(0);
    for (const order of done) {
      expect(order.pickedUp).toBe(true);
      expect(order.readyAt).toBeInstanceOf(Date);
      expect(order.pickedUpAt).toBeInstanceOf(Date);
    }
  });

  it('totals each order as subtotal plus tax, rounded to cents', async () => {
    const { seedDemoOrders } = await import('./seed-customer');
    const { TAX_RATE } = await import('@/lib/pricing');
    await seedDemoOrders(DEMO_ID, NOW);

    const [docs] = mocks.orderInsertMany.mock.calls[0];
    for (const o of docs) {
      const expectedTax = Math.round(o.subtotal * TAX_RATE * 100) / 100;
      expect(o.tax).toBe(expectedTax);
      expect(o.totalCost).toBe(
        Math.round((o.subtotal + expectedTax) * 100) / 100,
      );
      // The demo charges nothing, but the receipt still has to add up.
      expect(o.paymentResult.amountPaid).toBe(o.totalCost);
    }
  });
});

describe('seedDemoOrders — catalog resolution', () => {
  it('looks cuts up by slug, the key that survives the nightly id rotation', async () => {
    const { seedDemoOrders } = await import('./seed-customer');
    await seedDemoOrders(DEMO_ID, NOW);

    const [filter] = mocks.productFind.mock.calls[0];
    expect(filter).toHaveProperty('slug.$in');
    expect(filter.slug.$in).toContain('ground-beef-pack-80-20');
  });

  it('drops an order whose cuts have all left the catalog, rather than writing an empty one', async () => {
    // Only the prosciutto survives — the order that is nothing but ground beef
    // has no lines left, and the schema rejects an order with no items.
    mockCatalog(PRODUCTS.filter((p) => p.slug === 'prosciutto-di-parma'));

    const { seedDemoOrders } = await import('./seed-customer');
    const result = await seedDemoOrders(DEMO_ID, NOW);

    const [docs] = mocks.orderInsertMany.mock.calls[0];
    expect(docs.length).toBeGreaterThan(0);
    expect(
      docs.every((d: { orderItems: unknown[] }) => d.orderItems.length > 0),
    ).toBe(true);
    expect(result.counts.ordersSeeded).toBe(docs.length);
  });

  it('writes nothing at all when the catalog is empty', async () => {
    mockCatalog([]);

    const { seedDemoOrders } = await import('./seed-customer');
    const result = await seedDemoOrders(DEMO_ID, NOW);

    expect(mocks.orderInsertMany).not.toHaveBeenCalled();
    expect(result.counts).toEqual({
      ordersSeeded: 0,
      pointsEntriesSeeded: 0,
      savedCutsSeeded: 0,
      savedCardsSeeded: 0,
      addressesSeeded: 0,
    });
    expect(result.pointsHistory).toEqual([]);
  });
});

describe('seedDemoOrders — points ledger', () => {
  it('emits one entry per fulfilled order, each pointing at a real order id', async () => {
    const { seedDemoOrders } = await import('./seed-customer');
    const result = await seedDemoOrders(DEMO_ID, NOW);

    expect(result.pointsHistory.length).toBe(result.counts.pointsEntriesSeeded);
    for (const entry of result.pointsHistory) {
      expect(entry.reason).toBe('order_fulfilled');
      // "Adjustment" is what the rewards row prints without this.
      expect(entry.orderId).toMatch(/^order-\d+$/);
      expect(entry.delta).toBeGreaterThan(0);
    }
  });

  it('awards nothing for the order that has not been fulfilled', async () => {
    const { seedDemoOrders } = await import('./seed-customer');
    const { DEMO_ORDERS } = await import('./seed/orders');

    const result = await seedDemoOrders(DEMO_ID, NOW);
    const fulfilled = DEMO_ORDERS.filter(
      (o) => o.status === 'Completed',
    ).length;

    expect(result.pointsHistory).toHaveLength(fulfilled);
    expect(result.pointsHistory.length).toBeLessThan(DEMO_ORDERS.length);
    // The in-flight order carries a zero on the document too, not just an
    // absent ledger row — the admin drawer reads `pointsAwarded` directly.
    const [docs] = mocks.orderInsertMany.mock.calls[0];
    const live = docs.find(
      (d: { orderStatus: string }) => d.orderStatus !== 'Completed',
    );
    expect(live.pointsAwarded).toBe(0);
  });

  it('awards each order exactly what the shop rate would, not a seeded number', async () => {
    const { seedDemoOrders } = await import('./seed-customer');
    const { computeAward } = await import('@/lib/rewards/calculator');
    const { DEMO_SHOP_SETTINGS } = await import('./seed/settings');

    await seedDemoOrders(DEMO_ID, NOW);

    // The rewards tab prints the configured earn rate directly above this
    // ledger, and each row links to an order the customer can open. Awards
    // used to be hand-picked to sum to a fixed balance, which put a $159.99
    // order next to "+212 points" under a heading reading "One point per
    // dollar". Deriving through the production earn path is what closes that.
    const [docs] = mocks.orderInsertMany.mock.calls[0];
    for (const order of docs) {
      expect(order.pointsAwarded).toBe(
        order.orderStatus === 'Completed'
          ? computeAward(order.subtotal, DEMO_SHOP_SETTINGS, order.createdAt)
          : 0,
      );
    }
  });

  it('has the ledger deltas add up to what the orders awarded', async () => {
    const { seedDemoOrders } = await import('./seed-customer');
    const result = await seedDemoOrders(DEMO_ID, NOW);

    // The reset writes this sum as the balance, so a mismatch would show a
    // headline number the activity list beneath it cannot account for.
    const ledger = result.pointsHistory.reduce((sum, e) => sum + e.delta, 0);
    const [docs] = mocks.orderInsertMany.mock.calls[0];
    const onOrders = docs.reduce(
      (sum: number, d: { pointsAwarded: number }) => sum + d.pointsAwarded,
      0,
    );

    expect(ledger).toBe(onOrders);
    expect(ledger).toBeGreaterThan(0);
  });

  it('dates every entry inside the qualifying window', async () => {
    const { seedDemoOrders } = await import('./seed-customer');
    const { DEMO_HISTORY_DAYS } = await import('./seed/orders');

    const result = await seedDemoOrders(DEMO_ID, NOW);
    const windowStart = new Date(NOW.getTime());
    windowStart.setDate(windowStart.getDate() - DEMO_HISTORY_DAYS);

    // An entry outside the window contributes nothing to the tier bar, so the
    // sidebar would read a lower total than the balance beside it.
    for (const entry of result.pointsHistory) {
      expect(entry.createdAt.getTime()).toBeGreaterThanOrEqual(
        windowStart.getTime(),
      );
      expect(entry.createdAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
    }
  });
});


describe('seedDemoCards', () => {
  it('dates expiry forward from the run, so a seeded card never reads as expired', async () => {
    const { seedDemoCards } = await import('./seed-customer');
    await seedDemoCards(DEMO_ID, NOW);

    const [docs] = mocks.cardInsertMany.mock.calls[0];
    expect(docs.length).toBeGreaterThan(0);
    for (const card of docs) {
      // The payment-methods list shows a red "Expired" pill on a past-expiry
      // card. A literal year in the seed would eventually produce exactly that.
      expect(card.expYear).toBeGreaterThan(NOW.getFullYear());
      expect(card.user).toBe(DEMO_ID);
    }
  });

  it('namespaces the stub id, which is globally unique in the schema', async () => {
    const { seedDemoCards } = await import('./seed-customer');
    await seedDemoCards(DEMO_ID, NOW);

    const [docs] = mocks.cardInsertMany.mock.calls[0];
    const ids = docs.map((d: { stubCardId: string }) => d.stubCardId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id: string) => id.startsWith('demo-seed-card-'))).toBe(true);
  });

  it('never carries a card number — only the display shell', async () => {
    const { seedDemoCards } = await import('./seed-customer');
    await seedDemoCards(DEMO_ID, NOW);

    const [docs] = mocks.cardInsertMany.mock.calls[0];
    for (const card of docs) {
      expect(card).not.toHaveProperty('number');
      expect(card.last4).toMatch(/^\d{4}$/);
    }
  });
});

describe('resolveDemoSavedCuts', () => {
  it('returns ids in seed order, not the order Mongo happened to return', async () => {
    const { resolveDemoSavedCuts } = await import('./seed-customer');
    const { DEMO_SAVED_CUT_SLUGS } = await import('./seed/customer');

    // Feed the catalog back reversed; the resolver must not inherit that order.
    mockCatalog(
      [...PRODUCTS].reverse() as typeof PRODUCTS,
    );
    mocks.productFind.mockReturnValue({
      select: () => ({
        lean: async () =>
          [...DEMO_SAVED_CUT_SLUGS]
            .reverse()
            .map((slug) => ({ _id: `id-${slug}`, slug })),
      }),
    });

    const ids = await resolveDemoSavedCuts();
    expect(ids).toEqual(DEMO_SAVED_CUT_SLUGS.map((slug) => `id-${slug}`));
  });

  it('drops a slug that no longer resolves rather than leaving a dangling id', async () => {
    const { resolveDemoSavedCuts } = await import('./seed-customer');
    mocks.productFind.mockReturnValue({
      select: () => ({
        lean: async () => [{ _id: 'id-only-one', slug: 'tomahawk-steak' }],
      }),
    });

    // The saved-cuts grid renders from a product lookup, so an id pointing at
    // nothing shows as a hole in the grid.
    expect(await resolveDemoSavedCuts()).toEqual(['id-only-one']);
  });
});

describe('buildDemoAddresses', () => {
  it('marks exactly one address as the default', async () => {
    const { buildDemoAddresses } = await import('./seed-customer');
    const addresses = buildDemoAddresses();
    expect(addresses.filter((a) => a.isDefault)).toHaveLength(1);
  });

  it('returns more than one so the checkout picker has something to pick between', async () => {
    const { buildDemoAddresses } = await import('./seed-customer');
    expect(buildDemoAddresses().length).toBeGreaterThan(1);
  });

  it('hands back copies, so a caller mutating one cannot corrupt the seed table', async () => {
    const { buildDemoAddresses } = await import('./seed-customer');
    const first = buildDemoAddresses();
    first[0].city = 'Mutated';
    expect(buildDemoAddresses()[0].city).not.toBe('Mutated');
  });
});

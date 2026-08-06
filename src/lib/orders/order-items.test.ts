import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── What this covers ────────────────────────────────────────────────────
//
// The two DB-reading builders in `builder.ts`, and ONLY those two. The rest of
// that module is already covered from neighbouring files, which was proven by
// mutation rather than assumed:
//
//   • `buildLine` — six tests in `line.test.ts`, including the pre-Phase-3
//     over-charge and the bundle snapshot.
//   • `computeSubtotal` / `computeMemberDiscount` / `computeOrderTotals` — the
//     six-case client-vs-server cross-check in `checkout/totals.test.ts`.
//     Zeroing the member discount fails five tests there.
//
// These two had nothing. What they own is the choice of FAILURE STATUS: the
// checkout route is a thin router over this result, so an empty cart, a
// per-line cap breach and a vanished product have to arrive as 400/400/409
// respectively. Getting one wrong sends the shopper a misleading error, and a
// 409 is what the client retries on.
//
// It lives beside `builder.ts` rather than in it because `line.test.ts` already
// owns `buildLine`; a second file named `builder.test.ts` would invite the next
// reader to assume it covers the whole module.

const mocks = vi.hoisted(() => ({
  cartFindOne: vi.fn(),
  productFind: vi.fn(),
}));

vi.mock('@/models/Cart', () => ({ default: { findOne: mocks.cartFindOne } }));
vi.mock('@/models/Product', () => ({ default: { find: mocks.productFind } }));

import {
  buildOrderItemsFromCart,
  buildOrderItemsFromGuestItems,
  type OrderProductLean,
} from './builder';

// MAX_PER_LINE is 10. Imported rather than hardcoded so raising the cap does
// not silently turn the over-cap test into a happy-path one.
import { MAX_PER_LINE } from '@/lib/shop-settings/config';

const product = (over: Partial<OrderProductLean> = {}): OrderProductLean =>
  ({
    _id: { toString: () => over._id?.toString() ?? 'p1' },
    name: 'Ribeye',
    price: 24.99,
    stockCount: 10,
    pricingType: 'per_lb',
    pricePerLb: 24.99,
    estimatedWeightLb: 1,
    images: ['ribeye.jpg'],
    category: 'beef',
    ...over,
  }) as OrderProductLean;

// `Cart.findOne(...)` returns a query whose `.populate()` resolves to the doc.
const cartResolving = (doc: unknown) => {
  mocks.cartFindOne.mockReturnValue({
    populate: vi.fn().mockResolvedValue(doc),
  });
};

// `Product.find(...)` returns a query whose `.lean()` resolves to the array.
const productsResolving = (docs: OrderProductLean[]) => {
  mocks.productFind.mockReturnValue({ lean: vi.fn().mockResolvedValue(docs) });
};

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
});

describe('buildOrderItemsFromCart', () => {
  it('refuses a customer with no cart document at all', async () => {
    cartResolving(null);
    const result = await buildOrderItemsFromCart('user-1');

    expect(result).toEqual({
      ok: false,
      status: 400,
      message: 'Cart is empty',
    });
  });

  it('refuses a cart whose items were all removed', async () => {
    cartResolving({ items: [] });
    const result = await buildOrderItemsFromCart('user-1');

    expect(result).toEqual({
      ok: false,
      status: 400,
      message: 'Cart is empty',
    });
  });

  // The cart API enforces this cap on add/edit; this is the backstop for a
  // stale or tampered client that got past it. A 400 and not a 409: the
  // quantity is the shopper's to fix, nothing about the shop changed.
  it('refuses a line above the per-item cap, naming the limit', async () => {
    cartResolving({
      items: [{ product: product(), quantity: MAX_PER_LINE + 1, price: 24.99 }],
    });
    const result = await buildOrderItemsFromCart('user-1');

    expect(result).toEqual({
      ok: false,
      status: 400,
      message: `Limit ${MAX_PER_LINE} per item`,
    });
  });

  it('accepts a line exactly at the cap', async () => {
    cartResolving({
      items: [
        {
          product: product({ stockCount: 99 }),
          quantity: MAX_PER_LINE,
          price: 24.99,
        },
      ],
    });
    const result = await buildOrderItemsFromCart('user-1');

    expect(result.ok).toBe(true);
  });

  it('builds a line per cart item, carrying the cart quantity', async () => {
    cartResolving({
      items: [
        { product: product({ name: 'Ribeye' }), quantity: 2, price: 24.99 },
        {
          product: product({
            name: 'Bacon',
            pricingType: 'fixed_package',
            packagePrice: 9.99,
          }),
          quantity: 1,
          price: 9.99,
        },
      ],
    });
    const result = await buildOrderItemsFromCart('user-1');

    if (!result.ok) throw new Error('expected ok');
    expect(result.orderItems.map((i) => [i.name, i.qty])).toEqual([
      ['Ribeye', 2],
      ['Bacon', 1],
    ]);
  });

  // Stock shortfalls are NOT a hard fail here — they come back alongside the
  // built lines so the route can answer 409 with every problem listed at once,
  // rather than the shopper fixing one and discovering the next.
  it('reports a stock shortfall without refusing the build', async () => {
    cartResolving({
      items: [
        {
          product: product({ name: 'Ribeye', stockCount: 1 }),
          quantity: 3,
          price: 24.99,
        },
        {
          product: product({ name: 'Bacon', stockCount: 50 }),
          quantity: 1,
          price: 9.99,
        },
      ],
    });
    const result = await buildOrderItemsFromCart('user-1');

    if (!result.ok) throw new Error('expected ok');
    expect(result.stockErrors).toEqual([
      'Ribeye: only 1 in stock (3 requested)',
    ]);
    // The lines are still built — the route decides what to do with them.
    expect(result.orderItems).toHaveLength(2);
  });

  it('reads the price off the populated product, not off the cart line', async () => {
    // The cart line's own `price` is a stale snapshot. Trusting it would let a
    // shopper hold yesterday's price by leaving a tab open.
    cartResolving({
      items: [
        {
          product: product({ pricePerLb: 30, estimatedWeightLb: 1 }),
          quantity: 1,
          price: 0.01,
        },
      ],
    });
    const result = await buildOrderItemsFromCart('user-1');

    if (!result.ok) throw new Error('expected ok');
    expect(result.orderItems[0].price).toBe(30);
  });

  it('scopes the lookup to the requesting customer', async () => {
    cartResolving({ items: [{ product: product(), quantity: 1, price: 1 }] });
    await buildOrderItemsFromCart('user-42');

    expect(mocks.cartFindOne).toHaveBeenCalledWith({ user: 'user-42' });
  });
});

describe('buildOrderItemsFromGuestItems', () => {
  const guestItem = (productId: string, qty: number) => ({ productId, qty });

  // 409 and not 400: the request was well-formed when it was made, and the
  // shop changed underneath it. That distinction is what the client keys its
  // retry on.
  it('refuses with 409 when a requested product no longer exists', async () => {
    productsResolving([product({ _id: 'p1' as never })]);
    const result = await buildOrderItemsFromGuestItems([
      guestItem('p1', 1),
      guestItem('deleted-id', 1),
    ]);

    expect(result).toEqual({
      ok: false,
      status: 409,
      message: 'One or more cart items are no longer available',
    });
  });

  it('builds a line per requested item, carrying the requested quantity', async () => {
    productsResolving([
      product({ _id: 'p1' as never, name: 'Ribeye' }),
      product({ _id: 'p2' as never, name: 'Bacon' }),
    ]);
    const result = await buildOrderItemsFromGuestItems([
      guestItem('p1', 2),
      guestItem('p2', 1),
    ]);

    if (!result.ok) throw new Error('expected ok');
    expect(result.orderItems.map((i) => [i.name, i.qty])).toEqual([
      ['Ribeye', 2],
      ['Bacon', 1],
    ]);
  });

  it('reports a stock shortfall without refusing the build', async () => {
    productsResolving([
      product({ _id: 'p1' as never, name: 'Ribeye', stockCount: 2 }),
    ]);
    const result = await buildOrderItemsFromGuestItems([guestItem('p1', 5)]);

    if (!result.ok) throw new Error('expected ok');
    expect(result.stockErrors).toEqual([
      'Ribeye: only 2 in stock (5 requested)',
    ]);
    expect(result.orderItems).toHaveLength(1);
  });

  // The projection is shared with the cart path precisely so the two cannot
  // drift: one missing `pricingType` and `unitPrice` silently falls back to the
  // legacy branch, snapshotting the per-pound RATE as the unit price — the
  // pre-Phase-3 over-charge, reintroduced through the projection instead of
  // through the arithmetic.
  it('fetches every pricing field the line snapshot reads', async () => {
    productsResolving([product({ _id: 'p1' as never })]);
    await buildOrderItemsFromGuestItems([guestItem('p1', 1)]);

    const projection = mocks.productFind.mock.calls[0][1] as string;
    for (const field of [
      'pricingType',
      'pricePerLb',
      'packagePrice',
      'unitPrice',
      'bundlePrice',
      'estimatedWeightLb',
      'averageWeightLb',
      'includedItems',
      'stockCount',
    ]) {
      expect(projection).toContain(field);
    }
  });

  it('asks for exactly the requested ids', async () => {
    productsResolving([product({ _id: 'p1' as never })]);
    await buildOrderItemsFromGuestItems([guestItem('p1', 1)]);

    expect(mocks.productFind.mock.calls[0][0]).toEqual({
      _id: { $in: ['p1'] },
    });
  });
});

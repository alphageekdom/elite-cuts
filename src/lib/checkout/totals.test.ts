import { describe, expect, it } from 'vitest';

import {
  computeTotals,
  DELIVERY_FEE,
  MEMBER_DISCOUNT_RATE,
  TAX_RATE,
  fmtPrice,
} from './totals';
import { computeOrderTotals, computeSubtotal, computeMemberDiscount } from '../orders/builder';

// The client-side twin of the server's order maths: this is what the cart and
// checkout summaries show, while `orders/builder.ts` decides what Stripe
// charges. Neither had tests. The last group below is the one that matters —
// if the two disagree, the customer is shown one number and charged another.

const line = (price: number, quantity = 1) => ({ price, quantity });

describe('computeTotals — discount stack', () => {
  it('charges tax on the plain subtotal for a signed-out shopper', () => {
    const t = computeTotals([line(100)]);
    expect(t.subtotal).toBe(100);
    expect(t.memberDiscount).toBe(0);
    expect(t.tax).toBeCloseTo(10, 2);
    expect(t.total).toBeCloseTo(110, 2);
  });

  it('applies the member discount before tax', () => {
    const t = computeTotals([line(100)], { isLoggedIn: true });
    expect(t.memberDiscount).toBeCloseTo(5, 2);
    // Tax lands on 95, not 100.
    expect(t.tax).toBeCloseTo(9.5, 2);
    expect(t.total).toBeCloseTo(104.5, 2);
  });

  it('suppresses the member discount for a promo that excludes it', () => {
    const t = computeTotals([line(100)], {
      isLoggedIn: true,
      excludesMember: true,
      promoDiscount: 20,
    });
    expect(t.memberDiscount).toBe(0);
    expect(t.tax).toBeCloseTo(8, 2);
    expect(t.total).toBeCloseTo(88, 2);
  });

  it('stacks member, promo and points in that order', () => {
    const t = computeTotals([line(100)], {
      isLoggedIn: true,
      promoDiscount: 10,
      pointsDiscount: 5,
    });
    // 100 − 5 member − 10 promo − 5 points = 80
    expect(t.tax).toBeCloseTo(8, 2);
    expect(t.total).toBeCloseTo(88, 2);
  });

  it('floors at zero when discounts exceed the subtotal', () => {
    const t = computeTotals([line(20)], { promoDiscount: 100 });
    expect(t.tax).toBe(0);
    expect(t.total).toBe(0);
  });

  it('sums multiple lines by quantity', () => {
    const t = computeTotals([line(10, 3), line(5, 2)]);
    expect(t.subtotal).toBe(40);
  });

  it('is zero for an empty cart', () => {
    expect(computeTotals([])).toMatchObject({ subtotal: 0, tax: 0, total: 0 });
  });
});

describe('computeTotals — delivery fee', () => {
  it('adds the fee after discounts and taxes it', () => {
    const t = computeTotals([line(100)], { deliveryFee: DELIVERY_FEE });
    expect(t.delivery).toBe(DELIVERY_FEE);
    // Tax on (100 + 8), not on 100.
    expect(t.tax).toBeCloseTo((100 + DELIVERY_FEE) * TAX_RATE, 2);
    expect(t.total).toBeCloseTo(100 + DELIVERY_FEE + t.tax, 2);
  });

  it('still charges the fee when discounts wipe the subtotal out', () => {
    const t = computeTotals([line(20)], {
      promoDiscount: 100,
      deliveryFee: DELIVERY_FEE,
    });
    expect(t.total).toBeCloseTo(DELIVERY_FEE * (1 + TAX_RATE), 2);
  });
});

// The client shows these numbers; the server charges its own. They are
// separate implementations by design (one is pure display, one is the record
// of truth), which is exactly why they need pinning against each other.
describe('client display agrees with what the server charges', () => {
  const cases = [
    { label: 'guest, no discounts', isLoggedIn: false, promo: 0, points: 0, fee: 0 },
    { label: 'member', isLoggedIn: true, promo: 0, points: 0, fee: 0 },
    { label: 'member with promo', isLoggedIn: true, promo: 12.5, points: 0, fee: 0 },
    { label: 'member with points', isLoggedIn: true, promo: 0, points: 7, fee: 0 },
    { label: 'member, delivery', isLoggedIn: true, promo: 0, points: 0, fee: DELIVERY_FEE },
    { label: 'everything at once', isLoggedIn: true, promo: 9, points: 4, fee: DELIVERY_FEE },
  ];

  for (const c of cases) {
    it(`matches on: ${c.label}`, () => {
      const items = [line(24.99, 2), line(8.99, 1)];
      const client = computeTotals(items, {
        isLoggedIn: c.isLoggedIn,
        promoDiscount: c.promo,
        pointsDiscount: c.points,
        deliveryFee: c.fee,
      });

      const subtotal = computeSubtotal(
        items.map((i) => ({ price: i.price, qty: i.quantity })) as never,
      );
      const server = computeOrderTotals({
        subtotal,
        memberDiscount: computeMemberDiscount(subtotal, c.isLoggedIn),
        promoDiscount: c.promo,
        pointsDiscount: c.points,
        fulfillmentType: c.fee > 0 ? 'delivery' : 'pickup',
      });

      // Cent tolerance: the server rounds each step, the client leaves the
      // display value unrounded until it is formatted.
      expect(client.total).toBeCloseTo(server.totalCost, 2);
      expect(client.tax).toBeCloseTo(server.tax, 2);
    });
  }
});

describe('fmtPrice', () => {
  it('always shows two decimals', () => {
    expect(fmtPrice(5)).toBe('5.00');
    expect(fmtPrice(5.1)).toBe('5.10');
    expect(fmtPrice(5.125)).toBe('5.13');
  });

  it('groups thousands', () => {
    expect(fmtPrice(1234.5)).toBe('1,234.50');
  });
});

describe('rate constants', () => {
  it('holds the member rate the copy quotes', () => {
    // Cart, drawer and checkout all derive their "(5%)" label from this.
    expect(MEMBER_DISCOUNT_RATE).toBeCloseTo(0.05, 5);
  });
});

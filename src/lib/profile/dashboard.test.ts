import { describe, expect, it } from 'vitest';

import {
  buildHabits,
  findActiveOrder,
  isActiveOrder,
  tallyRepeatCuts,
} from './dashboard';
import type { OrderStatus } from '@/models/Order';

type TestItem = {
  product: string;
  name: string;
  qty: number;
  refunded: boolean;
  price: number;
};

const order = (
  overrides: {
    orderStatus?: OrderStatus;
    createdAt?: string;
    totalCost?: number;
    subtotal?: number;
    tax?: number;
    orderItems?: TestItem[];
  } = {},
) => {
  const totalCost = overrides.totalCost ?? 0;
  return {
    orderStatus: overrides.orderStatus ?? ('Completed' as OrderStatus),
    createdAt: overrides.createdAt ?? '2026-07-01T12:00:00.000Z',
    totalCost,
    // Refund maths needs the pre-tax split. Defaulting subtotal to the total
    // with no tax keeps every existing case's arithmetic unchanged.
    subtotal: overrides.subtotal ?? totalCost,
    tax: overrides.tax ?? 0,
    orderItems: overrides.orderItems ?? [],
  };
};

const item = (product: string, qty = 1, refunded = false): TestItem => ({
  product,
  name: product,
  price: 0,
  qty,
  refunded,
});

describe('isActiveOrder', () => {
  it('treats everything before collection or cancellation as in flight', () => {
    expect(isActiveOrder('Order Placed')).toBe(true);
    expect(isActiveOrder('Preparing')).toBe(true);
    expect(isActiveOrder('Ready for Pickup')).toBe(true);
    // A delivery order mid-run is just as live to the person waiting as a
    // pickup order sitting on the shelf.
    expect(isActiveOrder('Out for Delivery')).toBe(true);
  });

  it('treats collected and cancelled orders as closed', () => {
    expect(isActiveOrder('Completed')).toBe(false);
    expect(isActiveOrder('Cancelled')).toBe(false);
  });
});

describe('findActiveOrder', () => {
  it('returns null when every order is closed', () => {
    expect(
      findActiveOrder([
        order({ orderStatus: 'Completed' }),
        order({ orderStatus: 'Cancelled' }),
      ]),
    ).toBeNull();
  });

  it('picks the newest in-flight order, not the newest order', () => {
    const active = order({ orderStatus: 'Preparing', createdAt: '2026-07-02T00:00:00.000Z' });
    const found = findActiveOrder([
      order({ orderStatus: 'Cancelled', createdAt: '2026-07-03T00:00:00.000Z' }),
      active,
      order({ orderStatus: 'Completed', createdAt: '2026-07-01T00:00:00.000Z' }),
    ]);
    expect(found).toBe(active);
  });
});

describe('tallyRepeatCuts', () => {
  it('counts orders containing a cut, not units bought', () => {
    // Six packs in one order is one order, not six — "6×" beside a repeat
    // prompt would read as "you've ordered this six times".
    const [top] = tallyRepeatCuts([order({ orderItems: [item('mince', 6)] })]);
    expect(top?.times).toBe(1);
  });

  it('counts a cut once per order even across several lines', () => {
    const [top] = tallyRepeatCuts([
      order({ orderItems: [item('ribeye'), item('ribeye')] }),
    ]);
    expect(top?.times).toBe(1);
  });

  it('ranks by how many orders contained the cut', () => {
    const tallies = tallyRepeatCuts([
      order({ orderItems: [item('ribeye'), item('mince')] }),
      order({ orderItems: [item('mince')] }),
      order({ orderItems: [item('mince')] }),
    ]);
    expect(tallies[0]?.productId).toBe('mince');
    expect(tallies[0]?.times).toBe(3);
    expect(tallies[1]?.productId).toBe('ribeye');
  });

  it('skips cancelled orders and refunded lines', () => {
    const tallies = tallyRepeatCuts([
      order({ orderStatus: 'Cancelled', orderItems: [item('ribeye')] }),
      order({ orderItems: [item('mince', 1, true)] }),
    ]);
    expect(tallies).toEqual([]);
  });

  it('only looks back over the given number of orders', () => {
    const orders = Array.from({ length: 8 }, (_, i) =>
      order({ orderItems: [item(`cut-${i}`)] }),
    );
    expect(tallyRepeatCuts(orders, { lookback: 3 })).toHaveLength(3);
  });
});

describe('buildHabits', () => {
  const now = new Date('2026-07-28T12:00:00.000Z');
  const TZ = 'America/Los_Angeles (PT)';

  it('returns nothing to show for a customer with no kept orders', () => {
    expect(buildHabits([], TZ, now)).toEqual([]);
    expect(
      buildHabits([order({ orderStatus: 'Cancelled', totalCost: 50 })], TZ, now),
    ).toEqual([]);
  });

  it('counts only orders placed in the current year', () => {
    const habits = buildHabits(
      [
        order({ createdAt: '2026-02-01T00:00:00.000Z', totalCost: 10 }),
        order({ createdAt: '2025-12-31T00:00:00.000Z', totalCost: 10 }),
      ],
      TZ,
      now,
    );
    expect(habits.find((h) => h.label === 'Orders this year')?.value).toBe('1');
  });

  it('reckons "this year" on the shop clock, not the runtime', () => {
    // 2027-01-01T04:00Z is still 8pm on Dec 31 in Pacific. The server has
    // rolled over; the counter has not. Reading either side with
    // `getFullYear` on a UTC runtime made both the boundary and the order
    // land in 2027, so the stat counted an order the shop would still call
    // "this year" — then reset to zero for the eight hours before Pacific
    // midnight.
    const newYearUtc = new Date('2027-01-01T04:00:00.000Z');
    const habits = buildHabits(
      [
        order({ createdAt: '2026-12-31T20:00:00.000Z', totalCost: 10 }),
        order({ createdAt: '2026-06-01T12:00:00.000Z', totalCost: 10 }),
      ],
      TZ,
      newYearUtc,
    );
    // Both orders are 2026 at the shop, and so is "now" — so both count.
    expect(habits.find((h) => h.label === 'Orders this year')?.value).toBe('2');
  });

  it('falls back to the runtime year when the zone is unrecognised', () => {
    const habits = buildHabits(
      [order({ createdAt: '2026-02-01T00:00:00.000Z', totalCost: 10 })],
      'Not/AZone',
      now,
    );
    // Degrade rather than throw — the same contract shopWeekdayIndex carries.
    expect(habits.find((h) => h.label === 'Orders this year')?.value).toBe('1');
  });

  it('excludes cancelled orders from lifetime spend', () => {
    const habits = buildHabits(
      [
        order({ totalCost: 100.5 }),
        order({ orderStatus: 'Cancelled', totalCost: 999 }),
      ],
      TZ,
      now,
    );
    expect(habits.find((h) => h.label === 'Spent all time')?.value).toBe(
      '$100.50',
    );
  });

  it('nets refunds off the spend figure', () => {
    // A £40 order with one of its two £20 lines refunded is £20 spent, not
    // £40. `totalCost` never moves when a line goes back, so summing it alone
    // counted money that had been returned — while "Most ordered" right
    // beside it already skipped refunded lines.
    const habits = buildHabits(
      [
        order({
          totalCost: 40,
          subtotal: 40,
          orderItems: [
            { ...item('ribeye', 1, true), price: 20 },
            { ...item('brisket', 1, false), price: 20 },
          ],
        }),
      ],
      TZ,
      now,
    );
    expect(habits.find((h) => h.label === 'Spent all time')?.value).toBe(
      '$20.00',
    );
  });

  it('never reports a negative spend when a whole order is refunded', () => {
    const habits = buildHabits(
      [
        order({
          totalCost: 30,
          subtotal: 30,
          orderItems: [{ ...item('ribeye', 1, true), price: 30 }],
        }),
      ],
      TZ,
      now,
    );
    expect(habits.find((h) => h.label === 'Spent all time')?.value).toBe(
      '$0.00',
    );
  });

  it('picks most-ordered by units, so a bulk buy outranks a repeat buy', () => {
    const habits = buildHabits(
      [
        order({ orderItems: [item('mince', 6)] }),
        order({ orderItems: [item('ribeye', 1)] }),
        order({ orderItems: [item('ribeye', 1)] }),
      ],
      TZ,
      now,
    );
    expect(habits.find((h) => h.label === 'Most ordered')?.value).toBe('mince');
  });

  it('omits most-ordered rather than showing a blank when every line was refunded', () => {
    const habits = buildHabits(
      [order({ totalCost: 20, orderItems: [item('mince', 2, true)] })],
      TZ,
      now,
    );
    expect(habits.some((h) => h.label === 'Most ordered')).toBe(false);
  });

  // The design's fourth stat. Older orders store a prose slot label and newer
  // ones a datetime, so no weekday is recoverable across mixed history.
  it('never emits a usual-pickup stat', () => {
    const habits = buildHabits([order({ totalCost: 10 })], TZ, now);
    expect(habits.some((h) => /pickup/i.test(h.label))).toBe(false);
  });
});

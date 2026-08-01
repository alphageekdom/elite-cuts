import { describe, it, expect } from 'vitest';
import {
  isDatedSlot,
  slotRangeForDay,
  formatSlotLabel,
  formatCountdown,
  stageForStatus,
  summariseCuts,
  buildCutListRows,
  summariseCutList,
  slotWallClockMs,
  type CutListOrder,
} from './cut-list';
import { shopWallClockMs } from '@/lib/shop-settings/pickup-format';

// Countdowns compare two WALL clocks, never two instants — `pickupSlot` is
// zone-less shop-local time, so measuring it against a real instant only
// worked while the server ran in the shop's own zone. These fixtures are on
// the wall scale for that reason; `Date.UTC` here is a scale, not a claim
// about UTC.
const NOW = Date.UTC(2026, 6, 28, 14, 14);

function order(over: Partial<CutListOrder> = {}): CutListOrder {
  return {
    id: 'a1',
    orderRef: '#EC-5D64',
    customerName: 'Murphy Monahan',
    isGuest: false,
    isDemo: false,
    pickupSlot: '2026-07-28T16:00',
    orderStatus: 'Preparing',
    items: [{ name: 'Lamb Loin Chops', qty: 1 }],
    ...over,
  };
}

describe('isDatedSlot', () => {
  it('accepts the datetime the checkout picker writes', () => {
    expect(isDatedSlot('2026-07-28T16:00')).toBe(true);
  });

  // The whole reason the board can't show every order: 103 of 105 slotted
  // orders in the dev database store prose like this, and `new Date()` on it
  // yields Invalid Date.
  it.each([
    '11:00 AM – 11:30 AM',
    'e.g. Sat 10am–12pm',
    '',
  ])('rejects prose slot %j', (slot) => {
    expect(isDatedSlot(slot)).toBe(false);
  });

  it('rejects a missing slot', () => {
    expect(isDatedSlot(undefined)).toBe(false);
    expect(isDatedSlot(null)).toBe(false);
  });
});

describe('formatSlotLabel', () => {
  it.each([
    ['2026-07-28T16:00', '4:00p'],
    ['2026-07-28T09:30', '9:30a'],
    ['2026-07-28T12:00', '12:00p'],
    ['2026-07-28T00:00', '12:00a'],
  ])('%s → %s', (slot, expected) => {
    expect(formatSlotLabel(slot)).toBe(expected);
  });
});

describe('formatCountdown', () => {
  it('reads forward in minutes under the hour', () => {
    expect(formatCountdown('2026-07-28T15:00', NOW)).toBe('in 46 min');
  });

  it('reads forward in hours and minutes past the hour', () => {
    expect(formatCountdown('2026-07-28T15:30', NOW)).toBe('in 1h 16m');
  });

  it('reads backward once the slot has passed', () => {
    expect(formatCountdown('2026-07-28T13:00', NOW)).toBe('1h 14m ago');
  });

  // A server-rendered countdown ticking through zero would be stale the
  // instant it printed, so the crossing is deliberately blunted.
  it.each(['2026-07-28T14:16', '2026-07-28T14:12'])('reads "now" near the slot (%s)', (slot) => {
    expect(formatCountdown(slot, NOW)).toBe('now');
  });

  // Seen on the board as "8h 60m ago": rounding the sub-hour remainder on its
  // own reaches 60 while the hour count stays behind. 8h 59m 42s apart, so the
  // remainder is 59.7 minutes.
  it('never prints 60 minutes', () => {
    expect(
      formatCountdown('2026-07-28T05:15', Date.UTC(2026, 6, 28, 14, 14, 42)),
    ).toBe('9h ago');
  });

  it('drops a bare zero-minute remainder', () => {
    expect(formatCountdown('2026-07-28T12:14', NOW)).toBe('2h ago');
  });
});

describe('stageForStatus', () => {
  it.each([
    ['Order Placed', 'waiting'],
    ['Preparing', 'preparing'],
    ['Ready for Pickup', 'ready'],
    ['Out for Delivery', 'ready'],
    ['Completed', 'done'],
    ['Cancelled', 'done'],
  ] as const)('%s → %s', (status, stage) => {
    expect(stageForStatus(status)).toBe(stage);
  });
});

describe('summariseCuts', () => {
  it('joins each line with its quantity', () => {
    expect(summariseCuts([
      { name: 'Lamb Loin Chops', qty: 1 },
      { name: 'Country Pâté', qty: 2 },
    ])).toBe('Lamb Loin Chops × 1 · Country Pâté × 2');
  });

  it('falls back rather than rendering an empty cell', () => {
    expect(summariseCuts([])).toBe('—');
  });
});

describe('buildCutListRows', () => {
  it('sorts by slot regardless of input order', () => {
    const rows = buildCutListRows([
      order({ id: 'late', pickupSlot: '2026-07-28T17:00' }),
      order({ id: 'early', pickupSlot: '2026-07-28T09:00' }),
      order({ id: 'mid', pickupSlot: '2026-07-28T13:00' }),
    ], NOW);
    expect(rows.map((r) => r.id)).toEqual(['early', 'mid', 'late']);
  });

  it('drops prose-slotted orders instead of dating them wrongly', () => {
    const rows = buildCutListRows([
      order({ id: 'prose', pickupSlot: '11:00 AM – 11:30 AM' }),
      order({ id: 'dated' }),
    ], NOW);
    expect(rows.map((r) => r.id)).toEqual(['dated']);
  });

  it('drops cancelled orders — nothing is cut for them', () => {
    const rows = buildCutListRows([order({ orderStatus: 'Cancelled' })], NOW);
    expect(rows).toEqual([]);
  });

  it('keeps completed orders so the day reads whole', () => {
    const rows = buildCutListRows([order({ orderStatus: 'Completed' })], NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0].stage).toBe('done');
  });

  it('flags an unfulfilled order whose slot has passed', () => {
    const [row] = buildCutListRows([order({ pickupSlot: '2026-07-28T10:00' })], NOW);
    expect(row.overdue).toBe(true);
  });

  // A collected order is never late, however long ago its slot was.
  it('does not flag a collected order as overdue', () => {
    const [row] = buildCutListRows(
      [order({ pickupSlot: '2026-07-28T10:00', orderStatus: 'Completed' })],
      NOW,
    );
    expect(row.overdue).toBe(false);
  });
});

describe('summariseCutList', () => {
  const rows = buildCutListRows([
    order({ id: '1', pickupSlot: '2026-07-28T09:00', orderStatus: 'Completed' }),
    order({ id: '2', pickupSlot: '2026-07-28T15:00', orderStatus: 'Order Placed' }),
    order({ id: '3', pickupSlot: '2026-07-28T16:00', orderStatus: 'Preparing' }),
    order({ id: '4', pickupSlot: '2026-07-28T17:00', orderStatus: 'Ready for Pickup' }),
  ], NOW);

  it('counts each stage', () => {
    expect(summariseCutList(rows)).toMatchObject({
      total: 4,
      outstanding: 2,
      readyForPickup: 1,
      done: 1,
    });
  });

  it('points at the next slot still to be handed over', () => {
    expect(summariseCutList(rows).nextSlotLabel).toBe('3:00p');
  });

  it('has no next slot once the day is clear', () => {
    const done = buildCutListRows([order({ orderStatus: 'Completed' })], NOW);
    expect(summariseCutList(done).nextSlotLabel).toBeNull();
  });

  // Caught in the browser at 9:55pm: the card read "Next window at 1:00p" for
  // a window that had closed nine hours earlier, because the first unfulfilled
  // row was taken regardless of whether its slot had passed.
  it('never calls a window that has already closed the next one', () => {
    const late = buildCutListRows([
      order({ id: 'late', pickupSlot: '2026-07-28T13:00', orderStatus: 'Order Placed' }),
    ], NOW);
    expect(late[0].overdue).toBe(true);
    expect(summariseCutList(late)).toMatchObject({ overdue: 1, nextSlotLabel: null });
  });

  it('skips past an overdue row to the next window still ahead', () => {
    const mixed = buildCutListRows([
      order({ id: 'late', pickupSlot: '2026-07-28T13:00', orderStatus: 'Order Placed' }),
      order({ id: 'soon', pickupSlot: '2026-07-28T17:00', orderStatus: 'Order Placed' }),
    ], NOW);
    expect(summariseCutList(mixed)).toMatchObject({ overdue: 1, nextSlotLabel: '5:00p' });
  });

  it('reports an empty board rather than throwing', () => {
    expect(summariseCutList([])).toEqual({
      total: 0, outstanding: 0, readyForPickup: 0, done: 0, overdue: 0, nextSlotLabel: null,
    });
  });
});

describe('slotRangeForDay', () => {
  it('bounds the day in the same shape the slots are stored in', () => {
    expect(slotRangeForDay('2026-07-29')).toEqual({
      start: '2026-07-29T00:00',
      end: '2026-07-30T00:00',
    });
  });

  it('rolls over a month end', () => {
    expect(slotRangeForDay('2026-07-31').end).toBe('2026-08-01T00:00');
  });

  it('rolls over a year end', () => {
    expect(slotRangeForDay('2026-12-31').end).toBe('2027-01-01T00:00');
  });

  it('handles a leap day', () => {
    expect(slotRangeForDay('2028-02-28').end).toBe('2028-02-29T00:00');
    expect(slotRangeForDay('2028-02-29').end).toBe('2028-03-01T00:00');
  });

  // The bounds are compared by Mongo as strings, so this is the property that
  // actually matters: every wall-time slot on the day sorts inside them, and
  // the neighbouring days' slots sort outside.
  it('brackets exactly the slots belonging to that day', () => {
    const { start, end } = slotRangeForDay('2026-07-29');
    const inside = ['2026-07-29T00:00', '2026-07-29T09:30', '2026-07-29T23:59'];
    const outside = ['2026-07-28T23:59', '2026-07-30T00:00', '2026-07-30T09:00'];
    for (const slot of inside) {
      expect(slot >= start && slot < end).toBe(true);
    }
    for (const slot of outside) {
      expect(slot >= start && slot < end).toBe(false);
    }
  });

  // The bug this replaced: bounds built with `Date#toISOString()` carry a
  // UTC offset and a `Z`, and comparing those against zone-less wall time
  // silently shifts which day the board shows.
  it('does not emit UTC-shaped bounds', () => {
    const { start, end } = slotRangeForDay('2026-07-29');
    expect(start).not.toMatch(/Z$/);
    expect(end).not.toMatch(/Z$/);
  });
});

describe('readyForPickup vs the ready stage', () => {
  // The action card reading this says "wrapped and waiting on the shelf". An
  // Out for Delivery order has left the shop, so counting it there told the
  // counter to expect a collection that was already in a van — even though
  // both statuses share the `ready` stage for row treatment.
  it('counts only orders actually waiting on the shelf', () => {
    const rows = buildCutListRows([
      order({ id: 'shelf', pickupSlot: '2026-07-28T15:00', orderStatus: 'Ready for Pickup' }),
      order({ id: 'van', pickupSlot: '2026-07-28T16:00', orderStatus: 'Out for Delivery' }),
    ], NOW);
    expect(rows.map((r) => r.stage)).toEqual(['ready', 'ready']);
    expect(summariseCutList(rows).readyForPickup).toBe(1);
  });
});

// The bug these pin: `formatCountdown` used to parse the zone-less slot with
// `new Date()`, reading it in the SERVER's zone, and compare it against a real
// instant. On a UTC runtime serving a Pacific shop that made every slot resolve
// seven hours early, so from mid-morning the whole board read as overdue and
// the "next window" line disappeared. The old tests could not catch it: both
// sides were local-parsed, so they stayed self-consistent in any TZ.
describe('countdowns are measured on the shop clock, not the server clock', () => {
  const PT = 'America/Los_Angeles (PT)';
  // 2026-07-28 19:00Z === 12:00 noon at a Pacific shop (PDT, UTC-7).
  const instant = new Date('2026-07-28T19:00:00Z');

  it('reads a 4pm slot as four hours out when it is noon at the shop', () => {
    expect(formatCountdown('2026-07-28T16:00', shopWallClockMs(PT, instant))).toBe(
      'in 4h',
    );
  });

  it('does not call an afternoon slot overdue while the shop is still at noon', () => {
    const [row] = buildCutListRows(
      [order({ pickupSlot: '2026-07-28T16:00' })],
      shopWallClockMs(PT, instant),
    );
    expect(row.overdue).toBe(false);
  });

  it('keeps the next-window label rather than dropping it', () => {
    const rows = buildCutListRows(
      [order({ pickupSlot: '2026-07-28T16:00' })],
      shopWallClockMs(PT, instant),
    );
    expect(summariseCutList(rows).nextSlotLabel).toBe('4:00p');
  });

  it('still reads a morning slot as past', () => {
    const [row] = buildCutListRows(
      [order({ pickupSlot: '2026-07-28T09:00' })],
      shopWallClockMs(PT, instant),
    );
    expect(row.overdue).toBe(true);
    expect(row.countdown).toBe('3h ago');
  });
});

describe('slotWallClockMs', () => {
  it('reads a slot as wall time, independent of the runtime zone', () => {
    expect(slotWallClockMs('2026-07-28T16:00')).toBe(Date.UTC(2026, 6, 28, 16, 0));
  });

  it('returns NaN for an undated slot so callers can fall back', () => {
    expect(Number.isNaN(slotWallClockMs('Sat 10am–12pm'))).toBe(true);
  });
});

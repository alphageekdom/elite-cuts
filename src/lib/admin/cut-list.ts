// Today's cut list — the dashboard's operational board.
//
// Pure by design, same contract as the pickup-slot helpers it sits beside: the
// caller supplies `now`, so the server page reads the clock once and the
// component renders what it is handed. Deriving the countdown in the component
// would hydrate differently from how it server-rendered.
//
// WHAT THIS CAN AND CANNOT SEE. `pickupSlot` is only a parseable datetime on
// orders written since the checkout redesign (`2026-07-28T16:00`). Older rows —
// and every order the admin walk-in drawer creates — store prose like
// "11:00 AM – 11:30 AM", which carries no date and so cannot be placed on a
// day at all. 103 of the 105 slotted orders in the dev database are prose.
// Their absence from the board is correct rather than a bug, but the board
// must never imply it is showing every order due today, hence the footnote
// the card renders. See `context/deferred-findings.md`.

import type { ORDER_STATUSES } from '@/lib/orders/constants';

/**
 * Declared structurally off the constant rather than imported from the model,
 * so this module stays out of the Mongoose bundle — same split the messages
 * and promos domains use for their client-safe enums.
 */
type OrderStatus = (typeof ORDER_STATUSES)[number];

/** The stage an order is at, as far as the cut list is concerned. */
export type CutListStage = 'waiting' | 'preparing' | 'ready' | 'done';

export type CutListOrder = {
  id: string;
  orderRef: string;
  customerName: string;
  /** Guests have no account; the board says so rather than inventing a name. */
  isGuest: boolean;
  isDemo: boolean;
  pickupSlot: string;
  orderStatus: OrderStatus;
  items: { name: string; qty: number }[];
  orderNotes?: string;
};

export type CutListRow = CutListOrder & {
  /** "3:00p" */
  slotLabel: string;
  /** "in 46 min" / "in 1h 16m" / "now" / "46 min ago" */
  countdown: string;
  /** True once the slot has passed and the order is not yet collected. */
  overdue: boolean;
  /** "Lamb Loin Chops × 1 · Country Pâté × 2" */
  cuts: string;
  stage: CutListStage;
};

/**
 * A `pickupSlot` the board can place on a clock. Anything else is prose from
 * before the checkout redesign (or from the admin walk-in drawer) and is
 * skipped rather than coerced — `new Date('11:00 AM – 11:30 AM')` is
 * `Invalid Date`, which is how three other consumers previously rendered
 * "Invalid Date" to customers.
 */
export function isDatedSlot(slot: string | undefined | null): slot is string {
  return typeof slot === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(slot);
}

/**
 * The `[start, end)` bounds of one shop day, for a range query over
 * `pickupSlot`.
 *
 * Both ends are wall-time strings in the same shape the slots themselves are
 * stored in, because that is what Mongo compares them against — lexicographic
 * string ordering, not dates. Passing `Date#toISOString()` here instead (as
 * this did, and as the schedule page still did) bounds a zone-less wall clock
 * with a UTC instant, and the two only agree while the server happens to run
 * in the shop's own zone.
 *
 * Takes the day as `YYYY-MM-DD` from `shopDateKey` rather than reading a clock
 * itself, so it stays pure and testable.
 */
export function slotRangeForDay(dateKey: string): { start: string; end: string } {
  const [year, month, day] = dateKey.split('-').map(Number);
  // UTC arithmetic purely to roll the calendar over month and year ends; the
  // result is read back as a plain date, never as an instant.
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return { start: `${dateKey}T00:00`, end: `${next.toISOString().slice(0, 10)}T00:00` };
}

/** "2026-07-28T16:00" → "4:00p". Matches the pickup picker's own shorthand. */
export function formatSlotLabel(slot: string): string {
  const [, time = ''] = slot.split('T');
  const [hourStr = '', minute = '00'] = time.split(':');
  const hour = Number(hourStr);
  if (!Number.isFinite(hour)) return slot;
  const suffix = hour >= 12 ? 'p' : 'a';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${minute}${suffix}`;
}

const MINUTE_MS = 60_000;

/**
 * Time until (or since) the slot, in the shop's own wall-clock terms.
 *
 * `pickupSlot` has no timezone by design — it is shop-local wall time — so it
 * is compared against the server's clock the same way `buildPickupDays` does.
 * Inside five minutes either side it reads "now", because a countdown ticking
 * through zero on a server-rendered page would be stale the moment it printed.
 */
export function formatCountdown(slot: string, now: Date): string {
  const target = new Date(slot).getTime();
  if (!Number.isFinite(target)) return '';
  const delta = target - now.getTime();
  const abs = Math.abs(delta);

  if (abs < 5 * MINUTE_MS) return 'now';

  // Round to whole minutes FIRST, then split. Rounding the remainder
  // separately (`Math.round((abs % HOUR_MS) / MINUTE_MS)`) rolls 59.7 minutes
  // up to 60 while the hour count stays put, which printed "8h 60m ago" on the
  // board.
  const totalMinutes = Math.round(abs / MINUTE_MS);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const span =
    hours > 0 ? (minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`) : `${minutes} min`;

  return delta > 0 ? `in ${span}` : `${span} ago`;
}

/**
 * Which of the four board stages a real order status maps to.
 *
 * The design invented Queued / Cutting / Wrapped / Collected. These are the
 * actual statuses grouped into the shape the board needs — no new vocabulary
 * is shown to the admin, only a grouping used for row tint and ordering.
 */
export function stageForStatus(status: OrderStatus): CutListStage {
  switch (status) {
    case 'Order Placed':
      return 'waiting';
    case 'Preparing':
      return 'preparing';
    case 'Ready for Pickup':
    case 'Out for Delivery':
      return 'ready';
    default:
      return 'done';
  }
}

/** "Lamb Loin Chops × 1 · Country Pâté × 2" */
export function summariseCuts(items: { name: string; qty: number }[]): string {
  if (items.length === 0) return '—';
  return items.map((i) => `${i.name} × ${i.qty}`).join(' · ');
}

/**
 * Build the board, earliest slot first.
 *
 * Cancelled orders are dropped: nothing is cut for them, so they are noise on
 * a work board. Completed ones stay — an order collected at 10am is part of
 * today's story and the card's "done" count reads from them.
 */
export function buildCutListRows(orders: CutListOrder[], now: Date): CutListRow[] {
  return orders
    .filter((o) => o.orderStatus !== 'Cancelled' && isDatedSlot(o.pickupSlot))
    .map((o) => {
      const stage = stageForStatus(o.orderStatus);
      return {
        ...o,
        slotLabel: formatSlotLabel(o.pickupSlot),
        countdown: formatCountdown(o.pickupSlot, now),
        overdue: stage !== 'done' && new Date(o.pickupSlot).getTime() < now.getTime(),
        cuts: summariseCuts(o.items),
        stage,
      };
    })
    .sort((a, b) => a.pickupSlot.localeCompare(b.pickupSlot));
}

export type CutListSummary = {
  total: number;
  /** Not yet cut — the number that actually needs a butcher's attention. */
  outstanding: number;
  /**
   * Strictly `Ready for Pickup`, not the whole `ready` stage. The stage also
   * holds `Out for Delivery`, which has left the shop — counting those as
   * waiting on the shelf told the counter to expect collections that were
   * already in a van.
   */
  readyForPickup: number;
  done: number;
  /** Unfulfilled orders whose pickup window has already closed. */
  overdue: number;
  /**
   * The next window still ahead of us, or null when there isn't one — either
   * the day is clear or everything left is already late.
   *
   * Deliberately skips overdue rows. Reading the first unfulfilled row
   * regardless of time labelled a window that closed nine hours ago as
   * "next", which is how this was caught in the browser.
   */
  nextSlotLabel: string | null;
};

export function summariseCutList(rows: CutListRow[]): CutListSummary {
  const next = rows.find((r) => r.stage !== 'done' && !r.overdue);
  return {
    total: rows.length,
    outstanding: rows.filter((r) => r.stage === 'waiting' || r.stage === 'preparing').length,
    readyForPickup: rows.filter((r) => r.orderStatus === 'Ready for Pickup').length,
    done: rows.filter((r) => r.stage === 'done').length,
    overdue: rows.filter((r) => r.overdue).length,
    nextSlotLabel: next ? next.slotLabel : null,
  };
}

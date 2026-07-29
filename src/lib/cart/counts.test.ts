import { describe, expect, it } from 'vitest';

import {
  countCartCuts,
  countCartItems,
  countOrderCuts,
  countOrderItems,
  formatCartCount,
  formatOrderCount,
  type CountableCartLine,
  type CountableOrderLine,
} from './counts';

const line = (
  quantity: number,
  includedItems?: string[],
): CountableCartLine => ({ quantity, product: { includedItems } });

const orderLine = (
  qty: number,
  includedItems?: string[],
): CountableOrderLine => ({ qty, includedItems });

describe('countCartCuts', () => {
  it('counts a plain cut as one piece', () => {
    expect(countCartCuts([line(1)])).toBe(1);
  });

  it('multiplies by quantity', () => {
    expect(countCartCuts([line(3)])).toBe(3);
  });

  it('counts a bundle by its contents, not as one item', () => {
    // The regression this module exists for: the drawer header showed
    // `cartItems.length`, so this cart read as "1 cut".
    expect(countCartCuts([line(1, ['a', 'b', 'c', 'd', 'e'])])).toBe(5);
  });

  it('multiplies bundle contents by quantity', () => {
    expect(countCartCuts([line(2, ['a', 'b', 'c', 'd', 'e'])])).toBe(10);
  });

  it('treats an empty includedItems array as a single cut', () => {
    // `includedItems: []` is how a non-bundle can arrive; `|| 1` must catch
    // the zero-length case, not just undefined.
    expect(countCartCuts([line(1, [])])).toBe(1);
  });

  it('sums across mixed lines', () => {
    expect(countCartCuts([line(1, ['a', 'b', 'c', 'd', 'e']), line(1)])).toBe(6);
  });

  it('ignores negative or fractional quantities rather than going negative', () => {
    expect(countCartCuts([line(-2)])).toBe(0);
    expect(countCartCuts([line(1.7)])).toBe(1);
  });

  it('is zero for an empty cart', () => {
    expect(countCartCuts([])).toBe(0);
  });
});

describe('countCartItems', () => {
  it('counts lines, not pieces', () => {
    expect(countCartItems([line(4, ['a', 'b'])])).toBe(1);
  });
});

describe('formatCartCount', () => {
  it('reads Empty with nothing in the cart', () => {
    expect(formatCartCount([])).toBe('Empty');
  });

  it('drops the redundant cuts clause for a single plain cut', () => {
    expect(formatCartCount([line(1)])).toBe('1 item');
  });

  it('drops the cuts clause when every line is a single piece', () => {
    expect(formatCartCount([line(1), line(1)])).toBe('2 items');
  });

  it('adds the cuts clause once a bundle makes the numbers diverge', () => {
    expect(formatCartCount([line(1, ['a', 'b', 'c', 'd', 'e']), line(1)])).toBe(
      '2 items · 6 cuts',
    );
  });

  it('adds the cuts clause for a quantity above one', () => {
    expect(formatCartCount([line(3)])).toBe('1 item · 3 cuts');
  });

  it('singularises both nouns', () => {
    expect(formatCartCount([line(1, ['a', 'b'])])).toBe('1 item · 2 cuts');
  });
});

// The confirmation page reads the order snapshot, not the cart, and must land
// on the same sentence for the same basket — otherwise the two pages disagree
// moments apart.
describe('order lines', () => {
  it('counts lines and cuts the same way the cart does', () => {
    expect(countOrderItems([orderLine(1, ['a', 'b', 'c', 'd', 'e']), orderLine(1)])).toBe(2);
    expect(countOrderCuts([orderLine(1, ['a', 'b', 'c', 'd', 'e']), orderLine(1)])).toBe(6);
  });

  it('agrees with the cart on the same basket', () => {
    const cart = [line(1, ['a', 'b', 'c', 'd', 'e']), line(2)];
    const order = [orderLine(1, ['a', 'b', 'c', 'd', 'e']), orderLine(2)];
    expect(formatOrderCount(order)).toBe(formatCartCount(cart));
    expect(formatOrderCount(order)).toBe('2 items · 7 cuts');
  });

  it('treats an order placed before bundles were snapshotted as one cut per unit', () => {
    // No includedItems on the line — the honest fallback, and the same answer
    // those orders gave before this field existed.
    expect(formatOrderCount([orderLine(1), orderLine(2)])).toBe('2 items · 3 cuts');
  });

  it('reads an empty order as Empty', () => {
    expect(formatOrderCount([])).toBe('Empty');
  });
});

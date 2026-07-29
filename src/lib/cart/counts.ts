// How a basket's contents are counted for display.
//
// Two different numbers matter and the drawer header used to conflate them: it
// rendered `cartItems.length` — the number of distinct lines — under the label
// "cuts". A cart holding one bundle of five steaks read as "1 cut".
//
// `items` is distinct lines; `cuts` is physical pieces, so a bundle counts its
// contents and a quantity of two counts twice.
//
// The same rule has to hold after checkout, so the confirmation page doesn't
// contradict the cart the customer was looking at moments earlier. Cart lines
// and order lines name their fields differently, so both normalise to one
// shape rather than each carrying its own copy of the rule.

type Countable = {
  quantity: number;
  includedItems?: string[];
};

export type CountableCartLine = {
  quantity: number;
  product: { includedItems?: string[] };
};

// An order line as snapshotted at checkout. `includedItems` is absent on
// non-bundle lines and on every order placed before it was snapshotted, which
// the fallback below reads as one cut per unit — the same answer those orders
// gave before, never a wrong bundle count.
export type CountableOrderLine = {
  qty: number;
  includedItems?: string[];
};

const fromCart = (line: CountableCartLine): Countable => ({
  quantity: line.quantity,
  includedItems: line.product.includedItems,
});

const fromOrder = (line: CountableOrderLine): Countable => ({
  quantity: line.qty,
  includedItems: line.includedItems,
});

function countItems(lines: Countable[]): number {
  return lines.length;
}

function countCuts(lines: Countable[]): number {
  return lines.reduce((total, line) => {
    const perUnit = line.includedItems?.length || 1;
    const quantity = Math.max(0, Math.trunc(line.quantity));
    return total + perUnit * quantity;
  }, 0);
}

// "Empty" · "1 item" · "2 items · 6 cuts".
//
// The cuts clause is dropped when it would restate the item count, so a single
// ordinary cut reads "1 item" rather than the redundant "1 item · 1 cut". It
// earns its place exactly when a bundle or a quantity above one makes the two
// numbers diverge.
function formatCount(lines: Countable[]): string {
  const items = countItems(lines);
  if (items === 0) return 'Empty';

  const cuts = countCuts(lines);
  const itemLabel = `${items} ${items === 1 ? 'item' : 'items'}`;
  if (cuts === items) return itemLabel;

  return `${itemLabel} · ${cuts} ${cuts === 1 ? 'cut' : 'cuts'}`;
}

export function countCartItems(lines: CountableCartLine[]): number {
  return countItems(lines.map(fromCart));
}

export function countCartCuts(lines: CountableCartLine[]): number {
  return countCuts(lines.map(fromCart));
}

export function formatCartCount(lines: CountableCartLine[]): string {
  return formatCount(lines.map(fromCart));
}

export function countOrderItems(lines: CountableOrderLine[]): number {
  return countItems(lines.map(fromOrder));
}

export function countOrderCuts(lines: CountableOrderLine[]): number {
  return countCuts(lines.map(fromOrder));
}

export function formatOrderCount(lines: CountableOrderLine[]): string {
  return formatCount(lines.map(fromOrder));
}

// How a cart's contents are counted for display.
//
// Two different numbers matter and the drawer header used to conflate them: it
// rendered `cartItems.length` — the number of distinct lines — under the label
// "cuts". A cart holding one bundle of five steaks read as "1 cut".
//
// `items` is distinct lines; `cuts` is physical pieces, so a bundle counts its
// contents and a quantity of two counts twice.

export type CountableCartLine = {
  quantity: number;
  product: { includedItems?: string[] };
};

export function countCartItems(lines: CountableCartLine[]): number {
  return lines.length;
}

export function countCartCuts(lines: CountableCartLine[]): number {
  return lines.reduce((total, line) => {
    const perUnit = line.product.includedItems?.length || 1;
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
export function formatCartCount(lines: CountableCartLine[]): string {
  const items = countCartItems(lines);
  if (items === 0) return 'Empty';

  const cuts = countCartCuts(lines);
  const itemLabel = `${items} ${items === 1 ? 'item' : 'items'}`;
  if (cuts === items) return itemLabel;

  return `${itemLabel} · ${cuts} ${cuts === 1 ? 'cut' : 'cuts'}`;
}

import type { CartLine } from '@/context/CartContext';
import { unitPrice } from '@/lib/products/pricing';

/**
 * Reconciling the price a shopper is shown with the price they are charged.
 *
 * A cart line snapshots its per-unit price when the item is added
 * (`api/cart/route.ts` writes `unitPrice(product, product.price)`), and every
 * cart and checkout summary totals off that snapshot. The order builder
 * deliberately does NOT trust it — `buildLine` re-reads the *current* product
 * and recomputes, with a comment calling that authoritative.
 *
 * That is the right call on the server: charging a stale snapshot is its own
 * problem, and an admin reprice should reach orders placed after it. The bug
 * was that the client never found out. If a cut was repriced between
 * add-to-cart and place-order, the summary showed one number and Stripe
 * charged another, with no reconciliation and no warning. On the card-demo
 * path the customer never even saw Stripe's figure, so nothing corrected them.
 *
 * The server stays authoritative. These helpers just make the client agree with
 * it, and say so when the number moves.
 *
 * The populated product on each line already carries every field `unitPrice`
 * needs, so this is a pure comparison — no extra fetch.
 */

export type PriceChange = {
  productId: string;
  name: string;
  /** The per-unit price snapshotted when the line was added. */
  was: number;
  /** The per-unit price the order builder will actually charge. */
  now: number;
};

/**
 * The per-unit price the server will charge for this line right now. Mirrors
 * `buildLine`'s expression exactly; if that ever changes, this must follow, and
 * `reprice.test.ts` pins the agreement.
 */
export const currentUnitPrice = (line: CartLine): number =>
  unitPrice(line.product, line.product.price);

/**
 * Lines whose snapshot no longer matches what the shop would charge.
 *
 * Compared in cents rather than on raw floats: two prices that differ only
 * below a cent are the same money, and float arithmetic on per-lb estimates
 * (`pricePerLb × estimatedWeightLb`) produces exactly that kind of noise. A
 * naive `!==` would flag a line as "repriced" on a rounding artefact and show
 * the customer a change of $0.00.
 */
export function findPriceChanges(lines: CartLine[]): PriceChange[] {
  const changes: PriceChange[] = [];
  for (const line of lines) {
    const now = currentUnitPrice(line);
    if (Math.round(now * 100) === Math.round(line.price * 100)) continue;
    changes.push({
      productId: line.product._id,
      name: line.product.name,
      was: line.price,
      now,
    });
  }
  return changes;
}

/**
 * The same lines with each `price` replaced by what the shop will charge.
 *
 * Feed these to `computeTotals` so the subtotal, member discount, tax and total
 * on screen are the ones the customer is about to pay. Returns the original
 * array when nothing moved, so an unchanged cart keeps referential identity and
 * doesn't churn memoised consumers.
 */
export function repriceLines(lines: CartLine[]): CartLine[] {
  let moved = false;
  const next = lines.map((line) => {
    const now = currentUnitPrice(line);
    if (Math.round(now * 100) === Math.round(line.price * 100)) return line;
    moved = true;
    return { ...line, price: now };
  });
  return moved ? next : lines;
}

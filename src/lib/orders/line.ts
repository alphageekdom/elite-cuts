import type { OrderItem } from '@/models/Order';

// Per-line math used by every order surface that has to decide between the
// at-purchase estimate and the at-pickup realized total. The two callers
// today are:
//   - `src/lib/order-refunds.ts` — partial-refund math
//   - the admin order drawer + customer-facing receipt + profile order list
//     (display totals)
//
// Phase 3 keeps `line.price × line.qty` as the universal fallback so
// orders placed before Phase 3 (no `pricingType` snapshot) render exactly
// the way they did before. Only when a variable-weight line carries both a
// `pricePerLb` snapshot and an admin-entered `realizedWeightLb` does the
// realized math kick in.

const round2 = (n: number) => Math.round(n * 100) / 100;

export type LineTotalInput = Pick<
  OrderItem,
  'qty' | 'price' | 'pricingType' | 'pricePerLb' | 'realizedWeightLb'
>;

// A line is "variable-weight" when the snapshot says it was priced by
// weight (per_lb or whole_item_by_weight). Lines that pre-date Phase 3
// land here with `pricingType` undefined and are treated as fixed-price.
export function isVariableWeightLine(line: Pick<OrderItem, 'pricingType'>): boolean {
  return line.pricingType === 'per_lb' || line.pricingType === 'whole_item_by_weight';
}

// True when the admin has weighed the cut at pickup AND the snapshot has
// the per-lb rate needed to compute the realized total.
export function hasRealizedWeight(line: LineTotalInput): boolean {
  return (
    isVariableWeightLine(line) &&
    typeof line.pricePerLb === 'number' &&
    typeof line.realizedWeightLb === 'number' &&
    line.realizedWeightLb > 0
  );
}

// The at-purchase estimated total — always `price × qty`. Useful when
// rendering the "Estimated: $Y.YY" copy alongside the realized total, and
// as the universal fallback when no realized weight is on file.
export function estimatedLineTotal(line: Pick<OrderItem, 'qty' | 'price'>): number {
  return round2(line.price * line.qty);
}

// The line's effective total — realized when set, estimate otherwise.
// Per-line realized weight represents the *combined* weight of all qty
// cuts on the line ("these two ribeyes weighed 2.6 lb total"), so the
// realized total is `pricePerLb × realizedWeightLb` with no `× qty`.
export function realizedLineTotal(line: LineTotalInput): number {
  if (hasRealizedWeight(line)) {
    return round2(line.pricePerLb! * line.realizedWeightLb!);
  }
  return estimatedLineTotal(line);
}

// Sum of every line's effective total. The order's "final subtotal" once
// every variable-weight line has been weighed; identical to the pre-Phase-3
// subtotal when no realized weights are on file.
export function realizedSubtotal(lines: LineTotalInput[]): number {
  return round2(lines.reduce((sum, line) => sum + realizedLineTotal(line), 0));
}

// Sum of every line's at-purchase estimate. What Stripe charged the
// customer at the redirect.
export function estimatedSubtotal(lines: Pick<OrderItem, 'qty' | 'price'>[]): number {
  return round2(lines.reduce((sum, line) => sum + estimatedLineTotal(line), 0));
}

// True when every variable-weight line on the order carries a positive
// `realizedWeightLb`. Phase 4's auto-settle step refuses to fire until
// this returns true — partial weighing would settle against an
// incomplete realized total. Fixed-price orders pass trivially because
// there are no variable lines to wait for.
export function allVariableWeightLinesWeighed(lines: LineTotalInput[]): boolean {
  return lines.every((line) => !isVariableWeightLine(line) || hasRealizedWeight(line));
}

// True when at least one line on the order has been weighed and its
// realized total differs from its estimate. Drives the
// "Final total: $X.XX (estimated: $Y.YY)" copy on customer-facing
// surfaces — when every line is still on its estimate, the copy stays
// the same as a pre-Phase-3 order.
export function orderHasRealizedDifference(lines: LineTotalInput[]): boolean {
  return lines.some(
    (line) =>
      hasRealizedWeight(line) &&
      realizedLineTotal(line) !== estimatedLineTotal(line),
  );
}

// What the customer actually owes once every variable-weight line has
// been weighed at pickup. Reconstructed from the realized line totals +
// the order's discount stack + tax (scaled by the realized subtotal
// against the original) + optional delivery fee. The Stripe charge is
// still the estimate; this is informational copy on customer surfaces
// and the basis for refund math.
//
// `subtotal` and `tax` are the *original* (estimated) values stored on
// the order — used to derive the effective tax rate. Pass the same
// numbers the order doc carries, along with the same discounts and
// delivery fee, or the derived rate won't match the one that produced
// the stored tax.
export type RealizedOrderTotalInput = {
  lines: LineTotalInput[];
  subtotal: number;
  tax: number;
  memberDiscount?: number;
  promoDiscount?: number;
  pointsRedemptionValueCents?: number;
  deliveryFee?: number;
};

// Discounts + delivery fee applied the way `computeOrderTotals` applies
// them: discounts come off the subtotal, the fee goes on after, and the
// sum is what tax is charged on.
function taxableBase(
  subtotal: number,
  input: Pick<
    RealizedOrderTotalInput,
    'memberDiscount' | 'promoDiscount' | 'pointsRedemptionValueCents' | 'deliveryFee'
  >,
): { afterDiscounts: number; base: number } {
  const pointsDollars = (input.pointsRedemptionValueCents ?? 0) / 100;
  const afterDiscounts = Math.max(
    0,
    subtotal -
      (input.memberDiscount ?? 0) -
      (input.promoDiscount ?? 0) -
      pointsDollars,
  );
  return { afterDiscounts, base: afterDiscounts + (input.deliveryFee ?? 0) };
}

export function realizedOrderTotal(input: RealizedOrderTotalInput): number {
  const realized = taxableBase(realizedSubtotal(input.lines), input);

  // Derive the effective rate from the base the stored tax was actually
  // charged on — `computeOrderTotals` taxes the POST-discount subtotal
  // plus the delivery fee, not the raw subtotal. Dividing by the raw
  // subtotal understated the rate on every discounted order, so a cut
  // whose realized weight exactly matched its estimate still produced a
  // nonzero delta and auto-settlement moved money over it.
  const original = taxableBase(input.subtotal, input);
  const taxRatio = original.base > 0 ? input.tax / original.base : 0;

  const tax = Math.round(realized.base * taxRatio * 100) / 100;
  return Math.round((realized.base + tax) * 100) / 100;
}

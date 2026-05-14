// Placeholder — replace with actual CA rate (~8.75% for San Diego) before go-live.
export const TAX_RATE = 0.1;

// Returns a bare numeric string ("12.34") without a currency symbol.
// Used in checkout UI where the $ is rendered separately in JSX.
export const fmtPrice = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const MEMBER_DISCOUNT_RATE = 0.05;
export const DELIVERY_FEE = 8;

interface CartLineInput {
  price: number;
  quantity: number;
}

export interface Totals {
  subtotal: number;
  memberDiscount: number;
  pointsDiscount: number;
  delivery: number;
  tax: number;
  total: number;
}

export function computeTotals(
  items: CartLineInput[],
  opts: {
    isLoggedIn?: boolean;
    promoDiscount?: number;
    pointsDiscount?: number;
    deliveryFee?: number;
  } = {},
): Totals {
  const { isLoggedIn = false, promoDiscount = 0, pointsDiscount = 0, deliveryFee = 0 } = opts;
  const subtotal = items.reduce((acc, line) => acc + line.price * line.quantity, 0);
  const memberDiscount = isLoggedIn ? subtotal * MEMBER_DISCOUNT_RATE : 0;
  const afterDiscounts = Math.max(0, subtotal - memberDiscount - promoDiscount - pointsDiscount);
  const tax = (afterDiscounts + deliveryFee) * TAX_RATE;
  return {
    subtotal,
    memberDiscount,
    pointsDiscount,
    delivery: deliveryFee,
    tax,
    total: afterDiscounts + deliveryFee + tax,
  };
}

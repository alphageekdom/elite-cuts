export const TAX_RATE = 0.1;
export const MEMBER_DISCOUNT_RATE = 0.05;
export const DELIVERY_FEE = 8;

interface CartLineInput {
  price: number;
  quantity: number;
}

export interface Totals {
  subtotal: number;
  memberDiscount: number;
  delivery: number;
  tax: number;
  total: number;
}

export function computeTotals(
  items: CartLineInput[],
  opts: {
    isLoggedIn?: boolean;
    promoDiscount?: number;
    deliveryFee?: number;
  } = {},
): Totals {
  const { isLoggedIn = false, promoDiscount = 0, deliveryFee = 0 } = opts;
  const subtotal = items.reduce((acc, line) => acc + line.price * line.quantity, 0);
  const memberDiscount = isLoggedIn ? subtotal * MEMBER_DISCOUNT_RATE : 0;
  const afterDiscounts = Math.max(0, subtotal - memberDiscount - promoDiscount);
  const tax = (afterDiscounts + deliveryFee) * TAX_RATE;
  return {
    subtotal,
    memberDiscount,
    delivery: deliveryFee,
    tax,
    total: afterDiscounts + deliveryFee + tax,
  };
}

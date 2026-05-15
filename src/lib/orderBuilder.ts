import type { Types } from 'mongoose';

import Cart from '@/models/Cart';
import Product from '@/models/Product';
import { MEMBER_DISCOUNT_RATE, DELIVERY_FEE, TAX_RATE } from '@/lib/pricing';
import { MAX_PER_LINE } from '@/lib/shopConfig';

// Shared shape returned by `.lean<>()` from Product when the orders route
// only needs the customer-facing fields. Matches the Product schema:
// `images` is a string[] of URLs, not an object array — three near-identical
// inline copies previously diverged on that detail.
export type OrderProductLean = {
  _id: Types.ObjectId;
  name: string;
  price: number;
  images?: string[];
  category?: string;
  stockCount: number;
};

// Per-line shape persisted on Order.orderItems. Kept here so the route and
// any future caller (cron-promo, admin re-create) share one source of truth.
export type OrderLine = {
  product: Types.ObjectId;
  name: string;
  qty: number;
  image: string;
  price: number;
  productType: string;
};

// Either a successful build with order lines + stock errors (route maps the
// errors to 409), or a structured fail with the exact status+message the
// route should return. Keeps the helpers pure and the route a thin router.
export type BuildOrderItemsResult =
  | { ok: false; status: number; message: string }
  | { ok: true; orderItems: OrderLine[]; stockErrors: string[] };

// Shape of a cart item after `populate('items.product')` has run — the
// `product` ref is swapped from `Types.ObjectId` to the populated Product.
// Used as the `populate<T>()` generic so the helper iterates over a fully
// typed list with no `as unknown as` escape hatches.
type PopulatedCartItem = {
  product: OrderProductLean;
  quantity: number;
  price: number;
};

const buildLine = (product: OrderProductLean, qty: number): OrderLine => ({
  product: product._id,
  name: product.name,
  qty,
  image: product.images?.[0] ?? '',
  price: product.price,
  productType: product.category ?? '',
});

const stockErrorFor = (product: OrderProductLean, qty: number): string | null =>
  product.stockCount < qty
    ? `${product.name}: only ${product.stockCount} in stock (${qty} requested)`
    : null;

// Builds order lines from the signed-in customer's server-side Cart.
// Reads price + image off the populated Product (authoritative) rather than
// any snapshot on the cart line. Returns a structured fail for empty cart
// or a per-line cap breach so the route can pick the right status code.
export async function buildOrderItemsFromCart(
  userId: string,
): Promise<BuildOrderItemsResult> {
  // `populate<{ items: PopulatedCartItem[] }>` is Mongoose's generic for
  // overriding the result type after populate has substituted the ref. The
  // returned `cart.items` is typed as `PopulatedCartItem[]` directly, so the
  // iteration below needs no casts.
  const cart = await Cart.findOne({ user: userId })
    .populate<{ items: PopulatedCartItem[] }>('items.product');

  if (!cart || cart.items.length === 0) {
    return { ok: false, status: 400, message: 'Cart is empty' };
  }

  // Backstop against a stale client that snuck a tampered cart past the cart
  // endpoint's caps. The cart API enforces the same limit on add/edit.
  const overCap = cart.items.find((line) => line.quantity > MAX_PER_LINE);
  if (overCap) {
    return {
      ok: false,
      status: 400,
      message: `Limit ${MAX_PER_LINE} per item`,
    };
  }

  const orderItems = cart.items.map((line) => buildLine(line.product, line.quantity));
  const stockErrors = cart.items
    .map((line) => stockErrorFor(line.product, line.quantity))
    .filter((x): x is string => x !== null);

  return { ok: true, orderItems, stockErrors };
}

// Builds order lines from a guest's request body. No server Cart exists for
// guests, so the helper does a Product.find by id list and applies the same
// authoritative price + image rules as the cart path.
export async function buildOrderItemsFromGuestItems(
  items: Array<{ productId: string; qty: number }>,
): Promise<BuildOrderItemsResult> {
  const products = await Product.find(
    { _id: { $in: items.map((it) => it.productId) } },
    'name price images category stockCount',
  ).lean<OrderProductLean[]>();

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const missing = items.find((it) => !productMap.has(it.productId));
  if (missing) {
    return {
      ok: false,
      status: 409,
      message: 'One or more cart items are no longer available',
    };
  }

  const orderItems = items.map((it) => buildLine(productMap.get(it.productId)!, it.qty));
  const stockErrors = items
    .map((it) => stockErrorFor(productMap.get(it.productId)!, it.qty))
    .filter((x): x is string => x !== null);

  return { ok: true, orderItems, stockErrors };
}

// Cent-rounded subtotal sum. Pulled out as its own helper so the redemption
// validator and the final totals step compute the same number.
export function computeSubtotal(orderItems: OrderLine[]): number {
  return (
    Math.round(
      orderItems.reduce((sum, item) => sum + item.price * item.qty, 0) * 100,
    ) / 100
  );
}

// 5% loyalty perk — only signed-in customers earn it. Guests get 0 even when
// they place the same cart through the guest flow.
export function computeMemberDiscount(
  subtotal: number,
  isSignedIn: boolean,
): number {
  return isSignedIn
    ? Math.round(subtotal * MEMBER_DISCOUNT_RATE * 100) / 100
    : 0;
}

// Final totals from already-computed building blocks. The route validates
// promo and rewards redemption against the discountable subtotal in between,
// so the math is split into pieces it can compose in the right order rather
// than one black box.
export function computeOrderTotals(args: {
  subtotal: number;
  memberDiscount: number;
  promoDiscount?: number;
  pointsDiscount?: number;
  fulfillmentType?: 'pickup' | 'delivery';
}): {
  afterDiscounts: number;
  deliveryFee: number;
  tax: number;
  totalCost: number;
} {
  const promoDiscount = args.promoDiscount ?? 0;
  const pointsDiscount = args.pointsDiscount ?? 0;
  const deliveryFee = args.fulfillmentType === 'delivery' ? DELIVERY_FEE : 0;
  const afterDiscounts = Math.max(
    0,
    args.subtotal - args.memberDiscount - promoDiscount - pointsDiscount,
  );
  const tax = Math.round((afterDiscounts + deliveryFee) * TAX_RATE * 100) / 100;
  const totalCost = Math.round((afterDiscounts + deliveryFee + tax) * 100) / 100;
  return { afterDiscounts, deliveryFee, tax, totalCost };
}

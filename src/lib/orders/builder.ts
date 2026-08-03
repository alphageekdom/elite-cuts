import type { Types } from 'mongoose';

import Cart from '@/models/Cart';
import Product from '@/models/Product';
import { MEMBER_DISCOUNT_RATE, DELIVERY_FEE, TAX_RATE } from '@/lib/checkout/totals';
import { roundMoney } from '@/lib/money';
import { unitPrice } from '@/lib/products/pricing';
import type { PricingType } from '@/lib/products/constants';
import { MAX_PER_LINE } from '@/lib/shop-settings/config';

// Shared shape returned by `.lean<>()` from Product when the orders route
// only needs the customer-facing fields. Matches the Product schema:
// `images` is a string[] of URLs, not an object array — three near-identical
// inline copies previously diverged on that detail.
//
// Phase 3 expanded this projection to cover the per-pricingType fields the
// order line snapshots. `price` stays on for the legacy fallback that
// `unitPrice` uses when `pricingType` is missing on a pre-Phase-1 product.
export type OrderProductLean = {
  _id: Types.ObjectId;
  name: string;
  price: number;
  images?: string[];
  category?: string;
  stockCount: number;
  pricingType?: PricingType;
  packagePrice?: number;
  pricePerLb?: number;
  estimatedWeightLb?: number;
  averageWeightLb?: number;
  minWeightLb?: number;
  maxWeightLb?: number;
  unitPrice?: number;
  bundlePrice?: number;
  displayPriceLabel?: string;
  displayWeightLabel?: string;
  includedItems?: string[];
};

// Projection covering every field `buildLine` reads. Shared so the guest path
// and the admin walk-in path can't drift on which pricing fields they fetch —
// a projection missing `pricingType` silently sends `unitPrice` down its
// legacy-fallback branch and snapshots the per-pound rate as the unit price.
export const ORDER_PRODUCT_PROJECTION =
  'name price images category stockCount pricingType packagePrice pricePerLb ' +
  'estimatedWeightLb averageWeightLb minWeightLb maxWeightLb unitPrice bundlePrice ' +
  'displayPriceLabel displayWeightLabel includedItems';

// Per-line shape persisted on Order.orderItems. Kept here so the route and
// any future caller (cron-promo, admin re-create) share one source of truth.
//
// Phase 3 added the pricing snapshot fields. `price` is the per-unit
// estimated cost (`unitPrice(product, product.price)`), so
// `price × qty` is the line's estimated total — the amount Stripe charged
// at the redirect. The realized total (when admin enters the weighed value
// at pickup) reads from `pricePerLb × realizedWeightLb` — see
// `realizedLineTotal` for the precedence rules.
export type OrderLine = {
  product: Types.ObjectId;
  name: string;
  qty: number;
  image: string;
  price: number;
  productType: string;
  pricingType?: PricingType;
  pricePerLb?: number;
  estimatedWeightLb?: number;
  minWeightLb?: number;
  maxWeightLb?: number;
  displayPriceLabel?: string;
  displayWeightLabel?: string;
  // Bundle contents, snapshotted for the same reason as name and price: the
  // order has to stay readable after the product is edited or deleted.
  includedItems?: string[];
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

// Snapshot the right "best-guess weight" field per pricingType. For per_lb
// it's the estimated cut weight; for whole_item_by_weight it's the typical
// average weight; both other types don't have a weight axis so this stays
// undefined.
function snapshotEstimatedWeight(product: OrderProductLean): number | undefined {
  if (product.pricingType === 'per_lb') return product.estimatedWeightLb;
  if (product.pricingType === 'whole_item_by_weight') return product.averageWeightLb;
  return undefined;
}

export const buildLine = (product: OrderProductLean, qty: number): OrderLine => ({
  product: product._id,
  name: product.name,
  qty,
  image: product.images?.[0] ?? '',
  // Per-unit estimated cost — for variable-weight cuts this is
  // `pricePerLb × estimatedWeightLb` (NOT the raw pricePerLb the customer
  // would otherwise be over-charged). `unitPrice` also handles fixed_package
  // / each / bundle correctly, and falls back to the legacy `product.price`
  // for pre-Phase-1 products that don't carry pricingType.
  price: unitPrice(product, product.price),
  productType: product.category ?? '',
  ...(product.pricingType && { pricingType: product.pricingType }),
  ...(product.pricingType === 'per_lb' || product.pricingType === 'whole_item_by_weight'
    ? {
        ...(typeof product.pricePerLb === 'number' && { pricePerLb: product.pricePerLb }),
        ...(snapshotEstimatedWeight(product) !== undefined && {
          estimatedWeightLb: snapshotEstimatedWeight(product),
        }),
        ...(typeof product.minWeightLb === 'number' && { minWeightLb: product.minWeightLb }),
        ...(typeof product.maxWeightLb === 'number' && { maxWeightLb: product.maxWeightLb }),
      }
    : {}),
  ...(product.displayPriceLabel && { displayPriceLabel: product.displayPriceLabel }),
  ...(product.displayWeightLabel && { displayWeightLabel: product.displayWeightLabel }),
  ...(product.includedItems?.length && { includedItems: product.includedItems }),
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
    ORDER_PRODUCT_PROJECTION,
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
  return isSignedIn ? roundMoney(subtotal * MEMBER_DISCOUNT_RATE) : 0;
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
  const tax = roundMoney((afterDiscounts + deliveryFee) * TAX_RATE);
  const totalCost = roundMoney(afterDiscounts + deliveryFee + tax);
  return { afterDiscounts, deliveryFee, tax, totalCost };
}

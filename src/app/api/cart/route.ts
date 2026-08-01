import { NextResponse, type NextRequest } from 'next/server';

import Cart from '@/models/Cart';
import Product from '@/models/Product';
import { withAuth } from '@/lib/api-handler';
import { MAX_PER_LINE } from '@/lib/shop-settings/config';
import { unitPrice } from '@/lib/products/pricing';
import { PUBLIC_PRODUCT_PROJECTION } from '@/lib/products/public-projection';

// Lean line-item wire shape. CartItemSchema has `_id: false` so each line is
// uniquely keyed by its product reference — that's the identifier callers use
// for PATCH / DELETE.
type CartLineWire = {
  product: unknown;
  quantity: number;
  price: number;
};

const badRequest = (message: string) =>
  NextResponse.json({ message }, { status: 400 });

// Every cart response is read by the customer who owns it, so populated lines
// carry the same strip the public catalog reads use. Declared once because all
// four verbs populate and any one of them missing it reopens the leak.
const CART_PRODUCT_POPULATE = {
  path: 'items.product',
  select: PUBLIC_PRODUCT_PROJECTION,
} as const;

const findCart = (userId: string) =>
  Cart.findOne({ user: userId }).populate(CART_PRODUCT_POPULATE);

// Loads the user's cart, populating each line's product so the client can
// render names / images / prices without a follow-up call. Creates an empty
// cart on first read so subsequent mutations have a doc to mutate.
const loadCart = async (userId: string) => {
  let cart = await findCart(userId);

  if (!cart) {
    // Check-then-insert against the unique `user` index: two requests that
    // both find nothing both try to insert, and the loser used to surface as
    // a 500 "Something went wrong" with the cart apparently unloadable. It
    // needs no orchestration to hit — an open second tab at sign-in, or the
    // hydrate GET racing a first add-to-cart, since the button is interactive
    // before the fetch resolves. The demo customer meets it most mornings,
    // because the nightly reset deletes their cart doc.
    //
    // An upsert would be the tidier shape but not here: `timestamps: true` on
    // this schema means Mongoose stamps `updatedAt` on every findOneAndUpdate,
    // and `updatedAt` is what anchors the 30-minute expiry timer — so every
    // cart read would re-anchor it and the cart would never expire.
    try {
      cart = await Cart.create({ user: userId, items: [] });
    } catch (error) {
      if (
        !error ||
        typeof error !== 'object' ||
        !('code' in error) ||
        (error as { code: unknown }).code !== 11000
      ) {
        throw error;
      }
      // Lost the insert race. The winner's doc exists now, so read that
      // rather than failing a request the customer can't retry into success.
      cart = await findCart(userId);
    }
    if (!cart) throw new Error('Cart could not be created or read');
  }

  // Self-heal: strip any items whose product was deleted from the DB, and
  // fold any duplicate product lines into one with summed quantities.
  // Duplicates can persist from legacy carts that pre-date the dedup-on-add
  // logic — left in place they'd crash the client's React render via
  // duplicate keys.
  const before = cart.items.length;
  const live = cart.items.filter(
    (line) => line.product != null,
  ) as typeof cart.items;
  const byProduct = new Map<string, (typeof live)[number]>();
  for (const line of live) {
    const id = String(
      (line.product as { _id: unknown })._id ?? line.product,
    );
    const existing = byProduct.get(id);
    if (existing) {
      existing.quantity += line.quantity;
    } else {
      byProduct.set(id, line);
    }
  }
  cart.items = [...byProduct.values()] as typeof cart.items;
  if (cart.items.length !== before) await cart.save();

  return cart;
};

// Returns the wire payload with the cart's updatedAt so the client can anchor
// the 30-minute expiry timer against the canonical server timestamp.
const respond = (items: CartLineWire[], updatedAt: Date | null) =>
  NextResponse.json({ items, updatedAt: updatedAt?.toISOString() ?? null });

// Handles both populated ( { _id, ... } ) and unpopulated ( ObjectId string )
// product references — Mongoose leaves the raw ObjectId when populate() hasn't
// been called yet, or after a fresh push before re-populate.
const matchesProduct = (
  item: { product: unknown },
  productId: string,
): boolean =>
  item.product instanceof Object && '_id' in item.product
    ? String((item.product as { _id: unknown })._id) === productId
    : String(item.product) === productId;

// GET /api/cart — current user's cart.
export const GET = withAuth(async (_req, _ctx, userId) => {
  try {
    const cart = await loadCart(userId);
    const json = cart.toJSON() as { items: CartLineWire[]; updatedAt: Date };
    return respond(json.items, json.updatedAt);
  } catch (error) {
    console.error('[cart GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

// POST /api/cart — incremental add. Body: { productId, quantity? }. If a line
// already exists for the product, its quantity is incremented by `quantity`
// (default 1); otherwise a new line is pushed with that starting quantity.
export const POST = withAuth(async (request: NextRequest, _ctx, userId) => {
  try {
    const body = (await request.json().catch(() => null)) as
      | { productId?: string; quantity?: number }
      | null;
    const productId = body?.productId;
    const addBy = Math.max(1, Math.trunc(Number(body?.quantity ?? 1)) || 1);

    if (!productId) return badRequest('productId is required');

    const product = await Product.findById(productId);
    if (!product) return NextResponse.json({ message: 'Product not found' }, { status: 404 });

    if (product.stockCount <= 0) {
      return badRequest('This item is out of stock');
    }

    const cart = await loadCart(userId);
    const existing = cart.items.find((item) => matchesProduct(item, productId));
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty + addBy > product.stockCount) {
      return badRequest(
        currentQty > 0
          ? `Only ${product.stockCount} in stock (${currentQty} already in your cart)`
          : `Only ${product.stockCount} in stock`,
      );
    }

    if (currentQty + addBy > MAX_PER_LINE) {
      return badRequest(`Limit ${MAX_PER_LINE} per item`);
    }

    if (existing) {
      existing.quantity += addBy;
    } else {
      cart.items.push({
        product: product._id,
        quantity: addBy,
        // Per-unit estimated price — for per-lb / whole-item cuts this is
        // pricePerLb × estimatedWeightLb (or averageWeightLb), so
        // `line.price × line.quantity` gives the correct line estimate.
        // See src/lib/products/pricing.ts → unitPrice for details.
        price: unitPrice(product, product.price),
      });
    }

    await cart.save();
    await cart.populate(CART_PRODUCT_POPULATE);
    const json = cart.toJSON() as { items: CartLineWire[]; updatedAt: Date };
    return respond(json.items, json.updatedAt);
  } catch (error) {
    console.error('[cart POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

// PATCH /api/cart — set a line's quantity to an absolute value. Body:
// { productId, quantity }. quantity ≤ 0 removes the line; otherwise it
// upserts the line at exactly that quantity. Used by the +/- steppers.
export const PATCH = withAuth(async (request: NextRequest, _ctx, userId) => {
  try {
    const body = (await request.json().catch(() => null)) as
      | { productId?: string; quantity?: number }
      | null;
    const productId = body?.productId;
    const quantity = Math.trunc(Number(body?.quantity ?? 0));

    if (!productId) return badRequest('productId is required');

    const cart = await loadCart(userId);

    const idx = cart.items.findIndex((item) => matchesProduct(item, productId));

    if (quantity <= 0) {
      if (idx !== -1) cart.items.splice(idx, 1);
    } else {
      const product = await Product.findById(productId);
      if (!product) return NextResponse.json({ message: 'Product not found' }, { status: 404 });
      if (quantity > product.stockCount) {
        return badRequest(`Only ${product.stockCount} in stock`);
      }
      if (quantity > MAX_PER_LINE) {
        return badRequest(`Limit ${MAX_PER_LINE} per item`);
      }
      if (idx !== -1) {
        cart.items[idx].quantity = quantity;
      } else {
        cart.items.push({ product: product._id, quantity, price: unitPrice(product, product.price) });
      }
    }

    await cart.save();
    await cart.populate(CART_PRODUCT_POPULATE);
    const json = cart.toJSON() as { items: CartLineWire[]; updatedAt: Date };
    return respond(json.items, json.updatedAt);
  } catch (error) {
    console.error('[cart PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

// DELETE /api/cart — remove one line (body: { productId }) or clear all (no body).
export const DELETE = withAuth(async (request: NextRequest, _ctx, userId) => {
  try {
    const body = (await request.json().catch(() => null)) as
      | { productId?: string }
      | null;
    const productId = body?.productId;

    if (!productId) {
      // Atomic clear-all — avoids concurrent-write conflicts from parallel deletes.
      await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [] } });
      return respond([], new Date());
    }

    const cart = await loadCart(userId);

    const idx = cart.items.findIndex((item) => matchesProduct(item, productId));

    if (idx !== -1) {
      cart.items.splice(idx, 1);
      await cart.save();
    }

    await cart.populate(CART_PRODUCT_POPULATE);
    const json = cart.toJSON() as { items: CartLineWire[]; updatedAt: Date };
    return respond(json.items, json.updatedAt);
  } catch (error) {
    console.error('[cart DELETE]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

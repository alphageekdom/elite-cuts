import { NextResponse, type NextRequest } from 'next/server';

import Cart from '@/models/Cart';
import Product from '@/models/Product';
import { withAuth } from '@/lib/api-handler';
import { MAX_PER_LINE } from '@/lib/shopConfig';

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

// Loads the user's cart, populating each line's product so the client can
// render names / images / prices without a follow-up call. Creates an empty
// cart on first read so subsequent mutations have a doc to mutate.
const loadCart = async (userId: string) => {
  const cart =
    (await Cart.findOne({ user: userId }).populate('items.product')) ??
    (await Cart.create({ user: userId, items: [] }));

  // Self-heal: strip any items whose product was deleted from the DB.
  // `.populate()` leaves those as null; keep them in the doc would crash the client.
  const before = cart.items.length;
  cart.items = cart.items.filter(
    (line) => line.product != null,
  ) as typeof cart.items;
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
    console.error(error);
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
        price: product.price,
      });
    }

    await cart.save();
    await cart.populate('items.product');
    const json = cart.toJSON() as { items: CartLineWire[]; updatedAt: Date };
    return respond(json.items, json.updatedAt);
  } catch (error) {
    console.error(error);
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
        cart.items.push({ product: product._id, quantity, price: product.price });
      }
    }

    await cart.save();
    await cart.populate('items.product');
    const json = cart.toJSON() as { items: CartLineWire[]; updatedAt: Date };
    return respond(json.items, json.updatedAt);
  } catch (error) {
    console.error(error);
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

    await cart.populate('items.product');
    const json = cart.toJSON() as { items: CartLineWire[]; updatedAt: Date };
    return respond(json.items, json.updatedAt);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

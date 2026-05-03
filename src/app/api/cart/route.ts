import { NextResponse, type NextRequest } from 'next/server';

import connectDB from '@/config/database';
import Cart from '@/models/Cart';
import Product from '@/models/Product';
import { getSessionUser } from '@/utils/getSessionUser';

// Lean line-item wire shape. CartItemSchema has `_id: false` so each line is
// uniquely keyed by its product reference — that's the identifier callers use
// for PATCH / DELETE.
type CartLineWire = {
  product: unknown;
  quantity: number;
  price: number;
};

const unauthorized = () =>
  NextResponse.json({ message: 'unauthorized' }, { status: 401 });

const badRequest = (message: string) =>
  NextResponse.json({ message }, { status: 400 });

// Loads the user's cart, populating each line's product so the client can
// render names / images / prices without a follow-up call. Creates an empty
// cart on first read so subsequent mutations have a doc to mutate.
const loadCart = async (userId: string) => {
  const cart =
    (await Cart.findOne({ user: userId }).populate('items.product')) ??
    (await Cart.create({ user: userId, items: [] }));
  return cart;
};

// Returns the wire payload (populated items only). The client never needs the
// envelope's `_id`, `user`, or timestamps.
const respond = (items: CartLineWire[]) => NextResponse.json({ items });

// GET /api/cart — current user's cart.
export const GET = async () => {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) return unauthorized();

    await connectDB();
    const cart = await loadCart(sessionUser.userId);
    return respond(cart.toJSON().items as CartLineWire[]);
  } catch (error) {
    console.error(error);
    return new Response('Something Went Wrong', { status: 500 });
  }
};

// POST /api/cart — incremental add. Body: { productId, quantity? }. If a line
// already exists for the product, its quantity is incremented by `quantity`
// (default 1); otherwise a new line is pushed with that starting quantity.
export const POST = async (request: NextRequest) => {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) return unauthorized();

    const body = (await request.json().catch(() => null)) as
      | { productId?: string; quantity?: number }
      | null;
    const productId = body?.productId;
    const addBy = Math.max(1, Math.trunc(Number(body?.quantity ?? 1)) || 1);

    if (!productId) return badRequest('productId is required');

    await connectDB();

    const product = await Product.findById(productId);
    if (!product) return new Response('Product not found', { status: 404 });

    const cart = await loadCart(sessionUser.userId);
    const existing = cart.items.find((item) =>
      item.product instanceof Object && '_id' in item.product
        ? String((item.product as { _id: unknown })._id) === productId
        : String(item.product) === productId,
    );

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
    return respond(cart.toJSON().items as CartLineWire[]);
  } catch (error) {
    console.error(error);
    return new Response('Something Went Wrong', { status: 500 });
  }
};

// PATCH /api/cart — set a line's quantity to an absolute value. Body:
// { productId, quantity }. quantity ≤ 0 removes the line; otherwise it
// upserts the line at exactly that quantity. Used by the +/- steppers.
export const PATCH = async (request: NextRequest) => {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) return unauthorized();

    const body = (await request.json().catch(() => null)) as
      | { productId?: string; quantity?: number }
      | null;
    const productId = body?.productId;
    const quantity = Math.trunc(Number(body?.quantity ?? 0));

    if (!productId) return badRequest('productId is required');

    await connectDB();
    const cart = await loadCart(sessionUser.userId);

    const idx = cart.items.findIndex((item) =>
      item.product instanceof Object && '_id' in item.product
        ? String((item.product as { _id: unknown })._id) === productId
        : String(item.product) === productId,
    );

    if (quantity <= 0) {
      if (idx !== -1) cart.items.splice(idx, 1);
    } else if (idx !== -1) {
      cart.items[idx].quantity = quantity;
    } else {
      const product = await Product.findById(productId);
      if (!product) return new Response('Product not found', { status: 404 });
      cart.items.push({
        product: product._id,
        quantity,
        price: product.price,
      });
    }

    await cart.save();
    await cart.populate('items.product');
    return respond(cart.toJSON().items as CartLineWire[]);
  } catch (error) {
    console.error(error);
    return new Response('Something Went Wrong', { status: 500 });
  }
};

// DELETE /api/cart — remove one line. Body: { productId }.
export const DELETE = async (request: NextRequest) => {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) return unauthorized();

    const body = (await request.json().catch(() => null)) as
      | { productId?: string }
      | null;
    const productId = body?.productId;

    if (!productId) return badRequest('productId is required');

    await connectDB();
    const cart = await loadCart(sessionUser.userId);

    const idx = cart.items.findIndex((item) =>
      item.product instanceof Object && '_id' in item.product
        ? String((item.product as { _id: unknown })._id) === productId
        : String(item.product) === productId,
    );

    if (idx !== -1) {
      cart.items.splice(idx, 1);
      await cart.save();
    }

    await cart.populate('items.product');
    return respond(cart.toJSON().items as CartLineWire[]);
  } catch (error) {
    console.error(error);
    return new Response('Something Went Wrong', { status: 500 });
  }
};

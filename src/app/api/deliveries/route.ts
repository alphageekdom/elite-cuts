import { NextResponse, type NextRequest } from 'next/server';
import mongoose, { type ClientSession } from 'mongoose';
import Delivery from '@/models/Delivery';
import Product from '@/models/Product';
import { withAdmin, withAdminNonDemo } from '@/lib/api-handler';
import { deliveryCreateSchema } from '@/lib/deliveries/schema';

export const GET = withAdmin(async () => {
  try {
    const upcoming = await Delivery.find({
      deliveryDate: { $gte: new Date() },
    }).sort({ deliveryDate: 1 }).limit(10).lean();
    return NextResponse.json({ items: upcoming, total: upcoming.length });
  } catch (error) {
    console.error('[deliveries GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

// When the admin logs a delivery as already received, fold the receivedQty
// into the product's stock count in the same write so the audit and the
// catalog stay aligned. Atomic via Mongo transaction when supported.
async function commitDelivery(
  payload: Record<string, unknown>,
  applyStock: { productId: string; qty: number } | null,
  session: ClientSession | null,
) {
  const [delivery] = await Delivery.create([payload], session ? { session } : undefined);
  if (applyStock) {
    const update = Product.updateOne(
      { _id: applyStock.productId },
      { $inc: { stockCount: applyStock.qty } },
    );
    if (session) update.session(session);
    await update.exec();
  }
  return delivery;
}

export const POST = withAdminNonDemo(async (request: NextRequest) => {
  try {
    const parsed = deliveryCreateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Invalid delivery input' },
        { status: 400 },
      );
    }
    const data = parsed.data;

    if (data.productId) {
      const exists = await Product.exists({ _id: data.productId });
      if (!exists) {
        return NextResponse.json({ message: 'Product not found' }, { status: 404 });
      }
    }

    // Floor to integers — the schema accepts non-negative numbers but the
    // model field is unit-counted. Matches the PATCH companion.
    const parsedReceivedQty =
      typeof data.receivedQty === 'number' ? Math.floor(data.receivedQty) : null;

    const payload: Record<string, unknown> = {
      deliveryDate: data.deliveryDate,
      supplier: data.supplier,
      ...(data.supplierSuffix !== undefined ? { supplierSuffix: data.supplierSuffix } : {}),
      ...(data.detail !== undefined ? { detail: data.detail } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.productId ? { productId: data.productId } : {}),
      ...(parsedReceivedQty !== null ? { receivedQty: parsedReceivedQty } : {}),
    };

    // Only auto-apply to stock when this is a real received delivery linked
    // to a product, with a positive received qty.
    const applyStock =
      data.status === 'received' && data.productId && parsedReceivedQty && parsedReceivedQty > 0
        ? { productId: data.productId, qty: parsedReceivedQty }
        : null;

    let delivery;
    let session: ClientSession | null = null;
    try {
      if (applyStock) {
        session = await mongoose.startSession();
        delivery = await session.withTransaction(() => commitDelivery(payload, applyStock, session));
      } else {
        delivery = await commitDelivery(payload, null, null);
      }
    } catch (txErr) {
      const message = txErr instanceof Error ? txErr.message : '';
      const isStandalone = /replica set|Transaction numbers|standalone/i.test(message);
      if (!isStandalone) throw txErr;
      // Best-effort sequential commit on standalone dev Mongo.
      delivery = await commitDelivery(payload, applyStock, null);
    } finally {
      if (session) await session.endSession();
    }

    return NextResponse.json({ data: delivery }, { status: 201 });
  } catch (error) {
    console.error('[deliveries POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

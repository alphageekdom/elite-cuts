import { NextResponse, type NextRequest } from 'next/server';
import { type ClientSession } from 'mongoose';
import Delivery from '@/models/Delivery';
import Product from '@/models/Product';
import { withAdmin, withAdminNonDemo, zodBadRequest } from '@/lib/api-handler';
import { withOptionalTransaction } from '@/lib/db/transaction';
import { deliveryCreateSchema } from '@/lib/deliveries/schema';

export const GET = withAdmin(async () => {
  try {
    const items = await Delivery.find({
      deliveryDate: { $gte: new Date() },
    }).sort({ deliveryDate: 1 }).limit(10).lean();
    return NextResponse.json({ items, total: items.length });
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
    if (!parsed.success) return zodBadRequest(parsed.error, 'Invalid delivery input');
    const data = parsed.data;

    if (data.productId) {
      const exists = await Product.exists({ _id: data.productId });
      if (!exists) {
        return NextResponse.json({ message: 'Product not found' }, { status: 404 });
      }
    }

    // `receivedQty` is already floored by the schema's `.transform`. We just
    // need the typed alias here to keep the optional check clean.
    const receivedQty =
      typeof data.receivedQty === 'number' ? data.receivedQty : null;

    const payload: Record<string, unknown> = {
      deliveryDate: data.deliveryDate,
      supplier: data.supplier,
      ...(data.supplierSuffix !== undefined ? { supplierSuffix: data.supplierSuffix } : {}),
      ...(data.detail !== undefined ? { detail: data.detail } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.productId ? { productId: data.productId } : {}),
      ...(receivedQty !== null ? { receivedQty } : {}),
    };

    // Only auto-apply to stock when this is a real received delivery linked
    // to a product, with a positive received qty.
    const applyStock =
      data.status === 'received' && data.productId && receivedQty && receivedQty > 0
        ? { productId: data.productId, qty: receivedQty }
        : null;

    const delivery = applyStock
      ? await withOptionalTransaction((session) =>
          commitDelivery(payload, applyStock, session),
        )
      : await commitDelivery(payload, null, null);

    return NextResponse.json({ data: delivery }, { status: 201 });
  } catch (error) {
    console.error('[deliveries POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

import { NextResponse } from 'next/server';
import Delivery from '@/models/Delivery';
import {
  parseObjectId,
  withAdminNonDemo,
  zodBadRequest,
} from '@/lib/api-handler';
import { deliveryPatchSchema } from '@/lib/deliveries/schema';

export const PATCH = withAdminNonDemo<{ id: string }>(async (request, ctx) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    const parsed = deliveryPatchSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return zodBadRequest(parsed.error, 'Invalid delivery input');

    // `receivedQty` is already floored by the schema's `.transform`.
    const { status, receivedQty } = parsed.data;
    const update: Record<string, unknown> = { status };
    if (status === 'received' && typeof receivedQty === 'number') {
      update.receivedQty = receivedQty;
    }
    const delivery = await Delivery.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: true });
    if (!delivery) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: delivery });
  } catch (error) {
    console.error('[deliveries/:id PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

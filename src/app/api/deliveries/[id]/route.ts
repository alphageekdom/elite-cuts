import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import Delivery from '@/models/Delivery';
import { withAdminNonDemo } from '@/lib/api-handler';
import { deliveryPatchSchema } from '@/lib/deliveries/schema';

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAdminNonDemo(async (request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const parsed = deliveryPatchSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Invalid delivery input' },
        { status: 400 },
      );
    }
    const { status, receivedQty } = parsed.data;
    const update: Record<string, unknown> = { status };
    if (status === 'received' && typeof receivedQty === 'number') {
      // Match the POST companion's `Math.floor` so a float qty can't sneak in
      // through the receive-existing-delivery path.
      update.receivedQty = Math.floor(receivedQty);
    }
    const delivery = await Delivery.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: true });
    if (!delivery) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: delivery });
  } catch (error) {
    console.error('[deliveries/:id PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

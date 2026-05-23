import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import Delivery from '@/models/Delivery';
import { withAdmin } from '@/lib/api-handler';
import { isIn } from '@/lib/validation';
import { DELIVERY_STATUSES } from '@/models/Delivery';

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAdmin(async (request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const body = (await request.json()) as { status?: string; receivedQty?: unknown };
    const { status, receivedQty } = body;
    if (!status || !isIn(DELIVERY_STATUSES, status)) {
      return NextResponse.json({ message: `status must be one of: ${DELIVERY_STATUSES.join(', ')}` }, { status: 400 });
    }
    const update: Record<string, unknown> = { status };
    if (
      status === 'received' &&
      typeof receivedQty === 'number' &&
      Number.isFinite(receivedQty) &&
      receivedQty >= 0
    ) {
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

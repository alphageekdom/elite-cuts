import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';

import connectDB from '@/config/database';
import { withAdminNonDemo } from '@/lib/api-handler';
import { runOrderSettlement } from '@/lib/payments/orderSettlement';
import { notifyAdminsOfSettlementFailure } from '@/lib/order-notifications';

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/orders/:id/settle — admin-triggered retry of the Phase 4
// auto-settle step. Re-fires the same off-session charge / refund path the
// completion handler used; idempotent against `settlementStatus: 'settled'`
// (the helper short-circuits with `already_settled`). Returns the
// settlement result so the admin drawer can refresh in place.
export const POST = withAdminNonDemo(async (_request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    await connectDB();
    const result = await runOrderSettlement(id);

    if (result.status === 'failed') {
      await notifyAdminsOfSettlementFailure({ orderId: id, error: result.error });
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('[orders/:id/settle POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

import { NextResponse } from 'next/server';

import connectDB from '@/config/database';
import { parseObjectId, withAdminNonDemo } from '@/lib/api-handler';
import { runOrderSettlement } from '@/lib/payments/orderSettlement';
import { notifyAdminsOfSettlementFailure } from '@/lib/orders/notifications';

// POST /api/orders/:id/settle — admin-triggered retry of the Phase 4
// auto-settle step. Re-fires the same off-session charge / refund path the
// completion handler used; idempotent against `settlementStatus: 'settled'`
// (the helper short-circuits with `already_settled`). Returns the
// settlement result so the admin drawer can refresh in place.
export const POST = withAdminNonDemo<{ id: string }>(async (_request, ctx) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

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

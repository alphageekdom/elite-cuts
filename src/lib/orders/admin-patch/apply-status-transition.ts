import { NextResponse } from 'next/server';

import { CANCELLATION_REASONS, type Order } from '@/models/Order';
import { isIn } from '@/lib/validation';
import type { BranchResult } from './types';

// Builds the orderStatus + cancellationReason + transition-timestamp slice of
// the PATCH updateFields envelope. Pure synchronous transformation against
// the `existing` order; the route stitches it onto the running accumulator.
//
// Re-transitioning into an already-stamped target (e.g. Cancelled →
// Preparing → Cancelled again) preserves the original transition timestamp.
// `pickedUpAt` rides on the Completed transition since that's when a pickup
// order is actually picked up.
export function applyStatusTransition({
  orderStatus,
  cancellationReason,
  existing,
  now,
}: {
  orderStatus: string;
  cancellationReason?: string;
  existing: Pick<Order, 'readyAt' | 'pickedUpAt' | 'cancelledAt'>;
  now: Date;
}): BranchResult {
  const updateFields: Record<string, unknown> = { orderStatus };

  if (orderStatus === 'Cancelled') {
    if (cancellationReason && !isIn(CANCELLATION_REASONS, cancellationReason)) {
      return {
        ok: false,
        response: NextResponse.json(
          { message: `cancellationReason must be one of: ${CANCELLATION_REASONS.join(', ')}` },
          { status: 400 },
        ),
      };
    }
    updateFields.cancellationReason = cancellationReason ?? null;
  } else {
    updateFields.cancellationReason = null;
  }

  if (orderStatus === 'Ready for Pickup' && !existing.readyAt) {
    updateFields.readyAt = now;
  }
  if (orderStatus === 'Completed' && !existing.pickedUpAt) {
    updateFields.pickedUpAt = now;
  }
  if (orderStatus === 'Cancelled' && !existing.cancelledAt) {
    updateFields.cancelledAt = now;
  }

  return { ok: true, updateFields };
}

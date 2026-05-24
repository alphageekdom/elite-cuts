import { NextResponse } from 'next/server';
import { z } from 'zod';

import type { OrderItem, Order } from '@/models/Order';
import { roundMoney } from '@/lib/money';
import { zodBadRequest } from '@/lib/api-handler';
import type { BranchResult } from './types';

// Sized to a clear retail ceiling — a whole hindquarter trends under 200 lb.
// Without it the downstream receipt and refund math in dollars would accept
// a 1e10 typo as-is.
const REALIZED_WEIGHT_MAX_LB = 500;

// Caps the array length so a malformed admin client (or a tampered request)
// can't push hundreds of entries through. A real order rarely has more than
// 20 lines, and the upper-bound matches the ceiling Mongo enforces on the
// underlying orderItems array.
const REALIZED_WEIGHTS_MAX_ENTRIES = 50;

export const realizedWeightEntrySchema = z.object({
  index: z.number().int().nonnegative(),
  weightLb: z
    .number()
    .positive()
    .max(REALIZED_WEIGHT_MAX_LB, {
      message: `Realized weight must be ${REALIZED_WEIGHT_MAX_LB} lb or fewer`,
    })
    .nullable(),
});

export const realizedWeightsSchema = z
  .array(realizedWeightEntrySchema)
  .max(REALIZED_WEIGHTS_MAX_ENTRIES);

export type RealizedWeightEntry = z.infer<typeof realizedWeightEntrySchema>;

// Validates realized-weight entries against the working-draft items
// (refund/unrefund branches may have already projected them) and returns
// the next `orderItems` slice.
//
// Order must be at or past fulfillment, lines must be variable-weight, and
// a line that's already refunded refuses the change so a late weight edit
// can't desync the refund already issued against it.
//
// Input shape (positive/finite weights, length bound) is enforced by the
// shared Zod schema above; the per-line context checks (order status, line
// pricing type, line refund state, index range) stay here.
export function applyRealizedWeights({
  entries,
  existing,
  baseItems,
}: {
  entries: unknown;
  existing: Pick<Order, 'orderStatus'>;
  baseItems: OrderItem[];
}): BranchResult {
  if (
    existing.orderStatus !== 'Ready for Pickup' &&
    existing.orderStatus !== 'Completed'
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message:
            'Realized weight can only be entered once the order is ready for pickup or completed',
        },
        { status: 400 },
      ),
    };
  }

  const parsed = realizedWeightsSchema.safeParse(entries);
  if (!parsed.success) {
    return {
      ok: false,
      response: zodBadRequest(parsed.error, 'Invalid realizedWeights'),
    };
  }

  const nextItems = baseItems.map((item) => ({ ...item }));

  for (const entry of parsed.data) {
    const idx = entry.index;
    if (idx >= nextItems.length) {
      return {
        ok: false,
        response: NextResponse.json(
          { message: 'Invalid realizedWeights index' },
          { status: 400 },
        ),
      };
    }
    const line = nextItems[idx];
    if (line.pricingType !== 'per_lb' && line.pricingType !== 'whole_item_by_weight') {
      return {
        ok: false,
        response: NextResponse.json(
          { message: 'Realized weight only applies to variable-weight cuts' },
          { status: 400 },
        ),
      };
    }
    if (line.refunded) {
      return {
        ok: false,
        response: NextResponse.json(
          { message: 'Cannot change realized weight on a refunded line' },
          { status: 400 },
        ),
      };
    }
    if (entry.weightLb === null) {
      delete (line as Partial<typeof line>).realizedWeightLb;
      continue;
    }
    line.realizedWeightLb = roundMoney(entry.weightLb);
  }

  return { ok: true, updateFields: { orderItems: nextItems } };
}

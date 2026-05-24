import { NextResponse } from 'next/server';

import type { OrderItem, Order } from '@/models/Order';
import { roundMoney } from '@/lib/money';
import type { BranchResult } from './types';

// Sized to a clear retail ceiling — a whole hindquarter trends under 200 lb.
// Without it the downstream receipt and refund math in dollars would accept
// a 1e10 typo as-is.
const REALIZED_WEIGHT_MAX_LB = 500;

export type RealizedWeightEntry = { index: number; weightLb: number | null };

// Validates realized-weight entries against the working-draft items
// (refund/unrefund branches may have already projected them) and returns
// the next `orderItems` slice.
//
// Order must be at or past fulfillment, lines must be variable-weight, and
// a line that's already refunded refuses the change so a late weight edit
// can't desync the refund already issued against it.
export function applyRealizedWeights({
  entries,
  existing,
  baseItems,
}: {
  entries: RealizedWeightEntry[];
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

  const nextItems = baseItems.map((item) => ({ ...item }));

  for (const entry of entries) {
    const idx = entry.index;
    if (!Number.isInteger(idx) || idx < 0 || idx >= nextItems.length) {
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
    if (
      typeof entry.weightLb !== 'number' ||
      !Number.isFinite(entry.weightLb) ||
      entry.weightLb <= 0
    ) {
      return {
        ok: false,
        response: NextResponse.json(
          { message: 'Realized weight must be a positive number' },
          { status: 400 },
        ),
      };
    }
    if (entry.weightLb > REALIZED_WEIGHT_MAX_LB) {
      return {
        ok: false,
        response: NextResponse.json(
          { message: `Realized weight must be ${REALIZED_WEIGHT_MAX_LB} lb or fewer` },
          { status: 400 },
        ),
      };
    }
    line.realizedWeightLb = roundMoney(entry.weightLb);
  }

  return { ok: true, updateFields: { orderItems: nextItems } };
}

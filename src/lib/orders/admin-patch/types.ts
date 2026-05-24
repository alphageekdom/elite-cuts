import { type NextResponse } from 'next/server';

// Shared result type for every admin-patch branch helper. Each helper either
// returns a partial `updateFields` accumulator to merge into the orchestrator's
// state, or an early-return `NextResponse` (validation failure, Stripe error,
// stock conflict). The orchestrator pattern in the PATCH route reads:
//
//     const result = await applyXxx(...);
//     if (!result.ok) return result.response;
//     Object.assign(updateFields, result.updateFields);
//
// Branches that need to advance the "draft items" line (refund / weight /
// unrefund) return them via `orderItems` on the updateFields so the next
// branch can read the projected state.
export type BranchOk = {
  ok: true;
  updateFields?: Record<string, unknown>;
};

export type BranchErr = {
  ok: false;
  response: NextResponse;
};

export type BranchResult = BranchOk | BranchErr;

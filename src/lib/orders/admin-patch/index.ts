// Branch helpers for the admin PATCH /api/orders/[id] handler. Each helper
// takes a slice of the existing order plus the body fragment it cares about,
// and returns either an `updateFields` partial to merge into the orchestrator
// state or an early-return NextResponse on validation / Stripe / stock
// failure. See ./types.ts for the result shape.
export { applyStatusTransition } from './apply-status-transition';
export { collectRefundIndices } from './collect-refund-indices';
export { applyRefund } from './apply-refund';
export {
  applyRealizedWeights,
  type RealizedWeightEntry,
} from './apply-realized-weights';
export { applyUnrefund } from './apply-unrefund';
export { reverseRewards } from './reverse-rewards';
export type { BranchResult } from './types';

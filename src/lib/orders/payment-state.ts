import type { Order } from '@/models/Order';

// Has this order's value been applied — the stock decrement, the points award
// and the promo seat that the reversal paths would otherwise hand back?
//
// Three paths create orders, and they apply value at different moments:
//
//   - Admin walk-in (`POST /api/orders`) decrements stock at creation, and
//     awards points there too when the admin records an already-collected
//     pickup. Payment is taken at the counter, so it sits at `Pending` while
//     already holding real stock. Writes `provider: 'admin'`.
//   - Customer checkout (`POST /api/checkout/session`) writes a `Pending`
//     order that touches nothing: stock, the promo seat and the points
//     deduction all happen later in `completeSessionForOrder`, behind the
//     atomic Pending → Authorized claim. Writes `provider: 'stripe'`, or
//     `'demo'` on the no-charge card path.
//   - The demo seed inserts finished history directly, stamped `Completed`
//     but decrementing no stock of its own. It therefore reads as applied,
//     which is right for its points and promo state and wrong for its stock:
//     cancelling a seeded order inflates that cut's count until the nightly
//     restore rewrites it from the snapshot. Same as main; noted so the next
//     reader doesn't take the helper's answer as true of stock in every case.
//
// A checkout order at `Pending` (or `Failed`, which the webhook only ever sets
// on a row already filtered to `Pending`) has had NO value applied. Reversing
// it invents inventory, mints points the customer never spent, and hands back
// a seat that was never taken. Stub mode has no session expiry, so abandoned
// demo checkouts accumulate in exactly this state and admin cleanup is the
// natural trigger.
//
// This reads `provider` rather than inferring the path from a field's absence.
// An earlier version tested `!payment.provider` on the belief that walk-ins
// carried none; the schema defaults it to `'demo'`, so every walk-in read as an
// unpaid checkout order — blocking completion outright and silently skipping
// the restock on cancel for stock that HAD been decremented.
//
// `Authorized` deliberately counts as applied. The claim has been won and the
// stock decrement runs on the very next line, so the window in which stock is
// NOT yet taken is sub-millisecond — but it is not empty, and the direction of
// the error flips across it: crash after the decrement and cancelling correctly
// restocks; crash before it and cancelling restocks inventory that was never
// taken. The trade still favours treating it as applied (the late window is by
// far the wider one), but an earlier version of this comment claimed stock was
// "already taken" for the whole window, which is only true of the later half.
//
// Statuses in which no money has moved. Named for what they mean rather than
// for the checkout path, because `hasCollectedPayment` reads them for counter
// sales too — a walk-in resting at `Pending` is awaiting payment at the till.
const UNPAID_STATUSES: ReadonlySet<string> = new Set(['Pending', 'Failed']);

export function hasSettledPayment(
  order: Pick<Order, 'paymentResult'>,
): boolean {
  const payment = order.paymentResult;
  if (!payment) return true;

  // A counter sale applied its value up front, whatever its payment state.
  if (payment.provider === 'admin') return true;

  // Walk-ins written before `'admin'` existed took the schema default,
  // `'demo'`. Both checkout paths that can rest at `Pending` are identifiable:
  // the hosted and stub flows write `provider: 'stripe'` AND stamp a
  // `checkoutSessionId`. So a `'demo'` row with no session id is a counter sale
  // from before the marker, and treating it as a checkout order is what refused
  // its completion outright and skipped the restock for stock already taken.
  //
  // The one thing this misreads is a demo-card checkout that died before
  // `completeSessionForOrder` won its atomic Pending → Authorized claim. That
  // call runs synchronously in the same request and every branch of it leaves
  // the order `Completed` or `Cancelled`, so resting at `Pending` means a crash
  // inside a sub-second window. Weighed against every pre-marker walk-in — the
  // drawer's default state — losing that rare case is the better trade, and a
  // backfill can't ship here because `scripts/` is untracked.
  if (payment.provider === 'demo' && !payment.checkoutSessionId) return true;

  return !UNPAID_STATUSES.has(payment.status);
}

// Has the shop actually taken this customer's money?
//
// The sibling of `hasSettledPayment`, and the two differ by exactly the counter
// sale: a walk-in decrements stock at creation but is paid at the till, so it
// has value applied while nothing has been collected. Everywhere else the two
// agree, which is why this reduces to the status check alone —
// `hasSettledPayment` IS this plus "or it's a counter sale".
//
// Conflating them is what let a cancelled unpaid walk-in stamp
// `paymentResult.status: 'Refunded'` and render a refund block on the
// customer's receipt for money the shop never charged. The restock that same
// cancellation performs is correct and reads `hasSettledPayment`; only the
// money half reads this.
//
// Reads `status` rather than `amountPaid` because status is the discriminator
// every other branch here uses, and the two cannot disagree: the walk-in
// envelope derives `amountPaid` from the same flag that sets `status`, and both
// completion paths write the full total alongside `'Completed'`.
export function hasCollectedPayment(
  order: Pick<Order, 'paymentResult'>,
): boolean {
  const payment = order.paymentResult;
  // Matches `hasSettledPayment`'s defensive default: an order with no envelope
  // at all predates the field, and refusing to refund it would be worse than
  // allowing it.
  if (!payment) return true;

  return !UNPAID_STATUSES.has(payment.status);
}

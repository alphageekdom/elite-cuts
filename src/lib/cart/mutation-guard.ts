/**
 * Whether a cart mutation that is already in flight may still apply its result.
 *
 * Lifted out of `CartContext` for the same reason as `resolveCartHydration`
 * next door, and for the same bug: that helper owns the READ side of an
 * account change (which branch the hydration effect takes), this one owns the
 * WRITE side (whether an in-flight mutation may still touch state, or go out on
 * the wire at all). The write side was left inline when the read side was
 * lifted; this finishes it.
 *
 * Why lift it rather than test it in place: `CartContext` *imports* cleanly in
 * the node environment, but reaching this decision means rendering the provider
 * and driving a mutation through it, and rendering it unmocked throws
 * `[next-auth]: useSession must be wrapped in a <SessionProvider />` (measured,
 * not assumed). So it needs a DOM, a session stub and a driven interaction — to
 * check a comparison of four values. The runner CAN reach `.tsx` client
 * components; capability was never the obstacle, cost is.
 * (An earlier draft of this comment said the suite "cannot reach"
 * `CartContext.tsx` because it collects only `*.test.ts` against node. Wrong
 * on both counts — the glob covers `*.test.tsx`, a jsdom tier exists via a
 * per-file docblock, and `icons.test.ts` renders `.tsx` components in node.
 * The same stale claim sits in `hydration.ts` and is corrected there too.)
 *
 * That the inline version was unchecked was measured, not assumed: making the
 * identity comparison vacuous (`owner === owner`, so nothing is orphaned)
 * passed typecheck, all 1199 tests and lint. Deleting the comparison outright
 * is caught, but only incidentally, by the unused-variable rule noticing the
 * orphaned binding — not by anything that knows what the guard is for.
 */

export type CartMutationGuardInput = {
  /** Sequence number stamped on this mutation when it was dispatched. */
  seq: number;
  /** The provider's sequence counter as it stands now. */
  currentSeq: number;
  /**
   * Session user id captured when this mutation was dispatched. Empty string
   * for a guest.
   */
  owner: string;
  /** The session user id signed in now. */
  currentOwner: string;
};

/**
 * True only when this mutation is both the newest one AND still belongs to the
 * account that dispatched it.
 *
 * Both halves are load-bearing, for different reasons, and neither implies the
 * other:
 *
 * - **Recency** stops an older click's echo landing on top of a newer one.
 * - **Identity** stops the previous account's work touching the new account's
 *   cart. Recency alone cannot do this: a hydration does not advance the
 *   sequence counter, so after an account change the previous account's
 *   mutation is still "newest" and would apply its echo — or revert to its
 *   pre-click snapshot — indefinitely. Reproduced both ways on 2026-08-02.
 *
 * The identity half also gates whether a queued task is *sent*, not just
 * whether its result is applied. `credentials: 'include'` would put a
 * still-queued request on the new account's cookie and durably write the
 * previous account's product into their server cart — which is what checkout
 * charges from. That is the most serious failure this guard prevents.
 */
export function isCartMutationCurrent({
  seq,
  currentSeq,
  owner,
  currentOwner,
}: CartMutationGuardInput): boolean {
  return seq === currentSeq && owner === currentOwner;
}

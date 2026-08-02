/**
 * Which branch the cart provider's hydration effect should take.
 *
 * Lifted out of `CartContext` because the decision is where a real bug lived:
 * the effect keyed on auth *status* and on whether a user existed, but not on
 * *which* user — so changing account in place (no reload) left the previous
 * account's lines on screen indefinitely. `CartContext.tsx` cannot be tested
 * here (Vitest runs `environment: 'node'` and collects only `*.test.ts`), and
 * this is the part of it worth pinning.
 */

export type CartHydrationInput = {
  /** Auth status from the previous run of the effect. */
  prevStatus: 'loading' | 'authenticated' | 'unauthenticated';
  status: 'loading' | 'authenticated' | 'unauthenticated';
  /**
   * Whether the session actually carries a user. Distinct from `status`: after
   * an admin soft-delete the cookie stays valid (`authenticated`) but the
   * session has no user, and every `/api/cart` call would 401 in a loop. That
   * shape is treated as a guest.
   */
  hasUser: boolean;
  /** Session user id from the previous run — empty string when there was none. */
  prevUserId: string;
  userId: string;
};

export type CartHydrationAction =
  /** Session still resolving — do nothing yet. */
  | 'wait'
  /** Signed in from a guest session: fold the local cart into the server one. */
  | 'merge'
  /** Same account as before: refresh from the server. */
  | 'fetch'
  /** A *different* account than before: drop the old lines, then fetch. */
  | 'switch'
  /** No usable user: read the guest cart out of local storage. */
  | 'guest';

export function resolveCartHydration({
  prevStatus,
  status,
  hasUser,
  prevUserId,
  userId,
}: CartHydrationInput): CartHydrationAction {
  if (status === 'loading') return 'wait';

  if (status === 'authenticated' && hasUser) {
    // Merge runs only on a genuine guest→signed-in transition. A hard refresh
    // while already signed in starts `prevStatus` at 'loading', which falls
    // through to a plain fetch — there is no guest cart to merge in that case.
    if (prevStatus === 'unauthenticated') return 'merge';

    // Account changed without a reload. `prevUserId` is empty on the first run
    // after mount, which is a fetch rather than a switch: there are no previous
    // lines on screen to belong to anyone.
    //
    // An *incoming* empty id counts as a switch rather than being excluded.
    // `userId` is optional on the session type, so "has a user, but no id" is a
    // shape the auth layer already guards for. Reading an unknown id as "same
    // account" would leave the previous account's lines up; reading it as
    // "different" costs at most one redundant clear-and-refetch. Fail safe.
    if (prevUserId && prevUserId !== userId) return 'switch';

    return 'fetch';
  }

  return 'guest';
}

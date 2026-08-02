import { describe, it, expect } from 'vitest';

import {
  resolveCartHydration,
  type CartHydrationInput,
} from '@/lib/cart/hydration';

const base: CartHydrationInput = {
  prevStatus: 'authenticated',
  status: 'authenticated',
  hasUser: true,
  prevUserId: 'user-a',
  userId: 'user-a',
};

const resolve = (over: Partial<CartHydrationInput> = {}) =>
  resolveCartHydration({ ...base, ...over });

describe('resolveCartHydration', () => {
  it('waits while the session is still resolving', () => {
    expect(resolve({ status: 'loading' })).toBe('wait');
  });

  it('waits on the very first render, before the session has resolved', () => {
    // The state every page load starts in. Reading local storage here instead
    // would flash a guest cart at a signed-in customer before their real one
    // arrives — the mismatch the provider's empty-first-paint rule avoids.
    expect(
      resolve({
        prevStatus: 'loading',
        status: 'loading',
        hasUser: false,
        prevUserId: '',
        userId: '',
      }),
    ).toBe('wait');
  });

  it('merges the guest cart on a genuine sign-in', () => {
    expect(resolve({ prevStatus: 'unauthenticated', prevUserId: '' })).toBe(
      'merge',
    );
  });

  it('fetches — not merges — on a hard refresh while already signed in', () => {
    // `prevStatus` starts at 'loading' on mount; there is no guest cart to fold
    // in, and merging would double-count.
    expect(resolve({ prevStatus: 'loading', prevUserId: '' })).toBe('fetch');
  });

  it('fetches when the same account re-runs the effect', () => {
    expect(resolve()).toBe('fetch');
  });

  it('drops to the guest cart when the customer signs out', () => {
    expect(
      resolve({ status: 'unauthenticated', hasUser: false, userId: '' }),
    ).toBe('guest');
  });

  it('treats a tombstoned session (authenticated, no user) as a guest', () => {
    // After an admin soft-delete the cookie stays valid but the session carries
    // no user. Fetching would 401 in a loop.
    expect(resolve({ hasUser: false, userId: '' })).toBe('guest');
  });

  // The regression this module exists for. Reproduced in a browser on
  // 2026-08-01: signed in as the demo admin, whose server cart is empty, the
  // demo customer's line stayed on screen across 40 sampled frames because the
  // effect never re-ran — status and hasUser were unchanged.
  it('switches accounts in place, or the previous customer\'s lines stay on screen', () => {
    expect(resolve({ prevUserId: 'user-a', userId: 'user-b' })).toBe('switch');
  });

  it('switches when the incoming session has a user but no id', () => {
    // `userId` is optional on the session type. Reading an unknown id as "same
    // account" would keep the previous account's lines up; treating it as a
    // change costs at most one redundant clear-and-refetch.
    expect(resolve({ prevUserId: 'user-a', userId: '' })).toBe('switch');
  });

  it('does not treat the first run after mount as a switch', () => {
    // No previous lines are on screen to belong to anyone.
    expect(resolve({ prevUserId: '', userId: 'user-b' })).toBe('fetch');
  });

  it('folds the guest cart in when signing in as a different account', () => {
    // Signing in as B while A's id lingers is still a guest→auth transition:
    // the guest cart must be folded in, and the merge refetches anyway.
    expect(
      resolve({
        prevStatus: 'unauthenticated',
        prevUserId: 'user-a',
        userId: 'user-b',
      }),
    ).toBe('merge');
  });
});

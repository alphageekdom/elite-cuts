import { describe, expect, it } from 'vitest';

import { isCartMutationCurrent } from './mutation-guard';

// ── What this covers ────────────────────────────────────────────────────
//
// The decision that stops one shopper's cart mutation touching another
// shopper's cart. Until this file it lived as an inline closure inside a
// 760-line client component, where nothing could reach it — measured, not
// assumed: making the identity comparison vacuous (`owner === owner`, so no
// binding is orphaned) passed typecheck, all 1199 tests and lint. Deleting the
// comparison outright is caught only incidentally, by the unused-variable rule
// noticing the orphaned `owner` const.
//
// What it protects, from 2026-08-02: a queued request going out under the next
// person's credentials and durably writing the previous person's product into
// their server cart — which is what checkout charges from. Reproduced against a
// real database, fixed, verified once by hand, never given a regression test
// until now.
//
// The two halves are tested independently on purpose. Each is sufficient on its
// own to make the guard wrong, and a suite that only exercised "both differ"
// would pass against a guard collapsed to either half alone — which is exactly
// the shape of the mutation that survived.

const current = (
  over: Partial<Parameters<typeof isCartMutationCurrent>[0]> = {},
) =>
  isCartMutationCurrent({
    seq: 3,
    currentSeq: 3,
    owner: 'user-a',
    currentOwner: 'user-a',
    ...over,
  });

describe('isCartMutationCurrent — the ordinary case', () => {
  it('lets the newest mutation from the signed-in account apply', () => {
    expect(current()).toBe(true);
  });

  it('lets a guest mutation apply, with an empty id on both sides', () => {
    // Guests carry an empty owner. The comparison has to treat that as a real
    // identity rather than as "unknown", or the guest cart could never mutate.
    expect(current({ owner: '', currentOwner: '' })).toBe(true);
  });
});

describe('isCartMutationCurrent — recency', () => {
  // Two fast stepper clicks. The older one must not repaint over the newer.
  it('rejects a mutation a later one has superseded', () => {
    expect(current({ seq: 2, currentSeq: 3 })).toBe(false);
  });

  // Defensive rather than reachable — the counter only increments — but a
  // guard that read `>=` or `<=` instead of `===` would let it through, and
  // nothing else in the file would notice.
  it('rejects a sequence ahead of the counter', () => {
    expect(current({ seq: 4, currentSeq: 3 })).toBe(false);
  });
});

describe('isCartMutationCurrent — identity', () => {
  // THE bug. Recency alone cannot catch this: a hydration does not advance the
  // sequence counter, so after an account change the previous account's
  // mutation is still the newest one.
  it('rejects a mutation whose account has been signed out from under it', () => {
    expect(
      current({
        seq: 3,
        currentSeq: 3,
        owner: 'user-a',
        currentOwner: 'user-b',
      }),
    ).toBe(false);
  });

  it('rejects a signed-in mutation once the session has dropped to a guest', () => {
    expect(current({ owner: 'user-a', currentOwner: '' })).toBe(false);
  });

  // The direction that wipes a real cart rather than filling one: work started
  // as a guest must not land on the account that just signed in.
  it('rejects a guest mutation once an account has signed in', () => {
    expect(current({ owner: '', currentOwner: 'user-a' })).toBe(false);
  });
});

describe('isCartMutationCurrent — neither half is redundant', () => {
  // These two are the whole reason the halves are tested apart. Each row is
  // rejected by exactly ONE half, so a guard collapsed to the other half alone
  // returns true and the test fails. A suite that only checked "both differ"
  // would pass against both collapses.
  it('rejects on recency alone, with the account unchanged', () => {
    expect(
      current({
        seq: 1,
        currentSeq: 2,
        owner: 'user-a',
        currentOwner: 'user-a',
      }),
    ).toBe(false);
  });

  it('rejects on identity alone, with the sequence unchanged', () => {
    expect(
      current({
        seq: 2,
        currentSeq: 2,
        owner: 'user-a',
        currentOwner: 'user-b',
      }),
    ).toBe(false);
  });

  it('rejects when both differ', () => {
    expect(
      current({
        seq: 1,
        currentSeq: 2,
        owner: 'user-a',
        currentOwner: 'user-b',
      }),
    ).toBe(false);
  });
});

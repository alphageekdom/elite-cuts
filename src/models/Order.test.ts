import { describe, expect, it } from 'vitest';

import Order from './Order';

// One assertion, guarding one silent failure mode that nothing else can see.
//
// `guestOrderClaimFilter` decides which ownerless orders a newly-registered
// email may claim, and its `anonymisedAt: null` clause is what stops a purged
// customer's order history being inherited by anyone who registers their email.
//
// Mongoose runs with `strictQuery: true` (src/config/database.ts). That strips
// filter keys which are not declared schema paths — silently, at cast time. So
// deleting `anonymisedAt` from the schema does not break the filter loudly; it
// removes the clause from every query while leaving the key plainly visible in
// the source, restoring the exact takeover the field exists to prevent.
//
// `claim-guest.test.ts` cannot catch this: it mocks the model and asserts on the
// plain object handed to `updateMany`, so it never observes what Mongoose does
// with that object afterwards. Hence a test against the real schema.
describe('Order schema — preconditions other code depends on', () => {
  it('declares anonymisedAt, without which strictQuery silently drops the claim exclusion', () => {
    expect(Order.schema.path('anonymisedAt')).toBeDefined();
  });
});

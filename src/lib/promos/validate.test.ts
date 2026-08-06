import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── What this covers ────────────────────────────────────────────────────
//
// `validatePromo`, which had no test of any kind. Four mutations — accepting
// expired promos, accepting exhausted ones, never blocking a first-order-only
// code, and ignoring the `maxDiscount` cap — each survived the entire 1151-test
// suite before this file existed.
//
// It is the single source of truth for promo eligibility BY DESIGN: the apply
// endpoint calls it so the checkout chip can answer, and order placement calls
// it again so a tampered client-side discount cannot land. Both entry points
// share it precisely so the rules cannot drift, which makes the rules worth
// pinning in one place rather than at each caller.
//
// `MEMBER_DISCOUNT_RATE` is deliberately NOT mocked — the percent-promo base
// depends on it, and a stubbed rate would let this file agree with itself while
// disagreeing with what checkout charges.

vi.mock('server-only', () => ({}));
vi.mock('@/config/database', () => ({ default: vi.fn(async () => undefined) }));

const mocks = vi.hoisted(() => ({
  promoFindOne: vi.fn(),
  orderCountDocuments: vi.fn(),
}));

vi.mock('@/models/Promo', () => ({ default: { findOne: mocks.promoFindOne } }));
vi.mock('@/models/Order', () => ({ default: { countDocuments: mocks.orderCountDocuments } }));

import { validatePromo } from './validate';

// A live, unrestricted 10%-off code. Each test overrides only the field it is
// about, so an unrelated rule tightening cannot quietly make a test vacuous.
const promo = (over: Record<string, unknown> = {}) => ({
  _id: 'promo-1',
  code: 'TENOFF',
  type: 'percent',
  value: 10,
  isActive: true,
  usageCount: 0,
  ...over,
});

const HOUR = 3_600_000;
const past = (ms = HOUR) => new Date(Date.now() - ms);
const future = (ms = HOUR) => new Date(Date.now() + ms);

beforeEach(() => {
  Object.values(mocks).forEach((fn) => fn.mockReset());
  mocks.promoFindOne.mockResolvedValue(promo());
  mocks.orderCountDocuments.mockResolvedValue(0);
});

const validate = (over: Record<string, unknown> = {}) =>
  validatePromo({ code: 'TENOFF', subtotalCents: 10_000, ...over } as never);

describe('validatePromo — finding the code', () => {
  it('rejects a code that does not exist', async () => {
    mocks.promoFindOne.mockResolvedValue(null);
    await expect(validate()).resolves.toEqual({ valid: false, reason: 'not_found' });
  });

  it('rejects a blank code without hitting the database', async () => {
    await expect(validate({ code: '   ' })).resolves.toEqual({
      valid: false,
      reason: 'not_found',
    });
    expect(mocks.promoFindOne).not.toHaveBeenCalled();
  });

  // Customers type codes off a printed card in whatever case they like; the
  // stored code is upper-case.
  it('normalises case and surrounding space before looking up', async () => {
    await validate({ code: '  tenoff  ' });
    expect(mocks.promoFindOne).toHaveBeenCalledWith({ code: 'TENOFF' });
  });

  it('rejects a disabled code', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ isActive: false }));
    await expect(validate()).resolves.toEqual({ valid: false, reason: 'disabled' });
  });
});

describe('validatePromo — the active window', () => {
  it('rejects a campaign that has not started', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ startsAt: future() }));
    await expect(validate()).resolves.toEqual({ valid: false, reason: 'not_started' });
  });

  it('rejects a campaign that has ended', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ endsAt: past() }));
    await expect(validate()).resolves.toEqual({ valid: false, reason: 'expired' });
  });

  it('accepts a campaign inside its window', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ startsAt: past(), endsAt: future() }));
    await expect(validate()).resolves.toMatchObject({ valid: true });
  });

  // `not_started` and `expired` are distinct reasons because the customer-facing
  // messages differ — one is "come back later", the other is "this is over".
  it('distinguishes not-yet-started from expired', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ startsAt: future() }));
    const early = await validate();
    mocks.promoFindOne.mockResolvedValue(promo({ endsAt: past() }));
    const late = await validate();

    expect([early, late]).toEqual([
      { valid: false, reason: 'not_started' },
      { valid: false, reason: 'expired' },
    ]);
  });

  it('treats an absent window as always-on', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ startsAt: undefined, endsAt: undefined }));
    await expect(validate()).resolves.toMatchObject({ valid: true });
  });
});

describe('validatePromo — the global usage limit', () => {
  it('rejects a code whose seats are gone', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ usageLimit: 5, usageCount: 5 }));
    await expect(validate()).resolves.toEqual({ valid: false, reason: 'exhausted' });
  });

  it('accepts a code with one seat left', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ usageLimit: 5, usageCount: 4 }));
    await expect(validate()).resolves.toMatchObject({ valid: true });
  });

  it('treats a missing limit as unlimited', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ usageLimit: undefined, usageCount: 9999 }));
    await expect(validate()).resolves.toMatchObject({ valid: true });
  });

  // The two limit fields read a stored 0 in OPPOSITE directions, and nothing
  // says so at either site: `usageLimit: 0` is exhausted (no `> 0` guard, so
  // `0 >= 0` holds), while `perCustomerLimit: 0` is uncapped (it has one).
  // Neither is reachable through the admin form — the schema makes both
  // `positive()` — so this is about legacy documents, seeds and direct writes.
  //
  // Pinned because it is the one case that distinguishes the `!= null` check
  // from a truthiness check. With only the `undefined` test above, rewriting it
  // as `promo.usageLimit &&` passes every test in this file.
  it('treats a stored limit of 0 as exhausted, not as unlimited', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ usageLimit: 0, usageCount: 0 }));
    await expect(validate()).resolves.toEqual({ valid: false, reason: 'exhausted' });
  });
});

describe('validatePromo — the minimum subtotal', () => {
  it('rejects a basket below the minimum', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ minSubtotal: 5_000 }));
    await expect(validate({ subtotalCents: 4_999 })).resolves.toEqual({
      valid: false,
      reason: 'min_subtotal',
    });
  });

  it('accepts a basket exactly at the minimum', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ minSubtotal: 5_000 }));
    await expect(validate({ subtotalCents: 5_000 })).resolves.toMatchObject({ valid: true });
  });
});

// Two independent rules, each fixed for its own reason. Both hang off the same
// customer key and both count only PAID, non-cancelled orders.
describe('validatePromo — firstOrderOnly', () => {
  it('rejects a customer who already has a paid order', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ firstOrderOnly: true }));
    mocks.orderCountDocuments.mockResolvedValue(1);

    await expect(validate({ userId: 'user-1' })).resolves.toEqual({
      valid: false,
      reason: 'first_order_only',
    });
  });

  it('accepts a genuine first-time customer', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ firstOrderOnly: true }));
    await expect(validate({ userId: 'user-1' })).resolves.toMatchObject({ valid: true });
  });

  // A paid-then-cancelled first order used to block first-order codes forever,
  // even though its promo seat had already gone back to the pool.
  it('does not count a cancelled order as a prior order', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ firstOrderOnly: true }));
    await validate({ userId: 'user-1' });

    expect(mocks.orderCountDocuments).toHaveBeenCalledWith({
      user: 'user-1',
      isPaid: true,
      orderStatus: { $ne: 'Cancelled' },
    });
  });
});

describe('validatePromo — perCustomerLimit', () => {
  it('rejects a customer at their personal cap', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ perCustomerLimit: 2 }));
    mocks.orderCountDocuments.mockResolvedValue(2);

    await expect(validate({ userId: 'user-1' })).resolves.toEqual({
      valid: false,
      reason: 'customer_limit',
    });
  });

  it('accepts a customer below their cap', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ perCustomerLimit: 2 }));
    mocks.orderCountDocuments.mockResolvedValue(1);

    await expect(validate({ userId: 'user-1' })).resolves.toMatchObject({ valid: true });
  });

  // An abandoned checkout leaves an unpaid Pending order. Counting it would
  // strand the customer: the code they never actually used would be spent.
  it('counts only paid, non-cancelled orders carrying this promo', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ perCustomerLimit: 2 }));
    await validate({ userId: 'user-1' });

    expect(mocks.orderCountDocuments).toHaveBeenCalledWith({
      user: 'user-1',
      promoId: 'promo-1',
      isPaid: true,
      orderStatus: { $ne: 'Cancelled' },
    });
  });

  // The mirror of the `usageLimit` case above, and the opposite answer: this
  // field HAS a `> 0` guard, so a stored 0 reads as uncapped. Also unreachable
  // through the form (the schema makes it `positive()`), so this is legacy and
  // seeded documents only.
  it('treats a cap of zero as no cap, matching an unset one', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ perCustomerLimit: 0 }));
    mocks.orderCountDocuments.mockResolvedValue(99);

    await expect(validate({ userId: 'user-1' })).resolves.toMatchObject({ valid: true });
  });
});

describe('validatePromo — who the customer is', () => {
  it('keys a signed-in customer on their account', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ perCustomerLimit: 1 }));
    await validate({ userId: 'user-1', guestEmail: 'someone@else.test' });

    // The account wins outright — a guest email alongside it is ignored, so a
    // signed-in customer cannot buy a second allowance by typing a new address.
    expect(mocks.orderCountDocuments.mock.calls[0][0]).toMatchObject({ user: 'user-1' });
    expect(JSON.stringify(mocks.orderCountDocuments.mock.calls[0][0])).not.toContain(
      'someone@else.test',
    );
  });

  // Guests used to skip both caps entirely, so an uncapped first-order-only
  // code could be redeemed by guests as often as they liked.
  it('keys a guest on the checkout email, lower-cased', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ perCustomerLimit: 1 }));
    await validate({ userId: null, guestEmail: '  Guest@Example.COM ' });

    expect(mocks.orderCountDocuments.mock.calls[0][0]).toMatchObject({
      'guestContact.email': 'guest@example.com',
    });
  });

  // Deliberate: deletion clears the address and notes but KEEPS
  // `guestContact.email`, and a purged customer's past redemption was still a
  // real redemption. Forgetting it would hand a fresh allowance to anyone who
  // deletes their account — so a privacy sweep must not "fix" this.
  it('still counts orders left behind by deleted accounts', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ perCustomerLimit: 1 }));
    mocks.orderCountDocuments.mockResolvedValue(1);

    await expect(
      validate({ userId: null, guestEmail: 'gone@example.com' }),
    ).resolves.toEqual({ valid: false, reason: 'customer_limit' });
  });

  // Nothing identifies this shopper, so there is no key to count against. The
  // global usage limit is the only thing still bounding the code.
  it('skips the per-customer caps entirely when nothing identifies the shopper', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ perCustomerLimit: 1, firstOrderOnly: true }));
    const result = await validate({ userId: null, guestEmail: null });

    expect(result).toMatchObject({ valid: true });
    expect(mocks.orderCountDocuments).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only guest email as no key at all', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ perCustomerLimit: 1 }));
    await validate({ userId: null, guestEmail: '   ' });

    expect(mocks.orderCountDocuments).not.toHaveBeenCalled();
  });
});

describe('validatePromo — the discount', () => {
  it('takes a percentage of the subtotal for a guest', async () => {
    const result = await validate({ subtotalCents: 10_000 });
    expect(result).toMatchObject({ valid: true, discountCents: 1_000 });
  });

  it('subtracts a fixed amount in cents', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ type: 'fixed', value: 750 }));
    await expect(validate({ subtotalCents: 10_000 })).resolves.toMatchObject({
      discountCents: 750,
    });
  });

  it('never lets a fixed promo exceed the basket', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ type: 'fixed', value: 50_000 }));
    await expect(validate({ subtotalCents: 10_000 })).resolves.toMatchObject({
      discountCents: 10_000,
    });
  });

  it('caps a percentage promo at maxDiscount', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ value: 50, maxDiscount: 2_000 }));
    await expect(validate({ subtotalCents: 10_000 })).resolves.toMatchObject({
      discountCents: 2_000,
    });
  });

  it('leaves a percentage promo alone when the cap does not bite', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ value: 10, maxDiscount: 2_000 }));
    await expect(validate({ subtotalCents: 10_000 })).resolves.toMatchObject({
      discountCents: 1_000,
    });
  });

  // A member's 5% comes off first, so the promo takes its cut of the reduced
  // figure. Applying both to the full subtotal would discount the same dollars
  // twice: 10% of 10000 is 1000, but 10% of the post-member 9500 is 950.
  it('takes its cut after the member discount for a signed-in member', async () => {
    await expect(validate({ subtotalCents: 10_000, isMember: true })).resolves.toMatchObject(
      { discountCents: 950 },
    );
  });

  it('uses the full subtotal when the promo excludes the member discount', async () => {
    mocks.promoFindOne.mockResolvedValue(promo({ excludesMember: true }));
    await expect(validate({ subtotalCents: 10_000, isMember: true })).resolves.toMatchObject(
      { discountCents: 1_000 },
    );
  });

  it('hands back the promo document so the caller can read its stacking flags', async () => {
    mocks.promoFindOne.mockResolvedValue(
      promo({ excludesPoints: true, excludesMember: false }),
    );
    const result = await validate();

    if (!result.valid) throw new Error('expected valid');
    expect(result.promo).toMatchObject({ code: 'TENOFF', excludesPoints: true });
  });
});

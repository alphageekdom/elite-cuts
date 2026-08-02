import { beforeEach, describe, expect, it, vi } from 'vitest';

// Tests the query `claimGuestOrdersForUser` actually runs, not the shape of a
// helper it happens to call. The distinction is the whole point: an earlier
// version of these tests asserted only on `guestOrderClaimFilter`'s return
// value, so reverting the call site to the old inline filter restored the
// takeover with a fully passing suite. Mutation-tested — see each case.

const mocks = vi.hoisted(() => ({
  orderUpdateMany: vi.fn(),
}));

vi.mock('@/config/database', () => ({ default: vi.fn(async () => undefined) }));
vi.mock('@/models/Order', () => ({
  default: { updateMany: mocks.orderUpdateMany },
}));

const { claimGuestOrdersForUser } = await import('./claim-guest');

const filterFor = async (email: string) => {
  await claimGuestOrdersForUser('65f000000000000000000001', email);
  return mocks.orderUpdateMany.mock.calls[0][0];
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.orderUpdateMany.mockResolvedValue({
    matchedCount: 0,
    modifiedCount: 0,
  });
});

describe('claimGuestOrdersForUser — the query it ships', () => {
  it('excludes anonymised orders — the takeover this exists to stop', async () => {
    // `hardDeleteUser` leaves `user: null` plus the departing customer's real
    // email in `guestContact`, which is byte-identical to a genuine guest
    // checkout. Without this clause, registering a purged customer's email
    // inherited their whole order history. There is no email verification
    // anywhere in this app.
    expect(await filterFor('ada@example.com')).toHaveProperty(
      'anonymisedAt',
      null,
    );
  });

  it('never claims an order that already has an owner', async () => {
    expect((await filterFor('ada@example.com')).user).toBeNull();
  });

  it('normalises the email before matching', async () => {
    // Guest emails are stored lowercased (Order schema, `guestContact.email`
    // carries `lowercase: true`). A register form that captured "Ada@..." must
    // still find the order, or a legitimate guest silently loses their history.
    // Nothing covered this before — it lived on the far side of the split.
    const filter = await filterFor('  Ada@Example.COM  ');
    expect(filter['guestContact.email']).toBe('ada@example.com');
  });

  it('carries exactly three clauses, so a fourth cannot appear unnoticed', async () => {
    expect(Object.keys(await filterFor('ada@example.com')).sort()).toEqual([
      'anonymisedAt',
      'guestContact.email',
      'user',
    ]);
  });

  it('uses a literal null, which Mongoose would strip if it were undefined', async () => {
    // Mongoose drops `undefined` values from query conditions at `getFilter()`
    // time, so `anonymisedAt: undefined` would not narrow the query at all — it
    // would silently restore the exact filter that shipped the takeover, with
    // the key still visibly present in the source.
    //
    // This is NOT `strictQuery`, which an earlier version of this comment
    // claimed. Stripping reproduces identically with `strictQuery: false`;
    // `strictQuery` governs unknown *schema paths*, not undefined values. The
    // hazard is real, the mechanism was misattributed.
    expect((await filterFor('ada@example.com')).anonymisedAt).toBeNull();
  });

  it('only ever sets the owner, never touches order contents', async () => {
    await claimGuestOrdersForUser(
      '65f000000000000000000001',
      'ada@example.com',
    );
    const [, update] = mocks.orderUpdateMany.mock.calls[0];
    expect(update).toEqual({ $set: { user: '65f000000000000000000001' } });
  });
});

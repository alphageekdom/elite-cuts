import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { addMonths } from '@/lib/rewards/calculator';
import { DORMANCY_FOLLOWUP_DAYS } from '@/lib/auth/account-deletion-constants';

// The job pulls in `connectDB`, four Mongoose models and the account-deletion
// helper, none of which run outside a live DB — so each is stubbed and the
// assertions are made on the call arguments, the same pattern
// `lib/demo/reset.test.ts` and `lib/demo/exclude.test.ts` established.
vi.mock('@/config/database', () => ({ default: vi.fn(async () => undefined) }));

const mocks = vi.hoisted(() => ({
  settingsFindOne: vi.fn(),
  userFind: vi.fn(),
  userUpdateMany: vi.fn(),
  userUpdateOne: vi.fn(),
  auditCreate: vi.fn(),
  softDeleteUser: vi.fn(),
}));

vi.mock('@/models/ShopSettings', () => ({
  default: { findOne: mocks.settingsFindOne },
}));
vi.mock('@/models/User', () => ({
  default: {
    find: mocks.userFind,
    updateMany: mocks.userUpdateMany,
    updateOne: mocks.userUpdateOne,
  },
}));
vi.mock('@/models/AccountDeletionAudit', () => ({
  default: { create: mocks.auditCreate },
}));
vi.mock('@/lib/auth/account-deletion', () => ({
  softDeleteUser: mocks.softDeleteUser,
}));

const selectLeanChain = (result: unknown) => ({
  select: () => ({ lean: async () => result }),
});

// Frozen so every cutoff assertion is exact. The suite runs under three
// timezones (`npm run test:tz`); month arithmetic is zone-robust in a way day
// arithmetic is not, and these assertions derive their expectations from the
// same helper the job uses rather than hard-coding a date.
const NOW = new Date('2026-07-31T12:00:00.000Z');

type StubUser = { _id: string; email: string };

const user = (id: string, email = `${id}@example.invalid`): StubUser => ({
  _id: id,
  email,
});

function stubHappyPath({
  threshold = 18,
  toWarn = [],
  toSoftDelete = [],
}: {
  threshold?: number;
  toWarn?: StubUser[];
  toSoftDelete?: StubUser[];
} = {}) {
  mocks.settingsFindOne.mockReturnValue(
    selectLeanChain({ dormancyWarningMonths: threshold }),
  );
  mocks.userUpdateMany.mockResolvedValue({ modifiedCount: 0 });
  mocks.userUpdateOne.mockResolvedValue({ modifiedCount: 1 });
  mocks.auditCreate.mockResolvedValue({});
  mocks.softDeleteUser.mockResolvedValue({ deletionScheduledFor: NOW });
  mocks.userFind
    .mockReturnValueOnce(selectLeanChain(toWarn))
    .mockReturnValueOnce(selectLeanChain(toSoftDelete));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('runDormancyScan — the kill switch', () => {
  // `0` is the documented way for a shop to opt out of auto-deleting inactive
  // customers. A regression here silently starts destroying accounts at a shop
  // that turned the feature off, which is the highest-consequence failure on
  // this surface and the cheapest to guard.
  it('writes nothing at all when the threshold is 0', async () => {
    mocks.settingsFindOne.mockReturnValue(
      selectLeanChain({ dormancyWarningMonths: 0 }),
    );
    const { runDormancyScan } = await import('./dormancyScan');
    const result = await runDormancyScan(NOW);

    expect(result).toEqual({
      thresholdMonths: 0,
      warned: 0,
      softDeleted: 0,
      failed: 0,
    });
    expect(mocks.userUpdateMany).not.toHaveBeenCalled();
    expect(mocks.userFind).not.toHaveBeenCalled();
    expect(mocks.userUpdateOne).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
    expect(mocks.softDeleteUser).not.toHaveBeenCalled();
  });

  it('falls back to 18 months when no settings document exists', async () => {
    stubHappyPath();
    mocks.settingsFindOne.mockReturnValue(selectLeanChain(null));
    const { runDormancyScan } = await import('./dormancyScan');
    const result = await runDormancyScan(NOW);
    expect(result.thresholdMonths).toBe(18);
  });
});

describe('runDormancyScan — the lastActiveAt backfill', () => {
  // The single highest-value assertion on this surface. Mongoose throws
  // *synchronously* on an array-shaped update without this option, which would
  // abort the scan at its first statement — before anyone is warned — while
  // the cron route still answered 200. Losing the option is a one-character
  // edit with no other symptom.
  it('passes updatePipeline so the aggregation-pipeline update is accepted', async () => {
    stubHappyPath();
    const { runDormancyScan } = await import('./dormancyScan');
    await runDormancyScan(NOW);

    const [, update, options] = mocks.userUpdateMany.mock.calls[0];
    expect(update).toEqual([{ $set: { lastActiveAt: '$updatedAt' } }]);
    expect(options).toEqual({ updatePipeline: true });
  });

  it('excludes admin, demo and soft-deleted rows, matching both passes', async () => {
    stubHappyPath();
    const { runDormancyScan } = await import('./dormancyScan');
    await runDormancyScan(NOW);

    expect(mocks.userUpdateMany.mock.calls[0][0]).toEqual({
      lastActiveAt: null,
      isAdmin: { $ne: true },
      isDemo: { $ne: true },
      deletedAt: null,
    });
  });

  // The backfill runs before either pass and used to sit outside any try, so
  // one throw meant nobody was warned and nobody was soft-deleted.
  it('degrades to skipping legacy users rather than aborting the whole scan', async () => {
    stubHappyPath({ toWarn: [user('a')] });
    mocks.userUpdateMany.mockRejectedValue(new Error('pipeline rejected'));

    const { runDormancyScan } = await import('./dormancyScan');
    const result = await runDormancyScan(NOW);

    expect(result.failed).toBe(1);
    expect(result.warned).toBe(1);
    expect(mocks.auditCreate).toHaveBeenCalledOnce();
  });
});

describe('runDormancyScan — pass filters', () => {
  it('warns only dormant, active, non-admin, non-demo accounts', async () => {
    stubHappyPath();
    const { runDormancyScan } = await import('./dormancyScan');
    await runDormancyScan(NOW);

    expect(mocks.userFind.mock.calls[0][0]).toEqual({
      isAdmin: { $ne: true },
      isDemo: { $ne: true },
      deletedAt: null,
      dormancyWarnedAt: null,
      lastActiveAt: { $lte: addMonths(NOW, -18) },
    });
  });

  it('soft-deletes only warned accounts past the follow-up window, still dormant', async () => {
    stubHappyPath();
    const { runDormancyScan } = await import('./dormancyScan');
    await runDormancyScan(NOW);

    const followupCutoff = new Date(
      NOW.getTime() - DORMANCY_FOLLOWUP_DAYS * 24 * 60 * 60 * 1000,
    );
    expect(mocks.userFind.mock.calls[1][0]).toEqual({
      isAdmin: { $ne: true },
      isDemo: { $ne: true },
      deletedAt: null,
      dormancyWarnedAt: { $lte: followupCutoff },
      // The re-check is redundant today but is the only thing that would stop
      // a returning customer being soft-deleted if a future path ever bumped
      // activity without clearing the warning.
      lastActiveAt: { $lte: addMonths(NOW, -18) },
    });
  });

  it('derives the cutoff from the threshold it read, not a hard-coded 18', async () => {
    stubHappyPath({ threshold: 24 });
    const { runDormancyScan } = await import('./dormancyScan');
    await runDormancyScan(NOW);

    expect(mocks.userFind.mock.calls[0][0].lastActiveAt).toEqual({
      $lte: addMonths(NOW, -24),
    });
  });

  // A user warned by pass A cannot be picked up by pass B in the same run:
  // both cutoffs derive from the same captured `now`, and the stamp is `now`
  // while pass B requires 30 days older.
  it('cannot warn and soft-delete the same account in one invocation', async () => {
    stubHappyPath({ toWarn: [user('a')] });
    const { runDormancyScan } = await import('./dormancyScan');
    await runDormancyScan(NOW);

    // Reads the value actually STAMPED, not the local `NOW` constant — the
    // property depends on the stamp being current, and comparing NOW against
    // NOW − 30d is true by arithmetic whatever the code writes.
    const stampedAt = mocks.userUpdateOne.mock.calls[0][1].$set.dormancyWarnedAt;
    const followupCutoff = mocks.userFind.mock.calls[1][0].dormancyWarnedAt.$lte;
    expect(stampedAt.getTime()).toBeGreaterThan(followupCutoff.getTime());
  });

  // The stamp is conditional so a customer who signs in between the list read
  // and their turn in the loop isn't marked Dormant right after a successful
  // sign-in. `warned` counts stamps that landed, not rows considered.
  it('re-states the eligibility conditions on the stamp itself', async () => {
    stubHappyPath({ toWarn: [user('a')] });
    const { runDormancyScan } = await import('./dormancyScan');
    await runDormancyScan(NOW);

    expect(mocks.userUpdateOne.mock.calls[0][0]).toEqual({
      _id: 'a',
      dormancyWarnedAt: null,
      lastActiveAt: { $lte: addMonths(NOW, -18) },
    });
  });

  it('does not count a warning whose stamp matched nothing', async () => {
    stubHappyPath({ toWarn: [user('a')] });
    mocks.userUpdateOne.mockResolvedValue({ modifiedCount: 0 });

    const { runDormancyScan } = await import('./dormancyScan');
    const result = await runDormancyScan(NOW);

    expect(result.warned).toBe(0);
    expect(result.failed).toBe(0);
  });
});

describe('runDormancyScan — the warn pass', () => {
  // M2. The stamp is what makes a user invisible to the next run, so stamping
  // before the audit row meant a failed audit write could never be retried:
  // warned, no `dormancy_warned` row, and soft-deleted 30 days later with an
  // audit trail that began mid-story. `hardDeleteUser` already ordered these
  // correctly and says why.
  it('writes the audit row before the stamp, so a failure is retryable', async () => {
    stubHappyPath({ toWarn: [user('a')] });
    const { runDormancyScan } = await import('./dormancyScan');
    await runDormancyScan(NOW);

    expect(mocks.auditCreate.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.userUpdateOne.mock.invocationCallOrder[0],
    );
  });

  it('leaves the user unstamped when the audit write fails', async () => {
    stubHappyPath({ toWarn: [user('a')] });
    mocks.auditCreate.mockRejectedValue(new Error('validation failed'));

    const { runDormancyScan } = await import('./dormancyScan');
    const result = await runDormancyScan(NOW);

    expect(mocks.userUpdateOne).not.toHaveBeenCalled();
    expect(result.warned).toBe(0);
    expect(result.failed).toBe(1);
  });

  it('isolates one failing user and keeps going', async () => {
    stubHappyPath({ toWarn: [user('a'), user('b'), user('c')] });
    mocks.auditCreate
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({});

    const { runDormancyScan } = await import('./dormancyScan');
    const result = await runDormancyScan(NOW);

    expect(result.warned).toBe(2);
    expect(result.failed).toBe(1);
  });
});

describe('runDormancyScan — the soft-delete pass', () => {
  it('routes each due user through softDeleteUser as the cron actor', async () => {
    stubHappyPath({ toSoftDelete: [user('a')] });
    const { runDormancyScan } = await import('./dormancyScan');
    const result = await runDormancyScan(NOW);

    expect(mocks.softDeleteUser).toHaveBeenCalledWith('a', {
      actor: 'cron',
      reason: 'dormancy',
    });
    expect(result.softDeleted).toBe(1);
  });

  it('isolates a failing soft-delete and counts it', async () => {
    stubHappyPath({ toSoftDelete: [user('a'), user('b')] });
    mocks.softDeleteUser
      .mockRejectedValueOnce(new Error('nope'))
      .mockResolvedValueOnce({ deletionScheduledFor: NOW });

    const { runDormancyScan } = await import('./dormancyScan');
    const result = await runDormancyScan(NOW);

    expect(result.softDeleted).toBe(1);
    expect(result.failed).toBe(1);
  });
});

describe('runDormancyScan — what reaches the response body', () => {
  // The result is spread into the cron route's JSON response. It used to carry
  // `{ userId, error }` pairs, so one request could hand a real customer's id
  // and the raw driver message — which routinely embeds the failing document —
  // to anyone holding the cron secret.
  it('reports a failure count, never the failing rows or driver text', async () => {
    stubHappyPath({ toWarn: [user('a', 'real.customer@example.invalid')] });
    mocks.auditCreate.mockRejectedValue(new Error('E11000 real.customer@example.invalid'));

    const { runDormancyScan } = await import('./dormancyScan');
    const result = await runDormancyScan(NOW);

    expect(result.failed).toBe(1);
    expect(JSON.stringify(result)).not.toContain('real.customer@example.invalid');
    expect(JSON.stringify(result)).not.toContain('E11000');
  });
});

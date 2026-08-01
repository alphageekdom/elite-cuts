import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks ────────────────────────────────────────────────────────
// account-deletion.ts pulls in `connectDB` and six Mongoose models, none of
// which run outside a live DB. These tests cover one thing: that
// `hardDeleteUser` reaches every collection holding the departing user's
// personal data.
//
// That list was wrong until the privacy-page pass audited it. `SavedCard`
// rows and `Review.helpfulVoters` entries both survived a purge — unreachable
// once the User doc was gone, so orphaned permanently. The Privacy page now
// states what deletion does, so these assertions are what keep that statement
// true: drop either cascade step and the matching test fails.
//
// What a real `deleteMany` clears in Mongo is out of scope until the project
// gains mongodb-memory-server; this pins the calls, not the driver.

vi.mock('@/config/database', () => ({
  default: vi.fn(async () => undefined),
}));

const mocks = vi.hoisted(() => ({
  userFindById: vi.fn(),
  userFind: vi.fn(),
  userFindOne: vi.fn(),
  userUpdateOne: vi.fn(),
  userDeleteOne: vi.fn(),
  orderUpdateMany: vi.fn(),
  reviewUpdateMany: vi.fn(),
  messageUpdateMany: vi.fn(),
  cartDeleteMany: vi.fn(),
  notificationDeleteMany: vi.fn(),
  savedCardDeleteMany: vi.fn(),
  auditCreate: vi.fn(),
  auditFindOne: vi.fn(),
}));

vi.mock('@/models/User', () => ({
  default: {
    findById: mocks.userFindById,
    find: mocks.userFind,
    findOne: mocks.userFindOne,
    updateOne: mocks.userUpdateOne,
    deleteOne: mocks.userDeleteOne,
  },
}));

vi.mock('@/models/Order', () => ({
  default: { updateMany: mocks.orderUpdateMany },
}));

vi.mock('@/models/Review', () => ({
  default: { updateMany: mocks.reviewUpdateMany },
}));

vi.mock('@/models/Message', () => ({
  default: { updateMany: mocks.messageUpdateMany },
}));

vi.mock('@/models/Cart', () => ({
  default: { deleteMany: mocks.cartDeleteMany },
}));

vi.mock('@/models/Notification', () => ({
  default: { deleteMany: mocks.notificationDeleteMany },
}));

vi.mock('@/models/SavedCard', () => ({
  default: { deleteMany: mocks.savedCardDeleteMany },
}));

vi.mock('@/models/AccountDeletionAudit', () => ({
  default: {
    create: mocks.auditCreate,
    findOne: mocks.auditFindOne,
  },
  ACCOUNT_DELETION_ACTIONS: [],
}));

import {
  clearDormancyWarning,
  hardDeleteUser,
  purgeDueSoftDeletes,
  restoreUser,
  softDeleteUser,
} from './account-deletion';
import { ACCOUNT_DELETION_GRACE_DAYS } from './account-deletion-constants';

const USER_ID = 'user-1';

beforeEach(() => {
  vi.clearAllMocks();

  mocks.userFindById.mockReturnValue({
    select: vi.fn(async () => ({
      _id: USER_ID,
      name: 'Dana Reyes',
      email: 'dana@example.com',
      phone: '619-555-0142',
      isAdmin: false,
      // Already soft-deleted: the cron path's normal state. The
      // admin-immediate path (deletedAt null) is exercised separately.
      deletedAt: new Date('2026-07-01T00:00:00Z'),
    })),
  });

  // The purge's pre-cascade re-check: due unless a test says otherwise.
  mocks.userFindOne.mockReturnValue({
    select: () => ({ lean: async () => ({ _id: USER_ID }) }),
  });
  mocks.userUpdateOne.mockResolvedValue({ modifiedCount: 1 });

  // No prior hard-delete audit row, so the dedupe guard lets the write through.
  mocks.auditFindOne.mockReturnValue({
    select: () => ({ lean: async () => null }),
  });

  mocks.orderUpdateMany.mockResolvedValue({ modifiedCount: 0 });
  mocks.reviewUpdateMany.mockResolvedValue({ modifiedCount: 0 });
  mocks.messageUpdateMany.mockResolvedValue({ modifiedCount: 0 });
  mocks.cartDeleteMany.mockResolvedValue({ deletedCount: 0 });
  mocks.notificationDeleteMany.mockResolvedValue({ deletedCount: 0 });
  mocks.savedCardDeleteMany.mockResolvedValue({ deletedCount: 0 });
  mocks.userDeleteOne.mockResolvedValue({ deletedCount: 1 });
  mocks.auditCreate.mockResolvedValue({});
});

describe('hardDeleteUser — personal-data cascade', () => {
  it('deletes the saved-card rows, which used to outlive the account', async () => {
    await hardDeleteUser(USER_ID, { actor: 'admin' });

    expect(mocks.savedCardDeleteMany).toHaveBeenCalledWith({ user: USER_ID });
  });

  it('pulls the user out of every review helpful-vote list', async () => {
    await hardDeleteUser(USER_ID, { actor: 'admin' });

    // Pulled, not deleted: the review belongs to someone else and survives.
    expect(mocks.reviewUpdateMany).toHaveBeenCalledWith(
      { helpfulVoters: USER_ID },
      { $pull: { helpfulVoters: USER_ID } },
    );
  });

  it('still clears the cart and notifications it always did', async () => {
    await hardDeleteUser(USER_ID, { actor: 'admin' });

    expect(mocks.cartDeleteMany).toHaveBeenCalledWith({ user: USER_ID });
    expect(mocks.notificationDeleteMany).toHaveBeenCalledWith({
      userId: USER_ID,
    });
  });

  it('deletes the user document last, once the children are gone', async () => {
    await hardDeleteUser(USER_ID, { actor: 'admin' });

    // The `deletedAt` condition is the last line of defence against a restore
    // that lands mid-cascade: the sign-in restore path writes with a
    // `deletedAt != null` precondition and stays legal right up until this
    // statement, so an unconditional delete would destroy an account seconds
    // after telling the customer their deletion was cancelled.
    expect(mocks.userDeleteOne).toHaveBeenCalledWith({
      _id: USER_ID,
      deletedAt: { $ne: null },
    });

    const cardOrder = mocks.savedCardDeleteMany.mock.invocationCallOrder[0];
    const userOrder = mocks.userDeleteOne.mock.invocationCallOrder[0];
    expect(cardOrder).toBeLessThan(userOrder);
  });

  // The admin "delete immediately" path arrives on a LIVE account. Without
  // this stamp a cascade that threw halfway left a sign-in-capable account
  // with its orders already detached and nothing that would ever retry —
  // the purge's due-query requires `deletedAt != null`.
  it('stamps soft-delete state first when deleting a live account, so a failed cascade self-heals', async () => {
    mocks.userFindById.mockReturnValue({
      select: vi.fn(async () => ({
        _id: USER_ID,
        name: 'Dana Reyes',
        email: 'dana@example.com',
        phone: '619-555-0142',
        isAdmin: false,
        deletedAt: null,
      })),
    });

    await hardDeleteUser(USER_ID, { actor: 'admin' });

    const [filter, update] = mocks.userUpdateOne.mock.calls[0];
    expect(filter).toEqual({ _id: USER_ID });
    expect(update.$set.deletedAt).toBeInstanceOf(Date);
    expect(update.$set.deletionScheduledFor).toBeInstanceOf(Date);
    // Before the first destructive step, or it buys nothing.
    expect(mocks.userUpdateOne.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.orderUpdateMany.mock.invocationCallOrder[0],
    );
  });

  it('does not re-stamp an account the purge already soft-deleted', async () => {
    await hardDeleteUser(USER_ID, { actor: 'cron' });
    expect(mocks.userUpdateOne).not.toHaveBeenCalled();
  });

  it('refuses to delete an admin account', async () => {
    mocks.userFindById.mockReturnValue({
      select: vi.fn(async () => ({ _id: USER_ID, isAdmin: true })),
    });

    await expect(hardDeleteUser(USER_ID, { actor: 'admin' })).rejects.toThrow(
      /Admin accounts cannot be deleted/,
    );
    expect(mocks.savedCardDeleteMany).not.toHaveBeenCalled();
  });
});

describe('hardDeleteUser — what stays on past orders', () => {
  // The privacy page says past orders keep "the name, email and phone that
  // were on them" and that "everything else goes". The order also carries a
  // delivery address and the customer's free-text note, and neither was being
  // touched — so a purged customer's home address sat on the order forever.
  // Nulling `user` additionally turns the row into a guest order, and the
  // confirmation page treats the order id as the access token for those.
  it('removes the delivery address and the order note', async () => {
    await hardDeleteUser(USER_ID, { actor: 'admin' });

    const [, update] = mocks.orderUpdateMany.mock.calls[0];
    expect(update.$unset).toEqual({ deliveryAddress: '', orderNotes: '' });
  });

  it('still snapshots the disclosed name, email and phone', async () => {
    await hardDeleteUser(USER_ID, { actor: 'admin' });

    const [filter, update] = mocks.orderUpdateMany.mock.calls[0];
    expect(filter).toEqual({ user: USER_ID });
    expect(update.$set).toMatchObject({
      user: null,
      'guestContact.name': 'Dana Reyes',
      'guestContact.email': 'dana@example.com',
      'guestContact.phone': '619-555-0142',
    });
  });
});

describe('restoreUser — the dormancy clock', () => {
  const softDeletedDoc = () => ({
    _id: USER_ID,
    email: 'dana@example.com',
    deletedAt: new Date('2026-07-01T00:00:00Z'),
    deletionScheduledFor: new Date('2026-07-31T00:00:00Z'),
    dormancyWarnedAt: new Date('2026-06-01T00:00:00Z'),
    lastActiveAt: new Date('2024-01-01T00:00:00Z'),
    save: vi.fn(async () => undefined),
  });

  // The finding. `lastActiveAt` is the only input to the scan's warn-pass
  // filter, so clearing the warning over a two-year-old timestamp handed the
  // account straight back to the next night's scan: re-warned, soft-deleted 30
  // days later, purged 30 after that. An admin clicking "Cancel deletion" was
  // buying 60 days, not a reprieve.
  it('stamps activity so the next scan cannot immediately re-warn the account', async () => {
    const doc = softDeletedDoc();
    mocks.userFindById.mockReturnValue({ select: vi.fn(async () => doc) });

    await restoreUser(USER_ID, { actor: 'admin' });

    expect(doc.deletedAt).toBeNull();
    expect(doc.deletionScheduledFor).toBeNull();
    expect(doc.dormancyWarnedAt).toBeNull();
    expect(doc.lastActiveAt.getTime()).toBeGreaterThan(Date.now() - 10_000);
    expect(doc.save).toHaveBeenCalledOnce();
  });

  it('is a no-op on an account that was never soft-deleted', async () => {
    const doc = { ...softDeletedDoc(), deletedAt: null };
    mocks.userFindById.mockReturnValue({ select: vi.fn(async () => doc) });

    await restoreUser(USER_ID, { actor: 'admin' });

    expect(doc.save).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});

describe('clearDormancyWarning — the admin cancel action', () => {
  // Same root cause as restoreUser. Without the activity stamp the button
  // bought one follow-up window and the next scan re-warned, so the label
  // "Cancel dormancy cleanup" described something the system did not do.
  it('stamps activity as well as clearing the warning', async () => {
    const doc = {
      _id: USER_ID,
      email: 'dana@example.com',
      dormancyWarnedAt: new Date('2026-06-01T00:00:00Z'),
      lastActiveAt: new Date('2024-01-01T00:00:00Z'),
      save: vi.fn(async () => undefined),
    };
    mocks.userFindById.mockReturnValue({ select: vi.fn(async () => doc) });

    const result = await clearDormancyWarning(USER_ID, { actor: 'admin' });

    expect(result.wasWarned).toBe(true);
    expect(doc.dormancyWarnedAt).toBeNull();
    expect(doc.lastActiveAt.getTime()).toBeGreaterThan(Date.now() - 10_000);
  });

  it('reports no-op when the account carries no warning', async () => {
    const doc = {
      _id: USER_ID,
      email: 'dana@example.com',
      dormancyWarnedAt: null,
      lastActiveAt: new Date('2024-01-01T00:00:00Z'),
      save: vi.fn(async () => undefined),
    };
    mocks.userFindById.mockReturnValue({ select: vi.fn(async () => doc) });

    const result = await clearDormancyWarning(USER_ID, { actor: 'admin' });

    expect(result.wasWarned).toBe(false);
    expect(doc.save).not.toHaveBeenCalled();
  });
});

describe('purgeDueSoftDeletes — the cron that permanently destroys accounts', () => {
  const dueUsers = (ids: string[]) => {
    mocks.userFind.mockReturnValue({
      select: () => ({ lean: async () => ids.map((_id) => ({ _id })) }),
    });
  };

  it('selects only soft-deleted accounts whose grace window has elapsed', async () => {
    dueUsers([]);
    const now = new Date('2026-07-31T12:00:00.000Z');

    await purgeDueSoftDeletes(now);

    expect(mocks.userFind).toHaveBeenCalledWith({
      deletedAt: { $ne: null },
      deletionScheduledFor: { $lte: now },
    });
  });

  it('reports what it attempted and what landed', async () => {
    dueUsers(['a', 'b']);
    const result = await purgeDueSoftDeletes(new Date());
    expect(result).toEqual({ attempted: 2, succeeded: 2, failed: 0, skipped: 0 });
  });

  // The privacy page promises "sign back in during those 30 days and the
  // deletion is cancelled", and day-30 sign-ins are exactly the population
  // racing this 03:00 cron. The due list is read once, so without a re-check
  // a restore landing mid-run was destroyed anyway when its turn came.
  it('skips an account that was restored after the due list was read', async () => {
    dueUsers(['a', 'b']);
    // 'a' is still due; 'b' signed back in a moment ago.
    mocks.userFindOne
      .mockReturnValueOnce({ select: () => ({ lean: async () => ({ _id: 'a' }) }) })
      .mockReturnValueOnce({ select: () => ({ lean: async () => null }) });

    const result = await purgeDueSoftDeletes(new Date());

    expect(result).toEqual({ attempted: 2, succeeded: 1, failed: 0, skipped: 1 });
    // A restore is a success for the customer, not a failure of the run —
    // it must not push the cron into a 500.
    expect(result.failed).toBe(0);
    expect(mocks.userDeleteOne).toHaveBeenCalledTimes(1);
  });

  it('isolates a failing account so one bad row cannot abort the batch', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    dueUsers(['a', 'b', 'c']);
    mocks.auditCreate
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue({});

    const result = await purgeDueSoftDeletes(new Date());

    expect(result.attempted).toBe(3);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(1);
  });

  // The result is spread into the cron response body. It used to carry
  // `{ userId, error }` pairs, handing a real customer's id and the raw driver
  // message to anyone holding the cron secret.
  it('reports a failure count, not the failing rows', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    dueUsers(['a']);
    mocks.auditCreate.mockRejectedValue(new Error('E11000 dana@example.com'));

    const result = await purgeDueSoftDeletes(new Date());

    expect(typeof result.failed).toBe('number');
    expect(JSON.stringify(result)).not.toContain('dana@example.com');
  });
});

describe('softDeleteUser — the transition the whole pipeline funnels through', () => {
  const liveDoc = () => ({
    _id: USER_ID,
    email: 'dana@example.com',
    isAdmin: false,
    deletedAt: null as Date | null,
    deletionScheduledFor: null as Date | null,
    save: vi.fn(async () => undefined),
  });

  it('schedules deletion the configured number of days out', async () => {
    const doc = liveDoc();
    mocks.userFindById.mockReturnValue({ select: vi.fn(async () => doc) });

    const before = Date.now();
    const { deletionScheduledFor } = await softDeleteUser(USER_ID, { actor: 'self' });

    const graceMs = ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;
    expect(deletionScheduledFor.getTime()).toBeGreaterThanOrEqual(before + graceMs - 5_000);
    expect(doc.deletedAt).toBeInstanceOf(Date);
    expect(doc.save).toHaveBeenCalledOnce();
  });

  it.each([
    ['cron', 'cron_soft_delete'],
    ['admin', 'admin_soft_delete'],
    ['self', 'self_soft_delete'],
  ] as const)('records a %s deletion as %s', async (actor, action) => {
    mocks.userFindById.mockReturnValue({ select: vi.fn(async () => liveDoc()) });

    await softDeleteUser(USER_ID, { actor });

    expect(mocks.auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ action }),
    );
  });

  // Same reasoning as the warn pass and hardDeleteUser: the idempotent
  // early-return below keys on `deletedAt`, so once the save lands no retry
  // can ever reach the audit again.
  it('writes the audit row before the state save', async () => {
    const doc = liveDoc();
    mocks.userFindById.mockReturnValue({ select: vi.fn(async () => doc) });

    await softDeleteUser(USER_ID, { actor: 'cron' });

    expect(mocks.auditCreate.mock.invocationCallOrder[0]).toBeLessThan(
      doc.save.mock.invocationCallOrder[0],
    );
  });

  it('leaves the account untouched when the audit write fails', async () => {
    const doc = liveDoc();
    mocks.userFindById.mockReturnValue({ select: vi.fn(async () => doc) });
    mocks.auditCreate.mockRejectedValue(new Error('validation failed'));

    await expect(softDeleteUser(USER_ID, { actor: 'cron' })).rejects.toThrow();

    expect(doc.save).not.toHaveBeenCalled();
    expect(doc.deletedAt).toBeNull();
  });

  it('is idempotent — a second call returns the existing schedule without re-auditing', async () => {
    const already = new Date('2026-08-30T00:00:00Z');
    mocks.userFindById
      .mockReturnValueOnce({
        select: vi.fn(async () => ({
          ...liveDoc(),
          deletedAt: new Date('2026-07-31T00:00:00Z'),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(async () => ({ deletionScheduledFor: already })),
      });

    const result = await softDeleteUser(USER_ID, { actor: 'self' });

    expect(result.deletionScheduledFor).toEqual(already);
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it('refuses an admin account', async () => {
    mocks.userFindById.mockReturnValue({
      select: vi.fn(async () => ({ ...liveDoc(), isAdmin: true })),
    });

    await expect(softDeleteUser(USER_ID, { actor: 'admin' })).rejects.toThrow(
      /Admin accounts cannot be deleted/,
    );
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});

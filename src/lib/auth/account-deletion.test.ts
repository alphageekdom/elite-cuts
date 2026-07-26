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

import { hardDeleteUser } from './account-deletion';

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
    })),
  });

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

    expect(mocks.userDeleteOne).toHaveBeenCalledWith({ _id: USER_ID });

    const cardOrder = mocks.savedCardDeleteMany.mock.invocationCallOrder[0];
    const userOrder = mocks.userDeleteOne.mock.invocationCallOrder[0];
    expect(cardOrder).toBeLessThan(userOrder);
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

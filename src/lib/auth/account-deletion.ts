import type { Types } from 'mongoose';

import connectDB from '@/config/database';
import User from '@/models/User';
import Cart from '@/models/Cart';
import Order from '@/models/Order';
import Review from '@/models/Review';
import Message from '@/models/Message';
import Notification from '@/models/Notification';
import SavedCard from '@/models/SavedCard';
import AccountDeletionAudit, {
  type AccountDeletionAction,
} from '@/models/AccountDeletionAudit';

// Lives in `account-deletion-constants.ts` — a leaf, so pages and client
// components can read it without pulling this module's eight models in.
import { FORMER_CUSTOMER_NAME, ACCOUNT_DELETION_GRACE_DAYS } from './account-deletion-constants';

type UserId = Types.ObjectId | string;

type ActorOptions = {
  performedBy?: UserId | null;
  reason?: string;
};

type AuditWriteInput = ActorOptions & {
  userId: UserId;
  userEmailSnapshot: string;
  action: AccountDeletionAction;
};

async function writeAudit({
  userId,
  userEmailSnapshot,
  action,
  performedBy,
  reason,
}: AuditWriteInput): Promise<void> {
  await AccountDeletionAudit.create({
    userId,
    userEmailSnapshot,
    action,
    performedBy: performedBy ?? null,
    ...(reason && reason.trim() ? { reason: reason.trim() } : {}),
  });
}

export async function softDeleteUser(
  userId: UserId,
  opts: ActorOptions & { actor: 'self' | 'admin' | 'cron' } = { actor: 'self' },
): Promise<{ deletionScheduledFor: Date }> {
  await connectDB();

  const user = await User.findById(userId).select('email isAdmin deletedAt');
  if (!user) throw new Error('User not found');
  if (user.isAdmin) throw new Error('Admin accounts cannot be deleted');

  const now = new Date();
  const scheduledFor = new Date(
    now.getTime() + ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000,
  );

  // Idempotent: if already soft-deleted, return the existing schedule.
  //
  // **Concurrent-call race accepted.** Two admins clicking "Delete" in the
  // same tick both see `deletedAt: null` here and both proceed to save; the
  // later write wins on `deletionScheduledFor` and two `admin_soft_delete`
  // audit rows land. Both rows are append-only and reference the same user,
  // so the trail stays honest. Not worth a unique index for a two-admin
  // same-second corner case.
  if (user.deletedAt) {
    const existing = await User.findById(userId).select('deletionScheduledFor');
    return {
      deletionScheduledFor: existing?.deletionScheduledFor ?? scheduledFor,
    };
  }

  user.deletedAt = now;
  user.deletionScheduledFor = scheduledFor;
  await user.save();

  const auditAction =
    opts.actor === 'cron'
      ? 'cron_soft_delete'
      : opts.actor === 'admin'
        ? 'admin_soft_delete'
        : 'self_soft_delete';

  await writeAudit({
    userId: user._id,
    userEmailSnapshot: user.email,
    action: auditAction,
    performedBy: opts.performedBy,
    reason: opts.reason,
  });

  return { deletionScheduledFor: scheduledFor };
}

export async function restoreUser(
  userId: UserId,
  opts: ActorOptions & { actor: 'self' | 'admin' } = { actor: 'self' },
): Promise<void> {
  await connectDB();

  const user = await User.findById(userId).select(
    'email deletedAt deletionScheduledFor dormancyWarnedAt',
  );
  if (!user) throw new Error('User not found');
  if (!user.deletedAt) return; // already active — no-op

  user.deletedAt = null;
  user.deletionScheduledFor = null;
  // Dormancy and deletion are sibling lifecycle states — a restore implies
  // the customer is back, so clear the dormancy warning too. Otherwise the
  // next scan would immediately re-warn them based on the now-stale
  // `lastActiveAt`.
  user.dormancyWarnedAt = null;
  await user.save();

  await writeAudit({
    userId: user._id,
    userEmailSnapshot: user.email,
    action: opts.actor === 'admin' ? 'admin_restore' : 'self_restore',
    performedBy: opts.performedBy,
    reason: opts.reason,
  });
}

// Clears the dormancy warning on an active (non-soft-deleted) account from
// the admin "Cancel dormancy cleanup" action. Idempotent — a no-op when the
// warning isn't set. The next dormancy scan can re-warn the user if their
// `lastActiveAt` is still older than the threshold.
//
// Customer-initiated clears (sign-in, order placement) bypass this helper
// and write to the User document inline because those paths already touch
// the document for other reasons (`authorize()` resets login attempts,
// order routes stamp `lastActiveAt`) — folding a second roundtrip through
// this helper would be wasteful.
export async function clearDormancyWarning(
  userId: UserId,
  opts: ActorOptions & { actor: 'admin' },
): Promise<{ wasWarned: boolean }> {
  await connectDB();

  const user = await User.findById(userId).select('email dormancyWarnedAt');
  if (!user) throw new Error('User not found');
  if (!user.dormancyWarnedAt) return { wasWarned: false };

  user.dormancyWarnedAt = null;
  await user.save();

  await writeAudit({
    userId: user._id,
    userEmailSnapshot: user.email,
    action: 'admin_cancel_dormancy',
    performedBy: opts.performedBy,
    reason: opts.reason,
  });

  return { wasWarned: true };
}

// Records customer activity — bumps `lastActiveAt` and clears any pending
// dormancy warning in one atomic write, then writes a
// `self_dormancy_cleared` audit row when the activity actually rescued a
// warned account. The shared entry point for the two order-route paths so
// they stay in sync (the sign-in path is intentionally inline in
// authorize() because it folds these writes into the same updateOne that
// also resets failedLoginAttempts / lockoutUntil / soft-delete state).
//
// `performedBy` is the admin's userId for the admin-create-for-customer
// path, null for the customer's own order. The audit's `userId` is always
// the customer the activity belongs to.
export async function recordCustomerActivity(opts: {
  userId: UserId;
  at: Date;
  performedBy?: UserId | null;
}): Promise<{ wasWarned: boolean }> {
  await connectDB();

  const prev = await User.findOneAndUpdate(
    { _id: opts.userId },
    { $set: { lastActiveAt: opts.at, dormancyWarnedAt: null } },
    { projection: { dormancyWarnedAt: 1, email: 1 }, new: false },
  ).lean<{ dormancyWarnedAt?: Date | null; email?: string } | null>();

  if (!prev?.dormancyWarnedAt) return { wasWarned: false };

  // Skip the audit write when the user has no email on record — the
  // AccountDeletionAudit schema requires a non-empty `userEmailSnapshot`,
  // and bubbling that ValidationError up would 500 the order request the
  // helper is being called from. The clear itself already succeeded; the
  // missing audit row is the lesser failure to swallow. Unreachable for
  // accounts created through the register route (email required at
  // sign-up) but worth the guard in case a future seeding path bypasses it.
  if (prev.email) {
    await AccountDeletionAudit.create({
      userId: opts.userId,
      userEmailSnapshot: prev.email,
      action: 'self_dormancy_cleared',
      performedBy: opts.performedBy ?? null,
    });
  }

  return { wasWarned: true };
}

// Synthesizes a placeholder email when an anonymized order's user had no
// email on record. Order.guestContact.email is required at the schema level,
// and `updateMany` bypasses sub-schema validators — without this sentinel a
// legacy user with a missing email would silently land an empty string in
// every one of their orders, breaking receipt rendering and the
// claim-on-signup lookup.
function fallbackAnonymizedEmail(userId: UserId): string {
  return `deleted-${String(userId)}@former.elitecuts.local`;
}

// Runs the full cascade. Idempotent — every step is a query against the
// userId, so partial completions can be safely re-run by the cron.
export async function hardDeleteUser(
  userId: UserId,
  opts: ActorOptions & { actor: 'admin' | 'cron' },
): Promise<void> {
  await connectDB();

  const user = await User.findById(userId).select('name email phone isAdmin');

  if (user?.isAdmin) {
    throw new Error('Admin accounts cannot be deleted');
  }

  const emailSnapshot = (user?.email ?? '').trim();
  const nameSnapshot = (user?.name ?? '').trim() || FORMER_CUSTOMER_NAME;
  const phoneSnapshot = user?.phone ?? '';
  const orderEmail = emailSnapshot || fallbackAnonymizedEmail(userId);

  // Write the audit row *before* User.deleteOne. If the cascade later fails
  // partway, a cron retry still picks up the orphan rows and finishes the
  // job, while the audit trail of the original action survives. Skipped when
  // the User doc is already gone (the cascade then runs purely as cleanup).
  //
  // Deduped against an existing hard-delete audit for this user so a cron
  // retry doesn't append a second row each time it picks the user back up
  // after a partially-failed run.
  //
  // **Concurrent-call race accepted.** Two admins clicking "Hard-delete now"
  // in the same instant both pass this read before either writes, producing
  // a duplicate audit row. The window is tiny (two admins, same user, same
  // tick), and `AccountDeletionAudit` is append-only — duplicate rows are
  // cosmetic, not corrupting. Fixing this would require a partial unique
  // index on `{userId, action}` for the two hard-delete actions; not worth
  // the schema complexity at this scale.
  if (user) {
    const existingAudit = await AccountDeletionAudit.findOne({
      userId: user._id,
      action: { $in: ['admin_hard_delete', 'cron_hard_delete'] },
    })
      .select('_id')
      .lean();
    if (!existingAudit) {
      await writeAudit({
        userId: user._id,
        userEmailSnapshot: emailSnapshot,
        action: opts.actor === 'cron' ? 'cron_hard_delete' : 'admin_hard_delete',
        performedBy: opts.performedBy,
        reason: opts.reason,
      });
    }
  }

  // Anonymize orders: copy name/email/phone into guestContact and null out user.
  // Idempotent — already-anonymized rows have user: null and won't match.
  await Order.updateMany(
    { user: userId },
    {
      $set: {
        user: null,
        'guestContact.name': nameSnapshot,
        'guestContact.email': orderEmail,
        ...(phoneSnapshot ? { 'guestContact.phone': phoneSnapshot } : {}),
      },
    },
  );

  // Anonymize reviews. Fill authorNameSnapshot only when empty (older rows).
  await Review.updateMany(
    { user: userId, $or: [{ authorNameSnapshot: { $exists: false } }, { authorNameSnapshot: '' }] },
    { $set: { authorNameSnapshot: nameSnapshot } },
  );
  await Review.updateMany({ user: userId }, { $set: { user: null } });

  // Same treatment for messages.
  await Message.updateMany(
    { user: userId, $or: [{ authorNameSnapshot: { $exists: false } }, { authorNameSnapshot: '' }] },
    { $set: { authorNameSnapshot: nameSnapshot } },
  );
  await Message.updateMany({ user: userId }, { $set: { user: null } });

  // Hard-delete child collections.
  //
  // `SavedCard` and the helpful-vote lists were both missing here until the
  // privacy-page pass went looking for what actually survives a purge. Neither
  // is reachable once the User doc is gone, so they were orphaned permanently:
  // card metadata (cardholder name, brand, last4, expiry) sitting in a
  // collection nothing would ever query again, and the user's ObjectId still
  // sitting in `helpfulVoters` on every review they voted on. The demo reset
  // has always cleared both — see `lib/demo/reset.ts` — so this was an
  // omission rather than a deliberate retention.
  //
  // Votes are pulled rather than deleted because the review itself belongs to
  // someone else and survives; only the departing user's entry comes out.
  await Cart.deleteMany({ user: userId });
  await Notification.deleteMany({ userId });
  await SavedCard.deleteMany({ user: userId });
  await Review.updateMany(
    { helpfulVoters: userId },
    { $pull: { helpfulVoters: userId } },
  );

  // Finally, delete the user document itself. The embedded savedCuts and
  // pointsHistory arrays go with it.
  if (user) {
    await User.deleteOne({ _id: userId });
  }
}

export async function purgeDueSoftDeletes(now: Date = new Date()): Promise<{
  attempted: number;
  succeeded: number;
  failed: { userId: string; error: string }[];
}> {
  await connectDB();

  const due = await User.find({
    deletedAt: { $ne: null },
    deletionScheduledFor: { $lte: now },
  })
    .select('_id')
    .lean<{ _id: Types.ObjectId }[]>();

  const failed: { userId: string; error: string }[] = [];
  let succeeded = 0;
  for (const { _id } of due) {
    try {
      await hardDeleteUser(_id, { actor: 'cron' });
      succeeded += 1;
    } catch (error) {
      failed.push({
        userId: String(_id),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { attempted: due.length, succeeded, failed };
}

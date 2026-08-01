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

  const auditAction =
    opts.actor === 'cron'
      ? 'cron_soft_delete'
      : opts.actor === 'admin'
        ? 'admin_soft_delete'
        : 'self_soft_delete';

  // Audit BEFORE the state write — same ordering as `hardDeleteUser` and the
  // dormancy warn pass, for the same reason: the idempotent early-return
  // above keys on `deletedAt`, so once the save has landed no retry can ever
  // reach this audit again. Audit-then-save means a failed save leaves an
  // orphan row and the retry writes a duplicate — both explicitly accepted —
  // while save-then-audit meant a failed audit left an account entering
  // deletion with no record of who sent it there.
  await writeAudit({
    userId: user._id,
    userEmailSnapshot: user.email,
    action: auditAction,
    performedBy: opts.performedBy,
    reason: opts.reason,
  });

  user.deletedAt = now;
  user.deletionScheduledFor = scheduledFor;
  await user.save();

  return { deletionScheduledFor: scheduledFor };
}

export async function restoreUser(
  userId: UserId,
  opts: ActorOptions & { actor: 'self' | 'admin' } = { actor: 'self' },
): Promise<void> {
  await connectDB();

  const user = await User.findById(userId).select(
    'email deletedAt deletionScheduledFor dormancyWarnedAt lastActiveAt',
  );
  if (!user) throw new Error('User not found');
  if (!user.deletedAt) return; // already active — no-op

  user.deletedAt = null;
  user.deletionScheduledFor = null;
  // Dormancy and deletion are sibling lifecycle states — a restore implies
  // the customer is back, so clear the dormancy warning too.
  //
  // Stamping `lastActiveAt` is the load-bearing half, and clearing the
  // warning without it is worse than useless: `lastActiveAt` is the only
  // input to the scan's warn-pass filter, so a cleared warning over a stale
  // timestamp is exactly the state that made the account eligible in the
  // first place. The account gets re-warned the next night, soft-deleted 30
  // days later and purged 30 after that — an admin rescuing an account would
  // be buying 60 days rather than a reprieve, with nothing surfacing the
  // loop. `recordCustomerActivity` below writes the same pair atomically for
  // the customer-initiated case; this is the admin-initiated equivalent.
  user.dormancyWarnedAt = null;
  user.lastActiveAt = new Date();

  // Audit before the save — the no-op guard above keys on `deletedAt`, so a
  // save that lands followed by an audit that fails could never be retried
  // into a row. Orphan/duplicate rows on the failure path are the accepted
  // cost, as everywhere else in this file.
  await writeAudit({
    userId: user._id,
    userEmailSnapshot: user.email,
    action: opts.actor === 'admin' ? 'admin_restore' : 'self_restore',
    performedBy: opts.performedBy,
    reason: opts.reason,
  });

  await user.save();
}

// Clears the dormancy warning on an active (non-soft-deleted) account from
// the admin "Cancel dormancy cleanup" action. Idempotent — a no-op when the
// warning isn't set.
//
// Stamps `lastActiveAt` alongside the clear for the same reason `restoreUser`
// does: the warn pass keys on `lastActiveAt` alone, so clearing the warning
// over a stale timestamp buys one follow-up window and nothing more — the
// next scan re-warns and the button's own label becomes a lie.
//
// Customer-initiated clears bypass this helper: sign-in writes inline in
// `authorize()` (folded into the updateOne that also resets login attempts
// and soft-delete state), and order placement goes through
// `recordCustomerActivity` below. Neither route needs the second roundtrip
// this helper's read-then-save costs.
export async function clearDormancyWarning(
  userId: UserId,
  opts: ActorOptions & { actor: 'admin' },
): Promise<{ wasWarned: boolean }> {
  await connectDB();

  const user = await User.findById(userId).select('email dormancyWarnedAt lastActiveAt');
  if (!user) throw new Error('User not found');
  if (!user.dormancyWarnedAt) return { wasWarned: false };

  user.dormancyWarnedAt = null;
  user.lastActiveAt = new Date();

  // Audit before the save — the no-op guard above keys on `dormancyWarnedAt`,
  // so save-then-audit made a failed audit row unrecoverable. Orphan rows on
  // the failure path are the accepted cost, as everywhere else in this file.
  await writeAudit({
    userId: user._id,
    userEmailSnapshot: user.email,
    action: 'admin_cancel_dormancy',
    performedBy: opts.performedBy,
    reason: opts.reason,
  });

  await user.save();

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

  const user = await User.findById(userId).select('name email phone isAdmin deletedAt');

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

    // The admin "delete immediately" path arrives here on a LIVE account —
    // `deletedAt` still null. Stamp soft-delete state before the cascade so a
    // partial failure self-heals: the purge cron's due-query requires
    // `deletedAt != null`, so without this stamp a cascade that threw halfway
    // left a live, sign-in-capable account with its order history already
    // detached, an audit row claiming the deletion happened, and nothing that
    // would ever retry. Stamped, the same failure degrades to a scheduled
    // deletion the next 03:00 run finishes. The cron path always arrives
    // already stamped, so this is a no-op there.
    if (!user.deletedAt) {
      const now = new Date();
      await User.updateOne(
        { _id: userId },
        { $set: { deletedAt: now, deletionScheduledFor: now } },
      );
    }
  }

  // Anonymize orders: copy name/email/phone into guestContact and null out user.
  // Idempotent — already-anonymized rows have user: null and won't match.
  //
  // The order also carries `deliveryAddress` and `orderNotes`, stamped at
  // checkout for every order, and neither was being touched. The privacy page
  // says past orders keep "the name, email and phone that were on them" and
  // that "everything else goes" — which was false for the two most sensitive
  // fields the app stores, and the delivery address was disclosed nowhere at
  // all. Both are removed here.
  //
  // Nulling `user` also turns these into guest orders, and the confirmation
  // page treats the order id as the access token for user-less orders — so a
  // retained address would additionally be readable by anyone holding the id.
  //
  // The order's own `contactName`/`contactEmail`/`contactPhone` are left
  // alone on purpose. They hold the same disclosed triple `guestContact`
  // does, so rewriting them buys no privacy and would edit a genuine sales
  // record; the receipt reads them first and should keep showing what was
  // actually on the order.
  await Order.updateMany(
    { user: userId },
    {
      $set: {
        user: null,
        'guestContact.name': nameSnapshot,
        'guestContact.email': orderEmail,
        ...(phoneSnapshot ? { 'guestContact.phone': phoneSnapshot } : {}),
      },
      $unset: { deliveryAddress: '', orderNotes: '' },
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
  //
  // Conditional on the account still being soft-deleted. Every caller
  // guarantees `deletedAt` is set by this point (the purge re-checks before
  // the cascade; the immediate path stamps it above), so the condition only
  // fails when a restore landed MID-cascade — the sign-in path's
  // `deletedAt != null` precondition makes that write legal right up until
  // this line. When it happens, the customer wins: they keep their account
  // (with this cascade's collateral — cart, cards, notifications gone and
  // orders anonymised) rather than losing it entirely seconds after being
  // told the deletion was cancelled.
  if (user) {
    await User.deleteOne({ _id: userId, deletedAt: { $ne: null } });
  }
}

// `failed` is a count, not the failing rows: this result is spread into the
// cron route's response body, and Mongo error strings routinely embed the
// document that failed — so returning `{ userId, error }` pairs handed a real
// customer's id and email to anyone holding the cron secret. Ids and driver
// text go to the server log instead.
export async function purgeDueSoftDeletes(now: Date = new Date()): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
  // Users on the due list who were restored before their turn came — a
  // success for the customer, not a failure of the run.
  skipped: number;
}> {
  await connectDB();

  const due = await User.find({
    deletedAt: { $ne: null },
    deletionScheduledFor: { $lte: now },
  })
    .select('_id')
    .lean<{ _id: Types.ObjectId }[]>();

  let failed = 0;
  let succeeded = 0;
  let skipped = 0;
  for (const { _id } of due) {
    try {
      // Re-check immediately before the cascade. The due list above is read
      // once, so a customer who signs back in — or an admin who clicks
      // "Cancel deletion" — while the loop is working would otherwise still
      // be destroyed when their turn came. The privacy page promises "sign
      // back in during those 30 days and the deletion is cancelled", and
      // day-30 sign-ins are exactly the population racing this 03:00 cron.
      // The residual window (restore landing mid-cascade) is closed by the
      // conditional final delete inside `hardDeleteUser`.
      const stillDue = await User.findOne({
        _id,
        deletedAt: { $ne: null },
        deletionScheduledFor: { $lte: now },
      })
        .select('_id')
        .lean();
      if (!stillDue) {
        skipped += 1;
        continue;
      }
      await hardDeleteUser(_id, { actor: 'cron' });
      succeeded += 1;
    } catch (error) {
      failed += 1;
      console.error('[cron purge-deleted-accounts] hard delete failed', String(_id), error);
    }
  }

  return { attempted: due.length, succeeded, failed, skipped };
}

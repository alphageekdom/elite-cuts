import type { Types } from 'mongoose';

import connectDB from '@/config/database';
import User from '@/models/User';
import AccountDeletionAudit from '@/models/AccountDeletionAudit';
import ShopSettingsModel from '@/models/ShopSettings';
import { softDeleteUser } from '@/lib/auth/account-deletion';
import { addMonths } from '@/lib/rewards/calculator';

// Lives in `lib/auth/account-deletion-constants.ts` — a leaf module, so the
// Privacy page can state the real warning-to-soft-delete gap without importing
// this job (and its models) just to read an integer.
import { DORMANCY_FOLLOWUP_DAYS } from '@/lib/auth/account-deletion-constants';

const DORMANCY_REASON = 'dormancy';

type UserRow = {
  _id: Types.ObjectId;
  email: string;
};

export type DormancyScanResult = {
  thresholdMonths: number;
  warned: number;
  softDeleted: number;
  // A count, deliberately — not the failing rows. This object is spread into
  // the cron route's response body, and a Mongo error string routinely embeds
  // the document that failed, so returning `{ userId, error }` pairs handed a
  // real customer's id and email to anyone holding the cron secret. The ids
  // and the driver text go to the server log instead.
  failed: number;
};

// Two-pass scan called daily from the cron route. Pass A finds dormant
// active users and stamps `dormancyWarnedAt` + writes the `dormancy_warned`
// audit row (the warning "email" is deferred — same stub posture as the
// account-deletion goodbye email). Pass B picks up users whose warning is
// 30 days old and routes them through the shared `softDeleteUser` helper
// with the `cron` actor, which writes a `cron_soft_delete` audit row; the
// existing purge cron then takes them through hard-delete after the
// standard 30-day grace.
export async function runDormancyScan(now: Date = new Date()): Promise<DormancyScanResult> {
  await connectDB();

  const settings = await ShopSettingsModel.findOne()
    .select('dormancyWarningMonths')
    .lean<{ dormancyWarningMonths?: number } | null>();
  const thresholdMonths = settings?.dormancyWarningMonths ?? 18;

  // `0` disables the entire feature. Bail out so a shop that doesn't want
  // auto-cleanup never gets surprised.
  if (!thresholdMonths) {
    return { thresholdMonths: 0, warned: 0, softDeleted: 0, failed: 0 };
  }

  let failed = 0;

  // Normalisation guard, not a spent one-time migration. Pre-feature users
  // were created before `lastActiveAt` existed and default to null; MongoDB
  // `$lte` does not match null, which would silently exempt them from the
  // scan forever. Copying `updatedAt` (kept current by the timestamps plugin)
  // into `lastActiveAt` sorts them into the scan correctly.
  //
  // What it matches, stated precisely, because two earlier versions of this
  // comment each got it wrong in a different direction: every in-app writer
  // stamps the field on create, but `scripts/seed.mjs` and
  // `scripts/seed-demo.mjs` do not (`scripts/seed-population.mjs` does) — so
  // the guard matches a cohort once on its first scan after seeding, then
  // nothing until some out-of-app writer produces another null. The demo
  // reset does re-null the demo customer nightly, but the demo exclusion
  // below means that row never matches here. Steady state is zero matched
  // documents; the guard stays because seeds demonstrably keep producing the
  // rows it exists to catch.
  //
  // Filter mirrors the two passes below (admin, demo and soft-deleted rows
  // excluded). Without the demo and deleted exclusions this bumped
  // `updatedAt` on the demo customer nightly and on accounts sitting in their
  // deletion grace window — a real signal to lose on a record an admin may be
  // reviewing.
  //
  // **Known nuance:** `updatedAt` is touched by any admin write on the User
  // doc (e.g. an admin-note edit), not just by customer activity. A legacy
  // user who hasn't actually been active in 2 years but whose record was
  // edited by an admin recently will read as recently-active and skip the
  // first warning pass. The trade-off favors fewer false-positive dormancy
  // warnings over catching every truly-dormant legacy account on day one.
  //
  // The array second-arg is an aggregation-pipeline update — Mongoose requires
  // the explicit `updatePipeline: true` option to disambiguate it from a
  // malformed update document, otherwise the call throws *synchronously*.
  // A test pins the option. Losing it is survivable now — the catch below
  // counts it and the wrapper turns the count into a 500 — but before both
  // guards existed it aborted the whole scan while the route answered 200,
  // and the test is what keeps that failure two mistakes away instead of one.
  //
  // Caught rather than left to propagate: this runs before either pass, so an
  // uncaught throw here meant nobody was warned and nobody was soft-deleted.
  // Degrading to "legacy users skipped this run" is strictly better than
  // losing the whole scan.
  try {
    await User.updateMany(
      { lastActiveAt: null, isAdmin: { $ne: true }, isDemo: { $ne: true }, deletedAt: null },
      [{ $set: { lastActiveAt: '$updatedAt' } }],
      { updatePipeline: true },
    );
  } catch (error) {
    failed += 1;
    console.error('[cron dormancy-scan] lastActiveAt backfill failed', error);
  }

  const thresholdCutoff = addMonths(now, -thresholdMonths);
  const followupCutoff = new Date(
    now.getTime() - DORMANCY_FOLLOWUP_DAYS * 24 * 60 * 60 * 1000,
  );

  // Pass A — warn dormant users.
  //
  // **Concurrent-call race accepted.** Two scans running in the same tick
  // both see `dormancyWarnedAt: null` for the same users and both write a
  // `dormancy_warned` audit row. Matches the soft-delete double-write
  // posture in `lib/auth/account-deletion.ts` — append-only audit, cosmetic
  // dupes.
  const toWarn = await User.find({
    isAdmin: { $ne: true },
    isDemo: { $ne: true },
    deletedAt: null,
    dormancyWarnedAt: null,
    lastActiveAt: { $lte: thresholdCutoff },
  })
    .select('_id email')
    .lean<UserRow[]>();

  let warned = 0;
  for (const u of toWarn) {
    try {
      // Audit row first, then the stamp — the same ordering `hardDeleteUser`
      // uses and for the same reason. The stamp is what makes this user
      // invisible to the next run (Pass A requires `dormancyWarnedAt: null`),
      // so stamping first meant a failed audit write could never be retried:
      // the user was warned, no `dormancy_warned` row existed, and 30 days
      // later they were soft-deleted with an audit trail that began
      // mid-story. Reversed, a failed stamp leaves an orphan audit row and
      // the next run simply tries again — and duplicate audit rows are
      // already an accepted outcome here.
      await AccountDeletionAudit.create({
        userId: u._id,
        userEmailSnapshot: u.email,
        action: 'dormancy_warned',
        performedBy: null,
      });
      // Conditional, not unconditional: a customer who signs in between the
      // list read above and their turn here has fresh activity and a cleared
      // warning, and an unconditional stamp would mark them Dormant in the
      // admin UI right after a successful sign-in. The re-stated conditions
      // make the stamp a no-op for them, and `warned` counts only stamps that
      // actually landed. (The audit row is already written — an orphan
      // `dormancy_warned` row on this path is the accepted cost of the
      // audit-first ordering.)
      const stamped = await User.updateOne(
        {
          _id: u._id,
          dormancyWarnedAt: null,
          lastActiveAt: { $lte: thresholdCutoff },
        },
        { $set: { dormancyWarnedAt: now } },
      );
      if (stamped.modifiedCount > 0) warned += 1;
    } catch (error) {
      failed += 1;
      console.error('[cron dormancy-scan] warn failed', String(u._id), error);
    }
  }

  // Pass B — soft-delete users whose warning has aged 30 days and who are
  // still dormant.
  //
  // The `lastActiveAt` re-check is redundant today and kept as a guard rather
  // than a live condition: every path that refreshes `lastActiveAt` also
  // clears `dormancyWarnedAt` in the same write (sign-in, order placement,
  // `recordCustomerActivity`, and now the admin restore/cancel actions), so
  // the state it screens for — warning set, activity fresh — is not currently
  // producible. It stays because it is the cheap half of the invariant: if a
  // future path ever bumps activity without clearing the warning, this is what
  // stops a returning customer being soft-deleted.
  const toSoftDelete = await User.find({
    isAdmin: { $ne: true },
    isDemo: { $ne: true },
    deletedAt: null,
    dormancyWarnedAt: { $lte: followupCutoff },
    lastActiveAt: { $lte: thresholdCutoff },
  })
    .select('_id email')
    .lean<UserRow[]>();

  let softDeleted = 0;
  for (const u of toSoftDelete) {
    try {
      await softDeleteUser(u._id, { actor: 'cron', reason: DORMANCY_REASON });
      softDeleted += 1;
    } catch (error) {
      failed += 1;
      console.error('[cron dormancy-scan] soft-delete failed', String(u._id), error);
    }
  }

  return { thresholdMonths, warned, softDeleted, failed };
}

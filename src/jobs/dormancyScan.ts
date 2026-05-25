import type { Types } from 'mongoose';

import connectDB from '@/config/database';
import User from '@/models/User';
import AccountDeletionAudit from '@/models/AccountDeletionAudit';
import ShopSettingsModel from '@/models/ShopSettings';
import { softDeleteUser } from '@/lib/auth/account-deletion';

const DORMANCY_FOLLOWUP_DAYS = 30;
const DORMANCY_REASON = 'dormancy';

type UserRow = {
  _id: Types.ObjectId;
  email: string;
  lastActiveAt?: Date | null;
  dormancyWarnedAt?: Date | null;
};

export type DormancyScanResult = {
  thresholdMonths: number;
  warned: number;
  softDeleted: number;
  failures: { userId: string; phase: 'warn' | 'soft-delete'; error: string }[];
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
    return { thresholdMonths: 0, warned: 0, softDeleted: 0, failures: [] };
  }

  // First-time backfill: pre-feature users were created before `lastActiveAt`
  // existed, so they default to null. MongoDB `$lte` doesn't match null, which
  // would silently exempt every legacy user from the scan forever. Copy
  // `updatedAt` (which the Mongoose timestamps plugin keeps current) into
  // `lastActiveAt` so they sort into the scan correctly.
  //
  // After the first run this matches zero documents — every user written
  // since the dormancy feature shipped gets a `lastActiveAt` value on
  // creation (register route stamps it; admin-create flows hit
  // `recordCustomerActivity`; sign-in writes it via `authorize()`).
  //
  // **Known nuance:** `updatedAt` is touched by any admin write on the User
  // doc (e.g. an admin-note edit), not just by customer activity. A legacy
  // user who hasn't actually been active in 2 years but whose record was
  // edited by an admin recently will read as recently-active and skip the
  // first warning pass. This matches the spec verbatim ("backfilled from
  // `updatedAt`"); the trade-off favors fewer false-positive dormancy
  // warnings over catching every truly-dormant legacy account on day one.
  // The next scan after 18 months of continued inactivity from today will
  // pick them up.
  // The array second-arg is an aggregation-pipeline update — newer
  // Mongoose versions require the explicit `updatePipeline: true` option
  // to disambiguate from a malformed update document, otherwise the call
  // throws synchronously and the whole scan aborts before warning anyone.
  await User.updateMany(
    { lastActiveAt: null, isAdmin: { $ne: true } },
    [{ $set: { lastActiveAt: '$updatedAt' } }],
    { updatePipeline: true },
  );

  const thresholdCutoff = monthsAgo(now, thresholdMonths);
  const followupCutoff = new Date(
    now.getTime() - DORMANCY_FOLLOWUP_DAYS * 24 * 60 * 60 * 1000,
  );

  const failures: DormancyScanResult['failures'] = [];

  // Pass A — warn dormant users.
  //
  // **Concurrent-call race accepted.** Two scans running in the same tick
  // both see `dormancyWarnedAt: null` for the same users and both write a
  // `dormancy_warned` audit row. Matches the soft-delete double-write
  // posture in `accountDeletion.ts` — append-only audit, cosmetic dupes.
  const toWarn = await User.find({
    isAdmin: { $ne: true },
    isDemo: { $ne: true },
    deletedAt: null,
    dormancyWarnedAt: null,
    lastActiveAt: { $lte: thresholdCutoff },
  })
    .select('_id email lastActiveAt')
    .lean<UserRow[]>();

  let warned = 0;
  for (const u of toWarn) {
    try {
      await User.updateOne({ _id: u._id }, { $set: { dormancyWarnedAt: now } });
      await AccountDeletionAudit.create({
        userId: u._id,
        userEmailSnapshot: u.email,
        action: 'dormancy_warned',
        performedBy: null,
      });
      warned += 1;
    } catch (error) {
      failures.push({
        userId: String(u._id),
        phase: 'warn',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Pass B — soft-delete users whose warning has aged 30 days and who are
  // still dormant. The activity re-check protects against the "they came
  // back to browse but the warning didn't clear" edge case.
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
      failures.push({
        userId: String(u._id),
        phase: 'soft-delete',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { thresholdMonths, warned, softDeleted, failures };
}

// Subtract whole months from a date. JS rolls month-overflow days into the
// next month — March 31 minus 1 month becomes March 2/3, not February
// 28/29 — so this is approximate near month boundaries. A few days of drift
// is acceptable for 12/18/24-month dormancy thresholds.
function monthsAgo(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() - months);
  return d;
}

// Thin wrapper so the cron route and any future ad-hoc trigger share one
// entry point — matches the shape used by purgeDeletedAccounts.
export async function runDormancyScanJob() {
  return runDormancyScan();
}

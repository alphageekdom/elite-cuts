import { Schema, model, models, type Model } from 'mongoose';

// Single-document advisory lock for the demo reset. The reset has two
// independent triggers — the nightly cron and the admin "Reset demo data"
// button — and Vercel documents that a cron can occasionally fire twice. The
// reset itself is ~110 sequential writes with wipe-at-start / seed-at-end
// ordering, so two overlapping runs interleave destructively: doubled order
// history against a single-run ledger, and the staff insert-then-prune pair
// can mutually delete each other's inserts and leave the roster empty. One
// lock claim at the top of `resetDemoData` collapses every interleaving.
//
// The claim is `findOneAndUpdate` with upsert on a fixed string `_id`: a free
// or stale lock matches the filter and is re-stamped; a fresh held lock
// matches nothing, so the upsert tries to insert the same `_id` and the
// duplicate-key error IS the "already running" signal. `heldSince` rather
// than a TTL index so a crashed run (the function ceiling is 300s) is
// stealable after STALE_AFTER_MS instead of blocking every future night.
export type DemoResetLock = {
  _id: string;
  heldSince: Date | null;
};

export const DEMO_RESET_LOCK_ID = 'demo-reset';

// Comfortably above the cron route's maxDuration (300s): no live run can
// still be working when its claim goes stale.
export const DEMO_RESET_LOCK_STALE_AFTER_MS = 10 * 60 * 1000;

const DemoResetLockSchema = new Schema<DemoResetLock>(
  {
    _id: { type: String },
    heldSince: { type: Date, default: null },
  },
  // No timestamps: `heldSince` is the only clock this document needs, and an
  // `updatedAt` bumped by the release write would read as a live claim.
  { timestamps: false },
);

const DemoResetLockModel =
  (models.DemoResetLock as Model<DemoResetLock> | undefined) ??
  model<DemoResetLock>('DemoResetLock', DemoResetLockSchema);

export default DemoResetLockModel;

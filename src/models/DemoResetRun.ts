import { Schema, model, models, type Model } from 'mongoose';

// ── One row per demo reset attempt ──────────────────────────────────────
// Console logs were the only record. That answers "what happened just now" for
// whoever is watching the terminal, and nothing at all for "did last night
// work" — Vercel does not persist cron response bodies, and its log retention
// is shorter than the gap between someone noticing the demo looks wrong and
// someone going to look at why.
//
// Deliberately the smallest shape that answers that question. This is the
// easiest thing in the feature to over-build into an observability platform,
// and it is not one: no per-step timings, no log lines, no metrics rollups. If
// a run failed, this says when, how long it ran, what triggered it, and what
// the failure was — and the counts are there so a run that *succeeded* while
// producing nonsense is visible too.
//
// **Nothing personal or secret goes in.** The counts are integers and booleans
// (enforced at write time by `sanitiseCounts`, not merely intended), the error
// is a message string with no cause chain, and no request headers, ids, emails
// or connection strings are recorded. `database` is a bare database name, which
// is what the G1 guard verifies and therefore the one field that makes a
// refusal legible after the fact.

export type DemoResetTrigger = 'cron' | 'admin' | 'cli';

export type DemoResetOutcome =
  /** Ran, and every post-run check passed. */
  | 'success'
  /** Ran, but something failed: a step threw, or verification found a gap. */
  | 'failure'
  /** Another run held the advisory lock, so this invocation did nothing. */
  | 'skipped'
  /** A dry run. Wrote nothing except this row. */
  | 'dry-run';

// There is deliberately no `refused` outcome for a target-guard rejection. A
// refusal means the connected database is not the one this environment
// declared, so writing a row into it would be the reset touching the database
// it had just refused to touch. Refusals go to the server log only — see
// `recordDemoResetRun`. An enum value nothing can ever write is worse than the
// gap: it reads as coverage that does not exist.

export type DemoResetRun = {
  runId: string;
  trigger: DemoResetTrigger;
  outcome: DemoResetOutcome;
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  /** Verified target, or `null` when the guard refused before verifying one. */
  database: string | null;
  /** Per-category touch counts, exactly as the run reported them. */
  counts: Record<string, number | boolean>;
  /** Identifiers that failed post-run verification. Empty on a clean run. */
  validationFailures: string[];
  /** Failure message, never a stack or a cause chain. */
  error: string | null;
};

/**
 * How long a row survives. Thirty days is well past the point where a nightly
 * job's history stops being diagnostic and starts being archaeology, and it
 * bounds the collection at ~30 rows per trigger without anybody pruning it.
 *
 * Enforced by a TTL index, so retention is the database's job rather than a
 * cleanup step that can be forgotten or fail silently.
 */
// Not exported: the only reader is the index declaration three lines below.
// `indexes.test.ts` deliberately hardcodes the same arithmetic rather than
// importing this — a test that imported the constant could not catch a change
// to it, which is the one thing that test is for.
const DEMO_RESET_RUN_TTL_DAYS = 30;

/**
 * Drops anything that is not a plain number or boolean.
 *
 * `counts` is `Mixed`, which is the right trade for a shape that grows with the
 * reset — but Mixed means whatever the caller passes is what gets persisted, so
 * the "no personal data" rule has to be enforced here rather than promised in a
 * comment. Every current count is an integer or a flag; if one ever becomes a
 * string, this drops it and the omission is visible in the row.
 */
export function sanitiseCounts(
  counts: Record<string, unknown>,
): Record<string, number | boolean> {
  const clean: Record<string, number | boolean> = {};
  for (const [key, value] of Object.entries(counts)) {
    if (typeof value === 'boolean') clean[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value)) clean[key] = value;
  }
  return clean;
}

const DemoResetRunSchema = new Schema<DemoResetRun>(
  {
    runId: { type: String, required: true },
    trigger: {
      type: String,
      enum: ['cron', 'admin', 'cli'],
      required: true,
    },
    outcome: {
      type: String,
      enum: ['success', 'failure', 'skipped', 'dry-run'],
      required: true,
    },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, required: true },
    durationMs: { type: Number, required: true },
    database: { type: String, default: null },
    counts: { type: Schema.Types.Mixed, default: () => ({}) },
    validationFailures: { type: [String], default: [] },
    error: { type: String, default: null },
  },
  // `startedAt` / `finishedAt` are the run's own clock and are set explicitly.
  // A `createdAt` stamped by the write would sit a few hundred milliseconds
  // after `finishedAt` and read as a third, slightly different timestamp.
  { timestamps: false },
);

// Retention. `expireAfterSeconds` is an index OPTION, not part of the name, so
// a version of this index without it would match by name and look applied —
// see `src/lib/db/ensure-indexes.ts`, which compares options for exactly that
// reason. Removing this declaration does not remove the index; drop it by hand.
DemoResetRunSchema.index(
  { startedAt: 1 },
  { expireAfterSeconds: DEMO_RESET_RUN_TTL_DAYS * 24 * 60 * 60 },
);

const DemoResetRunModel =
  (models.DemoResetRun as Model<DemoResetRun> | undefined) ??
  model<DemoResetRun>('DemoResetRun', DemoResetRunSchema);

export default DemoResetRunModel;

import 'server-only';

import connectDB from '@/config/database';
import { redactBuildError } from '@/lib/db/ensure-indexes';
import DemoResetRun, {
  sanitiseCounts,
  type DemoResetOutcome,
  type DemoResetTrigger,
} from '@/models/DemoResetRun';

export type DemoResetRunRecord = {
  runId: string;
  trigger: DemoResetTrigger;
  outcome: DemoResetOutcome;
  startedAt: Date;
  finishedAt: Date;
  database: string | null;
  counts: Record<string, unknown>;
  validationFailures: string[];
  error: unknown;
};

/**
 * Longest error text kept. A message is a summary; anything longer is a stack
 * or a serialised object arriving by accident, and neither belongs in a row
 * whose stated rule is that it holds nothing but numbers and short strings.
 */
const MAX_ERROR_LENGTH = 300;

/**
 * Reduces an unknown throw to a bounded, sanitised one-liner.
 *
 * Exported for its own tests: it is the only thing standing between a run
 * history and whatever a driver decided to put in an error, and "we only ever
 * throw Errors with tidy messages" is an assumption, not a guarantee — a
 * Mongo write error carries the offending document on it.
 */
export function summariseError(error: unknown): string | null {
  if (error === null || error === undefined) return null;

  const raw =
    error instanceof Error
      ? // Through the shared redactor first. A Mongo duplicate-key error embeds
        // the colliding DOCUMENT in its message, and `redactBuildError` exists
        // for exactly that — its own comment names the case ("that would ship a
        // real customer's address"). Nothing in the reset path currently
        // inserts a User, so the reachable values today are seeded slugs, promo
        // codes and shift coordinates. This is defence for the day something
        // does: the redactor already exists, so not using it was the gap.
        redactBuildError(error)
      : typeof error === 'string'
        ? error
        : 'Non-Error value thrown';

  // Collapse newlines so a multi-line message cannot smuggle a stack in, then
  // clamp. `.trim()` first so a message that is only whitespace becomes null
  // rather than an empty string masquerading as a recorded failure.
  const flat = raw.replace(/\s+/g, ' ').trim();
  if (!flat) return null;
  return flat.length > MAX_ERROR_LENGTH
    ? `${flat.slice(0, MAX_ERROR_LENGTH)}…`
    : flat;
}

/**
 * Writes one row per reset attempt.
 *
 * **Never throws.** The history exists to explain a failed run; a history that
 * can itself fail the run it is describing would be worse than no history at
 * all. A write failure is logged and swallowed, and the run's own outcome is
 * unaffected.
 *
 * Not called for a target-guard refusal, deliberately. A refusal means the
 * connected database is not the one this environment declared — writing a row
 * into it would be the reset touching a database it had just refused to touch.
 * Those are logged only.
 */
export async function recordDemoResetRun(
  record: DemoResetRunRecord,
): Promise<void> {
  const durationMs = Math.max(
    0,
    record.finishedAt.getTime() - record.startedAt.getTime(),
  );

  // One line to the server log, and the reason is that the collection has no
  // reader. `runId` and `durationMs` are required by the spec but were only
  // ever reachable through a Mongo shell, which makes a correlation id with
  // nothing to correlate and a duration nobody sees.
  //
  // Logging them is the smallest thing that makes both earn their place: the
  // Vercel log now answers "did last night work, and how long did it take"
  // without opening Atlas, and `runId` ties that line to its row for the cases
  // where the counts matter. Deliberately not a read endpoint — a query surface
  // for a portfolio demo's reset history is the over-build the spec warned
  // about by name.
  console.log(
    `[demo reset] ${record.outcome} runId=${record.runId} trigger=${record.trigger} db=${record.database ?? 'unknown'} duration=${durationMs}ms`,
  );

  try {
    await connectDB();
    await DemoResetRun.create({
      runId: record.runId,
      trigger: record.trigger,
      outcome: record.outcome,
      startedAt: record.startedAt,
      finishedAt: record.finishedAt,
      durationMs,
      database: record.database,
      counts: sanitiseCounts(record.counts),
      validationFailures: record.validationFailures,
      error: summariseError(record.error),
    });
  } catch (writeError) {
    console.error('[demo reset] failed to record run history', writeError);
  }
}

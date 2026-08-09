import 'server-only';

import mongoose from 'mongoose';

// ── Refusing to reset a database nobody meant to reset ──────────────────
// On 2026-08-08 a reset ran against production. The dev server was holding a
// cached connection from before `.env` was repointed, so the process was still
// talking to the old database while every file on disk said otherwise.
//
// No real *customer* record was touched, because the customer-owned half of the
// wipe is scoped by ownership to the two demo accounts. That is narrower than
// "the wipe is ownership-scoped", which is what this comment used to say and
// what `restore.ts:266` contradicts fifty lines from here: `StaffMember`,
// `Shift` and `Event` are deleted with no owner predicate at all, and
// `ShopSettings` is overwritten wholesale. So a misdirected run destroys the
// staff roster, every shift outside the seeded week, every scheduled grill
// event, and the shop's own configuration.
//
// Either way it was luck about blast radius rather than a safeguard — but the
// blast radius is bigger than the sentence admitted, and understating it in the
// file that exists to prevent the incident is the wrong place to be imprecise.
//
// The obvious guard does not work here. `scripts/seed.mjs` can simply refuse
// the name `elite-cuts`, because nothing about production ever wants a full
// reseed. This is the opposite: production **legitimately** runs this job every
// night, and it is what keeps the public demo clean. So the question is not
// "is this production" but "is this the database this deployment was told to
// reset" — which nothing in the process can infer. It has to be declared.
//
// Hence one env var per environment, and a refusal when it is absent. Reading
// the name back out of `MONGODB_URI` instead would be circular: the connection
// comes from that same string, so the check would pass by construction. It
// would also have missed the actual incident, where the live connection and the
// current `MONGODB_URI` had already diverged — the declared name catches that,
// because it matches the file on disk and the stale connection does not.
export const DEMO_RESET_DB_ENV = 'DEMO_RESET_DB_NAME';

/**
 * Why a run was refused. Carried separately from the message so a caller can
 * branch on the cause without matching on prose — the same reason
 * `DemoResetInProgressError` is a type rather than a string comparison.
 */
export type DemoResetTargetRefusal =
  | 'not-configured'
  | 'not-connected'
  | 'wrong-database';

export type DemoResetTargetCheck =
  | { ok: true; database: string }
  | { ok: false; reason: DemoResetTargetRefusal; expected: string; actual: string };

/**
 * The whole decision, as a pure function over two strings.
 *
 * Split out from the mongoose/env reader below so it can be tested without a
 * database or a mutated `process.env`. The reader is three lines and no branch;
 * everything that could be wrong is here.
 */
export function checkDemoResetTarget(
  expected: string | undefined,
  actual: string | undefined,
): DemoResetTargetCheck {
  const want = (expected ?? '').trim();
  const got = (actual ?? '').trim();

  // Fail closed. An unset variable is the state a fresh deploy is in, and
  // treating it as "no opinion, carry on" would mean the guard protects only
  // the environments that already configured it — which is exactly the set
  // that needed it least.
  if (!want) {
    return { ok: false, reason: 'not-configured', expected: '', actual: got };
  }

  // No live connection means `connectDB()` did not run, or ran and failed. A
  // reset cannot verify a target it cannot see, so it does not get to guess.
  if (!got) {
    return { ok: false, reason: 'not-connected', expected: want, actual: '' };
  }

  if (want !== got) {
    return { ok: false, reason: 'wrong-database', expected: want, actual: got };
  }

  return { ok: true, database: got };
}

/** Operator-facing sentence for a refusal, for the server log only. */
export function describeDemoResetRefusal(
  check: Extract<DemoResetTargetCheck, { ok: false }>,
): string {
  switch (check.reason) {
    case 'not-configured':
      return `${DEMO_RESET_DB_ENV} is not set, so there is no declared target to verify against. Set it to the database name this environment is allowed to reset.`;
    case 'not-connected':
      return 'No live database connection, so the target could not be verified.';
    case 'wrong-database':
      return `Connected to "${check.actual}" but ${DEMO_RESET_DB_ENV} declares "${check.expected}".`;
  }
}

/**
 * Thrown before the reset touches anything — including its own advisory lock,
 * which is itself a write.
 *
 * The message is deliberately generic: it reaches an HTTP client, and while a
 * database name is not a credential there is no reason for an unauthenticated
 * error body to name one. The detail goes to the server log instead, and never
 * includes `MONGODB_URI`, which is the one string here that genuinely is a
 * secret.
 */
export class DemoResetTargetError extends Error {
  readonly reason: DemoResetTargetRefusal;

  constructor(reason: DemoResetTargetRefusal) {
    super('Demo reset refused: target database could not be verified');
    this.name = 'DemoResetTargetError';
    this.reason = reason;
  }
}

/** The live connection's database name, or `undefined` when there isn't one. */
function connectedDatabaseName(): string | undefined {
  // `connection.name` is populated from the URI at connect time; `db` only
  // exists once the handshake has actually completed. Prefer the latter — it is
  // the name the driver is really issuing commands against, which is the whole
  // question being asked. `readyState === 1` is `connected`.
  if (mongoose.connection.readyState !== 1) return undefined;
  return mongoose.connection.db?.databaseName ?? mongoose.connection.name;
}

/**
 * Verifies the connected database is the one this environment declared, and
 * throws `DemoResetTargetError` when it is not.
 *
 * Call it after `connectDB()` and before the first write.
 *
 * **There are four call sites, not one choke point.** `resetDemoData`,
 * `dryRunDemoReset`, `resetDemoCustomerState` and the cron route each call this
 * themselves; none delegates to another. An earlier version of this comment
 * claimed every trigger funnelled through `resetDemoData` "so none of them can
 * bypass it without deleting this line" — which was false, and false in the
 * direction that matters: deleting the call in `dryRunDemoReset` would leave a
 * dry run unguarded while `resetDemoData` still looked protected.
 *
 * So the invariant to preserve is per-entry-point: **anything that reaches the
 * database on behalf of the demo reset calls this before its first write.** The
 * check is a string comparison against an env var, so repeating it is free and
 * no caller has to trust another.
 *
 * Returns the verified name so callers can record which database a run touched.
 */
export function assertDemoResetTarget(): string {
  const check = checkDemoResetTarget(
    process.env[DEMO_RESET_DB_ENV],
    connectedDatabaseName(),
  );

  if (check.ok) return check.database;

  console.error(`[demo reset] refusing to run — ${describeDemoResetRefusal(check)}`);
  throw new DemoResetTargetError(check.reason);
}

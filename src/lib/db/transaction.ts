import mongoose, { type ClientSession } from 'mongoose';

// Run `work` inside a Mongo transaction when the deployment supports one
// (replica set / Atlas), otherwise run it without a session. Three routes
// (products/import, stocktakes, deliveries) used to inline this dance,
// each detecting the standalone-Mongo case via the same regex over the
// thrown error message. Centralising the detection means a future Mongo
// driver wording change touches one file.
//
// `work` receives the active session (or `null` on the fallback path) and
// should pass it through to every Mongoose call that should participate in
// the transaction. Returning a value from `work` flows through to the
// caller verbatim.

// The exact MongoDB driver error thrown when a transaction is attempted on a
// standalone deployment. Earlier code matched a loose `replica set|Transaction
// numbers|standalone` regex, which could classify unrelated errors as
// "standalone" and re-run `work` outside the session — duplicating any
// non-idempotent writes (e.g. the stocktake audit row). The narrow match
// covers every driver version that's emitted this message since 4.x.
const STANDALONE_MESSAGE_RE =
  /Transaction numbers are only allowed on a replica set member or mongos/i;

// Cached once we've confirmed the deployment lacks transaction support — skips
// the doomed `startSession`/`withTransaction` attempt on every subsequent
// call. Reset on process boot; safe because the deployment topology can't
// change without a restart of the app.
let deploymentSupportsTransactions: boolean | null = null;

const isUnsupportedTransaction = (err: unknown): boolean => {
  const message = err instanceof Error ? err.message : '';
  return STANDALONE_MESSAGE_RE.test(message);
};

export async function withOptionalTransaction<T>(
  work: (session: ClientSession | null) => Promise<T>,
): Promise<T> {
  if (deploymentSupportsTransactions === false) {
    return await work(null);
  }

  let session: ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    const result = await session.withTransaction(() => work(session));
    deploymentSupportsTransactions = true;
    return result;
  } catch (err) {
    if (!isUnsupportedTransaction(err)) throw err;
    deploymentSupportsTransactions = false;
    return await work(null);
  } finally {
    if (session) await session.endSession();
  }
}

// Test-only — lets the test suite reset the cached topology decision between
// fixture scenarios. Not exported from any production code path.
export const __resetTransactionTopologyCacheForTests = () => {
  deploymentSupportsTransactions = null;
};

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
export async function withOptionalTransaction<T>(
  work: (session: ClientSession | null) => Promise<T>,
): Promise<T> {
  let session: ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    return await session.withTransaction(() => work(session));
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    const isStandalone = /replica set|Transaction numbers|standalone/i.test(message);
    if (!isStandalone) throw err;
    // Best-effort sequential commit on standalone Mongo (typical dev setup).
    return await work(null);
  } finally {
    if (session) await session.endSession();
  }
}

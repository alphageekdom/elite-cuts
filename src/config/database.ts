import 'server-only';

import mongoose, { type Mongoose } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Fail at startup with a clear message instead of letting Mongoose throw a cryptic undefined-URI error later.
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}

type MongooseCache = {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
};

// Cache on globalThis so the connection survives Next.js dev hot reload — module-scoped state would leak a connection per save.
declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.mongooseCache ?? {
  conn: null,
  promise: null,
};
globalThis.mongooseCache = cached;

mongoose.set('strictQuery', true);

const connectDB = async (): Promise<Mongoose> => {
  if (cached.conn) {
    return cached.conn;
  }

  // Cache the in-flight promise so concurrent first-time callers await the same connect attempt instead of dialling twice.
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      // Fail fast on queries when disconnected instead of buffering indefinitely.
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      // Off, which is NOT mongoose's default (`mongoose.js:71` sets it true).
      // Turned off on 2026-08-08 for correctness, not speed — though it is also
      // strictly cheaper.
      //
      // `Model.init()` chains `_createCollection().then(_ensureIndexes)` with no
      // catch between the links (`model.js:1181`), and `Model.createCollection`
      // swallows only NamespaceExists (48). So while autoCreate is on, ANY other
      // failure creating the collection — an authorization error, or the
      // undefined-`db` TypeError reachable when a model is first compiled
      // mid-connect, which `bufferCommands: false` makes possible — silently
      // takes every index for that model with it. Off, `_createCollection`
      // returns before touching the database (`model.js:1174`), so the
      // precondition cannot fail and indexes always get their turn.
      //
      // Nothing here needs it. `createIndex` creates a missing collection
      // implicitly, writes create one on first insert, no schema uses `capped`,
      // `collation`, `timeseries` or a server-side `validator` (Order's is
      // path-level, which runs in Node), and all 19 live collections were
      // checked: none carries a non-default option. Transactions could once not
      // create collections — fixed in MongoDB 4.4, and this cluster is 8.0.
      //
      // It also removes one round-trip per model from every cold start.
      autoCreate: false,
      // On in every environment, production included. This read
      // `NODE_ENV !== 'production'` until 2026-08-08, which worked only because
      // dev and production share one Atlas database: a local run is what builds
      // production's indexes. Separating them removes that, so an index declared
      // afterwards would never reach production, and nothing would say so. Many
      // are correctness rather than speed — eight of the twenty-three are
      // unique, and the demo restore leans on `products.slug` and the `shifts`
      // compound to collide loudly instead of duplicating quietly.
      // `src/models/indexes.test.ts` pins the declared set; take the counts from
      // there rather than trusting this sentence to have aged well.
      //
      // The cost this replaced was overstated. Checked against mongoose 9.9.1
      // rather than assumed: every call site fires `Model.init().catch(noop)`
      // and nothing in the query path awaits it, so index creation never blocks
      // a request.
      //
      // Two further ways this silently does not happen:
      //   * A `readPreference` on the URI overrides it. `nearest` forces
      //     autoIndex back to false; `secondary` / `secondaryPreferred` now
      //     THROW at connect, where the old `false` degraded quietly — so this
      //     line introduced a new hard-failure mode for those URIs. See
      //     mongoose/lib/helpers/processConnectionOptions.js, whose own comment
      //     says it will not override explicit options. It does.
      //   * `Model.init()` fires at model-module import, not at connect, so an
      //     index builds only once something imports its model. On a fresh
      //     database, "missing" usually means "that route hasn't been hit".
      //
      // And a failure reports nothing: `$init.catch` marks the model caught, so
      // no error event is emitted. A quiet startup is not confirmation — read it
      // back with `db.<collection>.getIndexes()` in mongosh.
      //
      // NOTE ON TENSE: the separation itself is configuration, not code — the
      // path segment of MONGODB_URI, set in `.env` and per-environment in
      // Vercel. This line landed first, on purpose, so the setting is already
      // right whenever those values change. Until they do, dev and production
      // are still the same database and every local write is a production write.
      autoIndex: true,
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error: unknown) {
    // Clear the cached promise so the next call retries; otherwise a single failure would poison the cache for the lifetime of the process.
    cached.promise = null;
    throw error;
  }
};

export default connectDB;

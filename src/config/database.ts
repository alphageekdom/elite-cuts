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
  // eslint-disable-next-line no-var -- `var` is required syntactically inside `declare global`.
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
      // Skip sync index builds at startup in production; rely on a deploy-time index step instead.
      autoIndex: process.env.NODE_ENV !== 'production',
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

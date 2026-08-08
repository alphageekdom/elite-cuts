import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import mongoose from 'mongoose';

// ── Why this exists ─────────────────────────────────────────────────────
// `autoIndex` is the only thing that builds indexes in production once dev and
// production are separate databases. Restoring the old
// `NODE_ENV !== 'production'` condition would pass lint, typecheck, the build
// and every other test, and production would silently stop gaining any index
// declared afterwards. `src/models/indexes.test.ts` cannot catch that: it pins
// the DECLARED set and deliberately never touches a database. Nothing else in
// the suite imports this module at all — every other consumer mocks it.
//
// The autoIndex case runs under two values of NODE_ENV because the contract is
// that the option is UNCONDITIONAL, not that it happens to hold for one value.
// They catch different mutations, and either alone leaves a hole:
//
//   reverting to `NODE_ENV !== 'production'`  → fails ONLY the production row
//                                               (under 'development' the old
//                                               expression also yields true)
//   inverting to `NODE_ENV === 'production'`  → fails ONLY the development row
//   hardcoding `false`                        → fails both
//
// The MONGODB_URI case at the bottom is deliberately not about this change. It
// pins the fail-fast startup contract, which nothing else in the suite covered
// and which belongs here now that the module has a test file at all.

vi.mock('server-only', () => ({}));

// `database.ts` reads MONGODB_URI at module load and throws when it is unset,
// so it has to be present before the dynamic import below.
const TEST_URI = 'mongodb://127.0.0.1:27017/does-not-connect';

function freshImport() {
  vi.resetModules();
  // The module caches its connection on globalThis to survive dev hot reload.
  // `vi.resetModules()` alone does not clear that, so without this the second
  // row would hit the `cached.conn` early return and never call `connect`.
  delete (globalThis as { mongooseCache?: unknown }).mongooseCache;
  return import('./database');
}

describe('connectDB', () => {
  let connectSpy: MockInstance<typeof mongoose.connect>;

  beforeEach(() => {
    vi.stubEnv('MONGODB_URI', TEST_URI);
    connectSpy = vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each(['production', 'development'])(
    'enables autoIndex under NODE_ENV=%s',
    async (nodeEnv) => {
      vi.stubEnv('NODE_ENV', nodeEnv);

      const connectDB = (await freshImport()).default;
      await connectDB();

      expect(connectSpy).toHaveBeenCalledTimes(1);
      expect(connectSpy).toHaveBeenCalledWith(
        TEST_URI,
        expect.objectContaining({ autoIndex: true }),
      );
    },
  );

  // `autoCreate` defaults to TRUE in mongoose, so this is an override and a
  // silent one to lose: restoring the default puts `_createCollection` back in
  // front of index creation as a failure-propagating precondition, and nothing
  // else would notice.
  it('disables autoCreate so it cannot gate index creation', async () => {
    const connectDB = (await freshImport()).default;
    await connectDB();

    expect(connectSpy).toHaveBeenCalledWith(
      TEST_URI,
      expect.objectContaining({ autoCreate: false }),
    );
  });

  it('throws at import when MONGODB_URI is unset', async () => {
    vi.stubEnv('MONGODB_URI', '');

    await expect(freshImport()).rejects.toThrow(
      'MONGODB_URI environment variable is not set',
    );
  });
});

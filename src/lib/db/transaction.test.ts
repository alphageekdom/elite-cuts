import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mongoose's real startSession needs a live driver connection; stub it out so
// the pure routing logic in `withOptionalTransaction` can be exercised in
// isolation. Each test wires the mock to return the session it wants.

const startSessionMock = vi.fn();
const endSessionMock = vi.fn(async () => undefined);

vi.mock('mongoose', () => ({
  default: {
    startSession: () => startSessionMock(),
  },
}));

const {
  withOptionalTransaction,
  __resetTransactionTopologyCacheForTests,
} = await import('./transaction');

const STANDALONE_ERROR = new Error(
  'Transaction numbers are only allowed on a replica set member or mongos',
);

const makeSession = (
  withTransactionImpl: (fn: () => Promise<unknown>) => Promise<unknown>,
) => ({
  withTransaction: vi.fn(withTransactionImpl),
  endSession: endSessionMock,
});

beforeEach(() => {
  startSessionMock.mockReset();
  endSessionMock.mockClear();
  __resetTransactionTopologyCacheForTests();
});

describe('withOptionalTransaction', () => {
  it('runs work inside a transaction on a replica-set deployment', async () => {
    const work = vi.fn(async () => 'ok');
    startSessionMock.mockResolvedValueOnce(
      makeSession((fn) => fn()),
    );
    const result = await withOptionalTransaction(work);
    expect(result).toBe('ok');
    expect(work).toHaveBeenCalledOnce();
    expect(endSessionMock).toHaveBeenCalledOnce();
  });

  it('falls back to a sessionless run on standalone Mongo', async () => {
    const work = vi.fn(async (session) => {
      if (session !== null) throw STANDALONE_ERROR;
      return 'fallback-ok';
    });
    startSessionMock.mockResolvedValueOnce(
      makeSession((fn) => fn()),
    );
    const result = await withOptionalTransaction(work);
    expect(result).toBe('fallback-ok');
    // Once inside the transaction (where it threw), once on the fallback path.
    expect(work).toHaveBeenCalledTimes(2);
    expect(work).toHaveBeenNthCalledWith(2, null);
  });

  it('propagates non-standalone errors without re-running work', async () => {
    const work = vi.fn(async () => {
      throw new Error('something else entirely');
    });
    startSessionMock.mockResolvedValueOnce(
      makeSession((fn) => fn()),
    );
    await expect(withOptionalTransaction(work)).rejects.toThrow(/something else/);
    // Only the in-transaction attempt; no fallback re-run.
    expect(work).toHaveBeenCalledOnce();
  });

  it('treats a loosely-worded error as non-standalone and propagates', async () => {
    // The earlier loose regex matched any string containing "replica set" —
    // the narrowed check shouldn't. Verifies the regression that drove this
    // narrowing.
    const work = vi.fn(async () => {
      throw new Error('connection to replica set lost mid-write');
    });
    startSessionMock.mockResolvedValueOnce(
      makeSession((fn) => fn()),
    );
    await expect(withOptionalTransaction(work)).rejects.toThrow(/connection to replica set/);
    expect(work).toHaveBeenCalledOnce();
  });

  it('caches the standalone decision and skips startSession on subsequent calls', async () => {
    const firstWork = vi.fn(async (session) => {
      if (session !== null) throw STANDALONE_ERROR;
      return 'first';
    });
    startSessionMock.mockResolvedValueOnce(
      makeSession((fn) => fn()),
    );
    expect(await withOptionalTransaction(firstWork)).toBe('first');

    const secondWork = vi.fn(async (session) => {
      expect(session).toBeNull();
      return 'second';
    });
    expect(await withOptionalTransaction(secondWork)).toBe('second');
    // startSession was called exactly once (the first call); the cache
    // short-circuited the second call.
    expect(startSessionMock).toHaveBeenCalledOnce();
  });

  it('reset helper clears the standalone decision', async () => {
    startSessionMock.mockResolvedValueOnce(
      makeSession((fn) => fn()),
    );
    await withOptionalTransaction(async (session) => {
      if (session !== null) throw STANDALONE_ERROR;
      return null;
    });

    __resetTransactionTopologyCacheForTests();

    startSessionMock.mockResolvedValueOnce(
      makeSession((fn) => fn()),
    );
    await withOptionalTransaction(async () => 'fresh');
    expect(startSessionMock).toHaveBeenCalledTimes(2);
  });
});

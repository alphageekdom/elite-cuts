import { describe, expect, it } from 'vitest';

import { runBulk, partialFailureMessage } from './bulk';

type FakeResponse = { ok: boolean; json: () => Promise<unknown> };

const okRes = (): FakeResponse => ({ ok: true, json: async () => ({}) });
const failRes = (message?: string): FakeResponse => ({
  ok: false,
  json: async () => (message === undefined ? {} : { message }),
});
const brokenBodyRes = (): FakeResponse => ({
  ok: false,
  json: async () => {
    throw new Error('not json');
  },
});

describe('runBulk', () => {
  it('collects every id when all requests succeed', async () => {
    const out = await runBulk(['a', 'b', 'c'], async () => okRes());
    expect(out).toEqual({ okIds: ['a', 'b', 'c'], failCount: 0, firstErrorMessage: null });
  });

  it('reports zero successes and the server message when every request is refused', async () => {
    // The demo-admin scenario: every PATCH 403s with an explanatory message.
    // The old handlers treated this as total success because fetch resolved.
    const out = await runBulk(['a', 'b'], async () =>
      failRes("Demo admin can't modify orders"),
    );
    expect(out.okIds).toEqual([]);
    expect(out.failCount).toBe(2);
    expect(out.firstErrorMessage).toBe("Demo admin can't modify orders");
  });

  it('splits a mixed outcome and keeps only the successes', async () => {
    const out = await runBulk(['a', 'b', 'c'], async (id) =>
      id === 'b' ? failRes('Order not found') : okRes(),
    );
    expect(out.okIds).toEqual(['a', 'c']);
    expect(out.failCount).toBe(1);
    expect(out.firstErrorMessage).toBe('Order not found');
  });

  it('counts a network-level reject as a failed row instead of throwing', async () => {
    const out = await runBulk(['a', 'b'], async (id) => {
      if (id === 'a') throw new TypeError('fetch failed');
      return okRes();
    });
    expect(out.okIds).toEqual(['b']);
    expect(out.failCount).toBe(1);
    expect(out.firstErrorMessage).toBeNull();
  });

  it('tolerates a failed response whose body is not JSON', async () => {
    const out = await runBulk(['a'], async () => brokenBodyRes());
    expect(out.okIds).toEqual([]);
    expect(out.failCount).toBe(1);
    expect(out.firstErrorMessage).toBeNull();
  });

  it('skips messageless failures when picking the first error message', async () => {
    const out = await runBulk(['a', 'b'], async (id) =>
      id === 'a' ? failRes() : failRes('Second one speaks'),
    );
    expect(out.firstErrorMessage).toBe('Second one speaks');
  });
});

describe('partialFailureMessage', () => {
  it('matches the customers bulk-delete wording', () => {
    expect(partialFailureMessage('Updated', 1, 3)).toBe('Updated 1 of 3 — 2 failed');
  });
});

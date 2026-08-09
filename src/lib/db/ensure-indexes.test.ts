import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { redactBuildError } from './ensure-indexes';

// ── Why this exists ─────────────────────────────────────────────────────
// `ensureDeclaredIndexes` is the only thing that can answer "does this
// environment have all its declared indexes?", and the ways it can answer
// wrongly are all quiet ones.
//
// The comparison itself is `Model.diffIndexes()` — mongoose's, options-aware,
// read-only. These tests therefore do NOT re-test mongoose. They pin the parts
// this file owns: that its output is consumed the right way round, that a
// failed build is recorded rather than thrown, that a missing collection is
// distinguished from a broken read, and that a colliding document's value never
// reaches the report. Whether `diffIndexes` really catches an index whose
// OPTIONS drifted is proved against a live database in the feature's
// verification, because only a real MongoDB can demonstrate it.
//
// An earlier version of this file compared index NAMES, and these fakes were
// built around that. A name is derived from the key pattern alone, so it was
// blind to `unique` and `partialFilterExpression` — the check reported a clean
// bill of health over a missing constraint.

vi.mock('server-only', () => ({}));
vi.mock('@/config/database', () => ({ default: vi.fn(async () => undefined) }));

type Diff = {
  toCreate: [Record<string, unknown>, Record<string, unknown>][];
  toDrop: string[];
};

type FakeModel = {
  schema: {
    indexes: () => [Record<string, unknown>, Record<string, unknown>][];
  };
  createIndexes: () => Promise<void>;
  diffIndexes: () => Promise<Diff>;
  collection: { name: string };
};

const models: Record<string, FakeModel> = {};

vi.mock('@/models/all', () => ({
  get ALL_MODELS() {
    return models;
  },
}));

function fake(
  declared: [Record<string, unknown>, Record<string, unknown>][],
  diff: Partial<Diff> = {},
  opts: { buildThrows?: unknown; diffThrows?: unknown } = {},
): FakeModel {
  return {
    schema: { indexes: () => declared },
    createIndexes: async () => {
      if (opts.buildThrows) throw opts.buildThrows;
    },
    diffIndexes: async () => {
      if (opts.diffThrows) throw opts.diffThrows;
      return { toCreate: diff.toCreate ?? [], toDrop: diff.toDrop ?? [] };
    },
    collection: { name: 'fakes' },
  };
}

/** What the driver throws when a collection does not exist. */
const nsNotFound = Object.assign(new Error('ns does not exist'), {
  code: 26,
  codeName: 'NamespaceNotFound',
});

async function run() {
  const { ensureDeclaredIndexes } = await import('./ensure-indexes');
  return ensureDeclaredIndexes();
}

beforeEach(() => {
  for (const k of Object.keys(models)) delete models[k];
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ensureDeclaredIndexes', () => {
  it('reports nothing missing or extra when diffIndexes finds no difference', async () => {
    models.Thing = fake([[{ slug: 1 }, {}]]);

    const r = await run();

    expect(r.declaredTotal).toBe(1);
    expect(r.missingTotal).toBe(0);
    expect(r.extraTotal).toBe(0);
    expect(r.failureCount).toBe(0);
  });

  it("reads diffIndexes' toCreate as missing, not as extra", async () => {
    // The two halves are trivially swappable and the failure would be silent —
    // an orphan reported as a gap reads as "build it", when the real remedy is
    // the opposite and destructive.
    models.Thing = fake([[{ slug: 1 }, {}]], {
      toCreate: [[{ email: 1 }, {}]],
    });

    const r = await run();

    expect(r.models[0].missing).toEqual(['email_1']);
    expect(r.models[0].extra).toEqual([]);
  });

  it("reads diffIndexes' toDrop as extra, not as missing", async () => {
    models.Thing = fake([[{ slug: 1 }, {}]], { toDrop: ['orphan_1'] });

    const r = await run();

    expect(r.models[0].extra).toEqual(['orphan_1']);
    expect(r.models[0].missing).toEqual([]);
  });

  it('labels a missing index by its explicit name when one is declared', async () => {
    models.Thing = fake([[{ slug: 1 }, { name: 'custom_idx' }]], {
      toCreate: [[{ slug: 1 }, { name: 'custom_idx' }]],
    });

    const r = await run();

    expect(r.models[0].missing).toEqual(['custom_idx']);
  });

  it('labels a compound descending index the way the database names it', async () => {
    // `user_1_createdAt_-1` is what mongosh will show. A label nobody can paste
    // into a shell is worse than no label.
    models.Thing = fake([[{ user: 1, createdAt: -1 }, {}]], {
      toCreate: [[{ user: 1, createdAt: -1 }, {}]],
    });

    const r = await run();

    expect(r.models[0].missing).toEqual(['user_1_createdAt_-1']);
  });

  it('records a build failure and keeps going to the other models', async () => {
    models.Broken = fake(
      [[{ slug: 1 }, {}]],
      {},
      {
        buildThrows: new Error('no permission'),
      },
    );
    models.Fine = fake([[{ email: 1 }, {}]]);

    const r = await run();

    expect(r.failureCount).toBe(1);
    expect(r.models.find((m) => m.model === 'Broken')?.error).toBe(
      'no permission',
    );
    // The healthy model must still have been processed — a throw in one model
    // aborting the loop would leave the rest silently unreported.
    expect(r.models.find((m) => m.model === 'Fine')?.error).toBeNull();
  });

  it('treats a missing collection as nothing-there, not as a failed run', async () => {
    models.Thing = fake([[{ slug: 1 }, {}]], {}, { diffThrows: nsNotFound });

    const r = await run();

    expect(r.failureCount).toBe(0);
    expect(r.models[0].missing).toEqual(['slug_1']);
  });

  it('records any OTHER read failure as an error instead of reporting a false gap', async () => {
    // The half that used to be silent. A timeout or an authorization gap landed
    // in the same bare catch as a missing collection, so every declared index
    // read as missing under a 200 — the most alarming and least accurate answer
    // available.
    models.Thing = fake(
      [[{ slug: 1 }, {}]],
      {},
      {
        diffThrows: new Error('connection timed out'),
      },
    );

    const r = await run();

    expect(r.failureCount).toBe(1);
    expect(r.models[0].error).toBe('connection timed out');
  });

  it('does not build for a model that declares no index', async () => {
    let called = false;
    const m = fake([]);
    m.createIndexes = async () => {
      called = true;
    };
    models.Empty = m;

    await run();

    expect(called).toBe(false);
  });

  it('totals across every model rather than reporting only the first', async () => {
    // EVERY model carries a gap, and the counts must exceed any single model's.
    // An earlier version gave the only gap to the first model, so `sum` and
    // `models[0]` produced the same number and the test passed with the totals
    // replaced by `models[0].missing.length` — caught by mutating the code.
    models.A = fake([[{ a: 1 }, {}]], {
      toCreate: [[{ a: 1 }, {}]],
      toDrop: ['x_1'],
    });
    models.B = fake([[{ b: 1 }, {}]], {
      toCreate: [[{ b: 1 }, {}]],
      toDrop: ['y_1'],
    });
    models.C = fake([[{ c: 1 }, {}]], {
      toCreate: [[{ c: 1 }, {}]],
      toDrop: ['z_1'],
    });

    const r = await run();

    expect(r.declaredTotal).toBe(3);
    expect(r.missingTotal).toBe(3);
    expect(r.extraTotal).toBe(3);
  });

  it('keeps a colliding document value out of the report', async () => {
    // `withCronSecret` spreads the result into the JSON body, so an unredacted
    // E11000 would ship a real customer's email to anyone holding the secret.
    models.Thing = fake(
      [[{ email: 1 }, { unique: true }]],
      {},
      {
        buildThrows: new Error(
          'E11000 duplicate key error collection: elite-cuts.users index: email_1 dup key: { email: "someone@example.com" }',
        ),
      },
    );

    const r = await run();

    const message = r.models[0].error ?? '';
    expect(message).not.toContain('someone@example.com');
    // The actionable part survives.
    expect(message).toContain('email_1');
    expect(message).toContain('dup key: { redacted }');
  });
});

describe('redactBuildError', () => {
  it('leaves an unrelated message untouched', () => {
    expect(redactBuildError(new Error('no permission'))).toBe('no permission');
  });

  it('redacts every dup-key clause, not just the first', () => {
    const out = redactBuildError(
      new Error('dup key: { email: "a@b.c" } and dup key: { phone: "555" }'),
    );
    expect(out).not.toContain('a@b.c');
    expect(out).not.toContain('555');
  });

  it('handles a non-Error throw without losing the message', () => {
    expect(redactBuildError('plain string failure')).toBe(
      'plain string failure',
    );
  });
});

import { describe, expect, it, vi } from 'vitest';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The barrel is `server-only` so a stray client import cannot pull mongoose and
// nineteen schemas into a browser bundle. Same mock every server-module test in
// this project uses.
vi.mock('server-only', () => ({}));


import { ALL_MODELS } from './all';

// ── Why this exists ─────────────────────────────────────────────────────
// Removing an index declaration does NOT remove the index. `autoIndex` only
// ever creates, and after 2026-08-07 nothing in this codebase drops anything —
// Review's `syncIndexes()` was the sole reconciler and it is gone.
//
// That is not theoretical. The 2026-07-30 models audit deleted five field-level
// declarations that duplicated the leading prefix of a compound index. It
// removed the declarations only. All five indexes were still live in the
// database eight days later, invisible to code review because the source was
// correct and only the database disagreed.
//
// So this pins the declared set. It cannot see the database and does not try
// to. What it does is make a declaration change impossible to land silently:
// if a diff here surprises you, that is the point.
//
// **If a removal broke this test, the code change is probably right and the
// job is not finished** — drop the index in the database too, or it lives
// forever. Reading what an environment actually has:
// `db.<collection>.getIndexes()` in mongosh.
//
// Adding an index needs no database action — `autoIndex` is on in every
// environment as of 2026-08-08, so running the app builds it. Only removals
// need hands. For an addition, just update the expectation below.
//
// The five models declaring no index today — AgingCut, DemoResetLock,
// ShopHours, ShopSettings, StaffMember — are absent from `EXPECTED` rather than
// listed as empty. That choice is cosmetic, not behavioural: if one of them
// gains its first index, the guard at the bottom fails either way. (An earlier
// version of this note claimed omitting them avoided that failure. It does not
// — checked by adding an index to AgingCut and watching the guard fail.)

type DeclaredIndex = [Record<string, unknown>, Record<string, unknown>];

const EXPECTED: Record<string, DeclaredIndex[]> = {
  AccountDeletionAudit: [[{ userId: 1 }, {}], [{ performedAt: 1 }, {}]],
  Cart: [[{ user: 1 }, { unique: true }]],
  Delivery: [[{ productId: 1 }, {}]],
  Event: [[{ status: 1 }, {}], [{ date: 1, status: 1 }, {}]],
  Message: [[{ user: 1, createdAt: -1 }, {}]],
  Notification: [
    [{ userId: 1, createdAt: -1 }, {}],
    [{ userId: 1, readAt: 1, createdAt: -1 }, {}],
  ],
  Order: [
    [{ 'guestContact.email': 1 }, { partialFilterExpression: { user: null } }],
    [{ user: 1, createdAt: -1 }, {}],
    [{ createdAt: -1 }, {}],
  ],
  Product: [
    [
      { slug: 1 },
      {
        unique: true,
        partialFilterExpression: { slug: { $type: 'string', $gt: '' } },
      },
    ],
  ],
  Promo: [
    [{ code: 1 }, { unique: true }],
    [{ isActive: 1, endsAt: 1 }, { partialFilterExpression: { isActive: true } }],
  ],
  Review: [
    [
      { user: 1, product: 1 },
      { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } },
    ],
    [{ product: 1, createdAt: -1 }, {}],
  ],
  SavedCard: [
    [{ stubCardId: 1 }, { unique: true }],
    [
      { user: 1, brand: 1, last4: 1, expMonth: 1, expYear: 1 },
      { unique: true },
    ],
  ],
  Shift: [[{ weekStart: 1, dayOfWeek: 1, hourIndex: 1 }, { unique: true }]],
  Stocktake: [[{ createdAt: -1 }, {}]],
  User: [[{ email: 1 }, { unique: true }], [{ createdAt: -1 }, {}]],
};

// There used to be a hand-written `MODELS` map here, pairing the fourteen
// index-declaring model names with their models so the loop below could run.
// It is gone: the names are `Object.keys(EXPECTED)` and the models are
// `ALL_MODELS`, so it was a third list maintained by hand for no reason — and a
// dangerous one. Nothing anchored it, so deleting an entry from it silently
// removed that model's assertion while every remaining test, including the
// guard, stayed green. That is the same "silently ending coverage" failure the
// guard below was written to prevent, reached through the one list nobody was
// checking.
//
// With it gone the project holds ONE hand-maintained list of models — `./all` —
// and `EXPECTED`, which is a list of index declarations rather than of models.

describe('declared schema indexes', () => {
  for (const name of Object.keys(EXPECTED)) {
    it(`${name} declares exactly the expected indexes`, () => {
      const model = ALL_MODELS[name as keyof typeof ALL_MODELS];
      // A name in `EXPECTED` with no model in `./all` fails here rather than
      // silently skipping, which is the direction that matters.
      expect(model, `${name} is in EXPECTED but not in ./all`).toBeDefined();
      expect(model.schema.indexes()).toEqual(EXPECTED[name]);
    });
  }

  // Guards the guard: every model that declares an index must be watched above.
  //
  // The first version of this compared `MODELS` to `EXPECTED` — two lists
  // maintained by hand in the same file. Deleting a model from both left it
  // green while silently ending coverage for that model, which is precisely the
  // failure it was written to prevent. Proved by doing it. So it now measures
  // against the full model set, which is independent of both maps: add an index
  // to an unwatched model, or drop a watched one out, and this fails.
  it('watches every model that declares an index', () => {
    const declaring = Object.entries(ALL_MODELS)
      .filter(([, m]) => m.schema.indexes().length > 0)
      .map(([name]) => name)
      .sort();
    expect(Object.keys(EXPECTED).sort()).toEqual(declaring);
  });

  // Anchors `./all` to the filesystem, which is the one thing here that is not
  // hand-maintained.
  //
  // The guard above cannot do this, and a comment in `./all` used to claim it
  // could. `declaring` is derived FROM `ALL_MODELS`, so a model missing from
  // that file never appears in it, is never added to `EXPECTED` either, and both
  // sides stay equal — the list vouching for itself, which is the exact pattern
  // this file's history records failing twice before.
  //
  // The stakes rose when `lib/db/ensure-indexes` started building from the same
  // list: a model omitted from `./all` is not merely unwatched, it silently
  // falls back to lazy per-process `autoIndex` — reintroducing the problem that
  // module exists to close, invisibly.
  it('lists every model file in ./all', () => {
    const dir = fileURLToPath(new URL('.', import.meta.url));
    const onDisk = readdirSync(dir)
      .filter((f) => f.endsWith('.ts'))
      .filter((f) => f !== 'all.ts' && !f.endsWith('.test.ts'))
      .map((f) => f.replace(/\.ts$/, ''))
      .sort();

    expect(Object.keys(ALL_MODELS).sort()).toEqual(onDisk);
  });
});

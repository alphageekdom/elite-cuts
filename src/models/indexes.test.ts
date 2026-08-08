import { describe, expect, it } from 'vitest';

import AccountDeletionAudit from './AccountDeletionAudit';
import AgingCut from './AgingCut';
import Cart from './Cart';
import DemoResetLock from './DemoResetLock';
import Delivery from './Delivery';
import Event from './Event';
import Message from './Message';
import Notification from './Notification';
import Order from './Order';
import Product from './Product';
import Promo from './Promo';
import Review from './Review';
import SavedCard from './SavedCard';
import Shift from './Shift';
import ShopHours from './ShopHours';
import ShopSettings from './ShopSettings';
import StaffMember from './StaffMember';
import Stocktake from './Stocktake';
import User from './User';

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

const MODELS = {
  AccountDeletionAudit,
  Cart,
  Delivery,
  Event,
  Message,
  Notification,
  Order,
  Product,
  Promo,
  Review,
  SavedCard,
  Shift,
  Stocktake,
  User,
};

// Every model in the project, listed explicitly — deliberately NOT
// `{ ...MODELS, ...the rest }`. Spreading `MODELS` was the second failed attempt
// at this guard: it made the "independent" set shrink in lockstep with the map
// it was supposed to check, so the same deletion sailed through again. Only a
// standalone list is actually independent.
const ALL_MODELS = {
  AccountDeletionAudit,
  AgingCut,
  Cart,
  Delivery,
  DemoResetLock,
  Event,
  Message,
  Notification,
  Order,
  Product,
  Promo,
  Review,
  SavedCard,
  Shift,
  ShopHours,
  ShopSettings,
  StaffMember,
  Stocktake,
  User,
};

describe('declared schema indexes', () => {
  for (const [name, model] of Object.entries(MODELS)) {
    it(`${name} declares exactly the expected indexes`, () => {
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
});

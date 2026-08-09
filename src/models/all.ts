import 'server-only';

import AccountDeletionAudit from './AccountDeletionAudit';
import AgingCut from './AgingCut';
import Cart from './Cart';
import Delivery from './Delivery';
import DemoResetLock from './DemoResetLock';
import DemoResetRun from './DemoResetRun';
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

// ── Every model in the project, in one place ────────────────────────────
// Two consumers, and they need it for opposite reasons:
//
//   `indexes.test.ts`        — to prove no model that declares an index has
//                              fallen out of the watched set.
//   `lib/db/ensure-indexes`  — to build them, because `mongoose.models` holds
//                              only what has already been imported, which is
//                              the very lazy-import problem that code exists
//                              to close.
//
// It is NOT imported by route handlers or components. Those keep importing the
// single model they need, so no route bundle grows by pulling in nineteen
// schemas to use one.
//
// Adding a model? Add it here — and `indexes.test.ts` will tell you if you
// forget, because it reads `src/models/` off disk and asserts every file appears
// in this list.
//
// That guard is new, and it exists because the obvious one does not work. This
// file used to claim the *index* guard covered it: "fails if a model declaring
// an index is missing from this list". It cannot. That guard computes the
// declaring set FROM `ALL_MODELS`, so a model absent here never enters it, never
// gets added to `EXPECTED` either, and both sides stay equal — the list vouching
// for itself, a pattern this project's history records failing twice already.
//
// The consequence was worse than a missing test. `lib/db/ensure-indexes` builds
// from this list too, so a model omitted here silently reverted to lazy
// per-process `autoIndex` — reintroducing the exact problem that module exists
// to close, while the tool reported all clear.
//
// Deliberately unannotated so the concrete model types are inferred. An earlier
// draft wrote `Record<string, Model<never>>` and needed an `as unknown as` cast
// to satisfy it — a cast that buys nothing here, since every consumer only calls
// `schema.indexes()` and `createIndexes()` and reads `modelName` /
// `collection.name`, all of which exist on `Model<T>` for any `T`.
export const ALL_MODELS = {
  AccountDeletionAudit,
  AgingCut,
  Cart,
  Delivery,
  DemoResetLock,
  DemoResetRun,
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

// Deliberately no exported alias for the model union. One was added here and
// removed on the same branch: its comment said it existed "so a signature can
// say what it needs", and no signature ever named it — both consumers iterate
// with `Object.entries(ALL_MODELS)` and get the union inferred. Add one when a
// signature actually needs it, not in anticipation.

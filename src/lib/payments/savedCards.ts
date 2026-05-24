import 'server-only';

import { randomBytes } from 'crypto';

import connectDB from '@/config/database';
import SavedCard from '@/models/SavedCard';
import User from '@/models/User';
import { getStripe, isStubMode } from '@/lib/payments/stripe';

// Unified return shape so the profile UI doesn't need to branch on stub vs
// real. `id` carries the routing: `pm_...` is a Stripe PaymentMethod, and
// `card_...` is a row in the local SavedCard collection. In real Stripe mode
// the list merges both sources so demo Card-tile saves coexist with
// Stripe-attached cards. `cardholderName` is optional — Stripe-attached cards
// usually don't carry it (Stripe stores billing details separately).
export type SavedCardSummary = {
  id: string;
  cardholderName?: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

// Local SavedCard rows mint ids prefixed `card_` so the delete/update routers
// can tell them apart from Stripe's `pm_` ids without an extra DB lookup.
const isLocalCardId = (id: string): boolean => id.startsWith('card_');

// Returns the user's Stripe Customer id, creating one on Stripe and persisting
// it on the User document if missing. Stub mode never needs a real customer —
// returns null so callers can omit `customer` from the Checkout Session.
//
// Concurrent first-checkouts (double-click, two tabs, retry) used to both
// create a Stripe Customer and race the `user.save()` write — the loser would
// be orphaned on Stripe's side while still attached to the in-flight Checkout
// Session, so the customer's first saved card silently vanished from their
// profile. We now claim the slot atomically via `findOneAndUpdate` against a
// null `stripeCustomerId` after creating the Stripe Customer; if we lose the
// race, the just-created Customer gets deleted and we re-read the winner's id.
export const getOrCreateStripeCustomer = async (
  userId: string,
): Promise<string | null> => {
  if (isStubMode()) return null;

  await connectDB();
  const user = await User.findById(userId).select(
    'name email stripeCustomerId',
  );
  if (!user) return null;
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: String(user._id) },
  });

  const claimed = await User.findOneAndUpdate(
    { _id: userId, $or: [{ stripeCustomerId: { $exists: false } }, { stripeCustomerId: null }, { stripeCustomerId: '' }] },
    { $set: { stripeCustomerId: customer.id } },
    { new: true },
  ).select('stripeCustomerId');

  if (claimed?.stripeCustomerId === customer.id) {
    return customer.id;
  }

  // Lost the race — another request already persisted a Stripe Customer for
  // this user. Delete our orphan so no payment methods can attach to it, then
  // return the winner's id.
  try {
    await stripe.customers.del(customer.id);
  } catch (err) {
    console.error('[savedCards] failed to delete orphan Stripe Customer', err);
  }
  const winner = await User.findById(userId).select('stripeCustomerId').lean();
  return winner?.stripeCustomerId ?? null;
};

const mapLocalRow = (row: {
  stubCardId: string;
  cardholderName?: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  createdAt: Date;
}): SavedCardSummary & { createdAt: Date } => ({
  id: row.stubCardId,
  cardholderName: row.cardholderName,
  brand: row.brand,
  last4: row.last4,
  expMonth: row.expMonth,
  expYear: row.expYear,
  createdAt: row.createdAt,
});

export const listSavedCards = async (
  userId: string,
): Promise<SavedCardSummary[]> => {
  await connectDB();

  // Local SavedCard rows are visible in both modes — in stub mode they're
  // the only source; in real mode they sit alongside Stripe-attached cards
  // so demo Card-tile saves don't silently vanish when sandbox creds get
  // wired up. Stripe cards live in a separate namespace (pm_ ids) so the
  // two sets can't collide.
  const localRows = await SavedCard.find({ user: userId })
    .sort({ createdAt: -1 })
    .lean();
  const localCards = localRows.map(mapLocalRow);

  if (isStubMode()) {
    return localCards.map(({ createdAt: _c, ...summary }) => summary);
  }

  const user = await User.findById(userId).select('stripeCustomerId').lean();
  const stripeCards: (SavedCardSummary & { createdAt: Date })[] = [];
  if (user?.stripeCustomerId) {
    const stripe = getStripe();
    const pms = await stripe.customers.listPaymentMethods(user.stripeCustomerId, {
      type: 'card',
      limit: 20,
    });
    for (const pm of pms.data) {
      if (!pm.card) continue;
      stripeCards.push({
        id: pm.id,
        cardholderName: pm.billing_details?.name ?? undefined,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
        createdAt: new Date(pm.created * 1000),
      });
    }
  }

  // Merge most-recent-first across both sources by their respective creation
  // timestamps. Both already sorted descending; mergesort the two streams.
  const merged = [...localCards, ...stripeCards].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
  return merged.map(({ createdAt: _c, ...summary }) => summary);
};

// Fetch one saved card by id, returning null if it doesn't exist or doesn't
// belong to this user. Used by the checkout session route to validate a
// `savedCardId` the shopper picked from the saved-cards strip before
// completing the demo order. Routes by id prefix (local vs Stripe) like the
// other helpers.
export const getSavedCard = async (
  userId: string,
  cardId: string,
): Promise<SavedCardSummary | null> => {
  await connectDB();

  if (isLocalCardId(cardId)) {
    const row = await SavedCard.findOne({ user: userId, stubCardId: cardId }).lean();
    if (!row) return null;
    const { createdAt: _c, ...summary } = mapLocalRow(row);
    return summary;
  }

  if (isStubMode()) return null;

  const user = await User.findById(userId).select('stripeCustomerId').lean();
  if (!user?.stripeCustomerId) return null;

  const stripe = getStripe();
  const pm = await stripe.paymentMethods.retrieve(cardId);
  if (pm.customer !== user.stripeCustomerId || !pm.card) return null;
  return {
    id: pm.id,
    cardholderName: pm.billing_details?.name ?? undefined,
    brand: pm.card.brand,
    last4: pm.card.last4,
    expMonth: pm.card.exp_month,
    expYear: pm.card.exp_year,
  };
};

// Returns true if the card existed and was removed, false if no matching card
// belonged to this user. Routes by id prefix: local `card_` ids hit the
// SavedCard collection; Stripe `pm_` ids hit the Stripe API. Ownership is
// re-validated on both paths so a tampered id can't detach another
// customer's card.
export const deleteSavedCard = async (
  userId: string,
  cardId: string,
): Promise<boolean> => {
  await connectDB();

  if (isLocalCardId(cardId)) {
    const result = await SavedCard.deleteOne({ user: userId, stubCardId: cardId });
    return result.deletedCount === 1;
  }

  // Stripe path — won't be reachable in stub mode for `pm_` ids (none exist),
  // and won't be reachable for local ids in real mode (routed above).
  if (isStubMode()) return false;

  const user = await User.findById(userId).select('stripeCustomerId').lean();
  if (!user?.stripeCustomerId) return false;

  const stripe = getStripe();
  const pm = await stripe.paymentMethods.retrieve(cardId);
  if (pm.customer !== user.stripeCustomerId) return false;

  await stripe.paymentMethods.detach(cardId);
  return true;
};

const STUB_BRANDS = ['Visa', 'Mastercard', 'Amex'] as const;

const randomLast4 = (): string =>
  String(parseInt(randomBytes(2).toString('hex'), 16) % 10000).padStart(4, '0');

// Stub-only: writes a fake card row after a mock checkout completes when the
// customer ticked Save. Picks a plausible brand, random last4, and an expiry
// 2–4 years out so the demo reads honestly. Real Stripe mode attaches the card
// via setup_future_usage on the Checkout Session, not through this helper.
export const recordStubSavedCard = async (userId: string): Promise<void> => {
  if (!isStubMode()) return;

  await connectDB();
  const now = new Date();
  const yearsOut = 2 + (parseInt(randomBytes(1).toString('hex'), 16) % 3);
  const brand = STUB_BRANDS[parseInt(randomBytes(1).toString('hex'), 16) % STUB_BRANDS.length];

  try {
    await SavedCard.create({
      user: userId,
      stubCardId: `card_stub_${randomBytes(8).toString('hex')}`,
      brand,
      last4: randomLast4(),
      expMonth: 1 + (parseInt(randomBytes(1).toString('hex'), 16) % 12),
      expYear: now.getFullYear() + yearsOut,
    });
  } catch (err) {
    // Random-collision dupes from the unique index are silently swallowed —
    // the order is paid and the customer is mid-redirect; surfacing a 1-in-
    // 360,000 collision as an error would be more confusing than the missed
    // mirror row.
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: unknown }).code === 11000
    ) {
      return;
    }
    throw err;
  }
};

export type TypedCardDetails = {
  cardholderName: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

// Sanity-check the display fields the Card-tile form lifts into the POST
// body. Server-side gate so a tampered request can't write garbage into the
// SavedCard collection.
export const validateTypedCardDetails = (
  input: unknown,
): TypedCardDetails | null => {
  if (!input || typeof input !== 'object') return null;
  const obj = input as Record<string, unknown>;
  const cardholderName =
    typeof obj.cardholderName === 'string'
      ? obj.cardholderName.trim().slice(0, 120)
      : '';
  const brand = typeof obj.brand === 'string' ? obj.brand.trim().slice(0, 32) : '';
  const last4 = typeof obj.last4 === 'string' ? obj.last4.trim() : '';
  const expMonth = typeof obj.expMonth === 'number' ? obj.expMonth : NaN;
  const expYear = typeof obj.expYear === 'number' ? obj.expYear : NaN;
  if (cardholderName.length < 2) return null;
  if (!brand) return null;
  if (!/^\d{4}$/.test(last4)) return null;
  if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) return null;
  const thisYear = new Date().getFullYear();
  if (!Number.isInteger(expYear) || expYear < thisYear || expYear > thisYear + 20) {
    return null;
  }
  return { cardholderName, brand, last4, expMonth, expYear };
};

export type RecordTypedCardResult = 'created' | 'duplicate';

// Writes a SavedCard from typed-in display fields after a Card-tile demo
// order completes or from the profile Add-card form. The Card tile never
// talks to Stripe, so this writes to the local SavedCard collection
// regardless of stub-vs-real mode — those rows surface in the profile tab in
// both modes (alongside Stripe-attached cards in real mode). Returns
// `'duplicate'` if the (user, brand, last4, expiry) combination already
// exists on this account so callers can surface a friendly message.
export const recordTypedCardSave = async (
  userId: string,
  details: TypedCardDetails,
): Promise<RecordTypedCardResult> => {
  await connectDB();
  try {
    await SavedCard.create({
      user: userId,
      stubCardId: `card_typed_${randomBytes(8).toString('hex')}`,
      cardholderName: details.cardholderName,
      brand: details.brand,
      last4: details.last4,
      expMonth: details.expMonth,
      expYear: details.expYear,
    });
    return 'created';
  } catch (err) {
    // MongoDB duplicate-key error from the unique compound index. Treated as
    // a soft conflict so the checkout path can silently ignore it (the order
    // is already paid) and the profile Add-card path can surface a 409.
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: unknown }).code === 11000
    ) {
      return 'duplicate';
    }
    throw err;
  }
};

// Updates expiry on a saved card. Stub mode mutates the local SavedCard row;
// real mode calls Stripe's paymentMethods.update which is the only field on a
// PaymentMethod that can change without re-tokenizing the whole card.
// Ownership is re-validated on both paths so a tampered id can't update
// another customer's card.
export const updateSavedCardExpiry = async (
  userId: string,
  cardId: string,
  expMonth: number,
  expYear: number,
): Promise<boolean> => {
  if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) return false;
  const thisYear = new Date().getFullYear();
  if (!Number.isInteger(expYear) || expYear < thisYear || expYear > thisYear + 20) {
    return false;
  }

  await connectDB();

  if (isLocalCardId(cardId)) {
    try {
      const result = await SavedCard.updateOne(
        { user: userId, stubCardId: cardId },
        { $set: { expMonth, expYear } },
      );
      return result.matchedCount === 1;
    } catch (err) {
      // Editing the expiry of one card to match another existing card's
      // (brand, last4, expiry) combo would collide with the unique index.
      // Treat as no-op rather than crashing; caller surfaces 409 / 404.
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: unknown }).code === 11000
      ) {
        return false;
      }
      throw err;
    }
  }

  if (isStubMode()) return false;

  const user = await User.findById(userId).select('stripeCustomerId').lean();
  if (!user?.stripeCustomerId) return false;

  const stripe = getStripe();
  const pm = await stripe.paymentMethods.retrieve(cardId);
  if (pm.customer !== user.stripeCustomerId) return false;

  await stripe.paymentMethods.update(cardId, {
    card: { exp_month: expMonth, exp_year: expYear },
  });
  return true;
};

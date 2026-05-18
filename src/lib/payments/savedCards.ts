import 'server-only';

import { randomBytes } from 'crypto';

import connectDB from '@/config/database';
import SavedCard from '@/models/SavedCard';
import User from '@/models/User';
import { getStripe, isStubMode } from '@/lib/payments/stripe';

// Unified return shape so the Phase B profile UI doesn't need to branch on
// stub vs real. `id` is a Stripe PaymentMethod id (pm_...) in real mode and
// the SavedCard.stubCardId in stub mode — opaque to the caller either way.
export type SavedCardSummary = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

// Returns the user's Stripe Customer id, creating one on Stripe and persisting
// it on the User document if missing. Stub mode never needs a real customer —
// returns null so callers can omit `customer` from the Checkout Session.
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

  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
};

export const listSavedCards = async (
  userId: string,
): Promise<SavedCardSummary[]> => {
  await connectDB();

  if (isStubMode()) {
    const rows = await SavedCard.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();
    return rows.map((row) => ({
      id: row.stubCardId,
      brand: row.brand,
      last4: row.last4,
      expMonth: row.expMonth,
      expYear: row.expYear,
    }));
  }

  const user = await User.findById(userId).select('stripeCustomerId').lean();
  if (!user?.stripeCustomerId) return [];

  const stripe = getStripe();
  const pms = await stripe.customers.listPaymentMethods(user.stripeCustomerId, {
    type: 'card',
    limit: 20,
  });
  return pms.data
    .filter((pm) => pm.card)
    .map((pm) => ({
      id: pm.id,
      brand: pm.card!.brand,
      last4: pm.card!.last4,
      expMonth: pm.card!.exp_month,
      expYear: pm.card!.exp_year,
    }));
};

// Returns true if the card existed and was removed, false if no matching card
// belonged to this user. Ownership is re-validated on both paths so a tampered
// id can't detach another customer's card.
export const deleteSavedCard = async (
  userId: string,
  cardId: string,
): Promise<boolean> => {
  await connectDB();

  if (isStubMode()) {
    const result = await SavedCard.deleteOne({ user: userId, stubCardId: cardId });
    return result.deletedCount === 1;
  }

  const user = await User.findById(userId).select('stripeCustomerId').lean();
  if (!user?.stripeCustomerId) return false;

  const stripe = getStripe();
  // Confirm the PM is attached to this user's Stripe Customer before detaching;
  // retrieving the PM and comparing `customer` is the cheapest ownership check.
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

  await SavedCard.create({
    user: userId,
    stubCardId: `card_stub_${randomBytes(8).toString('hex')}`,
    brand,
    last4: randomLast4(),
    expMonth: 1 + (parseInt(randomBytes(1).toString('hex'), 16) % 12),
    expYear: now.getFullYear() + yearsOut,
  });
};

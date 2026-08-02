import { NextResponse } from 'next/server';

import connectDB from '@/config/database';
import User from '@/models/User';
import { getSessionUser } from '@/lib/auth/session';
import { getShopSettings } from '@/lib/shop-settings/queries';
import {
  getEffectiveBalance,
  getTierView,
  tierViewToInfo,
} from '@/lib/rewards/calculator';

// GET /api/me/rewards — returns the signed-in customer's effective rewards
// balance plus the public-facing redemption settings the checkout block
// needs to render and pre-validate. Authoritative validation still runs in
// the orders POST handler; this endpoint just powers the UI.
//
// `tier` was added for the navbar account menu, which states the member's
// standing on open. It is the same `getTierView` → `TierInfo` pair the account
// dashboard renders, so the menu and the dashboard's TierCard cannot disagree.
// Note it measures *qualifying points this period*, not the spendable
// `balance` above it — the two are different numbers and display code must not
// swap one for the other.
export const GET = async () => {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const [user, settings] = await Promise.all([
      User.findById(sessionUser.userId)
        .select(
          'rewardPoints lifetimePoints pointsHistory createdAt tierAnniversaryAt currentTier',
        )
        .lean(),
      getShopSettings(),
    ]);
    if (!user) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const effective = getEffectiveBalance(user);
    // Read-only on purpose. The account dashboard persists `currentTier` +
    // `tierAnniversaryAt` when a reassessment lands; this GET deliberately
    // doesn't, so opening a menu never writes. Both paths run the same pure
    // function over the same document, so they agree either way — an
    // unpersisted reassessment just recomputes to the same answer next read.
    const tierView = getTierView(user, settings);

    return NextResponse.json({
      balance: effective.balance,
      lifetimePoints: effective.lifetimePoints,
      tier: tierViewToInfo(tierView, settings),
      // Sent rather than derived from `tier.nextThreshold - tier.pointsToNext`,
      // which is the same number today only because that's how `getTierView`
      // happens to compute it. The bar's numerator is not a detail to
      // reverse-engineer from two other fields.
      qualifying: tierView.qualifying,
      redemptionPoints: settings.redemptionPoints,
      redemptionDollars: settings.redemptionDollars,
      minToRedeem: settings.minToRedeem,
      maxRedemptionPercent: settings.maxRedemptionPercent,
      maxRedemptionDollars: settings.maxRedemptionDollars,
    });
  } catch (error) {
    console.error('[me/rewards GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
};

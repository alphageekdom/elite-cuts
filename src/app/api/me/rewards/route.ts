import { NextResponse } from 'next/server';

import connectDB from '@/config/database';
import User from '@/models/User';
import { getSessionUser } from '@/lib/auth/session';
import { getShopSettings } from '@/lib/shop-settings/queries';
import { getEffectiveBalance } from '@/lib/rewards/calculator';

// GET /api/me/rewards — returns the signed-in customer's effective rewards
// balance plus the public-facing redemption settings the checkout block
// needs to render and pre-validate. Authoritative validation still runs in
// the orders POST handler; this endpoint just powers the UI.
export const GET = async () => {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const [user, settings] = await Promise.all([
      User.findById(sessionUser.userId).select('rewardPoints lifetimePoints pointsHistory').lean(),
      getShopSettings(),
    ]);
    if (!user) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const effective = getEffectiveBalance(user);

    return NextResponse.json({
      balance: effective.balance,
      lifetimePoints: effective.lifetimePoints,
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

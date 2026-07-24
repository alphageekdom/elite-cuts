import type { Metadata } from 'next';

import RewardsHero from '@/components/rewards/RewardsHero';
import RewardsStanding, {
  type MemberStanding,
} from '@/components/rewards/RewardsStanding';
import RewardsHowItWorks from '@/components/rewards/RewardsHowItWorks';
import RewardsTiers from '@/components/rewards/RewardsTiers';
import RewardsCalculator from '@/components/rewards/RewardsCalculator';
import RewardsFaqSection from '@/components/rewards/RewardsFaqSection';
import RewardsCtaStrip from '@/components/rewards/RewardsCtaStrip';
import { getShopSettings } from '@/lib/shop-settings/queries';
import { getSessionUser } from '@/lib/auth/session';
import connectDB from '@/config/database';
import User from '@/models/User';
import {
  getEffectiveBalance,
  getTierView,
  getTier,
  toRewardsPublicSettings,
} from '@/lib/rewards/calculator';

export const metadata: Metadata = {
  title: 'Rewards',
  description:
    'Earn points on every order, unlock perks, and climb the tiers. Free to join, no subscription.',
};

export default async function RewardsPage() {
  const settings = await getShopSettings();

  // Real standing for a signed-in member; null for guests. Read-only view —
  // the tier is computed fresh from the tested helpers each render, so no
  // anniversary persistence happens here (the profile owns that write path).
  let member: MemberStanding | null = null;
  const sessionUser = await getSessionUser();
  if (sessionUser?.userId) {
    await connectDB();
    const user = await User.findById(sessionUser.userId)
      .select(
        'rewardPoints lifetimePoints pointsHistory tierAnniversaryAt currentTier createdAt',
      )
      .lean<{
        rewardPoints?: number;
        lifetimePoints?: number;
        pointsHistory?: Parameters<
          typeof getEffectiveBalance
        >[0]['pointsHistory'];
        tierAnniversaryAt?: Date | null;
        currentTier?: Parameters<typeof getTierView>[0]['currentTier'];
        createdAt?: Date;
      }>();
    if (user) {
      const balance = getEffectiveBalance(user).balance;
      const tierView = getTierView(user, settings);
      member = {
        balance,
        qualifying: tierView.qualifying,
        tierLabel: tierView.label,
        pointsToNext: tierView.pointsToNext,
        nextTierLabel:
          tierView.nextThreshold === null
            ? null
            : getTier(tierView.nextThreshold, settings).label,
      };
    }
  }

  // Client components get only the public rewards slice — never the full
  // settings doc with its admin-only notification/dormancy/pickup fields.
  // The server-rendered sections (Hero, HowItWorks, Tiers) keep the full doc
  // since nothing they read ever serializes to the browser.
  const publicSettings = toRewardsPublicSettings(settings);

  return (
    <>
      <RewardsHero settings={settings} />
      <RewardsStanding settings={publicSettings} member={member} />
      <RewardsHowItWorks settings={settings} />
      <RewardsTiers settings={settings} />
      <RewardsCalculator settings={publicSettings} />
      <RewardsFaqSection settings={publicSettings} />
      <RewardsCtaStrip />
    </>
  );
}

import type { Metadata } from 'next';

import RewardsHero from '@/components/rewards/RewardsHero';
import RewardsHowItWorks from '@/components/rewards/RewardsHowItWorks';
import RewardsTiers from '@/components/rewards/RewardsTiers';
import RewardsFaqSection from '@/components/rewards/RewardsFaqSection';
import RewardsCtaStrip from '@/components/rewards/RewardsCtaStrip';
import { getShopSettings } from '@/lib/shop-settings/queries';

export const metadata: Metadata = {
  title: 'Rewards — EliteCuts',
  description:
    'Earn points on every order, unlock perks, and climb the tiers. Free to join, no subscription.',
};

export default async function RewardsPage() {
  const settings = await getShopSettings();
  return (
    <>
      <RewardsHero settings={settings} />
      <RewardsHowItWorks settings={settings} />
      <RewardsTiers settings={settings} />
      <RewardsFaqSection settings={settings} />
      <RewardsCtaStrip />
    </>
  );
}

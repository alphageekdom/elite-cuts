import type { Metadata } from 'next';

import RewardsHero from '@/components/rewards/RewardsHero';
import RewardsHowItWorks from '@/components/rewards/RewardsHowItWorks';
import RewardsTiers from '@/components/rewards/RewardsTiers';
import RewardsFaqSection from '@/components/rewards/RewardsFaqSection';
import RewardsCtaStrip from '@/components/rewards/RewardsCtaStrip';

export const metadata: Metadata = {
  title: 'Rewards — EliteCuts',
  description:
    'Earn points on every order, unlock perks, and climb the tiers. Free to join, no subscription.',
};

export default function RewardsPage() {
  return (
    <>
      <RewardsHero />
      <RewardsHowItWorks />
      <RewardsTiers />
      <RewardsFaqSection />
      <RewardsCtaStrip />
    </>
  );
}

import type { Metadata } from 'next';

import OurStoryHero from '@/components/our-story/OurStoryHero';
import OurStoryCover from '@/components/our-story/OurStoryCover';
import OurStoryOrigin from '@/components/our-story/OurStoryOrigin';
import OurStoryTimeline from '@/components/our-story/OurStoryTimeline';
import OurStoryPrinciples from '@/components/our-story/OurStoryPrinciples';
import OurStoryTeam from '@/components/our-story/OurStoryTeam';
import OurStorySourcing from '@/components/our-story/OurStorySourcing';
import OurStoryCraftNumbers from '@/components/our-story/OurStoryCraftNumbers';
import OurStoryVisit from '@/components/our-story/OurStoryVisit';

export const metadata: Metadata = {
  title: 'Our Story | EliteCuts',
  description:
    'A neighborhood butcher shop, modernized. Learn how EliteCuts started and what we stand for.',
};

export default function OurStoryPage() {
  return (
    <>
      <OurStoryHero />
      <OurStoryCover />
      <OurStoryOrigin />
      <OurStoryTimeline />
      <OurStoryPrinciples />
      <OurStoryTeam />
      <OurStorySourcing />
      <OurStoryCraftNumbers />
      <OurStoryVisit />
    </>
  );
}

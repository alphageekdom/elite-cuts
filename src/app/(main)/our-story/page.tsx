import type { Metadata } from 'next';

import {
  getShopSettings,
  formatShopCityStateZip,
} from '@/lib/shop-settings/queries';
import {
  getShopHours,
  formatShopHoursCondensed,
  formatOpenDaysSpan,
} from '@/lib/shop-settings/hours-queries';
import { foundingYearsLabel } from '@/lib/shop-settings/founding';
import connectDB from '@/config/database';
import Product from '@/models/Product';
import StaffMember from '@/models/StaffMember';
import { VISIBLE_PRODUCT_FILTER } from '@/lib/products/constants';
import OurStoryHero from '@/components/our-story/OurStoryHero';
import OurStoryCover from '@/components/our-story/OurStoryCover';
import OurStoryOrigin from '@/components/our-story/OurStoryOrigin';
import OurStoryTimeline from '@/components/our-story/OurStoryTimeline';
import OurStoryPrinciples from '@/components/our-story/OurStoryPrinciples';
import OurStoryTeam from '@/components/our-story/OurStoryTeam';
import OurStorySourcing from '@/components/our-story/OurStorySourcing';
import OurStoryCraftNumbers from '@/components/our-story/OurStoryCraftNumbers';
import OurStoryVisit from '@/components/our-story/OurStoryVisit';
import OurStoryComeBy from '@/components/our-story/OurStoryComeBy';

export const metadata: Metadata = {
  title: 'Our Story',
  description:
    'A neighborhood butcher shop, modernized. Learn how EliteCuts started and what we stand for.',
};

export default async function OurStoryPage() {
  await connectDB();

  const [settings, hoursDays, cutCount, staffCount] = await Promise.all([
    getShopSettings(),
    getShopHours(),
    // The same filter the catalog listing uses, so "N cuts in the case" counts
    // exactly what a customer would find on the shop page.
    Product.countDocuments(VISIBLE_PRODUCT_FILTER),
    StaffMember.countDocuments({ status: { $ne: 'inactive' } }),
  ]);

  const hours = formatShopHoursCondensed(hoursDays);
  const openDaysLabel = formatOpenDaysSpan(hoursDays);

  // Clock reads happen here rather than in the components: the purity rule is
  // relaxed for page.tsx (server-rendered once per request), and the timeline
  // is a client component where reading the clock during render is impure.
  const now = new Date();
  const yearsLabel = foundingYearsLabel(now);
  const currentYear = now.getFullYear();

  return (
    <>
      <OurStoryHero
        cityStateZip={formatShopCityStateZip(settings)}
        cutCount={cutCount}
        staffCount={staffCount}
        yearsLabel={yearsLabel}
      />
      <OurStoryCover />
      <OurStoryOrigin street={settings.street} />
      <OurStoryTimeline
        cutCount={cutCount}
        staffCount={staffCount}
        currentYear={currentYear}
        yearsLabel={yearsLabel}
      />
      <OurStoryPrinciples />
      <OurStoryTeam staffCount={staffCount} />
      <OurStorySourcing />
      <OurStoryCraftNumbers yearsLabel={yearsLabel} />
      <OurStoryVisit
        street={settings.street}
        cityStateZip={formatShopCityStateZip(settings)}
        phone={settings.phone}
        hours={hours}
      />
      <OurStoryComeBy openDaysLabel={openDaysLabel} street={settings.street} />
    </>
  );
}

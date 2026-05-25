import { Suspense } from 'react';
import About from '@/components/home/About';
import CTA from '@/components/home/CTA';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import Hero from '@/components/home/Hero';
import Marquee from '@/components/home/Marquee';
import Partners from '@/components/home/Partners';
import Reviews from '@/components/home/Reviews';
import HolidaySection from '@/components/holiday/HolidaySection';
import GrillEventHero from '@/components/grill-event/GrillEventHero';
import AccountDeletedBanner from '@/components/profile/AccountDeletedBanner';
import { getActiveEvent } from '@/lib/events/queries';

const HomePage = async () => {
  const activeEvent = await getActiveEvent();
  return (
    <>
      <Suspense fallback={null}>
        <AccountDeletedBanner />
      </Suspense>
      {activeEvent ? <GrillEventHero event={activeEvent} /> : <Hero />}
      <HolidaySection />
      <Marquee />
      <FeaturedProducts />
      <About />
      <Partners />
      <Reviews />
      <CTA />
    </>
  );
};

export default HomePage;

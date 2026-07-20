import { Suspense } from 'react';
import type { Metadata } from 'next';
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
import { getShopSettings } from '@/lib/shop-settings/queries';
import { SITE_URL } from '@/lib/seo/site-url';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

const HomePage = async () => {
  const [activeEvent, settings] = await Promise.all([
    getActiveEvent(),
    getShopSettings(),
  ]);

  // Honest structured data only — every field below is rendered somewhere on
  // the site. No ratings, reviews, or offers: demo products aren't
  // purchasable goods in the rich-results sense.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: settings.shopName,
        url: SITE_URL,
      },
      {
        '@type': 'LocalBusiness',
        name: settings.shopName,
        description: settings.description,
        telephone: settings.phone,
        url: SITE_URL,
        address: {
          '@type': 'PostalAddress',
          streetAddress: settings.street,
          addressLocality: settings.city,
          addressRegion: settings.state,
          postalCode: settings.zip,
          addressCountry: 'US',
        },
      },
    ],
  };

  return (
    <>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import connectDB from '@/config/database';
import Product from '@/models/Product';
import { VISIBLE_PRODUCT_FILTER } from '@/lib/products/constants';
import { getSessionUser } from '@/lib/auth/session';
import { DEMO_STARTING_POINTS } from '@/lib/demo/reset';
import DemoDoors from '@/components/demo/DemoDoors';
import DemoGroundRules from '@/components/demo/DemoGroundRules';
import DemoTour from '@/components/demo/DemoTour';
import DemoFaq from '@/components/demo/DemoFaq';
import DemoCtaBand from '@/components/demo/DemoCtaBand';
import Reveal from '@/components/uielements/Reveal';

export const metadata: Metadata = {
  title: 'Demo',
  description:
    'Explore EliteCuts as a customer or run it as the owner — no account, no card, nothing to sign up for.',
};

export const dynamic = 'force-dynamic';

export default async function DemoPage() {
  // A signed-in visitor reaching /demo gets bounced to the surface that
  // matches their session — a logged-in customer back to the catalog, a
  // logged-in admin to the dashboard. Avoids the awkward state where the
  // demo cards offer to start a session they already have.
  const sessionUser = await getSessionUser();
  if (sessionUser?.user) {
    redirect(sessionUser.user.isAdmin ? '/dashboard' : '/products');
  }

  // Counted, not typed in. The same filter and pattern the catalog and Our
  // Story pages use, so the three surfaces can't quote different totals.
  await connectDB();
  const cutCount = await Product.countDocuments(VISIBLE_PRODUCT_FILTER);

  const heroFacts = [
    { label: 'Ways in', value: 'Customer · Owner' },
    { label: 'Setup', value: 'None — no signup' },
    { label: 'Catalog', value: `${cutCount} cuts, live data` },
    { label: 'Resets', value: 'Overnight' },
  ];

  return (
    <div className='bg-cream'>
      <section className='px-4 pt-16 pb-10 sm:px-8 sm:pt-20 lg:px-16'>
        <div className='mx-auto grid max-w-7xl items-end gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-18'>
          <Reveal>
            <div className='text-camel-deep mb-6 inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.22em] uppercase'>
              <span aria-hidden className='bg-camel h-px w-7' />
              Live demo
            </div>
            <h1 className='font-display mb-6 max-w-[14ch] text-[clamp(42px,7vw,88px)] leading-[0.98] font-normal tracking-tight'>
              Take the whole shop for a{' '}
              <em className='text-oxblood italic'>spin.</em>
            </h1>
            <p className='text-ink-soft max-w-[52ch] text-[17px] leading-[1.65]'>
              Two ways in — shop the catalog like a customer, or run the place
              like the owner. Real data, working flows, nothing to sign up for.
            </p>
          </Reveal>

          <Reveal delayMs={100}>
            <dl className='flex flex-col lg:pb-1.5'>
              {heroFacts.map((fact) => (
                <div
                  key={fact.label}
                  className='border-line flex items-center justify-between gap-4 border-t py-3.5'
                >
                  <dt className='text-muted text-[11.5px] tracking-[0.14em] uppercase'>
                    {fact.label}
                  </dt>
                  <dd className='text-ink text-right text-[14px] font-semibold'>
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      <section className='px-4 pb-20 sm:px-8 sm:pb-24 lg:px-16'>
        <div className='mx-auto max-w-7xl'>
          <Reveal>
            <DemoDoors
              cutCount={cutCount}
              startingPoints={DEMO_STARTING_POINTS}
            />
          </Reveal>
        </div>
      </section>

      <DemoGroundRules cutCount={cutCount} />
      <DemoTour startingPoints={DEMO_STARTING_POINTS} />
      <DemoFaq />
      <DemoCtaBand />
    </div>
  );
}

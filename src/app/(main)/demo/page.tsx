import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getSessionUser } from '@/lib/getSessionUser';
import DemoCards from '@/components/demo/DemoCards';

export const metadata: Metadata = {
  title: 'Demo · EliteCuts',
  description:
    'Explore EliteCuts as a customer or preview the admin dashboard — no account needed.',
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

  return (
    <main className='min-h-[calc(100vh-5rem)] bg-cream'>
      <section className='mx-auto max-w-5xl px-4 pt-24 pb-20 sm:px-6 sm:pt-32 lg:px-8'>
        <header className='mb-12 text-center sm:mb-16'>
          <span className='font-display italic text-sm text-camel mb-4 inline-block tracking-[0.02em]'>
            ↗ Take it for a spin
          </span>
          <h1 className='font-display font-normal text-[clamp(40px,5vw,60px)] leading-[1.05] tracking-tight mb-5'>
            Choose a demo <em className='italic text-oxblood'>experience.</em>
          </h1>
          <p className='mx-auto max-w-[52ch] text-ink-soft text-[16px] leading-relaxed'>
            Explore the butcher shop as a customer or preview the admin
            dashboard. No account, no card, no commitment.
          </p>
        </header>

        <DemoCards />

        <p className='mx-auto mt-12 max-w-[52ch] text-center text-[12px] tracking-[0.06em] uppercase text-muted'>
          Already have an account? <a href='/login' className='border-b border-muted text-ink-soft hover:text-ink transition-colors'>Sign in</a>
        </p>
      </section>
    </main>
  );
}

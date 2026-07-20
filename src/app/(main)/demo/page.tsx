import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { getSessionUser } from '@/lib/auth/session';
import DemoCards from '@/components/demo/DemoCards';
import EditorialEyebrow from '@/components/ui/EditorialEyebrow';

export const metadata: Metadata = {
  title: 'Demo',
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
    <div className='flex min-h-[calc(100vh-5rem)] items-center bg-cream'>
      <section className='mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8'>
        <header className='mb-12 text-center sm:mb-16'>
          <EditorialEyebrow as='inline-block' className='mb-4'>
            ↗ Take it for a spin
          </EditorialEyebrow>
          <h1 className='font-display font-normal text-[clamp(40px,5vw,60px)] leading-[1.05] tracking-tight mb-5'>
            At the counter, <em className='italic text-oxblood'>or behind it.</em>
          </h1>
          <p className='mx-auto max-w-[52ch] text-ink-soft text-[16px] leading-relaxed'>
            Browse the catalog as a customer, or run the shop as an admin.
            No account, no card, no signup.
          </p>
        </header>

        <DemoCards />

        <p className='mx-auto mt-12 max-w-[52ch] text-center text-[12px] tracking-[0.06em] uppercase text-muted'>
          Already have an account? <Link href='/login' className='border-b border-muted text-ink-soft hover:text-ink transition-colors'>Sign in</Link>
        </p>
      </section>
    </div>
  );
}

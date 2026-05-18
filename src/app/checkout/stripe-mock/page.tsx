import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{
    orderId?: string;
    total?: string;
    ref?: string;
  }>;
};

// Stub-mode stand-in for Stripe's hosted Checkout page. Only reachable when
// no STRIPE_SECRET_KEY is set (see `isStubMode()`); the checkout-session route
// redirects the customer here instead of the real Stripe URL so the project
// runs end-to-end without sandbox credentials. Once a real key is configured
// the route bypasses this page entirely.
export default async function StripeMockPage({ searchParams }: Props) {
  const { orderId, total, ref } = await searchParams;

  if (!orderId || !total) redirect('/checkout');

  const totalCents = Number.parseInt(total, 10);
  if (!Number.isFinite(totalCents) || totalCents <= 0) redirect('/checkout');

  const totalDollars = (totalCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  // Mirror the {CHECKOUT_SESSION_ID} substitution real Stripe performs on the
  // success URL — the confirmation page (and later the 1C webhook) can rely on
  // the same shape regardless of mode.
  const stubSessionId = `cs_test_stub_${orderId}`;
  const completeHref = `/checkout/confirmation?orderId=${orderId}&session_id=${stubSessionId}`;
  const cancelHref = `/checkout?cancelled=1`;

  return (
    <main className='flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10'>
      <div className='w-full max-w-md rounded-lg bg-white shadow-xl ring-1 ring-slate-200'>
        <div className='border-b border-slate-200 px-6 py-4'>
          <div className='flex items-center justify-between'>
            <span className='text-lg font-semibold tracking-tight text-slate-900'>
              stripe
            </span>
            <span className='rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800'>
              Test simulation
            </span>
          </div>
        </div>

        <div className='px-6 py-7'>
          <p className='text-[13px] text-slate-500'>Pay EliteCuts</p>
          <p className='mt-1 font-mono text-[32px] font-semibold text-slate-900'>
            {totalDollars}
          </p>
          {ref && (
            <p className='mt-2 text-[13px] text-slate-600'>
              Order reference{' '}
              <span className='font-mono text-slate-900'>{ref}</span>
            </p>
          )}

          <div className='mt-6 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] leading-relaxed text-slate-600'>
            This is a local stand-in for Stripe&apos;s hosted Checkout page.
            No real card data is collected and no money moves. When a real
            <span className='mx-1 font-mono'>STRIPE_SECRET_KEY</span>
            is configured, this page is bypassed.
          </div>

          <Link
            href={completeHref}
            className='mt-6 block rounded-md bg-indigo-600 px-4 py-3 text-center text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500'
          >
            Complete payment
          </Link>

          <Link
            href={cancelHref}
            className='mt-3 block text-center text-[13px] text-slate-500 hover:text-slate-700'
          >
            ← Cancel and return to checkout
          </Link>
        </div>
      </div>
    </main>
  );
}

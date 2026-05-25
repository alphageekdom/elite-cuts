import Link from 'next/link';
import { redirect } from 'next/navigation';
import mongoose from 'mongoose';

import connectDB from '@/config/database';
import Order from '@/models/Order';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{
    orderId?: string;
    ref?: string;
  }>;
};

// Stub-mode stand-in for Stripe's hosted Checkout page. Only reachable when
// no STRIPE_SECRET_KEY is set (see `isStubMode()`); the checkout-session route
// redirects the customer here instead of the real Stripe URL so the project
// runs end-to-end without sandbox credentials. Once a real key is configured
// the route bypasses this page entirely.
export default async function StripeMockPage({ searchParams }: Props) {
  const { orderId, ref } = await searchParams;

  if (!orderId || !mongoose.isValidObjectId(orderId)) redirect('/checkout');

  // Look up the order server-side. Trusting a URL `total` would let a
  // tampered link show the customer a different total than what's stamped
  // on the order; reading `totalCost` from the DB keeps the two in sync.
  await connectDB();
  const order = await Order.findById(orderId).select('user totalCost paymentResult.status saveCardIntent').lean();
  if (!order) redirect('/checkout');
  if (order.paymentResult?.status !== 'Pending') redirect('/checkout');

  // Ownership gate — same shape as the mock-complete route. User orders
  // require a session match; guest orders rely on the orderId-as-token
  // model plus the Pending status check above.
  if (order.user) {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId || sessionUser.userId !== String(order.user)) {
      redirect('/checkout');
    }
  }

  const totalDollars = order.totalCost.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

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
          {order.saveCardIntent && (
            <p className='mt-2 text-[12px] text-slate-500'>
              This card will be saved to your profile for next time.
            </p>
          )}

          <div className='mt-6 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] leading-relaxed text-slate-600'>
            This is a local stand-in for Stripe&apos;s hosted Checkout page.
            No real card data is collected and no money moves. When a real
            <span className='mx-1 font-mono'>STRIPE_SECRET_KEY</span>
            is configured, this page is bypassed.
          </div>

          {/* Real POST so the stub-complete route can flip the order to paid
              via completeSessionForOrder before redirecting to confirmation. */}
          <form action='/api/checkout/stripe-mock/complete' method='post' className='mt-6'>
            <input type='hidden' name='orderId' value={orderId} />
            <button
              type='submit'
              className='block w-full rounded-md bg-indigo-600 px-4 py-3 text-center text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500'
            >
              Complete payment
            </button>
          </form>

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

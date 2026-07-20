import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import CheckoutCancelToast from '@/components/checkout/CheckoutCancelToast';
import CheckoutContactCard from '@/components/checkout/CheckoutContactCard';
import CheckoutGuard from '@/components/checkout/CheckoutGuard';
import CheckoutOrderNotes from '@/components/checkout/CheckoutOrderNotes';
import CheckoutOrderSummary from '@/components/checkout/CheckoutOrderSummary';
import CheckoutStepRail from '@/components/checkout/CheckoutStepRail';
import FulfillmentToggle from '@/components/checkout/FulfillmentToggle';
import PaymentMethodSelector from '@/components/checkout/PaymentMethodSelector';
import PlaceOrderButton from '@/components/checkout/PlaceOrderButton';
import connectDB from '@/config/database';
import Cart from '@/models/Cart';
import User from '@/models/User';
import {
  CheckoutProvider,
  type CheckoutInitialContact,
  type SavedAddress,
} from '@/context/CheckoutContext';
import { getSessionUser } from '@/lib/auth/session';
import { isDemoCardTileEnabled } from '@/lib/features';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your order — pickup-ready in ~1 hour.',
};

export default async function CheckoutPage() {
  const sessionUser = await getSessionUser();
  const demoCardEnabled = isDemoCardTileEnabled({
    isDemoUser: sessionUser?.user?.isDemo === true,
  });

  // Prefill + empty-cart guard only run for signed-in users. Guests have no
  // server cart (theirs lives in localStorage) so the server can't make the
  // empty-cart call from here — CheckoutGuard handles that client-side and
  // bounces to /cart before paint.
  let initialContact: CheckoutInitialContact | undefined;
  let savedAddresses: SavedAddress[] | undefined;

  if (sessionUser?.userId) {
    await connectDB();
    const cart = await Cart.findOne({ user: sessionUser.userId })
      .select('items')
      .lean();
    if (!cart || cart.items.length === 0) redirect('/cart');

    const userDoc = await User.findById(sessionUser.userId)
      .select('name email phone addresses')
      .lean();

    initialContact = {
      name: userDoc?.name ?? sessionUser.user.name ?? '',
      email: userDoc?.email ?? sessionUser.email ?? '',
      phone: userDoc?.phone ?? '',
    };

    savedAddresses = (userDoc?.addresses ?? []).map((a) => ({
      id: a._id.toString(),
      label: a.label,
      address1: a.address1,
      address2: a.address2 ?? '',
      city: a.city,
      state: a.state,
      zip: a.zip,
      isDefault: Boolean(a.isDefault),
    }));
  }

  return (
    <CheckoutGuard>
      <CheckoutCancelToast />
      <div className='min-h-screen bg-cream'>
        <CheckoutStepRail currentStep={2} />

        <div className='mx-auto max-w-300 px-6 pb-20 sm:px-8'>
          {/* Page headline */}
          <div className='mb-12 pt-10 text-center'>
            <p className='mb-3.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted'>
              Almost there
            </p>
            <h1 className='font-display text-[clamp(40px,5vw,64px)] font-normal leading-none tracking-tight'>
              One last <em className='text-oxblood'>step.</em>
            </h1>
            <p className='mx-auto mt-3.5 max-w-[50ch] text-[15px] text-ink-soft'>
              Review your details, choose how you&apos;d like to pick it up,
              and we&apos;ll have it cut and ready.
            </p>
          </div>

          {/* Two-column layout */}
          <CheckoutProvider
            initialContact={initialContact}
            savedAddresses={savedAddresses}
            demoCardEnabled={demoCardEnabled}
          >
          <div className='grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-12'>
            {/* Left: form cards */}
            <div className='flex flex-col gap-4'>
              {/* Card 01: Contact */}
              <CheckoutContactCard />

              {/* Card 02: Fulfillment */}
              <FulfillmentToggle />

              {/* Card 03: Order notes */}
              <CheckoutOrderNotes />

              {/* Card 04: Payment */}
              <PaymentMethodSelector
                isLoggedIn={Boolean(sessionUser?.userId)}
                demoCardEnabled={demoCardEnabled}
              />

              {/* Place order */}
              <PlaceOrderButton />

              <p className='text-center text-[12px] leading-relaxed text-muted'>
                By placing this order you agree to our{' '}
                <Link
                  href='/terms'
                  className='border-b border-current pb-px text-oxblood'
                >
                  Terms
                </Link>{' '}
                and{' '}
                <Link
                  href='/privacy'
                  className='border-b border-current pb-px text-oxblood'
                >
                  Privacy Policy
                </Link>
                . We don&apos;t charge until your order is hand-cut and ready.
              </p>
            </div>

            {/* Right: sticky order summary */}
            <div className='lg:sticky lg:top-6'>
              <CheckoutOrderSummary />
            </div>
          </div>
          </CheckoutProvider>
        </div>
      </div>
    </CheckoutGuard>
  );
}

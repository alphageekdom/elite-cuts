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
import { getShopSettings } from '@/lib/shop-settings/queries';
import { getShopHours } from '@/lib/shop-settings/hours-queries';
import {
  formatReadyIn,
  getPickupNote,
} from '@/lib/shop-settings/pickup-format';
import { buildPickupDays } from '@/lib/shop-settings/pickup-slots';

export const dynamic = 'force-dynamic';

// Was a static "~1 hour", double the shop's configured lead time. Read from
// settings so it can't drift from what the cart drawer and trust strip say.
export async function generateMetadata(): Promise<Metadata> {
  const { leadTime } = await getShopSettings();
  return {
    title: 'Checkout',
    description: `Complete your order — pickup ready in ${formatReadyIn(leadTime).replace(/^about /, '')}.`,
  };
}

export default async function CheckoutPage() {
  const sessionUser = await getSessionUser();
  const demoCardEnabled = isDemoCardTileEnabled({
    isDemoUser: sessionUser?.user?.isDemo === true,
  });

  // Pickup windows are derived here rather than in the picker: the shop's
  // clock is what decides which are still bookable, and a client component
  // only has the customer's. Computing it server-side also means the markup
  // hydrates identically instead of the grid shifting on first paint.
  const [shopSettings, hoursDays] = await Promise.all([
    getShopSettings(),
    getShopHours(),
  ]);
  const now = new Date();
  const pickupDays = buildPickupDays({
    days: hoursDays,
    leadTime: shopSettings.leadTime,
    timezone: shopSettings.timezone,
    maxBookingWindow: shopSettings.maxBookingWindow,
    now,
  });

  // Today drops out of the picker silently when the shop is shut or the
  // cutoff has passed, which left a Monday customer reading "Tomorrow" with
  // no idea why. Same wording the product page already uses.
  const todayNote =
    pickupDays[0]?.relativeLabel === 'Today'
      ? null
      : getPickupNote({
          days: hoursDays,
          leadTime: shopSettings.leadTime,
          timezone: shopSettings.timezone,
          now,
        }).timing;

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
              <FulfillmentToggle
                pickupDays={pickupDays}
                todayNote={todayNote}
              />

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
                . Payment is taken now, before your cuts are weighed and
                wrapped.
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

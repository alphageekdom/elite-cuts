import type { Metadata } from 'next';
import CheckoutContactCard from '@/components/checkout/CheckoutContactCard';
import CheckoutGuard from '@/components/checkout/CheckoutGuard';
import CheckoutOrderSummary from '@/components/checkout/CheckoutOrderSummary';
import FulfillmentToggle from '@/components/checkout/FulfillmentToggle';
import PaymentMethodSelector from '@/components/checkout/PaymentMethodSelector';
import PlaceOrderButton from '@/components/checkout/PlaceOrderButton';
import { CheckoutProvider } from '@/context/CheckoutContext';

export const metadata: Metadata = {
  title: 'Checkout · EliteCuts',
  description: 'Complete your order — pickup-ready in ~1 hour.',
};


const CheckIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={3}
    aria-hidden='true'
    className='h-2.75 w-2.75'
  >
    <polyline points='20 6 9 17 4 12' />
  </svg>
);

export default function CheckoutPage() {
  return (
    <CheckoutGuard>
      <div className='min-h-screen bg-cream'>
        {/* Step rail */}
        <div className='border-b border-line-soft py-7'>
          <div className='mx-auto max-w-300 px-8'>
            <nav
              aria-label='Checkout steps'
              className='flex items-center justify-center gap-4'
            >
              <div className='flex items-center gap-2.5 text-[13px] font-medium text-ink'>
                <span className='grid h-6.5 w-6.5 place-items-center rounded-full border border-green bg-green text-cream'>
                  <CheckIcon />
                </span>
                Cart
              </div>
              <span className='h-px w-7 bg-line' aria-hidden='true' />
              <div
                className='flex items-center gap-2.5 text-[13px] font-medium text-ink'
                aria-current='step'
              >
                <span className='grid h-6.5 w-6.5 place-items-center rounded-full border border-ink bg-ink font-display italic text-[12px] text-cream'>
                  2
                </span>
                Checkout
              </div>
              <span className='h-px w-7 bg-line' aria-hidden='true' />
              <div className='flex items-center gap-2.5 text-[13px] text-muted'>
                <span className='grid h-6.5 w-6.5 place-items-center rounded-full border border-line bg-paper font-display italic text-[12px] text-muted'>
                  3
                </span>
                <span className='hidden sm:inline'>Confirmation</span>
              </div>
            </nav>
          </div>
        </div>

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
          <CheckoutProvider>
          <div className='grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-12'>
            {/* Left: form cards */}
            <div className='flex flex-col gap-4'>
              {/* Card 01: Contact */}
              <CheckoutContactCard />

              {/* Card 02: Fulfillment */}
              <FulfillmentToggle />

              {/* Card 03: Payment */}
              <PaymentMethodSelector />

              {/* Place order */}
              <PlaceOrderButton />

              <p className='text-center text-[12px] leading-relaxed text-muted'>
                By placing this order you agree to our{' '}
                <a
                  href='#'
                  className='border-b border-current pb-px text-oxblood'
                >
                  Terms
                </a>{' '}
                and{' '}
                <a
                  href='#'
                  className='border-b border-current pb-px text-oxblood'
                >
                  Privacy Policy
                </a>
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

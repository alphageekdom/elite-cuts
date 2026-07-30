import Link from 'next/link';
import type { Metadata } from 'next';

import connectDB from '@/config/database';
import Product, { type SerializedProduct } from '@/models/Product';
import { convertToSerializableObject } from '@/lib/convertToObject';
import { getActiveHoliday } from '@/lib/announcements/holidays';

import CartItemsPanel from '@/components/cart/CartItemsPanel';
import CartSuggestions from '@/components/cart/CartSuggestions';
import CartSummary from '@/components/cart/CartSummary';
import ChevronIcon from '@/components/ui/icons/ChevronIcon';
import { CRUMB_CHEVRON } from '@/lib/styles';

export const dynamic = 'force-dynamic';

const Step = ({
  num,
  label,
  active = false,
}: {
  num: number;
  label: string;
  active?: boolean;
}) => (
  <div
    className={`flex items-center gap-2.5 text-[13px] ${
      active ? 'font-medium text-ink' : 'text-muted'
    }`}
  >
    <span
      className={`grid h-6.5 w-6.5 place-items-center rounded-full font-display text-xs ${
        active
          ? 'border border-ink bg-ink text-cream'
          : 'border border-line bg-paper text-muted'
      }`}
    >
      {num}
    </span>
    {label}
  </div>
);

const StepLine = () => (
  <span aria-hidden='true' className='h-px w-8 bg-line' />
);

export const metadata: Metadata = {
  title: 'Cart',
};

const CartPage = async () => {
  // Cart is reachable for both signed-in and guest shoppers — guests read
  // their items from localStorage via CartContext.

  // Suggestions strip: server fetches up to 6 in-stock featured products so
  // the client can drop any already in the cart and still render 3.
  await connectDB();
  const featuredDocs = await Product.find({
    isFeatured: true,
    stockCount: { $gt: 0 },
    'images.0': { $exists: true },
  })
    .limit(6)
    .lean();
  const featured = featuredDocs.map(
    convertToSerializableObject,
  ) as SerializedProduct[];

  // Holiday badge gets serialized to plain primitives so the CartSummary
  // client component can read it without crossing the function-prop boundary
  // (Holiday.computeDate is a function and can't be passed through).
  const active = getActiveHoliday();
  const activeHoliday = active
    ? { name: active.holiday.name, daysUntil: active.daysUntil }
    : null;

  return (
    <div className='bg-cream pb-24'>
      <div className='mx-auto w-full max-w-7xl px-6 md:px-8'>
        <nav
          aria-label='Breadcrumb'
          className='flex flex-wrap items-center gap-2 pt-7 pb-2 text-[12px] tracking-[0.04em] text-muted'
        >
          <Link
            href='/'
            className='transition-colors duration-300 hover:text-oxblood motion-reduce:transition-none'
          >
            Home
          </Link>
          <ChevronIcon direction='right' className={CRUMB_CHEVRON} />
          <Link
            href='/products'
            className='transition-colors duration-300 hover:text-oxblood motion-reduce:transition-none'
          >
            Shop
          </Link>
          <ChevronIcon direction='right' className={CRUMB_CHEVRON} />
          <span className='text-ink' aria-current='page'>
            Cart
          </span>
        </nav>

        <header className='flex flex-wrap items-end justify-between gap-8 pt-8 pb-12'>
          <div>
            <h1 className='font-display text-[clamp(48px,6vw,84px)] leading-[0.95] font-normal tracking-[-0.03em]'>
              Your{' '}
              <em className='font-normal italic text-oxblood'>cart.</em>
            </h1>
            {/* Names checkout as where the pickup time gets chosen — that
                control lives there, and saying so here stops the cart page
                looking like it's missing one. */}
            <p className='mt-4 max-w-[42ch] text-[15px] leading-relaxed text-ink-soft'>
              Everything here is cut to order. Look it over, then pick your
              pickup time at checkout.
            </p>
          </div>

          <div
            aria-hidden='true'
            className='hidden items-center gap-5 pb-3 lg:flex'
          >
            <Step num={1} label='Cart' active />
            <StepLine />
            <Step num={2} label='Checkout' />
            <StepLine />
            <Step num={3} label='Confirmation' />
          </div>
        </header>

        <div className='grid grid-cols-1 items-start gap-12 pb-24 lg:grid-cols-[1.5fr_1fr]'>
          <div>
            <CartItemsPanel />
            <CartSuggestions products={featured} />
          </div>

          <aside className='lg:sticky lg:top-24'>
            <CartSummary activeHoliday={activeHoliday} />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CartPage;

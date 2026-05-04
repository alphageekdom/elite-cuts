import Link from 'next/link';

import connectDB from '@/config/database';
import Product, { type SerializedProduct } from '@/models/Product';
import { convertToSerializableObject } from '@/utils/convertToObject';

import CartItemsPanel from '@/components/cart/CartItemsPanel';
import CartSuggestions from '@/components/cart/CartSuggestions';
import CartSummary from '@/components/cart/CartSummary';

const ChevronIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden='true'
    className='h-2.5 w-2.5 opacity-50'
  >
    <polyline points='9 18 15 12 9 6' />
  </svg>
);

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

export const metadata = {
  title: 'Cart — EliteCuts',
};

const CartPage = async () => {
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

  return (
    <main className='bg-cream pb-24'>
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
          <ChevronIcon />
          <Link
            href='/products'
            className='transition-colors duration-300 hover:text-oxblood motion-reduce:transition-none'
          >
            Shop
          </Link>
          <ChevronIcon />
          <span className='text-ink' aria-current='page'>
            Cart
          </span>
        </nav>

        <header className='flex flex-wrap items-end justify-between gap-8 pt-8 pb-12'>
          <h1 className='font-display text-[clamp(48px,6vw,84px)] leading-[0.95] font-normal tracking-[-0.03em]'>
            Your{' '}
            <em className='font-normal italic text-oxblood'>cart.</em>
          </h1>

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
            <CartSummary />
          </aside>
        </div>
      </div>
    </main>
  );
};

export default CartPage;

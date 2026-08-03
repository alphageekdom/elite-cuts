import Link from 'next/link';

import { FOCUS_RING } from '@/lib/styles';
import { productPath } from '@/lib/products/paths';
import { fmtPrice } from '@/lib/checkout/totals';
import type { SerializedProduct } from '@/models/Product';

type Props = {
  products: SerializedProduct[];
};

// "Next time you're in" — the shop's current featured cuts.
//
// The design wrote a reason under each card tying it to what was just bought
// ("You went tomahawk. This is the same primal, aged longer."), which implies
// a recommendation engine. There isn't one: these are the same `isFeatured`
// products the cart's suggestion strip shows. Each card carries the product's
// own description instead, and the heading says where they come from rather
// than implying they were chosen for this order.
const ConfirmationSuggestions = ({ products }: Props) => {
  if (products.length === 0) return null;

  return (
    <section className='rounded-sm border border-line-soft bg-paper px-6 py-6 sm:px-7 sm:py-7'>
      {/* Stacked on phones: the caption can't shrink, and side-by-side it
          squeezed the heading into three or four lines. "For next time"
          rather than "Next time you're in" because a delivery customer has
          just chosen not to come in. */}
      <div className='flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5'>
        <h2 className='font-display text-[24px] tracking-tight sm:text-[26px]'>
          For next time
        </h2>
        <p className='shrink-0 text-[12.5px] text-muted'>From the counter</p>
      </div>

      <ul className='mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3'>
        {products.map((product) => (
          <li
            key={product._id}
            className='flex flex-col rounded-sm border border-line-soft bg-cream px-4 py-4'
          >
            <p className='text-[11px] font-medium tracking-[0.16em] text-camel-deep uppercase'>
              {product.category}
            </p>
            <h3 className='mt-2 font-display text-[19px] leading-tight tracking-tight'>
              {product.name}
            </h3>
            <p className='mt-2 line-clamp-3 flex-1 text-[12.5px] leading-relaxed text-muted'>
              {product.description}
            </p>
            {/* Wraps because neither child can shrink: at the laptop widths
                where the left column is narrowest, a per-pound price and the
                pill together outgrow the card and the pill spilled past its
                border. */}
            <div className='mt-4 flex flex-wrap items-center justify-between gap-3'>
              <span className='font-display text-[18px]'>
                {product.displayPriceLabel ?? `$${fmtPrice(product.price)}`}
              </span>
              <Link
                href={productPath(product)}
                className={`inline-flex min-h-11 items-center rounded-full border border-line px-4 text-[12.5px] font-medium text-ink-soft transition-colors duration-300 hover:border-camel-deep hover:text-camel-deep motion-reduce:transition-none ${FOCUS_RING} focus-visible:ring-offset-cream`}
              >
                View
                <span className='sr-only'> {product.name}</span>
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ConfirmationSuggestions;

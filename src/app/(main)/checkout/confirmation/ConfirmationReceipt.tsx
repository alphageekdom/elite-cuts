import Image from 'next/image';

import { formatMoney, productImageSrc } from '@/lib/format';

import { CARD_CLASS, EYEBROW_CLASS } from './confirmationStyles';

// Only what this component renders — structurally compatible with the order's
// line snapshot without coupling the presentation to the Mongoose type.
type ReceiptLine = {
  name: string;
  image: string;
  qty: number;
  price: number;
};

type Props = {
  lines: ReceiptLine[];
  // "2 items · 6 cuts" — built from the same helper the cart header uses, so
  // the two pages can't disagree about the same basket moments apart.
  countLabel: string;
  subtotal: number;
  tax: number;
  total: number;
  deliveryFee: number | null;
  memberDiscount: number;
  promoDiscount: number;
  promoCode?: string;
  pointsRedeemed: number;
  pointsRedemptionValueCents: number;
  // Set once an admin has weighed a variable-weight line and the realized
  // total differs from the estimate the card was charged.
  realized: { label: string; total: number } | null;
  // "Paid" only once payment actually cleared — an order sitting at Pending
  // must not claim otherwise just because the customer reached this page.
  totalLabel: string;
  payNote: string;
};

const ConfirmationReceipt = ({
  lines,
  countLabel,
  subtotal,
  tax,
  total,
  deliveryFee,
  memberDiscount,
  promoDiscount,
  promoCode,
  pointsRedeemed,
  pointsRedemptionValueCents,
  realized,
  totalLabel,
  payNote,
}: Props) => (
  <section className={CARD_CLASS}>
    <div className='flex items-baseline justify-between gap-3'>
      <h2 className={EYEBROW_CLASS}>Receipt</h2>
      {/* The design put a "Print" link here. `/receipt/[id]` is admin-only and
          redirects a customer to sign-in, so the link would have been a dead
          end for everyone it was drawn for. */}
    </div>
    <p className='mt-3 font-display text-[22px] tracking-tight'>{countLabel}</p>

    <ul className='mt-4 divide-y divide-line-soft border-t border-line-soft'>
      {lines.map((line, i) => {
        const imgSrc = productImageSrc(line.image);
        return (
          <li key={i} className='flex items-start gap-3.5 py-3.5'>
            {imgSrc && (
              <div className='relative h-14 w-12 shrink-0 overflow-hidden rounded-sm bg-cream-deep'>
                <Image
                  src={imgSrc}
                  alt=''
                  fill
                  className='object-cover'
                  sizes='48px'
                />
              </div>
            )}
            <div className='min-w-0 flex-1'>
              <p className='text-[14px] leading-snug text-ink'>{line.name}</p>
              <p className='mt-1.5 font-mono text-[11.5px] text-muted'>
                {line.qty} × {formatMoney(line.price)}
              </p>
            </div>
            <p className='shrink-0 font-display text-[17px] text-ink tabular-nums'>
              {formatMoney(line.price * line.qty)}
            </p>
          </li>
        );
      })}
    </ul>

    <div className='space-y-2 border-t border-line-soft pt-4'>
      <div className='flex justify-between text-[13.5px] text-ink-soft'>
        <span>Subtotal</span>
        <span className='tabular-nums'>{formatMoney(subtotal)}</span>
      </div>
      <div className='flex justify-between text-[13.5px] text-ink-soft'>
        <span>{deliveryFee === null ? 'Pickup' : 'Delivery'}</span>
        {deliveryFee === null ? (
          <span className='text-green'>Free</span>
        ) : (
          <span className='tabular-nums'>{formatMoney(deliveryFee)}</span>
        )}
      </div>
      {memberDiscount > 0 && (
        <div className='flex justify-between text-[13.5px] text-green'>
          <span>Member discount</span>
          <span className='tabular-nums'>−{formatMoney(memberDiscount)}</span>
        </div>
      )}
      {promoDiscount > 0 && (
        <div className='flex justify-between text-[13.5px] text-green'>
          <span>Promo{promoCode ? ` — ${promoCode}` : ''}</span>
          <span className='tabular-nums'>−{formatMoney(promoDiscount)}</span>
        </div>
      )}
      {pointsRedemptionValueCents > 0 && (
        <div className='flex justify-between text-[13.5px] text-green'>
          <span>
            Points redeemed ({pointsRedeemed.toLocaleString('en-US')} pts)
          </span>
          <span className='tabular-nums'>
            −{formatMoney(pointsRedemptionValueCents / 100)}
          </span>
        </div>
      )}
      <div className='flex justify-between text-[13.5px] text-ink-soft'>
        <span>Tax</span>
        <span className='tabular-nums'>{formatMoney(tax)}</span>
      </div>
    </div>

    <div className='mt-4 flex items-baseline justify-between border-t border-line-soft pt-4'>
      <span className='font-display text-[22px] tracking-tight'>
        {totalLabel}
      </span>
      <span className='font-display text-[30px] tracking-tight tabular-nums'>
        {formatMoney(total)}
      </span>
    </div>

    {realized && (
      <div className='mt-2 flex items-baseline justify-between text-[12px] text-camel-deep'>
        <span className='italic'>{realized.label}</span>
        <span className='font-mono tabular-nums'>
          {formatMoney(realized.total)}
        </span>
      </div>
    )}

    <p className='mt-3.5 text-[12.5px] leading-relaxed text-muted'>{payNote}</p>
  </section>
);

export default ConfirmationReceipt;

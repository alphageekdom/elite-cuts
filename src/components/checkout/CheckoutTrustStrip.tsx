'use client';

import { useShopSettings } from '@/context/ShopSettingsContext';
import { formatReadyIn } from '@/lib/shop-settings/pickup-format';
import CheckIcon from '@/components/ui/icons/CheckIcon';
import ClockIcon from '@/components/ui/icons/ClockIcon';

// The third row used to read "~1 hour · pickup-ready notification". Both halves
// were false: the shop's configured lead time is 30 minutes by default, so the
// hardcoded figure was double it, and no customer notification exists in this
// system — all four notification types are written only to admins, and no mail
// service is connected at all. It now reads the real lead time from settings
// and promises only what actually happens.
const CheckoutTrustStrip = () => {
  const { leadTime } = useShopSettings();

  return (
  <div className='rounded-sm border border-line-soft bg-paper px-6 py-4'>
    <div className='flex items-center gap-3 border-b border-line-soft py-2 text-[13px] text-ink-soft'>
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} aria-hidden='true' className='h-3.5 w-3.5 shrink-0 text-green'>
        <rect x='3' y='11' width='18' height='11' rx='2' />
        <path d='M7 11V7a5 5 0 0110 0v4' />
      </svg>
      <span><strong className='font-medium text-ink'>Secure</strong> · 256-bit SSL encryption</span>
    </div>
    <div className='flex items-center gap-3 border-b border-line-soft py-2 text-[13px] text-ink-soft'>
      <CheckIcon className='h-3.5 w-3.5 shrink-0 text-green' strokeWidth={2} />
      <span><strong className='font-medium text-ink'>Hand-cut</strong> after you order — never sitting</span>
    </div>
    <div className='flex items-center gap-3 py-2 text-[13px] text-ink-soft'>
      <ClockIcon className='h-3.5 w-3.5 shrink-0 text-green' />
      <span><strong className='font-medium text-ink'>{formatReadyIn(leadTime)}</strong> · ready at the counter</span>
    </div>
  </div>
  );
};

export default CheckoutTrustStrip;

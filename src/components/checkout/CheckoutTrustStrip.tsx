const CheckoutTrustStrip = () => (
  <div className='rounded-sm border border-line-soft bg-paper px-6 py-4'>
    <div className='flex items-center gap-3 border-b border-line-soft py-2 text-[13px] text-ink-soft'>
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} aria-hidden='true' className='h-3.5 w-3.5 shrink-0 text-green'>
        <rect x='3' y='11' width='18' height='11' rx='2' />
        <path d='M7 11V7a5 5 0 0110 0v4' />
      </svg>
      <span><strong className='font-medium text-ink'>Secure</strong> · 256-bit SSL encryption</span>
    </div>
    <div className='flex items-center gap-3 border-b border-line-soft py-2 text-[13px] text-ink-soft'>
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} aria-hidden='true' className='h-3.5 w-3.5 shrink-0 text-green'>
        <polyline points='20 6 9 17 4 12' />
      </svg>
      <span><strong className='font-medium text-ink'>Hand-cut</strong> after you order — never sitting</span>
    </div>
    <div className='flex items-center gap-3 py-2 text-[13px] text-ink-soft'>
      <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} aria-hidden='true' className='h-3.5 w-3.5 shrink-0 text-green'>
        <circle cx='12' cy='12' r='9' />
        <polyline points='12 6 12 12 16 14' />
      </svg>
      <span><strong className='font-medium text-ink'>~1 hour</strong> · pickup-ready notification</span>
    </div>
  </div>
);

export default CheckoutTrustStrip;

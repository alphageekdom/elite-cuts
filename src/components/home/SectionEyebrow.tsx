type SectionEyebrowProps = { num: string; label: string };

const SectionEyebrow = ({ num, label }: SectionEyebrowProps) => (
  <div className='mb-16 flex items-baseline gap-6'>
    <span className='font-display text-sm font-medium tracking-[0.04em] text-camel'>
      {num}
    </span>
    <span className='text-xs font-medium tracking-[0.22em] uppercase text-muted'>
      {label}
    </span>
    <span aria-hidden='true' className='h-px flex-1 bg-line' />
  </div>
);

export default SectionEyebrow;

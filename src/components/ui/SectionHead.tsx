type Props = { label: string; num?: string };

export default function SectionHead({ label, num }: Props) {
  return (
    <div className='mb-14 flex items-baseline gap-6'>
      {num && (
        <span className='font-display text-sm font-medium text-camel'>{num}</span>
      )}
      <span className='text-[11px] font-medium uppercase tracking-[0.22em] text-muted'>
        {label}
      </span>
      <span className='h-px flex-1 bg-line' aria-hidden />
    </div>
  );
}

const ITEMS = [
  { text: 'Dry-aged', italic: false },
  { text: 'Grass-fed', italic: true },
  { text: 'Local farms', italic: false },
  { text: 'Pickup available', italic: false },
  { text: 'Sustainably sourced', italic: false },
  { text: 'Ethically raised', italic: true },
  { text: 'Hand-cut daily', italic: false },
] as const;

// Render the 6-item set as a flat list of [item, separator, item, separator, …]
// so the parent flex gap-15 + per-item separators reproduce the
// 60px-text-60px-✦-60px-text spacing pattern. Used twice for a seamless
// translateX(-50%) loop (the second copy starts exactly where the first ends).
const renderSet = (keyPrefix: string) =>
  ITEMS.flatMap((item, i) => [
    <span
      key={`${keyPrefix}-text-${i}`}
      className='font-display text-[22px] font-normal tracking-[0.02em]'
    >
      {item.italic ? (
        <em className='font-light text-camel-soft'>{item.text}</em>
      ) : (
        item.text
      )}
    </span>,
    <span
      key={`${keyPrefix}-sep-${i}`}
      aria-hidden='true'
      className='text-sm text-camel'
    >
      ✦
    </span>,
  ]);

const Marquee = () => {
  return (
    <div
      aria-hidden='true'
      className='overflow-hidden border-y border-cream/8 bg-ink py-[22px] text-cream'
    >
      <div className='flex w-max items-center gap-15 whitespace-nowrap animate-[marqueeScroll_35s_linear_infinite] motion-reduce:animate-none'>
        {renderSet('a')}
        {renderSet('b')}
      </div>
    </div>
  );
};

export default Marquee;

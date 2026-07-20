'use client';

import { useState } from 'react';

const ITEMS = [
  { text: 'Hand-cut daily', italic: false },
  { text: 'Dry-aged beef', italic: true },
  { text: 'Local farms', italic: false },
  { text: 'Same-day pickup', italic: false },
  { text: 'Pasture-raised', italic: true },
  { text: 'Cut to order', italic: false },
  { text: 'Custom orders welcome', italic: false },
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
  // WCAG 2.2.2: auto-scrolling content needs a user-operable pause — hover
  // pause alone isn't reachable by keyboard or touch.
  const [paused, setPaused] = useState(false);

  return (
    <div className='relative overflow-hidden border-y border-cream/8 bg-ink py-5.5 text-cream'>
      <div
        aria-hidden='true'
        className={`flex w-max items-center gap-15 whitespace-nowrap animate-[marqueeScroll_35s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:animate-none ${
          paused ? '[animation-play-state:paused]' : ''
        }`}
      >
        {renderSet('a')}
        {renderSet('b')}
      </div>
      <button
        type='button'
        onClick={() => setPaused((prev) => !prev)}
        aria-pressed={paused}
        aria-label='Pause scrolling banner'
        className='absolute top-1/2 right-3 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-cream/20 bg-ink/80 text-cream/70 transition-colors duration-300 hover:border-cream/50 hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream motion-reduce:transition-none'
      >
        {paused ? (
          <svg
            width='10'
            height='10'
            viewBox='0 0 24 24'
            fill='currentColor'
            aria-hidden='true'
          >
            <polygon points='6,4 20,12 6,20' />
          </svg>
        ) : (
          <svg
            width='10'
            height='10'
            viewBox='0 0 24 24'
            fill='currentColor'
            aria-hidden='true'
          >
            <rect x='5' y='4' width='4' height='16' />
            <rect x='15' y='4' width='4' height='16' />
          </svg>
        )}
      </button>
    </div>
  );
};

export default Marquee;

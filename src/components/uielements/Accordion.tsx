'use client';

import { useState } from 'react';

import { FOCUS_RING } from '@/lib/styles';
import PlusIcon from '@/components/uielements/PlusIcon';

export type AccordionItem = {
  q: string;
  a: string;
};

type Props = {
  items: AccordionItem[];
  // Index open on first paint. `null` opens nothing.
  defaultOpen?: number | null;
};

// Single-open FAQ accordion. Extracted from RewardsFaq when /demo needed the
// same behaviour — the two pages build their question lists very differently
// (one from shop settings, one static) but render them identically, so only
// the rendering is shared.
export default function Accordion({ items, defaultOpen = 0 }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(defaultOpen);

  const toggle = (idx: number) =>
    setOpenIdx((prev) => (prev === idx ? null : idx));

  return (
    <div className='border-line border-t'>
      {items.map((item, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div key={item.q} className='border-line-soft border-b'>
            <button
              type='button'
              onClick={() => toggle(idx)}
              aria-expanded={isOpen}
              className={`font-display text-ink flex w-full cursor-pointer items-center justify-between gap-4 bg-transparent py-6 text-left text-xl leading-snug font-medium tracking-tight transition-colors duration-300 motion-reduce:transition-none ${FOCUS_RING}`}
            >
              <span>{item.q}</span>
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,color] duration-300 motion-reduce:transition-none ${
                  isOpen
                    ? 'bg-ink text-cream border-ink [&_svg]:rotate-45'
                    : 'border-line text-ink-soft'
                }`}
              >
                <PlusIcon className='h-3 w-3 transition-transform duration-300' />
              </span>
            </button>
            {/* `max-h-0` + `overflow-hidden` clips the answer visually but
                leaves it in the accessibility tree, so a screen reader would
                read every answer aloud while each button reports
                `aria-expanded="false"`. `aria-hidden` closes that gap without
                giving up the height transition that `display: none` would
                kill. Safe because answers hold no focusable content — if one
                ever does, this needs `inert` instead. */}
            <div
              aria-hidden={!isOpen}
              className={`overflow-hidden transition-[max-height] duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none ${
                isOpen ? 'max-h-96' : 'max-h-0'
              }`}
            >
              <p className='text-ink-soft max-w-[60ch] pb-6 text-[15px] leading-[1.7]'>
                {item.a}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

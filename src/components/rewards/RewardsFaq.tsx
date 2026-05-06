'use client';

import { useState } from 'react';
import { FOCUS_RING } from '@/lib/styles';

const FAQS = [
  {
    q: 'How do I earn points?',
    a: 'You earn 1 point for every dollar spent in the shop, online or in person. Weekend orders earn 2× points at the Connoisseur tier and 3× at the Master Cut tier. Points are added to your account automatically once your order is fulfilled.',
  },
  {
    q: 'Do my points expire?',
    a: "Points stay valid for 12 months from your most recent order. As long as you're shopping with us roughly once a year, your balance carries forward indefinitely. We'll always email you 30 days before any points are at risk of expiring.",
  },
  {
    q: 'How do I move up tiers?',
    a: "Tiers are based on your lifetime point total — not annual spend. Once you hit 250 points you're a Connoisseur, and once you hit 1,000 you're at Master Cut. There's no rolling reset, no requalification: once you're up, you stay up.",
  },
  {
    q: 'Can I redeem points for cash?',
    a: "Not for cash, but you can apply points as a discount at checkout. 100 points = $5 off. There's no minimum redemption, so even a small balance is useful.",
  },
  {
    q: 'What about returns or refunds?',
    a: 'If you return an order, the points earned on that order are reversed. If you redeemed points at checkout, those points come back to your balance. Simple.',
  },
  {
    q: 'Is there a fee or subscription?',
    a: "No. Rewards is free for any registered customer. We don't sell premium tiers, paid memberships, or anything like that. Make an account, start earning.",
  },
];

const PlusIcon = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    className='w-3 h-3 transition-transform duration-300'
    aria-hidden
  >
    <line x1='12' y1='5' x2='12' y2='19' />
    <line x1='5' y1='12' x2='19' y2='12' />
  </svg>
);

export default function RewardsFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) =>
    setOpenIdx((prev) => (prev === idx ? null : idx));

  return (
    <div className='border-t border-line'>
      {FAQS.map((faq, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div key={faq.q} className='border-b border-line-soft'>
            <button
              type='button'
              onClick={() => toggle(idx)}
              aria-expanded={isOpen}
              className={`w-full bg-transparent py-6 font-display text-xl font-medium tracking-tight text-ink cursor-pointer flex items-center justify-between gap-4 text-left leading-snug transition-colors duration-300 motion-reduce:transition-none ${FOCUS_RING}`}
            >
              <span>{faq.q}</span>
              <span
                className={`w-8 h-8 rounded-full border grid place-items-center shrink-0 transition-[background-color,border-color,color] duration-300 motion-reduce:transition-none ${
                  isOpen
                    ? 'bg-ink text-cream border-ink [&_svg]:rotate-45'
                    : 'border-line text-ink-soft'
                }`}
              >
                <PlusIcon />
              </span>
            </button>
            <div
              className={`overflow-hidden transition-[max-height] duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none ${
                isOpen ? 'max-h-96' : 'max-h-0'
              }`}
            >
              <p className='pb-6 text-ink-soft text-[15px] leading-[1.7] max-w-[60ch]'>
                {faq.a}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import type { ReactNode } from 'react';

import SectionLabel from '@/components/ui/SectionLabel';

type Props = {
  eyebrow: string;
  title: string;
  titleAccent: string;
  intro: string;
  updatedAt: string;
  children: ReactNode;
};

const LAST_UPDATED_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

export default function LegalPage({
  eyebrow,
  title,
  titleAccent,
  intro,
  updatedAt,
  children,
}: Props) {
  const lastUpdated = LAST_UPDATED_FORMAT.format(new Date(`${updatedAt}T00:00:00Z`));

  return (
    <div className='min-h-screen bg-cream'>
      <div className='border-b border-line-soft px-6 pb-16 pt-32 text-center sm:px-8'>
        <SectionLabel className='mb-3 block'>{eyebrow}</SectionLabel>
        <h1 className='font-display text-[clamp(40px,5vw,64px)] font-normal leading-none tracking-tight text-ink'>
          {title} <em className='text-oxblood'>{titleAccent}</em>
        </h1>
        <p className='mx-auto mt-5 max-w-[48ch] text-[15px] leading-relaxed text-ink-soft'>
          {intro}
        </p>
        <p className='mt-4 text-[12px] uppercase tracking-[0.18em] text-muted'>
          Last updated {lastUpdated}
        </p>
      </div>

      <div className='mx-auto max-w-3xl px-6 py-16 sm:px-8'>
        <div className='mb-12 rounded-lg border border-line-soft bg-paper p-6 text-[14px] leading-relaxed text-ink-soft'>
          <strong className='font-medium text-ink'>Portfolio notice.</strong>{' '}
          EliteCuts is a portfolio project and not a real storefront. No orders
          are processed and no money changes hands. The text below is a plain-
          language placeholder so the link goes somewhere honest — it is not a
          real legal agreement.
        </div>

        <article className='flex flex-col gap-12'>{children}</article>
      </div>
    </div>
  );
}

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
    <>
      <div className='border-b border-line-soft px-6 pb-16 pt-24 text-center sm:px-8 sm:pt-28 md:pt-32'>
        <SectionLabel className='mb-4 block'>{eyebrow}</SectionLabel>
        <h1 className='font-display text-[clamp(40px,5vw,64px)] font-normal leading-none tracking-tight text-ink'>
          {title} <em className='text-oxblood'>{titleAccent}</em>
        </h1>
        <p className='mx-auto mt-6 max-w-[48ch] text-[15px] leading-relaxed text-ink-soft'>
          {intro}
        </p>
        <p className='mt-8 text-[11px] uppercase tracking-[0.22em] text-muted'>
          Last updated {lastUpdated}
        </p>
      </div>

      <div className='mx-auto max-w-3xl px-6 py-14 sm:px-8 sm:py-16'>
        <aside className='mb-14 rounded-lg border border-line-soft bg-paper p-6 sm:p-7'>
          <p className='mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-camel-deep'>
            Portfolio notice
          </p>
          <p className='text-[14px] leading-relaxed text-ink-soft'>
            EliteCuts is a portfolio project and not a real storefront. No
            orders are processed and no money changes hands. The text below is
            a plain-language placeholder so the link goes somewhere honest — it
            is not a real legal agreement.
          </p>
        </aside>

        <article className='flex flex-col gap-14'>{children}</article>
      </div>
    </>
  );
}

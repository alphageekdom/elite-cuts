import type { ReactNode } from 'react';
import Link from 'next/link';

import SectionLabel from '@/components/ui/SectionLabel';
import ArrowIcon from '@/components/uielements/ArrowIcon';
import { formatLegalDate } from './legalDate';
import LegalToc, { type LegalTocItem } from './LegalToc';

// The redesigned legal shell. Terms is the first consumer; the Privacy page
// still renders through the older `LegalPage` and migrates onto this in its
// own feature, at which point that file goes away. Until then the two legal
// pages deliberately look different — a known, temporary state.
//
// Anything only Terms needs (the portfolio notice, the contents rail) is an
// optional prop rather than baked in, so Privacy can adopt the shell without
// inheriting furniture it has no use for.

/** Body paragraph for the new shell. Privacy's prose still comes from
 *  `LegalParagraph`; both exist only until Privacy migrates. */
export function LegalDocParagraph({ children }: { children: ReactNode }) {
  return <p className='text-[16px] leading-[1.75] text-ink-soft'>{children}</p>;
}

/** Rule-separated rows rather than bullets — the list here is a set of
 *  disclaimers to read one at a time, not a tally. */
export function LegalDocList({ items }: { items: ReactNode[] }) {
  return (
    <ul className='flex flex-col'>
      {items.map((item, i) => (
        <li
          key={i}
          className='flex gap-3.5 border-t border-line py-4 text-[15.5px] leading-[1.65] text-ink-soft'
        >
          <span aria-hidden='true' className='shrink-0 pt-0.5 text-camel-deeper'>
            —
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export type LegalDocSection = {
  id: string;
  title: string;
  /** One line, in the shop's voice, above the prose. */
  summary: string;
  body: ReactNode;
};

export type LegalDocNotice = {
  eyebrow: string;
  heading: string;
  headingAccent: string;
  body: string;
  pills: string[];
};

type Props = {
  eyebrow: string;
  title: string;
  titleAccent: string;
  meta: { label: string; value: string }[];
  updatedAt: string;
  sections: LegalDocSection[];
  notice?: LegalDocNotice;
  withContents?: boolean;
  closing: {
    heading: string;
    body: ReactNode;
    ctaHref: string;
    ctaLabel: string;
  };
};

export default function LegalDocument({
  eyebrow,
  title,
  titleAccent,
  meta,
  updatedAt,
  sections,
  notice,
  withContents = false,
  closing,
}: Props) {
  // Numbered once, then handed to both the rail and the body — the two can't
  // disagree about what section 04 is because they read the same array.
  const numbered = sections.map((section, i) => ({
    ...section,
    num: String(i + 1).padStart(2, '0'),
  }));

  const tocItems: LegalTocItem[] = numbered.map(({ id, num, title: t }) => ({
    id,
    num,
    title: t,
  }));

  const metaRows = [
    { label: 'Last updated', value: formatLegalDate(updatedAt) },
    ...meta,
  ];

  return (
    <>
      {/* Header */}
      <div className='px-6 pt-20 sm:px-8 sm:pt-24 lg:px-12'>
        <SectionLabel className='mb-5 block'>{eyebrow}</SectionLabel>
        <div className='grid items-end gap-8 lg:grid-cols-[1fr_340px] lg:gap-16'>
          <h1 className='font-display text-[clamp(40px,6.5vw,84px)] font-normal leading-[0.98] tracking-tight text-ink'>
            {title} <em className='text-oxblood'>{titleAccent}</em>
          </h1>
          <dl className='flex flex-col lg:pb-2'>
            {metaRows.map((row) => (
              <div
                key={row.label}
                className='flex items-center justify-between gap-4 border-t border-line py-3'
              >
                <dt className='text-[11px] uppercase tracking-[0.18em] text-muted'>
                  {row.label}
                </dt>
                <dd className='text-right text-[13.5px] font-semibold text-ink'>
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Portfolio notice */}
      {notice && (
        <div className='px-6 pt-14 sm:px-8 lg:px-12'>
          <div className='relative overflow-hidden rounded-2xl bg-ink px-7 py-10 text-cream sm:px-10 sm:py-11'>
            <div
              aria-hidden='true'
              className='pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_8%_0%,rgba(154,59,50,0.32),transparent_55%)]'
            />
            <div className='relative grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:items-center lg:gap-14'>
              <div>
                <div className='mb-4 inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.22em] text-camel-soft'>
                  <span aria-hidden='true' className='h-px w-6 bg-camel' />
                  {notice.eyebrow}
                </div>
                <h2 className='font-display text-[clamp(28px,3vw,40px)] font-normal leading-[1.05]'>
                  {notice.heading}{' '}
                  <em className='text-camel-soft'>{notice.headingAccent}</em>
                </h2>
              </div>
              <div>
                <p className='mb-6 text-[16px] leading-[1.7] text-cream/85'>
                  {notice.body}
                </p>
                <ul className='flex flex-wrap gap-2.5'>
                  {notice.pills.map((pill) => (
                    <li
                      key={pill}
                      className='rounded-full border border-cream/25 bg-cream/10 px-4 py-2 text-[12px] text-cream/90'
                    >
                      {pill}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div
        className={`grid items-start gap-10 px-6 py-16 sm:px-8 lg:px-12 lg:py-20 ${
          withContents ? 'lg:grid-cols-[260px_1fr] lg:gap-16' : 'max-w-3xl'
        }`}
      >
        {withContents && (
          // Hidden below the laptop breakpoint: a six-item contents list earns
          // little on a phone when the document itself is a couple of screens
          // long, and it would push the actual terms below the fold.
          <div className='sticky top-24 hidden lg:block'>
            <LegalToc items={tocItems} />
          </div>
        )}

        <div className='min-w-0'>
          <article>
            {numbered.map((section, i) => (
              <section
                key={section.id}
                id={section.id}
                className={`scroll-mt-24 pb-12 ${
                  i > 0 ? 'border-t border-line pt-12' : ''
                }`}
              >
                <div className='mb-4 flex items-baseline gap-4'>
                  <span
                    aria-hidden='true'
                    className='font-display w-6 shrink-0 text-[15px] text-camel-deeper'
                  >
                    {section.num}
                  </span>
                  <h2 className='font-display text-[clamp(24px,2.6vw,34px)] font-normal leading-tight tracking-tight text-ink'>
                    {section.title}
                  </h2>
                </div>
                <div className='sm:pl-10'>
                  <p className='font-display mb-5 max-w-[62ch] text-[18px] italic leading-snug text-oxblood'>
                    {section.summary}
                  </p>
                  <div className='flex max-w-[66ch] flex-col gap-4'>
                    {section.body}
                  </div>
                </div>
              </section>
            ))}
          </article>

          {/* Closing card */}
          <div className='mt-10 flex flex-col gap-6 rounded-2xl border border-line-soft bg-paper px-7 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-9'>
            <div>
              <h2 className='font-display mb-2 text-[24px] font-normal leading-tight tracking-tight text-ink'>
                {closing.heading}
              </h2>
              <p className='max-w-[46ch] text-[15px] leading-relaxed text-ink-soft'>
                {closing.body}
              </p>
            </div>
            <Link
              href={closing.ctaHref}
              className='inline-flex shrink-0 items-center justify-center gap-2.5 self-start rounded-full bg-ink px-7 py-3.5 text-[14px] font-medium tracking-[0.02em] text-cream transition-colors duration-300 hover:bg-oxblood motion-reduce:transition-none sm:self-auto'
            >
              {closing.ctaLabel}
              <ArrowIcon className='h-3.5 w-3.5' />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

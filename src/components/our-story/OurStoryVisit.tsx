import Image from 'next/image';
import Link from 'next/link';

import Reveal from '@/components/uielements/Reveal';

const ICON_PIN = (
  <>
    <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z' />
    <circle cx='12' cy='10' r='3' />
  </>
);

const ICON_CLOCK = (
  <>
    <circle cx='12' cy='12' r='10' />
    <polyline points='12 6 12 12 16 14' />
  </>
);

const ICON_PHONE = (
  <path d='M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z' />
);

const HOURS_TEXT = (
  <>
    <strong className='text-ink font-medium'>Tue–Sat:</strong> 9am–7pm
    <br />
    <strong className='text-ink font-medium'>Sun:</strong> 10am–4pm · Closed
    Mondays
  </>
);

type Props = {
  street: string;
  cityStateZip: string;
  phone: string;
};

export default function OurStoryVisit({ street, cityStateZip, phone }: Props) {
  const infoRows = [
    {
      icon: ICON_PIN,
      text: (
        <>
          <strong className='text-ink font-medium'>{street}</strong>
          <br />
          {cityStateZip}
        </>
      ),
    },
    {
      icon: ICON_CLOCK,
      text: HOURS_TEXT,
    },
    {
      icon: ICON_PHONE,
      text: (
        <>
          <strong className='text-ink font-medium'>{phone}</strong> · Call to
          reserve a cut
        </>
      ),
    },
  ];

  return (
    <section className='px-4 py-24 sm:px-8 lg:px-16'>
      <div className='mx-auto max-w-7xl'>
        <Reveal>
          <div className='border-line-soft bg-paper overflow-hidden rounded-sm border lg:grid lg:grid-cols-2'>
            <div className='p-8 lg:p-14'>
              <p className='text-camel mb-4 text-[11px] tracking-[0.22em] uppercase'>
                § Come say hi
              </p>
              <h2 className='font-display mb-5 max-w-[14ch] text-[clamp(30px,4vw,46px)] leading-[1.05] font-normal tracking-tight'>
                The counter&apos;s{' '}
                <em className='text-oxblood italic'>open.</em>
              </h2>
              <p className='text-ink-soft mb-8 max-w-[38ch] text-[15px] leading-[1.65]'>
                The best way to understand what we do is to walk in and ask.
                No appointment, no obligation — we&apos;ll cut you a sample of
                whatever&apos;s looking good that day.
              </p>

              <div className='mb-9 flex flex-col gap-4'>
                {infoRows.map((row, i) => (
                  <div
                    key={i}
                    className='text-ink-soft flex items-start gap-3.5 text-sm'
                  >
                    <svg
                      className='text-oxblood mt-0.5 h-4 w-4 shrink-0'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth={2}
                    >
                      {row.icon}
                    </svg>
                    <span>{row.text}</span>
                  </div>
                ))}
              </div>

              <div className='flex flex-wrap gap-3'>
                <Link
                  href='/products'
                  className='bg-ink text-cream hover:bg-oxblood inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 text-sm font-medium tracking-[0.02em] transition-colors'
                >
                  Browse the shop
                  <svg
                    width='14'
                    height='14'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth={2}
                  >
                    <path d='M5 12h14M13 5l7 7-7 7' />
                  </svg>
                </Link>
                <a
                  href='#'
                  className='border-line text-ink-soft hover:border-ink hover:bg-cream hover:text-ink inline-flex items-center gap-2.5 rounded-full border px-6 py-3.5 text-sm font-medium tracking-[0.02em] transition-colors'
                >
                  Get directions
                </a>
              </div>
            </div>

            <div className='bg-cream-deep relative min-h-80 sm:min-h-96 lg:min-h-0'>
              <Image
                src='/images/our-story/visit-map.jpg'
                alt='Map showing EliteCuts location in San Diego, CA'
                fill
                className='object-cover contrast-[1.03] saturate-[0.85]'
                sizes='(max-width: 1024px) 100vw, 50vw'
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

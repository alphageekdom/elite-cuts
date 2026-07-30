import Image from 'next/image';

import Reveal from '@/components/ui/Reveal';
import ArrowIcon from '@/components/ui/icons/ArrowIcon';
import PinIcon from '@/components/ui/icons/PinIcon';
import ClockIcon from '@/components/ui/icons/ClockIcon';
import PhoneIcon from '@/components/ui/icons/PhoneIcon';
import { FOCUS_RING } from '@/lib/styles';
import {
  formatDirectionsUrl,
  formatPhoneHref,
} from '@/lib/shop-settings/format';
import type { ShopHoursCondensedRow } from '@/lib/shop-settings/hours-format';

type Props = {
  street: string;
  cityStateZip: string;
  phone: string;
  // Condensed rows off the live ShopHours doc. Previously this block hardcoded
  // "Tue–Sat: 9am–7pm / Sun: 10am–4pm · Closed Mondays", which would quietly
  // lie to customers the moment an admin changed the hours.
  hours: ShopHoursCondensedRow[];
};

export default function OurStoryVisit({
  street,
  cityStateZip,
  phone,
  hours,
}: Props) {
  const directionsHref = formatDirectionsUrl(`${street}, ${cityStateZip}`);

  const infoRows = [
    {
      icon: <PinIcon className='text-oxblood mt-0.5 h-4 w-4 shrink-0' />,
      text: (
        <>
          <strong className='text-ink font-medium'>{street}</strong>
          <br />
          {cityStateZip}
        </>
      ),
    },
    {
      icon: <ClockIcon className='text-oxblood mt-0.5 h-4 w-4 shrink-0' />,
      text: (
        <>
          {hours.map((row) => (
            <span key={row.label} className='block'>
              <strong className='text-ink font-medium'>{row.label}:</strong>{' '}
              {row.value}
            </span>
          ))}
        </>
      ),
    },
    {
      icon: <PhoneIcon className='text-oxblood mt-0.5 h-4 w-4 shrink-0' />,
      text: (
        <>
          <a
            href={formatPhoneHref(phone)}
            className={`text-ink hover:text-oxblood font-medium underline decoration-transparent underline-offset-2 transition-colors hover:decoration-current ${FOCUS_RING}`}
          >
            {phone}
          </a>
          {' · Call to reserve a cut'}
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
              <p className='text-camel-deep mb-4 text-[11px] tracking-[0.22em] uppercase'>
                <span aria-hidden>§ </span>
                Come say hi
              </p>
              <h2 className='font-display mb-5 max-w-[14ch] text-[clamp(30px,4vw,46px)] leading-[1.05] font-normal tracking-tight'>
                The counter&apos;s{' '}
                <em className='text-oxblood italic'>open.</em>
              </h2>
              <p className='text-ink-soft mb-8 max-w-[38ch] text-[15px] leading-[1.65]'>
                The best way to understand what we do is to walk in and ask. No
                appointment, no obligation — we&apos;ll cut you a sample of
                whatever&apos;s looking good that day.
              </p>

              <div className='mb-9 flex flex-col gap-4'>
                {infoRows.map((row, i) => (
                  <div
                    key={i}
                    className='text-ink-soft flex items-start gap-3.5 text-sm'
                  >
                    {row.icon}
                    <span>{row.text}</span>
                  </div>
                ))}
              </div>

              <a
                href={directionsHref}
                target='_blank'
                rel='noopener noreferrer'
                className={`border-line text-ink-soft hover:border-ink hover:bg-cream hover:text-ink group/dir inline-flex items-center gap-2.5 rounded-full border px-6 py-3.5 text-sm font-medium tracking-[0.02em] transition-colors ${FOCUS_RING}`}
              >
                Get directions
                <span className='sr-only'>
                  {' (opens Google Maps in a new tab)'}
                </span>
                <ArrowIcon className='h-3.5 w-3.5 transition-transform duration-300 group-hover/dir:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover/dir:translate-x-0' />
              </a>
            </div>

            <div className='bg-cream-deep relative min-h-80 sm:min-h-96 lg:min-h-0'>
              <Image
                src='/images/our-story/visit-counter.jpg'
                alt='Inside EliteCuts — the service counter and display case'
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

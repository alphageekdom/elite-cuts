import Link from 'next/link';

import Reveal from '@/components/uielements/Reveal';
import {
  formatPhoneHref,
  formatShopCityStateZip,
  getShopSettings,
} from '@/lib/shop-settings/queries';
import {
  formatShopHoursCondensed,
  getShopHours,
} from '@/lib/shop-settings/hours-queries';
import { splitWordmark } from '@/lib/wordmark';

const FacebookIcon = () => (
  <svg
    width={14}
    height={14}
    viewBox='0 0 24 24'
    fill='currentColor'
    aria-hidden='true'
  >
    <path d='M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 011-1h3v-4h-3a5 5 0 00-5 5v2.01h-2l-.396 3.98h2.396v8.01z' />
  </svg>
);

const InstagramIcon = () => (
  <svg
    width={14}
    height={14}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    aria-hidden='true'
  >
    <rect x='3' y='3' width='18' height='18' rx='5' />
    <circle cx='12' cy='12' r='4' />
    <circle cx='17.5' cy='6.5' r='0.5' fill='currentColor' />
  </svg>
);

const PinterestIcon = () => (
  <svg
    width={14}
    height={14}
    viewBox='0 0 24 24'
    fill='currentColor'
    aria-hidden='true'
  >
    <path d='M12 2C6.48 2 2 6.48 2 12c0 4.09 2.46 7.6 5.97 9.13-.08-.78-.16-1.97.03-2.82.18-.77 1.16-4.91 1.16-4.91s-.3-.59-.3-1.47c0-1.38.8-2.41 1.8-2.41.85 0 1.26.64 1.26 1.4 0 .85-.54 2.13-.83 3.31-.24.99.5 1.79 1.47 1.79 1.77 0 3.13-1.86 3.13-4.55 0-2.38-1.71-4.04-4.15-4.04-2.83 0-4.49 2.12-4.49 4.31 0 .85.33 1.77.74 2.27.08.1.09.19.07.29l-.27 1.13c-.04.18-.14.22-.32.13-1.2-.56-1.95-2.31-1.95-3.72 0-3.03 2.2-5.81 6.34-5.81 3.33 0 5.92 2.37 5.92 5.55 0 3.31-2.09 5.97-4.99 5.97-.97 0-1.89-.5-2.2-1.1l-.6 2.28c-.22.83-.8 1.88-1.19 2.51.9.28 1.84.43 2.83.43 5.52 0 10-4.48 10-10S17.52 2 12 2z' />
  </svg>
);

const LinkedInIcon = () => (
  <svg
    width={14}
    height={14}
    viewBox='0 0 24 24'
    fill='currentColor'
    aria-hidden='true'
  >
    <path d='M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z' />
  </svg>
);

const YouTubeIcon = () => (
  <svg
    width={14}
    height={14}
    viewBox='0 0 24 24'
    fill='currentColor'
    aria-hidden='true'
  >
    <path d='M21.582 7.014a2.506 2.506 0 00-1.768-1.768C18.254 4.83 12 4.83 12 4.83s-6.254 0-7.814.416A2.506 2.506 0 002.418 7.014C2 8.574 2 12 2 12s0 3.426.418 4.986a2.506 2.506 0 001.768 1.768c1.56.416 7.814.416 7.814.416s6.254 0 7.814-.416a2.506 2.506 0 001.768-1.768C22 15.426 22 12 22 12s0-3.426-.418-4.986zM10 15.464V8.536L16 12l-6 3.464z' />
  </svg>
);

const SOCIALS = [
  { label: 'Facebook', href: 'https://www.facebook.com/elitecuts', Icon: FacebookIcon },
  { label: 'Instagram', href: 'https://www.instagram.com/elitecuts', Icon: InstagramIcon },
  { label: 'Pinterest', href: 'https://www.pinterest.com/elitecuts', Icon: PinterestIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/elitecuts', Icon: LinkedInIcon },
  { label: 'YouTube', href: 'https://www.youtube.com/@elitecuts', Icon: YouTubeIcon },
] as const;

const QUICK_LINKS = [
  { label: 'Shop all cuts', href: '/products' },
  { label: 'Featured cuts', href: '/#featured' },
  { label: 'Our Story', href: '/our-story' },
  { label: 'Contact', href: '/contact' },
] as const;

// The three column headings below are h3, not h4. As h4 they skipped a level
// on most routes — the heading immediately above the footer is an h2 on
// /rewards, /our-story, /contact, /login and the legal pages, though / and
// /products do end on an h3, where h4 was legal. h3 is correct in both cases,
// since no content heading anywhere on the site goes deeper than h3. The class
// carries all the styling, so the level is free to be correct.
const COLUMN_HEADING =
  'mb-6 font-sans text-xs font-medium tracking-[0.16em] uppercase text-camel';
const COLUMN_LINK =
  'text-[15px] text-cream opacity-85 transition-[opacity,padding] duration-300 hover:opacity-100 hover:pl-1.5 motion-reduce:transition-none motion-reduce:hover:pl-0';

const Footer = async () => {
  const [settings, hoursDays] = await Promise.all([
    getShopSettings(),
    getShopHours(),
  ]);
  // Hours used to be hardcoded here and in the Our Story visit block, so both
  // would quietly lie to customers the moment an admin changed them.
  const hours = formatShopHoursCondensed(hoursDays);
  const year = new Date().getFullYear();
  const cityStateZip = formatShopCityStateZip(settings);
  const wordmark = splitWordmark(settings.shopName);

  return (
    <footer className='bg-ink pt-25 pb-10 text-cream'>
      <div className='mx-auto w-full max-w-7xl px-6 md:px-8'>
        <Reveal>
          <div className='grid grid-cols-1 gap-15 border-b border-cream/10 pb-20 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]'>
            <div>
              <div className='mb-6 font-display text-5xl leading-none tracking-[-0.02em] font-normal'>
                {wordmark.before}
                {wordmark.italic && (
                  <em className='font-normal italic text-camel'>{wordmark.italic}</em>
                )}
              </div>
              <p className='max-w-[32ch] text-sm leading-[1.6] opacity-80'>
                {settings.description}
              </p>
            </div>

            <div>
              <h3 className={COLUMN_HEADING}>Visit</h3>
              <p className='mb-4 text-sm leading-[1.7] opacity-85'>
                {settings.street}
                {settings.suite && (
                  <>
                    <br />
                    {settings.suite}
                  </>
                )}
                <br />
                {cityStateZip}
              </p>
              <p className='text-sm leading-[1.7] opacity-75'>
                {hours.map((row) => (
                  <span key={row.label} className='block'>
                    {row.isClosed
                      ? `Closed ${row.label}`
                      : `${row.label} ${row.value}`}
                  </span>
                ))}
              </p>
            </div>

            <div>
              <h3 className={COLUMN_HEADING}>Contact</h3>
              <ul className='flex flex-col gap-3'>
                <li>
                  <a href={formatPhoneHref(settings.phone)} className={COLUMN_LINK}>
                    {settings.phone}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${settings.email}`} className={COLUMN_LINK}>
                    {settings.email}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className={COLUMN_HEADING}>Quick Links</h3>
              <ul className='flex flex-col gap-3'>
                {QUICK_LINKS.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className={COLUMN_LINK}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        <Reveal delayMs={120}>
          <div className='flex flex-wrap items-center justify-between gap-4 pt-8 text-[14px]'>
            <div className='flex flex-col gap-1.5 text-cream/70'>
              <div>
                &copy; {year} {settings.shopName}.{' '}
                <Link
                  href='/terms'
                  className='text-cream/70 transition-colors duration-300 hover:text-cream focus-visible:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream motion-reduce:transition-none'
                >
                  Terms
                </Link>
                <span className='mx-2 text-cream/40' aria-hidden>
                  ·
                </span>
                <Link
                  href='/privacy'
                  className='text-cream/70 transition-colors duration-300 hover:text-cream focus-visible:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream motion-reduce:transition-none'
                >
                  Privacy
                </Link>
              </div>
              <div>
                Created by{' '}
                <a
                  href='https://www.alphageekdom.com'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-camel transition-colors duration-300 hover:text-cream focus-visible:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream motion-reduce:transition-none'
                >
                  AlphaGeekdom
                  <span className='sr-only'> (opens in new tab)</span>
                </a>
              </div>
            </div>
            <div className='flex gap-4'>
              {SOCIALS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label={`${label} (opens in new tab)`}
                  className='grid h-10 w-10 place-items-center rounded-full border border-cream/20 text-cream transition-[background-color,border-color] duration-300 hover:border-oxblood hover:bg-oxblood motion-reduce:transition-none'
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </footer>
  );
};

export default Footer;

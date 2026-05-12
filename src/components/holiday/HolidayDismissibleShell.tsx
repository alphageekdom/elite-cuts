'use client';

import { useEffect, useState, type ReactNode } from 'react';

import type { HolidaySlug } from '@/lib/holidays';

type Props = {
  slug: HolidaySlug;
  year: number;
  children: ReactNode;
};

const storageKey = (slug: HolidaySlug, year: number) =>
  `holiday-dismissed-${slug}-${year}`;

// Wraps a server-rendered holiday surface and renders an absolutely-positioned
// × button that hides the content for the rest of the browser session (per-tab
// dismissal in sessionStorage). The banner returns on a fresh session so the
// escalating countdown ("IN 14 DAYS" → "IN 7 DAYS" → "TOMORROW") still reaches
// the customer as the holiday approaches. Server-side renders the content by
// default so the initial paint is correct; client-mount may hide it after
// reading sessionStorage.
export default function HolidayDismissibleShell({ slug, year, children }: Props) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(storageKey(slug, year)) === '1') {
      setDismissed(true);
    }
  }, [slug, year]);

  if (dismissed) return null;

  const handleDismiss = () => {
    window.sessionStorage.setItem(storageKey(slug, year), '1');
    setDismissed(true);
  };

  return (
    <div className='relative'>
      {children}
      <button
        type='button'
        onClick={handleDismiss}
        aria-label='Dismiss holiday reminder'
        className='absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full text-muted transition-colors duration-200 hover:bg-cream-deep hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream focus-visible:ring-offset-2 focus-visible:ring-offset-ink/40'
      >
        <svg
          width='12'
          height='12'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
        >
          <line x1='18' y1='6' x2='6' y2='18' />
          <line x1='6' y1='6' x2='18' y2='18' />
        </svg>
      </button>
    </div>
  );
}

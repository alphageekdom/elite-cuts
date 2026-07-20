'use client';

import { useEffect, useRef } from 'react';

import type { Announcement } from '@/lib/announcements/data';
import { ANNOUNCEMENT_DOT_BG } from '@/lib/announcements/display';
import StoreInfoModal from '@/components/ui/StoreInfoModal';

type AnnouncementBellPopoverProps = {
  announcements: Announcement[];
  onDismiss: (id: string) => void;
};

const CTA_CLASS =
  'inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 text-[12px] font-medium tracking-[0.02em] text-cream transition-colors duration-200 hover:bg-oxblood';

const AnnouncementBellPopover = ({
  announcements,
  onDismiss,
}: AnnouncementBellPopoverProps) => {
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    firstActionRef.current?.focus();
  }, []);

  // Dismissing a card unmounts its focused Dismiss button — move focus to
  // the adjacent card's Dismiss first so keyboard users aren't dropped to
  // <body>. When no card remains, the bell's own handler takes over.
  const handleDismissClick = (id: string, index: number) => {
    const buttons = listRef.current?.querySelectorAll<HTMLElement>(
      'button[aria-label^="Dismiss"]',
    );
    if (buttons) {
      const neighbor = buttons[index + 1] ?? buttons[index - 1];
      neighbor?.focus();
    }
    onDismiss(id);
  };

  return (
    <div
      role='dialog'
      aria-modal='false'
      aria-label='Active announcements'
      className='absolute right-0 z-10 mt-3 w-[min(20rem,calc(100vw-5.5rem))] rounded-md border border-line bg-paper py-1 shadow-lg ring-1 ring-black/5'
    >
      <div className='border-b border-line-soft px-4 py-3'>
        <p className='font-display text-[14px] font-medium text-ink'>
          Happening at the shop
        </p>
      </div>

      <ul ref={listRef} className='divide-y divide-line-soft'>
        {announcements.map((a, i) => (
          <li key={a.id} className='flex items-start gap-3 px-4 py-3.5'>
            <span
              aria-hidden='true'
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ANNOUNCEMENT_DOT_BG[a.accent]}`}
            />
            <div className='min-w-0 flex-1'>
              <p className='text-[13px] font-medium leading-snug text-ink'>
                {a.title}
              </p>
              <p className='mt-0.5 text-[12px] leading-snug text-ink-soft'>
                {a.body}
              </p>
              <div className='mt-3'>
                <StoreInfoModal
                  label={a.ctaLabel}
                  triggerClassName={CTA_CLASS}
                />
              </div>
            </div>
            <button
              ref={i === 0 ? firstActionRef : null}
              type='button'
              onClick={() => handleDismissClick(a.id, i)}
              aria-label={`Dismiss ${a.title}`}
              className='-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-cream-deep hover:text-ink'
            >
              <svg
                width='12'
                height='12'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                aria-hidden='true'
              >
                <line x1='18' y1='6' x2='6' y2='18' />
                <line x1='6' y1='6' x2='18' y2='18' />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AnnouncementBellPopover;

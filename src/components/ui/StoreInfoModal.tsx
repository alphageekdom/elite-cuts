'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { useScrollLock } from '@/hooks/useScrollLock';
import {
  SHOP_ADDRESS,
  SHOP_ADDRESS_FULL_WITH_ZIP,
  SHOP_CITY_STATE_ZIP,
  SHOP_PHONE,
  SHOP_PHONE_HREF,
} from '@/lib/shopConfig';

const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(SHOP_ADDRESS_FULL_WITH_ZIP)}`;

// dayIndex: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
type HoursRow = {
  label: string;
  time: string;
  days: number[];
  openH?: number;
  closeH?: number;
  closed?: boolean;
};

const HOURS: HoursRow[] = [
  { label: 'Tue – Sat', time: '9am – 7pm', days: [2, 3, 4, 5, 6], openH: 9, closeH: 19 },
  { label: 'Sunday', time: '10am – 4pm', days: [0], openH: 10, closeH: 16 },
  { label: 'Monday', time: 'Closed', days: [1], closed: true },
];

function getStatus() {
  const now = new Date();
  const day = now.getDay();
  const hourFloat = now.getHours() + now.getMinutes() / 60;
  const todayRow = HOURS.find((r) => r.days.includes(day));
  const isOpen =
    !!todayRow &&
    !todayRow.closed &&
    hourFloat >= (todayRow.openH ?? 0) &&
    hourFloat < (todayRow.closeH ?? 0);
  return { todayRow, isOpen };
}

function ClipboardIcon() {
  return (
    <svg
      width='10'
      height='10'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      aria-hidden='true'
    >
      <rect x='9' y='2' width='6' height='4' rx='1' />
      <path d='M9 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-3' />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width='11'
      height='11'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.5'
      aria-hidden='true'
    >
      <polyline points='20 6 9 17 4 12' />
    </svg>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — please copy manually.');
    }
  };

  return (
    <button
      type='button'
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : label}
      className='inline-flex min-w-16 shrink-0 items-center justify-center gap-1.5 rounded-full border border-line bg-cream px-2.5 py-1 text-[11px] font-medium tracking-[0.04em] text-muted transition-colors duration-200 hover:border-ink hover:text-ink'
    >
      {copied ? (
        <CheckIcon />
      ) : (
        <>
          <ClipboardIcon /> Copy
        </>
      )}
    </button>
  );
}

type StoreInfoModalProps = {
  label?: string;
  triggerClassName?: string;
};

const DEFAULT_TRIGGER_CLASS =
  'font-medium text-ink-soft underline underline-offset-2 transition-colors duration-200 hover:text-ink';

export default function StoreInfoModal({
  label = 'Visit us in‑store',
  triggerClassName,
}: StoreInfoModalProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  const { data: session } = useSession();
  const firstName = session?.user?.name?.trim().split(/\s+/)[0];
  const greeting = firstName ? `Hi, ${firstName}` : 'Come say hi';

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Focus close button on open; restore focus to trigger on close (only after first open)
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      const id = window.setTimeout(() => closeRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
    if (wasOpenRef.current) {
      triggerRef.current?.focus();
    }
  }, [open]);

  const { todayRow, isOpen } = getStatus();

  return (
    <>
      <button
        ref={triggerRef}
        type='button'
        onClick={() => setOpen(true)}
        className={triggerClassName ?? DEFAULT_TRIGGER_CLASS}
      >
        {label}
      </button>

      {open && createPortal(
        <div className='fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center'>
          <div
            className='absolute inset-0 bg-ink/60 backdrop-blur-xs'
            onClick={() => setOpen(false)}
            aria-hidden='true'
          />

          <div
            role='dialog'
            aria-modal='true'
            aria-label={label}
            className='relative max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-xl border border-line-soft bg-paper shadow-2xl'
          >
            {/* Header */}
            <div className='flex items-start justify-between border-b border-line-soft px-6 pb-5 pt-6'>
              <div>
                <p className='mb-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted'>
                  {greeting}
                </p>
                <h2 className='font-display text-[22px] font-normal tracking-tight'>
                  The counter&apos;s{' '}
                  <em className='italic text-oxblood'>open.</em>
                </h2>
                <span
                  className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[0.04em] ${
                    isOpen
                      ? 'bg-green-soft text-green'
                      : 'bg-ink/6 text-muted'
                  }`}
                >
                  <span className='h-1.5 w-1.5 rounded-full bg-current' />
                  {isOpen ? 'OPEN NOW' : 'CLOSED'}
                </span>
              </div>
              <button
                ref={closeRef}
                onClick={() => setOpen(false)}
                aria-label='Close'
                className='grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-cream text-ink transition-colors duration-200 hover:border-ink hover:bg-cream-deep'
              >
                <svg
                  width='14'
                  height='14'
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

            {/* Body */}
            <div className='space-y-4 px-6 py-5'>
              {/* Address */}
              <div className='flex items-start justify-between gap-4'>
                <div className='flex items-start gap-3 text-sm text-ink-soft'>
                  <svg
                    className='mt-0.5 h-4 w-4 shrink-0 text-oxblood'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth={2}
                  >
                    <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z' />
                    <circle cx='12' cy='10' r='3' />
                  </svg>
                  <span>
                    <strong className='font-medium text-ink'>{SHOP_ADDRESS}</strong>
                    <br />
                    {SHOP_CITY_STATE_ZIP}
                    <br />
                    <a
                      href={DIRECTIONS_URL}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-oxblood transition-colors duration-200 hover:text-ink'
                    >
                      Get directions
                      <svg
                        width='10'
                        height='10'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2.5'
                        aria-hidden='true'
                      >
                        <path d='M5 12h14M13 5l7 7-7 7' />
                      </svg>
                    </a>
                  </span>
                </div>
                <CopyButton text={SHOP_ADDRESS_FULL_WITH_ZIP} label='Copy address' />
              </div>

              {/* Phone */}
              <div className='flex items-center justify-between gap-4'>
                <div className='flex items-start gap-3 text-sm text-ink-soft'>
                  <svg
                    className='mt-0.5 h-4 w-4 shrink-0 text-oxblood'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth={2}
                  >
                    <path d='M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z' />
                  </svg>
                  <a
                    href={SHOP_PHONE_HREF}
                    className='font-medium text-ink transition-colors duration-200 hover:text-oxblood'
                  >
                    {SHOP_PHONE}
                  </a>
                </div>
                <CopyButton text={SHOP_PHONE} label='Copy phone number' />
              </div>

              {/* Hours */}
              <div className='border-t border-line-soft pt-4'>
                <p className='mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-muted'>
                  Hours
                </p>
                <div className='space-y-1 text-sm'>
                  {HOURS.map((row) => {
                    const isToday = todayRow === row;
                    return (
                      <div
                        key={row.label}
                        className={`flex justify-between gap-4 py-1 ${
                          isToday ? '-mx-2 rounded bg-oxblood/4 px-2' : ''
                        }`}
                      >
                        <span className={isToday ? 'font-medium text-ink' : 'text-ink-soft'}>
                          {row.label}
                        </span>
                        <span
                          className={`font-mono text-[13px] ${
                            row.closed ? 'text-oxblood' : 'text-ink'
                          }`}
                        >
                          {row.time}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Portfolio disclaimer */}
              <p className='border-t border-line-soft pt-4 text-center text-[11px] leading-relaxed text-muted'>
                ⓘ This is a portfolio project — EliteCuts is not a real shop.
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

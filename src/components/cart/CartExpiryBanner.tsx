'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useCartExpiry } from '@/hooks/useCartExpiry';

type Props = {
  onVisibleChange?: (visible: boolean) => void;
};

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CartExpiryBanner({ onVisibleChange }: Props) {
  const { secondsLeft, percentLeft, isWarning, dismissed, dismiss } = useCartExpiry();

  const isVisible = secondsLeft !== null && secondsLeft > 0 && !dismissed;
  useEffect(() => {
    onVisibleChange?.(isVisible);
  }, [isVisible, onVisibleChange]);

  if (!isVisible) return null;

  return (
    <div
      className={`w-full transition-colors duration-500 ${
        isWarning ? 'bg-oxblood text-cream' : 'bg-ink text-cream'
      }`}
    >
      {/* Announce state transitions only — a live region around the ticking
          countdown would re-announce the whole sentence every second. */}
      <span role='status' className='sr-only'>
        {isWarning
          ? 'Cart reservation expiring soon'
          : 'Cart items reserved for a limited time'}
      </span>
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2.5 gap-4">
        <p className="text-[13px] font-medium tracking-wide">
          {isWarning ? '⚠ ' : ''}
          Cart reserved for{' '}
          <span className="font-mono tabular-nums font-semibold">
            {fmt(secondsLeft)}
          </span>
          {' '}— then items are released.
        </p>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/checkout"
            className={`text-[12px] font-medium tracking-[0.08em] uppercase border px-3 py-1 rounded-full transition-colors duration-200 ${
              isWarning
                ? 'border-cream/60 hover:bg-cream hover:text-oxblood'
                : 'border-cream/40 hover:bg-cream hover:text-ink'
            }`}
          >
            Checkout
          </Link>
          <button
            onClick={dismiss}
            aria-label="Dismiss cart timer"
            className="opacity-60 hover:opacity-100 transition-opacity duration-200 text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className={`h-0.5 w-full ${isWarning ? 'bg-cream/20' : 'bg-cream/10'}`}>
        <div
          className={`h-full transition-[width] duration-1000 ease-linear ${
            isWarning ? 'bg-cream/70' : 'bg-oxblood'
          }`}
          style={{ width: `${percentLeft}%` }}
        />
      </div>
    </div>
  );
}

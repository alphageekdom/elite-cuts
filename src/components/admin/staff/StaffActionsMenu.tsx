'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Props = {
  staffName: string;
  onViewProfile: () => void;
};

export default function StaffActionsMenu({ staffName, onViewProfile }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        aria-label={`Actions for ${staffName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-8 h-8 grid place-items-center rounded-full text-muted hover:text-ink hover:bg-cream/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-oxblood/40"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-20 min-w-45 bg-paper border border-line-soft rounded-sm shadow-lg py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onViewProfile();
            }}
            className="w-full text-left px-3 py-2 text-[13px] text-ink hover:bg-cream transition-colors"
          >
            View profile
          </button>
          <Link
            href="/dashboard/schedule"
            role="menuitem"
            className="block w-full text-left px-3 py-2 text-[13px] text-ink hover:bg-cream transition-colors"
            onClick={() => setOpen(false)}
          >
            View schedule
          </Link>
        </div>
      )}
    </div>
  );
}

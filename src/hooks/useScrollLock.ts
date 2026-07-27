'use client';
import { useEffect } from 'react';

// Locks body scroll while an overlay is open. The sideways page-shift that
// hiding the scrollbar would otherwise cause is handled by `scrollbar-gutter:
// stable` on `html` in globals.css, not here — compensating with body padding
// requires reading the current padding to add to it, which compounds whenever
// the effect re-runs while locked.
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}

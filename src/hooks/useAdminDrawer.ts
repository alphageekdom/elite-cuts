'use client';
import { useCallback, useState } from 'react';
import { useScrollLock } from './useScrollLock';

/** Manages drawer open/close state and locks body scroll while open. */
export function useAdminDrawer<T>(opts?: { scrollLock?: boolean }) {
  const [item, setItem] = useState<T | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useScrollLock((opts?.scrollLock ?? true) && isOpen);

  // Stable identities so callers can safely list these in effect deps.
  const open = useCallback((newItem?: T | null) => {
    if (newItem !== undefined) setItem(newItem);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setItem(null);
  }, []);

  return {
    item,
    isOpen,
    open,
    close,
    // Escape hatch: update the active drawer item in place without a close/reopen cycle.
    setItem,
  };
}

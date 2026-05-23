'use client';
import { useCallback, useState } from 'react';

// Manages drawer open/close state for the admin shell. Body-scroll lock
// is owned by `SlideDrawer` itself (driven by `open`) — this hook just
// tracks which row/item the drawer is displaying and exposes stable
// open/close callbacks the caller can list in effect dependencies.
export function useAdminDrawer<T>() {
  const [item, setItem] = useState<T | null>(null);
  const [isOpen, setIsOpen] = useState(false);

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

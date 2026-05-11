'use client';
import { useState } from 'react';

/** Manages drawer open/close state and locks body scroll while open. */
export function useAdminDrawer<T>() {
  const [item, setItem] = useState<T | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  function open(newItem?: T | null) {
    if (newItem !== undefined) setItem(newItem);
    setIsOpen(true);
    document.body.style.overflow = 'hidden';
  }

  function close() {
    setIsOpen(false);
    setItem(null);
    document.body.style.overflow = '';
  }

  return { item, isOpen, open, close, setItem };
}

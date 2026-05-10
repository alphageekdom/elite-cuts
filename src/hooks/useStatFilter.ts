'use client';
import { useState } from 'react';

/**
 * Manages the active stat-strip filter key for admin table pages.
 * `onSelect` is called after the key changes — use it to reset page, selections, etc.
 */
export function useStatFilter(initialKey: string, onSelect?: () => void) {
  const [activeKey, setActiveKey] = useState(initialKey);

  function selectKey(key: string) {
    setActiveKey(key);
    onSelect?.();
  }

  return { activeKey, selectKey };
}

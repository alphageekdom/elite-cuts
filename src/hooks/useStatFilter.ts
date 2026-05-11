'use client';
import { useState } from 'react';

/**
 * Manages the active stat-strip filter key for admin table pages.
 * `onSelect` is called after the key changes — use it to reset page, selections, etc.
 */
export function useStatFilter<K extends string = string>(initialKey: K, onSelect?: () => void) {
  const [activeKey, setActiveKey] = useState<K>(initialKey);

  function selectKey(key: K) {
    setActiveKey(key);
    onSelect?.();
  }

  return { activeKey, selectKey };
}

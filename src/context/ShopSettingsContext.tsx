'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { ShopSettings } from '@/models/ShopSettings';

const ShopSettingsContext = createContext<ShopSettings | null>(null);

type Props = {
  value: ShopSettings;
  children: ReactNode;
};

export function ShopSettingsProvider({ value, children }: Props) {
  return (
    <ShopSettingsContext.Provider value={value}>
      {children}
    </ShopSettingsContext.Provider>
  );
}

export function useShopSettings(): ShopSettings {
  const value = useContext(ShopSettingsContext);
  if (!value) {
    throw new Error('useShopSettings must be used inside a ShopSettingsProvider');
  }
  return value;
}

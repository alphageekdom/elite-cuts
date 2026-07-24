'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { PublicShopSettings } from '@/lib/shop-settings/public';

// The context carries only the public settings slice — the root layout strips
// admin-only fields (alert toggles, dormancy threshold) via toPublicShopSettings
// before providing, so they never reach the client bundle.
const ShopSettingsContext = createContext<PublicShopSettings | null>(null);

type Props = {
  value: PublicShopSettings;
  children: ReactNode;
};

export function ShopSettingsProvider({ value, children }: Props) {
  return (
    <ShopSettingsContext.Provider value={value}>
      {children}
    </ShopSettingsContext.Provider>
  );
}

export function useShopSettings(): PublicShopSettings {
  const value = useContext(ShopSettingsContext);
  if (!value) {
    throw new Error('useShopSettings must be used inside a ShopSettingsProvider');
  }
  return value;
}

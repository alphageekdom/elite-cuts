import type { ShopSettings } from '@/models/ShopSettings';

export function formatShopAddress(s: Pick<ShopSettings, 'street' | 'suite' | 'city' | 'state' | 'zip'>): string {
  const line1 = s.suite ? `${s.street}, ${s.suite}` : s.street;
  return `${line1}, ${s.city}, ${s.state} ${s.zip}`;
}

export function formatShopCityStateZip(s: Pick<ShopSettings, 'city' | 'state' | 'zip'>): string {
  return `${s.city}, ${s.state} ${s.zip}`;
}

export function formatPhoneHref(phone: string): string {
  // Preserve a leading + for international numbers; strip the rest of the
  // formatting (spaces, dashes, parens) so browsers handle the tel: URI.
  const trimmed = phone.trim();
  const sign = trimmed.startsWith('+') ? '+' : '';
  return `tel:${sign}${trimmed.replace(/\D/g, '')}`;
}

export function formatWebsiteDisplay(website: string): string {
  return website.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

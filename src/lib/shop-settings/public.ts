import type { ShopSettings } from '@/models/ShopSettings';

// Admin-only settings that must never cross the server/client boundary: the
// three in-app alert preferences and the dormancy-scan threshold. Everything
// else in ShopSettings is customer-facing (shop identity, hours, pickup ops,
// rewards, redemption) and already shows up on public surfaces, so it's safe
// to serialize into the client ShopSettings context.
const ADMIN_ONLY_KEYS = [
  'notifNewOrder',
  'notifLowStock',
  'notifNewEvent',
  'dormancyWarningMonths',
] as const;

export type PublicShopSettings = Omit<
  ShopSettings,
  (typeof ADMIN_ONLY_KEYS)[number]
>;

// Strip the admin-only keys before the settings doc is handed to the client
// context provider. Called on the server (root layout) so those fields never
// enter the RSC flight payload.
export function toPublicShopSettings(settings: ShopSettings): PublicShopSettings {
  const clone: Partial<ShopSettings> = { ...settings };
  for (const key of ADMIN_ONLY_KEYS) {
    delete clone[key];
  }
  return clone as PublicShopSettings;
}

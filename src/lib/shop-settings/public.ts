import type { ShopSettings } from '@/models/ShopSettings';

// What the browser is allowed to see.
//
// This used to be a denylist — four named admin-only keys deleted from a copy
// of the whole document. That makes *inclusion the default*, so the next
// admin-only field added to the model would ship to every visitor on every
// page unless someone remembered to add it to the list. That is exactly how
// the 2026-07-24 exposure happened, and the `Omit<>`-based public type gave no
// runtime protection and produced no type error either.
//
// Inverted, so a new field is private until someone says otherwise.
export const PUBLIC_SHOP_SETTINGS_KEYS = [
  // Shop identity — rendered in the footer, contact page, receipts, metadata.
  'shopName',
  'description',
  'phone',
  'email',
  'website',
  'street',
  'suite',
  'city',
  'state',
  'zip',
  'timezone',
  // Pickup operations — drive the slot picker and the "ready in" copy.
  'slotsPerHour',
  'leadTime',
  'maxBookingWindow',
  // Rewards — the rewards page, the checkout redeem block and the profile
  // tier tracker all read these.
  'pointsPerDollar',
  'weekendMultiplier',
  'pointsExpiryMonths',
  'redemptionPoints',
  'redemptionDollars',
  'minToRedeem',
  'maxRedemptionPercent',
  'maxRedemptionDollars',
  'connoisseurThreshold',
  'masterCutThreshold',
  'tierWindowMonths',
] as const satisfies readonly (keyof ShopSettings)[];

// Kept as an explicit list rather than "everything else" so the test in
// public.test.ts can assert the two sets together account for every key on the
// model — which is what actually forces a new field to be classified.
export const ADMIN_ONLY_SHOP_SETTINGS_KEYS = [
  'notifNewOrder',
  'notifLowStock',
  'notifNewEvent',
  'dormancyWarningMonths',
] as const satisfies readonly (keyof ShopSettings)[];

export type PublicShopSettings = Pick<
  ShopSettings,
  (typeof PUBLIC_SHOP_SETTINGS_KEYS)[number]
>;

// Build the client-facing slice. Called on the server (root layout) so the
// admin-only fields never enter the RSC flight payload in the first place.
export function toPublicShopSettings(settings: ShopSettings): PublicShopSettings {
  const out = {} as Record<string, unknown>;
  for (const key of PUBLIC_SHOP_SETTINGS_KEYS) {
    out[key] = settings[key];
  }
  return out as PublicShopSettings;
}

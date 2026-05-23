// `import type` keeps this file out of the runtime graph the model file
// imports from — the type vanishes at compile time so the model can
// runtime-import these constants without a circular dependency.
import type { ShopSettings } from '@/models/ShopSettings';

// Single canonical default snapshot for the singleton shop settings doc.
// Consumed by:
//   - `src/models/ShopSettings.ts` — Mongoose schema field defaults
//   - `src/lib/shopSettings.ts` — server-side fallback when Mongo is
//     unreachable on cold start
//   - `src/lib/demo/seed/settings.ts` — nightly demo reset snapshot
//   - `src/components/admin/settings/SettingsClient.tsx` — pre-resolve
//     state shown for the brief moment before the API GET resolves
//
// Prior to consolidation these four sites carried their own copies and
// had already drifted on the `description` text — `SettingsClient` had a
// truncated version while the other three had the full sentence.
//
// Frozen at module-init so a future caller can't accidentally mutate the
// shared snapshot in place — consumers all spread/copy today, but this is
// a cheap belt-and-suspenders guard.
export const DEFAULT_SHOP_SETTINGS: ShopSettings = Object.freeze({
  shopName: 'EliteCuts',
  tagline: 'Hand-cut meats, butchered fresh',
  description:
    'Hand-cut meats, butchered fresh in San Diego. Order online for same-day pickup.',
  phone: '(619) 555-0142',
  email: 'hello@elitecuts.com',
  website: 'https://elitecuts.com',
  street: '3045 30th Street',
  suite: '',
  city: 'San Diego',
  state: 'CA',
  zip: '92104',
  timezone: 'America/Los_Angeles (PT)',
  opensAt: '9:00 AM',
  slotsPerHour: 10,
  leadTime: '30 min',
  maxBookingWindow: 'Same day',
  notifNewOrder: true,
  notifLowStock: true,
  notifNewEvent: true,
  pointsPerDollar: 1,
  weekendMultiplier: 1,
  pointsExpiryMonths: 6,
  redemptionPoints: 100,
  redemptionDollars: 5,
  minToRedeem: 0,
  maxRedemptionPercent: 50,
  maxRedemptionDollars: 50,
  connoisseurThreshold: 250,
  masterCutThreshold: 1000,
  tierWindowMonths: 12,
  dormancyWarningMonths: 18,
});

// All declared keys — exported so server-side scrubbers (`pickSettings` in
// the API route, the loop in `getShopSettings`) can iterate one source.
export const SHOP_SETTINGS_KEYS = Object.keys(DEFAULT_SHOP_SETTINGS) as (keyof ShopSettings)[];

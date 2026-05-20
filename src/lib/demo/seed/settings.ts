import type { ShopSettings } from '@/models/ShopSettings';

// Snapshot of the singleton shop settings document for the nightly demo
// reset. Mirrors the ShopSettings schema defaults — keeping it explicit
// (rather than relying on `findOneAndUpdate({}, {}, { upsert: true })`)
// makes the demo's "back to a known state" intent obvious and lets the
// seed evolve independently of the schema defaults if the shop ever
// wants the production default to drift from the demo default.
export const DEMO_SHOP_SETTINGS: ShopSettings = {
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
};

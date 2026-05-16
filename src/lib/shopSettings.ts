import 'server-only';

import { cache } from 'react';
import { connection } from 'next/server';

import connectDB from '@/config/database';
import ShopSettingsModel, { type ShopSettings } from '@/models/ShopSettings';

// Schema defaults duplicated here so server components can render a sensible
// footer/metadata even if Mongo is unreachable on cold start.
const FALLBACK_SETTINGS: ShopSettings = {
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

const SETTINGS_KEYS = Object.keys(FALLBACK_SETTINGS) as (keyof ShopSettings)[];

// React.cache dedupes within a single request; multiple server components
// (Footer, layout metadata, receipt page) all share one fetch per render.
// `connection()` opts every caller out of static rendering so admin edits
// surface without a redeploy. It must sit outside the try so the
// dynamic-rendering signal propagates to Next at build time instead of
// being swallowed as a load failure.
export const getShopSettings = cache(async (): Promise<ShopSettings> => {
  await connection();
  try {
    await connectDB();
    const doc = await ShopSettingsModel.findOneAndUpdate(
      {},
      {},
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    )
      .lean<ShopSettings>()
      .exec();
    if (!doc) return FALLBACK_SETTINGS;
    // Pick only declared fields so Mongoose extras (_id, __v, timestamps)
    // don't cross the server/client boundary via the settings provider.
    const settings = { ...FALLBACK_SETTINGS } as Record<keyof ShopSettings, unknown>;
    for (const key of SETTINGS_KEYS) {
      const value = doc[key];
      if (value !== undefined && value !== null) {
        settings[key] = value;
      }
    }
    return settings as ShopSettings;
  } catch (error) {
    console.error('[shopSettings] load failed, using defaults', error);
    return FALLBACK_SETTINGS;
  }
});

// Re-exported so server consumers can pull the helper + formatters from one
// place. Client consumers must import formatters from `shopSettingsFormat`
// directly, since this module is `server-only`.
export {
  formatPhoneHref,
  formatShopAddress,
  formatShopCityStateZip,
  formatWebsiteDisplay,
} from './shopSettingsFormat';

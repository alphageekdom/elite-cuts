import 'server-only';

import { cache } from 'react';
import { connection } from 'next/server';

import connectDB from '@/config/database';
import ShopSettingsModel, { type ShopSettings } from '@/models/ShopSettings';
import { DEFAULT_SHOP_SETTINGS, SHOP_SETTINGS_KEYS } from '@/lib/shopSettings/defaults';

// Fallback when Mongo is unreachable on cold start. Reads from the single
// `DEFAULT_SHOP_SETTINGS` snapshot in `./shopSettings/defaults.ts`.
const FALLBACK_SETTINGS: ShopSettings = DEFAULT_SHOP_SETTINGS;

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
    for (const key of SHOP_SETTINGS_KEYS) {
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

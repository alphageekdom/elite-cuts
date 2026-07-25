import 'server-only';

import { cache } from 'react';
import { connection } from 'next/server';

import connectDB from '@/config/database';
import ShopHoursModel, {
  DEFAULT_DAYS,
  type ShopHoursDay,
} from '@/models/ShopHours';

// Mirrors getShopSettings(): one fetch per render via React.cache, opt-out
// of static rendering so admin edits surface without a redeploy, and a
// hard-coded fallback so server components can still render if Mongo is
// unreachable on cold start.
export const getShopHours = cache(async (): Promise<ShopHoursDay[]> => {
  await connection();
  try {
    await connectDB();
    const doc = await ShopHoursModel.findOneAndUpdate(
      {},
      {},
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    )
      .lean<{ days: ShopHoursDay[] }>()
      .exec();
    if (!doc?.days?.length) return DEFAULT_DAYS;
    return doc.days;
  } catch (error) {
    console.error('[shopHours] load failed, using defaults', error);
    return DEFAULT_DAYS;
  }
});

// Re-exported so server consumers can pull the helper + formatter from one
// place. Client consumers must import from `hours-format` directly,
// since this module is `server-only`.
export {
  DAY_NAMES,
  DAY_ABBREVIATIONS,
  formatShopHoursRows,
  formatShopHoursCondensed,
  formatOpenDaysSpan,
  type ShopHoursRow,
  type ShopHoursCondensedRow,
} from './hours-format';

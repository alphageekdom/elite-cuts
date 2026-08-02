import 'server-only';

import { getShopSettings } from './queries';
import { getShopHours } from './hours-queries';
import { getPickupNote, type PickupNote } from './pickup-format';

/**
 * `getPickupNote` for right now, with the two queries it depends on.
 *
 * The pure helper takes hours, lead time, timezone and a clock; every caller
 * that wants "as of this request" then repeats the same pair of awaits. Both
 * layouts render the navbar and both need this for the mobile sheet's footer,
 * so the pair lives here rather than being written out twice.
 *
 * `getShopSettings` and `getShopHours` are both `React.cache`-wrapped, and the
 * footer on every page already calls both — so this adds no query, it reuses
 * the ones the request is already making.
 *
 * Checkout deliberately keeps its own call: it already holds `hoursDays` and a
 * clock in scope for `buildPickupDays`, so routing it through here would add an
 * indirection without removing work. The product page could use this — its
 * block is the same two awaits — and is a clean follow-up; it is left alone
 * here only to keep this change to the navbar. An earlier version of this note
 * claimed both pages were excluded because they need `readyIn` as well as
 * `timing`, which is wrong: this returns the whole `PickupNote`.
 */
export async function getPickupNoteNow(): Promise<PickupNote> {
  const [settings, hours] = await Promise.all([
    getShopSettings(),
    getShopHours(),
  ]);
  return getPickupNote({
    days: hours,
    leadTime: settings.leadTime,
    timezone: settings.timezone,
    now: new Date(),
  });
}

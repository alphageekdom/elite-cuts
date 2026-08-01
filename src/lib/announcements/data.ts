import 'server-only';

import { cache } from 'react';

import { getActiveEvent } from '@/lib/events/queries';
import { getActiveHoliday, formatDaysUntil } from '@/lib/announcements/holidays';
import { formatGrillHour } from '@/lib/events/config';
import { getShopSettings } from '@/lib/shop-settings/queries';
import { shopDateKey } from '@/lib/shop-settings/pickup-format';

export type AnnouncementAccent = 'oxblood' | 'amber';

export type Announcement = {
  id: string;
  kind: 'event' | 'holiday';
  title: string;
  body: string;
  ctaLabel: string;
  ctaModal: 'store-info';
  accent: AnnouncementAccent;
};

// `cache()` dedupes per-request: layout + any other server call in the same
// render reuses one DB hit for the live event lookup.
export const getActiveAnnouncements = cache(async (): Promise<Announcement[]> => {
  const now = new Date();
  const out: Announcement[] = [];

  const event = await getActiveEvent(now);
  if (event) {
    out.push({
      id: `event-${event._id}`,
      kind: 'event',
      title: 'Grilling now at the shop',
      body: `Drop by — wraps up at ${formatGrillHour(event.endHour)}.`,
      ctaLabel: 'How to visit',
      ctaModal: 'store-info',
      accent: 'amber',
    });
  }

  // Holiday windows are calendar-day facts, so they are measured against the
  // SHOP's date — `getShopSettings` is request-cached and already primed by
  // the root layout, so this costs no extra query.
  const { timezone } = await getShopSettings();
  const holiday = getActiveHoliday(shopDateKey(timezone, now));
  if (holiday) {
    const when = formatDaysUntil(holiday.daysUntil);
    out.push({
      id: `holiday-${holiday.holiday.slug}-${holiday.date.getFullYear()}`,
      kind: 'holiday',
      title: `${holiday.holiday.name} pre-orders`,
      body: `${when} — reserve your cut in-store.`,
      ctaLabel: 'How to reserve',
      ctaModal: 'store-info',
      accent: 'oxblood',
    });
  }

  return out;
});

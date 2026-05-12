import 'server-only';

import { cache } from 'react';

import { getActiveEvent } from '@/lib/events';
import { getActiveHoliday, formatDaysUntil } from '@/lib/holidays';
import { formatGrillHour } from '@/lib/event-config';

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

  const holiday = getActiveHoliday(now);
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

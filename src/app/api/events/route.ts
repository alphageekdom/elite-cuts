import { NextResponse, type NextRequest } from 'next/server';

import EventModel from '@/models/Event';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { withAdmin, withAdminNonDemo } from '@/lib/api-handler';
import { serializeEvent } from '@/lib/events';
import { DEFAULT_EVENT_MESSAGE, parseLaDayString } from '@/lib/event-config';
import { eventCreateSchema } from '@/lib/events/schema';
import { getShopSettings } from '@/lib/shopSettings';

export const GET = withAdmin(async (request: NextRequest) => {
  try {
    const scope = new URL(request.url).searchParams.get('scope') ?? 'upcoming';
    const baseQuery: Record<string, unknown> =
      scope === 'past'
        ? { $or: [{ status: { $in: ['completed', 'cancelled'] } }, { date: { $lt: new Date(Date.now() - 86400000) } }] }
        : { status: { $in: ['scheduled', 'live'] }, date: { $gte: new Date(Date.now() - 86400000) } };

    const docs = await EventModel.find(baseQuery)
      .sort(scope === 'past' ? { date: -1, startHour: -1 } : { date: 1, startHour: 1 })
      .limit(100)
      .lean();

    return NextResponse.json(docs.map((d) => serializeEvent({ ...d, _id: d._id })));
  } catch (error) {
    console.error('[events GET]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

export const POST = withAdminNonDemo(async (request: NextRequest) => {
  try {
    const parsed = eventCreateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Invalid event input' },
        { status: 400 },
      );
    }
    const { date: dateStr, startHour, endHour, message } = parsed.data;

    const day = parseLaDayString(dateStr)!;
    const dayStart = new Date(day.getTime() - 86400000);
    const dayEnd = new Date(day.getTime() + 86400000);

    const overlap = await EventModel.findOne({
      status: { $in: ['scheduled', 'live'] },
      date: { $gte: dayStart, $lte: dayEnd },
    }).lean();
    if (overlap) {
      return NextResponse.json(
        { message: 'There is already an event scheduled on that day.' },
        { status: 409 },
      );
    }

    const event = await EventModel.create({
      kind: 'grill',
      date: day,
      startHour,
      endHour,
      message: message || DEFAULT_EVENT_MESSAGE,
      status: 'scheduled',
    });

    // Notify all admins — fire and forget. Gated on settings.notifNewEvent;
    // getShopSettings fails open so a settings outage doesn't silence the alert.
    const isoDate = day.toISOString().slice(0, 10);
    (async () => {
      const settings = await getShopSettings();
      if (!settings.notifNewEvent) return;
      const admins = await User.find({ isAdmin: true }, '_id').lean();
      if (!admins.length) return;
      const docs = admins.map((a) => ({
        type: 'new_event' as const,
        title: 'Grill event scheduled',
        body: `${isoDate} · ${startHour}:00–${endHour}:00`,
        userId: a._id,
        readAt: null,
      }));
      await Notification.insertMany(docs);
    })().catch((err) => console.error('[events POST] notification error', err));

    return NextResponse.json(serializeEvent({ ...event.toObject(), _id: event._id }), { status: 201 });
  } catch (error) {
    console.error('[events POST]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

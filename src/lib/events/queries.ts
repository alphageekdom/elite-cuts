import 'server-only';

import connectDB from '@/config/database';
import EventModel, { type Event } from '@/models/Event';
import { nowInLA, type SerializedEvent } from '@/lib/events/config';

function isSameLaDay(eventDate: Date, now: Date): boolean {
  const la = nowInLA(now);
  const ed = nowInLA(eventDate);
  return la.year === ed.year && la.month === ed.month && la.day === ed.day;
}

export function serializeEvent(
  doc: Event & { _id: unknown; createdAt: Date; updatedAt: Date },
): SerializedEvent {
  return {
    _id: String(doc._id),
    kind: 'grill',
    date: new Date(doc.date).toISOString(),
    startHour: doc.startHour,
    endHour: doc.endHour,
    message: doc.message,
    status: doc.status,
    cancellationReason: doc.cancellationReason,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

/**
 * Currently-live event in America/Los_Angeles time, or null. Live = today AND
 * current LA hour is in [startHour, endHour) AND status is scheduled or live.
 */
export async function getActiveEvent(now: Date = new Date()): Promise<SerializedEvent | null> {
  await connectDB();
  const la = nowInLA(now);
  const dayMs = 86400000;
  const candidates = await EventModel.find({
    status: { $in: ['scheduled', 'live'] },
    date: { $gte: new Date(now.getTime() - dayMs), $lte: new Date(now.getTime() + dayMs) },
  }).lean();

  for (const ev of candidates) {
    if (!isSameLaDay(ev.date, now)) continue;
    if (la.hour < ev.startHour || la.hour >= ev.endHour) continue;
    return serializeEvent({ ...ev, _id: ev._id });
  }
  return null;
}

export async function getUpcomingEvents(limit = 10): Promise<SerializedEvent[]> {
  await connectDB();
  const startOfYesterday = new Date();
  startOfYesterday.setHours(0, 0, 0, 0);
  const docs = await EventModel.find({
    status: { $in: ['scheduled', 'live'] },
    date: { $gte: new Date(startOfYesterday.getTime() - 86400000) },
  })
    .sort({ date: 1, startHour: 1 })
    .limit(limit)
    .lean();
  return docs.map((d) => serializeEvent({ ...d, _id: d._id }));
}

export async function getPastEvents(limit = 50): Promise<SerializedEvent[]> {
  await connectDB();
  const docs = await EventModel.find({
    $or: [
      { status: { $in: ['completed', 'cancelled'] } },
      { date: { $lt: new Date(Date.now() - 86400000) } },
    ],
  })
    .sort({ date: -1, startHour: -1 })
    .limit(limit)
    .lean();
  return docs.map((d) => serializeEvent({ ...d, _id: d._id }));
}

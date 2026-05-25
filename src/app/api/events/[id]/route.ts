import { NextResponse } from 'next/server';

import EventModel from '@/models/Event';
import {
  parseObjectId,
  withAdminNonDemo,
  zodBadRequest,
} from '@/lib/api-handler';
import { serializeEvent } from '@/lib/events/queries';
import { parseLaDayString } from '@/lib/events/config';
import { eventPatchSchema, makeEventInputSchema } from '@/lib/events/schema';

export const PATCH = withAdminNonDemo<{ id: string }>(async (request, ctx) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    const existing = await EventModel.findById(id);
    if (!existing) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const parsedShape = eventPatchSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsedShape.success) return zodBadRequest(parsedShape.error, 'Invalid event input');
    const body = parsedShape.data;
    const update: Record<string, unknown> = {};

    // Schedule edits — merge body against existing, then re-run the full
    // cross-field check via the create schema with the right past-date
    // policy. An event past 'scheduled' (live / cancelled / completed) can
    // be edited even when its date sits in the past.
    if (body.date !== undefined || body.startHour !== undefined || body.endHour !== undefined) {
      const merged = {
        date: body.date ?? existing.date.toISOString().slice(0, 10),
        startHour: body.startHour ?? existing.startHour,
        endHour: body.endHour ?? existing.endHour,
        message: body.message,
      };
      const editSchema = makeEventInputSchema({ allowPast: existing.status !== 'scheduled' });
      const validated = editSchema.safeParse(merged);
      if (!validated.success) return zodBadRequest(validated.error, 'Invalid event input');
      if (body.date !== undefined) update.date = parseLaDayString(merged.date)!;
      if (body.startHour !== undefined) update.startHour = merged.startHour;
      if (body.endHour !== undefined) update.endHour = merged.endHour;
    }

    if (body.message !== undefined) {
      // Empty after trim falls back to existing rather than blanking the row.
      update.message = body.message || existing.message;
    }

    if (body.status !== undefined) {
      update.status = body.status;
      if (body.status === 'cancelled' && body.cancellationReason !== undefined) {
        update.cancellationReason = body.cancellationReason;
      }
    } else if (body.cancellationReason !== undefined) {
      update.cancellationReason = body.cancellationReason;
    }

    const updated = await EventModel.findByIdAndUpdate(id, update, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
    if (!updated) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    return NextResponse.json({
      data: serializeEvent({ ...updated, _id: updated._id }),
      message: 'Event updated',
    });
  } catch (error) {
    console.error('[events/:id PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

export const DELETE = withAdminNonDemo<{ id: string }>(async (_request, ctx) => {
  try {
    const { id } = await ctx.params;
    const invalid = parseObjectId(id);
    if (invalid) return invalid;

    const deleted = await EventModel.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: { id }, message: 'Event deleted' });
  } catch (error) {
    console.error('[events/:id DELETE]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

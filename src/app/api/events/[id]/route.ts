import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';

import EventModel from '@/models/Event';
import { withAdmin } from '@/lib/api-handler';
import { isIn } from '@/lib/validation';
import { serializeEvent } from '@/lib/events';
import {
  EVENT_MESSAGE_MAX,
  EVENT_STATUSES,
  parseLaDayString,
  validateEventInput,
  type EventStatus,
} from '@/lib/event-config';

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withAdmin(async (request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const existing = await EventModel.findById(id);
    if (!existing) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const body = (await request.json()) as {
      date?: string;
      startHour?: number;
      endHour?: number;
      message?: string;
      status?: string;
      cancellationReason?: string;
    };

    const update: Record<string, unknown> = {};

    // Schedule edits — only allowed while event hasn't run yet
    if (body.date !== undefined || body.startHour !== undefined || body.endHour !== undefined) {
      const date = body.date ?? existing.date.toISOString().slice(0, 10);
      const startHour = body.startHour ?? existing.startHour;
      const endHour = body.endHour ?? existing.endHour;
      const errors = validateEventInput({ date, startHour, endHour, message: body.message }, { allowPastForEdit: existing.status !== 'scheduled' });
      if (errors.length) {
        return NextResponse.json({ message: errors[0].message, errors }, { status: 400 });
      }
      if (body.date !== undefined) update.date = parseLaDayString(date)!;
      if (body.startHour !== undefined) update.startHour = startHour;
      if (body.endHour !== undefined) update.endHour = endHour;
    }

    if (body.message !== undefined) {
      const trimmed = body.message.trim();
      if (trimmed.length > EVENT_MESSAGE_MAX) {
        return NextResponse.json({ message: `Message must be ${EVENT_MESSAGE_MAX} characters or fewer.` }, { status: 400 });
      }
      update.message = trimmed || existing.message;
    }

    if (body.status !== undefined) {
      if (!isIn(EVENT_STATUSES, body.status)) {
        return NextResponse.json({ message: `status must be one of: ${EVENT_STATUSES.join(', ')}` }, { status: 400 });
      }
      update.status = body.status as EventStatus;
      if (body.status === 'cancelled' && body.cancellationReason !== undefined) {
        update.cancellationReason = body.cancellationReason.trim().slice(0, 120);
      }
    } else if (body.cancellationReason !== undefined) {
      update.cancellationReason = body.cancellationReason.trim().slice(0, 120);
    }

    const updated = await EventModel.findByIdAndUpdate(id, update, {
      returnDocument: 'after',
      runValidators: true,
    }).lean();
    if (!updated) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    return NextResponse.json(serializeEvent({ ...updated, _id: updated._id }));
  } catch (error) {
    console.error('[events/:id PATCH]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});

export const DELETE = withAdmin(async (_request: NextRequest, ctx: unknown) => {
  try {
    const { id } = await (ctx as RouteContext).params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const deleted = await EventModel.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[events/:id DELETE]', error);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
});
